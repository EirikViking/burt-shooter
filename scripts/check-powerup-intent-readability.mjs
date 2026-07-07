import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = Number(process.env.CHECK_PORT || await findAvailablePort(4300));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/powerup-intent-readability-${timestamp()}`);

const samples = [
  { type: 'shield', category: 'defense', major: false },
  { type: 'rapid_fire', category: 'offense', major: false },
  { type: 'slow_time', category: 'control', major: false },
  { type: 'score_fever', category: 'utility', major: false },
  { type: 'row_core', category: 'offense', major: true },
  { type: 'super_extra_life', category: 'defense', major: true }
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available powerup intent check port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canFetch(url) || !(await isPortAvailable(port))) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const baseArgs = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const args = [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  if (!(await waitForServer(baseUrl))) {
    server.kill();
    throw new Error(`Preview server did not become ready at ${baseUrl}`);
  }
  return server;
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox']
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.powerupManager && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.powerupAssetsReady), null, { timeout: 15000 });
  await page.evaluate(async () => {
    await window.__game?.scenes?.play?.powerupAssetsReady;
  });
  await page.waitForTimeout(300);

  const state = await page.evaluate((sampleDefs) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.powerupManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing play powerup manager' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'POWERUP_INTENT_CHECK';
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
    const y = game.getHeight() * 0.43;
    const gap = 150;
    const startX = width * 0.5 - gap * ((sampleDefs.length - 1) / 2);

    sampleDefs.forEach((sample, index) => {
      const x = startX + index * gap;
      manager.spawnSpecific(x, y, sample.type);
      const powerup = manager.powerups[manager.powerups.length - 1];
      powerup.createdAt = Date.now() - 3200;
      powerup.baseY = y;
      powerup.y = y;
      powerup.sprite.x = x;
      powerup.sprite.y = y;
      powerup.update(0, play);
    });

    return {
      ok: true,
      count: manager.powerups.length,
      samples: manager.powerups.map((powerup) => ({
        type: powerup.type,
        x: Math.round(powerup.x),
        y: Math.round(powerup.y),
        cue: { ...(powerup.intentCue?.__debugPowerupIntent || {}) },
        cueVisible: Boolean(powerup.intentCue?.visible)
      }))
    };
  }, samples);

  await page.waitForTimeout(300);
  const screenshot = path.join(outputDir, 'powerup-intent-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (state.count !== samples.length) failures.push(`expected ${samples.length} powerups, got ${state.count}`);
  for (const expected of samples) {
    const actual = state.samples?.find((sample) => sample.type === expected.type);
    if (!actual) {
      failures.push(`missing sample ${expected.type}`);
      continue;
    }
    if (!actual.cueVisible || !actual.cue?.visible) failures.push(`${expected.type} intent cue is not visible`);
    if (actual.cue?.category !== expected.category) failures.push(`${expected.type} category ${actual.cue?.category} !== ${expected.category}`);
    if (actual.cue?.major !== expected.major) failures.push(`${expected.type} major ${actual.cue?.major} !== ${expected.major}`);
    if (expected.major && actual.cue?.crownTicks !== 6) failures.push(`${expected.type} major crown missing: ${actual.cue?.crownTicks}`);
    if (!expected.major && actual.cue?.crownTicks !== 0) failures.push(`${expected.type} non-major crown should be hidden: ${actual.cue?.crownTicks}`);
  }
  const categories = new Set(state.samples?.map((sample) => sample.cue?.category));
  for (const category of ['defense', 'offense', 'control', 'utility']) {
    if (!categories.has(category)) failures.push(`missing category proof: ${category}`);
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
  assert(report.ok, `[powerup-intent-readability] ${failures.join('; ')}`);
  console.log(`[powerup-intent-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
