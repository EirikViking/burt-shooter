import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { BalanceConfig, getNormalWaveDangerMoment, getNormalWavePressureTuning } from '../src/config/BalanceConfig.js';

const EXPECTED_APP_ID = '4765070';
const EXPECTED_LEADERBOARD = 'nova_swarm_global_score_v2';

const errors = [];
const fail = (message) => errors.push(message);

const DEFAULT_V3_TUNING = Object.freeze({
  id: 'baseline',
  fireChanceMult: 1,
  projectileSpeedMult: 1,
  enemySpeedMult: 1,
  tacticFireMult: 1,
  tacticFireDelayMult: 1,
  challengeChanceMult: 1,
  challengeChanceBonus: 0,
  challengeMinLevel: 1,
  challengeWaveCountBonus: 0,
  multiEliteChanceMult: 1,
  multiEliteTriChance: 0,
  eliteSecondSlotChance: null,
  threatDangerBudgetBonus: 0,
  threatMaxActiveBonus: 0,
  threatPlannedActionBonus: 0,
  waveCountBonus: 0,
  waveEnemyCountBonus: 0,
  waveEnemyMaxBonus: 0,
  dangerWaveCount: 0,
  dangerWaveCountBonus: 0,
  dangerWaveCadenceMult: 1,
  dangerWaveFireMult: 1,
  dangerWaveFireDelayMult: 1,
  dangerWaveProjectileSpeedMult: 1,
  threatProjectileSpeedMult: 1,
  dangerWaveThreatDangerBudgetBonus: 0,
  dangerWaveThreatMaxActiveBonus: 0,
  dangerWaveThreatPlannedActionBonus: 0,
  threatInitialDelayMult: 1,
  threatInitialDelayMs: 0,
  dangerWaveEliteHealthScalar: 1,
  dangerWaveEliteFireDelayMult: 1,
  dangerWaveEliteSpecialDelayMs: 0,
  diveBiasMult: 1,
  entrySpeedMult: 1
});

