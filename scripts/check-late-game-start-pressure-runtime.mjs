import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(4971);
const baseUrl = `http://${host}:${port}/?controlSmoke=1`;
const outputDir = path.resolve(`test-results/late-game-start-pressure-runtime-${timestamp()}`);
const fixedSeed = 'late-game-start-pressure-acceptance-20260812';
const matureProfile = {
  bestScore: 1000000,
  bestSector: 150,
  bestLevel: 150,
  bestRank: 50,
  pilotRank: 50,
  pilotXp: 999999,
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
  throw new Error('No local port available for late-game pressure runtime check');
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not become ready at ${url}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function summarizeWave(wave, index) {
  return {
    index,
    count: Math.max(0, Number(wave?.count) || 0),
    cadence: Number(Number(wave?.cadence || 0).toFixed(3)),
    difficulty: Number(wave?.normalWaveDifficultyLevel) || 0,
    dangerMoment: wave?.earlyThreatMoment || null,
    dangerMidCount: Array.isArray(wave?.dangerMidShipIds) ? wave.dangerMidShipIds.length : 0,
    eliteCount: (wave?.eliteMiddleShipId ? 1 : 0)
      + (Array.isArray(wave?.multiEliteMiddleShipIds) ? wave.multiEliteMiddleShipIds.length : 0),
    forcedThreatCount: Array.isArray(wave?.forcedThreatActionIds) ? wave.forcedThreatActionIds.length : 0,
    authoredBeat: wave?.highSectorBeatId || null,
    pressureBridge: wave?.highSectorPressureBridge === true,
    fireScalar: Number(wave?.highSectorTacticOverrides?.fireScalar ?? 1),
    fireDelayMult: Number(wave?.highSectorTacticOverrides?.fireDelayMult ?? 1)
  };
}

async function createScenarioPage(context, { sector, experiment }) {
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript((profile) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(profile));
  }, matureProfile);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame), null, { timeout: 90000 });
  const started = await page.evaluate(async ({ targetSector, isExperiment }) => {
    const options = isExperiment
      ? {
          countShipUsage: false,
          lateGameExperiment: {
            acknowledged: true,
            scenario: 'endurance',
            ruleset: 'tactical',
            fixtureId: 'tactical_saturation_bounded',
            startSector: targetSector,
            lifeStock: 'mature_stock',
            phasePulseAvailable: true
          }
        }
      : { countShipUsage: false, runMode: 'ranked_tactical' };
    return window.__game.startGame('nova-player-ship-06.png', options);
  }, { targetSector: sector, isExperiment: experiment });
  assert.equal(started, true);
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.enemyManager), null, { timeout: 90000 });

  const summary = await page.evaluate(({ targetSector, isExperiment, seed }) => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    let randomState = 0x6d2b79f5;
    Math.random = () => {
      randomState = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
      randomState ^= randomState + Math.imul(randomState ^ (randomState >>> 7), 61 | randomState);
      return ((randomState ^ (randomState >>> 14)) >>> 0) / 4294967296;
    };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    play.gameTime = isExperiment ? 0 : ({ 75: 1500, 100: 1800, 120: 2100, 150: 2400 }[targetSector] || 1500);
    game.level = targetSector;
    game.runElapsedSeconds = play.gameTime;
    game.contentDirector.startRun({ seed });
    game.highSectorEscalationProfile = {
      armed: isExperiment,
      diagnosticOnly: isExperiment,
      source: isExperiment ? 'late_game_pressure_experiment' : null
    };
    play.player.invulnerable = true;
    play.player.invulnerableTime = 600000;
    manager.startLevel(targetSector);
    const waves = manager.waves.map((wave, index) => ({
      index,
      count: Math.max(0, Number(wave?.count) || 0),
      cadence: Number(Number(wave?.cadence || 0).toFixed(3)),
      difficulty: Number(wave?.normalWaveDifficultyLevel) || 0,
      dangerMoment: wave?.earlyThreatMoment || null,
      dangerMidCount: Array.isArray(wave?.dangerMidShipIds) ? wave.dangerMidShipIds.length : 0,
      eliteCount: (wave?.eliteMiddleShipId ? 1 : 0)
        + (Array.isArray(wave?.multiEliteMiddleShipIds) ? wave.multiEliteMiddleShipIds.length : 0),
      forcedThreatCount: Array.isArray(wave?.forcedThreatActionIds) ? wave.forcedThreatActionIds.length : 0,
      authoredBeat: wave?.highSectorBeatId || null,
      pressureBridge: wave?.highSectorPressureBridge === true,
      fireScalar: Number(wave?.highSectorTacticOverrides?.fireScalar ?? 1),
      fireDelayMult: Number(wave?.highSectorTacticOverrides?.fireDelayMult ?? 1)
    }));
    return {
      experiment: isExperiment,
      sector: game.level,
      runMode: game.runMode,
      pressureFloor: manager.highSectorEscalationState?.preserveNativePressure === true,
      escalationActive: manager.highSectorEscalationState?.active === true,
      progressionTier: manager.highSectorEscalationState?.progressionTier || null,
      protocol: manager.highSectorEscalationState?.protocol?.id || null,
      bossSupport: manager.highSectorEscalationState?.bossSupportEvent
        ? { ...manager.highSectorEscalationState.bossSupportEvent }
        : null,
      managerDifficulty: manager.currentNormalWaveDifficultyLevel,
      expectedDifficulty: game.runPressureDirector.getNormalWaveDifficultyLevel(targetSector),
      elapsedSeconds: game.runPressureDirector.getElapsedSeconds(),
      pressureBand: game.runPressureDirector.getNormalWavePressureTuning(targetSector)?.id || null,
      waveCount: waves.length,
      plannedEnemies: waves.reduce((sum, wave) => sum + wave.count, 0),
      dangerWaves: waves.filter((wave) => wave.dangerMoment).length,
      eliteTotal: waves.reduce((sum, wave) => sum + wave.eliteCount, 0),
      authoredWaves: waves.filter((wave) => wave.authoredBeat).length,
      bridgeWaves: waves.filter((wave) => wave.pressureBridge).length,
      waves
    };
  }, { targetSector: sector, isExperiment: experiment, seed: fixedSeed });

  await page.waitForFunction(() => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    return manager?.state === 'WAVE_ACTIVE' && manager?.enemies?.some?.((enemy) => enemy?.active !== false);
  }, null, { timeout: 30000 });
  await page.waitForTimeout(4500);
  const runtime = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    return {
      activeEnemies: manager.enemies.filter((enemy) => enemy?.active !== false).length,
      hostileProjectiles: play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false).length,
      managerDifficulty: manager.currentNormalWaveDifficultyLevel,
      tacticPressureBand: manager.currentWaveTactic?.normalWavePressureBand || null,
      currentWave: manager.currentWaveIndex,
      managerState: manager.state
    };
  });
  await page.screenshot({
    path: path.join(outputDir, `sector-${sector}-${experiment ? 'experiment' : 'native-reference'}.png`),
    fullPage: true
  });
  await page.close();
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  return { ...summary, runtime };
}

