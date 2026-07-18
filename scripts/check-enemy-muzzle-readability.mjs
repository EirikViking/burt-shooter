import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4484));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/enemy-muzzle-readability-${timestamp()}`);

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
  throw new Error(`No available enemy muzzle readability port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.shipCatalogReady, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    await play?.shipCatalogReady;
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.shipCatalogLoaded), null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.player?.active && state?.counts?.enemies > 0;
  }, null, { timeout: 30000 });

  const state = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const enemy = play?.enemyManager?.enemies?.find((candidate) => candidate?.kind === 'enemy' && candidate?.active && candidate?.sprite);
    if (!game || !play || !player || !enemy) return { ok: false, reason: 'missing play/player/enemy' };

    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    for (const other of play.enemyManager?.enemies || []) {
      if (other === enemy) continue;
      other.active = false;
      if (other.sprite?.parent) other.sprite.parent.removeChild(other.sprite);
    }
    if (play.enemyManager) play.enemyManager.enemies = [enemy];
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    enemy.waitingForEntry = false;
    enemy.active = true;
    enemy.visualsDeactivated = false;
    enemy.x = game.getWidth() * 0.5;
    enemy.y = game.getHeight() * 0.28;
    enemy.sprite.x = enemy.x;
    enemy.sprite.y = enemy.y;
    enemy.shootCooldown = 0;
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.72;
    player.sprite.x = player.x;
    player.sprite.y = player.y;
    player.invulnerable = true;
    player.invulnerableTime = 10000;

    const shots = enemy.shoot(player.x, player.y);
    const shotList = Array.isArray(shots) ? shots : [shots].filter(Boolean);
    for (const bullet of shotList) play.bulletManager.addEnemyBullet(bullet);
    enemy.updateMuzzleFlash(Date.now() + 40);
    await new Promise((resolve) => setTimeout(resolve, 70));
    return {
      ok: true,
      shotCount: shotList.length,
      debug: enemy.muzzleFlashLayer?._debugMuzzleFlash || null,
      layerVisible: Boolean(enemy.muzzleFlashLayer?.visible),
      enemy: {
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        type: enemy.type,
        usingGeneratedEnemyTexture: Boolean(enemy.usingGeneratedEnemyTexture),
        hasBodySpriteTexture: Boolean(enemy.body?.texture && enemy.body?.texture?.width > 0 && enemy.body?.texture?.height > 0),
        bodySize: {
          width: Math.round(enemy.body?.width || 0),
          height: Math.round(enemy.body?.height || 0)
        }
      }
    };
  });

  await page.waitForTimeout(70);
  const screenshot = path.join(outputDir, 'enemy-muzzle-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if ((state.shotCount || 0) < 1) failures.push(`enemy did not fire: ${JSON.stringify(state)}`);
  if (!state.enemy?.usingGeneratedEnemyTexture) failures.push(`muzzle sample did not use a real generated enemy texture: ${JSON.stringify(state.enemy)}`);
  if (!state.enemy?.hasBodySpriteTexture || state.enemy?.bodySize?.width < 20 || state.enemy?.bodySize?.height < 20) failures.push(`muzzle sample body texture missing/small: ${JSON.stringify(state.enemy?.bodySize)}`);
  if (!state.layerVisible || !state.debug?.visible) failures.push(`muzzle layer should be visible: ${JSON.stringify(state.debug)}`);
  if ((state.debug?.shotCount || 0) < 1) failures.push(`debug shot count missing: ${JSON.stringify(state.debug)}`);
  if (!Number.isFinite(state.debug?.angle)) failures.push(`debug angle missing: ${JSON.stringify(state.debug)}`);
  if (!state.debug?.mouthBracketVisible) failures.push(`muzzle mouth bracket missing: ${JSON.stringify(state.debug)}`);
  if (!state.debug?.hotCoreVisible) failures.push(`muzzle hot core missing: ${JSON.stringify(state.debug)}`);
  if ((state.debug?.laneBeadCount || 0) !== (state.debug?.shotCount || 0)) failures.push(`muzzle lane beads do not match shot count: ${JSON.stringify(state.debug)}`);
  if ((state.debug?.recoilTickCount || 0) < 2) failures.push(`muzzle recoil ticks missing: ${JSON.stringify(state.debug)}`);
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
  assert(report.ok, `[enemy-muzzle-readability] ${failures.join('; ')}`);
  console.log(`[enemy-muzzle-readability] PASS shots=${state.shotCount} screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