const V3_BASELINE_BANDS = Object.freeze([
  {
    id: 'opening_readable',
    minLevel: 1,
    maxLevel: 2,
    targetIncreaseRange: [0.05, 0.075],
    fireChanceMult: 1.032,
    projectileSpeedMult: 1.018,
    enemySpeedMult: 1.01,
    tacticFireMult: 1.018,
    tacticFireDelayMult: 0.994
  },
  {
    id: 'early_movement_check',
    minLevel: 3,
    maxLevel: 5,
    targetIncreaseRange: [0.15, 0.25],
    fireChanceMult: 1.13,
    projectileSpeedMult: 1.14,
    enemySpeedMult: 1.032,
    tacticFireMult: 1.1,
    tacticFireDelayMult: 0.955,
    multiEliteChanceMult: 1.2,
    challengeChanceMult: 1.35,
    challengeChanceBonus: 0.035,
    challengeMinLevel: 5,
    challengeWaveCountBonus: 0,
    dangerWaveCount: 1,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.14,
    dangerWaveFireMult: 1.2,
    dangerWaveFireDelayMult: 0.9,
    dangerWaveProjectileSpeedMult: 1.1,
    threatProjectileSpeedMult: 1.08,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.46,
    threatInitialDelayMs: 620,
    dangerWaveEliteHealthScalar: 0.6,
    dangerWaveEliteFireDelayMult: 1.08,
    dangerWaveEliteSpecialDelayMs: 900,
    diveBiasMult: 1.02,
    entrySpeedMult: 0.94
  },
  {
    id: 'early_kill_window',
    minLevel: 6,
    maxLevel: 10,
    targetIncreaseRange: [0.25, 0.4],
    fireChanceMult: 1.16,
    projectileSpeedMult: 1.28,
    enemySpeedMult: 1.04,
    tacticFireMult: 1.14,
    tacticFireDelayMult: 0.94,
    challengeChanceMult: 1.55,
    challengeChanceBonus: 0.045,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.18,
    dangerWaveCount: 2,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.16,
    dangerWaveFireMult: 1.24,
    dangerWaveFireDelayMult: 0.88,
    dangerWaveProjectileSpeedMult: 1.15,
    threatProjectileSpeedMult: 1.14,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.42,
    threatInitialDelayMs: 680,
    dangerWaveEliteHealthScalar: 0.68,
    dangerWaveEliteFireDelayMult: 1.02,
    dangerWaveEliteSpecialDelayMs: 780,
    diveBiasMult: 1.05,
    entrySpeedMult: 0.93
  },
  {
    id: 'serious_run',
    minLevel: 11,
    maxLevel: 15,
    targetIncreaseRange: [0.25, 0.45],
    fireChanceMult: 1.18,
    projectileSpeedMult: 1.38,
    enemySpeedMult: 1.045,
    tacticFireMult: 1.16,
    tacticFireDelayMult: 0.93,
    challengeChanceMult: 1.55,
    challengeChanceBonus: 0.045,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.2,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.17,
    dangerWaveFireMult: 1.25,
    dangerWaveFireDelayMult: 0.88,
    dangerWaveProjectileSpeedMult: 1.16,
    threatProjectileSpeedMult: 1.16,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.4,
    threatInitialDelayMs: 720,
    dangerWaveEliteHealthScalar: 0.74,
    dangerWaveEliteFireDelayMult: 0.96,
    dangerWaveEliteSpecialDelayMs: 700,
    diveBiasMult: 1.05,
    entrySpeedMult: 0.93
  },
  {
    id: 'early_late_bridge',
    minLevel: 16,
    maxLevel: 19,
    targetIncreaseRange: [0.2, 0.35],
    fireChanceMult: 1.19,
    projectileSpeedMult: 1.48,
    enemySpeedMult: 1.05,
    tacticFireMult: 1.17,
    tacticFireDelayMult: 0.925,
    challengeChanceMult: 1.35,
    challengeChanceBonus: 0.035,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.18,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.16,
    dangerWaveFireMult: 1.23,
    dangerWaveFireDelayMult: 0.89,
    dangerWaveProjectileSpeedMult: 1.16,
    threatProjectileSpeedMult: 1.16,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.4,
    threatInitialDelayMs: 700,
    dangerWaveEliteHealthScalar: 0.78,
    dangerWaveEliteFireDelayMult: 0.96,
    dangerWaveEliteSpecialDelayMs: 720,
    diveBiasMult: 1.04,
    entrySpeedMult: 0.95
  },
  {
    id: 'late_run_attrition',
    minLevel: 20,
    maxLevel: 29,
    targetIncreaseRange: [0.08, 0.12],
    fireChanceMult: 1.22,
    projectileSpeedMult: 1.58,
    enemySpeedMult: 1.055,
    tacticFireMult: 1.18,
    tacticFireDelayMult: 0.92,
    waveEnemyCountBonus: 1,
    waveEnemyMaxBonus: 1,
    challengeChanceMult: 1.55,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.28,
    eliteSecondSlotChance: 0.34,
    threatDangerBudgetBonus: 2,
    threatMaxActiveBonus: 1,
    threatPlannedActionBonus: 1,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 1,
    dangerWaveCadenceMult: 1.16,
    dangerWaveFireMult: 1.22,
    dangerWaveFireDelayMult: 0.9,
    dangerWaveProjectileSpeedMult: 1.16,
    threatProjectileSpeedMult: 1.15,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.4,
    threatInitialDelayMs: 620,
    dangerWaveEliteHealthScalar: 0.82,
    dangerWaveEliteFireDelayMult: 0.92,
    dangerWaveEliteSpecialDelayMs: 650,
    diveBiasMult: 1.05,
    entrySpeedMult: 0.94
  },
  {
    id: 'overrun_rising',
    minLevel: 30,
    maxLevel: 39,
    targetIncreaseRange: [0.12, 0.16],
    fireChanceMult: 1.26,
    projectileSpeedMult: 1.7,
    enemySpeedMult: 1.065,
    tacticFireMult: 1.21,
    tacticFireDelayMult: 0.91,
    waveEnemyCountBonus: 2,
    waveEnemyMaxBonus: 2,
    challengeChanceMult: 1.75,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.4,
    eliteSecondSlotChance: 0.6,
    threatDangerBudgetBonus: 2,
    threatMaxActiveBonus: 1,
    threatPlannedActionBonus: 1,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 1,
    dangerWaveCadenceMult: 1.18,
    dangerWaveFireMult: 1.24,
    dangerWaveFireDelayMult: 0.89,
    dangerWaveProjectileSpeedMult: 1.17,
    threatProjectileSpeedMult: 1.16,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.38,
    threatInitialDelayMs: 660,
    dangerWaveEliteHealthScalar: 0.86,
    dangerWaveEliteFireDelayMult: 0.9,
    dangerWaveEliteSpecialDelayMs: 620,
    diveBiasMult: 1.06,
    entrySpeedMult: 0.93
  },
  {
    id: 'overrun_plateau_break',
    minLevel: 40,
    maxLevel: 49,
    targetIncreaseRange: [0.16, 0.22],
    fireChanceMult: 1.32,
    projectileSpeedMult: 1.84,
    enemySpeedMult: 1.075,
    tacticFireMult: 1.26,
    tacticFireDelayMult: 0.89,
    waveCountBonus: 1,
    waveEnemyCountBonus: 2,
    waveEnemyMaxBonus: 3,
    challengeChanceMult: 2,
    challengeWaveCountBonus: 2,
    multiEliteChanceMult: 1.55,
    multiEliteTriChance: 0.14,
    eliteSecondSlotChance: 0.86,
    threatDangerBudgetBonus: 3,
    threatMaxActiveBonus: 1,
    threatPlannedActionBonus: 2,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.2,
    dangerWaveFireMult: 1.26,
    dangerWaveFireDelayMult: 0.88,
    dangerWaveProjectileSpeedMult: 1.18,
    threatProjectileSpeedMult: 1.17,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.36,
    threatInitialDelayMs: 700,
    dangerWaveEliteHealthScalar: 0.9,
    dangerWaveEliteFireDelayMult: 0.88,
    dangerWaveEliteSpecialDelayMs: 580,
    diveBiasMult: 1.08,
    entrySpeedMult: 0.92
  },
  {
    id: 'deep_overrun',
    minLevel: 50,
    maxLevel: 999,
    targetIncreaseRange: [0.26, 0.38],
    fireChanceMult: 1.36,
    projectileSpeedMult: 1.95,
    enemySpeedMult: 1.09,
    tacticFireMult: 1.28,
    tacticFireDelayMult: 0.88,
    waveCountBonus: 1,
    waveEnemyCountBonus: 2,
    waveEnemyMaxBonus: 3,
    challengeChanceMult: 2.2,
    challengeWaveCountBonus: 2,
    multiEliteChanceMult: 1.65,
    multiEliteTriChance: 0.22,
    eliteSecondSlotChance: 0.94,
    threatDangerBudgetBonus: 3,
    threatMaxActiveBonus: 1,
    threatPlannedActionBonus: 2,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.2,
    dangerWaveFireMult: 1.26,
    dangerWaveFireDelayMult: 0.88,
    dangerWaveProjectileSpeedMult: 1.18,
    threatProjectileSpeedMult: 1.17,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.36,
    threatInitialDelayMs: 700,
    dangerWaveEliteHealthScalar: 0.92,
    dangerWaveEliteFireDelayMult: 0.86,
    dangerWaveEliteSpecialDelayMs: 560,
    diveBiasMult: 1.08,
    entrySpeedMult: 0.92
  }
]);

