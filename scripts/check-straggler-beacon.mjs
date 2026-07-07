import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4491));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/straggler-beacon-${timestamp()}`);

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
  throw new Error(`No available straggler beacon port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.shipCatalogReady, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    await play?.shipCatalogReady;
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.shipCatalogLoaded), null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const enemies = window.__game?.scenes?.play?.enemyManager?.enemies || [];
    return enemies.filter(enemy => enemy?.kind === 'enemy' && enemy?.active && enemy?.sprite).length >= 4;
  }, null, { timeout: 30000 });

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !manager || !player) return { ok: false, reason: 'missing play/manager/player' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.76;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    const candidates = (manager.enemies || [])
      .filter(enemy => enemy?.kind === 'enemy' && enemy?.active && enemy?.sprite)
      .slice(0, 4);
    if (candidates.length < 4) return { ok: false, reason: `only ${candidates.length} candidates` };

    const positions = [
      [game.getWidth() * 0.30, game.getHeight() * 0.42],
      [game.getWidth() * 0.50, game.getHeight() * 0.34],
      [game.getWidth() * 0.70, game.getHeight() * 0.42],
      [game.getWidth() * 0.84, game.getHeight() * 0.50]
    ];
    candidates.forEach((enemy, index) => {
      enemy.active = true;
      enemy.destroyed = false;
      enemy.waitingForEntry = false;
      enemy.kind = 'enemy';
      enemy.x = positions[index][0];
      enemy.y = positions[index][1];
      enemy.formationX = enemy.x;
      enemy.formationY = enemy.y;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.speed = 0;
      enemy.update = function updateStragglerFixture() {
        this.x = this.formationX;
        this.y = this.formationY;
        if (this.sprite) {
          this.sprite.x = this.x;
          this.sprite.y = this.y;
        }
      };
      enemy.radius = Math.max(16, Number(enemy.radius) || 16);
      enemy.sprite.x = enemy.x;
      enemy.sprite.y = enemy.y;
      if (!enemy.sprite.parent) play.gameContainer.addChild(enemy.sprite);
    });
    for (const other of manager.enemies || []) {
      if (candidates.includes(other)) continue;
      other.active = false;
      if (other.sprite?.parent) other.sprite.parent.removeChild(other.sprite);
    }

    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.enemies = candidates;
    const hiddenWithFour = play.updateStragglerBeacon?.(1);
    const fourVisible = Boolean(play.stragglerBeaconLayer?.visible);

    manager.enemies = candidates.slice(0, 3);
    play.clearSectorArrivalStinger?.();
    play.sectorArrivalStinger = {
      container: {
        parent: { removeChild: () => {} },
        destroy: () => {}
      },
      ticker: null
    };
    const hiddenDuringStinger = play.updateStragglerBeacon?.(1);
    play.clearSectorArrivalStinger?.();
    const active = play.updateStragglerBeacon?.(1);
    window.__stragglerBeaconLayer = play.stragglerBeaconLayer || null;

    const activeEnemies = manager.enemies.map(enemy => ({
      type: enemy.type,
      x: Math.round(enemy.x),
      y: Math.round(enemy.y),
      usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
      hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
      bodySize: {
        width: Math.round(enemy.body?.width || 0),
        height: Math.round(enemy.body?.height || 0)
      }
    }));

    manager.state = 'BOSS_ACTIVE';
    const hiddenInBoss = play.updateStragglerBeacon?.(1);

    manager.state = 'WAVE_ACTIVE';
    manager.enemies = candidates.slice(0, 3);
    play.updateStragglerBeacon?.(1);
    return {
      ok: true,
      hiddenWithFour,
      fourVisible,
      hiddenDuringStinger,
      active,
      hiddenInBoss,
      activeEnemies
    };
  });

  await page.waitForTimeout(140);
  const active = await page.evaluate(() => {
    const layer = window.__stragglerBeaconLayer;
    const bounds = layer?.getBounds?.();
    return {
      debug: { ...(layer?._debugStragglerBeacon || {}) },
      visible: Boolean(layer?.visible),
      bounds: {
        x: Math.round(bounds?.x || 0),
        y: Math.round(bounds?.y || 0),
        width: Math.round(bounds?.width || 0),
        height: Math.round(bounds?.height || 0)
      }
    };
  });

  const screenshot = path.join(outputDir, 'straggler-beacon.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
    if (state.fourVisible || state.hiddenWithFour?.visible || state.hiddenWithFour?.reason !== 'too_many_targets') {
    failures.push(`beacon should stay hidden with four targets: ${JSON.stringify(state.hiddenWithFour)}`);
  }
  if (!state.hiddenDuringStinger || state.hiddenDuringStinger.visible || state.hiddenDuringStinger.reason !== 'sector_stinger') {
    failures.push(`beacon should wait behind sector stinger: ${JSON.stringify(state.hiddenDuringStinger)}`);
  }
  if (!state.active?.visible || state.active?.targetCount !== 3) failures.push(`beacon should activate for three targets: ${JSON.stringify(state.active)}`);
  if ((state.active?.pipCount || 0) < 12 || (state.active?.ringCount || 0) < 6) failures.push(`beacon pips/rings missing: ${JSON.stringify(state.active)}`);
  if (!state.hiddenInBoss || state.hiddenInBoss.visible || state.hiddenInBoss.reason !== 'boss_or_clear_state') {
    failures.push(`beacon should hide in boss state: ${JSON.stringify(state.hiddenInBoss)}`);
  }
  if (!active.visible || !active.debug?.visible || active.debug?.targetCount !== 3) failures.push(`active layer debug mismatch: ${JSON.stringify(active)}`);
  if ((active.bounds.width || 0) < 250 || (active.bounds.height || 0) < 80) failures.push(`beacon bounds too small: ${JSON.stringify(active.bounds)}`);
  for (const enemy of state.activeEnemies || []) {
    if (!enemy.usingGeneratedEnemyTexture) failures.push(`straggler sample did not use real generated enemy texture: ${JSON.stringify(enemy)}`);
    if (!enemy.hasBodySpriteTexture || enemy.bodySize.width < 20 || enemy.bodySize.height < 20) failures.push(`straggler sample body texture missing/small: ${JSON.stringify(enemy)}`);
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    state,
    active,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[straggler-beacon] ${failures.join('; ')}`);
  console.log(`[straggler-beacon] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
