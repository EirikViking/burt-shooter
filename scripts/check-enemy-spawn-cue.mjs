import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4472));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/enemy-spawn-cue-${timestamp()}`);

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
  throw new Error(`No available enemy spawn cue port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.gameContainer && window.__game?.scenes?.play?.enemyManager, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.shipCatalogReady, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    await play?.shipCatalogReady;
    await play?.prewarmGeneratedEnemyTexturesForLevel?.(5, { aheadLevels: 0 });
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.shipCatalogLoaded), null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const active = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing play/enemy manager' };
    const { Enemy } = await import('/src/entities/Enemy.js');
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    manager.enemies?.forEach?.((enemy) => enemy?.deactivateVisuals?.('enemy_spawn_cue_check'));
    manager.enemies = [];

    const enemy = new Enemy((game.getWidth?.() || 1280) / 2, 235, 'nova_enemy_003', 5, game, 'Green');
    enemy.state = 'FORMATION';
    enemy.resetSpawnCue(Date.now() - 120);
    enemy.updateSpawnCue(Date.now());
    play.gameContainer.addChild(enemy.sprite);
    manager.enemies = [enemy];
    window.__enemySpawnCueCheckEnemy = enemy;
    return {
      ok: true,
      active: enemy.active,
      radius: enemy.radius,
      usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
      hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
      bodySize: {
        width: Math.round(enemy.body?.width || 0),
        height: Math.round(enemy.body?.height || 0)
      },
      debug: { ...(enemy.spawnCueLayer?._debugSpawnCue || {}) },
      visible: Boolean(enemy.spawnCueLayer?.visible),
      children: (enemy.sprite?.children || []).map((child) => child.label || child.constructor?.name || 'node')
    };
  });

  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, 'enemy-spawn-cue.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const hidden = await page.evaluate(() => {
    const enemy = window.__enemySpawnCueCheckEnemy;
    if (!enemy) return { ok: false, reason: 'missing test enemy' };
    enemy.updateSpawnCue(Date.now() + 1400);
    return {
      ok: true,
      visible: Boolean(enemy.spawnCueLayer?.visible),
      debug: { ...(enemy.spawnCueLayer?._debugSpawnCue || {}) }
    };
  });

  const failures = [];
  if (!active.ok) failures.push(active.reason || 'state setup failed');
  if (!active.active) failures.push('test enemy was not active');
  if (!active.usingGeneratedEnemyTexture) failures.push(`spawn cue sample did not use a real generated enemy texture: ${JSON.stringify(active)}`);
  if (!active.hasBodySpriteTexture || active.bodySize?.width < 20 || active.bodySize?.height < 20) failures.push(`spawn cue sample body texture missing/small: ${JSON.stringify(active.bodySize)}`);
  if (!active.visible || !active.debug?.visible) failures.push(`spawn cue was not visible: ${JSON.stringify(active)}`);
  if ((active.debug?.radius || 0) <= active.radius) failures.push(`spawn cue radius too small: ${active.debug?.radius} <= ${active.radius}`);
  if ((active.debug?.fade || 0) <= 0.1) failures.push(`spawn cue fade too low: ${active.debug?.fade}`);
  if (active.debug?.simplifiedStandard !== true) failures.push(`ordinary spawn cue did not use the restrained profile: ${JSON.stringify(active.debug)}`);
  if (active.debug?.inboundChevronCount !== 2) failures.push(`ordinary spawn cue should use exactly two inbound chevrons: ${JSON.stringify(active.debug)}`);
  for (const key of ['entryGateTickCount', 'entryGhostLaneCount', 'braidChevronCount', 'formationBracketCount', 'entryLockPipCount', 'approachSparkCount']) {
    if ((active.debug?.[key] || 0) !== 0) failures.push(`ordinary spawn cue retained decorative ${key}: ${JSON.stringify(active.debug)}`);
  }
  if (!active.children?.includes?.('enemySpawnCue')) failures.push(`enemySpawnCue layer missing: ${JSON.stringify(active.children)}`);
  if (!hidden.ok) failures.push(hidden.reason || 'hidden state failed');
  if (hidden.visible || hidden.debug?.visible) failures.push(`spawn cue did not hide after duration: ${JSON.stringify(hidden)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    active,
    hidden,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[enemy-spawn-cue] ${failures.join('; ')}`);
  console.log(`[enemy-spawn-cue] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
