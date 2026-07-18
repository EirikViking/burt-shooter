import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4498));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/fast-target-runtime-readability-${timestamp()}`);

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
  throw new Error(`No available fast target runtime check port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.gameContainer && window.__game?.scenes?.play?.enemyManager, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.shipCatalogReady, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    await play?.shipCatalogReady;
    await play?.prewarmGeneratedEnemyTexturesForLevel?.(40, { aheadLevels: 0 });
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.shipCatalogLoaded), null, { timeout: 30000 });
  await page.waitForTimeout(400);

  const state = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing play/enemy manager' };
    const { Enemy } = await import('/src/entities/Enemy.js');
    const { GENERATED_ENEMY_PROFILES } = await import('/src/config/GeneratedEnemyProfiles.js');
    const profile = GENERATED_ENEMY_PROFILES.find((candidate) => candidate.role === 'fast_scout')
      || GENERATED_ENEMY_PROFILES.find((candidate) => candidate.movementStyle === 'fastNeedle');
    if (!profile) return { ok: false, reason: 'missing generated fast target profile' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    manager.enemies?.forEach?.((enemy) => enemy?.deactivateVisuals?.('fast_target_runtime_check'));
    manager.enemies = [];
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }

    const enemy = new Enemy((game.getWidth?.() || 1280) * 0.5, 255, profile.type, Math.max(1, profile.unlockLevel || 1), game, 'Red');
    play.gameContainer.addChild(enemy.sprite);
    manager.enemies = [enemy];
    enemy.updateThreatFrame(Date.now() + 120);

    return {
      ok: true,
      profile: {
        id: profile.id,
        type: profile.type,
        role: profile.role,
        movementStyle: profile.movementStyle
      },
      usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
      hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
      bodySize: {
        width: Math.round(enemy.body?.width || 0),
        height: Math.round(enemy.body?.height || 0)
      },
      threatFrame: enemy.threatFrameLayer?._debugThreatFrame || null,
      layerVisible: Boolean(enemy.threatFrameLayer?.visible)
    };
  });

  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, 'fast-target-runtime-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (!state.usingGeneratedEnemyTexture) failures.push(`fast target did not use a real generated enemy texture: ${JSON.stringify(state.profile)}`);
  if (!state.hasBodySpriteTexture || state.bodySize?.width < 20 || state.bodySize?.height < 20) failures.push(`fast target body texture missing/small: ${JSON.stringify(state.bodySize)}`);
  if (!state.layerVisible || !state.threatFrame?.visible) failures.push(`fast threat frame not visible: ${JSON.stringify(state.threatFrame)}`);
  if (state.threatFrame?.tier !== 'fast') failures.push(`expected fast threat-frame tier: ${JSON.stringify(state.threatFrame)}`);
  if ((state.threatFrame?.markerCount || 0) < 4) failures.push(`fast marker count too low: ${JSON.stringify(state.threatFrame)}`);
  if ((state.threatFrame?.radius || 0) < 32) failures.push(`fast frame radius too small: ${JSON.stringify(state.threatFrame)}`);
  if ((state.threatFrame?.motionTrailCount || 0) < 3) failures.push(`fast motion trails missing: ${JSON.stringify(state.threatFrame)}`);
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
  assert(report.ok, `[fast-target-runtime-readability] ${failures.join('; ')}`);
  console.log(`[fast-target-runtime-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
