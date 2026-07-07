import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4478));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/enemy-threat-readability-${timestamp()}`);

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
  throw new Error(`No available enemy threat readability port found starting at ${startPort}`);
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
    await play?.prewarmGeneratedEnemyTexturesForLevel?.(40, { aheadLevels: 0 });
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return Boolean(play?.shipCatalogLoaded);
  }, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const state = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing play/enemy manager' };
    const { Enemy } = await import('/src/entities/Enemy.js');
    const { getEnemyThreatAction } = await import('/src/config/EnemyThreatActions.js');

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    manager.enemies?.forEach?.((enemy) => enemy?.deactivateVisuals?.('enemy_threat_readability_check'));
    manager.enemies = [];
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }

    const width = game.getWidth?.() || 1280;
    const y = 245;
    const specs = [
      { key: 'elite', type: 'nova_elite_tractor_puller', level: 5, x: width * 0.24 },
      { key: 'threat', type: 'nova_enemy_003', level: 5, x: width * 0.38, threatAction: 'pulse_ring_bloom' },
      { key: 'late', type: 'nova_enemy_181', level: 40, x: width * 0.52 },
      { key: 'durable', type: 'nova_enemy_029', level: 12, x: width * 0.66, health: 10 },
      { key: 'ordinary', type: 'nova_enemy_001', level: 1, x: width * 0.8, health: 1 }
    ];

    const enemies = specs.map((spec) => {
      const enemy = new Enemy(spec.x, y, spec.type, spec.level, game, 'Red');
      enemy.state = 'FORMATION';
      enemy.waitingForEntry = false;
      enemy.active = true;
      enemy.x = spec.x;
      enemy.y = y;
      if (Number.isFinite(spec.health)) {
        enemy.health = spec.health;
        enemy.maxHealth = spec.health;
      }
      if (spec.threatAction) {
        enemy.threatActionDefinition = getEnemyThreatAction(spec.threatAction);
      }
      enemy.spawnCueStartedAt = Date.now() - 2000;
      enemy.updateHealthBar?.();
      enemy.updateSpawnCue?.(Date.now());
      enemy.updateThreatFrame?.(Date.now());
      enemy.sprite.x = enemy.x;
      enemy.sprite.y = enemy.y;
      play.gameContainer.addChild(enemy.sprite);
      enemy._threatReadabilityKey = spec.key;
      return enemy;
    });
    manager.enemies = enemies;
    window.__enemyThreatReadabilityEnemies = enemies;

    return {
      ok: true,
      enemies: enemies.map((enemy) => ({
        key: enemy._threatReadabilityKey,
        type: enemy.type,
        kind: enemy.kind,
        lateMayhem: Boolean(enemy.generatedProfile?.lateMayhem),
        usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
        usingEliteMiddleShipTexture: Boolean(enemy.usingEliteMiddleShipTexture),
        hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
        bodySize: {
          width: Math.round(enemy.body?.width || 0),
          height: Math.round(enemy.body?.height || 0)
        },
        hasThreatAction: Boolean(enemy.threatActionDefinition),
        maxHealth: enemy.maxHealth,
        visible: Boolean(enemy.threatFrameLayer?.visible),
        debug: { ...(enemy.threatFrameLayer?._debugThreatFrame || {}) },
        children: (enemy.sprite?.children || []).map((child) => child.label || child.constructor?.name || 'node')
      }))
    };
  });

  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, 'enemy-threat-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  const expectedTiers = new Map([
    ['elite', 'elite'],
    ['threat', 'threat_action'],
    ['late', 'late_mayhem'],
    ['durable', 'durable']
  ]);
  for (const [key, tier] of expectedTiers.entries()) {
    const enemy = state.enemies?.find((item) => item.key === key);
    if (!enemy) {
      failures.push(`missing ${key} enemy`);
      continue;
    }
    if (!enemy.visible || !enemy.debug?.visible) failures.push(`${key} frame was hidden: ${JSON.stringify(enemy)}`);
    if (enemy.debug?.tier !== tier) failures.push(`${key} tier ${enemy.debug?.tier} !== ${tier}`);
    if ((enemy.debug?.markerCount || 0) < 3) failures.push(`${key} marker count too low: ${enemy.debug?.markerCount}`);
    if (!enemy.children?.includes?.('enemyThreatFrame')) failures.push(`${key} missing enemyThreatFrame layer`);
    if (key === 'elite' && !enemy.usingEliteMiddleShipTexture) failures.push(`elite sample did not use real elite texture: ${JSON.stringify(enemy)}`);
    if (key !== 'elite' && !enemy.usingGeneratedEnemyTexture) failures.push(`${key} sample did not use real generated enemy texture: ${JSON.stringify(enemy)}`);
    if (!enemy.hasBodySpriteTexture || enemy.bodySize?.width < 20 || enemy.bodySize?.height < 20) failures.push(`${key} sample body texture too small/missing: ${JSON.stringify(enemy.bodySize)}`);
  }
  const ordinary = state.enemies?.find((item) => item.key === 'ordinary');
  if (!ordinary) failures.push('missing ordinary enemy');
  if (ordinary?.visible || ordinary?.debug?.visible) failures.push(`ordinary enemy should not have a visible frame: ${JSON.stringify(ordinary)}`);
  if (ordinary && !ordinary.usingGeneratedEnemyTexture) failures.push(`ordinary sample did not use real generated enemy texture: ${JSON.stringify(ordinary)}`);
  if (ordinary && (!ordinary.hasBodySpriteTexture || ordinary.bodySize?.width < 20 || ordinary.bodySize?.height < 20)) failures.push(`ordinary sample body texture too small/missing: ${JSON.stringify(ordinary.bodySize)}`);
  const late = state.enemies?.find((item) => item.key === 'late');
  if (!late?.lateMayhem) failures.push(`late sample is not lateMayhem: ${JSON.stringify(late)}`);
  const threat = state.enemies?.find((item) => item.key === 'threat');
  if (!threat?.hasThreatAction) failures.push('threat sample did not keep a threat action definition');
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
  assert(report.ok, `[enemy-threat-readability] ${failures.join('; ')}`);
  console.log(`[enemy-threat-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