const COMPARE_KEYS = [
  'id',
  'fireChanceMult',
  'projectileSpeedMult',
  'enemySpeedMult',
  'tacticFireMult',
  'tacticFireDelayMult',
  'waveCountBonus',
  'waveEnemyCountBonus',
  'waveEnemyMaxBonus',
  'challengeChanceMult',
  'challengeChanceBonus',
  'challengeWaveCountBonus',
  'multiEliteChanceMult',
  'multiEliteTriChance',
  'eliteSecondSlotChance',
  'threatDangerBudgetBonus',
  'threatMaxActiveBonus',
  'threatPlannedActionBonus',
  'dangerWaveCount',
  'dangerWaveCountBonus',
  'dangerWaveCadenceMult',
  'dangerWaveFireMult',
  'dangerWaveFireDelayMult',
  'dangerWaveProjectileSpeedMult',
  'threatProjectileSpeedMult',
  'dangerWaveThreatDangerBudgetBonus',
  'dangerWaveThreatMaxActiveBonus',
  'dangerWaveThreatPlannedActionBonus',
  'threatInitialDelayMult',
  'threatInitialDelayMs',
  'dangerWaveEliteHealthScalar',
  'dangerWaveEliteFireDelayMult',
  'dangerWaveEliteSpecialDelayMs',
  'diveBiasMult',
  'entrySpeedMult'
];

