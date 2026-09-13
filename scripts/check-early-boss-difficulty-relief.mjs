import assert from 'node:assert/strict';
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

const { BalanceConfig } = await import('../src/config/BalanceConfig.js');
const { Boss } = await import('../src/entities/Boss.js');
const { STEAM_LEADERBOARD_NAME } = await import('../src/leaderboard/LeaderboardTypes.js');

const EXPECTED_EARLY_MAX_LEVEL = 11;
const EXPECTED_EARLY_SCALAR = 0.9;
const EXPECTED_POST_FIRST_SCALAR = 0.8;
const EXPECTED_NORMAL_WAVE_OFFSET = 9;
const EXPECTED_MIN_WAVES = 5;
const EXPECTED_LEADERBOARD = 'nova_swarm_global_score_v2';
const EXPECTED_BOSS2_RELIEF = Object.freeze({
  pressureScalarMult: 0.82,
  openingAttackDelayMs: 2200,
  regularAttackIntervalMult: 1.25,
  regularTelegraphMult: 1.22,
  signatureTelegraphMult: 1.18,
  ringSafeWedgeBonus: 0.16,
  burstShotsPhase2: 3,
  burstShotsPhase3: 4
});

function approx(actual, expected, tolerance = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function expectedBoss(level, { includeEarlyRelief = true } = {}) {
  const diff = BalanceConfig.difficulty;
  const boss2Relief = level === 2 ? EXPECTED_BOSS2_RELIEF : null;
  const rawHealth = Math.round(diff.bossBaseHealth + Math.max(0, level - 1) * diff.bossHealthPerLevel);
  const unscaledHealth = Math.max(rawHealth, diff.bossMinHealth || 70);
  const postFirstScalar = level >= Math.max(2, Math.round(Number(diff.bossPostFirstDifficultyStartsAt) || 2))
    ? Number(diff.bossPostFirstDifficultyScalar)
    : 1;
  const earlyScalar = includeEarlyRelief && level <= EXPECTED_EARLY_MAX_LEVEL ? EXPECTED_EARLY_SCALAR : 1;
  const firstBossScalar = level <= 1 ? 0.86 : 1;
  const basePressure = level <= 1 ? 0.58 : level === 2 ? 0.88 : level <= 4 ? 0.92 : level <= 6 ? 0.96 : 1;
  const phase1OpeningDelay = level <= 1 ? 1.55 : level === 2 ? 1.2 : 1;
  const regularBase = level <= 1 ? 3800 : level === 2 ? 2580 : 2920;
  const regularPhaseScalar = level <= 1 ? 1 : 0.9;
  const combinedScalar = earlyScalar * postFirstScalar;
  const reliefPressureScalar = boss2Relief?.pressureScalarMult ?? 1;
  const reliefIntervalMult = boss2Relief?.regularAttackIntervalMult ?? 1;
  return {
    unscaledHealth,
    postFirstScalar,
    earlyScalar,
    combinedScalar,
    maxHealth: Math.max(1, Math.round(unscaledHealth * combinedScalar * firstBossScalar)),
    pressure: basePressure * combinedScalar * reliefPressureScalar,
    phase1Delay: (diff.bossShootDelayBase * phase1OpeningDelay) / combinedScalar,
    regularInterval: Math.round(((regularBase * regularPhaseScalar) / combinedScalar) * reliefIntervalMult),
    openingAttackDelayMs: boss2Relief?.openingAttackDelayMs ?? (level <= 1 ? 1800 : 1400),
    regularTelegraphMs: Math.round((diff.bossFairness.regularTelegraphEarlyMs ?? 960) * (boss2Relief?.regularTelegraphMult ?? 1)),
    signatureRingTelegraphMs: Math.round((diff.bossFairness.signatureRingTelegraphEarlyMs ?? 1220) * (boss2Relief?.signatureTelegraphMult ?? 1)),
    ringSafeWedge: (diff.bossFairness.ringSafeWedgeEarly ?? 0.58) + (boss2Relief?.ringSafeWedgeBonus ?? 0)
  };
}

const diff = BalanceConfig.difficulty;
assert.equal(diff.bossEarlyDifficultyMaxLevel, EXPECTED_EARLY_MAX_LEVEL, 'early boss relief should cover levels 1-11');
assert.equal(diff.bossEarlyDifficultyScalar, EXPECTED_EARLY_SCALAR, 'early boss relief should be a 10% scalar');
assert.equal(diff.bossPostFirstDifficultyScalar, EXPECTED_POST_FIRST_SCALAR, 'post-first boss scalar should stay at the accepted value');
assert.deepEqual(
  diff.bossFairness.profileRelief.nova_boss_02,
  { maxLevel: 2, ...EXPECTED_BOSS2_RELIEF },
  'boss 2 profile relief should stay scoped and explicit'
);

for (const level of [1, 2, 5, 10, 11]) {
  const boss = new Boss(0, 0, level, null);
  const expected = expectedBoss(level);
  const previous = expectedBoss(level, { includeEarlyRelief: false });
  assert.equal(boss.maxHealth, expected.maxHealth, `level ${level} health should include early relief`);
  approx(boss.getEarlyBossDifficultyScalar(), EXPECTED_EARLY_SCALAR);
  approx(boss.getPostFirstBossDifficultyScalar(), expected.postFirstScalar);
  approx(boss.getCombinedBossDifficultyScalar(), expected.combinedScalar);
  approx(boss.getBossPressureScalar(), expected.pressure);
  approx(boss.getPhaseShootDelay(1), expected.phase1Delay);
  assert.equal(boss.getRegularAttackIntervalMs(), expected.regularInterval);
  assert.equal(boss.getOpeningAttackDelayMs(), expected.openingAttackDelayMs, `level ${level} opening delay should match expected relief`);
  assert.ok(boss.maxHealth <= previous.maxHealth, `level ${level} health should not exceed previous early boss health`);
  assert.ok(boss.getBossPressureScalar() <= previous.pressure, `level ${level} pressure should not exceed previous early boss pressure`);
  assert.ok(boss.getPhaseShootDelay(1) > previous.phase1Delay, `level ${level} shooting cadence should be slower than previous early boss cadence`);
}

for (const level of [12, 20, 30]) {
  const boss = new Boss(0, 0, level, null);
  const expected = expectedBoss(level, { includeEarlyRelief: false });
  assert.equal(boss.maxHealth, expected.maxHealth, `level ${level} health should stay on the old post-first curve`);
  approx(boss.getEarlyBossDifficultyScalar(), 1);
  approx(boss.getPostFirstBossDifficultyScalar(), EXPECTED_POST_FIRST_SCALAR);
  approx(boss.getCombinedBossDifficultyScalar(), EXPECTED_POST_FIRST_SCALAR);
  approx(boss.getBossPressureScalar(), expected.pressure);
  approx(boss.getPhaseShootDelay(1), expected.phase1Delay);
  assert.equal(boss.getRegularAttackIntervalMs(), expected.regularInterval);
}

assert.equal(diff.normalWaveDifficultyLevelOffset, EXPECTED_NORMAL_WAVE_OFFSET, 'accepted normal-wave difficulty offset should be preserved');
assert.equal(diff.MIN_WAVES_BETWEEN_BOSSES, EXPECTED_MIN_WAVES, 'accepted five-wave pacing should be preserved');
assert.equal(diff.wavesPerBossBase, EXPECTED_MIN_WAVES, 'accepted base wave count should be preserved');
assert.equal(STEAM_LEADERBOARD_NAME, EXPECTED_LEADERBOARD, 'leaderboard identity should remain unchanged');

console.log('[early-boss-difficulty-relief] PASS', {
  maxLevel: diff.bossEarlyDifficultyMaxLevel,
  scalar: diff.bossEarlyDifficultyScalar,
  level11: expectedBoss(11),
  level12: expectedBoss(12, { includeEarlyRelief: false }),
  normalWaveDifficultyLevelOffset: diff.normalWaveDifficultyLevelOffset,
  wavesPerBossBase: diff.wavesPerBossBase,
  leaderboard: STEAM_LEADERBOARD_NAME
});
