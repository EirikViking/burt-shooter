import assert from 'node:assert/strict';

globalThis.Audio = class {
  addEventListener() {}
  removeEventListener() {}
  pause() {}
  play() { return Promise.resolve(); }
};
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener() {},
  removeEventListener() {}
};

const { EnemyManager } = await import('../src/managers/EnemyManager.js');

function createManager({ playerX = 200, aggression = 1.12 } = {}) {
  const manager = Object.create(EnemyManager.prototype);
  manager.level = 51;
  manager.currentWaveIndex = 0;
  manager.currentNormalWaveDifficultyLevel = 51;
  manager.normalWavesTotal = 6;
  manager.waves = [{ type: 'generated', count: 10, formation: 'ARC' }];
  manager.phase = 'WAVES';
  manager.state = 'WAVE_ACTIVE';
  manager.waveEnding = false;
  manager.spawning = false;
  manager.pendingWaveConfig = null;
  manager.waveActiveTimer = 2000;
  manager.boss = null;
  manager.bossSpawnedThisLevel = false;
  manager.mayhemReinforcementState = null;
  manager.mayhemReinforcementTriggeredWaves = new Set();
  manager.mayhemReinforcementEligibleMisses = 0;
  manager.mayhemReinforcementRunSpawned = 0;
  manager.game = {
    gameId: 'overrun-reinforcement-check',
    getWidth: () => 1280,
    getHeight: () => 720,
    getRunModeProfile: () => ({
      routineReinforcementsEnabled: true,
      normalWaveAggressionMult: aggression
    }),
    contentDirector: {
      seed: 'overrun-reinforcement-check',
      shapeWaveConfig: (config) => ({ ...config })
    },
    scenes: {
      play: {
        player: { x: playerX, invulnerable: false },
        bulletManager: { enemyBullets: [] },
        sectorArrivalStinger: { active: false }
      }
    }
  };
  return manager;
}

const manager = createManager();
const routeCycle = Array.from({ length: 4 }, (_entry, index) =>
  manager.getOverrunRoutineReinforcementRoute(index)
);
assert.deepEqual(new Set(routeCycle), new Set(['side_left', 'side_right', 'bottom', 'opposite_player']));

for (let index = 0; index < 12; index += 1) {
  const config = manager.createOverrunRoutineReinforcementConfig(index);
  assert.ok(config.count >= 2 && config.count <= 4, `routine group ${index} must stay small`);
  assert.equal(config.isOverrunRoutineReinforcement, true);
  assert.equal(config.allowConcurrentSpawn, true);
  assert.ok(config.tactic.fireScalar > 1);
  assert.ok(config.tactic.fireDelayMult < 1);
  assert.ok(config.tactic.diveBias > 1);
  assert.equal(config.tactic.forcedDive, true);
  assert.notEqual(
    config.reinforcementEntryRoute,
    'opposite_player',
    'routine warnings and spawns must share a concrete entry edge'
  );
}

assert.equal(manager.resolveOverrunRoutineReinforcementRoute('opposite_player'), 'side_right');
manager.game.scenes.play.player.x = 1000;
assert.equal(manager.resolveOverrunRoutineReinforcementRoute('opposite_player'), 'side_left');
manager.game.scenes.play.player.x = 200;

const eligibility = manager.getOverrunRoutineReinforcementEligibility(8);
assert.equal(eligibility.eligible, true);
assert.equal(eligibility.isRoutineReinforcement, true);
assert.deepEqual(eligibility.reinforcementWaveIndices, []);
assert.equal(eligibility.reinforcementWaveConfigs.length, 1);
assert.equal(eligibility.syntheticWaveCount, 1);
assert.equal(eligibility.warningMs, 1200);

manager.waveActiveTimer = 1799;
assert.ok(manager.getOverrunRoutineReinforcementEligibility(8).reasons.includes('wave_too_young'));
manager.waveActiveTimer = 2000;
manager.mayhemReinforcementTriggeredWaves.add(0);
assert.ok(manager.getOverrunRoutineReinforcementEligibility(8).reasons.includes('already_triggered_for_wave'));
manager.mayhemReinforcementTriggeredWaves.clear();

