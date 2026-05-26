import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BalanceConfig } from '../src/config/BalanceConfig.js';

globalThis.Audio ??= class {
  constructor() {
    this.volume = 1;
    this.readyState = 4;
  }
  addEventListener() {}
  removeEventListener() {}
  play() { return Promise.resolve(); }
  pause() {}
  load() {}
  cloneNode() { return new globalThis.Audio(); }
};

const HISTORICAL_INTENDED = {
  source: 'arcade revamp guard: prevent accidental one-wave boss rush, not old duration lock',
  minWavesBeforeBoss: 6,
  maxPlannedWavesBeforeBoss: 10
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function fakeGame() {
  const play = {
    wavesCleared: 0,
    showWaveBonusEffect() {},
    enqueueToast() {},
    getTransitionMessageDelayMs: () => 0
  };
  return {
    lives: 3,
    scenes: { play },
    addScore: (score) => score,
    getWidth: () => 1280,
    getHeight: () => 720
  };
}

function makeManager(EnemyManager, {
  level = 1,
  currentWaveIndex = 0,
  normalWavesTotal = 6,
  elapsedMs = 80000
} = {}) {
  const manager = Object.create(EnemyManager.prototype);
  Object.assign(manager, {
    level,
    game: fakeGame(),
    phase: 'WAVES',
    state: 'WAVE_ACTIVE',
    isBossLevel: true,
    currentWaveIndex,
    normalWavesTotal,
    bossWaveIndex: normalWavesTotal,
    waves: Array.from({ length: normalWavesTotal }, (_, index) => ({
      type: `test_enemy_${index + 1}`,
      count: 1,
      formation: 'ARC',
      tactic: 'strafe_sweep'
    })),
    bossSpawnedThisLevel: false,
    bossDefeatedThisLevel: false,
    bossIntervalExtraWaves: 0,
    levelStartTime: Date.now() - elapsedMs,
    bossGateTimer: 0,
    bossGateTauntShown: false,
    bossGateTauntDelayMs: 0,
    bossGateTauntDelayResolved: false,
    enemies: [],
    hijacker: null,
    hijackerSpawnedThisLevel: false,
    hijackerSpawnAttemptedThisLevel: false,
    currentModifier: null
  });
  return manager;
}

const { EnemyManager } = await import('../src/managers/EnemyManager.js');
const probe = Object.create(EnemyManager.prototype);
const diff = BalanceConfig.difficulty;
const levels = Array.from({ length: 40 }, (_, index) => index + 1);
const errors = [];

const wavePlan = levels.map((level) => {
  const waves = EnemyManager.prototype.generateWaves.call(probe, level);
  return {
    level,
    waveCount: waves.length,
    enemyCount: waves.reduce((total, wave) => total + (Number(wave.count) || 0), 0),
    formations: [...new Set(waves.map((wave) => wave.formation).filter(Boolean))],
    tactics: [...new Set(waves.map((wave) => typeof wave.tactic === 'string' ? wave.tactic : wave.tactic?.id).filter(Boolean))]
  };
});

const firstTen = wavePlan.slice(0, 10);
assert(diff.MIN_WAVES_BETWEEN_BOSSES === HISTORICAL_INTENDED.minWavesBeforeBoss,
  `MIN_WAVES_BETWEEN_BOSSES should be ${HISTORICAL_INTENDED.minWavesBeforeBoss}, got ${diff.MIN_WAVES_BETWEEN_BOSSES}.`,
  errors);
assert(diff.wavesPerBossBase === HISTORICAL_INTENDED.minWavesBeforeBoss,
  `wavesPerBossBase should be ${HISTORICAL_INTENDED.minWavesBeforeBoss}, got ${diff.wavesPerBossBase}.`,
  errors);
assert(diff.wavesPerBossMax >= HISTORICAL_INTENDED.minWavesBeforeBoss && diff.wavesPerBossMax <= HISTORICAL_INTENDED.maxPlannedWavesBeforeBoss,
  `wavesPerBossMax should stay within the arcade tuning range ${HISTORICAL_INTENDED.minWavesBeforeBoss}-${HISTORICAL_INTENDED.maxPlannedWavesBeforeBoss}, got ${diff.wavesPerBossMax}.`,
  errors);
assert(firstTen.every((entry) => entry.waveCount >= 6 && entry.waveCount <= HISTORICAL_INTENDED.maxPlannedWavesBeforeBoss),
  `Levels 1-10 should generate at least six normal waves without runaway sector length, got ${firstTen.map((entry) => `${entry.level}:${entry.waveCount}`).join(', ')}.`,
  errors);
assert(!wavePlan.some((entry) => entry.waveCount <= 1),
  `Normal generation must never create a 1-wave boss gate: ${wavePlan.filter((entry) => entry.waveCount <= 1).map((entry) => entry.level).join(', ')}`,
  errors);
assert(Array.isArray(diff.earlyWaveEnemyCounts?.[1]) && diff.earlyWaveEnemyCounts[1].length >= 6,
  'Level 1 curated early counts must include at least six normal waves.',
  errors);

const afterFirstWave = makeManager(EnemyManager, {
  currentWaveIndex: 0,
  normalWavesTotal: HISTORICAL_INTENDED.minWavesBeforeBoss,
  elapsedMs: 5000
});
EnemyManager.prototype.onWaveCleared.call(afterFirstWave);
assert(afterFirstWave.state !== 'BOSS_GATE', 'Clearing wave 1 must not enter BOSS_GATE.', errors);
assert(afterFirstWave.state === 'WAVE_BRIEFING', `Clearing wave 1 should brief the next wave, got ${afterFirstWave.state}.`, errors);
assert(afterFirstWave.currentWaveIndex === 1, `Clearing wave 1 should advance to wave index 1, got ${afterFirstWave.currentWaveIndex}.`, errors);

const afterSixWaves = makeManager(EnemyManager, {
  currentWaveIndex: HISTORICAL_INTENDED.minWavesBeforeBoss - 1,
  normalWavesTotal: HISTORICAL_INTENDED.minWavesBeforeBoss,
  elapsedMs: 20000
});
EnemyManager.prototype.onWaveCleared.call(afterSixWaves);
assert(afterSixWaves.state === 'BOSS_GATE', `After six real waves, boss gate should open without a hard seconds rule, got ${afterSixWaves.state}.`, errors);

const estimatedSeconds = Number((
  HISTORICAL_INTENDED.minWavesBeforeBoss * (diff.estimatedWaveSeconds ?? 11.5) +
  Math.max(0, HISTORICAL_INTENDED.minWavesBeforeBoss - 1) * ((diff.waveDelayMs ?? 0) / 1000) +
  ((diff.bossGateMs ?? 0) / 1000)
).toFixed(1));
assert(estimatedSeconds >= 45 && estimatedSeconds <= 180,
  `Six-wave sector setup should remain tunable for arcade pacing without collapsing or stalling, got ${estimatedSeconds}s.`,
  errors);

const configSource = readFileSync(path.resolve('src/config/BalanceConfig.js'), 'utf8');
assert(!/(MIN_WAVES_BETWEEN_BOSSES|wavesPerBossBase|waveCountBase)\s*:\s*1\b/.test(configSource),
  'Normal balance config must not define a one-wave boss route.',
  errors);

const playSceneSource = readFileSync(path.resolve('src/scenes/PlayScene.js'), 'utf8');
assert(/if \(debugToken === 'NOVA_DEBUG_2026'\) \{[\s\S]*this\.debugStartAtBoss = startAtBoss;/.test(playSceneSource),
  'startAtBoss must stay behind the explicit debugBossToken gate.',
  errors);
assert(/if \(startAtBoss\) \{\s*this\.enemyManager\.forceBossStart\(this\.game\.level\);/.test(playSceneSource),
  'The only direct boss-start route should call forceBossStart from the explicit debug startAtBoss branch.',
  errors);

const report = {
  ok: errors.length === 0,
  generatedAt: new Date().toISOString(),
  intended: HISTORICAL_INTENDED,
  tuning: {
    MIN_WAVES_BETWEEN_BOSSES: diff.MIN_WAVES_BETWEEN_BOSSES,
    MIN_SECONDS_BETWEEN_BOSSES: diff.MIN_SECONDS_BETWEEN_BOSSES,
    bossIntervalCatchupWaveMax: diff.bossIntervalCatchupWaveMax,
    wavesPerBossBase: diff.wavesPerBossBase,
    wavesPerBossPerLevel: diff.wavesPerBossPerLevel,
    wavesPerBossMax: diff.wavesPerBossMax,
    bossGateMs: diff.bossGateMs
  },
  transitions: {
    afterFirstWave: {
      state: afterFirstWave.state,
      currentWaveIndex: afterFirstWave.currentWaveIndex,
      normalWavesTotal: afterFirstWave.normalWavesTotal
    },
    afterSixWaves: {
      state: afterSixWaves.state,
      currentWaveIndex: afterSixWaves.currentWaveIndex,
      normalWavesTotal: afterSixWaves.normalWavesTotal,
      estimatedSeconds
    }
  },
  wavePlan,
  errors
};

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/wave-pacing-${timestamp()}`);
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error(`[wave-pacing] FAIL ${errors.join('; ')}`);
  process.exit(1);
}

console.log(
  `[wave-pacing] PASS restored=${HISTORICAL_INTENDED.minWavesBeforeBoss}waves estimate=${estimatedSeconds}s ` +
  `level1=${wavePlan[0].waveCount} noOneWave=true report=${path.join(outputDir, 'report.json')}`
);
