import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

import {
  GENERATED_ENEMY_EXTRA_TOTAL,
  GENERATED_ENEMY_LEGACY_TOTAL
} from '../src/config/GeneratedEnemyProfiles.js';

const host = process.env.LATE_MAYHEM_CAPTURE_HOST || '127.0.0.1';
const port = process.env.LATE_MAYHEM_CAPTURE_URL ? null : (Number(process.env.LATE_MAYHEM_CAPTURE_PORT) || await findAvailablePort(4484));
const baseUrl = process.env.LATE_MAYHEM_CAPTURE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.LATE_MAYHEM_CAPTURE_OUTPUT_DIR || `test-results/late-enemy-mayhem-${timestamp()}`);
const viewport = { width: 1920, height: 1080 };
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

const consoleEvents = [];
const pageErrors = [];
const badResponses = [];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, String(value));
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
  throw new Error(`No available late-mayhem capture port found starting at ${startPort}`);
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

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  if (!existsSync(path.resolve('dist', 'index.html'))) {
    throw new Error('dist/index.html is missing. Run npm run build:current before late-mayhem capture.');
  }
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function observePage(page) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 900) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({ status: response.status(), url: response.url(), method: response.request().method() });
    }
  });
}

function lateEnemySampleTypes(count = 36) {
  const first = GENERATED_ENEMY_LEGACY_TOTAL + 1;
  const last = GENERATED_ENEMY_LEGACY_TOTAL + GENERATED_ENEMY_EXTRA_TOTAL;
  return Array.from({ length: count }, (_, index) => {
    const id = Math.round(first + ((last - first) * index) / Math.max(1, count - 1));
    return `nova_enemy_${String(id).padStart(3, '0')}`;
  });
}

async function waitForPlay(page) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '20',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'play' && window.__game?.scenes?.play?.enemyManager;
    } catch {
      return false;
    }
  }, { timeout: 30000 });
}

async function stageLateMayhem(page, types) {
  return page.evaluate((lateTypes) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !manager || !player) throw new Error('Missing play surface for late-mayhem capture');

    game.markUnrankedRun?.('late_enemy_mayhem_capture');
    game.level = 20;
    game.score = Math.max(game.score || 0, 26000);
    game.lives = Math.max(game.lives || 0, 5);
    player.invulnerable = true;
    player.invulnerableTime = 120000;
    player.tractorDebuffImmunityUntil = Date.now() + 120000;
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.84;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
      player.sprite.visible = true;
    }

    const clearIntroOverlay = () => {
      play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
      play.introActive = false;
      if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
      play.introOverlay = null;
      play.uiOverlay?.children
        ?.filter((child) => child?.label === 'ship_intro_overlay' || child?.label === 'ship_intro_flash')
        .forEach((child) => child.parent?.removeChild(child));
      if (play.uiOverlay) play.uiOverlay.visible = false;
    };
    clearIntroOverlay();
    if (play.isPaused && typeof play.setPaused === 'function') play.setPaused(false);
    manager.level = 20;
    manager.state = 'WAVE_ACTIVE';
    manager.phase = 'WAVES';
    manager.waveEnding = false;
    manager.clearEnemies?.();
    manager.hijacker = null;
    if (play.bulletManager) {
      play.bulletManager.enemyBullets = [];
      play.bulletManager.playerBullets = [];
    }

    lateTypes.forEach((type, index) => {
      manager.spawnWave({
        type,
        count: 1,
        formation: index % 3 === 0 ? 'ORBIT_RING' : index % 3 === 1 ? 'CROSS_STREAM' : 'SCREEN_DOOR',
        tactic: index % 2 === 0 ? 'pulse_net' : 'split_sweep',
        entry: 'single',
        cadence: 1.8
      });
    });

    const screenW = game.getWidth();
    const screenH = game.getHeight();
    const enemies = manager.enemies.filter((enemy) => enemy?.kind === 'enemy');
    const cols = 12;
    enemies.forEach((enemy, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = screenW * 0.11 + col * (screenW * 0.78 / Math.max(1, cols - 1));
      const y = screenH * 0.14 + row * (screenH * 0.115) + (index % 2) * 13;
      enemy.waitingForEntry = false;
      enemy.active = true;
      enemy.state = index % 7 === 0 ? 'DIVE' : 'FORMATION';
      enemy.x = x;
      enemy.y = y;
      enemy.formationX = x;
      enemy.formationY = y;
      enemy.shootCooldown = index % 5 === 0 ? 0 : 9000;
      enemy.tacticalDiveAt = Date.now() + 450 + (index % 9) * 80;
      enemy.tacticalDiveUsed = false;
      if (enemy.sprite) {
        enemy.sprite.visible = true;
        enemy.sprite.renderable = true;
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.alpha = 1;
      }
      enemy.updateHealthBar?.();
      if (index % 13 === 0) {
        play.playEnemyDeathFeedback?.(enemy, { volume: 0.2 });
      }
    });

    enemies.slice(0, 14).forEach((enemy, index) => {
      const shots = enemy.shoot?.(player.x + ((index % 3) - 1) * 120, player.y - 80);
      (Array.isArray(shots) ? shots : shots ? [shots] : []).slice(0, 2).forEach((shot) => {
        if (shot.sprite) {
          shot.sprite.x = shot.x;
          shot.sprite.y = shot.y;
          shot.sprite.visible = true;
        }
        play.bulletManager?.addEnemyBullet?.(shot);
      });
    });

    for (let volley = 0; volley < 5; volley += 1) {
      player.shootCooldown = 0;
      const bullets = player.shoot?.() || [];
      bullets.forEach((bullet, index) => {
        bullet.x = player.x + (index - (bullets.length - 1) / 2) * 18 + (volley - 2) * 13;
        bullet.y = player.y - 48 - volley * 38;
        if (bullet.sprite) {
          bullet.sprite.x = bullet.x;
          bullet.sprite.y = bullet.y;
          bullet.sprite.visible = true;
        }
        play.bulletManager?.addPlayerBullet?.(bullet);
      });
    }

    clearIntroOverlay();
    const lateEnemies = enemies.filter((enemy) => enemy.generatedProfile?.lateMayhem);
    return {
      requestedTypes: lateTypes.length,
      enemyCount: enemies.length,
      lateEnemyCount: lateEnemies.length,
      uniqueLateTypes: new Set(lateEnemies.map((enemy) => enemy.generatedProfile?.type)).size,
      missingLateProfile: enemies.filter((enemy) => !enemy.generatedProfile?.lateMayhem).map((enemy) => enemy.type),
      missingSprites: lateEnemies.filter((enemy) => !enemy.sprite || enemy.sprite.visible === false || enemy.sprite.renderable === false).map((enemy) => enemy.type),
      spriteIndexes: lateEnemies.map((enemy) => enemy.generatedProfile?.spriteIndex).filter(Number.isFinite),
      enemyBullets: play.bulletManager?.enemyBullets?.length || 0,
      playerBullets: play.bulletManager?.playerBullets?.length || 0
    };
  }, types);
}

