import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(4920);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/runback-agency-lifecycle-${new Date().toISOString().replace(/[:.]/g, '-')}`);

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No available lifecycle-check port');
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : 'npx.cmd';
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('Lifecycle-check server did not start');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function seedReturningProfile(page) {
  await page.goto(`${baseUrl}/?desktop=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: 2 }));
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.waitForFunction(async () => {
    const { GameAssets: assets } = await import('/src/utils/GameAssets.js');
    return assets.isValidTexture(assets.getRankShipTexture(0));
  }, null, { timeout: 30000, polling: 100 });
}

async function reachNaturalRunback(page) {
  await page.evaluate(async () => {
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    await window.__game.startGame(undefined, {
      runMode: 'mayhem_tactical',
      inputDevice: 'keyboard',
      countShipUsage: false
    });
    const { GameAssets } = await import('/src/utils/GameAssets.js');
    const { getShipMetadata } = await import('/src/config/ShipMetadata.js');
    const textureIndex = getShipMetadata(window.__game.selectedShipSpriteKey)?.textureIndex ?? 0;
    await GameAssets.ensureRankShipTexture(textureIndex);
    window.__game.gameOver();
  });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'gameOver', null, { timeout: 10000 });
  await page.waitForFunction(() => window.__game?.scenes?.gameOver?.state === 'runback', null, { timeout: 15000 });
}

