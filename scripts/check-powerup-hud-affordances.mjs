import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4598));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/powerup-hud-affordances-${timestamp()}`);

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
  throw new Error(`No available powerup HUD check port found starting at ${startPort}`);
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
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.hud && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.powerupAssetsReady), null, { timeout: 15000 });
  await page.evaluate(async () => {
    await window.__game?.scenes?.play?.powerupAssetsReady;
  });
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    const player = play?.player;
    if (!game || !play || !hud || !player) return { ok: false, reason: 'missing game/play/hud/player' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'POWERUP_HUD_AFFORDANCE_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() - 82;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    player.getActivePowerupStates = () => ([
      {
        type: 'shield',
        iconType: 'shield',
        label: 'SHIELD',
        remainingMs: 11800,
        durationMs: 15000,
        color: 0x66ffff
      },
      {
        type: 'bomb',
        iconType: 'bomb',
        label: 'BOMB',
        remainingMs: 0,
        charges: 2,
        maxCharges: 3,
        detail: '2 SHOTS',
        color: 0xff8844
      },
      {
        type: 'slow_time',
        iconType: 'slow_time',
        label: 'SLOW TIME',
        remainingMs: 1300,
        durationMs: 8000,
        color: 0x9a8cff
      },
      {
        type: 'debuff_weapon_jam',
        iconType: 'powerup_nullification',
        label: 'JAMMED',
        detail: 'LOCKED',
        remainingMs: 4200,
        durationMs: 6000,
        category: 'debuff',
        color: 0xff6688
      }
    ]);

    hud.update();
    hud.updateActivePowerup();

    return {
      ok: true,
      group: {
        visible: Boolean(hud.activePowerupGroup?.visible),
        x: Math.round(hud.activePowerupGroup?.x || 0),
        y: Math.round(hud.activePowerupGroup?.y || 0),
        width: Math.round(hud.activePowerupGroup?.width || 0),
        height: Math.round(hud.activePowerupGroup?.height || 0)
      },
      status: hud.activePowerupGroup?._debugStatus || null,
      rows: (hud.activePowerupRows || [])
        .filter((row) => row?.container?.visible)
        .map((row) => row.container._debugPowerupState || {})
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'powerup-hud-affordances.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'setup failed');
  if (!state.group?.visible) failures.push('active powerup HUD is not visible');
  if (state.rows?.length !== 4) failures.push(`expected 4 powerup rows, got ${state.rows?.length || 0}`);
  const shield = state.rows?.find((row) => row.type === 'shield');
  const bomb = state.rows?.find((row) => row.type === 'bomb');
  const slowTime = state.rows?.find((row) => row.type === 'slow_time');
  const status = state.rows?.find((row) => row.type === 'debuff_weapon_jam');
  if (shield?.category !== 'defense' || !shield?.categoryAccentVisible || shield?.categoryRailPipCount !== 3 || shield?.timerTickCount !== 3) {
    failures.push(`shield row missing defense accent/timer ticks: ${JSON.stringify(shield)}`);
  }
  if (bomb?.category !== 'offense' || bomb?.categoryRailPipCount !== 4 || bomb?.chargePipCount !== 3 || bomb?.chargePipActive !== 2) {
    failures.push(`bomb row missing charge pips: ${JSON.stringify(bomb)}`);
  }
  if (slowTime?.category !== 'control' || slowTime?.categoryRailPipCount !== 3 || !slowTime?.expiring || slowTime?.urgencyChevronCount !== 3 || slowTime?.timerTickCount !== 3) {
    failures.push(`slow-time row missing expiring chevrons/ticks: ${JSON.stringify(slowTime)}`);
  }
  if (status?.category !== 'status' || !status?.categoryAccentVisible || status?.categoryRailPipCount !== 3 || status?.timerTickCount !== 3) {
    failures.push(`status row missing status accent/timer ticks: ${JSON.stringify(status)}`);
  }
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
  assert(report.ok, `[powerup-hud-affordances] ${failures.join('; ')}`);
  console.log(`[powerup-hud-affordances] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
