import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(4981);
const baseUrl = `http://${host}:${port}/?controlSmoke=1`;
const outputDir = path.resolve(`test-results/sector75-pressure-acceptance-${timestamp()}`);
const rawVideoDir = path.join(outputDir, 'raw-video');
const outputVideo = path.join(outputDir, 'sector-75-experimental-pressure.webm');
const screenshotPath = path.join(outputDir, 'sector-75-action.png');
const reportPath = path.join(outputDir, 'report.json');
const captureSeconds = Math.max(20, Number(process.env.SECTOR75_CAPTURE_SECONDS) || 24);

const matureProfile = {
  bestScore: 1000000,
  bestSector: 150,
  bestLevel: 150,
  bestRank: 50,
  pilotRank: 50,
  pilotXp: 999999,
  totalRuns: 100,
  totalBossesDefeated: 150,
  totalWavesCleared: 1200,
  totalCodexDiscoveries: 5000,
  unlockedShipIds: Array.from({ length: 30 }, (_, index) =>
    `nova_ship_${String(index + 1).padStart(2, '0')}`
  )
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(start) {
  for (let candidate = start; candidate < start + 30; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No local port available for Sector 75 acceptance capture');
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if ((await fetch(url, { cache: 'no-store' })).ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Preview did not become ready at ${url}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

if (!existsSync(path.resolve('dist', 'index.html'))) {
  throw new Error('dist/index.html is missing. Run npm run build:current before capture.');
}

mkdirSync(rawVideoDir, { recursive: true });
const server = spawn(process.execPath, [
  path.resolve('node_modules/vite/bin/vite.js'),
  'preview', '--host', host, '--port', String(port), '--strictPort'
], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

let browser;
let context;
let page;
let video;
const pageErrors = [];
const consoleErrors = [];
const samples = [];

try {
  await waitForServer(baseUrl);
  const executablePath = findChrome();
  assert.ok(executablePath, 'Installed Chrome or Edge is required');
  browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: rawVideoDir, size: { width: 1366, height: 768 } }
  });
  await context.addInitScript((profile) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(profile));
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('burt_music_enabled', 'false');
    localStorage.setItem('burt_voice_enabled', 'false');
    window.__novaLeaderboardMode = 'local';
  }, matureProfile);
  page = await context.newPage();
  video = page.video();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame), null, { timeout: 90000 });

  const started = await page.evaluate(() => window.__game.startGame('nova-player-ship-06.png', {
    countShipUsage: false,
    lateGameExperiment: {
      acknowledged: true,
      scenario: 'endurance',
      ruleset: 'tactical',
      fixtureId: 'tactical_saturation_bounded',
      startSector: 75,
      lifeStock: 'mature_stock',
      phasePulseAvailable: true
    }
  }));
  assert.equal(started, true, 'Sector 75 experiment must launch');
  await page.waitForFunction(() => {
    const game = window.__game;
    const manager = game?.scenes?.play?.enemyManager;
    return game?.lateGameExperiment?.active === true
      && game?.level === 75
      && manager?.state === 'WAVE_ACTIVE'
      && manager?.enemies?.some?.((enemy) => enemy?.active !== false);
  }, null, { timeout: 90000 });

  const plan = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    play.player.invulnerable = true;
    play.player.invulnerableTime = 600000;
    return {
      experimentActive: game.lateGameExperiment?.active === true,
      sector: game.level,
      difficulty: manager.currentNormalWaveDifficultyLevel,
      pressureBand: game.runPressureDirector.getNormalWavePressureTuning(game.level)?.id || null,
      waveCount: manager.waves.length,
      plannedEnemies: manager.waves.reduce((sum, wave) => sum + (Number(wave?.count) || 0), 0),
      authoredWaves: manager.waves.filter((wave) => wave?.highSectorBeatId).length,
      bridgeWaves: manager.waves.filter((wave) => wave?.highSectorPressureBridge === true).length,
      dangerWaves: manager.waves.filter((wave) => wave?.earlyThreatMoment).length,
      pressureFloor: manager.highSectorEscalationState?.preserveNativePressure === true
    };
  });

  await page.locator('canvas').click({ position: { x: 683, y: 500 } });
  const startedAt = Date.now();
  let direction = 'ArrowLeft';
  await page.keyboard.down(direction);
  for (let second = 0; second < captureSeconds; second += 1) {
    if (second > 0 && second % 4 === 0) {
      await page.keyboard.up(direction);
      direction = direction === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
      await page.keyboard.down(direction);
    }
    await page.waitForTimeout(1000);
    const sample = await page.evaluate(() => {
      const game = window.__game;
      const play = game.scenes.play;
      const manager = play.enemyManager;
      return {
        elapsedMs: Date.now(),
        sector: game.level,
        wave: manager.currentWaveIndex + 1,
        state: manager.state,
        activeEnemies: manager.enemies.filter((enemy) => enemy?.active !== false).length,
        hostileProjectiles: play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false).length,
        playerProjectiles: play.bulletManager.playerBullets.filter((bullet) => bullet?.active !== false).length,
        score: game.score,
        lives: game.lives
      };
    });
    sample.elapsedMs -= startedAt;
    samples.push(sample);
    if (second === Math.floor(captureSeconds / 2)) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  }
  await page.keyboard.up(direction);

  assert.equal(plan.experimentActive, true);
  assert.equal(plan.sector, 75);
  assert.equal(plan.pressureFloor, true);
  assert.equal(plan.difficulty, 82);
  assert.equal(plan.pressureBand, 'deep_overrun');
  assert.equal(plan.waveCount, 8);
  assert.ok(plan.plannedEnemies >= 136);
  assert.equal(plan.authoredWaves, 5);
  assert.equal(plan.bridgeWaves, 3);
  assert.ok(plan.dangerWaves >= 3);
  assert.ok(Math.max(...samples.map((sample) => sample.activeEnemies)) >= 15);
  assert.ok(Math.max(...samples.map((sample) => sample.hostileProjectiles)) >= 20);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);

  await page.close();
  await video.saveAs(outputVideo);
  const report = {
    pass: true,
    generatedAt: new Date().toISOString(),
    source: 'production dist preview',
    captureSeconds,
    captureSafety: 'The capture player was invulnerable only to keep the visual evidence uninterrupted; enemy generation, pressure, firing, and wave progression were not altered.',
    plan,
    peaks: {
      activeEnemies: Math.max(...samples.map((sample) => sample.activeEnemies)),
      hostileProjectiles: Math.max(...samples.map((sample) => sample.hostileProjectiles)),
      playerProjectiles: Math.max(...samples.map((sample) => sample.playerProjectiles))
    },
    distinctWavesSeen: [...new Set(samples.map((sample) => sample.wave))],
    samples,
    pageErrors,
    consoleErrors,
    video: outputVideo,
    screenshot: screenshotPath
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[sector75-pressure-capture] PASS video=${outputVideo} report=${reportPath}`);
} finally {
  await page?.close().catch(() => {});
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  server.kill();
}