mkdirSync(outputDir, { recursive: true });
const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

let context;
try {
  await waitForServer(baseUrl);
  const executablePath = findChrome();
  assert.ok(executablePath, 'Installed Chrome or Edge is required');
  context = await chromium.launchPersistentContext(path.join(outputDir, 'browser-profile'), {
    headless: true,
    executablePath,
    viewport: { width: 1366, height: 768 },
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  const results = [];
  for (const sector of [51, 60, 75, 100, 120, 150]) {
    const nativeReference = await createScenarioPage(context, { sector, experiment: false });
    const experiment = await createScenarioPage(context, { sector, experiment: true });
    assert.equal(experiment.pressureFloor, true, `Sector ${sector} must enable the experiment-only pressure floor`);
    assert.equal(nativeReference.pressureFloor, false, `normal Sector ${sector} must not enable experiment pressure state`);
    assert.equal(nativeReference.escalationActive, false, `normal Sector ${sector} must remain outside experimental escalation`);
    assert.equal(experiment.managerDifficulty, experiment.expectedDifficulty);
    assert.equal(experiment.managerDifficulty, nativeReference.managerDifficulty);
    assert.equal(experiment.waveCount, nativeReference.waveCount,
      `Sector ${sector} experiment must keep the native wave count`);
    assert.ok(experiment.plannedEnemies >= nativeReference.plannedEnemies,
      `Sector ${sector} experiment must not reduce the native planned enemy count`);
    assert.ok(experiment.dangerWaves >= nativeReference.dangerWaves,
      `Sector ${sector} experiment must keep native danger moments`);
    assert.ok(experiment.eliteTotal >= nativeReference.eliteTotal,
      `Sector ${sector} experiment must keep native elite pressure`);
    if (sector < 75) {
      assert.equal(experiment.authoredWaves, 0,
        `Sector ${sector} must not start a full Deep Space Protocol early`);
      assert.equal(experiment.bridgeWaves, 0);
      assert.equal(experiment.protocol, null);
      assert.equal(experiment.progressionTier, sector < 60 ? 'vocabulary_intro' : 'pressure_build');
      assert.equal(experiment.bossSupport?.count, sector < 60 ? 2 : 3);
      if (sector === 51) {
        assert.ok(experiment.bossSupport?.warningLeadMs >= 2000);
        assert.ok(experiment.bossSupport?.safeCorridorRatio >= 0.4);
      }
    } else {
      assert.equal(experiment.progressionTier, 'deep_space_protocol');
      assert.equal(experiment.authoredWaves, 5,
        `Sector ${sector} must layer exactly five authored beats`);
      assert.equal(experiment.bridgeWaves, experiment.waveCount - 5,
        `Sector ${sector} must retain native bridge waves`);
      assert.ok(experiment.waves.every((wave) => wave.fireScalar >= 1 && wave.fireDelayMult <= 1),
        `Sector ${sector} authored pressure must never soften firing`);
    }
    assert.equal(experiment.runtime.managerDifficulty, nativeReference.runtime.managerDifficulty);
    if (sector >= 75) assert.equal(experiment.runtime.tacticPressureBand, 'deep_overrun');
    results.push({ sector, nativeReference, experiment });
  }

  const report = {
    pass: true,
    fixedSeed,
    results,
    screenshots: results.flatMap(({ sector }) => [
      path.join(outputDir, `sector-${sector}-native-reference.png`),
      path.join(outputDir, `sector-${sector}-experiment.png`)
    ])
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context?.close();
  server.kill();
}