const position = { x: 640, y: 160 };
assert.deepEqual(
  manager.getWaveEntryStart({ route: 'side_left', screenW: 1280, pos: position }),
  { x: -100, y: 160 }
);
assert.deepEqual(
  manager.getWaveEntryStart({ route: 'side_right', screenW: 1280, pos: position }),
  { x: 1380, y: 160 }
);
assert.deepEqual(
  manager.getWaveEntryStart({ route: 'bottom', screenW: 1280, pos: position }),
  { x: 640, y: 820 }
);
assert.deepEqual(
  manager.getWaveEntryStart({ route: 'opposite_player', screenW: 1280, pos: position }),
  { x: 1380, y: 160 },
  'a player on the left should receive the opposite-player route from the right'
);
manager.game.scenes.play.player.x = 1000;
assert.deepEqual(
  manager.getWaveEntryStart({ route: 'opposite_player', screenW: 1280, pos: position }),
  { x: -100, y: 160 },
  'a player on the right should receive the opposite-player route from the left'
);

const baselineManager = createManager({ aggression: 1 });
const aggressiveManager = createManager({ aggression: 1.12 });
const baseTactic = baselineManager.applyNormalWavePressureToTactic({
  id: 'qa',
  fireScalar: 1,
  fireDelayMult: 1,
  diveBias: 1,
  entrySpeed: 1
});
const aggressiveTactic = aggressiveManager.applyNormalWavePressureToTactic({
  id: 'qa',
  fireScalar: 1,
  fireDelayMult: 1,
  diveBias: 1,
  entrySpeed: 1
});
assert.ok(aggressiveTactic.fireScalar > baseTactic.fireScalar);
assert.ok(aggressiveTactic.fireDelayMult < baseTactic.fireDelayMult);
assert.ok(aggressiveTactic.diveBias > baseTactic.diveBias);
assert.ok(aggressiveTactic.entrySpeed < baseTactic.entrySpeed);

const updateManager = createManager();
const routineConfig = updateManager.createOverrunRoutineReinforcementConfig(0);
updateManager.mayhemReinforcementState = {
  currentWaveIndex: 0,
  reinforcementWaveIndex: 0,
  reinforcementWaveIndices: [],
  reinforcementWaveConfigs: [routineConfig],
  syntheticWaveCount: 1,
  isSuperStorm: false,
  isRoutineReinforcement: true,
  spawnAt: 0,
  spawned: false
};
updateManager.mayhemReinforcementConsumedWaveIndices = new Set();
updateManager.mayhemReinforcementStats = { spawned: 0, lastWarningLeadMs: 1200 };
updateManager.mayhemSuperStormSurvivalWaveCounts = new Map();
updateManager.mayhemSuperStormRunMissedWaveKeys = new Set();
updateManager.mayhemReinforcementRunMissedWaveKeys = new Set();
updateManager.measurePerformance = (_id, operation) => operation();
let spawnedRoutineConfig = null;
updateManager.spawnWave = (config) => {
  spawnedRoutineConfig = config;
};

assert.equal(updateManager.updateMayhemReinforcement(), true);
assert.equal(spawnedRoutineConfig?.allowConcurrentSpawn, true);
assert.equal(spawnedRoutineConfig?.reinforcementEntryRoute, routineConfig.reinforcementEntryRoute);
assert.ok(spawnedRoutineConfig?.count >= 2 && spawnedRoutineConfig?.count <= 4);
assert.equal(
  updateManager.mayhemReinforcementConsumedWaveIndices.size,
  0,
  'synthetic routine groups must not consume a scheduled future wave'
);