function pct(value) {
  return Number((value * 100).toFixed(2));
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function rangeText([min, max]) {
  return `${pct(min)}-${pct(max)}%`;
}

function assertRange(label, ratio, range) {
  const increase = ratio - 1;
  if (increase < range[0] || increase > range[1]) {
    fail(`${label} practical increase ${pct(increase)}% outside target ${rangeText(range)}`);
  }
}

function v3Tuning(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const band = V3_BASELINE_BANDS.find((entry) => safeLevel >= entry.minLevel && safeLevel <= entry.maxLevel) || {};
  return { ...DEFAULT_V3_TUNING, ...band, level: safeLevel };
}

function tuning(level, source) {
  return source === 'current' ? getNormalWavePressureTuning(level) : v3Tuning(level);
}

function normalWaveCount(level, source) {
  const diff = BalanceConfig.difficulty;
  const currentTuning = tuning(level, source);
  const base = diff.wavesPerBossBase ?? 6;
  const perLevel = diff.wavesPerBossPerLevel ?? 0.03;
  const max = diff.wavesPerBossMax ?? 7;
  const min = diff.MIN_WAVES_BETWEEN_BOSSES ?? 6;
  const waveBonus = Math.max(0, Number(currentTuning.waveCountBonus) || 0);
  const planned = Math.round(base + Math.max(0, level - 1) * perLevel) + waveBonus;
  return Math.max(min, Math.min(max + waveBonus, planned));
}

function baseWaveEnemyCount(level, waveIndex = 0) {
  const diff = BalanceConfig.difficulty;
  const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
  if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) {
    return earlyCounts[waveIndex];
  }
  const averageVariance = Math.max(0, (diff.waveEnemyRandom ?? 1) - 1) / 2;
  const count = Math.round(
    (diff.waveEnemyBase ?? 7) +
    Math.max(0, level - 1) * (diff.waveEnemyPerLevel ?? 0.35) +
    Math.max(0, waveIndex) * (diff.waveEnemyPerWave ?? 0.45) +
    averageVariance
  );
  return Math.max(4, Math.min(diff.waveEnemyMax ?? 14, count));
}

function v3DangerMoment(level, waveIndex, waveCount) {
  const currentTuning = v3Tuning(level);
  const dangerWaveCount = Math.max(0, Math.floor(Number(currentTuning.dangerWaveCount) || 0));
  if (dangerWaveCount <= 0 || waveCount < 3) return null;
  const maxThreatIndex = Math.max(1, waveCount - 2);
  const candidates = [
    Math.min(maxThreatIndex, Math.max(1, Math.round(waveCount * 0.55))),
    Math.min(maxThreatIndex, Math.max(2, Math.round(waveCount * 0.78))),
    Math.min(maxThreatIndex, Math.max(1, Math.round(waveCount * 0.35)))
  ];
  const indices = [...new Set(candidates)].slice(0, dangerWaveCount);
  if (!indices.includes(waveIndex)) return null;
  return {
    countBonus: currentTuning.dangerWaveCountBonus || 0,
    cadenceMult: currentTuning.dangerWaveCadenceMult || 1,
    fireMult: currentTuning.dangerWaveFireMult || 1,
    fireDelayMult: currentTuning.dangerWaveFireDelayMult || 1,
    projectileSpeedMult: currentTuning.dangerWaveProjectileSpeedMult || 1,
    threatProjectileSpeedMult: currentTuning.threatProjectileSpeedMult || 1,
    threatDangerBudgetBonus: currentTuning.dangerWaveThreatDangerBudgetBonus || 0,
    threatMaxActiveBonus: currentTuning.dangerWaveThreatMaxActiveBonus || 0,
    threatPlannedActionBonus: currentTuning.dangerWaveThreatPlannedActionBonus || 0,
    threatInitialDelayMult: currentTuning.threatInitialDelayMult || 1,
    threatInitialDelayMs: currentTuning.threatInitialDelayMs || 0,
    eliteHealthScalar: currentTuning.dangerWaveEliteHealthScalar || 1,
    eliteFireDelayMult: currentTuning.dangerWaveEliteFireDelayMult || 1,
    eliteSpecialDelayMs: currentTuning.dangerWaveEliteSpecialDelayMs || 0
  };
}

