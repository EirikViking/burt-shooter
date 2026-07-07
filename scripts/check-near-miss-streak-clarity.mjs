import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4482));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/near-miss-streak-clarity-${timestamp()}`);

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
  throw new Error(`No available near-miss streak clarity port found starting at ${startPort}`);
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
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.player?.active;
  }, null, { timeout: 30000 });

  const state = await page.evaluate(async () => {
    const readState = () => JSON.parse(window.render_game_to_text?.() || '{}');
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!play?.applyNearMiss || !player) return { ok: false, reason: 'missing play/player near-miss hook' };

    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.68;
    player.sprite.x = player.x;
    player.sprite.y = player.y;
    player.invulnerable = true;
    player.invulnerableTime = 10000;
    play.nearMissCooldownAt = 0;
    play.lastNearMissAt = Date.now();

    for (let index = 0; index < 5; index += 1) {
      play.nearMissCooldownAt = 0;
      play.applyNearMiss({
        x: player.x + (player.radius || 12) + 10 + index,
        y: player.y,
        radius: 5,
        active: true
      });
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
    return {
      ok: true,
      scoring: readState().scoring,
      hitbox: readState().player?.hitboxReticle || null,
      visible: Boolean(player.hitboxReticle?.visible)
    };
  });

  await page.waitForTimeout(220);
  const screenshot = path.join(outputDir, 'near-miss-streak-clarity.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const nearMiss = state.hitbox?.nearMiss || {};
  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (!state.visible || !state.hitbox?.visible) failures.push(`hitbox reticle should be visible: ${JSON.stringify(state.hitbox)}`);
  if (!nearMiss.active) failures.push(`near-miss visual state missing: ${JSON.stringify(state.hitbox)}`);
  if (nearMiss.streak !== 5) failures.push(`near-miss streak mismatch: ${JSON.stringify(nearMiss)}`);
  if (nearMiss.filledPips !== 5) failures.push(`near-miss pips mismatch: ${JSON.stringify(nearMiss)}`);
  if (!nearMiss.surgeReady) failures.push(`surge-ready state missing: ${JSON.stringify(nearMiss)}`);
  if ((nearMiss.surgeSpikeCount || 0) < 5) failures.push(`surge-ready burst spikes missing: ${JSON.stringify(nearMiss)}`);
  if (!(nearMiss.windowProgress > 0.6 && nearMiss.windowProgress <= 1)) failures.push(`window progress should still be readable: ${JSON.stringify(nearMiss)}`);
  if ((state.scoring?.bestDangerDodgeStreak || 0) < 5) failures.push(`scoring streak did not register: ${JSON.stringify(state.scoring)}`);
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
  assert(report.ok, `[near-miss-streak-clarity] ${failures.join('; ')}`);
  console.log(`[near-miss-streak-clarity] PASS streak=${nearMiss.streak} screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