const failSoftManager = createManager();
const failSoftConfig = failSoftManager.createOverrunRoutineReinforcementConfig(0);
failSoftManager.mayhemReinforcementState = {
  currentWaveIndex: 0,
  reinforcementWaveIndex: 0,
  reinforcementWaveIndices: [],
  reinforcementWaveConfigs: [failSoftConfig],
  syntheticWaveCount: 1,
  isSuperStorm: false,
  isRoutineReinforcement: true,
  warningMs: 1200,
  spawnAt: Date.now() + 1200,
  warningFired: false,
  spawned: false
};
failSoftManager.mayhemReinforcementConsumedWaveIndices = new Set();
failSoftManager.mayhemReinforcementStats = {
  warnings: 0,
  spawned: 0,
  lastWarningLeadMs: 0
};
failSoftManager.mayhemSuperStormSurvivalWaveCounts = new Map();
failSoftManager.mayhemSuperStormRunMissedWaveKeys = new Set();
failSoftManager.mayhemReinforcementRunMissedWaveKeys = new Set();
failSoftManager.measurePerformance = (_id, operation) => operation();
failSoftManager.game.scenes.play.showMayhemRoutineReinforcementWarning = () => {
  throw new ReferenceError('cosmetic regression probe');
};
let failSoftSpawn = null;
failSoftManager.spawnWave = (config) => {
  failSoftSpawn = config;
};
const presentationErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => presentationErrors.push(args.map(String).join(' '));
try {
  assert.equal(failSoftManager.fireMayhemReinforcementWarning(), true);
} finally {
  console.error = originalConsoleError;
}
assert.equal(failSoftManager.mayhemReinforcementState.warningFired, true);
assert.equal(failSoftManager.mayhemReinforcementState.warningTier, 'routine');
assert.equal(failSoftManager.mayhemReinforcementStats.warnings, 1);
assert.ok(
  presentationErrors.some((entry) => entry.includes('cosmetic warning presentation failed tier=routine')),
  'cosmetic presentation failure must be logged'
);
failSoftManager.mayhemReinforcementState.spawnAt = 0;
assert.equal(
  failSoftManager.updateMayhemReinforcement(),
  true,
  'cosmetic presentation failure must not stop reinforcement gameplay'
);
assert.equal(failSoftSpawn?.isOverrunRoutineReinforcement, true);

const bossManager = createManager();
bossManager.state = 'BOSS_ACTIVE';
bossManager.boss = { active: true, spawnedAtMs: Date.now() - 5000 };
bossManager.bossSpawnedAtMs = Date.now() - 5000;
bossManager.bossDefeatedThisLevel = false;
bossManager.bossReinforcementEventsThisBoss = 0;
bossManager.bossReinforcementState = null;
bossManager.bossReinforcementCooldownUntilMs = 0;
bossManager.bossReinforcementNextCheckAtMs = 0;
bossManager.bossReinforcementAttemptIndex = 0;
bossManager.enemies = [];
bossManager.mayhemReinforcementStats = { scheduled: 0, spawned: 0, lastWarningLeadMs: 1200 };
bossManager.fireMayhemReinforcementWarning = () => true;
bossManager.measurePerformance = (_id, operation) => operation();
const spawnedBossConfigs = [];
bossManager.spawnWave = (config) => spawnedBossConfigs.push(config);

assert.equal(bossManager.maybeScheduleOverrunBossRoutineReinforcement({}), true);
assert.equal(bossManager.bossReinforcementState?.isRoutineReinforcement, true);
assert.equal(bossManager.bossReinforcementState?.reinforcementWaveConfigs?.length, 1);
bossManager.bossReinforcementState.spawnAt = 0;
assert.equal(bossManager.updateBossMayhemReinforcement(), true);
assert.equal(spawnedBossConfigs.length, 1);
assert.equal(spawnedBossConfigs[0]?.allowConcurrentSpawn, true);
assert.equal(spawnedBossConfigs[0]?.isOverrunRoutineReinforcement, true);
assert.ok(spawnedBossConfigs[0]?.count >= 2 && spawnedBossConfigs[0]?.count <= 4);
assert.ok(['side_left', 'side_right', 'bottom'].includes(
  spawnedBossConfigs[0]?.reinforcementEntryRoute
));

console.log('[overrun-reinforcements] PASS concrete warning/spawn routes, small routine groups, high aggression');
