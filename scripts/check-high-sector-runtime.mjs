import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4861));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/high-sector-runtime-${timestamp()}`);
const devtoolsHash = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const fixedSeed = 'high-sector-fairness-seed-20260809';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 30; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available port starting at ${startPort}`);
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
  throw new Error(`Vite did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function debugUrl(sector) {
  const target = new URL(baseUrl);
  target.searchParams.set('nova-devtools-hash', devtoolsHash);
  target.searchParams.set('debugBossToken', 'NOVA_DEBUG_2026');
  target.searchParams.set('controlSmoke', '1');
  target.searchParams.set('startLevel', String(sector));
  target.searchParams.set('highSectorEscalation', '1');
  return target.toString();
}

const matureProfile = {
  bestScore: 1000000,
  bestSector: 130,
  bestLevel: 130,
  bestRank: 50,
  pilotRank: 50,
  pilotXp: 999999,
  totalRuns: 100,
  totalBossesDefeated: 130,
  totalWavesCleared: 1000,
  totalCodexDiscoveries: 5000,
  runClears: 10,
  noHitWaves: 100,
  noHitSectors: 50,
  survivedSeconds: 100000,
  unlockedShipIds: Array.from({ length: 30 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`)
};

async function openRun(browser, { sector, hull = 'nova-player-ship-01.png', runMode = 'ranked', reducedMotion = false }) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript(({ profile, reduced }) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(profile));
    localStorage.setItem('nova_accessibility_reduced_motion', reduced ? '1' : '0');
  }, { profile: matureProfile, reduced: reducedMotion });
  await page.goto(debugUrl(sector), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 90000 });
  const started = await page.evaluate(({ selectedHull, selectedRunMode }) => window.__game.startGame(selectedHull, {
    runMode: selectedRunMode,
    countShipUsage: false
  }), { selectedHull: hull, selectedRunMode: runMode });
  assert.equal(started, true, `${runMode} must start with ${hull}`);
  await page.waitForFunction((targetSector) => {
    const game = window.__game;
    const manager = game?.scenes?.play?.enemyManager;
    return game?.currentSceneName === 'play' && manager?.level === targetSector && Array.isArray(manager?.waves);
  }, sector, { timeout: 90000 });
  await page.evaluate(({ targetSector, seed, selectedRunMode }) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.contentDirector.seed = seed;
    game.runMode = selectedRunMode;
    game.level = targetSector;
    game.lives = 9;
    play.player.invulnerable = true;
    play.player.invulnerableTime = 600000;
    play.player.dodgeCooldown = 600000;
    play.enemyManager.startLevel(targetSector);
    play.clearEnemyBullets?.('high_sector_runtime_setup');
  }, { targetSector: sector, seed: fixedSeed, selectedRunMode: runMode });
  await page.waitForFunction(() => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    return manager?.state === 'WAVE_ACTIVE' && (manager?.enemies?.length || 0) > 0;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(1300);
  return { page, pageErrors, consoleErrors };
}

async function readProof(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    const state = JSON.parse(window.render_game_to_text());
    return {
      render: state.highSectorEscalation,
      scene: state.scene,
      level: state.level,
      selectedHull: game.selectedShipSpriteKey,
      runMode: game.runMode,
      paused: Boolean(play.isPaused),
      protocolId: manager.highSectorEscalationState?.protocol?.id || null,
      safeSide: manager.highSectorEscalationState?.protocol?.initialSafeSide || null,
      runtime: manager.highSectorProtocolRuntime ? { ...manager.highSectorProtocolRuntime } : null,
      waveCount: manager.waves.length,
      waves: manager.waves.map((wave) => ({
        beatId: wave.highSectorBeatId || null,
        beatNumber: wave.highSectorBeatNumber || null,
        objective: wave.highSectorObjective || null,
        conditionReadMs: wave.highSectorConditionReadMs || null,
        formation: wave.formation || null,
        tactic: wave.tactic || null,
        eliteMiddleShipId: wave.eliteMiddleShipId || null,
        tractorContract: wave.highSectorTractorContract ? { ...wave.highSectorTractorContract } : null,
        shift: wave.highSectorShift ? { ...wave.highSectorShift } : null
      })),
      objectiveText: play.hud?.missionText?.text || null,
      projectileCap: play.bulletManager.maxEnemyBullets,
      hostileProjectiles: play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false).length,
      player: { x: play.player.x, y: play.player.y },
      phaseAvailable: (Number(play.player.dodgeCooldown) || 0) <= 0 && !play.player.isDodging,
      playerBullets: play.bulletManager.playerBullets.filter((bullet) => bullet?.active !== false).length
    };
  });
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const executablePath = findChrome();
assert.ok(executablePath, 'Installed Chrome or Edge is required');
const browser = await chromium.launch({ headless: true, executablePath, args: ['--autoplay-policy=no-user-gesture-required'] });

