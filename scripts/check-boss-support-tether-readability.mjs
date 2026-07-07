import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4511));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-support-tether-readability-${timestamp()}`);

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
  throw new Error(`No available boss support tether check port found starting at ${startPort}`);
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
    await play?.prewarmGeneratedEnemyTexturesForLevel?.(20, { aheadLevels: 0 });
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.shipCatalogLoaded), null, { timeout: 30000 });
  await page.waitForTimeout(400);

  const state = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing play/enemy manager' };

    const { Enemy } = await import('/src/entities/Enemy.js');
    const { pickBossSupportShipProfile, getBossSupportShipEventSeed } = await import('/src/config/BossSupportShips.js');
    const { getGeneratedEnemyTypeForSpriteIndex } = await import('/src/config/GeneratedEnemyProfiles.js');
    const supportProfile = pickBossSupportShipProfile(14, getBossSupportShipEventSeed(14, 0));
    const supportType = getGeneratedEnemyTypeForSpriteIndex(supportProfile.spriteIndex);
    if (!supportType) return { ok: false, reason: `missing generated support type for sprite ${supportProfile.spriteIndex}` };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    manager.enemies?.forEach?.((enemy) => enemy?.deactivateVisuals?.('boss_support_tether_check'));
    manager.enemies = [];
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }

    const enemy = new Enemy(430, 310, supportType, 14, game, 'Green');
    enemy.radius = supportProfile.radius;
    enemy.bossSupportShipProfile = supportProfile;
    enemy.bossFuelProfile = {
      id: supportProfile.id,
      groupSize: 3,
      groupSlot: 1,
      healPercent: supportProfile.healPercent,
      beamStyle: supportProfile.beamStyle
    };
    enemy.sprite.label = `enemy_visual:${supportProfile.id}:tether_readability_check`;
    enemy.body?.scale?.set?.(
      enemy.body.scale.x * supportProfile.spriteScale,
      enemy.body.scale.y * supportProfile.spriteScale
    );
    play.gameContainer.addChild(enemy.sprite);
    manager.enemies = [enemy];
    manager.attachBossFuelTether(enemy);
    manager.updateBossFuelTether(enemy, {
      active: true,
      x: 815,
      y: 310,
      radius: 96,
      getVisualRadius() {
        return 126;
      }
    }, 385);

    return {
      ok: true,
      supportProfile: {
        id: supportProfile.id,
        beamStyle: supportProfile.beamStyle,
        spriteIndex: supportProfile.spriteIndex
      },
      usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
      hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
      bodySize: {
        width: Math.round(enemy.body?.width || 0),
        height: Math.round(enemy.body?.height || 0)
      },
      tether: enemy.bossFuelTether?._debugBossFuelTether || null,
      tetherVisible: Boolean(enemy.bossFuelTether?.visible && enemy.bossFuelTether?.renderable)
    };
  });

  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, 'boss-support-tether-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (!state.usingGeneratedEnemyTexture) failures.push(`support ship did not use a real generated enemy texture: ${JSON.stringify(state.supportProfile)}`);
  if (!state.hasBodySpriteTexture || state.bodySize?.width < 20 || state.bodySize?.height < 20) failures.push(`support ship body texture missing/small: ${JSON.stringify(state.bodySize)}`);
  if (!state.tetherVisible || !state.tether?.visible) failures.push(`support tether not visible: ${JSON.stringify(state.tether)}`);
  if ((state.tether?.directionChevronCount || 0) < 5) failures.push(`support tether direction cues missing: ${JSON.stringify(state.tether)}`);
  if ((state.tether?.intakeBracketCount || 0) < 4) failures.push(`support tether intake cues missing: ${JSON.stringify(state.tether)}`);
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
  assert(report.ok, `[boss-support-tether-readability] ${failures.join('; ')}`);
  console.log(`[boss-support-tether-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
