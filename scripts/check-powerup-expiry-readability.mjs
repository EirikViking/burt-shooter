import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4596));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/powerup-expiry-readability-${timestamp()}`);

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
  throw new Error(`No available powerup expiry check port found starting at ${startPort}`);
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
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
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
  await page.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
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
    if (!game || !play || !manager) return { ok: false, reason: 'missing game/play/manager' };
    const width = game.getWidth();
    const height = game.getHeight();

    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'POWERUP_EXPIRY_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    if (play.player) {
      play.player.x = width * 0.12;
      play.player.y = height - 78;
      if (play.player.sprite) {
        play.player.sprite.x = play.player.x;
        play.player.sprite.y = play.player.y;
      }
      play.player.activePowerup = { type: null, expiresAt: 0, remainingMs: 0, durationMode: 'wall_clock' };
    }
    manager.powerups.forEach((powerup) => {
      if (powerup.sprite?.parent) powerup.sprite.parent.removeChild(powerup.sprite);
    });
    manager.powerups = [];

    const makePowerup = (x, y, ageMs) => {
      manager.spawnSpecific(x, y, 'slow_time');
      const powerup = manager.powerups[manager.powerups.length - 1];
      powerup.createdAt = Date.now() - ageMs;
      powerup.baseY = y;
      powerup.y = y;
      powerup.sprite.x = x;
      powerup.sprite.y = y;
      powerup.update(0, play);
      return {
        active: powerup.active,
        alpha: powerup.sprite.alpha,
        cue: { ...(powerup.expiryCue?.__debugExpiryCue || {}) },
        y: Math.round(powerup.y)
      };
    };

    const fresh = makePowerup(width * 0.38, height * 0.32, 1000);
    const warning = makePowerup(width * 0.5, height * 0.45, 23500);
    const urgent = makePowerup(width * 0.62, height * 0.58, 25200);

    return {
      ok: true,
      count: manager.powerups.length,
      fresh,
      warning,
      urgent
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'powerup-expiry-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: Boolean(
      state.ok &&
      state.count === 3 &&
      state.fresh?.cue?.visible === false &&
      state.fresh?.alpha === 1 &&
      state.warning?.cue?.visible &&
      state.warning?.cue?.urgency > 0.5 &&
      state.warning?.cue?.litSegments >= 4 &&
      state.urgent?.cue?.visible &&
      state.urgent?.cue?.urgent &&
      state.urgent?.cue?.urgency > 0.85 &&
      state.urgent?.cue?.urgentSparkCount >= 4 &&
      state.urgent?.alpha < 0.95 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    screenshot,
    state,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[powerup-expiry-readability] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
