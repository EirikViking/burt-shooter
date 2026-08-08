import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4468));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/enemy-hit-feedback-${timestamp()}`);

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
  throw new Error(`No available enemy hit feedback port found starting at ${startPort}`);
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

  const state = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing play/enemy manager' };
    const { Enemy } = await import('/src/entities/Enemy.js');
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    manager.enemies?.forEach?.((enemy) => enemy?.deactivateVisuals?.('enemy_hit_feedback_check'));
    manager.enemies = [];
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }

    const enemy = new Enemy((game.getWidth?.() || 1280) / 2, 205, 'nova_enemy_012', 12, game, 'Red');
    enemy.health = 5;
    enemy.maxHealth = 5;
    enemy.updateHealthBar?.();
    const fullHealthBar = {
      visible: Boolean(enemy.healthBar?.visible),
      readability: enemy.healthBar?._debugReadability || null
    };
    play.gameContainer.addChild(enemy.sprite);
    manager.enemies = [enemy];
    const beforeHealth = enemy.health;
    const killed = enemy.takeDamage(1.25, {
      impactX: enemy.x + enemy.radius * 0.46,
      impactY: enemy.y + enemy.radius * 0.72
    });
    enemy.updateHitFeedback(Date.now() + 80);

    return {
      ok: true,
      beforeHealth,
      afterHealth: enemy.health,
      killed,
      active: enemy.active,
      usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
      hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
      bodySize: {
        width: Math.round(enemy.body?.width || 0),
        height: Math.round(enemy.body?.height || 0)
      },
      hitFeedback: enemy.hitFeedbackLayer?._debugHitFeedback || null,
      layerVisible: Boolean(enemy.hitFeedbackLayer?.visible),
      sparkCount: enemy.hitFeedbackSparkCount || 0,
      fullHealthBar,
      healthBarVisible: Boolean(enemy.healthBar?.visible !== false),
      healthBarReadability: enemy.healthBar?._debugReadability || null,
      spritePosition: {
        x: Math.round(enemy.sprite?.x || 0),
        y: Math.round(enemy.sprite?.y || 0)
      }
    };
  });

  await page.waitForTimeout(120);
  const screenshot = path.join(outputDir, 'enemy-hit-feedback.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (state.killed) failures.push('non-lethal hit killed the test enemy');
  if (!state.active) failures.push('enemy became inactive after non-lethal hit');
  if (!state.usingGeneratedEnemyTexture) failures.push(`hit feedback sample did not use a real generated enemy texture: ${JSON.stringify(state)}`);
  if (!state.hasBodySpriteTexture || state.bodySize?.width < 20 || state.bodySize?.height < 20) failures.push(`hit feedback sample body texture missing/small: ${JSON.stringify(state.bodySize)}`);
  if (!(state.afterHealth < state.beforeHealth)) failures.push(`health did not decrease: ${state.beforeHealth} -> ${state.afterHealth}`);
  if (!state.layerVisible || !state.hitFeedback?.visible) failures.push(`hit feedback layer not visible: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.hitFeedback?.radius || 0) <= 10) failures.push(`feedback radius too small: ${state.hitFeedback?.radius}`);
  if (!state.hitFeedback?.impactNotch || !Number.isFinite(state.hitFeedback?.impactAngle)) failures.push(`impact notch missing: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.hitFeedback?.impactDistance || 0) <= 4) failures.push(`impact distance too small: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.hitFeedback?.armorCrackCount || 0) < 5) failures.push(`durable armor cracks missing: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.hitFeedback?.impactSliceCount || 0) < 3) failures.push(`impact slices missing: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.hitFeedback?.ricochetBeadCount || 0) < 4) failures.push(`ricochet beads missing: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.hitFeedback?.hitDirectionChevronCount || 0) < 2) failures.push(`hit direction chevrons missing: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.hitFeedback?.shieldSawToothCount || 0) < 6) failures.push(`shield saw teeth missing: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.hitFeedback?.woundedSmokeHashCount || 0) < 3) failures.push(`wounded hash marks missing: ${JSON.stringify(state.hitFeedback)}`);
  if (!Number.isFinite(state.hitFeedback?.healthRatio) || state.hitFeedback.healthRatio >= 1) failures.push(`durable health ratio not recorded after damage: ${JSON.stringify(state.hitFeedback)}`);
  if ((state.sparkCount || 0) < 1 || (state.hitFeedback?.sparkCount || 0) < 1) failures.push(`hit spark was not recorded: ${state.sparkCount}`);
  if (state.fullHealthBar?.visible) failures.push(`standard full-health bar remained visible: ${JSON.stringify(state.fullHealthBar)}`);
  if (state.fullHealthBar?.readability?.reason !== 'full_health_standard') failures.push(`full-health bar reason was not recorded: ${JSON.stringify(state.fullHealthBar)}`);
  if (!state.healthBarVisible) failures.push('health bar disappeared after non-lethal hit');
  if (state.healthBarReadability?.reason !== 'damaged') failures.push(`damaged health bar reason was not recorded: ${JSON.stringify(state.healthBarReadability)}`);
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
  assert(report.ok, `[enemy-hit-feedback] ${failures.join('; ')}`);
  console.log(`[enemy-hit-feedback] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