async function runLifecycle(page, { delaySelectedTextureMs = 0 } = {}) {
  await reachNaturalRunback(page);
  const setup = await page.evaluate(async ({ delayMs }) => {
    const game = window.__game;
    const scene = game.scenes.gameOver;
    const { GameAssets: assets } = await import('/src/utils/GameAssets.js');
    const { getShipMetadata } = await import('/src/config/ShipMetadata.js');
    const selectedIndex = Math.max(0, Math.floor(Number(getShipMetadata(game.selectedShipSpriteKey)?.textureIndex) || 0));
    const cachedTexture = assets.getRankShipTexture(selectedIndex);
    if (!assets.isValidTexture(cachedTexture)) throw new Error('fixture selected hull is not cached');

    if (delayMs > 0) {
      const originalEnsure = assets.ensureRankShipTexture.bind(assets);
      assets.rankShipTextures[selectedIndex] = null;
      assets.ensureRankShipTexture = async (index) => {
        if (Number(index) !== selectedIndex) return originalEnsure(index);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        assets.rankShipTextures[selectedIndex] = cachedTexture;
        return cachedTexture;
      };
    }

    const monitor = {
      acceptedAt: performance.now(),
      firstPlayAt: null,
      firstPendingAt: null,
      firstActiveAt: null,
      firstCompleteAt: null,
      firstMovementAt: null,
      firstShotAt: null,
      correctHullAtActive: null,
      pendingAlphaSamples: [],
      clockAtPendingStart: null,
      clockAtActiveStart: null,
      clockAtComplete: null,
      agencyViolations: [],
      sceneHistory: [],
      xAtPlay: null,
      shotsAtPlay: null,
      stateHistory: []
    };
    window.__runbackLifecycleMonitor = monitor;
    const sample = () => {
      const now = performance.now();
      const play = game.scenes.play;
      const sceneName = game.currentSceneName;
      if (!monitor.sceneHistory.includes(sceneName)) monitor.sceneHistory.push(sceneName);
      if (sceneName === 'play' && play?.player) {
        const agency = play.shipIntroAgencyState;
        const activeBullets = play.bulletManager?.playerBullets?.filter?.((bullet) => bullet?.active !== false)?.length || 0;
        const shots = Number(play.player.traitShotCounter) || activeBullets;
        if (monitor.firstPlayAt == null) {
          monitor.firstPlayAt = now;
          monitor.xAtPlay = Number(play.player.x) || 0;
          monitor.shotsAtPlay = shots;
          window.__burtKeyboardOverride = { ArrowRight: true, KeyD: true, Space: true };
        }
        if (monitor.stateHistory.at(-1) !== agency) monitor.stateHistory.push(agency);
        if (agency === 'pending') {
          if (monitor.firstPendingAt == null) {
            monitor.firstPendingAt = now;
            monitor.clockAtPendingStart = Number(play.gameTime) || 0;
          }
          monitor.pendingAlphaSamples.push(Number(play.player.sprite?.alpha));
        }
        if (agency === 'active' && monitor.firstActiveAt == null) {
          monitor.firstActiveAt = now;
          monitor.clockAtActiveStart = Number(play.gameTime) || 0;
          monitor.correctHullAtActive = play.player.shipSprite?.texture === assets.getRankShipTexture(selectedIndex);
        }
        if (agency === 'complete' && monitor.firstCompleteAt == null) {
          monitor.firstCompleteAt = now;
          monitor.clockAtComplete = Number(play.gameTime) || 0;
        }
        const moved = Number(play.player.x) > monitor.xAtPlay + 0.5;
        const shot = shots > monitor.shotsAtPlay;
        if (agency !== 'complete' && (moved || shot)) {
          monitor.agencyViolations.push({ now, agency, moved, shot, x: play.player.x, shots });
        }
        if (agency === 'complete' && moved && monitor.firstMovementAt == null) monitor.firstMovementAt = now;
        if (agency === 'complete' && shot && monitor.firstShotAt == null) monitor.firstShotAt = now;
      }
      if (now - monitor.acceptedAt < 3500) requestAnimationFrame(sample);
      else window.__burtKeyboardOverride = null;
    };
    requestAnimationFrame(sample);
    scene.retryButton.emit('pointerdown', { type: 'pointerdown', button: 0 });
    return { cachedAtAcceptance: delayMs === 0, delayMs };
  }, { delayMs: delaySelectedTextureMs });

  await page.waitForFunction(() => window.__runbackLifecycleMonitor?.firstCompleteAt != null, null, { timeout: 10000 });
  await page.screenshot({
    path: path.join(outputDir, delaySelectedTextureMs ? 'uncached-complete-1280x720.png' : 'cached-complete-1280x720.png')
  });
  await page.waitForTimeout(800);
  const monitor = await page.evaluate(() => window.__runbackLifecycleMonitor);
  return { setup, monitor };
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const chromePath = findChrome();
const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
const report = { status: 'passed', outputDir, scenarios: [] };

try {
  for (const scenario of [
    { id: 'cached-warm-runback', delaySelectedTextureMs: 0 },
    { id: 'uncached-safe-fallback', delaySelectedTextureMs: 900 }
  ]) {
    const videoDir = path.join(outputDir, 'raw-video');
    mkdirSync(videoDir, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } }
    });
    const page = await context.newPage();
    const video = page.video();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await seedReturningProfile(page);
    const result = await runLifecycle(page, scenario);
    const { monitor } = result;
    assert.deepEqual(monitor.sceneHistory, ['play'], `${scenario.id}: no intermediate scene allowed`);
    assert.deepEqual(monitor.stateHistory, scenario.delaySelectedTextureMs ? ['pending', 'active', 'complete'] : ['active', 'complete']);
    assert.deepEqual(monitor.agencyViolations, [], `${scenario.id}: player agency leaked before completion`);
    assert(monitor.firstMovementAt != null, `${scenario.id}: movement did not activate after completion`);
    assert(monitor.firstShotAt != null, `${scenario.id}: firing did not activate after completion`);
    assert.equal(monitor.correctHullAtActive, true, `${scenario.id}: intro showed an incorrect hull`);
    assert(monitor.pendingAlphaSamples.every((alpha) => alpha === 0), `${scenario.id}: pending hull was visible`);
    assert.equal(pageErrors.length, 0, `${scenario.id}: page errors: ${pageErrors.join('; ')}`);
    const acceptedToControl = Math.max(monitor.firstMovementAt, monitor.firstShotAt) - monitor.acceptedAt;
    if (!scenario.delaySelectedTextureMs) {
      assert(acceptedToControl <= 750, `cached warm runback control took ${acceptedToControl.toFixed(1)}ms`);
      assert(monitor.firstActiveAt - monitor.acceptedAt <= 250, 'cached warm runback did not start its intro immediately');
    } else {
      assert(monitor.firstActiveAt - monitor.acceptedAt >= 850, 'uncached fallback did not wait for its exact hull');
      assert(monitor.clockAtActiveStart > monitor.clockAtPendingStart, 'pending gameplay-clock semantics changed');
    }
    assert(Math.abs(monitor.clockAtComplete - monitor.clockAtActiveStart) < 0.08, 'active intro gameplay-clock freeze changed');
    const videoPath = path.join(outputDir, `${scenario.id}-1280x720.webm`);
    report.scenarios.push({
      id: scenario.id,
      acceptedToControlMs: acceptedToControl,
      acceptedToActiveMs: monitor.firstActiveAt - monitor.acceptedAt,
      acceptedToCompleteMs: monitor.firstCompleteAt - monitor.acceptedAt,
      monitor,
      pageErrors,
      video: videoPath
    });
    await page.close();
    await video?.saveAs(videoPath);
    await context.close();
  }

  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[runback-agency-lifecycle] PASS report=${path.join(outputDir, 'report.json')}`);
  console.log(JSON.stringify(report.scenarios.map(({ id, acceptedToControlMs, acceptedToActiveMs, acceptedToCompleteMs }) => ({
    id,
    acceptedToControlMs,
    acceptedToActiveMs,
    acceptedToCompleteMs
  })), null, 2));
} finally {
  await browser.close();
  server.kill();
}
