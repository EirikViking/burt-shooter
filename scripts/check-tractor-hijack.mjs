import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4331));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tractor-hijack-${timestamp()}`);
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
    startLevel: '2',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
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

    const targets = enemyManager.enemies
      .filter(enemy => enemy.kind !== 'boss')
      .slice(0, 4);
    while (targets.length < 4) {
      const staged = {
        kind: 'tractor_hijack_test_target',
        type: 'chaser',
        active: true,
        waitingForEntry: false,
        radius: 22,
        color: 0x8fffd5,
        health: 1,
        maxHealth: 1,
        canShoot: () => false,
        shoot: () => null,
        update: () => {},
        destroy() {
          this.destroyed = true;
          this.active = false;
        }
      };
      enemyManager.enemies.push(staged);
      targets.push(staged);
    }
    targets.forEach((enemy, index) => {
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
        enemy.x = sourceX + 58 + index * 8;
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
    hijacker.beamActiveMs = 4000;
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
      bullet.x = sourceX + 50 + i * 8;
      bullet.y = sourceY + 100 + i * 60;
      bullet.vx = 0;
      bullet.vy = 0;
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
  mkdirSync(outputDir, { recursive: true });
  const activeScreenshot = path.join(outputDir, 'tractor-active-chain-hit-feedback.png');
  await page.evaluate(() => {
    const hijacker = window.__game?.scenes?.play?.enemyManager?.hijacker;
    if (!hijacker) throw new Error('Hijacker missing before active-state screenshot');
    hijacker.triggerHitFeedback('chain_lightning');
  });
  await page.waitForTimeout(30);
  await page.screenshot({ path: activeScreenshot, fullPage: true });

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
  const screenshot = path.join(outputDir, 'tractor-hijack-payoff.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const last = hijackedState.tractorHijack?.last || {};
  const expectedBreakGain = await page.evaluate(() => window.__game?.getScoreAward?.(1700) || 1700);
  const expectedRawBonus = 600 + (last.capturedEnemies || 0) * 360 + (last.clearedBullets || 0) * 25;
  const expectedAppliedBonus = await page.evaluate((raw) => window.__game?.getScoreAward?.(raw) || raw, expectedRawBonus);
  const expectedMinimumGain = Math.max(0, expectedBreakGain + (last.bonusScore || 0) - 2);
  const actualGain = hijackedState.score - scoreBeforeBreak;
  const unexpectedConsoleWarningsOrErrors = consoleWarningsOrErrors.filter((message) =>
    !message.includes('[SW] Service worker script missing or invalid, skipping registration.')
  );
  const report = {
    ok: last.triggered === true &&
      last.capturedEnemies >= 3 &&
      last.clearedBullets >= 1 &&
      last.bonusScore >= expectedAppliedBonus - 2 &&
      actualGain >= expectedMinimumGain &&
      hijackedState.audio?.lastVoiceEvent === 'mission_control_tractor_hijack' &&
      pageErrors.length === 0 &&
      unexpectedConsoleWarningsOrErrors.length === 0,
    baseUrl,
    scoreBeforeBreak,
    scoreAfterBreak: hijackedState.score,
    actualGain,
    expectedBreakGain,
    expectedRawBonus,
    expectedAppliedBonus,
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
    unexpectedConsoleWarningsOrErrors,
    activeScreenshot,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[tractor-hijack] PASS captured=${last.capturedEnemies} bullets=${last.clearedBullets} gain=${actualGain} voice=${hijackedState.audio?.lastVoiceTrack || 'none'} activeScreenshot=${activeScreenshot} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
