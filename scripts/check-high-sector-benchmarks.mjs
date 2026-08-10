import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4911));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/high-sector-benchmarks-${timestamp()}`
);
const authoredReadMs = Math.max(1200, Number(process.env.CHECK_AUTHORED_READ_MS) || 1225);
const scriptedCombatMs = Math.max(300, Number(process.env.CHECK_SCRIPTED_COMBAT_MS) || 650);
const requestedCases = new Set(String(process.env.CHECK_HIGH_SECTOR_CASES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean));

const progressionKeys = Object.freeze([
  'nova.hangarProgress.v1',
  'burt.shipUnlockProgress.v1',
  'nova_swarm_achievements_v1',
  'nova_swarm_steam_achievement_queue_v1',
  'novaSwarm.localLeaderboard.v2',
  'novaSwarm.mockSteamLeaderboard.v1',
  'novaSwarm.pendingSteamLeaderboardSubmits.v1',
  'novaSwarm.sectorStartChallengeRecords.v1',
  'novaSwarm.scoutRunRecords.v1',
  'novaSwarm.dailySignalRecords.v1',
  'novaSwarm.overrunRunRecords.v1',
  'novaSwarm.mayhemModeRecords.v1',
  'nova.threatDiscovery.v1',
  'burt.shipUsage.v1',
  'burt.shipUsageTotal.v1',
  'burt_season_xp',
  'burt_season_unlocks'
]);

const matureProfile = Object.freeze({
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
  runClears: 10,
  unlockedShipIds: Array.from(
    { length: 30 },
    (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`
  )
});

const matrixDefinitions = Object.freeze([
  Object.freeze({
    id: 'pure-s75-standard-three-no-pulse',
    scenario: 'standard', ruleset: 'pure', fixtureId: 'pure_control', startSector: 75,
    lifeStock: 'three_lives', phasePulseAvailable: false, reducedMotion: false,
    ship: 'nova-player-ship-06.png', comparison: 'Pure three-life control'
  }),
  Object.freeze({
    id: 'pure-s75-tractor-mature-no-pulse',
    scenario: 'endurance', ruleset: 'pure', fixtureId: 'pure_control', startSector: 75,
    lifeStock: 'mature_stock', phasePulseAvailable: false, reducedMotion: false,
    ship: 'nova-player-ship-06.png', tractorProbe: true,
    comparison: 'Narrow-lane non-piercing Pure Tractor control'
  }),
  Object.freeze({
    id: 'tactical-no-pierce-s75-standard',
    scenario: 'standard', ruleset: 'tactical', fixtureId: 'tactical_control_no_pierce', startSector: 75,
    lifeStock: 'three_lives', phasePulseAvailable: true, reducedMotion: false,
    ship: 'nova-player-ship-06.png', comparison: 'Tactical mature control without Pierce'
  }),
  Object.freeze({
    id: 'tactical-bounded-s75-standard-pulse',
    scenario: 'standard', ruleset: 'tactical', fixtureId: 'tactical_saturation_bounded', startSector: 75,
    lifeStock: 'three_lives', phasePulseAvailable: true, reducedMotion: false,
    ship: 'nova-player-ship-06.png', comparison: 'Bounded Pierce with Phase Pulse'
  }),
  Object.freeze({
    id: 'tactical-unlimited-s75-standard-pulse',
    scenario: 'standard', ruleset: 'tactical', fixtureId: 'tactical_saturation_unlimited', startSector: 75,
    lifeStock: 'three_lives', phasePulseAvailable: true, reducedMotion: false,
    ship: 'nova-player-ship-06.png', comparison: 'Unlimited Pierce control'
  }),
  Object.freeze({
    id: 'tactical-bounded-s75-standard-no-pulse',
    scenario: 'standard', ruleset: 'tactical', fixtureId: 'tactical_saturation_bounded', startSector: 75,
    lifeStock: 'three_lives', phasePulseAvailable: false, reducedMotion: false,
    ship: 'nova-player-ship-06.png', comparison: 'Bounded Pierce without Phase Pulse'
  }),
  Object.freeze({
    id: 'tactical-bounded-s100-endurance-mature',
    scenario: 'endurance', ruleset: 'tactical', fixtureId: 'tactical_saturation_bounded', startSector: 100,
    lifeStock: 'mature_stock', phasePulseAvailable: true, reducedMotion: false,
    ship: 'nova-player-ship-06.png', comparison: 'Sector 100 mature-stock depth fixture'
  }),
  Object.freeze({
    id: 'pure-s120-endurance-mature-reduced',
    scenario: 'endurance', ruleset: 'pure', fixtureId: 'pure_control', startSector: 120,
    lifeStock: 'mature_stock', phasePulseAvailable: false, reducedMotion: true,
    ship: 'nova-player-ship-06.png', comparison: 'Sector 120 Pure Reduced Motion fixture'
  }),
  Object.freeze({
    id: 'tactical-bounded-s150-endurance-mature-reduced',
    scenario: 'endurance', ruleset: 'tactical', fixtureId: 'tactical_saturation_bounded', startSector: 150,
    lifeStock: 'mature_stock', phasePulseAvailable: true, reducedMotion: true,
    ship: 'nova-player-ship-06.png', comparison: 'Sector 150 Tactical Reduced Motion fixture'
  })
]);

