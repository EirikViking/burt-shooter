import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4480));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-phase-healthbar-cues-${timestamp()}`);
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
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available boss phase healthbar cues port found starting at ${startPort}`);
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

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    offlineLeaderboard: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startAtBoss: '1',
    startLevel: '10'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
  }, null, { timeout: 30000 });

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!game || !play || !boss || !player) return { ok: false, reason: 'missing game/play/boss/player' };

    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    boss.entryStartMs = Date.now() - boss.entryDurationMs - 1;
    boss.x = game.getWidth() * 0.5;
    boss.y = game.getHeight() * 0.25;
    boss.sprite.x = boss.x;
    boss.sprite.y = boss.y;
    boss.phase = 3;
    boss.health = Math.max(1, boss.maxHealth * 0.2);
    boss.updateHealthBar();
    player.invulnerable = true;
    player.invulnerableTime = 20000;
    return {
      ok: true,
      debug: boss.healthBar?._debugBossHealthBar || boss.healthBar?.__debugBossHealthBar || null,
      boss: { phase: boss.phase, health: boss.health, maxHealth: boss.maxHealth }
    };
  });

  await page.waitForTimeout(200);
  const screenshot = path.join(outputDir, 'boss-phase-healthbar-cues.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const debug = state.debug || {};
  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (debug.currentPhase !== 3) failures.push(`current phase mismatch: ${JSON.stringify(debug)}`);
  if (debug.phasePipCount !== 3) failures.push(`phase pip count mismatch: ${JSON.stringify(debug)}`);
  if (debug.currentPhasePip !== 3) failures.push(`current phase pip mismatch: ${JSON.stringify(debug)}`);
  if ((debug.dangerHatchCount || 0) < 7) failures.push(`low-health hatches missing: ${JSON.stringify(debug)}`);
  if ((debug.lowHealthBraceCount || 0) < 2) failures.push(`low-health braces missing: ${JSON.stringify(debug)}`);
  if ((debug.lowHealthSparkCount || 0) < 3) failures.push(`low-health sparks missing: ${JSON.stringify(debug)}`);
  if (!debug.lowHealth) failures.push(`low-health state missing: ${JSON.stringify(debug)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    state,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[boss-phase-healthbar-cues] ${failures.join('; ')}`);
  console.log(`[boss-phase-healthbar-cues] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
