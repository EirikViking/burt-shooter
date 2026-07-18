import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4647));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/row-core-runtime-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  throw new Error(`No available Row Core runtime port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return play?.isReady === true && play?.player && play?.powerupManager;
  }, null, { timeout: 90000 });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.introActive = false;
    play.player.invulnerable = true;
    play.player.invulnerableTime = 60000;
    window.__rowCoreQaEvents = [];
    window.__rowCoreQaPhase = 'setup';
    const originalPlay = HTMLMediaElement.prototype.play;
    window.__rowCoreQaOriginalPlay = originalPlay;
    HTMLMediaElement.prototype.play = function patchedRowCoreQaPlay() {
      const source = this.currentSrc || this.src || '';
      const track = decodeURIComponent(source.split('/').pop()?.split('?')[0] || '');
      window.__rowCoreQaEvents.push({
        phase: window.__rowCoreQaPhase,
        bus: source.includes('/voice/') ? 'voice' : 'sfx',
        track,
        at: Date.now()
      });
      return originalPlay.call(this);
    };
  });

  const cold = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    window.__rowCoreQaPhase = 'cold';
    const pickup = play.powerupManager.spawnSpecific(player.x, player.y, 'row_core', {
      source: 'row_core_runtime_cold',
      spawnKey: 'row_core_runtime:cold'
    });
    pickup.collect(player, play);
    return {
      spawnId: pickup.spawnId,
      spawnKey: pickup.spawnKey,
      active: player.rowCoreActive,
      uses: player.rowCoreStats.uses
    };
  });
  await page.waitForTimeout(450);

  await page.evaluate(() => {
    const player = window.__game.scenes.play.player;
    player.clearRowCoreTimers();
    player.rowCoreActive = false;
    player.rowCoreStartedAt = 0;
    window.__burtKeyboardOverride = { Space: true };
    window.__rowCoreQaPhase = 'combat_load';
  });
  await page.waitForTimeout(1700);

  const loaded = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    for (let index = 0; index < 42; index += 1) {
      player.shootCooldown = 0;
      for (const bullet of player.shoot()) play.bulletManager.addPlayerBullet(bullet);
    }
    play.playShootSoundWithHealthCheck?.();
    window.__rowCoreQaPhase = 'loaded_pickup';
    const pickup = play.powerupManager.spawnSpecific(player.x, player.y, 'row_core', {
      source: 'row_core_runtime_loaded',
      spawnKey: 'row_core_runtime:loaded'
    });
    pickup.collect(player, play);
    return {
      spawnId: pickup.spawnId,
      spawnKey: pickup.spawnKey,
      active: player.rowCoreActive,
      uses: player.rowCoreStats.uses,
      playerBullets: play.bulletManager.playerBullets.length,
      enemyBullets: play.bulletManager.enemyBullets.length,
      enemies: play.enemyManager.enemies.filter((enemy) => enemy?.active !== false).length
    };
  });
  await page.waitForTimeout(1250);
  await page.evaluate(() => {
    window.__burtKeyboardOverride = { Space: false };
  });

  const screenshot = path.join(outputDir, 'row-core-loaded-repeat.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const result = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      events: structuredClone(window.__rowCoreQaEvents || []),
      rowCoreStats: structuredClone(play.player.rowCoreStats),
      rowCoreActive: play.player.rowCoreActive,
      pickupSpawns: play.powerupManager.getDebugState?.() || null
    };
  });

  const eventsFor = (phase) => result.events.filter((event) => event.phase === phase);
  const coldEvents = eventsFor('cold');
  const loadedEvents = eventsFor('loaded_pickup');
  const vikingCount = (events) => events.filter((event) =>
    event.bus === 'sfx' && event.track.includes('nova_row_core_viking_row')).length;
  const hasMaskedPickup = (events) => events.some((event) =>
    event.track.includes('nova_row_core_pickup') ||
    (event.bus === 'voice' && event.track.includes('mission_control_powerup')));

  const failures = [];
  if (!cold.active || cold.uses !== 1) failures.push(`cold pickup did not activate: ${JSON.stringify(cold)}`);
  if (!loaded.active || loaded.uses !== 2) failures.push(`loaded repeat did not reactivate: ${JSON.stringify(loaded)}`);
  if (cold.spawnId === loaded.spawnId || cold.spawnKey === loaded.spawnKey) {
    failures.push(`distinct acquisitions lost ownership identity: cold=${cold.spawnId}/${cold.spawnKey} loaded=${loaded.spawnId}/${loaded.spawnKey}`);
  }
  if (vikingCount(coldEvents) !== 1) failures.push(`cold chant count=${vikingCount(coldEvents)} events=${JSON.stringify(coldEvents)}`);
  if (vikingCount(loadedEvents) !== 1) failures.push(`loaded chant count=${vikingCount(loadedEvents)} events=${JSON.stringify(loadedEvents)}`);
  if (hasMaskedPickup(coldEvents) || hasMaskedPickup(loadedEvents)) failures.push('generic pickup audio masked a Row Core chant');
  if (loaded.playerBullets < 1 && loaded.enemyBullets < 1 && loaded.enemies < 1) {
    failures.push(`loaded case did not establish gameplay activity: ${JSON.stringify(loaded)}`);
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);

  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl,
    cold,
    loaded,
    result,
    pageErrors,
    consoleErrors,
    failures,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[row-core-runtime] ${failures.join('; ')}`);
  console.log(
    `[row-core-runtime] PASS chants=cold:${vikingCount(coldEvents)},loaded:${vikingCount(loadedEvents)}` +
    ` uses=${result.rowCoreStats.uses} combat=${loaded.playerBullets}/${loaded.enemyBullets}/${loaded.enemies}` +
    ` screenshot=${screenshot}`
  );
} finally {
  await page.evaluate(() => {
    window.__burtKeyboardOverride = { Space: false };
    const play = window.__game?.scenes?.play;
    play?.player?.clearRowCoreTimers?.();
  }).catch(() => {});
  await page.close({ runBeforeUnload: false }).catch(() => {});
  await browser.close();
  if (server) server.kill();
}
