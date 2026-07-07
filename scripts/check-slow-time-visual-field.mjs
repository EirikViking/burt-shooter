import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4473));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/slow-time-visual-field-${timestamp()}`);

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
  throw new Error(`No available slow time visual field port found starting at ${startPort}`);
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
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.updateSlowTimeVisualField, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const active = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) return { ok: false, reason: 'missing play/player' };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    play.gameOverSequenceStarted = false;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    player.x = game.getWidth() * 0.52;
    player.y = game.getHeight() * 0.66;
    player.activePowerup = {
      type: 'slow_time',
      expiresAt: Date.now() + 7000,
      remainingMs: 7000,
      durationMs: 8000,
      durationMode: 'wall_clock'
    };
    player.powerupEffect = {
      slowTime: true,
      enemyTimeScale: 0.33,
      enemyBulletScale: 0.35,
      hazardTimeScale: 0.35,
      durationMs: 8000
    };
    play.updateSlowTimeVisualField(1);
    return {
      ok: true,
      visible: Boolean(play.slowTimeVisualField?.visible),
      debug: { ...(play.slowTimeVisualField?._debugSlowTimeField || {}) },
      scales: {
        enemy: player.getSlowTimeEnemyScale?.(),
        bullet: player.getSlowTimeEnemyBulletScale?.(),
        hazard: player.getSlowTimeHazardScale?.()
      }
    };
  });

  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, 'slow-time-visual-field.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const hideStates = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    player.activePowerup = { type: null, expiresAt: 0, remainingMs: 0 };
    player.powerupEffect = null;
    play.isPaused = false;
    play.updateSlowTimeVisualField(1);
    const expired = { ...(play.slowTimeVisualField?._debugSlowTimeField || {}) };
    player.activePowerup = { type: 'slow_time', expiresAt: Date.now() + 7000, remainingMs: 7000 };
    player.powerupEffect = { slowTime: true, enemyTimeScale: 0.33, enemyBulletScale: 0.35, hazardTimeScale: 0.35 };
    play.isPaused = true;
    play.updateSlowTimeVisualField(1);
    const paused = { ...(play.slowTimeVisualField?._debugSlowTimeField || {}) };
    return { expired, paused };
  });

  const failures = [];
  if (!active.ok) failures.push(active.reason || 'state setup failed');
  if (!active.visible || !active.debug?.visible) failures.push(`slow time field was not visible: ${JSON.stringify(active)}`);
  if ((active.debug?.edge || 0) < 12) failures.push(`slow time edge too small: ${active.debug?.edge}`);
  if ((active.debug?.radius || 0) < 60) failures.push(`slow time player ring too small: ${active.debug?.radius}`);
  if ((active.debug?.alpha || 0) <= 0.05) failures.push(`slow time alpha too low: ${active.debug?.alpha}`);
  if ((active.debug?.timeSliceCount || 0) < 7) failures.push(`slow time field missing time-slice bands: ${JSON.stringify(active.debug)}`);
  if ((active.debug?.clockTickCount || 0) < 16) failures.push(`slow time field missing player clock ticks: ${JSON.stringify(active.debug)}`);
  if ((active.scales?.enemy || 1) > 0.35) failures.push(`enemy slow scale regressed: ${active.scales?.enemy}`);
  if ((active.scales?.bullet || 1) > 0.35) failures.push(`bullet slow scale regressed: ${active.scales?.bullet}`);
  if ((active.scales?.hazard || 1) > 0.35) failures.push(`hazard slow scale regressed: ${active.scales?.hazard}`);
  if (hideStates.expired?.visible) failures.push(`field should hide after expiry: ${JSON.stringify(hideStates.expired)}`);
  if (hideStates.paused?.visible) failures.push(`field should hide while paused: ${JSON.stringify(hideStates.paused)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    active,
    hideStates,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[slow-time-visual-field] ${failures.join('; ')}`);
  console.log(`[slow-time-visual-field] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
