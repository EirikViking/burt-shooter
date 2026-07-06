import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4597));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/powerup-pickup-guides-${timestamp()}`);

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
  throw new Error(`No available powerup pickup guide port found starting at ${startPort}`);
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
    if (!game || !play || !manager || !player) return { ok: false, reason: 'missing powerup manager/player' };
    const width = game.getWidth();
    const height = game.getHeight();

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'POWERUP_PICKUP_GUIDE_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    manager.powerups.forEach((powerup) => {
      if (powerup.sprite?.parent) powerup.sprite.parent.removeChild(powerup.sprite);
    });
    manager.powerups = [];

    player.x = width * 0.52;
    player.y = height * 0.72;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    const makePowerup = (type, x, y) => {
      manager.spawnSpecific(x, y, type);
      const powerup = manager.powerups[manager.powerups.length - 1];
      powerup.createdAt = Date.now() - 2400;
      powerup.baseY = y;
      powerup.y = y;
      powerup.sprite.x = x;
      powerup.sprite.y = y;
      powerup.update(0, play);
      return {
        type: powerup.type,
        x: Math.round(powerup.x),
        y: Math.round(powerup.y),
        guide: { ...(powerup.pickupGuide?.__debugPickupGuide || {}) },
        visible: Boolean(powerup.pickupGuide?.visible)
      };
    };

    const near = makePowerup('slow_time', player.x - 54, player.y - 158);
    const far = makePowerup('damage_up', width * 0.17, height * 0.2);
    const inside = makePowerup('shield', player.x + 8, player.y - 7);

    return {
      ok: true,
      count: manager.powerups.length,
      player: { x: Math.round(player.x), y: Math.round(player.y) },
      near,
      far,
      inside
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'powerup-pickup-guides.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (state.count !== 3) failures.push(`expected three powerups, got ${state.count}`);
  if (!state.near?.visible || !state.near?.guide?.visible) failures.push(`near guide was not visible: ${JSON.stringify(state.near)}`);
  if ((state.near?.guide?.distance || 0) < 100 || (state.near?.guide?.distance || 0) > 230) failures.push(`near guide distance unexpected: ${state.near?.guide?.distance}`);
  if ((state.near?.guide?.dashCount || 0) < 2) failures.push(`near guide did not draw enough dashes: ${state.near?.guide?.dashCount}`);
  if (state.far?.visible || state.far?.guide?.visible || state.far?.guide?.reason !== 'out_of_range') failures.push(`far guide should stay hidden: ${JSON.stringify(state.far)}`);
  if (state.inside?.visible || state.inside?.guide?.visible || state.inside?.guide?.reason !== 'inside_pickup_radius') failures.push(`inside-radius guide should stay hidden: ${JSON.stringify(state.inside)}`);
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
  assert(report.ok, `[powerup-pickup-guides] ${failures.join('; ')}`);
  console.log(`[powerup-pickup-guides] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