const cases = matrixDefinitions.filter((entry) => requestedCases.size === 0 || requestedCases.has(entry.id));

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
  throw new Error(`No available benchmark port starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await canFetch(baseUrl)) return null;
  const server = spawn(
    process.execPath,
    [path.resolve('node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port), '--strictPort'],
    { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
  );
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Benchmark Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function percentile(values, fraction) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

function summarizeFrames(values) {
  const intervals = values.filter((value) => Number.isFinite(value) && value > 0 && value < 1000);
  const total = intervals.reduce((sum, value) => sum + value, 0);
  return {
    frames: intervals.length,
    averageMs: Number((total / Math.max(1, intervals.length)).toFixed(2)),
    p95Ms: Number(percentile(intervals, 0.95).toFixed(2)),
    p99Ms: Number(percentile(intervals, 0.99).toFixed(2)),
    maxMs: Number(Math.max(0, ...intervals).toFixed(2)),
    framesAbove33Ms: intervals.filter((value) => value > 33.34).length,
    framesAbove50Ms: intervals.filter((value) => value > 50).length
  };
}

function browserUrl() {
  const url = new URL(baseUrl);
  url.searchParams.set('perf', '1');
  url.searchParams.set('controlSmoke', '1');
  return url.toString();
}

async function runCase(browser, definition) {
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
  }, { profile: matureProfile, reduced: definition.reducedMotion });
  await page.goto(browserUrl(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, {
    timeout: 90000
  });
  const launched = await page.evaluate(async (request) => window.__game.startGame(request.ship, {
    countShipUsage: false,
    lateGameExperiment: {
      acknowledged: true,
      scenario: request.scenario,
      ruleset: request.ruleset,
      fixtureId: request.fixtureId,
      startSector: request.startSector,
      lifeStock: request.lifeStock,
      phasePulseAvailable: request.phasePulseAvailable
    }
  }), definition);
  assert.equal(launched, true, `${definition.id} must launch`);
  await page.waitForFunction((sector) => {
    const game = window.__game;
    const manager = game?.scenes?.play?.enemyManager;
    return game?.currentSceneName === 'play'
      && game?.lateGameExperiment?.active === true
      && manager?.level === sector
      && manager?.waves?.length === 5
      && manager?.enemies?.length > 0;
  }, definition.startSector, { timeout: 90000 });

  const sample = await page.evaluate(async ({ request, readMs, combatMs, storageKeys }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    const player = play.player;
    const experiment = game.lateGameExperiment;
    const metrics = experiment.metrics;
    const initialProtocolId = manager.highSectorEscalationState?.protocol?.id || null;
    const snapshotProgression = () => Object.fromEntries(
      storageKeys.map((key) => [key, localStorage.getItem(key)])
    );
    const getMemory = () => ({
      usedJSHeapSize: Math.max(0, Number(performance.memory?.usedJSHeapSize) || 0),
      totalJSHeapSize: Math.max(0, Number(performance.memory?.totalJSHeapSize) || 0)
    });
    const getCounts = () => ({
      enemies: manager.enemies.filter((enemy) => enemy?.active !== false || enemy?.waitingForEntry).length,
      playerBullets: play.bulletManager.playerBullets.filter((bullet) => bullet?.active !== false).length,
      enemyBullets: play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false).length,
      hazards: play.bossHazards?.length || 0,
      particles: play.particleManager?.particles?.length || 0,
      particlePool: play.particleManager?.pool?.length || 0,
      energyBlooms: play.particleManager?.energyBlooms?.length || 0,
      energyBloomPool: play.particleManager?.energyBloomPool?.length || 0,
      scorePopups: play.scorePopupManager?.popups?.length || 0,
      pendingScorePopups: play.scorePopupManager?.pendingPopups?.length || 0,
      gameContainerChildren: play.gameContainer?.children?.length || 0
    });
    const totalEntities = (counts) => [
      'enemies',
      'playerBullets',
      'enemyBullets',
      'hazards',
      'particles',
      'energyBlooms',
      'scorePopups',
      'pendingScorePopups'
    ].reduce((sum, key) => sum + Math.max(0, Number(counts[key]) || 0), 0);
    const setEnemyPose = (enemy, x, y) => {
      enemy.active = true;
      enemy.waitingForEntry = false;
      enemy.state = 'FORMATION';
      enemy.x = x;
      enemy.y = y;
      if (enemy.sprite) {
        enemy.sprite.x = x;
        enemy.sprite.y = y;
        enemy.sprite.visible = true;
        enemy.sprite.renderable = true;
      }
    };
    const clearCombat = (reason) => {
      manager.clearPendingWaveSpawns?.();
      manager.clearEnemies?.();
      play.bulletManager.clearAll?.(reason);
    };
    const spawnWave = async (waveIndex) => {
      clearCombat(`benchmark_wave_${waveIndex}_setup`);
      manager.phase = 'WAVES';
      manager.currentWaveIndex = waveIndex;
      manager.waveEnding = false;
      manager.cleanupPhase = 'NONE';
      manager.state = 'WAVE_ACTIVE';
      manager.spawnWave(manager.waves[waveIndex]);
      await sleep(80);
      return manager.waves[waveIndex];
    };
    const forceDestroy = (enemy, source = 'runtime_benchmark_completion') => {
      if (!enemy?.active) return false;
      const destroyed = enemy.takeDamage?.((Number(enemy.health) || 1) + 10000, { source }) === true;
      if (destroyed) play.onEnemyKilled?.(enemy);
      return destroyed;
    };

    const progressionBefore = snapshotProgression();
    const schedulerBefore = window.__novaSteamCloudDiagnostics?.getSchedulerState?.() || null;
    window.__novaMayhemPerformanceDiagnostics?.reset?.();
    player.invulnerable = true;
    player.invulnerableTime = 600000;
    player.dodgeCooldown = 600000;

    await spawnWave(0);
    play.isPaused = true;
    const penetrationTargets = manager.enemies.slice(0, 5);
    assertBrowser(penetrationTargets.length >= 3, 'penetration probe requires at least three targets');
    penetrationTargets.forEach((enemy) => {
      enemy.health = 100000;
      enemy.maxHealth = 100000;
      setEnemyPose(enemy, player.x, player.y - 80);
    });
    player.shootCooldown = 0;
    const penetrationVolley = player.shoot();
    const penetrationBullet = penetrationVolley.find((bullet) => bullet?.piercing) || penetrationVolley[0];
    assertBrowser(Boolean(penetrationBullet), 'penetration probe requires a player projectile');
    play.bulletManager.addPlayerBullet(penetrationBullet);
    penetrationBullet.x = player.x;
    penetrationBullet.y = player.y - 80;
    if (penetrationBullet.sprite) {
      penetrationBullet.sprite.x = penetrationBullet.x;
      penetrationBullet.sprite.y = penetrationBullet.y;
    }
    const pierceBefore = {
      hits: metrics.pierceHits,
      effective: metrics.effectivePenetrationHits,
      chain: metrics.chainLightningOrigins
    };
    play.checkCollisions();
    const penetration = {
      provenance: penetrationBullet.pierceProvenance || 'none',
      contract: experiment.permanentPierceContract,
      projectileActiveAfterProbe: penetrationBullet.active !== false,
      hits: Math.max(0, metrics.pierceHits - pierceBefore.hits),
      effectivePenetrationHits: Math.max(0, metrics.effectivePenetrationHits - pierceBefore.effective),
      chainLightningOrigins: Math.max(0, metrics.chainLightningOrigins - pierceBefore.chain),
      collisionStats: { ...(play.collisionDiagnosticStats || {}) }
    };

    await spawnWave(0);
    play.isPaused = true;
    const pulseEnemy = manager.enemies.find((enemy) => enemy?.active !== false) || manager.enemies[0];
    assertBrowser(Boolean(pulseEnemy), 'pulse probe requires an enemy source');
    setEnemyPose(pulseEnemy, player.x, player.y - 180);
    for (let shotIndex = 0; shotIndex < 8; shotIndex += 1) {
      pulseEnemy.shootCooldown = 0;
      const shots = pulseEnemy.shoot(player.x, player.y);
      const list = Array.isArray(shots) ? shots : [shots];
      for (const bullet of list.filter(Boolean)) play.bulletManager.addEnemyBullet(bullet);
    }
    const pulseBullets = play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false).slice(0, 8);
    pulseBullets.forEach((bullet, index) => {
      const angle = index * Math.PI * 2 / Math.max(1, pulseBullets.length);
      bullet.x = player.x + Math.cos(angle) * 48;
      bullet.y = player.y + Math.sin(angle) * 48;
      if (bullet.sprite) {
        bullet.sprite.x = bullet.x;
        bullet.sprite.y = bullet.y;
      }
    });
    player.experimentalPulseReadyAt = 0;
    const pulseBefore = {
      activations: metrics.pulseActivations,
      clears: metrics.pulseClears,
      rechargeBlocks: metrics.pulseRechargeBlocks,
      unavailableDodges: metrics.pulseUnavailableDodges
    };
    const firstPulse = player.triggerTraitDodgePulse({ token: 9101 });
    const secondPulse = player.triggerTraitDodgePulse({ token: 9102 });
    const pulse = {
      available: experiment.phasePulseAvailable,
      configured: player.getExperimentalPulseState(),
      seededBullets: pulseBullets.length,
      firstRadius: firstPulse?.radius || 0,
      firstCleared: firstPulse?.cleared || 0,
      secondReason: secondPulse?.reason || secondPulse?.discardedReason || null,
      activations: metrics.pulseActivations - pulseBefore.activations,
      clears: metrics.pulseClears - pulseBefore.clears,
      rechargeBlocks: metrics.pulseRechargeBlocks - pulseBefore.rechargeBlocks,
      unavailableDodges: metrics.pulseUnavailableDodges - pulseBefore.unavailableDodges
    };

    let tractor = null;
    if (request.tractorProbe) {
      const tractorIndex = manager.waves.findIndex((wave) => Boolean(wave.highSectorTractorContract));
      assertBrowser(tractorIndex >= 0, 'narrow Pure fixture must contain the authored Tractor contract');
      await spawnWave(tractorIndex);
      play.isPaused = true;
      const tractorEnemy = manager.enemies.find((enemy) => Boolean(enemy.highSectorTractorContract));
      assertBrowser(Boolean(tractorEnemy), 'Tractor wave must spawn its priority target');
      const contract = tractorEnemy.highSectorTractorContract;
      tractorEnemy.health = 100000;
      tractorEnemy.maxHealth = 100000;
      setEnemyPose(tractorEnemy, game.getWidth() / 2, game.getHeight() * 0.24);
      tractorEnemy.eliteAbility.state = 'cooldown';
      tractorEnemy.eliteAbility.nextAt = 0;
      player.x = contract.escapeSide === 'left' ? game.getWidth() * 0.72 : game.getWidth() * 0.28;
      player.y = game.getHeight() * 0.76;
      player.clearStatusEffects?.('runtime_benchmark_tractor');
      tractorEnemy.updateEliteMiddleShip(1, player.x, player.y);
      const warningState = tractorEnemy.eliteAbility.state;
      tractorEnemy.eliteAbility.startedAt = Date.now() - contract.warningLeadMs - 1;
      tractorEnemy.updateEliteMiddleShip(1, player.x, player.y);
      player.x = contract.lockedTargetX;
      player.y = contract.lockedTargetY;
      tractorEnemy.updateEliteMiddleShip(1, player.x, player.y);
      const pullState = tractorEnemy.eliteAbility.state;
      const laneWidth = game.getWidth() * contract.escapeLaneRatio;
      player.x = contract.escapeSide === 'left' ? laneWidth / 2 : game.getWidth() - laneWidth / 2;
      player.y = contract.lockedTargetY;
      const breakStartedAt = performance.now();
      while (performance.now() - breakStartedAt < contract.breakHoldMs + 80) {
        tractorEnemy.updateEliteMiddleShip(1, player.x, player.y);
        await nextFrame();
      }
      tractor = {
        warningState,
        pullState,
        breakState: tractorEnemy.eliteAbility.state,
        contract: { ...contract },
        pulls: metrics.tractorPulls,
        breaks: metrics.tractorBreaks,
        breakTimeMs: metrics.tractorBreakTimeMs,
        recoveryMs: metrics.tractorRecoveryMs,
        playerDebuff: player.getTractorDebuffState()
      };
    }

    clearCombat('runtime_benchmark_measurement_start');
    play.isPaused = false;
    await sleep(900);
    if (typeof globalThis.gc === 'function') globalThis.gc();
    await sleep(80);
    metrics.waveSegments = [];
    manager.experimentWaveSegment = null;
    const memoryBefore = getMemory();
    const countsBefore = getCounts();
    const intervals = [];
    const entitySamples = [];
    const peaks = {
      enemies: 0,
      playerBullets: 0,
      hostileProjectiles: 0,
      hazards: 0,
      particles: 0,
      totalEntities: 0,
      usedJSHeapSize: memoryBefore.usedJSHeapSize
    };
    let sampling = true;
    let previousFrameAt = performance.now();
    const sampler = (now) => {
      const interval = now - previousFrameAt;
      previousFrameAt = now;
      intervals.push(interval);
      const counts = getCounts();
      const memory = getMemory();
      const entityTotal = totalEntities(counts);
      peaks.enemies = Math.max(peaks.enemies, counts.enemies);
      peaks.playerBullets = Math.max(peaks.playerBullets, counts.playerBullets);
      peaks.hostileProjectiles = Math.max(peaks.hostileProjectiles, counts.enemyBullets);
      peaks.hazards = Math.max(peaks.hazards, counts.hazards);
      peaks.particles = Math.max(peaks.particles, counts.particles);
      peaks.totalEntities = Math.max(peaks.totalEntities, entityTotal);
      peaks.usedJSHeapSize = Math.max(peaks.usedJSHeapSize, memory.usedJSHeapSize);
      if (entitySamples.length === 0 || now - entitySamples[entitySamples.length - 1].atMs >= 500) {
        entitySamples.push({ atMs: now, counts, total: entityTotal, memory });
      }
      if (sampling) requestAnimationFrame(sampler);
    };
    requestAnimationFrame(sampler);

    const authoredWaves = [];
    for (let waveIndex = 0; waveIndex < manager.waves.length; waveIndex += 1) {
      const wave = await spawnWave(waveIndex);
      const segmentStart = performance.now();
      await sleep(readMs);
      const activeAtReadEnd = manager.enemies.filter((enemy) => enemy?.active !== false || enemy?.waitingForEntry);
      activeAtReadEnd.forEach((enemy, index) => {
        enemy.health = 1;
        enemy.maxHealth = 1;
        setEnemyPose(
          enemy,
          player.x + ((index % 3) - 1) * 10,
          player.y - 72 - Math.floor(index / 3) * 20
        );
      });
      const combatStartedAt = performance.now();
      let scriptedShots = 0;
      while (
        performance.now() - combatStartedAt < combatMs
        && manager.enemies.some((enemy) => enemy?.active !== false)
      ) {
        player.shootCooldown = 0;
        const bullets = player.shoot();
        bullets.forEach((bullet) => play.bulletManager.addPlayerBullet(bullet));
        scriptedShots += bullets.length;
        const activeEnemies = manager.enemies.filter((enemy) => enemy?.active !== false);
        activeEnemies.forEach((enemy, index) => {
          const bullet = bullets[index % Math.max(1, bullets.length)];
          const x = bullet?.x ?? player.x;
          const y = bullet?.y ?? player.y - 72;
          setEnemyPose(enemy, x, y);
        });
        play.checkCollisions();
        await nextFrame();
      }
      const forcedCompletions = manager.enemies.filter((enemy) => enemy?.active !== false)
        .reduce((count, enemy) => count + (forceDestroy(enemy) ? 1 : 0), 0);
      manager.spawning = false;
      manager.waveSpawnPendingCount = 0;
      manager.onWaveCleared();
      await sleep(90);
      const recorded = [...metrics.waveSegments].reverse().find((entry) => (
        entry.sector === request.startSector && entry.waveIndex === waveIndex
      ));
      authoredWaves.push({
        waveIndex,
        beatId: wave.highSectorBeatId || null,
        beatNumber: wave.highSectorBeatNumber || null,
        protocolId: wave.highSectorProtocolId || null,
        plannedEnemyCount: wave.count,
        readMs,
        scriptedShots,
        forcedCompletions,
        durationMs: Number((performance.now() - segmentStart).toFixed(2)),
        recordedDurationMs: recorded?.durationMs ?? null
      });
    }

    clearCombat('runtime_benchmark_boss_setup');
    manager.phase = 'BOSS';
    const bossSegmentStartedAt = performance.now();
    await manager.spawnBoss(request.startSector);
    manager.state = 'BOSS_ACTIVE';
    const supportDeadline = performance.now() + 5200;
    while (
      manager.authoredBossSupportState?.state !== 'complete'
      && performance.now() < supportDeadline
    ) {
      await nextFrame();
    }
    const supportState = manager.authoredBossSupportState ? { ...manager.authoredBossSupportState } : null;
    const supports = manager.enemies.filter((enemy) => enemy?.kind === 'high_sector_boss_support');
    supports.forEach((enemy, index) => {
      enemy.health = 1;
      enemy.maxHealth = 1;
      setEnemyPose(enemy, player.x + (index - 1) * 10, player.y - 82);
    });
    if (manager.boss) {
      manager.boss.health = 1;
      manager.boss.maxHealth = Math.min(280, Math.max(1, Number(manager.boss.maxHealth) || 1));
      manager.boss.x = player.x;
      manager.boss.y = player.y - 82;
      if (manager.boss.sprite) {
        manager.boss.sprite.x = manager.boss.x;
        manager.boss.sprite.y = manager.boss.y;
      }
    }
    const bossCombatStartedAt = performance.now();
    while (
      performance.now() - bossCombatStartedAt < combatMs
      && (manager.boss?.active || manager.enemies.some((enemy) => enemy?.kind === 'high_sector_boss_support' && enemy.active))
    ) {
      player.shootCooldown = 0;
      const bullets = player.shoot();
      bullets.forEach((bullet) => play.bulletManager.addPlayerBullet(bullet));
      const targets = [
        ...manager.enemies.filter((enemy) => enemy?.kind === 'high_sector_boss_support' && enemy.active),
        ...(manager.boss?.active ? [manager.boss] : [])
      ];
      targets.forEach((target, index) => {
        const bullet = bullets[index % Math.max(1, bullets.length)];
        setEnemyPose(target, bullet?.x ?? player.x, bullet?.y ?? player.y - 82);
      });
      play.checkCollisions();
      await nextFrame();
    }
    supports.filter((enemy) => enemy?.active).forEach((enemy) => forceDestroy(enemy, 'runtime_benchmark_support_completion'));
    if (manager.boss?.active) forceDestroy(manager.boss, 'runtime_benchmark_boss_completion');
    const bossSegment = {
      durationMs: Number((performance.now() - bossSegmentStartedAt).toFixed(2)),
      support: supportState,
      supportCount: supports.length,
      supportComplete: supportState?.state === 'complete',
      bossHealthCap: manager.boss?.highSectorHealthCap || 280,
      bossMaxHealth: manager.boss?.maxHealth || 0,
      randomReinforcementEvents: manager.bossReinforcementEventsThisBoss,
      randomChaosEvents: manager.bossChaosEventsThisBoss
    };

    clearCombat('runtime_benchmark_finish');
    await sleep(4200);
    if (typeof globalThis.gc === 'function') globalThis.gc();
    await sleep(80);
    sampling = false;
    await nextFrame();
    const memoryAfter = getMemory();
    const countsAfter = getCounts();
    const diagnostics = window.__novaMayhemPerformanceDiagnostics?.getReport?.() || null;
    const schedulerAfter = window.__novaSteamCloudDiagnostics?.getSchedulerState?.() || null;
    const progressionAfter = snapshotProgression();
    const busyContexts = (diagnostics?.recentLongFrameContexts || []).filter((context) => (
      (context.events || []).some((event) => String(event?.label || '').startsWith('gameplay.'))
    ));
    return {
      experiment: {
        version: experiment.version,
        scenario: experiment.scenario,
        seed: experiment.seed,
        ruleset: experiment.ruleset,
        fixtureId: experiment.fixtureId,
        permanentPierceContract: experiment.permanentPierceContract,
        startSector: experiment.startSector,
        pressureProfile: { ...experiment.pressureProfile },
        lifeStock: experiment.lifeStock,
        startingLives: experiment.lives,
        phasePulseAvailable: experiment.phasePulseAvailable,
        baselineAugmentIds: [...experiment.baselineAugmentIds]
      },
      runPolicy: { ...game.runPolicy },
      reducedMotion: JSON.parse(window.render_game_to_text()).highSectorEscalation?.reducedMotion === true,
      protocolId: initialProtocolId,
      authoredWaves,
      penetration,
      pulse,
      tractor,
      bossSegment,
      metrics: JSON.parse(JSON.stringify(metrics)),
      lives: { starting: experiment.lives, ending: game.lives },
      memory: {
        forcedGcAvailable: typeof globalThis.gc === 'function',
        before: memoryBefore,
        peak: peaks.usedJSHeapSize,
        after: memoryAfter,
        deltaBytes: memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize
      },
      entities: {
        before: countsBefore,
        peak: peaks,
        after: countsAfter,
        totalDelta: totalEntities(countsAfter) - totalEntities(countsBefore),
        samples: entitySamples
      },
      intervals,
      diagnostics,
      busyEventStalls: busyContexts.length,
      progressionBytesUnchanged: JSON.stringify(progressionAfter) === JSON.stringify(progressionBefore),
      scheduler: {
        snapshots: (schedulerAfter?.metrics?.snapshotCollections || 0) - (schedulerBefore?.metrics?.snapshotCollections || 0),
        ipcRequests: (schedulerAfter?.metrics?.ipcRequests || 0) - (schedulerBefore?.metrics?.ipcRequests || 0)
      }
    };

    function assertBrowser(condition, message) {
      if (!condition) throw new Error(message);
    }
  }, {
    request: definition,
    readMs: authoredReadMs,
    combatMs: scriptedCombatMs,
    storageKeys: progressionKeys
  });

  const result = {
    definition,
    ...sample,
    frameTime: summarizeFrames(sample.intervals),
    pageErrors,
    consoleErrors
  };
  delete result.intervals;
  await page.close();
  return result;
}

mkdirSync(outputDir, { recursive: true });
assert.ok(cases.length > 0, 'Benchmark case filter did not match a supported case');
const server = await startServer();
const executablePath = findChrome();
assert.ok(executablePath, 'Installed Chrome or Edge is required');
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--enable-precise-memory-info',
    '--js-flags=--expose-gc'
  ]
});

try {
  const matrix = [];
  for (const definition of cases) {
    console.log(`[high-sector-benchmarks] ${definition.id}`);
    const result = await runCase(browser, definition);
    assert.deepEqual(result.pageErrors, [], `${definition.id} must have no page errors`);
    assert.deepEqual(result.consoleErrors, [], `${definition.id} must have no console errors`);
    assert.equal(result.runPolicy.prototype, true);
    assert.equal(result.runPolicy.allowPersistentRewards, false);
    assert.equal(result.runPolicy.allowCloudProgressSync, false);
    assert.equal(result.progressionBytesUnchanged, true, `${definition.id} changed progression bytes`);
    assert.equal(result.scheduler.snapshots, 0, `${definition.id} collected a Cloud snapshot during combat`);
    assert.equal(result.scheduler.ipcRequests, 0, `${definition.id} issued Cloud IPC during combat`);
    assert.equal(result.authoredWaves.length, 5);
    assert.deepEqual(result.authoredWaves.map((wave) => wave.beatId), [
      'opening_read',
      'priority_problem',
      'coordinated_escalation',
      'conversion_relief',
      'climax_boss_lead_in'
    ]);
    assert.ok(result.authoredWaves.every((wave) => wave.durationMs >= authoredReadMs));
    assert.ok(result.authoredWaves.every((wave) => Number.isFinite(wave.recordedDurationMs)));
    assert.equal(result.metrics.waveSegments.length, 5);
    assert.equal(result.entities.peak.hostileProjectiles <= 48, true);
    assert.equal(result.metrics.projectilePeak <= 48, true);
    assert.ok(result.frameTime.frames > 20);
    assert.equal(result.bossSegment.supportComplete, true);
    assert.equal(result.bossSegment.supportCount, 3);
    assert.ok(result.bossSegment.bossMaxHealth <= 280);
    assert.equal(result.bossSegment.randomReinforcementEvents, 0);
    assert.equal(result.bossSegment.randomChaosEvents, 0);
    if (definition.fixtureId === 'tactical_saturation_bounded') {
      assert.equal(result.penetration.hits, 2);
      assert.equal(result.penetration.effectivePenetrationHits, 1);
      assert.equal(result.penetration.chainLightningOrigins, 1);
    }
    if (definition.fixtureId === 'tactical_saturation_unlimited') {
      assert.ok(result.penetration.hits >= 3);
      assert.equal(result.penetration.chainLightningOrigins, 1);
    }
    if (definition.fixtureId === 'tactical_control_no_pierce') {
      assert.equal(result.penetration.hits, 0);
      assert.equal(result.penetration.chainLightningOrigins, 1);
    }
    if (definition.phasePulseAvailable) {
      assert.ok(result.pulse.firstRadius > 0 && result.pulse.firstRadius <= 72);
      assert.equal(result.pulse.firstCleared, result.pulse.seededBullets);
      assert.equal(result.pulse.rechargeBlocks, 1);
    } else {
      assert.equal(result.pulse.firstCleared, 0);
      assert.ok(result.pulse.unavailableDodges >= 1);
    }
    if (definition.tractorProbe) {
      assert.equal(result.protocolId, 'tractor_intercept');
      assert.equal(result.tractor.warningState, 'telegraph');
      assert.equal(result.tractor.pullState, 'active');
      assert.equal(result.tractor.breakState, 'cooldown');
      assert.equal(result.tractor.contract.lastBreakReason, 'escaped_lane');
      assert.ok(result.tractor.contract.lastBreakDurationMs >= 260);
      assert.equal(result.tractor.contract.lastRecoveryMs, 7200);
      assert.equal(result.tractor.playerDebuff.last, null);
    }
    const rawPath = path.join(outputDir, `${definition.id}.json`);
    writeFileSync(rawPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    matrix.push(result);
  }

  if (requestedCases.size === 0) {
    assert.deepEqual([...new Set(matrix.map((entry) => entry.experiment.startSector))], [75, 100, 120, 150]);
    assert.ok(matrix.some((entry) => entry.experiment.ruleset === 'pure'));
    assert.ok(matrix.some((entry) => entry.experiment.ruleset === 'tactical'));
    assert.ok(matrix.some((entry) => entry.experiment.lifeStock === 'three_lives'));
    assert.ok(matrix.some((entry) => entry.experiment.lifeStock === 'mature_stock'));
    assert.ok(matrix.some((entry) => entry.reducedMotion));
    assert.ok(matrix.some((entry) => entry.experiment.phasePulseAvailable));
    assert.ok(matrix.some((entry) => !entry.experiment.phasePulseAvailable));
  }

  const report = {
    status: 'passed',
    generatedAt: new Date().toISOString(),
    executablePath,
    authoredReadMs,
    scriptedCombatMs,
    cases: cases.map((entry) => entry.id),
    matrix,
    evidenceClass: 'automated_real_browser_runtime_with_scripted_target_clearance',
    limitations: [
      'Every five-beat wave arc and boss-support segment ran in the real browser game runtime; targets were then aligned and cleared by scripted real projectiles so the matrix remains bounded and repeatable.',
      'The harness keeps the player invulnerable. Death and damage values are recorded as zero under that safety fixture and are not survival evidence.',
      'Automated measurements are not evidence of human feel, fairness, fatigue, or a natural-run life economy.',
      'This matrix does not prove a 60-90 minute outcome. Skilled human Standard and Endurance playtests remain pending.',
      'Frame time and memory describe this installed Chromium automation environment, not every shipping PC.'
    ]
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.table(matrix.map((entry) => ({
    case: entry.definition.id,
    sector: entry.experiment.startSector,
    protocol: entry.protocolId,
    pierceHits: entry.penetration.hits,
    pulseClears: entry.pulse.clears,
    tractorBreakMs: entry.tractor?.contract?.lastBreakDurationMs || 0,
    waveMs: Math.round(entry.authoredWaves.reduce((sum, wave) => sum + wave.durationMs, 0)),
    bossMs: Math.round(entry.bossSegment.durationMs),
    p95Ms: entry.frameTime.p95Ms,
    p99Ms: entry.frameTime.p99Ms,
    over33: entry.frameTime.framesAbove33Ms,
    heapDeltaKb: Math.round(entry.memory.deltaBytes / 1024),
    stalls: entry.metrics.significantStalls
  })));
  console.log(`[high-sector-benchmarks] PASS ${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
