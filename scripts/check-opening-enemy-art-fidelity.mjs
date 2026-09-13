import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4527));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/opening-enemy-art-fidelity-${timestamp()}`);

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
  throw new Error(`No available opening enemy art port found starting at ${startPort}`);
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
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
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
    await play?.prewarmGeneratedEnemyTexturesForLevel?.(1, { aheadLevels: 0 });
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.shipCatalogLoaded), null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const enemies = window.__game?.scenes?.play?.enemyManager?.enemies || [];
    return enemies.filter((enemy) => enemy?.kind === 'enemy' && enemy?.sprite).length >= 5;
  }, null, { timeout: 30000 });

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !manager || !player) return { ok: false, reason: 'missing play/manager/player' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.78;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    const candidates = (manager.enemies || [])
      .filter((enemy) => enemy?.kind === 'enemy' && enemy?.sprite)
      .slice(0, 5);
    if (candidates.length < 5) return { ok: false, reason: `only ${candidates.length} opening enemies` };

    const y = Math.round(game.getHeight() * 0.33);
    const startX = Math.round(game.getWidth() * 0.18);
    const stepX = Math.round(game.getWidth() * 0.16);
    candidates.forEach((enemy, index) => {
      enemy.active = true;
      enemy.destroyed = false;
      enemy.waitingForEntry = false;
      enemy.state = 'FORMATION';
      enemy.x = startX + stepX * index;
      enemy.y = y + (index % 2) * 42;
      enemy.formationX = enemy.x;
      enemy.formationY = enemy.y;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.speed = 0;
      enemy.spawnCueStartedAt = Date.now() - 2000;
      enemy.updateSpawnCue?.(Date.now());
      enemy.updateThreatFrame?.(Date.now());
      enemy.updateHealthBar?.();
      if (enemy.sprite) {
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.visible = true;
        enemy.sprite.renderable = true;
        enemy.sprite.alpha = 1;
        enemy.sprite.zIndex = 90;
        if (!enemy.sprite.parent) play.gameContainer.addChild(enemy.sprite);
      }
    });

    for (const other of manager.enemies || []) {
      if (candidates.includes(other)) continue;
      other.active = false;
      if (other.sprite?.parent) other.sprite.parent.removeChild(other.sprite);
    }
    manager.enemies = candidates;
    play.gameContainer.sortChildren?.();
    game.app?.renderer?.render?.(game.app.stage);

    return {
      ok: true,
      level: game.level,
      waveIndex: manager.currentWaveIndex,
      shipCatalogLoaded: Boolean(play.shipCatalogLoaded),
      enemies: candidates.map((enemy) => {
        const bounds = enemy.sprite?.getBounds?.();
        return {
          type: enemy.type,
          role: enemy.generatedProfile?.role || null,
          earlySurge: Boolean(enemy.generatedProfile?.earlySurge),
          spriteIndex: enemy.generatedProfile?.spriteIndex ?? null,
          usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
          usingFallbackGraphics: Boolean(enemy.usingFallbackGraphics),
          hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
          bodySize: {
            width: Math.round(enemy.body?.width || 0),
            height: Math.round(enemy.body?.height || 0)
          },
          bounds: {
            x: Math.round(bounds?.x || 0),
            y: Math.round(bounds?.y || 0),
            width: Math.round(bounds?.width || 0),
            height: Math.round(bounds?.height || 0)
          },
          hullDetailVisible: Boolean(enemy.hullDetailLayer?.parent && enemy.hullDetailLayer?.visible !== false),
          hullDetail: enemy.hullDetailLayer?._debugHullDetail || null,
          fallbackHull: enemy.body?._debugFallbackHull || null
        };
      })
    };
  });

  await page.waitForTimeout(160);
  const screenshot = path.join(outputDir, 'opening-enemy-art-fidelity.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (!state.shipCatalogLoaded) failures.push(`ship catalog was not loaded: ${JSON.stringify(state)}`);
  for (const enemy of state.enemies || []) {
    if (!enemy.usingGeneratedEnemyTexture) failures.push(`opening enemy did not use generated ship art: ${JSON.stringify(enemy)}`);
    if (enemy.usingFallbackGraphics) failures.push(`opening enemy used fallback graphics: ${JSON.stringify(enemy)}`);
    if (!enemy.hasBodySpriteTexture || enemy.bodySize.width < 36 || enemy.bodySize.height < 36) {
      failures.push(`opening enemy body texture too small/missing: ${JSON.stringify(enemy.bodySize)}`);
    }
    if (!enemy.hullDetailVisible) failures.push(`opening enemy missing hull detail layer: ${JSON.stringify(enemy)}`);
    if ((enemy.hullDetail?.pipCount || 0) < 3 || (enemy.hullDetail?.railCount || 0) < 5) {
      failures.push(`opening enemy hull detail sparse: ${JSON.stringify(enemy.hullDetail)}`);
    }
    if ((enemy.hullDetail?.spineCount || 0) < 4 || (enemy.hullDetail?.wingBracketCount || 0) < 2) {
      failures.push(`opening enemy ship-form detail missing: ${JSON.stringify(enemy.hullDetail)}`);
    }
    if (enemy.fallbackHull?.simpleCircle === true) failures.push(`opening enemy showed simple circle fallback: ${JSON.stringify(enemy)}`);
    if ((enemy.bounds.width || 0) < 44 || (enemy.bounds.height || 0) < 44) failures.push(`opening enemy visible bounds too small: ${JSON.stringify(enemy.bounds)}`);
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
  assert(report.ok, `[opening-enemy-art-fidelity] ${failures.join('; ')}`);
  console.log(`[opening-enemy-art-fidelity] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
