import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4334));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/easter-egg-flyby-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, { autostart: '1', controlSmoke: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.player?.active;
  }, { timeout: 30000 });

  const result = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play?.spawnEasterEggFlyby) return { ok: false, reason: 'missing_spawnEasterEggFlyby' };

    const { AudioManager } = await import('/src/audio/AudioManager.js');
    play.clearToastState?.();
    play.easterEggTimer = 999999;
    const egg = {
      id: 'space_tax_audit',
      title: 'SPACE TAX AUDIT',
      line: 'Receipts detected. Enemy morale fell three percent and filed an appeal.',
      symbol: 'FORM 404',
      accent: 0x66ff9d,
      secondary: 0xffef7e,
      minLevel: 5,
      sfx: 'space_tax_audit_flyby'
    };

    play.spawnEasterEggFlyby(egg);
    const sfxPlayResult = AudioManager.playSfx(egg.sfx, { force: true, volume: 0.38, minIntervalMs: 0 });
    await new Promise((resolve) => setTimeout(resolve, 1550));

    const state = JSON.parse(window.render_game_to_text());
    const textState = state.textState || state.finalState?.textState || state;
    const flyby = play.easterEggFlyby;
    return {
      ok: true,
      activeEasterEgg: textState.arcadeRun?.activeEasterEgg,
      trackedAsAmbientBonusDrone: Boolean(play.ambientBonusDrones?.includes?.(flyby?.sprite)),
      trackedAsEnemy: Boolean(play.enemyManager?.enemies?.includes?.(flyby?.sprite)),
      trackedAsEnemyBullet: Boolean(play.bulletManager?.enemyBullets?.includes?.(flyby?.sprite)),
      trackedAsPlayerBullet: Boolean(play.bulletManager?.bullets?.includes?.(flyby?.sprite)),
      sfxPlayResult,
      lastSfxEvent: textState.audio?.lastSfxEvent || null,
      lastEasterEgg: textState.arcadeRun?.lastEasterEgg || null,
      activeEnemyCount: textState.counts?.enemies ?? null,
      activeEnemyBulletCount: textState.counts?.enemyBullets ?? null
    };
  });

  await page.waitForTimeout(250);
  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'space-tax-audit-flyby.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const active = result.activeEasterEgg || {};
  const report = {
    ok: Boolean(
      result.ok &&
      active.id === 'space_tax_audit' &&
      active.visualIntent === 'decorative_lore_signal' &&
      active.layer === 'gameplay_decorative_overlay' &&
      active.parentLayer === 'decorativeOverlay' &&
      active.zIndex === 5 &&
      active.eventMode === 'none' &&
      active.hasCollision === false &&
      active.shootable === false &&
      active.damagesPlayer === false &&
      active.givesReward === false &&
      /nova-space-tax-audit-flyby-20260623\.png$/.test(active.artSrc || '') &&
      active.alpha <= 0.92 &&
      result.trackedAsAmbientBonusDrone === false &&
      result.trackedAsEnemy === false &&
      result.trackedAsEnemyBullet === false &&
      result.trackedAsPlayerBullet === false &&
      result.sfxPlayResult !== false &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    result,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[easter-egg-flyby] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