function dangerMoment(level, waveIndex, waveCount, source) {
  return source === 'current'
    ? getNormalWaveDangerMoment(level, waveIndex, waveCount)
    : v3DangerMoment(level, waveIndex, waveCount);
}

function waveEnemyCount(level, waveIndex, source) {
  const diff = BalanceConfig.difficulty;
  const currentTuning = tuning(level, source);
  const waveCount = normalWaveCount(level, source);
  const moment = dangerMoment(level, waveIndex, waveCount, source);
  const max = (diff.waveEnemyMax ?? 14) +
    (Number(currentTuning.waveEnemyMaxBonus) || 0) +
    Math.max(0, Number(moment?.countBonus) || 0);
  const count = baseWaveEnemyCount(level, waveIndex) +
    (Number(currentTuning.waveEnemyCountBonus) || 0) +
    Math.max(0, Number(moment?.countBonus) || 0);
  return Math.max(4, Math.min(max, count));
}

function dangerWaveCount(level, source) {
  const waves = normalWaveCount(level, source);
  let count = 0;
  for (let wave = 0; wave < waves; wave += 1) {
    if (dangerMoment(level, wave, waves, source)) count += 1;
  }
  return count;
}

function levelDangerIndex(level, source) {
  const diff = BalanceConfig.difficulty;
  const currentTuning = tuning(level, source);
  const waves = normalWaveCount(level, source);
  const baseProjectileSpeed = Math.min(
    diff.enemyProjectileSpeedMax ?? 2.95,
    (diff.enemyProjectileSpeed ?? 1.65) + Math.max(0, level - 1) * (diff.enemyProjectileSpeedPerLevel ?? 0.056)
  );
  const fireChance = Math.min(
    diff.enemyFireChanceMax ?? 0.0095,
    (diff.enemyFireChance ?? 0.0042) + Math.max(0, level - 1) * (diff.enemyFireChancePerLevel ?? 0.00022)
  );
  let total = 0;

  for (let wave = 0; wave < waves; wave += 1) {
    const moment = dangerMoment(level, wave, waves, source);
    const count = waveEnemyCount(level, wave, source);
    const projectilePressure = baseProjectileSpeed *
      (currentTuning.projectileSpeedMult || 1) *
      (moment?.projectileSpeedMult || 1) *
      (moment?.threatProjectileSpeedMult || currentTuning.threatProjectileSpeedMult || 1);
    const cadencePressure =
      (currentTuning.tacticFireMult || 1) *
      (moment?.fireMult || 1) *
      (moment?.cadenceMult || 1) /
      Math.max(0.1, (currentTuning.tacticFireDelayMult || 1) * (moment?.fireDelayMult || 1));
    const threatTiming = moment
      ? 1 +
        Math.max(0, 1 - (moment.threatInitialDelayMult || 1)) * 0.14 +
        Math.max(0, Number(moment.threatInitialDelayMs) || 0) / 9000
      : 1;
    const threatBudget = 1 +
      Math.max(0, Number(currentTuning.threatDangerBudgetBonus) || 0) * 0.006 +
      Math.max(0, Number(currentTuning.threatPlannedActionBonus) || 0) * 0.006 +
      Math.max(0, Number(moment?.threatDangerBudgetBonus) || 0) * 0.012 +
      Math.max(0, Number(moment?.threatPlannedActionBonus) || 0) * 0.012;
    total += count *
      Math.pow(Math.max(0.1, fireChance * (currentTuning.fireChanceMult || 1)), 0.18) *
      Math.pow(projectilePressure, 0.5) *
      Math.pow(cadencePressure, 0.34) *
      Math.pow(threatTiming * threatBudget, 0.28);
  }

  const challengeChance = Math.min(
    0.18,
    ((diff.challengeWaveChance ?? 0.015) * (currentTuning.challengeChanceMult || 1)) +
    (level >= (Number(currentTuning.challengeMinLevel) || 1) ? (Number(currentTuning.challengeChanceBonus) || 0) : 0)
  );
  const challengePressure = 1 +
    challengeChance * 0.12 +
    (Number(currentTuning.challengeWaveCountBonus) || 0) * 0.006;
  const priorityPressure = 1 +
    Math.max(0, (currentTuning.multiEliteChanceMult || 1) - 1) * 0.025 +
    Math.max(0, Number(currentTuning.eliteSecondSlotChance) || 0) * 0.01;

  return total * challengePressure * priorityPressure;
}

