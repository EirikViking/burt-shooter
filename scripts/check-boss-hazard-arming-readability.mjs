import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4359));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-hazard-arming-readability-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

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
  throw new Error(`No available boss hazard arming check port found starting at ${startPort}`);
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
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    offlineLeaderboard: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startAtBoss: '1',
    startLevel: '6'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
  }, null, { timeout: 30000 });

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!game || !play || !boss || !player) return { ok: false, reason: 'missing boss test surface' };

    const width = game.getWidth?.() || 1280;
    const height = game.getHeight?.() || 720;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState?.();
    if (play.enemyManager) play.enemyManager.enemies = [];
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }

    boss.x = width * 0.5;
    boss.y = 110;
    if (boss.sprite) {
      boss.sprite.x = boss.x;
      boss.sprite.y = boss.y;
    }
    game.lives = 3;
    player.active = true;
    player.invulnerable = false;
    player.invulnerableTime = 0;
    player.x = width * 0.5;
    player.y = height - 78;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    play.bossHazards = [];
    play.lastBossHazardHit = null;
    play.bossHazardLayer?.clear?.();
    play.resetBossLifeLossCap?.('boss_hazard_arming_readability');

    const now = Date.now();
    const armAgeMs = 82;
    const hazards = [
      play.registerBossHazardFromBoss(boss, 'signature', {
        type: 'lance',
        sourceX: width * 0.24,
        sourceY: 128,
        angle: Math.PI / 2,
        playerX: width * 0.24,
        playerY: height - 90
      }),
      play.registerBossHazardFromBoss(boss, 'signature', {
        type: 'ring',
        sourceX: width * 0.42,
        sourceY: height * 0.62,
        playerX: width * 0.68,
        playerY: height * 0.62
      }),
      play.registerBossHazardFromBoss(boss, 'regular', {
        type: 'wall',
        attack: 'wall',
        sourceX: width * 0.78,
        sourceY: 120,
        playerX: width * 0.5,
        playerY: height - 80
      })
    ].filter(Boolean);

    for (const hazard of hazards) {
      hazard.startedAt = now - armAgeMs;
      hazard.elapsedMs = armAgeMs;
      hazard.hit = false;
    }

    play.updateBossHazards(1);

    return {
      ok: true,
      lives: game.lives,
      lastHit: play.lastBossHazardHit,
      hazards: play.bossHazards.map((hazard) => ({
        kind: hazard.kind,
        type: hazard.type,
        armingMs: hazard.armingMs,
        elapsedMs: Math.round(hazard.elapsedMs || 0),
        hit: Boolean(hazard.hit),
        debug: hazard._debugHazardArming || null
      }))
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'boss-hazard-arming-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (state.lives !== 3) failures.push(`arming hazards should not damage the player, lives=${state.lives}`);
  if (state.lastHit) failures.push(`unexpected boss hazard hit during arming: ${JSON.stringify(state.lastHit)}`);
  for (const kind of ['beam', 'ring', 'wall']) {
    const hazard = state.hazards?.find((item) => item.kind === kind);
    if (!hazard) {
      failures.push(`missing ${kind} hazard`);
      continue;
    }
    if (hazard.hit) failures.push(`${kind} hazard hit before arming finished`);
    if (!hazard.debug?.visible || hazard.debug?.armed) failures.push(`${kind} arming debug missing/armed: ${JSON.stringify(hazard.debug)}`);
    if (!Number.isFinite(hazard.debug?.progress) || hazard.debug.progress <= 0 || hazard.debug.progress >= 1) failures.push(`${kind} arming progress out of range: ${JSON.stringify(hazard.debug)}`);
    if ((hazard.debug?.gateCount || 0) < 2) failures.push(`${kind} arming gate count too low: ${JSON.stringify(hazard.debug)}`);
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
  assert(report.ok, `[boss-hazard-arming-readability] ${failures.join('; ')}`);
  console.log(`[boss-hazard-arming-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
