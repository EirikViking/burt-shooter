import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4331));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tractor-hijack-${timestamp()}`);

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
  for (let candidate = startPort; candidate < startPort + 40; candidate++) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
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
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 15000) {
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

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  localStorage.setItem('burt_voice_enabled', 'true');
  localStorage.setItem('burt_volume_voice', '0.7');
});
const pageErrors = [];
const consoleWarningsOrErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') consoleWarningsOrErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '2'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.player?.active;
  }, { timeout: 30000 });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const enemyManager = play?.enemyManager;
    if (!game || !play || !player || !enemyManager) throw new Error('Missing play scene for tractor hijack check');

    enemyManager.enemies.forEach(enemy => {
      if (enemy.kind !== 'boss') {
        enemy.active = false;
        enemy.destroy?.();
        if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
      }
    });
    enemyManager.enemies = enemyManager.enemies.filter(enemy => enemy.kind === 'boss' && enemy.active !== false);

    enemyManager.spawnWave({
      count: 4,
      formation: 'TUTORIAL_ARC',
      type: 'chaser',
      entry: 'single',
      cadence: 10
    });

    const width = game.getWidth();
    const height = game.getHeight();
    const sourceX = Math.round(width * 0.52);
    const sourceY = 132;
    const playerY = Math.round(height * 0.79);

    enemyManager.enemies
      .filter(enemy => enemy.kind !== 'boss')
      .slice(0, 4)
      .forEach((enemy, index) => {
        const t = 0.28 + index * 0.13;
        enemy.waitingForEntry = false;
        enemy.active = true;
        enemy.state = 'FORMATION';
        enemy.health = 1;
        enemy.maxHealth = 1;
        enemy.radius = 22;
        enemy.speed = 0;
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.x = sourceX + (index - 1.5) * 22;
        enemy.y = sourceY + (playerY - sourceY) * t;
        enemy.update = () => {};
        if (enemy.sprite) {
          enemy.sprite.x = enemy.x;
          enemy.sprite.y = enemy.y;
          enemy.sprite.visible = true;
          enemy.sprite.renderable = true;
        }
        enemy.updateHealthBar?.();
      });

    enemyManager.spawnHijacker();
    const hijacker = enemyManager.hijacker;
    if (!hijacker) throw new Error('Hijacker failed to spawn');
    hijacker.x = sourceX;
    hijacker.y = sourceY;
    hijacker.baseY = sourceY;
    hijacker.health = 30;
    hijacker.maxHealth = 30;
    hijacker.beamActiveMs = 2200;
    hijacker.beamWarningMs = 120;
    hijacker.sprite.x = hijacker.x;
    hijacker.sprite.y = hijacker.y;
    hijacker.updateHealthBar?.();

    player.x = sourceX;
    player.y = playerY;
    player.invulnerable = true;
    player.invulnerableTime = 12000;

    for (let i = 0; i < 3; i++) {
      const bullet = hijacker.shoot(player.x, player.y);
      bullet.x = sourceX + (i - 1) * 28;
      bullet.y = sourceY + 210 + i * 74;
      if (bullet.sprite) {
        bullet.sprite.x = bullet.x;
        bullet.sprite.y = bullet.y;
      }
      play.bulletManager.addEnemyBullet(bullet);
    }

    hijacker.activateBeam(player.x, player.y);
    hijacker.updateTractorBeam(1, player.x, player.y);
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.hijacker?.tractor?.state === 'active' && state.hijacker?.tractor?.pullActive === true;
  }, { timeout: 5000 });

  const armedState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const scoreBeforeBreak = armedState.score;

  await page.evaluate(() => {
    const hijacker = window.__game?.scenes?.play?.enemyManager?.hijacker;
    if (!hijacker) throw new Error('Hijacker missing before tractor hijack');
    hijacker.takeDamage(9999);
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.tractorHijack?.last?.triggered === true && !state.hijacker;
  }, { timeout: 4000 });

  const hijackedState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'tractor-hijack-payoff.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const last = hijackedState.tractorHijack?.last || {};
  const expectedMinimumGain = 1700 + last.bonusScore;
  const actualGain = hijackedState.score - scoreBeforeBreak;
  const report = {
    ok: last.triggered === true &&
      last.capturedEnemies >= 3 &&
      last.clearedBullets >= 1 &&
      last.bonusScore >= 600 + last.capturedEnemies * 360 + last.clearedBullets * 25 &&
      actualGain >= expectedMinimumGain &&
      hijackedState.audio?.lastVoiceEvent === 'mission_control_tractor_hijack' &&
      pageErrors.length === 0 &&
      consoleWarningsOrErrors.length === 0,
    baseUrl,
    scoreBeforeBreak,
    scoreAfterBreak: hijackedState.score,
    actualGain,
    expectedMinimumGain,
    tractor: armedState.hijacker?.tractor || null,
    tractorHijack: last,
    audio: {
      lastVoiceEvent: hijackedState.audio?.lastVoiceEvent || null,
      lastVoiceTrack: hijackedState.audio?.lastVoiceTrack || null,
      activeVoiceEvents: hijackedState.audio?.activeVoiceEvents || []
    },
    pageErrors,
    consoleWarningsOrErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[tractor-hijack] PASS captured=${last.capturedEnemies} bullets=${last.clearedBullets} gain=${actualGain} voice=${hijackedState.audio?.lastVoiceTrack || 'none'} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
