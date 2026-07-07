import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4491));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/magnet-field-readability-${timestamp()}`);

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
  throw new Error(`No available magnet field readability port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.powerupManager && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.powerupAssetsReady), null, { timeout: 15000 });
  await page.evaluate(async () => {
    await window.__game?.scenes?.play?.powerupAssetsReady;
  });
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.powerupManager;
    const player = play?.player;
    if (!game || !play || !manager || !player) return { ok: false, reason: 'missing play/player/powerup manager' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'MAGNET_FIELD_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    manager.powerups.forEach((powerup) => {
      if (powerup.sprite?.parent) powerup.sprite.parent.removeChild(powerup.sprite);
    });
    manager.powerups = [];

    const width = game.getWidth();
    const height = game.getHeight();
    player.x = width * 0.52;
    player.y = height * 0.72;
    player.sprite.x = player.x;
    player.sprite.y = player.y;
    player.activePowerup = {
      type: 'gravity_well',
      expiresAt: Date.now() + 8000,
      remainingMs: 8000,
      durationMode: 'wall_clock'
    };
    player.magnetActive = true;
    player.magnetRadius = 260;
    player.magnetStrength = 0.16;
    player.magnetExpiresAt = Date.now() + 8000;

    const makePowerup = (type, x, y) => {
      manager.spawnSpecific(x, y, type);
      const powerup = manager.powerups[manager.powerups.length - 1];
      powerup.createdAt = Date.now() - 1800;
      powerup.baseY = y;
      powerup.y = y;
      powerup.sprite.x = x;
      powerup.sprite.y = y;
      powerup.update(0, play);
      return powerup;
    };

    const pulledA = makePowerup('shield', player.x - 135, player.y - 92);
    const pulledB = makePowerup('score_fever', player.x + 150, player.y - 72);
    const outside = makePowerup('rapid_fire', player.x - 330, player.y - 156);
    const immune = makePowerup('super_extra_life', player.x + 90, player.y - 160);
    const starts = new Map([
      ['shield', { x: pulledA.x, y: pulledA.y }],
      ['scoreFever', { x: pulledB.x, y: pulledB.y }],
      ['outside', { x: outside.x, y: outside.y }],
      ['immune', { x: immune.x, y: immune.y }]
    ]);

    play.applyMagnetPull(1);

    return {
      ok: true,
      debug: { ...(play.magnetFieldVisual?.__debugMagnetField || {}) },
      visible: Boolean(play.magnetFieldVisual?.visible),
      powerups: manager.powerups.map((powerup) => ({
        type: powerup.type,
        magnetImmune: Boolean(powerup.magnetImmune),
        x: Math.round(powerup.x),
        y: Math.round(powerup.y)
      })),
      moved: {
        shield: Math.hypot(pulledA.x - starts.get('shield').x, pulledA.y - starts.get('shield').y),
        scoreFever: Math.hypot(pulledB.x - starts.get('scoreFever').x, pulledB.y - starts.get('scoreFever').y),
        outside: Math.hypot(outside.x - starts.get('outside').x, outside.y - starts.get('outside').y),
        immune: Math.hypot(immune.x - starts.get('immune').x, immune.y - starts.get('immune').y)
      }
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'magnet-field-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const hidden = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play?.player) return { ok: false, reason: 'missing play/player' };
    play.player.magnetActive = false;
    play.applyMagnetPull(1);
    return {
      ok: true,
      visible: Boolean(play.magnetFieldVisual?.visible),
      debug: { ...(play.magnetFieldVisual?.__debugMagnetField || {}) }
    };
  });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (!state.visible || !state.debug?.visible) failures.push(`magnet field was not visible: ${JSON.stringify(state.debug)}`);
  if (state.debug?.fieldType !== 'gravity_well') failures.push(`field type should be gravity_well: ${state.debug?.fieldType}`);
  if ((state.debug?.range || 0) !== 260) failures.push(`range debug mismatch: ${state.debug?.range}`);
  if ((state.debug?.segmentCount || 0) < 12) failures.push(`segment count too low for large field: ${state.debug?.segmentCount}`);
  if ((state.debug?.targetCount || 0) < 2) failures.push(`expected at least two pulled targets: ${state.debug?.targetCount}`);
  if ((state.debug?.powerupTargetCount || 0) < 2) failures.push(`expected two powerup pull lines: ${state.debug?.powerupTargetCount}`);
  if ((state.moved?.shield || 0) <= 0.5 || (state.moved?.scoreFever || 0) <= 0.5) failures.push(`inside powerups did not move enough: ${JSON.stringify(state.moved)}`);
  if ((state.moved?.outside || 0) > 0.1) failures.push(`outside powerup should not move: ${state.moved?.outside}`);
  if ((state.moved?.immune || 0) > 0.1) failures.push(`magnet-immune powerup should not move: ${state.moved?.immune}`);
  if (!hidden.ok) failures.push(hidden.reason || 'hidden state failed');
  if (hidden.visible || hidden.debug?.visible) failures.push(`magnet field did not hide after deactivation: ${JSON.stringify(hidden)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    state,
    hidden,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[magnet-field-readability] ${failures.join('; ')}`);
  console.log(`[magnet-field-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
