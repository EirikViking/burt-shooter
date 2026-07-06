import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4460));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/hud-readability-${timestamp()}`);

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
  throw new Error(`No available HUD readability port found starting at ${startPort}`);
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
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.hud && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    const player = play?.player;
    if (!game || !play || !hud || !player) return { ok: false, reason: 'missing play HUD/player' };

    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'HUD_READABILITY_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    player.invulnerable = true;
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() - 86;

    game.lives = 1;
    player.getActivePowerupStates = () => ([
      {
        type: 'shield',
        iconType: 'shield',
        label: 'SHIELD',
        detail: 'EMPTY',
        spent: true,
        remainingMs: 0,
        color: 0xff6677
      },
      {
        type: 'slow_time',
        iconType: 'slow_time',
        label: 'SLOW TIME',
        remainingMs: 1400,
        durationMs: 10000,
        color: 0x6be8ff
      }
    ]);
    play.comboCount = 12;
    play.comboMultiplier = 2;
    play.comboTimerMs = 820;
    play.comboWindowMs = 2000;

    hud.update();
    hud.updateActivePowerup();

    const rows = (hud.activePowerupRows || [])
      .filter((row) => row?.container?.visible)
      .map((row) => row.container._debugPowerupState || {});

    return {
      ok: true,
      livesCritical: Boolean(hud.livesGroup?._debugCritical),
      livesPulse: hud.livesGroup?._debugPulse ?? null,
      comboMeter: hud.comboMeterGroup?._debugComboMeter || null,
      status: hud.activePowerupGroup?._debugStatus || null,
      rows,
      activePowerupVisible: Boolean(hud.activePowerupGroup?.visible),
      activePowerupBounds: {
        x: Math.round(hud.activePowerupGroup?.x || 0),
        y: Math.round(hud.activePowerupGroup?.y || 0),
        width: Math.round(hud.activePowerupGroup?.width || 0),
        height: Math.round(hud.activePowerupGroup?.height || 0)
      }
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'hud-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const spentRow = state.rows?.find((row) => row.spent);
  const expiringRow = state.rows?.find((row) => row.expiring);
  const report = {
    ok: Boolean(
      state.ok &&
      state.livesCritical &&
      state.comboMeter?.visible &&
      state.comboMeter?.count === 12 &&
      state.comboMeter?.multiplier === 2 &&
      state.comboMeter?.progress > 0.35 &&
      state.comboMeter?.progress < 0.5 &&
      state.activePowerupVisible &&
      state.status?.hasSpent &&
      state.status?.hasExpiring &&
      spentRow?.meta === 'EMPTY' &&
      spentRow?.progress === 0 &&
      spentRow?.spentOverlayVisible &&
      expiringRow?.progress > 0 &&
      expiringRow?.progress <= 0.25 &&
      expiringRow?.expiryOverlayVisible &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    screenshot,
    state,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[hud-readability] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
