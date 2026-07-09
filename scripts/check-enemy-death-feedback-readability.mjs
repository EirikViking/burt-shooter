import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4492));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/enemy-death-feedback-readability-${timestamp()}`);

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
  throw new Error(`No available enemy death feedback port found starting at ${startPort}`);
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
    await play?.prewarmGeneratedEnemyTexturesForLevel?.(12, { aheadLevels: 0 });
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.shipCatalogLoaded), null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const setup = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing play/enemy manager' };
    const { Enemy } = await import('/src/entities/Enemy.js');

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    manager.enemies?.forEach?.((enemy) => enemy?.deactivateVisuals?.('enemy_death_feedback_check'));
    manager.enemies = [];
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }

    const width = game.getWidth?.() || 1280;
    const specs = [
      { key: 'normal', type: 'nova_enemy_001', level: 1, x: width * 0.34, health: 1 },
      { key: 'durable', type: 'nova_enemy_012', level: 12, x: width * 0.5, health: 10 },
      { key: 'elite', type: 'nova_elite_tractor_puller', level: 5, x: width * 0.66, health: 14 }
    ];

    const enemies = specs.map((spec) => {
      const enemy = new Enemy(spec.x, 250, spec.type, spec.level, game, 'Red');
      enemy.state = 'FORMATION';
      enemy.waitingForEntry = false;
      enemy.active = true;
      enemy.visualsDeactivated = false;
      enemy.x = spec.x;
      enemy.y = 250;
      enemy.health = spec.health;
      enemy.maxHealth = spec.health;
      enemy.spawnCueStartedAt = Date.now() - 2000;
      enemy.updateHealthBar?.();
      enemy.updateSpawnCue?.(Date.now() + 2000);
      enemy.updateThreatFrame?.(Date.now());
      enemy.sprite.x = enemy.x;
      enemy.sprite.y = enemy.y;
      play.gameContainer.addChild(enemy.sprite);
      enemy._deathFeedbackKey = spec.key;
      play.playEnemyDeathFeedback(enemy, { sfx: false, volume: 0, intensity: spec.key === 'normal' ? 0.6 : 0.78 });
      return enemy;
    });
    manager.enemies = enemies;
    window.__enemyDeathFeedbackReadabilityEnemies = enemies;

    const layers = (play.gameContainer?.children || [])
      .filter((child) => child.label === 'enemyDeathClarityBurst')
      .map((child) => ({ ...(child._debugEnemyDeathClarity || {}) }));

    return {
      ok: true,
      enemies: enemies.map((enemy) => ({
        key: enemy._deathFeedbackKey,
        type: enemy.type,
        kind: enemy.kind,
        usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
        usingEliteMiddleShipTexture: Boolean(enemy.usingEliteMiddleShipTexture),
        hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
        bodySize: {
          width: Math.round(enemy.body?.width || 0),
          height: Math.round(enemy.body?.height || 0)
        }
      })),
      layers,
      particleCount: play.particleManager?.particles?.length || 0,
      lastDebug: play.lastEnemyDeathFeedbackDebug || null
    };
  });

  await page.waitForTimeout(160);
  const visible = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const layers = (play?.gameContainer?.children || [])
      .filter((child) => child.label === 'enemyDeathClarityBurst')
      .map((child) => ({ ...(child._debugEnemyDeathClarity || {}) }));
    return {
      layers,
      lastDebug: play?.lastEnemyDeathFeedbackDebug || null
    };
  });
  const screenshot = path.join(outputDir, 'enemy-death-feedback-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!setup.ok) failures.push(setup.reason || 'state setup failed');
  const enemies = setup.enemies || [];
  for (const key of ['normal', 'durable']) {
    const enemy = enemies.find((item) => item.key === key);
    if (!enemy) {
      failures.push(`missing ${key} enemy`);
      continue;
    }
    if (!enemy.usingGeneratedEnemyTexture) failures.push(`${key} sample did not use a real generated enemy texture: ${JSON.stringify(enemy)}`);
    if (!enemy.hasBodySpriteTexture || enemy.bodySize?.width < 20 || enemy.bodySize?.height < 20) failures.push(`${key} sample body texture missing/small: ${JSON.stringify(enemy.bodySize)}`);
  }
  const elite = enemies.find((item) => item.key === 'elite');
  if (!elite) failures.push('missing elite enemy');
  if (elite && !elite.usingEliteMiddleShipTexture) failures.push(`elite sample did not use a real elite texture: ${JSON.stringify(elite)}`);
  if (elite && (!elite.hasBodySpriteTexture || elite.bodySize?.width < 20 || elite.bodySize?.height < 20)) failures.push(`elite sample body texture missing/small: ${JSON.stringify(elite.bodySize)}`);

  const layers = visible.layers || [];
  if (layers.length < 3) failures.push(`expected at least 3 visible death clarity layers, saw ${layers.length}: ${JSON.stringify(layers)}`);
  const byTier = new Map(layers.map((layer) => [layer.tier, layer]));
  if (!byTier.has('normal')) failures.push(`missing normal death clarity tier: ${JSON.stringify(layers)}`);
  if (!byTier.has('durable')) failures.push(`missing durable death clarity tier: ${JSON.stringify(layers)}`);
  if (!byTier.has('elite')) failures.push(`missing elite death clarity tier: ${JSON.stringify(layers)}`);
  if ((byTier.get('normal')?.markerCount || 0) < 4) failures.push(`normal marker count too low: ${JSON.stringify(byTier.get('normal'))}`);
  if ((byTier.get('durable')?.markerCount || 0) < 5) failures.push(`durable marker count too low: ${JSON.stringify(byTier.get('durable'))}`);
  if ((byTier.get('elite')?.markerCount || 0) < 8) failures.push(`elite marker count too low: ${JSON.stringify(byTier.get('elite'))}`);
  for (const tier of ['normal', 'durable', 'elite']) {
    const layer = byTier.get(tier);
    if ((layer?.gridRingCount || 0) < 2) failures.push(`${tier} death grid rings missing: ${JSON.stringify(layer)}`);
    if ((layer?.debrisSpokeCount || 0) < (layer?.markerCount || 4)) failures.push(`${tier} death debris spokes missing: ${JSON.stringify(layer)}`);
    if ((layer?.implosionDiamondCount || 0) < 4) failures.push(`${tier} death implosion diamonds missing: ${JSON.stringify(layer)}`);
    if ((layer?.echoBandCount || 0) < 2) failures.push(`${tier} death echo bands missing: ${JSON.stringify(layer)}`);
    if ((layer?.killWakeCount || 0) < 3) failures.push(`${tier} death wake trails missing: ${JSON.stringify(layer)}`);
  }
  if (!((byTier.get('elite')?.visualRadius || 0) > (byTier.get('normal')?.visualRadius || 0))) {
    failures.push(`elite visual radius should exceed normal: ${JSON.stringify(layers)}`);
  }
  if ((setup.particleCount || 0) < 20) failures.push(`death feedback did not create expected particles: ${setup.particleCount}`);
  if (!visible.lastDebug?.visible) failures.push(`last death debug missing visible state: ${JSON.stringify(visible.lastDebug)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    setup,
    visible,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[enemy-death-feedback-readability] ${failures.join('; ')}`);
  console.log(`[enemy-death-feedback-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
