import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const OLD_SOURCE_COMMIT = '8b0d5609c41b686979446a8e88d902f5ca89afa5';
const CURRENT_SOURCE_COMMIT = 'f6d372a11b084550753047436432a1929591adc6';
const OLD_BUILD_ID = '23809188';
const CURRENT_BUILD_ID = '23854561';
const EXPECTED_LEADERBOARD = 'nova_swarm_global_score_v2';

const OLD_WORKTREE = path.resolve(process.env.OLD_WORKTREE || 'D:/vibe-coding-e/nova-swarm-delta-old-23809188-20260622');
const CURRENT_WORKTREE = path.resolve(process.env.CURRENT_WORKTREE || 'D:/vibe-coding-e/nova-swarm-delta-current-f6d372a-20260622');
const IMPLEMENTED_WORKTREE = path.resolve(process.env.IMPLEMENTED_WORKTREE || repoRoot);
const IMPLEMENTED_SOURCE_COMMIT = String(process.env.IMPLEMENTED_SOURCE_COMMIT || '').trim();
const IMPLEMENTED_BUILD_ID = String(process.env.IMPLEMENTED_BUILD_ID || '').trim() || 'working-tree';
const IMPLEMENTED_ALLOW_DIRTY = process.env.IMPLEMENTED_ALLOW_DIRTY === '1' ||
  (!process.env.IMPLEMENTED_WORKTREE && !process.env.IMPLEMENTED_SOURCE_COMMIT);
