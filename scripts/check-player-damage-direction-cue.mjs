import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4479));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/player-damage-direction-cue-${timestamp()}`);

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
  throw new Error(`No available player damage direction cue port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.triggerPlayerDamageDirectionCue, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const started = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) return { ok: false, reason: 'missing play/player' };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    play.gameOverSequenceStarted = false;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.bulletManager) {
      play.bulletManager.enemyBullets = [];
      play.bulletManager.playerBullets = [];
    }
    if (play.enemyManager) play.enemyManager.enemies = [];
    game.lives = 3;
    player.invulnerable = false;
    player.invulnerableTime = 0;
    const impactX = Math.round(player.sprite?.x || player.x || (game.getWidth?.() || 1280) * 0.5);
    const impactY = Math.round(player.sprite?.y || player.y || (game.getHeight?.() || 720) * 0.72);
    const ok = play.triggerPlayerDamageDirectionCue({
      source: 'enemy_bullet',
      sourceX: impactX + 180,
      sourceY: impactY - 80,
      directionX: 0,
      directionY: 0,
      color: 0xff6677
    });
    window.__damageDirectionCueLayer = play.playerDamageDirectionCue?.layer || null;
    return {
      ok,
      debug: { ...(play.playerDamageDirectionCue?.layer?._debugDamageDirectionCue || {}) }
    };
  });

  await page.waitForTimeout(220);
  const active = await page.evaluate(() => {
    const layer = window.__damageDirectionCueLayer;
    const bounds = layer?.getBounds?.();
    return {
      debug: { ...(layer?._debugDamageDirectionCue || {}) },
      visible: Boolean(layer?.parent && layer?.visible !== false),
      bounds: {
        x: Math.round(bounds?.x || 0),
        y: Math.round(bounds?.y || 0),
        width: Math.round(bounds?.width || 0),
        height: Math.round(bounds?.height || 0)
      }
    };
  });

  const screenshot = path.join(outputDir, 'player-damage-direction-cue.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  await page.waitForTimeout(820);
  const faded = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    return {
      currentCue: Boolean(play?.playerDamageDirectionCue),
      lastDebug: { ...(play?.lastPlayerDamageDirectionCueDebug || {}) },
      oldLayerParent: Boolean(window.__damageDirectionCueLayer?.parent)
    };
  });

  const failures = [];
  if (!started.ok) failures.push(started.reason || 'cue did not start');
  if (!started.debug?.visible || started.debug?.source !== 'enemy_bullet') failures.push(`cue start debug mismatch: ${JSON.stringify(started)}`);
  if (!active.visible || !active.debug?.visible) failures.push(`cue was not visible after animation step: ${JSON.stringify(active)}`);
  if ((active.debug?.chevronCount || 0) < 3) failures.push(`cue chevrons missing: ${JSON.stringify(active.debug)}`);
  if ((active.debug?.ringCount || 0) < 2) failures.push(`cue rings missing: ${JSON.stringify(active.debug)}`);
  if (!Number.isFinite(active.debug?.directionAngle) || active.debug.directionAngle >= 0 || active.debug.directionAngle <= -1.2) {
    failures.push(`cue direction angle should point up-right from player: ${JSON.stringify(active.debug)}`);
  }
  if (active.debug?.directionMode !== 'source_position') failures.push(`zero-vector fallback failed: ${JSON.stringify(active.debug)}`);
  if ((active.bounds.width || 0) < 70 || (active.bounds.height || 0) < 70) failures.push(`cue bounds too small: ${JSON.stringify(active.bounds)}`);
  if (active.debug?.sourceX <= active.debug?.impactX) failures.push(`cue source should be to the right of impact: ${JSON.stringify(active.debug)}`);
  if (faded.currentCue || faded.oldLayerParent || faded.lastDebug?.visible) failures.push(`cue did not fade/clean up: ${JSON.stringify(faded)}`);
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
  assert(report.ok, `[player-damage-direction-cue] ${failures.join('; ')}`);
  console.log(`[player-damage-direction-cue] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