function bandSummary(label, levels) {
  const ratios = levels.map((level) => levelDangerIndex(level, 'current') / Math.max(1, levelDangerIndex(level, 'v3')));
  return {
    label,
    levels: `${Math.min(...levels)}-${Math.max(...levels)}`,
    ratio: round(ratios.reduce((sum, value) => sum + value, 0) / ratios.length, 4),
    increasePct: pct(ratios.reduce((sum, value) => sum + value, 0) / ratios.length - 1),
    perLevel: Object.fromEntries(levels.map((level, index) => [level, pct(ratios[index] - 1)])),
    dangerWaves: Object.fromEntries(levels.map((level) => [level, dangerWaveCount(level, 'current')]))
  };
}

function assertUnchanged(levels, label) {
  for (const level of levels) {
    const before = v3Tuning(level);
    const after = getNormalWavePressureTuning(level);
    for (const key of COMPARE_KEYS) {
      const expected = before[key] ?? DEFAULT_V3_TUNING[key] ?? null;
      const actual = after[key] ?? DEFAULT_V3_TUNING[key] ?? null;
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        fail(`${label} level ${level} changed ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    }
  }
}

function assertProtectedSurfaces() {
  const changedFiles = execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim().replaceAll('\\', '/'))
    .filter(Boolean);
  const blockedExact = new Set([
    'src/entities/Boss.js',
    'src/game/BossFactory.js',
    'src/config/BossRoster.js',
    'src/shared/ScorePolicy.js',
    'src/steamCloudPersistence.js'
  ]);
  const blockedPrefixes = [
    'src/leaderboard/',
    'src/achievements/',
    'src/progression/',
    'src/config/Ship',
    'electron/steam',
    'release/steamworks/'
  ];
  const protectedChanges = changedFiles.filter((file) =>
    blockedExact.has(file) || blockedPrefixes.some((prefix) => file.startsWith(prefix))
  );
  if (protectedChanges.length) {
    fail(`protected score/leaderboard/save/achievement/ship/unlock/Steam/boss files changed: ${protectedChanges.join(', ')}`);
  }

  const balanceDiff = execFileSync('git', ['diff', '--unified=0', 'HEAD', '--', 'src/config/BalanceConfig.js'], { encoding: 'utf8' });
  const protectedBalanceLines = balanceDiff
    .split(/\r?\n/)
    .filter((line) => /^[+-](?![+-]{2})/.test(line))
    .filter((line) => /\b(boss|score|leaderboard|steam|save|achievement|ship|unlock|reward|powerup|life|lives)\b/i.test(line));
  if (protectedBalanceLines.length) {
    fail(`BalanceConfig diff touched protected non-tuning keys: ${protectedBalanceLines.join(' | ')}`);
  }

  if (BalanceConfig.powerups.dropChance !== 0.018 ||
      BalanceConfig.powerups.maxPerLevel !== 2 ||
      BalanceConfig.powerups.extraLifeChance !== 0.03) {
    fail('powerup tuning changed or was nerfed');
  }
  if (BalanceConfig.rewards.waveClearScoreBase !== 500 ||
      BalanceConfig.rewards.levelClearScore !== 1000) {
    fail('score reward tuning changed');
  }

  const packageJson = readFileSync('package.json', 'utf8');
  const leaderboardTypes = readFileSync('src/leaderboard/LeaderboardTypes.js', 'utf8');
  const steamBridge = readFileSync('electron/steamLeaderboardBridge.cjs', 'utf8');
  if (!packageJson.includes('"check:early-mid-wave-tighten"')) {
    fail('package.json missing check:early-mid-wave-tighten script');
  }
  if (!leaderboardTypes.includes(`STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
    fail(`LeaderboardTypes does not preserve ${EXPECTED_LEADERBOARD}`);
  }
  if (!steamBridge.includes(`DEFAULT_STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
    fail(`Steam bridge does not preserve ${EXPECTED_LEADERBOARD}`);
  }
  if (!steamBridge.includes(`DEFAULT_STEAM_APP_ID = ${EXPECTED_APP_ID}`)) {
    fail(`Steam bridge does not preserve AppID ${EXPECTED_APP_ID}`);
  }
  return changedFiles;
}

const summaries = [
  bandSummary('Level 1 to 2', [1, 2]),
  bandSummary('Level 3 to 5', [3, 4, 5]),
  bandSummary('Level 6 to 10', [6, 7, 8, 9, 10]),
  bandSummary('Level 11 to 15', [11, 12, 13, 14, 15]),
  bandSummary('Level 16 to 20', [16, 17, 18, 19, 20]),
  bandSummary('Level 20 to 30', [20, 25, 30]),
  bandSummary('Level 30 plus', [30, 35, 40, 45, 50, 60]),
  bandSummary('Level 50 plus', [50, 60])
];
const byLabel = new Map(summaries.map((summary) => [summary.label, summary]));

assertRange('Level 1 to 2', byLabel.get('Level 1 to 2').ratio, [0, 0.03]);
assertRange('Level 3 to 5', byLabel.get('Level 3 to 5').ratio, [0.11, 0.2]);
assertRange('Level 6 to 10', byLabel.get('Level 6 to 10').ratio, [0.2, 0.32]);
assertRange('Level 11 to 15', byLabel.get('Level 11 to 15').ratio, [0.09, 0.16]);
assertRange('Level 16 to 20', byLabel.get('Level 16 to 20').ratio, [0.18, 0.28]);
assertRange('Level 20 to 30', byLabel.get('Level 20 to 30').ratio, [0.04, 0.1]);
assertRange('Level 30 plus', byLabel.get('Level 30 plus').ratio, [-0.005, 0.005]);
assertRange('Level 50 plus', byLabel.get('Level 50 plus').ratio, [-0.005, 0.005]);

if (getNormalWavePressureTuning(1).id !== 'opening_readable' ||
    getNormalWavePressureTuning(2).id !== 'opening_readable') {
  fail('opening levels changed pressure band');
}
if (getNormalWavePressureTuning(20).id !== 'sector_twenty_gate') {
  fail('level 20 should use the focused sector_twenty_gate band');
}
if (getNormalWavePressureTuning(21).id !== 'late_run_attrition') {
  fail('level 21 should return to the preserved late_run_attrition band');
}
if (dangerWaveCount(1, 'current') !== 0 || dangerWaveCount(2, 'current') !== 0) {
  fail('levels 1 to 2 must remain conservative with no deterministic danger waves');
}
if (dangerWaveCount(6, 'current') < 2 || dangerWaveCount(10, 'current') < 2) {
  fail('levels 6 to 10 must keep at least two danger waves');
}
if (dangerWaveCount(16, 'current') < 3 || dangerWaveCount(20, 'current') < 3) {
  fail('levels 16 to 20 must keep at least three danger waves');
}

assertUnchanged([21, 25, 29], 'post-sector-20 continuity');
assertUnchanged([30, 35, 40, 45, 50, 60], 'level 30 plus preservation');
const changedFiles = assertProtectedSurfaces();

if (errors.length) {
  console.error(`[early-mid-wave-tighten] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(JSON.stringify({ summaries, changedFiles }, null, 2));
  process.exit(1);
}

console.log(`[early-mid-wave-tighten] PASS ${summaries.map((summary) => `${summary.levels}:${summary.increasePct}%`).join(' ')}`);
console.log(JSON.stringify({
  summaries,
  changedFiles,
  invariants: {
    appId: EXPECTED_APP_ID,
    leaderboard: EXPECTED_LEADERBOARD,
    bossContribution: 0,
    powerupsNerfed: false,
    scoreChanged: false,
    level30PlusPreserved: true,
    level50PlusPreserved: true
  }
}, null, 2));