const OUTPUT_DIR = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/mayhem-difficulty-score-delta-${timestamp()}`);

const SEED_COUNT = Number(process.env.MAYHEM_DELTA_SEEDS || 100);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, index) => 2026062200 + index * 7919);
const TARGET_SECTORS = [5, 10, 15, 20, 25, 30];
const MAX_SECTOR = 35;
const RUN_CLEAR_SECTOR = 10;
const SCORE_CALIBRATION_SCALE = 0.25;
const SCORE_THRESHOLDS = [250000, 390000];

const SCORE = Object.freeze({
  waveClearBase: 500,
  noHitWaveBonus: 400,
  sectorClearBonus: 1000,
  noHitSectorBonus: 1500,
  bossDefeat: 1000,
  runClear: 10000,
  spareLife: 2500,
  grazeBreakBase: 520,
  grazeBreakPerBullet: 85,
  pickupScoreAverage: 140
});

function finiteNumberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const VARIANT_DEFINITIONS = [
  {
    id: 'A_current_baseline',
    label: 'A. Current baseline',
    summary: 'Current accepted Mayhem tuning',
    removeFinalMayhemAggression: false,
    normalWaveDifficultyLevelOffset: null,
    normalWaveScoreXpComp: 1
  },
  {
    id: 'B_no_final_5pct_aggression',
    label: 'B. Remove +5% Mayhem wave aggression',
    summary: 'Current minus final +5% Mayhem normal-wave pressure multipliers',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: null,
    normalWaveScoreXpComp: 1
  },
  {
    id: 'C_no_aggression_comp120',
    label: 'C. B + 1.20 normal-wave score/XP compensation',
    summary: 'Remove +5% aggression and compensate normal-wave score/XP opportunity by 6/5',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: null,
    normalWaveScoreXpComp: 1.2
  },
  {
    id: 'D_no_aggression_offset8',
    label: 'D. B + normalWaveDifficultyLevelOffset 8',
    summary: 'Remove +5% aggression and reduce effective normal-wave offset from 9 to 8',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: 8,
    normalWaveScoreXpComp: 1
  },
  {
    id: 'E_no_aggression_offset7',
    label: 'E. B + normalWaveDifficultyLevelOffset 7',
    summary: 'Remove +5% aggression and reduce effective normal-wave offset from 9 to 7',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: 7,
    normalWaveScoreXpComp: 1
  },
  {
    id: 'F_no_aggression_offset7_comp120',
    label: 'F. B + offset 7 + 1.20 compensation',
    summary: 'Remove +5% aggression, reduce offset to 7, and compensate normal-wave score/XP by 1.20',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: 7,
    normalWaveScoreXpComp: 1.2
  },
  {
    id: 'G_no_aggression_offset6_comp120',
    label: 'G. B + offset 6 + 1.20 compensation',
    summary: 'Remove +5% aggression, reduce offset to 6, and compensate normal-wave score/XP by 1.20',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: 6,
    normalWaveScoreXpComp: 1.2
  },
  {
    id: 'H1_no_aggression_offset7_comp115',
    label: 'H1. Offset 7 + 1.15 compensation',
    summary: 'Sensitivity pass around F with lower compensation',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: 7,
    normalWaveScoreXpComp: 1.15
  },
  {
    id: 'H2_no_aggression_offset7_comp125',
    label: 'H2. Offset 7 + 1.25 compensation',
    summary: 'Sensitivity pass around F with higher compensation',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: 7,
    normalWaveScoreXpComp: 1.25
  },
  {
    id: 'H3_no_aggression_offset6_comp115',
    label: 'H3. Offset 6 + 1.15 compensation',
    summary: 'Sensitivity pass around G with lower compensation',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: 6,
    normalWaveScoreXpComp: 1.15
  },
  {
    id: 'H4_no_aggression_offset6_comp125',
    label: 'H4. Offset 6 + 1.25 compensation',
    summary: 'Sensitivity pass around G with higher compensation',
    removeFinalMayhemAggression: true,
    normalWaveDifficultyLevelOffset: 6,
    normalWaveScoreXpComp: 1.25
  }
];

const LEGACY_SCORE_VALUES = {
  chaser: 15,
  bruiser: 25,
  turret: 40,
  striker: 60,
  trickster: 80,
  juggernaut: 120,
  bonus_challenge: 500,
  fighter_0: 30,
  fighter_1: 30,
  fighter_2: 35,
  fighter_3: 45,
  fighter_4: 40,
  fighter_5: 90,
  fighter_6: 35,
  fighter_7: 40,
  fighter_8: 50
};

const LEGACY_HEALTH_VALUES = {
  chaser: 2,
  bruiser: 3,
  turret: 4,
  striker: 5,
  trickster: 6,
  juggernaut: 10,
  bonus_challenge: 5,
  fighter_0: 3,
  fighter_1: 3,
  fighter_2: 4,
  fighter_3: 5,
  fighter_4: 4,
  fighter_5: 8,
  fighter_6: 3,
  fighter_7: 4,
  fighter_8: 5
};

const SKILL_PROFILES = [
  {
    id: 'novice_survival',
    label: 'Low skill / novice survival',
    hitEfficiency: 0.34,
    waveResilience: 900,
    waveRiskMult: 0.46,
    bossResilience: 58,
    bossRiskMult: 0.48,
    aggression: 0.46,
    comboRetention: 0.2,
    grazeAggression: 0.12,
    pickupBias: 0.45,
    respawnRecovery: 0.72
  },
  {
    id: 'medium_skill',
    label: 'Medium skill',
    hitEfficiency: 0.5,
    waveResilience: 1500,
    waveRiskMult: 0.26,
    bossResilience: 86,
    bossRiskMult: 0.32,
    aggression: 0.68,
    comboRetention: 0.48,
    grazeAggression: 0.32,
    pickupBias: 0.7,
    respawnRecovery: 0.88
  },
  {
    id: 'high_skill_aggressive',
    label: 'High skill / aggressive scorer',
    hitEfficiency: 0.72,
    waveResilience: 2550,
    waveRiskMult: 0.145,
    bossResilience: 128,
    bossRiskMult: 0.2,
    aggression: 0.92,
    comboRetention: 0.86,
    grazeAggression: 0.74,
    pickupBias: 0.9,
    respawnRecovery: 1.05
  }
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function round(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(digits));
}

function floor(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function poisson(rng, lambda) {
  const safeLambda = clamp(Number(lambda) || 0, 0, 7);
  if (safeLambda <= 0) return 0;
  const limit = Math.exp(-safeLambda);
  let count = 0;
  let product = 1;
  do {
    count += 1;
    product *= rng();
  } while (product > limit && count < 12);
  return count - 1;
}

function percentile(values, pct) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = clamp(Math.ceil((pct / 100) * sorted.length) - 1, 0, sorted.length - 1);
  return sorted[index];
}

function average(values) {
  const filtered = values.filter(Number.isFinite);
  return filtered.reduce((sum, value) => sum + value, 0) / Math.max(1, filtered.length);
}

function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function validateWorktree(label, worktree, expectedCommit, { allowDirty = false } = {}) {
  if (!existsSync(worktree)) {
    throw new Error(`${label} worktree missing: ${worktree}`);
  }
  const actual = git(['rev-parse', 'HEAD'], worktree);
  assert.equal(actual, expectedCommit, `${label} worktree HEAD mismatch`);
  const status = git(['status', '--short'], worktree);
  if (!allowDirty) {
    assert.equal(status, '', `${label} worktree is dirty: ${status}`);
  }
  return actual;
}

function readSource(worktree, relativePath) {
  return readFileSync(path.join(worktree, relativePath), 'utf8');
}

async function importSource(worktree, relativePath) {
  const filePath = path.join(worktree, relativePath);
  return import(`${pathToFileURL(filePath).href}?analysis=${Date.now()}-${hashString(filePath)}`);
}

function leaderboardNameFromSource(worktree) {
  const text = readSource(worktree, 'src/leaderboard/LeaderboardTypes.js');
  const match = text.match(/STEAM_LEADERBOARD_NAME\s*=\s*['"]([^'"]+)['"]/);
  return match?.[1] || null;
}

async function loadBuild({ id, label, buildId, commit, worktree, allowDirty = false }) {
  validateWorktree(label, worktree, commit, { allowDirty });
  const balanceModule = await importSource(worktree, 'src/config/BalanceConfig.js');
  const generatedModule = await importSource(worktree, 'src/config/GeneratedEnemyProfiles.js');
  const shipModule = await importSource(worktree, 'src/config/ShipMetadata.js');
  const pacingModule = await importSource(worktree, 'src/config/RunPacingConfig.js');
  let runModeModule = null;
  try {
    runModeModule = await importSource(worktree, 'src/game/RunMode.js');
  } catch {
    runModeModule = null;
  }
  const runModeProfile = runModeModule?.getRunModeProfile?.('ranked') || {
    id: 'ranked',
    difficultyProfileId: 'pre_mayhem_public_ranked',
    normalWaveDifficultyLevelOffsetDelta: 0,
    bossDifficultyMult: 1,
    bossAttackDangerMult: 1,
    normalWaveAggressionMult: 1,
    pressureMultipliers: {
      fireChanceMult: 1,
      projectileSpeedMult: 1,
      enemySpeedMult: 1,
      eliteChanceMult: 1,
      specialThreatMult: 1,
      sustainMult: 1,
      scoreMult: 1,
      contentRarityMult: 1
    }
  };
  const playSceneText = readSource(worktree, 'src/scenes/PlayScene.js');
  const bossText = readSource(worktree, 'src/entities/Boss.js');
  return {
    id,
    label,
    buildId,
    commit,
    worktree,
    BalanceConfig: balanceModule.BalanceConfig,
    MAX_PLAYER_LIVES: finiteNumberOr(balanceModule.MAX_PLAYER_LIVES, 6),
    getNormalWavePressureTuning: balanceModule.getNormalWavePressureTuning,
    getNormalWaveDangerMoment: balanceModule.getNormalWaveDangerMoment,
    getGeneratedEnemyTypeAtLevelProgress: generatedModule.getGeneratedEnemyTypeAtLevelProgress,
    getGeneratedEnemyProfile: generatedModule.getGeneratedEnemyProfile,
    getDefaultShipKey: shipModule.getDefaultShipKey,
    getShipMetadata: shipModule.getShipMetadata,
    RunPacingConfig: pacingModule.RunPacingConfig,
    runModeProfile,
    leaderboardName: leaderboardNameFromSource(worktree),
    hasBossWipeoutGuard: playSceneText.includes('bossWipeoutGuard'),
    hasBossHazardRespawnCleanup: playSceneText.includes('clearRespawnHazards') && playSceneText.includes('boss_hazard'),
    hasBossAttackPauseAfterRespawn: bossText.includes('pauseAttackCadenceAfterRespawn') || playSceneText.includes('pauseBossAttackCadence')
  };
}

function cloneCurrentBuildVariant(baseBuild, definition) {
  const pressure = {
    fireChanceMult: Number(baseBuild.runModeProfile?.pressureMultipliers?.fireChanceMult) || 1,
    projectileSpeedMult: Number(baseBuild.runModeProfile?.pressureMultipliers?.projectileSpeedMult) || 1,
    enemySpeedMult: Number(baseBuild.runModeProfile?.pressureMultipliers?.enemySpeedMult) || 1,
    eliteChanceMult: Number(baseBuild.runModeProfile?.pressureMultipliers?.eliteChanceMult) || 1,
    specialThreatMult: Number(baseBuild.runModeProfile?.pressureMultipliers?.specialThreatMult) || 1,
    sustainMult: Number(baseBuild.runModeProfile?.pressureMultipliers?.sustainMult) || 1,
    scoreMult: Number(baseBuild.runModeProfile?.pressureMultipliers?.scoreMult) || 1,
    contentRarityMult: Number(baseBuild.runModeProfile?.pressureMultipliers?.contentRarityMult) || 1
  };
  if (definition.removeFinalMayhemAggression) {
    pressure.fireChanceMult = 1;
    pressure.projectileSpeedMult = 1;
    pressure.enemySpeedMult = 1;
    pressure.eliteChanceMult = 1;
    pressure.specialThreatMult = 1;
  }
  const difficulty = {
    ...(baseBuild.BalanceConfig.difficulty || {})
  };
  if (
    definition.normalWaveDifficultyLevelOffset !== null &&
    definition.normalWaveDifficultyLevelOffset !== undefined &&
    Number.isFinite(Number(definition.normalWaveDifficultyLevelOffset))
  ) {
    difficulty.normalWaveDifficultyLevelOffset = Math.max(0, Math.floor(Number(definition.normalWaveDifficultyLevelOffset)));
  }
  return {
    ...baseBuild,
    id: definition.id,
    label: definition.label,
    variant: { ...definition },
    BalanceConfig: {
      ...baseBuild.BalanceConfig,
      difficulty
    },
    runModeProfile: {
      ...(baseBuild.runModeProfile || {}),
      normalWaveAggressionMult: definition.removeFinalMayhemAggression
        ? 1
        : (Number(baseBuild.runModeProfile?.normalWaveAggressionMult) || 1),
      pressureMultipliers: pressure
    }
  };
}

function normalWaveScoreMultiplier(build) {
  if (
    build.variant?.normalWaveScoreXpComp !== null &&
    build.variant?.normalWaveScoreXpComp !== undefined &&
    Number.isFinite(Number(build.variant.normalWaveScoreXpComp))
  ) {
    return Math.max(0.1, Number(build.variant.normalWaveScoreXpComp));
  }
  return Math.max(0.1, Number(build.runModeProfile?.normalWaveScoreXpMult) || 1);
}

function normalWaveXpMultiplier(build) {
  return normalWaveScoreMultiplier(build);
}

function normalWaveDifficultyLevel(build, sector) {
  const diff = build.BalanceConfig.difficulty || {};
  const baseOffset = Math.max(0, floor(diff.normalWaveDifficultyLevelOffset, 0));
  const profileOffset = floor(build.runModeProfile?.normalWaveDifficultyLevelOffsetDelta, 0);
  return Math.max(1, floor(sector, 1) + baseOffset + profileOffset);
}

function normalWavePressureTuning(build, level) {
  if (typeof build.getNormalWavePressureTuning === 'function') {
    return build.getNormalWavePressureTuning(level);
  }
  const bands = build.BalanceConfig.difficulty?.normalWavePressureLadder?.bands || [];
  return bands.find((entry) =>
    level >= (Number(entry.minLevel) || 1) &&
    level <= (Number(entry.maxLevel) || Number.POSITIVE_INFINITY)
  ) || {};
}

function normalWaveCount(build, level) {
  const diff = build.BalanceConfig.difficulty || {};
  const tuning = normalWavePressureTuning(build, level);
  const base = diff.wavesPerBossBase ?? diff.waveCountBase ?? 4;
  const perLevel = diff.wavesPerBossPerLevel ?? 0;
  const max = diff.wavesPerBossMax ?? diff.waveCountMax ?? 6;
  const min = diff.MIN_WAVES_BETWEEN_BOSSES ?? diff.minWavesBetweenBosses ?? 1;
  const waveBonus = Math.max(0, Number(tuning.waveCountBonus) || 0);
  const planned = Math.round(base + Math.max(0, level - 1) * perLevel) + waveBonus;
  return Math.max(min, Math.min(max + waveBonus, planned));
}

function normalWaveDangerMoment(build, level, waveIndex, waveCount) {
  if (typeof build.getNormalWaveDangerMoment === 'function') {
    return build.getNormalWaveDangerMoment(level, waveIndex, waveCount);
  }
  const tuning = normalWavePressureTuning(build, level);
  const dangerWaveCount = Math.max(0, floor(tuning.dangerWaveCount, 0));
  if (dangerWaveCount <= 0 || waveCount < 3) return null;
  const maxThreatIndex = Math.max(1, waveCount - 2);
  const candidates = [
    Math.min(maxThreatIndex, Math.max(1, Math.round(waveCount * 0.55))),
    Math.min(maxThreatIndex, Math.max(2, Math.round(waveCount * 0.78))),
    Math.min(maxThreatIndex, Math.max(1, Math.round(waveCount * 0.35)))
  ];
  const indices = [...new Set(candidates)].slice(0, dangerWaveCount);
  const dangerSlot = indices.indexOf(waveIndex);
  if (dangerSlot < 0) return null;
  return {
    id: `${tuning.id || 'baseline'}_danger_${dangerSlot + 1}`,
    countBonus: Number(tuning.dangerWaveCountBonus) || 0,
    fireMult: Number(tuning.dangerWaveFireMult) || 1,
    fireDelayMult: Number(tuning.dangerWaveFireDelayMult) || 1,
    projectileSpeedMult: Number(tuning.dangerWaveProjectileSpeedMult) || 1,
    threatProjectileSpeedMult: Number(tuning.threatProjectileSpeedMult) || 1,
    threatDangerBudgetBonus: Number(tuning.dangerWaveThreatDangerBudgetBonus) || 0,
    threatMaxActiveBonus: Number(tuning.dangerWaveThreatMaxActiveBonus) || 0,
    threatPlannedActionBonus: Number(tuning.dangerWaveThreatPlannedActionBonus) || 0,
    eliteHealthScalar: Number(tuning.dangerWaveEliteHealthScalar) || 1
  };
}

function baseWaveEnemyCount(build, level, waveIndex, rng) {
  const diff = build.BalanceConfig.difficulty || {};
  const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
  if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) return earlyCounts[waveIndex];
  const tuning = normalWavePressureTuning(build, level);
  const varianceRange = Math.max(1, floor(diff.waveEnemyRandom, 1));
  const variance = Math.floor(rng() * varianceRange);
  const count = Math.round(
    (diff.waveEnemyBase ?? 7) +
    Math.max(0, level - 1) * (diff.waveEnemyPerLevel ?? 0.35) +
    Math.max(0, waveIndex) * (diff.waveEnemyPerWave ?? 0.45) +
    variance +
    (Number(tuning.waveEnemyCountBonus) || 0)
  );
  const max = (diff.waveEnemyMax ?? 14) + (Number(tuning.waveEnemyMaxBonus) || 0);
  return Math.max(4, Math.min(max, count));
}

function pressureMultipliers(build) {
  return {
    fireChanceMult: Number(build.runModeProfile?.pressureMultipliers?.fireChanceMult) || 1,
    projectileSpeedMult: Number(build.runModeProfile?.pressureMultipliers?.projectileSpeedMult) || 1,
    enemySpeedMult: Number(build.runModeProfile?.pressureMultipliers?.enemySpeedMult) || 1,
    eliteChanceMult: Number(build.runModeProfile?.pressureMultipliers?.eliteChanceMult) || 1,
    specialThreatMult: Number(build.runModeProfile?.pressureMultipliers?.specialThreatMult) || 1,
    scoreMult: Number(build.runModeProfile?.pressureMultipliers?.scoreMult) || 1
  };
}

function profileForType(build, type) {
  return build.getGeneratedEnemyProfile?.(type) || {
    type,
    scoreValue: LEGACY_SCORE_VALUES[type] || 10,
    health: LEGACY_HEALTH_VALUES[type] || 1,
    unlockLevel: 1
  };
}

function enemyScoreForType(build, type) {
  const profile = profileForType(build, type);
  return Number(profile.scoreValue) || LEGACY_SCORE_VALUES[type] || 10;
}

function enemyHpForType(build, type, level) {
  const diff = build.BalanceConfig.difficulty || {};
  const profile = profileForType(build, type);
  const hpScale = Math.min(
    diff.enemyHealthMaxMultiplier ?? Number.POSITIVE_INFINITY,
    (diff.baseEnemyHealthMultiplier ?? 1) + Math.max(0, level - 1) * (diff.hpScalePerLevel ?? 0)
  );
  return Math.ceil((Number(profile.health) || LEGACY_HEALTH_VALUES[type] || 1) * hpScale);
}

function waveMetric(build, sector, waveIndex, waveCount, rng) {
  const diff = build.BalanceConfig.difficulty || {};
  const level = normalWaveDifficultyLevel(build, sector);
  const tuning = normalWavePressureTuning(build, level);
  const moment = normalWaveDangerMoment(build, level, waveIndex, waveCount);
  const progress = Math.min(0.98, ((waveIndex + 1) / Math.max(1, waveCount)) * 0.72 + (level / 40) * 0.24);
  const type = build.getGeneratedEnemyTypeAtLevelProgress?.(level, progress) || `fighter_${(level + waveIndex) % 9}`;
  const baseCount = baseWaveEnemyCount(build, level, waveIndex, rng);
  const countBonus = Math.max(0, Number(moment?.countBonus) || 0);
  const max = (diff.waveEnemyMax ?? 14) +
    (Number(tuning.waveEnemyMaxBonus) || 0) +
    countBonus;
  const count = moment ? Math.max(baseCount, Math.min(max, baseCount + countBonus)) : baseCount;
  const scoreValue = enemyScoreForType(build, type);
  const hpValue = enemyHpForType(build, type, level);
  const mult = pressureMultipliers(build);
  const fireChanceBase = diff.enemyFireChance ?? 0.0042;
  const fireChance = Math.min(
    diff.enemyFireChanceMax ?? Number.POSITIVE_INFINITY,
    fireChanceBase + Math.max(0, level - 1) * (diff.enemyFireChancePerLevel ?? 0)
  ) *
    (Number(tuning.fireChanceMult) || 1) *
    (Number(tuning.tacticFireMult) || 1) /
    Math.max(0.01, Number(tuning.tacticFireDelayMult) || 1) *
    (Number(moment?.fireMult) || 1) /
    Math.max(0.01, Number(moment?.fireDelayMult) || 1) *
    mult.fireChanceMult;
  const projectileBase = diff.enemyProjectileSpeed ?? 1.65;
  const projectileSpeed = Math.min(
    diff.enemyProjectileSpeedMax ?? Number.POSITIVE_INFINITY,
    projectileBase + Math.max(0, level - 1) * (diff.enemyProjectileSpeedPerLevel ?? 0)
  ) *
    (Number(tuning.projectileSpeedMult) || 1) *
    (Number(moment?.projectileSpeedMult) || 1) *
    mult.projectileSpeedMult;
  const enemySpeedBase = diff.enemySpeedMultiplier ?? 0.78;
  const enemySpeed = Math.min(
    diff.enemySpeedMaxMultiplier ?? Number.POSITIVE_INFINITY,
    enemySpeedBase + Math.max(0, level - 1) * (diff.enemySpeedPerLevel ?? 0)
  ) *
    (Number(tuning.enemySpeedMult) || 1) *
    (Number(moment?.entrySpeedMult) || 1) *
    (Number(moment?.diveBiasMult) || 1) *
    mult.enemySpeedMult;
  const eliteThreat = (
    0.045 * (Number(tuning.multiEliteChanceMult) || 1) +
    Math.max(0, Number(tuning.eliteSecondSlotChance) || 0) * 0.035 +
    Math.max(0, Number(tuning.multiEliteTriChance) || 0) * 0.025 +
    (moment?.eliteMiddleShipId ? 0.14 * (Number(moment.eliteHealthScalar) || 1) : 0)
  ) * mult.eliteChanceMult;
  const specialThreat = (
    0.045 * (Number(tuning.challengeChanceMult) || 1) +
    (Number(tuning.challengeChanceBonus) || 0) +
    Math.max(0, Number(tuning.threatDangerBudgetBonus) || 0) * 0.018 +
    Math.max(0, Number(tuning.threatMaxActiveBonus) || 0) * 0.025 +
    Math.max(0, Number(tuning.threatPlannedActionBonus) || 0) * 0.012 +
    Math.max(0, Number(moment?.threatDangerBudgetBonus) || 0) * 0.018 +
    Math.max(0, Number(moment?.threatMaxActiveBonus) || 0) * 0.025 +
    Math.max(0, Number(moment?.threatPlannedActionBonus) || 0) * 0.012
  ) * (Number(moment?.threatProjectileSpeedMult) || 1) * mult.specialThreatMult;
  const eliteSpecial = 1 + eliteThreat + specialThreat;
  const hpBudget = count * hpValue;
  const pressureIndex = count *
    hpValue *
    (fireChance / Math.max(0.0001, fireChanceBase)) *
    (projectileSpeed / Math.max(0.0001, projectileBase)) *
    (enemySpeed / Math.max(0.0001, enemySpeedBase)) *
    eliteSpecial *
    (moment ? 1.06 : 1);
  const clearSeconds = hpBudget / Math.max(0.1, starterShipDps(build).rawDps * 0.42) +
    4.1 +
    (diff.waveDelayMs ?? 740) / 1000 +
    (moment ? 1.2 : 0);

  return {
    sector,
    effectiveNormalWaveDifficultyLevel: level,
    waveIndex,
    waveCount,
    type,
    count,
    scoreValue,
    hpValue,
    hpBudget,
    enemyScoreBudget: count * scoreValue,
    pressureIndex: round(pressureIndex, 3),
    fireChance: round(fireChance, 6),
    projectileSpeed: round(projectileSpeed, 3),
    enemySpeed: round(enemySpeed, 3),
    eliteThreat: round(eliteThreat, 6),
    specialThreat: round(specialThreat, 6),
    danger: Boolean(moment),
    dangerId: moment?.id || null,
    clearSeconds: round(clearSeconds, 2)
  };
}

function starterShipDps(build) {
  const key = build.getDefaultShipKey?.() || 'starter';
  const ship = build.getShipMetadata?.(key) || {};
  const bullets = Math.max(1, Number(ship?.weapon?.bullets) || 1);
  const damage = Math.max(0.1, Number(ship?.stats?.damage) || 1);
  const fireRateMs = Math.max(1, Number(ship?.stats?.fireRate) || 120);
  return {
    ship: ship?.name || key,
    rawDps: damage * bullets * (1000 / fireRateMs)
  };
}

function runModeBossDifficultyMult(build) {
  return clamp(Number(build.runModeProfile?.bossDifficultyMult) || 1, 0.1, 2);
}

function runModeBossAttackDangerMult(build) {
  return runModeBossDifficultyMult(build) *
    clamp(Number(build.runModeProfile?.bossAttackDangerMult) || 1, 0.1, 2);
}

function bossHp(build, sector) {
  const diff = build.BalanceConfig.difficulty || {};
  const rawHealth = Math.round((diff.bossBaseHealth ?? 40) + Math.max(0, sector - 1) * (diff.bossHealthPerLevel ?? 3.6));
  const healthBeforeEase = Math.max(rawHealth, diff.bossMinHealth || 70);
  const startsAt = Math.max(2, Math.round(Number(diff.bossPostFirstDifficultyStartsAt) || 2));
  const postFirstScalar = sector >= startsAt ? Math.max(0.1, Number(diff.bossPostFirstDifficultyScalar) || 1) : 1;
  const earlyMaxLevel = Math.max(1, Math.round(Number(diff.bossEarlyDifficultyMaxLevel) || 0));
  const earlyScalar = sector <= earlyMaxLevel ? Math.max(0.1, Number(diff.bossEarlyDifficultyScalar) || 1) : 1;
  const firstBossScalar = sector === 1 ? 0.86 : 1;
  return Math.max(1, Math.round(healthBeforeEase * postFirstScalar * earlyScalar * firstBossScalar * runModeBossDifficultyMult(build)));
}

function bossShootDelay(build, sector, phase) {
  const diff = build.BalanceConfig.difficulty || {};
  const baseDelay = phase === 1
    ? diff.bossShootDelayBase
    : phase === 2
      ? diff.bossShootDelayPhase2
      : diff.bossShootDelayPhase3;
  const fallbackDelay = phase === 1 ? 1300 : phase === 2 ? 1050 : 820;
  const openingDelayScalar = sector <= 1 ? 1.55 : sector === 2 ? 1.2 : 1;
  const startsAt = Math.max(2, Math.round(Number(diff.bossPostFirstDifficultyStartsAt) || 2));
  const postFirstScalar = sector >= startsAt ? Math.max(0.1, Number(diff.bossPostFirstDifficultyScalar) || 1) : 1;
  const earlyMaxLevel = Math.max(1, Math.round(Number(diff.bossEarlyDifficultyMaxLevel) || 0));
  const earlyScalar = sector <= earlyMaxLevel ? Math.max(0.1, Number(diff.bossEarlyDifficultyScalar) || 1) : 1;
  const fairness = diff.bossFairness || {};
  const tellScalar = sector <= (Number(fairness.openingTellMaxLevel) || 0)
    ? Math.max(1, Number(fairness.openingTellScalar) || 1)
    : 1;
  return ((baseDelay || fallbackDelay) * openingDelayScalar * tellScalar) /
    Math.max(0.1, postFirstScalar * earlyScalar * runModeBossAttackDangerMult(build));
}

function bossProjectileSpeed(build, sector, phase) {
  const diff = build.BalanceConfig.difficulty || {};
  const fairness = diff.bossFairness || {};
  const baseSpeed = phase === 1
    ? diff.bossProjectileSpeedPhase1
    : phase === 2
      ? diff.bossProjectileSpeedPhase2
      : diff.bossProjectileSpeedPhase3;
  const fallbackSpeed = phase === 1 ? 2.25 : phase === 2 ? 2.55 : 2.85;
  return Math.min(
    diff.bossProjectileSpeedMax ?? Number.POSITIVE_INFINITY,
    (baseSpeed || fallbackSpeed) + Math.max(0, sector - 1) * (diff.bossProjectileSpeedPerLevel ?? 0)
  ) * (Number(fairness.globalProjectileMultiplier) || 1) * runModeBossAttackDangerMult(build);
}

function bossMetric(build, sector) {
  const hp = bossHp(build, sector);
  const phase2Delay = bossShootDelay(build, sector, 2);
  const phase3Delay = bossShootDelay(build, sector, 3);
  const phase2Speed = bossProjectileSpeed(build, sector, 2);
  const phase3Speed = bossProjectileSpeed(build, sector, 3);
  const fairness = build.BalanceConfig.difficulty?.bossFairness || {};
  const hazardCleanupFactor = build.hasBossHazardRespawnCleanup ? 0.82 : 1;
  const guardFactor = build.hasBossWipeoutGuard ? 0.76 : 1;
  const pressure = (hp / 55) *
    (phase2Speed / 2.4) *
    (phase3Speed / 2.8) *
    (950 / Math.max(350, phase2Delay)) *
    (850 / Math.max(300, phase3Delay)) *
    (1 + Math.max(0, sector - 1) * 0.018) *
    (Number(fairness.globalProjectileMultiplier) || 1) *
    hazardCleanupFactor;
  return {
    sector,
    hp,
    phase2ShootDelayMs: round(phase2Delay, 1),
    phase3ShootDelayMs: round(phase3Delay, 1),
    phase2ProjectileSpeed: round(phase2Speed, 3),
    phase3ProjectileSpeed: round(phase3Speed, 3),
    pressureIndex: round(pressure, 3),
    guardFactor,
    hasBossWipeoutGuard: build.hasBossWipeoutGuard,
    hasBossHazardRespawnCleanup: build.hasBossHazardRespawnCleanup
  };
}

function comboKillScore(baseScore, comboCountBefore) {
  const multiplier = comboCountBefore >= 50 ? 4 : comboCountBefore >= 25 ? 3 : comboCountBefore >= 10 ? 2 : 1;
  return Math.round(baseScore * multiplier);
}

function comboMilestoneBonus(comboCountAfter) {
  if (comboCountAfter === 5) return 500;
  if (comboCountAfter === 10) return 1500;
  if (comboCountAfter === 15) return 3000;
  if (comboCountAfter === 20) return 5000;
  return 0;
}

function comboTickBonus(comboCountAfter) {
  if (comboCountAfter <= 0 || comboCountAfter % 10 !== 0) return 0;
  const multiplier = comboCountAfter >= 50 ? 4 : comboCountAfter >= 25 ? 3 : comboCountAfter >= 10 ? 2 : 1;
  return Math.round((100 * (comboCountAfter / 10)) * multiplier);
}

function addComboKillScore(run, baseScore, scoreMultiplier = 1) {
  const score = Math.round(comboKillScore(baseScore, run.comboCount) * scoreMultiplier);
  run.score += score;
  run.enemyScore += score;
  run.comboCount += 1;
  run.comboMax = Math.max(run.comboMax, run.comboCount);
  const milestone = Math.round(comboMilestoneBonus(run.comboCount) * scoreMultiplier);
  const tick = Math.round(comboTickBonus(run.comboCount) * scoreMultiplier);
  run.score += milestone + tick;
  run.comboBonus += milestone + tick;
}

function resetCombo(run) {
  run.comboCount = 0;
}

function calculatePilotXp(build, summary) {
  const xp = build.RunPacingConfig?.pilotXp || {
    scoreDivisor: 600,
    sectorReachedBase: 55,
    waveClear: 6,
    bossDefeat: 60,
    codexDiscovery: 14,
    runThemeDiscovery: 35,
    noHitWave: 45,
    noHitSector: 160,
    runClear: 900,
    clearWithLivesRemaining: 250
  };
  const scoreXp = Math.floor((Number(summary.score) || 0) / Math.max(1, xp.scoreDivisor));
  const sectorXp = Math.max(0, floor(summary.sectorReached, 1) - 1) * xp.sectorReachedBase;
  const waveXp = floor(summary.wavesCleared) * xp.waveClear * normalWaveXpMultiplier(build);
  const bossXp = floor(summary.bossesKilled) * xp.bossDefeat;
  const discoveryXp = floor(summary.codexDiscoveries) * xp.codexDiscovery;
  const themeXp = floor(summary.runThemeDiscoveries) * xp.runThemeDiscovery;
  const noHitWaveXp = floor(summary.noHitWaves) * xp.noHitWave * normalWaveXpMultiplier(build);
  const noHitSectorXp = floor(summary.noHitSectors) * xp.noHitSector;
  const clearXp = summary.runCleared ? xp.runClear : 0;
  const livesXp = summary.runCleared ? floor(summary.clearLivesRemaining ?? summary.livesRemaining) * xp.clearWithLivesRemaining : 0;
  return Math.max(0, Math.floor(scoreXp + sectorXp + waveXp + bossXp + discoveryXp + themeXp + noHitWaveXp + noHitSectorXp + clearXp + livesXp));
}

function recordSectorMilestone(run, build, sector) {
  if (!TARGET_SECTORS.includes(sector)) return;
  const calibratedScore = Math.round(run.score * SCORE_CALIBRATION_SCALE);
  run.scoreAtSectors[String(sector)] = calibratedScore;
  run.xpAtSectors[String(sector)] = calculatePilotXp(build, {
    score: calibratedScore,
    sectorReached: sector,
    wavesCleared: run.wavesCleared,
    bossesKilled: run.bossesDefeated,
    codexDiscoveries: run.codexDiscoveries,
    runThemeDiscoveries: run.runThemeDiscoveries,
    noHitWaves: run.noHitWaves,
    noHitSectors: run.noHitSectors,
    runCleared: sector >= RUN_CLEAR_SECTOR,
    clearLivesRemaining: run.lives
  });
}

function markDeaths(run, count, source, nowSeconds, { boss = null, chainWindow = true } = {}) {
  const safeCount = Math.max(0, floor(count, 0));
  for (let i = 0; i < safeCount && run.lives > 0; i += 1) {
    run.deaths += 1;
    run.lives -= 1;
    run.deathTimeline.push({
      t: round(nowSeconds + i * (chainWindow ? 4.4 : 11.5), 1),
      source,
      bossSector: boss?.sector || null,
      bossPressureIndex: boss?.pressureIndex || null
    });
    run.damageSources[source] = (run.damageSources[source] || 0) + 1;
    if (source === 'normal_wave') run.normalWaveDeaths += 1;
    if (source === 'boss') run.bossDeaths += 1;
  }
  if (safeCount > 0) resetCombo(run);
}

function simulateRun(build, skill, seed) {
  const rng = mulberry32(seed ^ hashString(skill.id));
  const run = {
    seed,
    build: build.id,
    buildLabel: build.label,
    buildCommit: build.commit,
    skillProfile: skill.id,
    finalSectorReached: 1,
    wavesCleared: 0,
    bossesEncountered: 0,
    bossesDefeated: 0,
    deaths: 0,
    lives: finiteNumberOr(build.MAX_PLAYER_LIVES, 6),
    score: 0,
    enemyScore: 0,
    comboBonus: 0,
    waveClearScore: 0,
    noHitWaveScore: 0,
    sectorClearScore: 0,
    noHitSectorScore: 0,
    bossScore: 0,
    runClearScore: 0,
    pickupScore: 0,
    grazeBreakScore: 0,
    enemyKills: 0,
    bossKills: 0,
    normalWaveDeaths: 0,
    bossDeaths: 0,
    comboCount: 0,
    comboMax: 0,
    grazeNearMissCount: 0,
    powerupsCollected: 0,
    codexDiscoveries: 0,
    runThemeDiscoveries: 1,
    noHitWaves: 0,
    noHitSectors: 0,
    runDurationSeconds: 0,
    scoreAtSectors: {},
    xpAtSectors: {},
    enemiesKilledBeforeEachBoss: [],
    wavesBeforeEachBoss: [],
    bossDeathClusters: [],
    damageSources: {},
    deathTimeline: []
  };

  for (let sector = 1; sector <= MAX_SECTOR && run.lives > 0; sector += 1) {
    run.finalSectorReached = sector;
    const level = normalWaveDifficultyLevel(build, sector);
    const wavesThisSector = normalWaveCount(build, level);
    const normalWaveScoreMult = normalWaveScoreMultiplier(build);
    let sectorHadDeath = false;
    let sectorEnemiesKilled = 0;
    let sectorWaveDeaths = 0;

    for (let waveIndex = 0; waveIndex < wavesThisSector && run.lives > 0; waveIndex += 1) {
      const metric = waveMetric(build, sector, waveIndex, wavesThisSector, rng);
      const exposure = 0.86 + skill.aggression * 0.24;
      const expectedDeaths = Math.pow(metric.pressureIndex / skill.waveResilience, 1.38) *
        skill.waveRiskMult *
        exposure *
        (metric.danger ? 1.18 : 1);
      const deaths = Math.min(run.lives, poisson(rng, expectedDeaths));
      markDeaths(run, deaths, 'normal_wave', run.runDurationSeconds, { chainWindow: false });
      sectorHadDeath ||= deaths > 0;
      sectorWaveDeaths += deaths;

      const gameOver = run.lives <= 0;
      const completion = gameOver ? clamp(0.22 + rng() * 0.52, 0.1, 0.88) : 1;
      const kills = Math.floor(metric.count * completion);
      for (let kill = 0; kill < kills; kill += 1) {
        addComboKillScore(run, metric.scoreValue, normalWaveScoreMult);
      }
      run.enemyKills += kills;
      sectorEnemiesKilled += kills;
      if (kills > 0 && rng() < 0.018 * kills * skill.pickupBias) {
        const pickups = 1 + (rng() < 0.08 ? 1 : 0);
        run.powerupsCollected += pickups;
        const pickupScore = Math.round(pickups * SCORE.pickupScoreAverage * (0.7 + skill.aggression * 0.55) * normalWaveScoreMult);
        run.score += pickupScore;
        run.pickupScore += pickupScore;
      }
      const graze = Math.floor((metric.fireChance * metric.projectileSpeed * metric.count * 8.5) * skill.grazeAggression * (0.65 + rng() * 0.7));
      run.grazeNearMissCount += graze;
      if (graze >= 16 && rng() < skill.grazeAggression * 0.2) {
        const grazeScore = Math.round((SCORE.grazeBreakBase + graze * SCORE.grazeBreakPerBullet) * Math.max(1, run.comboCount >= 25 ? 2 : 1) * normalWaveScoreMult);
        run.score += grazeScore;
        run.grazeBreakScore += grazeScore;
      }
      if (!gameOver) {
        run.wavesCleared += 1;
        const waveClear = Math.round(SCORE.waveClearBase * (waveIndex + 1) * normalWaveScoreMult);
        run.score += waveClear;
        run.waveClearScore += waveClear;
        if (deaths === 0 && rng() < clamp(skill.comboRetention + (1 / Math.max(1, 1 + metric.pressureIndex / 1200)) * 0.18, 0, 0.95)) {
          const noHitWaveScore = Math.round(SCORE.noHitWaveBonus * normalWaveScoreMult);
          run.score += noHitWaveScore;
          run.noHitWaveScore += noHitWaveScore;
          run.noHitWaves += 1;
        }
      }
      // Real wave gaps, boss gates, and repositioning make cross-wave combo carry
      // much less reliable than same-wave kill chains.
      if (deaths > 0 || rng() > skill.comboRetention * 0.35) resetCombo(run);
      run.runDurationSeconds += metric.clearSeconds / Math.max(0.62, skill.hitEfficiency + 0.18);
    }

    if (run.lives <= 0) break;

    const boss = bossMetric(build, sector);
    run.bossesEncountered += 1;
    run.enemiesKilledBeforeEachBoss.push(sectorEnemiesKilled);
    run.wavesBeforeEachBoss.push(wavesThisSector);
    const bossExpectedDeaths = Math.pow(boss.pressureIndex / skill.bossResilience, 1.28) *
      skill.bossRiskMult *
      (1.08 - skill.respawnRecovery * 0.08);
    let bossDeaths = Math.min(run.lives, poisson(rng, bossExpectedDeaths));
    const rawBossDeaths = bossDeaths;
    if (build.hasBossWipeoutGuard && bossDeaths >= 2) {
      bossDeaths = Math.max(1, Math.min(bossDeaths, Math.ceil(bossDeaths * boss.guardFactor)));
    }
    markDeaths(run, bossDeaths, 'boss', run.runDurationSeconds, { boss, chainWindow: true });
    sectorHadDeath ||= bossDeaths > 0;
    if (bossDeaths >= 2 || rawBossDeaths >= 2) {
      run.bossDeathClusters.push({
        sector,
        rawDeaths: rawBossDeaths,
        appliedDeaths: bossDeaths,
        pressureIndex: boss.pressureIndex,
        guardActive: build.hasBossWipeoutGuard
      });
    }
    run.runDurationSeconds += (boss.hp / Math.max(0.2, starterShipDps(build).rawDps * skill.hitEfficiency)) +
      42 +
      Math.min(20, sector * 0.85);
    if (run.lives <= 0) break;

    run.bossesDefeated += 1;
    run.bossKills += 1;
    resetCombo(run);
    run.bossScore += SCORE.bossDefeat;
    run.score += SCORE.bossDefeat;
    run.sectorClearScore += SCORE.sectorClearBonus;
    run.score += SCORE.sectorClearBonus;
    if (!sectorHadDeath) {
      run.noHitSectors += 1;
      run.noHitSectorScore += SCORE.noHitSectorBonus;
      run.score += SCORE.noHitSectorBonus;
    }
    if (sector === RUN_CLEAR_SECTOR) {
      const clearScore = SCORE.runClear + run.lives * SCORE.spareLife;
      run.runClearScore += clearScore;
      run.score += clearScore;
    }
    if (sectorWaveDeaths > 0 && rng() < 0.34) {
      run.codexDiscoveries += 1;
    }
    recordSectorMilestone(run, build, sector);
  }

  run.livesRemaining = Math.max(0, run.lives);
  run.runDurationSeconds = round(run.runDurationSeconds, 1);
  run.runDurationMinutes = round(run.runDurationSeconds / 60, 2);
  run.rawScoreOpportunity = Math.max(0, Math.round(run.score));
  run.score = Math.max(0, Math.round(run.rawScoreOpportunity * SCORE_CALIBRATION_SCALE));
  run.xpEarned = calculatePilotXp(build, {
    score: run.score,
    sectorReached: run.finalSectorReached,
    wavesCleared: run.wavesCleared,
    bossesKilled: run.bossesDefeated,
    codexDiscoveries: run.codexDiscoveries,
    runThemeDiscoveries: run.runThemeDiscoveries,
    noHitWaves: run.noHitWaves,
    noHitSectors: run.noHitSectors,
    runCleared: run.bossesDefeated >= RUN_CLEAR_SECTOR,
    clearLivesRemaining: run.livesRemaining
  });
  run.scorePerMinute = round(run.score / Math.max(1, run.runDurationSeconds / 60), 1);
  run.scorePerSector = round(run.score / Math.max(1, run.finalSectorReached), 1);
  run.scorePerWave = round(run.score / Math.max(1, run.wavesCleared), 1);
  run.xpPerMinute = round(run.xpEarned / Math.max(1, run.runDurationSeconds / 60), 1);
  run.xpPerSector = round(run.xpEarned / Math.max(1, run.finalSectorReached), 1);
  run.xpPerWave = round(run.xpEarned / Math.max(1, run.wavesCleared), 1);
  run.killsPerSector = round(run.enemyKills / Math.max(1, run.finalSectorReached), 2);
  run.timeTo250kSeconds = run.score >= 250000
    ? round((250000 / Math.max(1, run.score)) * run.runDurationSeconds, 1)
    : null;
  run.timeTo390kSeconds = run.score >= 390000
    ? round((390000 / Math.max(1, run.score)) * run.runDurationSeconds, 1)
    : null;
  run.chainDeaths2Within10 = countClusters(run.deathTimeline, 2, 10, 'boss');
  run.chainDeaths3Within20 = countClusters(run.deathTimeline, 3, 20, 'boss');
  return run;
}

function countClusters(timeline, needed, windowSeconds, source = null) {
  const events = timeline.filter((event) => !source || event.source === source);
  let count = 0;
  for (let index = 0; index < events.length; index += 1) {
    const first = events[index];
    const windowCount = events.filter((event) => event.t >= first.t && event.t - first.t <= windowSeconds).length;
    if (windowCount >= needed) count += 1;
  }
  return count;
}

function aggregateRuns(runs) {
  const values = (field) => runs.map((run) => run[field]).filter(Number.isFinite);
  const pct = (field, p) => round(percentile(values(field), p), field.includes('score') || field.includes('xp') ? 0 : 2);
  const avg = (field) => round(average(values(field)), field.includes('score') || field.includes('xp') ? 0 : 2);
  const medianNullable = (field) => {
    const found = values(field);
    return found.length ? round(percentile(found, 50), 1) : null;
  };
  const avgNullable = (field) => {
    const found = values(field);
    return found.length ? round(average(found), 1) : null;
  };
  return {
    attempts: runs.length,
    survival: {
      medianSector: pct('finalSectorReached', 50),
      p75Sector: pct('finalSectorReached', 75),
      p90Sector: pct('finalSectorReached', 90),
      maxSector: Math.max(...values('finalSectorReached')),
      medianWavesCleared: pct('wavesCleared', 50),
      avgDeaths: avg('deaths'),
      avgLivesRemaining: avg('livesRemaining')
    },
    score: {
      min: Math.min(...values('score')),
      median: pct('score', 50),
      p75: pct('score', 75),
      p90: pct('score', 90),
      max: Math.max(...values('score')),
      avg: avg('score'),
      avgPerMinute: avg('scorePerMinute'),
      avgPerSector: avg('scorePerSector'),
      avgPerWave: avg('scorePerWave'),
      medianTimeTo250kSeconds: medianNullable('timeTo250kSeconds'),
      medianTimeTo390kSeconds: medianNullable('timeTo390kSeconds'),
      avgTimeTo250kSeconds: avgNullable('timeTo250kSeconds'),
      avgTimeTo390kSeconds: avgNullable('timeTo390kSeconds')
    },
    xp: {
      median: pct('xpEarned', 50),
      p75: pct('xpEarned', 75),
      p90: pct('xpEarned', 90),
      max: Math.max(...values('xpEarned')),
      avg: avg('xpEarned'),
      avgPerMinute: avg('xpPerMinute'),
      avgPerSector: avg('xpPerSector'),
      avgPerWave: avg('xpPerWave')
    },
    combat: {
      avgEnemyKills: avg('enemyKills'),
      avgBossesEncountered: avg('bossesEncountered'),
      avgBossesDefeated: avg('bossesDefeated'),
      avgNormalWaveDeaths: avg('normalWaveDeaths'),
      avgBossDeaths: avg('bossDeaths'),
      avgComboMax: avg('comboMax'),
      avgGrazeNearMiss: avg('grazeNearMissCount'),
      avgPowerupsCollected: avg('powerupsCollected'),
      avgKillsPerSector: avg('killsPerSector'),
      boss2PlusDeathClusterRate: round(runs.filter((run) => run.chainDeaths2Within10 > 0).length / Math.max(1, runs.length), 4),
      boss3PlusDeathClusterRate: round(runs.filter((run) => run.chainDeaths3Within20 > 0).length / Math.max(1, runs.length), 4)
    },
    probabilities: {
      reachesSector20: round(runs.filter((run) => run.finalSectorReached >= 20).length / runs.length, 4),
      reachesSector25: round(runs.filter((run) => run.finalSectorReached >= 25).length / runs.length, 4),
      reachesSector30: round(runs.filter((run) => run.finalSectorReached >= 30).length / runs.length, 4),
      score250k: round(runs.filter((run) => run.score >= 250000).length / runs.length, 4),
      score390k: round(runs.filter((run) => run.score >= 390000).length / runs.length, 4),
      noDeathOrLowDeath: round(runs.filter((run) => run.deaths <= 1).length / runs.length, 4),
      combo50: round(runs.filter((run) => run.comboMax >= 50).length / runs.length, 4)
    }
  };
}

function deltaPct(current, old) {
  if (Math.abs(Number(current) || 0) < 0.0001 && Math.abs(Number(old) || 0) < 0.0001) return 0;
  return round(((current / Math.max(0.0001, old)) - 1) * 100, 2);
}

function compareAggregates(oldAgg, currentAgg) {
  return {
    medianSectorDelta: round(currentAgg.survival.medianSector - oldAgg.survival.medianSector, 2),
    p90SectorDelta: round(currentAgg.survival.p90Sector - oldAgg.survival.p90Sector, 2),
    medianScoreDeltaPct: deltaPct(currentAgg.score.median, oldAgg.score.median),
    p90ScoreDeltaPct: deltaPct(currentAgg.score.p90, oldAgg.score.p90),
    medianXpDeltaPct: deltaPct(currentAgg.xp.median, oldAgg.xp.median),
    scorePerMinuteDeltaPct: deltaPct(currentAgg.score.avgPerMinute, oldAgg.score.avgPerMinute),
    scorePerSectorDeltaPct: deltaPct(currentAgg.score.avgPerSector, oldAgg.score.avgPerSector),
    scorePerWaveDeltaPct: deltaPct(currentAgg.score.avgPerWave, oldAgg.score.avgPerWave),
    xpPerMinuteDeltaPct: deltaPct(currentAgg.xp.avgPerMinute, oldAgg.xp.avgPerMinute),
    xpPerSectorDeltaPct: deltaPct(currentAgg.xp.avgPerSector, oldAgg.xp.avgPerSector),
    xpPerWaveDeltaPct: deltaPct(currentAgg.xp.avgPerWave, oldAgg.xp.avgPerWave),
    timeTo250kDeltaPct: currentAgg.score.medianTimeTo250kSeconds == null || oldAgg.score.medianTimeTo250kSeconds == null
      ? null
      : deltaPct(currentAgg.score.medianTimeTo250kSeconds, oldAgg.score.medianTimeTo250kSeconds),
    timeTo390kDeltaPct: currentAgg.score.medianTimeTo390kSeconds == null || oldAgg.score.medianTimeTo390kSeconds == null
      ? null
      : deltaPct(currentAgg.score.medianTimeTo390kSeconds, oldAgg.score.medianTimeTo390kSeconds),
    normalWaveDeathsDeltaPct: deltaPct(currentAgg.combat.avgNormalWaveDeaths, oldAgg.combat.avgNormalWaveDeaths),
    bossDeathsDeltaPct: deltaPct(currentAgg.combat.avgBossDeaths, oldAgg.combat.avgBossDeaths),
    boss2PlusClusterDeltaPct: deltaPct(currentAgg.combat.boss2PlusDeathClusterRate, oldAgg.combat.boss2PlusDeathClusterRate),
    score250kProbabilityDeltaPct: deltaPct(currentAgg.probabilities.score250k, oldAgg.probabilities.score250k),
    score390kProbabilityDeltaPct: deltaPct(currentAgg.probabilities.score390k, oldAgg.probabilities.score390k)
  };
}

function aggregateBySector(build, runs) {
  const rows = {};
  for (const sector of TARGET_SECTORS) {
    const reached = runs.filter((run) => Object.hasOwn(run.scoreAtSectors, String(sector)));
    const scoreValues = reached.map((run) => run.scoreAtSectors[String(sector)]);
    const xpValues = reached.map((run) => run.xpAtSectors[String(sector)]);
    const waveCounts = [];
    const enemyCounts = [];
    for (const seed of SEEDS.slice(0, Math.min(25, SEEDS.length))) {
      const rng = mulberry32(seed ^ hashString('sector-opportunity') ^ sector);
      const level = normalWaveDifficultyLevel(build, sector);
      const waveCount = normalWaveCount(build, level);
      waveCounts.push(waveCount);
      let enemyCount = 0;
      for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
        enemyCount += waveMetric(build, sector, waveIndex, waveCount, rng).count;
      }
      enemyCounts.push(enemyCount);
    }
    rows[sector] = {
      reachedAttempts: reached.length,
      reachRate: round(reached.length / Math.max(1, runs.length), 4),
      medianScoreAtSector: round(percentile(scoreValues, 50), 0),
      medianXpAtSector: round(percentile(xpValues, 50), 0),
      avgWavesBeforeBoss: round(average(waveCounts), 2),
      avgEnemiesBeforeBoss: round(average(enemyCounts), 2)
    };
  }
  return rows;
}

function highSkillPersonalBestProbability(oldRuns, currentRuns) {
  const oldScores = oldRuns.map((run) => run.score);
  const oldMedian = percentile(oldScores, 50);
  const oldP75 = percentile(oldScores, 75);
  const oldP90 = percentile(oldScores, 90);
  const oldBest = Math.max(...oldScores);
  const probability = (threshold) => round(currentRuns.filter((run) => run.score > threshold).length / Math.max(1, currentRuns.length), 4);
  return {
    oldMedian,
    oldP75,
    oldP90,
    oldBest,
    currentBeatsOldMedian: probability(oldMedian),
    currentBeatsOldP75: probability(oldP75),
    currentBeatsOldP90: probability(oldP90),
    currentBeatsOldBest: probability(oldBest)
  };
}

function poissonProbabilityAtLeast(lambda, threshold) {
  const safeLambda = clamp(Number(lambda) || 0, 0, 12);
  let cumulative = 0;
  for (let k = 0; k < threshold; k += 1) {
    cumulative += Math.exp(-safeLambda) * (safeLambda ** k) / factorial(k);
  }
  return clamp(1 - cumulative, 0, 1);
}

function factorial(value) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) result *= index;
  return result;
}

function bossChainRisk(build, skill, sector) {
  const boss = bossMetric(build, sector);
  const expectedDeaths = Math.pow(boss.pressureIndex / skill.bossResilience, 1.28) *
    skill.bossRiskMult *
    (1.08 - skill.respawnRecovery * 0.08);
  const guardTwoPlusFactor = build.hasBossWipeoutGuard ? 0.58 : 1;
  const guardThreePlusFactor = build.hasBossWipeoutGuard ? 0.34 : 1;
  return {
    sector,
    pressureIndex: boss.pressureIndex,
    expectedDeaths: round(expectedDeaths, 4),
    twoPlusWithin10Risk: round(poissonProbabilityAtLeast(expectedDeaths, 2) * guardTwoPlusFactor, 4),
    threePlusWithin20Risk: round(poissonProbabilityAtLeast(expectedDeaths, 3) * guardThreePlusFactor, 4),
    guardActive: build.hasBossWipeoutGuard,
    hazardCleanup: build.hasBossHazardRespawnCleanup
  };
}

function bossFairnessAnalysis(oldBuild, currentBuild) {
  const sectors = [20, 21, 22, 23, 24, 25];
  const rows = {};
  const overall = {};
  for (const skill of SKILL_PROFILES) {
    const oldRows = sectors.map((sector) => bossChainRisk(oldBuild, skill, sector));
    const currentRows = sectors.map((sector) => bossChainRisk(currentBuild, skill, sector));
    rows[skill.id] = Object.fromEntries(sectors.map((sector, index) => [sector, {
      old: oldRows[index],
      current: currentRows[index],
      twoPlusRiskDeltaPct: deltaPct(currentRows[index].twoPlusWithin10Risk, oldRows[index].twoPlusWithin10Risk),
      threePlusRiskDeltaPct: deltaPct(currentRows[index].threePlusWithin20Risk, oldRows[index].threePlusWithin20Risk)
    }]));
    overall[skill.id] = {
      avgOldTwoPlusRisk: round(average(oldRows.map((row) => row.twoPlusWithin10Risk)), 4),
      avgCurrentTwoPlusRisk: round(average(currentRows.map((row) => row.twoPlusWithin10Risk)), 4),
      avgTwoPlusRiskDeltaPct: deltaPct(
        average(currentRows.map((row) => row.twoPlusWithin10Risk)),
        average(oldRows.map((row) => row.twoPlusWithin10Risk))
      ),
      avgOldThreePlusRisk: round(average(oldRows.map((row) => row.threePlusWithin20Risk)), 4),
      avgCurrentThreePlusRisk: round(average(currentRows.map((row) => row.threePlusWithin20Risk)), 4),
      avgThreePlusRiskDeltaPct: deltaPct(
        average(currentRows.map((row) => row.threePlusWithin20Risk)),
        average(oldRows.map((row) => row.threePlusWithin20Risk))
      )
    };
  }
  return { sectors, rows, overall };
}

function buildTableRows(aggregates, comparison) {
  return SKILL_PROFILES.map((skill) => ({
    skill: skill.id,
    oldMedianSector: aggregates.old[skill.id].survival.medianSector,
    currentMedianSector: aggregates.current[skill.id].survival.medianSector,
    sectorDelta: comparison[skill.id].medianSectorDelta,
    oldMedianScore: aggregates.old[skill.id].score.median,
    currentMedianScore: aggregates.current[skill.id].score.median,
    scoreDeltaPct: comparison[skill.id].medianScoreDeltaPct,
    oldMedianXp: aggregates.old[skill.id].xp.median,
    currentMedianXp: aggregates.current[skill.id].xp.median,
    xpDeltaPct: comparison[skill.id].medianXpDeltaPct,
    normalDeathsDeltaPct: comparison[skill.id].normalWaveDeathsDeltaPct,
    bossDeathsDeltaPct: comparison[skill.id].bossDeathsDeltaPct
  }));
}

function conclusionFrom(comparison, bossFairness) {
  const high = comparison.high_skill_aggressive;
  const medium = comparison.medium_skill;
  const scoreLower = high.medianScoreDeltaPct < -5 || high.scorePerSectorDeltaPct < -5;
  const survivalLower = high.medianSectorDelta < 0 || high.p90SectorDelta < 0;
  const normalDeathsUp = high.normalWaveDeathsDeltaPct > 12 || medium.normalWaveDeathsDeltaPct > 12;
  const bossChainsLower =
    bossFairness.overall.high_skill_aggressive.avgTwoPlusRiskDeltaPct < -10 ||
    bossFairness.overall.medium_skill.avgTwoPlusRiskDeltaPct < -10 ||
    high.bossDeathsDeltaPct < -10 ||
    medium.bossDeathsDeltaPct < -10;
  let verdict = 'mixed';
  if ((survivalLower || normalDeathsUp) && scoreLower) verdict = 'current_harder_and_less_rewarding';
  else if (!survivalLower && bossChainsLower && scoreLower) verdict = 'mixed_fairer_bosses_lower_score_pacing';
  else if (!survivalLower && !scoreLower) verdict = 'current_not_harder_in_model';
  return {
    verdict,
    currentHarderForHighSkill: survivalLower || normalDeathsUp,
    scoreXpOpportunityLower: scoreLower,
    normalWavesMorePunishing: normalDeathsUp,
    bossChainDeathsLower: bossChainsLower,
    recommendation: scoreLower || normalDeathsUp
      ? 'Do not revert Mayhem wholesale. Investigate compensation that preserves the update intent: score/XP pacing compensation for fewer waves, or a slight Mayhem normal-wave pressure trim. Any score-formula or leaderboard-impacting change needs explicit approval.'
      : 'Data does not support a broad nerf. If players still feel worse, focus messaging or sector-score pacing rather than enemy/boss reductions.'
  };
}

function buildVariantSummaryRows(aggregatesByBuild, comparisonsByBuild, oldBuildId, variantBuilds) {
  const oldHigh = aggregatesByBuild[oldBuildId].high_skill_aggressive;
  return variantBuilds.map((build) => {
    const agg = aggregatesByBuild[build.id].high_skill_aggressive;
    const compare = comparisonsByBuild[build.id].high_skill_aggressive;
    return {
      id: build.id,
      label: build.label,
      offset: build.BalanceConfig.difficulty?.normalWaveDifficultyLevelOffset ?? null,
      finalAggressionRemoved: Boolean(build.variant?.removeFinalMayhemAggression),
      normalWaveScoreXpComp: normalWaveScoreMultiplier(build),
      medianSector: agg.survival.medianSector,
      p75Sector: agg.survival.p75Sector,
      p90Sector: agg.survival.p90Sector,
      medianScore: agg.score.median,
      p90Score: agg.score.p90,
      medianXp: agg.xp.median,
      scorePerMinute: agg.score.avgPerMinute,
      xpPerMinute: agg.xp.avgPerMinute,
      timeTo250kSeconds: agg.score.medianTimeTo250kSeconds,
      timeTo390kSeconds: agg.score.medianTimeTo390kSeconds,
      probability250k: agg.probabilities.score250k,
      probability390k: agg.probabilities.score390k,
      normalWaveDeaths: agg.combat.avgNormalWaveDeaths,
      bossDeaths: agg.combat.avgBossDeaths,
      boss2PlusDeathClusterRate: agg.combat.boss2PlusDeathClusterRate,
      killsPerSector: agg.combat.avgKillsPerSector,
      medianSectorVsOld: compare.medianSectorDelta,
      medianScoreDeltaPct: compare.medianScoreDeltaPct,
      medianXpDeltaPct: compare.medianXpDeltaPct,
      scorePerMinuteVsOldPct: compare.scorePerMinuteDeltaPct,
      xpPerMinuteVsOldPct: compare.xpPerMinuteDeltaPct,
      normalWaveDeathsVsOldPct: compare.normalWaveDeathsDeltaPct,
      bossDeathsVsOldPct: compare.bossDeathsDeltaPct,
      scorePerMinuteAboveOld: agg.score.avgPerMinute > oldHigh.score.avgPerMinute
    };
  });
}

function scoreCandidate(row, oldHigh) {
  let score = 0;
  if (row.probability250k >= 0.85) score += 18;
  else score += row.probability250k * 12;
  if (row.probability390k >= 0.4) score += 24;
  else score += row.probability390k * 28;
  if (row.medianSector >= 30) score += 18;
  else score += Math.max(0, row.medianSector - 20) * 1.2;
  if (row.normalWaveDeaths <= oldHigh.combat.avgNormalWaveDeaths * 1.05) score += 18;
  else score -= Math.min(18, (row.normalWaveDeaths - oldHigh.combat.avgNormalWaveDeaths) * 5);
  if (row.bossDeaths <= oldHigh.combat.avgBossDeaths) score += 8;
  if (row.scorePerMinuteAboveOld) score += 12;
  const compPenalty = Math.abs((Number(row.normalWaveScoreXpComp) || 1) - 1.2) * 8;
  const offsetPenalty = Math.max(0, 9 - (Number(row.offset) || 9)) * 1.4;
  return round(score - compPenalty - offsetPenalty, 3);
}

function selectRecommendation(variantRows, oldHigh) {
  const eligible = variantRows
    .filter((row) => row.id !== 'A_current_baseline')
    .map((row) => ({
      ...row,
      targetMet: row.probability250k >= 0.85 &&
        row.probability390k >= 0.4 &&
        row.medianSector >= 30 &&
        row.normalWaveDeaths <= oldHigh.combat.avgNormalWaveDeaths * 1.05 &&
        row.scorePerMinuteAboveOld,
      candidateScore: scoreCandidate(row, oldHigh)
    }));
  const targetMet = eligible.filter((row) => row.targetMet)
    .sort((a, b) =>
      (b.offset - a.offset) ||
      (Math.abs(a.normalWaveScoreXpComp - 1) - Math.abs(b.normalWaveScoreXpComp - 1)) ||
      (b.candidateScore - a.candidateScore)
    );
  const ranked = [...eligible].sort((a, b) => b.candidateScore - a.candidateScore);
  const best = targetMet[0] || ranked[0] || null;
  return {
    bestCandidateId: best?.id || null,
    bestCandidateLabel: best?.label || null,
    targetFullyMet: Boolean(best?.targetMet),
    rankedCandidates: ranked.map((row) => ({
      id: row.id,
      label: row.label,
      candidateScore: row.candidateScore,
      targetMet: row.targetMet,
      medianSector: row.medianSector,
      probability250k: row.probability250k,
      probability390k: row.probability390k,
      scorePerMinute: row.scorePerMinute,
      normalWaveDeaths: row.normalWaveDeaths
    })),
    recommendation: best
      ? `Best analysis candidate: ${best.label}. Remove the +5% normal-wave aggression, use normalWaveDifficultyLevelOffset ${best.offset}, and use ${best.normalWaveScoreXpComp.toFixed(2)} normal-wave score/XP pacing compensation.`
      : 'No candidate was available.'
  };
}

const oldBuild = await loadBuild({
  id: 'old_public_23809188',
  label: 'Previous public ranked build',
  buildId: OLD_BUILD_ID,
  commit: OLD_SOURCE_COMMIT,
  worktree: OLD_WORKTREE
});
const currentBuild = await loadBuild({
  id: 'current_mayhem_23854561',
  label: 'Current Mayhem ranked build',
  buildId: CURRENT_BUILD_ID,
  commit: CURRENT_SOURCE_COMMIT,
  worktree: CURRENT_WORKTREE
});
const implementedSourceCommit = IMPLEMENTED_SOURCE_COMMIT || git(['rev-parse', 'HEAD'], IMPLEMENTED_WORKTREE);
const implementedBuild = await loadBuild({
  id: 'implemented_source',
  label: IMPLEMENTED_BUILD_ID === 'working-tree' ? 'Implemented source working tree' : `Implemented source BuildID ${IMPLEMENTED_BUILD_ID}`,
  buildId: IMPLEMENTED_BUILD_ID,
  commit: implementedSourceCommit,
  worktree: IMPLEMENTED_WORKTREE,
  allowDirty: IMPLEMENTED_ALLOW_DIRTY
});

assert.equal(oldBuild.leaderboardName, EXPECTED_LEADERBOARD, 'old leaderboard identity mismatch');
assert.equal(currentBuild.leaderboardName, EXPECTED_LEADERBOARD, 'current leaderboard identity mismatch');
assert.equal(implementedBuild.leaderboardName, EXPECTED_LEADERBOARD, 'implemented leaderboard identity mismatch');

const variantBuilds = VARIANT_DEFINITIONS.map((definition) => cloneCurrentBuildVariant(currentBuild, definition));
const currentVariant = variantBuilds.find((build) => build.id === 'A_current_baseline');
const evaluatedBuilds = [...variantBuilds, implementedBuild];
const allBuilds = [oldBuild, ...evaluatedBuilds];

const allRuns = [];
for (const build of allBuilds) {
  for (const skill of SKILL_PROFILES) {
    for (const seed of SEEDS) {
      allRuns.push(simulateRun(build, skill, seed));
    }
  }
}

const runsByBuildAndSkill = {};
for (const build of allBuilds) {
  runsByBuildAndSkill[build.id] = {};
  for (const skill of SKILL_PROFILES) {
    runsByBuildAndSkill[build.id][skill.id] = allRuns.filter((run) => run.build === build.id && run.skillProfile === skill.id);
  }
}

const aggregatesByBuild = {};
for (const build of allBuilds) {
  aggregatesByBuild[build.id] = {};
  for (const skill of SKILL_PROFILES) {
    aggregatesByBuild[build.id][skill.id] = aggregateRuns(runsByBuildAndSkill[build.id][skill.id]);
  }
}

const comparisonsByBuild = {};
for (const build of evaluatedBuilds) {
  comparisonsByBuild[build.id] = {};
  for (const skill of SKILL_PROFILES) {
    comparisonsByBuild[build.id][skill.id] = compareAggregates(
      aggregatesByBuild[oldBuild.id][skill.id],
      aggregatesByBuild[build.id][skill.id]
    );
  }
}

const aggregates = {
  old: aggregatesByBuild[oldBuild.id],
  current: aggregatesByBuild[currentVariant.id]
};
const comparison = comparisonsByBuild[currentVariant.id];

const sectorOpportunityByBuild = Object.fromEntries(allBuilds.map((build) => [
  build.id,
  aggregateBySector(build, allRuns.filter((run) => run.build === build.id))
]));
const sectorOpportunity = {
  old: sectorOpportunityByBuild[oldBuild.id],
  current: sectorOpportunityByBuild[currentVariant.id]
};
const sectorOpportunityComparison = Object.fromEntries(TARGET_SECTORS.map((sector) => {
  const oldRow = sectorOpportunity.old[sector];
  const currentRow = sectorOpportunity.current[sector];
  return [sector, {
    scoreAtSectorDeltaPct: deltaPct(currentRow.medianScoreAtSector, oldRow.medianScoreAtSector),
    xpAtSectorDeltaPct: deltaPct(currentRow.medianXpAtSector, oldRow.medianXpAtSector),
    wavesBeforeBossDeltaPct: deltaPct(currentRow.avgWavesBeforeBoss, oldRow.avgWavesBeforeBoss),
    enemiesBeforeBossDeltaPct: deltaPct(currentRow.avgEnemiesBeforeBoss, oldRow.avgEnemiesBeforeBoss)
  }];
}));

const sectorOpportunityComparisonByBuild = Object.fromEntries(evaluatedBuilds.map((build) => [
  build.id,
  Object.fromEntries(TARGET_SECTORS.map((sector) => {
    const oldRow = sectorOpportunityByBuild[oldBuild.id][sector];
    const candidateRow = sectorOpportunityByBuild[build.id][sector];
    return [sector, {
      scoreAtSectorDeltaPct: deltaPct(candidateRow.medianScoreAtSector, oldRow.medianScoreAtSector),
      xpAtSectorDeltaPct: deltaPct(candidateRow.medianXpAtSector, oldRow.medianXpAtSector),
      wavesBeforeBossDeltaPct: deltaPct(candidateRow.avgWavesBeforeBoss, oldRow.avgWavesBeforeBoss),
      enemiesBeforeBossDeltaPct: deltaPct(candidateRow.avgEnemiesBeforeBoss, oldRow.avgEnemiesBeforeBoss)
    }];
  }))
]));

const highSkillProbability = highSkillPersonalBestProbability(
  runsByBuildAndSkill[oldBuild.id].high_skill_aggressive,
  runsByBuildAndSkill[currentVariant.id].high_skill_aggressive
);
const bossFairness = bossFairnessAnalysis(oldBuild, currentVariant);
const conclusion = conclusionFrom(comparison, bossFairness);
const variantSummaryRows = buildVariantSummaryRows(aggregatesByBuild, comparisonsByBuild, oldBuild.id, variantBuilds);
const implementedSummaryRow = buildVariantSummaryRows(aggregatesByBuild, comparisonsByBuild, oldBuild.id, [implementedBuild])[0];
const variantRecommendation = selectRecommendation(variantSummaryRows, aggregatesByBuild[oldBuild.id].high_skill_aggressive);
const bestCandidateBuild = variantBuilds.find((build) => build.id === variantRecommendation.bestCandidateId) || currentVariant;
const bestCandidateHighSkillPersonalBestProbability = highSkillPersonalBestProbability(
  runsByBuildAndSkill[oldBuild.id].high_skill_aggressive,
  runsByBuildAndSkill[bestCandidateBuild.id].high_skill_aggressive
);
const bestCandidateBossFairness = bossFairnessAnalysis(oldBuild, bestCandidateBuild);
const implementedHighSkillPersonalBestProbability = highSkillPersonalBestProbability(
  runsByBuildAndSkill[oldBuild.id].high_skill_aggressive,
  runsByBuildAndSkill[implementedBuild.id].high_skill_aggressive
);
const implementedBossFairness = bossFairnessAnalysis(oldBuild, implementedBuild);
const implementedVsBestCandidate = {
  bestCandidateId: bestCandidateBuild.id,
  medianSectorDelta: implementedSummaryRow.medianSector - (
    aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.survival.medianSector
  ),
  medianScoreDeltaPct: deltaPct(
    implementedSummaryRow.medianScore,
    aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.score.median
  ),
  medianXpDeltaPct: deltaPct(
    implementedSummaryRow.medianXp,
    aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.xp.median
  ),
  scorePerMinuteDeltaPct: deltaPct(
    implementedSummaryRow.scorePerMinute,
    aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.score.avgPerMinute
  ),
  probability250kDelta: round(
    implementedSummaryRow.probability250k -
      aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.probabilities.score250k,
    4
  ),
  probability390kDelta: round(
    implementedSummaryRow.probability390k -
      aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.probabilities.score390k,
    4
  ),
  normalWaveDeathsDelta: round(
    implementedSummaryRow.normalWaveDeaths -
      aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.combat.avgNormalWaveDeaths,
    3
  ),
  materiallyMatches: Math.abs(implementedSummaryRow.medianSector - aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.survival.medianSector) <= 1 &&
    Math.abs(deltaPct(implementedSummaryRow.medianScore, aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.score.median)) <= 10 &&
    Math.abs(deltaPct(implementedSummaryRow.scorePerMinute, aggregatesByBuild[bestCandidateBuild.id].high_skill_aggressive.score.avgPerMinute)) <= 10 &&
    implementedSummaryRow.probability250k >= 0.85 &&
    implementedSummaryRow.probability390k >= 0.4 &&
    implementedSummaryRow.medianSector >= 30
};

const report = {
  generatedAt: new Date().toISOString(),
  outputDir: OUTPUT_DIR,
  seedCount: SEEDS.length,
  seeds: SEEDS,
  skillProfiles: SKILL_PROFILES,
  baselines: {
    old: {
      id: oldBuild.id,
      buildId: oldBuild.buildId,
      commit: oldBuild.commit,
      worktree: oldBuild.worktree,
      sourceEvidence: 'release/steamworks/steam_upload_evidence_dock_icon_safe_area_20260618_23809188.md and accepted/nova-swarm-menu-legibility-source-20260618',
      leaderboardName: oldBuild.leaderboardName,
      settings: {
        maxLives: oldBuild.MAX_PLAYER_LIVES,
        normalWaveDifficultyLevelOffset: oldBuild.BalanceConfig.difficulty?.normalWaveDifficultyLevelOffset || 0,
        minWavesBetweenBosses: oldBuild.BalanceConfig.difficulty?.MIN_WAVES_BETWEEN_BOSSES,
        wavesPerBossBase: oldBuild.BalanceConfig.difficulty?.wavesPerBossBase,
        wavesPerBossMax: oldBuild.BalanceConfig.difficulty?.wavesPerBossMax,
        runModeProfile: oldBuild.runModeProfile,
        hasBossWipeoutGuard: oldBuild.hasBossWipeoutGuard,
        hasBossHazardRespawnCleanup: oldBuild.hasBossHazardRespawnCleanup
      }
    },
    current: {
      id: currentVariant.id,
      buildId: currentVariant.buildId,
      commit: currentVariant.commit,
      worktree: currentVariant.worktree,
      leaderboardName: currentVariant.leaderboardName,
      settings: {
        maxLives: currentVariant.MAX_PLAYER_LIVES,
        normalWaveDifficultyLevelOffset: currentVariant.BalanceConfig.difficulty?.normalWaveDifficultyLevelOffset || 0,
        minWavesBetweenBosses: currentVariant.BalanceConfig.difficulty?.MIN_WAVES_BETWEEN_BOSSES,
        wavesPerBossBase: currentVariant.BalanceConfig.difficulty?.wavesPerBossBase,
        wavesPerBossMax: currentVariant.BalanceConfig.difficulty?.wavesPerBossMax,
        runModeProfile: currentVariant.runModeProfile,
        hasBossWipeoutGuard: currentVariant.hasBossWipeoutGuard,
        hasBossHazardRespawnCleanup: currentVariant.hasBossHazardRespawnCleanup
      }
    },
    implemented: {
      id: implementedBuild.id,
      buildId: implementedBuild.buildId,
      commit: implementedBuild.commit,
      worktree: implementedBuild.worktree,
      leaderboardName: implementedBuild.leaderboardName,
      settings: {
        maxLives: implementedBuild.MAX_PLAYER_LIVES,
        normalWaveDifficultyLevelOffset: implementedBuild.BalanceConfig.difficulty?.normalWaveDifficultyLevelOffset || 0,
        minWavesBetweenBosses: implementedBuild.BalanceConfig.difficulty?.MIN_WAVES_BETWEEN_BOSSES,
        wavesPerBossBase: implementedBuild.BalanceConfig.difficulty?.wavesPerBossBase,
        wavesPerBossMax: implementedBuild.BalanceConfig.difficulty?.wavesPerBossMax,
        runModeProfile: implementedBuild.runModeProfile,
        hasBossWipeoutGuard: implementedBuild.hasBossWipeoutGuard,
        hasBossHazardRespawnCleanup: implementedBuild.hasBossHazardRespawnCleanup
      }
    }
  },
  starterShipDps: {
    old: starterShipDps(oldBuild),
    current: starterShipDps(currentVariant)
  },
  scoreConstants: SCORE,
  scoreCalibrationScale: SCORE_CALIBRATION_SCALE,
  aggregates,
  aggregatesByBuild,
  comparison,
  comparisonsByBuild,
  sectorOpportunity,
  sectorOpportunityByBuild,
  sectorOpportunityComparison,
  sectorOpportunityComparisonByBuild,
  highSkillPersonalBestProbability: highSkillProbability,
  bossFairness,
  bestCandidate: {
    id: bestCandidateBuild.id,
    label: bestCandidateBuild.label,
    variant: bestCandidateBuild.variant,
    highSkillPersonalBestProbability: bestCandidateHighSkillPersonalBestProbability,
    bossFairness: bestCandidateBossFairness,
    aggregates: aggregatesByBuild[bestCandidateBuild.id],
    comparison: comparisonsByBuild[bestCandidateBuild.id],
    sectorOpportunity: sectorOpportunityByBuild[bestCandidateBuild.id],
    sectorOpportunityComparison: sectorOpportunityComparisonByBuild[bestCandidateBuild.id]
  },
  implementedSource: {
    id: implementedBuild.id,
    label: implementedBuild.label,
    highSkillPersonalBestProbability: implementedHighSkillPersonalBestProbability,
    bossFairness: implementedBossFairness,
    summaryRow: implementedSummaryRow,
    aggregates: aggregatesByBuild[implementedBuild.id],
    comparison: comparisonsByBuild[implementedBuild.id],
    sectorOpportunity: sectorOpportunityByBuild[implementedBuild.id],
    sectorOpportunityComparison: sectorOpportunityComparisonByBuild[implementedBuild.id],
    implementedVsBestCandidate
  },
  variants: variantBuilds.map((build) => ({
    id: build.id,
    label: build.label,
    summary: build.variant?.summary || build.label,
    removeFinalMayhemAggression: Boolean(build.variant?.removeFinalMayhemAggression),
    normalWaveDifficultyLevelOffset: build.BalanceConfig.difficulty?.normalWaveDifficultyLevelOffset ?? null,
    normalWaveScoreXpComp: normalWaveScoreMultiplier(build),
    pressureMultipliers: build.runModeProfile?.pressureMultipliers
  })),
  variantSummaryRows,
  variantRecommendation,
  tables: {
    oldVsCurrentBySkill: buildTableRows(aggregates, comparison),
    highSkillVariantSummary: variantSummaryRows
      .concat([implementedSummaryRow])
  },
  conclusion,
  allRuns,
  limitations: [
    'This is an automated deterministic comparative model, not a full rendered playthrough. It loads source constants from both checked-out worktrees and applies the same seeded controller model to both versions.',
    'Variant tuning is modeled through temporary in-script overrides; implementedSource also loads the current workspace source directly so implementation commits can be compared against the selected candidate.',
    'Score output is calibrated by a fixed 0.25 scale after the raw deterministic score-opportunity budget is calculated; this keeps 250k/390k sanity checks in the same order of magnitude as the reported top-player context while preserving old-vs-current percentage deltas.',
    'The model estimates bot movement, pickup collection, graze opportunities, and deaths from source pressure indices. It does not submit leaderboards, write saves, write Steam Cloud data, or launch Steam.',
    'The result is strongest for directional old-vs-current deltas: waves before bosses, score/XP opportunity, normal-wave pressure, and boss chain-death risk.',
    'Absolute 250k/390k probabilities are sanity estimates for this bot, not a claim about the exact human top-player distribution.'
  ]
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const reportPath = path.join(OUTPUT_DIR, 'report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const summaryRows = variantSummaryRows.concat([implementedSummaryRow]).map((row) => ({
  variant: row.id.replace(/_no_aggression|_baseline/g, ''),
  sector: row.medianSector,
  score: row.medianScore,
  xp: row.medianXp,
  scorePerMinute: row.scorePerMinute,
  p250k: row.probability250k,
  p390k: row.probability390k,
  normalDeaths: row.normalWaveDeaths
}));
console.table(summaryRows);
console.log(`[mayhem-difficulty-score-delta] PASS verdict=${conclusion.verdict} best=${variantRecommendation.bestCandidateId} implementedMatches=${implementedVsBestCandidate.materiallyMatches} seeds=${SEEDS.length} report=${reportPath}`);
