import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4330));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/hijacker-tractor-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

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
  for (let candidate = startPort; candidate < startPort + 40; candidate++) {
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
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
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
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleWarningsOrErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') consoleWarningsOrErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startLevel: '2',
    controlSmoke: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.player?.active;
  }, { timeout: 30000 });

  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return play && play.isReady && play.introActive !== true && play.introComplete === true && play.player?.sprite?.parent;
  }, { timeout: 30000 });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const enemyManager = play?.enemyManager;
    if (!game || !play || !player || !enemyManager) throw new Error('Missing play scene for hijacker tractor check');
    enemyManager.spawnHijacker();
    const hijacker = enemyManager.hijacker;
    player.x = hijacker.x;
    player.y = game.getHeight() * 0.78;
    player.invulnerable = true;
    player.invulnerableTime = 12000;
    hijacker.health = 30;
    hijacker.maxHealth = 30;
    hijacker.nextBeamAt = Date.now() - 1;
    hijacker.beamWarningMs = 260;
    hijacker.beamActiveMs = 1800;
    hijacker.updateHealthBar?.();
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.hijacker?.tractor?.state === 'active' && state.hijacker?.tractor?.pullActive === true;
  }, { timeout: 5000 });

  const activeState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const yBeforePull = activeState.player.y;
  mkdirSync(outputDir, { recursive: true });
  const tractorScreenshot = path.join(outputDir, 'hijacker-tractor-active.png');
  await page.screenshot({ path: tractorScreenshot, fullPage: true });

  await page.waitForTimeout(500);
  const pulledState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const scoreBeforeBreak = pulledState.score;
  const expectedBreakScore = await page.evaluate(() => window.__game?.getScoreAward?.(1700) || 1700);

  await page.evaluate(() => {
    const hijacker = window.__game?.scenes?.play?.enemyManager?.hijacker;
    if (!hijacker) throw new Error('Hijacker missing before tractor break');
    hijacker.takeDamage(9999);
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return !state.hijacker;
  }, { timeout: 4000 });
  const brokenState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const breakScreenshot = path.join(outputDir, 'hijacker-tractor-break.png');
  await page.screenshot({ path: breakScreenshot, fullPage: true });

  const yAfterPull = pulledState.player?.y;
  const report = {
    ok: activeState.hijacker?.tractor?.state === 'active' &&
      activeState.hijacker?.tractor?.pullActive === true &&
      Number.isFinite(yBeforePull) &&
      Number.isFinite(yAfterPull) &&
      yAfterPull < yBeforePull &&
      brokenState.score >= scoreBeforeBreak + expectedBreakScore &&
      pageErrors.length === 0 &&
      consoleWarningsOrErrors.length === 0,
    baseUrl,
    yBeforePull,
    yAfterPull,
    scoreBeforeBreak,
    scoreAfterBreak: brokenState.score,
    expectedBreakScore,
    tractor: activeState.hijacker?.tractor || null,
    pageErrors,
    consoleWarningsOrErrors,
    screenshots: {
      tractor: tractorScreenshot,
      break: breakScreenshot
    }
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[hijacker-tractor] PASS y ${yBeforePull}->${yAfterPull} score ${scoreBeforeBreak}->${brokenState.score} screenshot=${tractorScreenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