async function hideUiForCapture(page) {
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play) return;
    play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
    play.introActive = false;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.introOverlay = null;
    if (play.uiOverlay) play.uiOverlay.visible = false;
  });
}

async function collectScreenshotStats(screenshotPath) {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch (error) {
    return { ok: true, reason: `sharp unavailable: ${error.message}` };
  }
  const { data: sample, info } = await sharp(screenshotPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const stride = 97 * channels;
  let brightSamples = 0;
  let coloredSamples = 0;
  for (let index = 0; index < sample.length; index += stride) {
    const r = sample[index];
    const g = sample[index + 1];
    const b = sample[index + 2];
    if (r + g + b > 120) brightSamples += 1;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 35) coloredSamples += 1;
  }
  return { ok: true, width, height, brightSamples, coloredSamples };
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport });
observePage(page);

let stage = null;
let imageStats = null;
const screenshot = path.join(outputDir, 'late-enemy-mayhem-level20.png');

try {
  await waitForPlay(page);
  const types = lateEnemySampleTypes();
  stage = await stageLateMayhem(page, types);
  await page.waitForTimeout(650);
  await hideUiForCapture(page);
  await page.screenshot({ path: screenshot, fullPage: true });
  imageStats = await collectScreenshotStats(screenshot);
} finally {
  await browser.close();
  if (server) server.kill();
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  screenshot,
  stage,
  imageStats,
  consoleEvents,
  pageErrors,
  badResponses
};
writeFileSync(path.join(outputDir, 'late-enemy-mayhem-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const ok = stage?.lateEnemyCount >= 30 &&
  stage?.uniqueLateTypes === stage?.requestedTypes &&
  stage?.missingLateProfile?.length === 0 &&
  stage?.missingSprites?.length === 0 &&
  imageStats?.ok &&
  (imageStats.coloredSamples === undefined || imageStats.coloredSamples > 120) &&
  pageErrors.length === 0 &&
  badResponses.length === 0;

if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`[late-enemy-mayhem-capture] PASS late=${stage.lateEnemyCount}/${stage.requestedTypes} bullets=${stage.enemyBullets}/${stage.playerBullets} coloredSamples=${imageStats.coloredSamples ?? 'unverified'} screenshot=${screenshot}`);
