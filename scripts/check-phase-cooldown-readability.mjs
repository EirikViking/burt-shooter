import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4590));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/phase-cooldown-readability-${timestamp()}`);

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
  throw new Error(`No available Phase cooldown check port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) return { ok: false, reason: 'missing game/play/player' };

    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'PHASE_COOLDOWN_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }

    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.58;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
      player.sprite.alpha = 1;
    }
    player.invulnerable = false;
    player.isDodging = false;
    player.dodgeDelay = 1000;
    player.dodgeCooldown = 500;
    player.dodgeReadyFlashMs = 0;
    player.updateDodgeCooldownVisual(0);
    const cooling = { ...(player.dodgeCooldownRing?.__debugPhaseCooldown || {}) };

    player.dodgeCooldown = 0;
    player.dodgeReadyFlashMs = 650;
    player.updateDodgeCooldownVisual(0);
    const ready = { ...(player.dodgeCooldownRing?.__debugPhaseCooldown || {}) };

    player.isDodging = true;
    player.dodgeCooldown = 700;
    player.dodgeReadyFlashMs = 0;
    player.updateDodgeCooldownVisual(0);
    const activeHidden = { ...(player.dodgeCooldownRing?.__debugPhaseCooldown || {}) };

    player.isDodging = false;
    player.dodgeCooldown = 500;
    player.dodgeReadyFlashMs = 0;
    player.updateDodgeCooldownVisual(0);

    return {
      ok: true,
      playerPosition: { x: Math.round(player.x), y: Math.round(player.y) },
      cooling,
      ready,
      activeHidden,
      ringVisible: Boolean(player.dodgeCooldownRing?.visible)
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'phase-cooldown-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: Boolean(
      state.ok &&
      state.cooling?.visible &&
      state.cooling?.coolingDown &&
      state.cooling?.readyProgress > 0.45 &&
      state.cooling?.readyProgress < 0.55 &&
      state.ready?.visible &&
      state.ready?.readyFlashing &&
      state.ready?.readyFlashProgress >= 0.99 &&
      state.activeHidden?.visible === false &&
      state.activeHidden?.activePhase &&
      state.ringVisible &&
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
    console.log(`[phase-cooldown-readability] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