try {
  const hullMatrix = [
    { hullClass: 'slow', hull: 'nova-player-ship-06.png' },
    { hullClass: 'standard', hull: 'nova-player-ship-01.png' },
    { hullClass: 'fast', hull: 'nova-player-ship-04.png' }
  ];
  const protocolSectors = [75, 80, 85];
  const runModes = ['ranked', 'ranked_tactical', 'overrun_pure', 'overrun_tactical'];
  const scenarios = protocolSectors.map((sector, index) => ({
    ...hullMatrix[index],
    sector,
    runMode: runModes[index]
  }));
  const results = [];
  for (const scenario of scenarios) {
    console.log(`[high-sector-runtime] Sector ${scenario.sector} ${scenario.runMode}`);
    const run = await openRun(browser, scenario);
    const before = await readProof(run.page);
    assert.equal(before.scene, 'play');
    assert.equal(before.level, scenario.sector);
    assert.equal(before.runMode, scenario.runMode);
    assert.equal(before.selectedHull, scenario.hull);
    assert.equal(before.render?.active, true);
    assert.equal(before.render?.protocol?.id, before.protocolId);
    assert.equal(before.phaseAvailable, false, 'all protocol probes must preserve a non-Phase escape route');
    assert.equal(before.projectileCap, 48);
    assert.ok(before.hostileProjectiles <= before.projectileCap);
    assert.equal(before.waveCount, 5);
    assert.deepEqual(before.waves.map((wave) => wave.beatId), [
      'opening_read',
      'priority_problem',
      'coordinated_escalation',
      'conversion_relief',
      'climax_boss_lead_in'
    ]);
    assert.deepEqual(before.waves.map((wave) => wave.beatNumber), [1, 2, 3, 4, 5]);
    assert.ok(before.waves.every((wave) => wave.conditionReadMs >= 1200));

    const controlsBefore = await run.page.evaluate(() => ({
      x: window.__game.scenes.play.player.x,
      score: window.__game.score
    }));
    await run.page.keyboard.down('ArrowLeft');
    await run.page.waitForTimeout(320);
    await run.page.keyboard.up('ArrowLeft');
    await run.page.keyboard.down('Space');
    await run.page.waitForTimeout(260);
    await run.page.keyboard.up('Space');
    const controlsAfter = await readProof(run.page);
    assert.ok(controlsAfter.player.x < controlsBefore.x, 'keyboard movement must move the hull left');
    assert.ok(controlsAfter.playerBullets > 0, 'attack input must create player bullets');

    await run.page.keyboard.press('Escape');
    await run.page.waitForFunction(() => window.__game?.scenes?.play?.isPaused === true, null, { timeout: 5000 });
    await run.page.screenshot({ path: path.join(outputDir, `sector-${scenario.sector}-${scenario.hullClass}-${scenario.runMode}-paused.png`), fullPage: true });
    await run.page.keyboard.press('Escape');
    await run.page.waitForFunction(() => window.__game?.scenes?.play?.isPaused === false, null, { timeout: 5000 });

    let shifted = null;
    if (before.protocolId === 'shifting_front') {
      await run.page.evaluate(() => {
        const manager = window.__game.scenes.play.enemyManager;
        const shiftIndex = manager.waves.findIndex((wave) => Boolean(wave.highSectorShift));
        if (shiftIndex < 0) throw new Error('Shifting Front must contain an authored shift beat');
        manager.clearPendingWaveSpawns?.();
        manager.clearEnemies?.();
        manager.currentWaveIndex = shiftIndex;
        manager.waveEnding = false;
        manager.cleanupPhase = 'NONE';
        manager.state = 'WAVE_ACTIVE';
        manager.spawnWave(manager.waves[shiftIndex]);
      });
      await run.page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.enemyManager?.highSectorProtocolRuntime), null, { timeout: 5000 });
      const shiftedRuntime = await run.page.evaluate(() => {
        const manager = window.__game.scenes.play.enemyManager;
        manager.state = 'WAVE_ACTIVE';
        manager.waveEnding = false;
        for (let frame = 0; frame < 360; frame += 1) manager.updateHighSectorProtocolRuntime(1);
        return { ...manager.highSectorProtocolRuntime };
      });
      shifted = await readProof(run.page);
      shifted.runtime = shiftedRuntime;
      assert.equal(shiftedRuntime.shifted, true);
      assert.equal(
        shiftedRuntime.currentSafeSide,
        before.waves.find((wave) => wave.shift)?.shift.shiftedSafeSide
      );
    }
    await run.page.screenshot({ path: path.join(outputDir, `sector-${scenario.sector}-${scenario.hullClass}-${before.protocolId}.png`), fullPage: true });
    assert.deepEqual(run.pageErrors, []);
    results.push({ scenario, before, controlsBefore, controlsAfter, shifted, pageErrors: run.pageErrors, consoleErrors: run.consoleErrors });
    await run.page.close();
  }

  assert.equal(new Set(results.map((result) => result.before.protocolId)).size, 3, 'runtime must cover all three protocols');
  assert.equal(new Set(results.map((result) => result.scenario.hullClass)).size, 3, 'runtime must cover slow, standard, and fast hulls');

  const reducedRun = await openRun(browser, {
    sector: 85,
    runMode: 'ranked',
    hull: 'nova-player-ship-04.png',
    reducedMotion: true
  });
  const reducedProof = await readProof(reducedRun.page);
  assert.equal(reducedProof.render?.reducedMotion, true);
  assert.equal(reducedProof.protocolId, results.find((result) => result.scenario.sector === 85).before.protocolId);
  assert.equal(reducedProof.safeSide, results.find((result) => result.scenario.sector === 85).before.safeSide);
  await reducedRun.page.screenshot({ path: path.join(outputDir, 'sector-85-reduced-motion.png'), fullPage: true });
  assert.deepEqual(reducedRun.pageErrors, []);
  await reducedRun.page.close();

  const tractorRun = await openRun(browser, {
    sector: 75,
    runMode: 'ranked',
    hull: 'nova-player-ship-06.png'
  });
  assert.equal((await readProof(tractorRun.page)).protocolId, 'tractor_intercept');
  await tractorRun.page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    const tractorIndex = manager.waves.findIndex((wave) => Boolean(wave.highSectorTractorContract));
    if (tractorIndex < 0) throw new Error('Tractor Intercept must contain an authored Tractor beat');
    game.lateGameExperiment = {
      active: true,
      metrics: { tractorPulls: 0, tractorBreaks: 0, tractorBreakTimeMs: 0, tractorRecoveryMs: 0 }
    };
    manager.clearPendingWaveSpawns?.();
    manager.clearEnemies?.();
    manager.currentWaveIndex = tractorIndex;
    manager.waveEnding = false;
    manager.cleanupPhase = 'NONE';
    manager.state = 'WAVE_ACTIVE';
    manager.spawnWave(manager.waves[tractorIndex]);
  });
  await tractorRun.page.waitForFunction(() => window.__game.scenes.play.enemyManager.enemies.some(
    (enemy) => Boolean(enemy.highSectorTractorContract)
  ), null, { timeout: 5000 });
  const tractorWarning = await tractorRun.page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const enemy = play.enemyManager.enemies.find((candidate) => candidate.highSectorTractorContract);
    const player = play.player;
    const width = game.getWidth();
    const height = game.getHeight();
    window.__highSectorTractorRuntimeProbe = enemy;
    enemy.health = 999999;
    enemy.maxHealth = 999999;
    enemy.active = true;
    enemy.waitingForEntry = false;
    enemy.state = 'FORMATION';
    enemy.x = width / 2;
    enemy.y = height * 0.24;
    enemy.sprite.x = enemy.x;
    enemy.sprite.y = enemy.y;
    enemy.eliteAbility.state = 'cooldown';
    enemy.eliteAbility.nextAt = 0;
    player.dodgeCooldown = 600000;
    player.clearStatusEffects?.('tractor_runtime_setup');
    const targetOnRight = enemy.highSectorTractorContract.escapeSide === 'left';
    player.x = targetOnRight ? width * 0.72 : width * 0.28;
    player.y = height * 0.76;
    enemy.updateEliteMiddleShip(1, player.x, player.y);
    return {
      contract: { ...enemy.highSectorTractorContract },
      abilityState: enemy.eliteAbility.state,
      phaseAvailable: player.dodgeCooldown <= 0,
      tractorDebuff: player.getTractorDebuffState(),
      priorityTargetX: enemy.x,
      width
    };
  });
  assert.equal(tractorWarning.abilityState, 'telegraph');
  assert.equal(tractorWarning.phaseAvailable, false);
  assert.ok(tractorWarning.contract.warningLeadMs >= 1400);
  assert.equal(tractorWarning.contract.maxLossOfControlSources, 1);
  assert.equal(tractorWarning.contract.allowsMineLayer, false);
  assert.equal(tractorWarning.contract.allowsForcedLaneShift, false);
  assert.equal(tractorWarning.tractorDebuff.last, null);
  assert.ok(Math.abs(tractorWarning.priorityTargetX - tractorWarning.width / 2) <= 1);
  await tractorRun.page.screenshot({ path: path.join(outputDir, 'sector-75-tractor-warning-slow-pure.png'), fullPage: true });
  const tractorPull = await tractorRun.page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const enemy = window.__highSectorTractorRuntimeProbe;
    const player = play.player;
    const contract = enemy.highSectorTractorContract;
    enemy.eliteAbility.startedAt = Date.now() - contract.warningLeadMs - 1;
    enemy.updateEliteMiddleShip(1, player.x, player.y);
    player.x = contract.lockedTargetX;
    player.y = contract.lockedTargetY;
    enemy.updateEliteMiddleShip(1, player.x, player.y);
    return {
      abilityState: enemy.eliteAbility.state,
      pullStarted: Number.isFinite(contract.pullStartedAtMs),
      metrics: { ...game.lateGameExperiment.metrics },
      tractorDebuff: player.getTractorDebuffState()
    };
  });
  assert.equal(tractorPull.abilityState, 'active');
  assert.equal(tractorPull.pullStarted, true);
  assert.equal(tractorPull.metrics.tractorPulls, 1);
  assert.equal(tractorPull.tractorDebuff.last, null);
  await tractorRun.page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const enemy = window.__highSectorTractorRuntimeProbe;
    const player = play.player;
    const contract = enemy.highSectorTractorContract;
    const laneWidth = game.getWidth() * contract.escapeLaneRatio;
    player.x = contract.escapeSide === 'left' ? laneWidth / 2 : game.getWidth() - laneWidth / 2;
    player.y = contract.lockedTargetY;
    enemy.updateEliteMiddleShip(1, player.x, player.y);
  });
  await tractorRun.page.waitForTimeout(300);
  const tractorBreak = await tractorRun.page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const enemy = window.__highSectorTractorRuntimeProbe;
    const player = play.player;
    enemy.updateEliteMiddleShip(1, player.x, player.y);
    return {
      abilityState: enemy.eliteAbility.state,
      contract: { ...enemy.highSectorTractorContract },
      cooldownRemainingMs: enemy.eliteAbility.nextAt - Date.now(),
      metrics: { ...game.lateGameExperiment.metrics },
      tractorDebuff: player.getTractorDebuffState()
    };
  });
  assert.equal(tractorBreak.abilityState, 'cooldown');
  assert.equal(tractorBreak.contract.lastBreakReason, 'escaped_lane');
  assert.ok(tractorBreak.contract.lastBreakDurationMs >= 260);
  assert.equal(tractorBreak.contract.lastRecoveryMs, 7200);
  assert.ok(tractorBreak.cooldownRemainingMs >= 7000);
  assert.equal(tractorBreak.metrics.tractorBreaks, 1);
  assert.ok(tractorBreak.metrics.tractorBreakTimeMs >= 260);
  assert.equal(tractorBreak.metrics.tractorRecoveryMs, 7200);
  assert.equal(tractorBreak.tractorDebuff.last, null);
  assert.deepEqual(tractorRun.pageErrors, []);
  await tractorRun.page.close();

  const bossRun = await openRun(browser, { sector: 60, runMode: 'ranked', hull: 'nova-player-ship-06.png' });
  await bossRun.page.evaluate(async () => {
    const manager = window.__game.scenes.play.enemyManager;
    manager.clearPendingWaveSpawns?.();
    manager.clearEnemies?.();
    manager.phase = 'BOSS';
    await manager.spawnBoss(60);
    manager.state = 'BOSS_ACTIVE';
    for (let frame = 0; frame < 60; frame += 1) manager.updateAuthoredHighSectorBossSupport(1);
  });
  await bossRun.page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.authoredBossSupportState?.state === 'warned', null, { timeout: 3000 });
  await bossRun.page.screenshot({ path: path.join(outputDir, 'sector-60-authored-support-warning.png'), fullPage: true });
  await bossRun.page.evaluate(() => {
    const manager = window.__game.scenes.play.enemyManager;
    manager.state = 'BOSS_ACTIVE';
    for (let frame = 0; frame < 100; frame += 1) manager.updateAuthoredHighSectorBossSupport(1);
  });
  await bossRun.page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.authoredBossSupportState?.state === 'complete', null, { timeout: 3000 });
  const bossProof = await bossRun.page.evaluate(() => {
    const manager = window.__game.scenes.play.enemyManager;
    const supports = manager.enemies.filter((enemy) => enemy.kind === 'high_sector_boss_support');
    return {
      bossHealth: manager.boss.health,
      bossMaxHealth: manager.boss.maxHealth,
      bossHealthCap: manager.boss.highSectorHealthCap,
      support: { ...manager.authoredBossSupportState },
      activeSupports: supports.map((ship) => ({
        x: ship.x,
        y: ship.y,
        active: ship.active,
        waitingForEntry: ship.waitingForEntry,
        health: ship.health,
        kind: ship.kind
      })),
      randomFuelSupports: manager.getActiveBossFuelShips().length,
      randomReinforcementEvents: manager.bossReinforcementEventsThisBoss,
      randomChaosEvents: manager.bossChaosEventsThisBoss,
      lastOrder: manager.lastBossFuelSupportOrder,
      render: JSON.parse(window.render_game_to_text()).highSectorEscalation
    };
  });
  assert.ok(bossProof.bossHealth <= 280 && bossProof.bossMaxHealth <= 280);
  assert.equal(bossProof.support.bossHealthMultiplier, 1);
  assert.equal(bossProof.support.spawnedCount, 3);
  assert.equal(bossProof.support.eventCount, 1);
  assert.equal(bossProof.activeSupports.length, 3);
  assert.ok(bossProof.activeSupports.every((ship) => ship.health <= 3));
  assert.equal(bossProof.randomFuelSupports, 0);
  assert.equal(bossProof.randomReinforcementEvents, 0);
  assert.equal(bossProof.randomChaosEvents, 0);
  assert.equal(bossProof.lastOrder.source, 'authored_ordinary_support_intercept');
  assert.ok(bossProof.lastOrder.warningLeadMs >= 1400);
  assert.deepEqual(bossProof.lastOrder.constraints, {
    healing: false,
    lossOfControl: false,
    laneDenial: false,
    randomSupportSuppressed: true
  });
  assert.deepEqual(bossRun.pageErrors, []);
  await bossRun.page.screenshot({ path: path.join(outputDir, 'sector-60-authored-support.png'), fullPage: true });
  await bossRun.page.close();

  const report = {
    status: 'passed',
    generatedAt: new Date().toISOString(),
    executablePath,
    fixedSeed,
    results,
    reducedMotion: reducedProof,
    tractor: { warning: tractorWarning, pull: tractorPull, break: tractorBreak },
    boss: bossProof
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[high-sector-runtime] PASS ${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
