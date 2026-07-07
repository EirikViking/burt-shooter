import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4478));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/player-projectile-readability-${timestamp()}`);

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
  throw new Error(`No available player projectile readability port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.bulletManager && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const state = await page.evaluate(async () => {
    const { Bullet } = await import('/src/entities/Bullet.js');
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const bm = play?.bulletManager;
    if (!game || !play || !player || !bm) return { ok: false, reason: 'missing play/player/bullet manager' };
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    const removeSprite = (bullet) => {
      if (bullet?.sprite?.parent) bullet.sprite.parent.removeChild(bullet.sprite);
    };
    [...(bm.playerBullets || []), ...(bm.enemyBullets || [])].forEach(removeSprite);
    bm.playerBullets = [];
    bm.enemyBullets = [];

    player.x = game.getWidth() * 0.48;
    player.y = game.getHeight() * 0.72;
    player.sprite.x = player.x;
    player.sprite.y = player.y;

    const friendly = new Bullet(player.x - 36, player.y - 74, 0, -7, 1, 0x66f7ff, true);
    const hostile = new Bullet(player.x + 48, player.y - 140, 0, 2.2, 1, 0xff4055, false, {
      radius: 8,
      warningColor: 0xff4055,
      trailColor: 0xff4055,
      haloColor: 0xff8a66
    });
    bm.addPlayerBullet(friendly);
    bm.addEnemyBullet(hostile);
    friendly.update(1);
    hostile.update(1);

    return {
      ok: true,
      player: friendly.sprite?._debugProjectileReadability || null,
      enemy: hostile.sprite?._debugProjectileReadability || null,
      counts: {
        playerBullets: bm.playerBullets.length,
        enemyBullets: bm.enemyBullets.length
      },
      markers: {
        friendlyGlints: friendly.sprite?.children?.filter?.((child) => child?.__novaPlayerProjectileFriendlyGlint)?.length || 0,
        friendlyWings: friendly.sprite?.children?.filter?.((child) => child?.__novaPlayerProjectileWingTrace)?.length || 0,
        enemyDangerGlints: hostile.sprite?.children?.filter?.((child) => child?.__novaProjectileDangerGlint)?.length || 0
      }
    };
  });

  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, 'player-projectile-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (state.counts?.playerBullets !== 1) failures.push(`player bullet count mismatch: ${JSON.stringify(state.counts)}`);
  if (state.counts?.enemyBullets !== 1) failures.push(`enemy bullet count mismatch: ${JSON.stringify(state.counts)}`);
  if (!state.player?.isPlayer) failures.push(`player debug missing isPlayer: ${JSON.stringify(state.player)}`);
  if (!state.player?.friendlyGlint || !state.player?.friendlyWingTrace) failures.push(`friendly projectile markers missing: ${JSON.stringify(state.player)}`);
  if (state.player?.dangerGlint) failures.push(`player bullet should not have danger glint: ${JSON.stringify(state.player)}`);
  if (state.enemy?.friendlyGlint || state.enemy?.friendlyWingTrace) failures.push(`enemy bullet should not have friendly markers: ${JSON.stringify(state.enemy)}`);
  if (!state.enemy?.dangerGlint) failures.push(`enemy danger glint missing: ${JSON.stringify(state.enemy)}`);
  if ((state.markers?.friendlyGlints || 0) !== 1 || (state.markers?.friendlyWings || 0) !== 1) failures.push(`friendly marker child counts mismatch: ${JSON.stringify(state.markers)}`);
  if ((state.markers?.enemyDangerGlints || 0) !== 1) failures.push(`enemy danger glint count mismatch: ${JSON.stringify(state.markers)}`);
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
  assert(report.ok, `[player-projectile-readability] ${failures.join('; ')}`);
  console.log(`[player-projectile-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
