import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4487));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/powerup-pickup-confirmation-${timestamp()}`);

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
  throw new Error(`No available powerup pickup confirmation port found starting at ${startPort}`);
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
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.triggerPowerupPickupJuice, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const started = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) return { ok: false, reason: 'missing play/player' };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    if (play.enemyManager) play.enemyManager.enemies = [];
    if (play.powerupManager) play.powerupManager.powerups = [];

    player.x = Math.round(game.getWidth() * 0.5);
    player.y = Math.round(game.getHeight() * 0.68);
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    const juice = play.triggerPowerupPickupJuice({
      type: 'shield',
      color: 0x66ffff,
      x: player.x - 96,
      y: player.y - 46
    });
    window.__powerupPickupClaimLayer = play.powerupPickupClaimCue?.layer || null;
    return {
      ok: Boolean(juice?.triggered),
      juice: { ...(juice || {}) },
      debug: { ...(play.powerupPickupClaimCue?.layer?._debugPowerupPickupClaimCue || {}) }
    };
  });

  await page.waitForTimeout(220);
  const active = await page.evaluate(() => {
    const layer = window.__powerupPickupClaimLayer;
    const bounds = layer?.getBounds?.();
    return {
      debug: { ...(layer?._debugPowerupPickupClaimCue || {}) },
      visible: Boolean(layer?.parent && layer?.visible !== false),
      bounds: {
        x: Math.round(bounds?.x || 0),
        y: Math.round(bounds?.y || 0),
        width: Math.round(bounds?.width || 0),
        height: Math.round(bounds?.height || 0)
      }
    };
  });

  const screenshot = path.join(outputDir, 'powerup-pickup-confirmation.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  await page.waitForTimeout(780);
  const faded = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    return {
      currentCue: Boolean(play?.powerupPickupClaimCue),
      lastDebug: { ...(play?.lastPowerupPickupClaimCue || {}) },
      oldLayerParent: Boolean(window.__powerupPickupClaimLayer?.parent)
    };
  });

  const failures = [];
  if (!started.ok) failures.push(started.reason || 'pickup juice did not start');
  if (!started.juice?.claimCue) failures.push(`pickup juice did not report claim cue: ${JSON.stringify(started.juice)}`);
  if (!started.debug?.visible || started.debug?.type !== 'shield') failures.push(`claim cue start debug mismatch: ${JSON.stringify(started)}`);
  if (!active.visible || !active.debug?.visible) failures.push(`claim cue was not visible after animation step: ${JSON.stringify(active)}`);
  if ((active.debug?.pipCount || 0) < 6) failures.push(`claim cue pips missing: ${JSON.stringify(active.debug)}`);
  if ((active.debug?.ringCount || 0) < 2) failures.push(`claim cue rings missing: ${JSON.stringify(active.debug)}`);
  if ((active.debug?.sparkCount || 0) < 3) failures.push(`claim cue source sparks missing: ${JSON.stringify(active.debug)}`);
  if ((active.debug?.sourceDistance || 0) < 50) failures.push(`claim cue source distance too small: ${JSON.stringify(active.debug)}`);
  if ((active.bounds.width || 0) < 70 || (active.bounds.height || 0) < 70) failures.push(`claim cue bounds too small: ${JSON.stringify(active.bounds)}`);
  if (faded.currentCue || faded.oldLayerParent || faded.lastDebug?.visible) failures.push(`claim cue did not fade/clean up: ${JSON.stringify(faded)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    started,
    active,
    faded,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[powerup-pickup-confirmation] ${failures.join('; ')}`);
  console.log(`[powerup-pickup-confirmation] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
