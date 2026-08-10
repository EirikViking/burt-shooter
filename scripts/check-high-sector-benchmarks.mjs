import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { createHighSectorEscalationState } from '../src/config/HighSectorEscalation.js';
import { ShipData } from '../src/config/ShipData.js';

const host = '127.0.0.1';
const port = process.env.CHECK_URL ? null : await findAvailablePort(4911);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/high-sector-benchmarks-${timestamp()}`);
const devtoolsHash = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const config = BalanceConfig.difficulty.highSectorEscalation;
const defaultSectors = [60, 75, 80, 100, 120, 130];
const sampleDurationMs = Math.max(1000, Number(process.env.CHECK_HIGH_SECTOR_SAMPLE_MS) || 1800);
const warmupDurationMs = Math.max(0, Number(process.env.CHECK_HIGH_SECTOR_WARMUP_MS) || 900);
const performanceDiagnosticsEnabled = process.env.CHECK_HIGH_SECTOR_PERF === '1';
const prototypeMode = process.env.CHECK_HIGH_SECTOR_PROTOTYPE === '1';
const stressMode = process.env.CHECK_HIGH_SECTOR_STRESS === '1';
const requestedSectors = new Set(String(process.env.CHECK_HIGH_SECTOR_SECTORS || '')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value)));
const sectors = requestedSectors.size > 0
  ? defaultSectors.filter((sector) => requestedSectors.has(sector))
  : defaultSectors;
const requestedHulls = new Set(String(process.env.CHECK_HIGH_SECTOR_HULLS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean));
const hulls = [
  { class: 'slow', id: 'nova_ship_06' },
  { class: 'standard', id: 'nova_ship_01' },
  { class: 'fast', id: 'nova_ship_04' }
]
  .filter((entry) => requestedHulls.size === 0 || requestedHulls.has(entry.class))
  .map((entry) => ({ ...entry, ship: ShipData.find((ship) => ship.id === entry.id) }));

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
  try { return (await fetch(url, { cache: 'no-store' })).ok; } catch { return false; }
}

async function startServer() {
  if (await canFetch(baseUrl)) return null;
  const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error('Benchmark Vite server did not become ready');
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
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] || 0;
}

function summarizeFrames(intervals) {
  const values = intervals.filter((value) => Number.isFinite(value) && value > 0);
  const averageMs = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return {
    frames: values.length,
    averageMs: Number(averageMs.toFixed(2)),
    averageFps: Number((1000 / Math.max(0.01, averageMs)).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    p99Ms: Number(percentile(values, 0.99).toFixed(2)),
    maxMs: Number(Math.max(0, ...values).toFixed(2)),
    framesAbove25Ms: values.filter((value) => value > 25).length,
    framesAbove33Ms: values.filter((value) => value > 33.34).length,
    framesAbove50Ms: values.filter((value) => value > 50).length
  };
}

function summarizeLongFrames(diagnostics = {}) {
  const contexts = Array.isArray(diagnostics?.recentLongFrameContexts)
    ? diagnostics.recentLongFrameContexts
    : [];
  const over50 = contexts.filter((context) => Math.max(Number(context.frameMs) || 0, Number(context.preFrameGapMs) || 0) > 50);
  return {
    capturedContextsOver50Ms: over50.length,
    updateWorkOver50Ms: over50.filter((context) => (Number(context.frameMs) || 0) > 50).length,
    renderOrSchedulerGapOver50Ms: over50.filter((context) => (Number(context.preFrameGapMs) || 0) > 50).length,
    gameplayBreadcrumbContextsOver50Ms: over50.filter((context) => (context.events || [])
      .some((event) => String(event?.label || '').startsWith('gameplay.'))).length,
    worstContexts: over50
      .sort((left, right) => Math.max(Number(right.frameMs) || 0, Number(right.preFrameGapMs) || 0)
        - Math.max(Number(left.frameMs) || 0, Number(left.preFrameGapMs) || 0))
      .slice(0, 10)
  };
}

function projectedDifficulty(hull, sector) {
  const state = createHighSectorEscalationState({
    config, armed: true, sector, seed: 'high-sector-benchmark-seed-20260809', runMode: 'ranked'
  });
  const ship = hull.ship;
  const rawDps = ship.stats.damage * ship.weapon.bullets * (1000 / ship.stats.fireRate);
  const speedFactor = ship.stats.speed / 5.75;
  const hitEfficiency = Math.max(0.48, Math.min(0.72, 0.59 + (speedFactor - 1) * 0.16));
  const waveCount = sector > 80 ? state.authoredEncounterLimit : 8;
  const averageEnemies = Math.min(22, 14 + state.pressureStep * 0.45 + (state.protocol ? 1.25 : 0));
  const enemyHpBudget = waveCount * averageEnemies * 3.4;
  const waveCombatSeconds = enemyHpBudget / Math.max(1, rawDps * hitEfficiency);
  const downtimeSeconds = waveCount * ((state.downtime.briefingMs + state.downtime.cleanupMs) / 1000);
  const bossDurationSeconds = state.caps.maxBossHealth / Math.max(1, rawDps * hitEfficiency * 0.72);
  const sectorDurationSeconds = waveCombatSeconds + downtimeSeconds + bossDurationSeconds;
  const exposure = state.pressureBudget * (1 / speedFactor) * (waveCount / 5);
  const projectedLivesLost = Math.max(0, Math.min(2.6, (exposure - 1.05) * 0.78));
  const damageEvents = Math.round(projectedLivesLost * 4);
  const bullets = Math.round(damageEvents * 0.52);
  const collisions = Math.round(damageEvents * 0.2);
  const protocol = Math.round(damageEvents * (state.protocol ? 0.18 : 0.08));
  const boss = Math.max(0, damageEvents - bullets - collisions - protocol);
  return {
    pressureBudget: state.pressureBudget,
    protocol: state.protocol?.id || null,
    waveCount,
    rawDps: Number(rawDps.toFixed(2)),
    hitEfficiency: Number(hitEfficiency.toFixed(3)),
    sectorDurationSeconds: Number(sectorDurationSeconds.toFixed(2)),
    projectedRunElapsedMinutes: Number(((sector - 1) * sectorDurationSeconds / 60).toFixed(2)),
    lives: {
      gained: 0,
      lost: Number(projectedLivesLost.toFixed(2)),
      remainingFromThree: Number(Math.max(0, 3 - projectedLivesLost).toFixed(2))
    },
    damageSources: { hostileProjectile: bullets, collision: collisions, protocolPressure: protocol, boss: boss },
    avoidabilityWindowMs: {
      entryFloor: state.caps.minEntryDurationMs,
      protocolWarning: state.protocol?.id === 'shifting_front' ? 1900 : null,
      bossSupportWarning: sector === 80 ? config.ascendantWarningLeadMs : null
    },
    expectedPeaks: {
      enemies: Math.ceil(averageEnemies + (state.protocol?.id === 'hunter_pair' ? 2 : 0)),
      hostileProjectiles: state.caps.maxHostileProjectiles,
      hazardAreaRatio: state.caps.maxHazardAreaRatio,
      effects: state.protocol ? 12 : 9
    },
    comboUptimeRatio: Number(Math.max(0.35, Math.min(0.86, hitEfficiency / state.pressureBudget + 0.08)).toFixed(3)),
    tacticalDraftExhaustion: {
      pure: 'not_applicable',
      tacticalProjectedPicks: Math.max(0, Math.floor((sector - 1) / 5)),
      risk: sector >= 120 ? 'high' : sector >= 100 ? 'medium' : 'low'
    },
    bossDurationSeconds: Number(bossDurationSeconds.toFixed(2)),
    fatigueNotes: sector >= 120
      ? 'Downtime is at its readability floor; monitor audio and repeated cue fatigue.'
      : 'No terminal fatigue flag in this bounded slice.',
    distractionNotes: state.protocol
      ? 'One headline protocol cue; no persistent HUD suppression.'
      : 'No protocol headline in this sector.'
  };
}

async function runRenderedProbe(browser, hull, sector) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(({ prototypeMode: enablePrototype }) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      bestScore: 1000000, bestSector: 130, bestLevel: 130, pilotRank: 50, pilotXp: 999999,
      totalRuns: 100, totalBossesDefeated: 130, totalWavesCleared: 1000,
      unlockedShipIds: Array.from({ length: 30 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`)
    }));
    if (enablePrototype) {
      localStorage.setItem('nova.highSectorPrototype.v1', JSON.stringify({ enabled: true, quickStart: true }));
    }
  }, { prototypeMode });
  const url = new URL(baseUrl);
  url.searchParams.set('nova-devtools-hash', devtoolsHash);
  url.searchParams.set('debugBossToken', 'NOVA_DEBUG_2026');
  url.searchParams.set('controlSmoke', '1');
  url.searchParams.set('startLevel', String(sector));
  url.searchParams.set('highSectorEscalation', '1');
  if (performanceDiagnosticsEnabled) url.searchParams.set('perf', '1');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 30000 });
  assert.equal(await page.evaluate(({ spriteKey, prototypeMode: enablePrototype }) => window.__game.startGame(spriteKey, {
    countShipUsage: false,
    ...(enablePrototype ? { runMode: 'ranked_tactical' } : {})
  }), { spriteKey: hull.ship.spriteKey, prototypeMode }), true);
  await page.waitForFunction(() => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    return window.__game?.currentSceneName === 'play' && manager && (manager?.enemies?.length || 0) > 0;
  }, null, { timeout: 30000 });
  await page.evaluate(({ target, seed }) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.contentDirector.seed = seed;
    game.level = target;
    game.lives = 3;
    play.player.invulnerable = true;
    play.player.invulnerableTime = 600000;
    play.enemyManager.startLevel(target);
    play.clearEnemyBullets?.('high_sector_benchmark_setup');
  }, { target: sector, seed: `benchmark-${hull.class}-20260809` });
  await page.waitForFunction(() => (window.__game?.scenes?.play?.enemyManager?.enemies?.length || 0) > 0, null, { timeout: 15000 });
  await page.waitForTimeout(warmupDurationMs);
  await page.keyboard.down('Space');
  const sample = await page.evaluate(({ durationMs, stressMode: enableStress }) => new Promise((resolve) => {
    const progressionKeys = [
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
    ];
    const snapshotProgression = () => Object.fromEntries(
      progressionKeys.map((key) => [key, localStorage.getItem(key)])
    );
    const getObjectCounts = () => {
      const play = window.__game?.scenes?.play;
      const diagnosticOwner = window.__novaMayhemPerformanceDiagnostics?.owner;
      const bulletDebug = play?.bulletManager?.getDebugState?.() || {};
      return {
        enemies: play?.enemyManager?.enemies?.length || 0,
        playerBullets: play?.bulletManager?.playerBullets?.length || 0,
        enemyBullets: play?.bulletManager?.enemyBullets?.length || 0,
        particles: play?.particleManager?.particles?.length || 0,
        particlePool: play?.particleManager?.pool?.length || 0,
        energyBlooms: play?.particleManager?.energyBlooms?.length || 0,
        energyBloomPool: play?.particleManager?.energyBloomPool?.length || 0,
        scorePopups: play?.scorePopupManager?.popups?.length || 0,
        pendingScorePopups: play?.scorePopupManager?.pendingPopups?.length || 0,
        activeTextObjects: diagnosticOwner?.lastCounts?.activeTextObjects ?? null,
        gameContainerChildCount: play?.gameContainer?.children?.length || 0,
        tickerCount: window.__game?.app?.ticker?.count ?? null,
        activePickupEffects: play?.activePickupEffects?.size || 0,
        managedProjectileVisuals: bulletDebug.managedVisuals || 0,
        projectileOrphansRemoved: bulletDebug.orphanVisualsRemoved || 0,
        enemyManagerState: play?.enemyManager?.state || null,
        tacticalDraftActive: play?.tacticalDraft?.active === true,
        overrunInterludeActive: play?.overrunMilestoneInterlude?.active === true,
        paused: play?.isPaused === true
      };
    };
    const schedulerStart = window.__novaSteamCloudDiagnostics?.getSchedulerState?.() || null;
    const progressionBefore = snapshotProgression();
    const objectsBefore = getObjectCounts();
    window.__novaMayhemPerformanceDiagnostics?.reset?.();
    window.__game?.scenes?.play?.enemyManager?.announceHighSectorProtocol?.();
    const intervals = [];
    const peaks = { enemies: 0, hostileProjectiles: 0, hazards: 0, particles: 0, effects: 0 };
    let comboActiveFrames = 0;
    let previous = performance.now();
    const startedAt = previous;
    let nextStressAt = startedAt + 1500;
    let nextObjectSampleAt = startedAt;
    let stressSequence = 0;
    let skippedInactiveStressEvents = 0;
    const objectSamples = [];
    const tick = (now) => {
      intervals.push(now - previous);
      previous = now;
      const play = window.__game.scenes.play;
      const manager = play.enemyManager;
      if (now >= nextObjectSampleAt) {
        nextObjectSampleAt += 5000;
        objectSamples.push({ elapsedMs: now - startedAt, ...getObjectCounts() });
      }
      if (play.tacticalDraft?.active && !play.tacticalDraft?.passed && !play.tacticalDraft?.confirmedId) {
        play.passTacticalDraft?.('pointer');
      }
      if (play.overrunMilestoneInterlude?.active) {
        play.confirmOverrunInterlude?.('performance_stress');
      }
      if (enableStress && now >= nextStressAt) {
        nextStressAt = now + 1500;
        const activeCombat = !play.isPaused
          && !play.tacticalDraft?.active
          && !play.overrunMilestoneInterlude?.active
          && (manager.state === 'WAVE_ACTIVE' || manager.state === 'BOSS_ACTIVE');
        if (!activeCombat) {
          skippedInactiveStressEvents += 1;
        } else {
          stressSequence += 1;
          const candidates = manager.enemies
            .filter((enemy) => enemy?.active !== false && enemy?.kind !== 'boss')
            .slice(0, stressSequence % 8 === 0 ? 4 : 1);
          for (const enemy of candidates) {
            const destroyed = enemy.takeDamage?.((Number(enemy.health) || 1) + 1000, { source: 'performance_stress' }) === true;
            if (destroyed) play.onEnemyKilled?.(enemy);
          }
          const anchor = candidates[0] || play.player;
          if (anchor) {
            const award = window.__game.addScore?.(25, 'enemyScore') || 25;
            play.scorePopupManager?.addScorePopup?.(anchor.x, anchor.y, award);
            play.particleManager?.createExplosion?.(anchor.x, anchor.y, 0x37f5ff, 1);
          }
          if (stressSequence % 6 === 0) {
            const pickup = play.powerupManager?.spawnSpecific?.(
              play.player.x,
              play.player.y,
              'rapid_fire',
              { source: 'debug_performance_stress', countDrop: false }
            );
            pickup?.collect?.(play.player, play);
          }
          if (stressSequence % 10 === 0) {
            play.enqueueToast?.('PERFORMANCE STRESS EVENT', {
              type: 'generic',
              duration: 500,
              priority: 0,
              silent: true
            });
          }
        }
      }
      peaks.enemies = Math.max(peaks.enemies, manager.enemies.filter((enemy) => enemy?.active !== false || enemy?.waitingForEntry).length);
      peaks.hostileProjectiles = Math.max(peaks.hostileProjectiles, play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false).length);
      peaks.hazards = Math.max(peaks.hazards, play.bossHazards?.length || 0);
      peaks.particles = Math.max(peaks.particles, play.particleManager?.particles?.length || 0);
      peaks.effects = Math.max(peaks.effects,
        (play.activePickupEffects?.size || 0) + (play.spectacleDirector?.getDebugState?.().activePulses || 0));
      if ((play.comboCount || 0) > 0 || (play.comboMultiplier || 1) > 1) comboActiveFrames += 1;
      if (now - startedAt >= durationMs) {
        const diagnostics = window.__novaMayhemPerformanceDiagnostics?.getReport?.() || null;
        const schedulerEnd = window.__novaSteamCloudDiagnostics?.getSchedulerState?.() || null;
        resolve({
          intervals,
          peaks,
          comboActiveFrames,
          elapsedMs: now - startedAt,
          lives: window.__game.lives,
          damageSources: play.balanceDebugStats?.damageTakenBySource || {},
          protocol: manager.highSectorEscalationState?.protocol?.id || null,
          projectileCap: play.bulletManager.maxEnemyBullets,
          renderState: JSON.parse(window.render_game_to_text()).highSectorEscalation,
          diagnostics,
          schedulerStart,
          schedulerEnd,
          progressionBefore,
          progressionAfter: snapshotProgression(),
          objectsBefore,
          objectsAfter: getObjectCounts(),
          objectSamples,
          stressSequence,
          skippedInactiveStressEvents
        });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { durationMs: sampleDurationMs, stressMode });
  await page.keyboard.up('Space');
  await page.close();
  return {
    frameTime: summarizeFrames(sample.intervals),
    elapsedMs: Number(sample.elapsedMs.toFixed(2)),
    peaks: sample.peaks,
    sampledComboUptimeRatio: Number((sample.comboActiveFrames / Math.max(1, sample.intervals.length)).toFixed(3)),
    sampledLivesRemaining: sample.lives,
    sampledDamageSources: sample.damageSources,
    protocol: sample.protocol,
    projectileCap: sample.projectileCap,
    renderState: sample.renderState,
    diagnostics: sample.diagnostics,
    longFrameAnalysis: summarizeLongFrames(sample.diagnostics),
    schedulerStart: sample.schedulerStart,
    schedulerEnd: sample.schedulerEnd,
    progressionBytesUnchanged: JSON.stringify(sample.progressionAfter) === JSON.stringify(sample.progressionBefore),
    objectsBefore: sample.objectsBefore,
    objectsAfter: sample.objectsAfter,
    objectSamples: sample.objectSamples,
    stressSequence: sample.stressSequence,
    skippedInactiveStressEvents: sample.skippedInactiveStressEvents,
    errors
  };
}

mkdirSync(outputDir, { recursive: true });
assert.ok(sectors.length > 0, 'Benchmark sector filter did not match a supported sector');
assert.ok(hulls.length > 0, 'Benchmark hull filter did not match a supported hull');
for (const hull of hulls) assert.ok(hull.ship, `Missing ${hull.class} benchmark hull`);
const server = await startServer();
const chrome = findChrome();
assert.ok(chrome, 'Installed Chrome or Edge required');
const browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--autoplay-policy=no-user-gesture-required'] });

try {
  const matrix = [];
  for (const sector of sectors) {
    for (const hull of hulls) {
      console.log(`[high-sector-benchmarks] sector=${sector} hull=${hull.class}`);
      const model = projectedDifficulty(hull, sector);
      const rendered = await runRenderedProbe(browser, hull, sector);
      writeFileSync(
        path.join(outputDir, `sector-${sector}-${hull.class}-raw.json`),
        `${JSON.stringify({ sector, hullClass: hull.class, model, rendered }, null, 2)}\n`,
        'utf8'
      );
      assert.equal(rendered.renderState.active, true);
      assert.equal(rendered.projectileCap, 48);
      assert.ok(rendered.peaks.hostileProjectiles <= rendered.projectileCap);
      assert.deepEqual(rendered.errors, []);
      if (stressMode) {
        console.log(`[high-sector-benchmarks] storage sector=${sector} ${JSON.stringify(rendered.diagnostics?.frameCounterTotals || {})}`);
        assert.equal(rendered.progressionBytesUnchanged, true, 'prototype stress must leave progression bytes unchanged');
        assert.equal(rendered.diagnostics?.frameCounterTotals?.localStorageReads || 0, 0, 'active stress must perform zero localStorage reads');
        assert.equal(rendered.diagnostics?.frameCounterTotals?.localStorageWrites || 0, 0, 'active stress must perform zero localStorage writes');
        assert.equal(
          (rendered.schedulerEnd?.metrics?.snapshotCollections || 0) - (rendered.schedulerStart?.metrics?.snapshotCollections || 0),
          0,
          'active stress must collect zero Cloud snapshots'
        );
        assert.equal(
          (rendered.schedulerEnd?.metrics?.ipcRequests || 0) - (rendered.schedulerStart?.metrics?.ipcRequests || 0),
          0,
          'active stress must issue zero Cloud IPC requests'
        );
        if (sampleDurationMs >= 60000) {
          const eventCounts = rendered.diagnostics?.eventCounts || {};
          for (const label of [
            'gameplay.player_shot',
            'gameplay.enemy_hit',
            'gameplay.enemy_kill',
            'gameplay.score_award',
            'gameplay.score_popup',
            'gameplay.particle_burst',
            'gameplay.pickup_collected',
            'gameplay.toast_created',
            'gameplay.enemy_wave_spawned',
            'gameplay.deep_space_protocol'
          ]) {
            assert.ok((eventCounts[label] || 0) > 0, `stress capture must include ${label}`);
          }
          if (sector === 80) {
            assert.ok((eventCounts['gameplay.boss_action'] || 0) > 0, 'Sector 80 stress capture must include a boss action');
          }
        }
      }
      matrix.push({
        sector,
        hullClass: hull.class,
        hullId: hull.ship.id,
        hullName: hull.ship.name,
        hullSpeed: hull.ship.stats.speed,
        model,
        rendered
      });
    }
  }
  const sector130 = matrix.filter((entry) => entry.sector === 130);
  for (const entry of sector130) {
    assert.ok(entry.rendered.frameTime.averageFps >= 55, `${entry.hullClass} Sector 130 average FPS below 55`);
    assert.ok(entry.rendered.frameTime.p95Ms <= 24, `${entry.hullClass} Sector 130 p95 above 24ms`);
    assert.ok(entry.rendered.frameTime.framesAbove33Ms <= 1, `${entry.hullClass} Sector 130 has repeated >33ms frames`);
  }
  const report = {
    status: 'passed',
    generatedAt: new Date().toISOString(),
    chrome,
    sampleDurationMs,
    warmupDurationMs,
    performanceDiagnosticsEnabled,
    prototypeMode,
    stressMode,
    sectors,
    hulls: hulls.map((hull) => ({ class: hull.class, id: hull.ship.id, name: hull.ship.name, speed: hull.ship.stats.speed })),
    matrix,
    limitations: [
      'Rendered frame-time and active-entity peaks are measured in installed Chrome during a deterministic combat sample.',
      'Full-sector duration, life loss, damage-source distribution, combo uptime, Draft exhaustion, and boss duration are deterministic source-based projections; they are labeled model values and are not claimed as human playthrough timings.',
      'The diagnostic profile keeps the player invulnerable during rendered probes so frame metrics are reproducible and do not write progression, achievements, saves, or leaderboard results.'
    ]
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.table(matrix.map((entry) => ({
    sector: entry.sector,
    hull: entry.hullClass,
    durationSec: entry.model.sectorDurationSeconds,
    livesLost: entry.model.lives.lost,
    bossSec: entry.model.bossDurationSeconds,
    avgFps: entry.rendered.frameTime.averageFps,
    p95Ms: entry.rendered.frameTime.p95Ms,
    p99Ms: entry.rendered.frameTime.p99Ms,
    over33: entry.rendered.frameTime.framesAbove33Ms
  })));
  console.log(`[high-sector-benchmarks] PASS ${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
