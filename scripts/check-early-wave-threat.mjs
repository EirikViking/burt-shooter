import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  BalanceConfig,
  getNormalWaveDangerMoment,
  getNormalWavePressureTuning
} from '../src/config/BalanceConfig.js';

const EXPECTED_LEADERBOARD = 'nova_swarm_global_score_v2';

const errors = [];
const fail = (message) => errors.push(message);

const BASELINE_DEFAULT_TUNING = Object.freeze({
  id: 'baseline',
  fireChanceMult: 1,
  projectileSpeedMult: 1,
  enemySpeedMult: 1,
  tacticFireMult: 1,
  tacticFireDelayMult: 1,
  waveCountBonus: 0,
  waveEnemyCountBonus: 0,
  waveEnemyMaxBonus: 0,
  challengeChanceMult: 1,
  challengeChanceBonus: 0,
  challengeMinLevel: 1,
  challengeWaveCountBonus: 0,
  multiEliteChanceMult: 1,
  multiEliteTriChance: 0,
  threatDangerBudgetBonus: 0,
  threatMaxActiveBonus: 0,
  threatPlannedActionBonus: 0,
  dangerWaveCount: 0
});

const BASELINE_304589_BANDS = Object.freeze([
  {
    id: 'opening_readable',
    minLevel: 1,
    maxLevel: 3,
    fireChanceMult: 1.032,
    projectileSpeedMult: 1.014,
    enemySpeedMult: 1.01,
    tacticFireMult: 1.018,
    tacticFireDelayMult: 0.994
  },
  {
    id: 'early_attrition',
    minLevel: 4,
    maxLevel: 10,
    fireChanceMult: 1.052,
    projectileSpeedMult: 1.022,
    enemySpeedMult: 1.018,
    tacticFireMult: 1.028,
    tacticFireDelayMult: 0.99,
    multiEliteChanceMult: 1.04
  },
  {
    id: 'serious_run',
    minLevel: 11,
    maxLevel: 19,
    fireChanceMult: 1.026,
    projectileSpeedMult: 1.014,
    enemySpeedMult: 1.01,
    tacticFireMult: 1.016,
    tacticFireDelayMult: 0.996,
    multiEliteChanceMult: 1.03
  },
  {
    id: 'late_run_attrition',
    minLevel: 20,
    maxLevel: 29,
    fireChanceMult: 1.056,
    projectileSpeedMult: 1.024,
    enemySpeedMult: 1.018,
    tacticFireMult: 1.032,
    tacticFireDelayMult: 0.99,
    challengeChanceMult: 1.15,
    multiEliteChanceMult: 1.12
  },
  {
    id: 'overrun_rising',
    minLevel: 30,
    maxLevel: 39,
    fireChanceMult: 1.048,
    projectileSpeedMult: 1.022,
    enemySpeedMult: 1.016,
    tacticFireMult: 1.03,
    tacticFireDelayMult: 0.992,
    waveEnemyCountBonus: 1,
    waveEnemyMaxBonus: 1,
    challengeChanceMult: 1.35,
    multiEliteChanceMult: 1.18,
    threatDangerBudgetBonus: 1
  },
  {
    id: 'overrun_plateau_break',
    minLevel: 40,
    maxLevel: 49,
    fireChanceMult: 1.064,
    projectileSpeedMult: 1.028,
    enemySpeedMult: 1.022,
    tacticFireMult: 1.044,
    tacticFireDelayMult: 0.99,
    waveEnemyCountBonus: 1,
    waveEnemyMaxBonus: 2,
    challengeChanceMult: 1.55,
    multiEliteChanceMult: 1.28,
    threatDangerBudgetBonus: 1
  },
  {
    id: 'deep_overrun',
    minLevel: 50,
    maxLevel: 999,
    fireChanceMult: 1.18,
    projectileSpeedMult: 1.08,
    enemySpeedMult: 1.06,
    tacticFireMult: 1.1,
    tacticFireDelayMult: 0.956,
    waveCountBonus: 1,
    waveEnemyCountBonus: 2,
    waveEnemyMaxBonus: 3,
    challengeChanceMult: 2.2,
    challengeWaveCountBonus: 2,
    multiEliteChanceMult: 1.65,
    multiEliteTriChance: 0.22,
    threatDangerBudgetBonus: 2,
    threatMaxActiveBonus: 1,
    threatPlannedActionBonus: 1
  }
]);

function pct(value) {
  return Number((value * 100).toFixed(1));
}

function assertRange(label, value, [min, max]) {
  if (value < min || value > max) {
    fail(`${label} practical normal-wave danger ${pct(value)}% outside target ${pct(min)}-${pct(max)}%`);
  }
}

function baselineTuning(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const band = BASELINE_304589_BANDS.find((entry) => safeLevel >= entry.minLevel && safeLevel <= entry.maxLevel) || {};
  return { ...BASELINE_DEFAULT_TUNING, ...band, level: safeLevel };
}

function currentTuning(level) {
  return getNormalWavePressureTuning(level);
}

function tuningFor(level, source) {
  return source === 'current' ? currentTuning(level) : baselineTuning(level);
}

function normalWaveCount(level, source) {
  const diff = BalanceConfig.difficulty;
  const tuning = tuningFor(level, source);
  const base = diff.wavesPerBossBase ?? diff.waveCountBase ?? 4;
  const perLevel = diff.wavesPerBossPerLevel ?? 0;
  const max = diff.wavesPerBossMax ?? diff.waveCountMax ?? 6;
  const min = diff.MIN_WAVES_BETWEEN_BOSSES ?? diff.minWavesBetweenBosses ?? 1;
  const waveBonus = Math.max(0, Number(tuning.waveCountBonus) || 0);
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

function dangerMomentFor(level, waveIndex, waveCount, source) {
  return source === 'current' ? getNormalWaveDangerMoment(level, waveIndex, waveCount) : null;
}

function waveEnemyCount(level, waveIndex, source) {
  const diff = BalanceConfig.difficulty;
  const tuning = tuningFor(level, source);
  const waveCount = normalWaveCount(level, source);
  const moment = dangerMomentFor(level, waveIndex, waveCount, source);
  const max = (diff.waveEnemyMax ?? 14) +
    (Number(tuning.waveEnemyMaxBonus) || 0) +
    Math.max(0, Number(moment?.countBonus) || 0);
  const count = baseWaveEnemyCount(level, waveIndex) +
    (Number(tuning.waveEnemyCountBonus) || 0) +
    (Number(moment?.countBonus) || 0);
  return Math.max(4, Math.min(max, count));
}

function challengeChance(level, source) {
  const diff = BalanceConfig.difficulty;
  const tuning = tuningFor(level, source);
  const minLevel = Number(tuning.challengeMinLevel) || 1;
  return Math.min(
    0.18,
    ((diff.challengeWaveChance ?? 0.015) * (tuning.challengeChanceMult || 1)) +
    (level >= minLevel ? (Number(tuning.challengeChanceBonus) || 0) : 0)
  );
}

function baseThreatBudget(level, enemyCount = 0, tuning = BASELINE_DEFAULT_TUNING) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const countBoost = enemyCount >= 10 ? 1 : 0;
  const base = safeLevel <= 1
    ? { maxActive: 1, dangerBudget: 1, plannedActions: Math.min(2, Math.max(1, enemyCount)) }
    : safeLevel <= 4
      ? { maxActive: 1, dangerBudget: 2, plannedActions: Math.min(2, Math.max(1, enemyCount)) }
      : safeLevel <= 8
        ? { maxActive: 2, dangerBudget: 3, plannedActions: Math.min(3, Math.max(1, enemyCount)) }
        : safeLevel <= 15
          ? { maxActive: 3, dangerBudget: 4, plannedActions: Math.min(4, Math.max(1, enemyCount)) }
          : { maxActive: Math.min(5, 3 + countBoost), dangerBudget: 5 + countBoost, plannedActions: Math.min(5, Math.max(1, enemyCount)) };
  const maxAssignable = Math.max(1, enemyCount || base.plannedActions);
  return {
    maxActive: Math.min(maxAssignable, base.maxActive + (Number(tuning.threatMaxActiveBonus) || 0)),
    dangerBudget: base.dangerBudget + (Number(tuning.threatDangerBudgetBonus) || 0),
    plannedActions: Math.min(maxAssignable, base.plannedActions + (Number(tuning.threatPlannedActionBonus) || 0))
  };
}

function waveDangerScore(level, waveIndex, source) {
  const waveCount = normalWaveCount(level, source);
  const tuning = tuningFor(level, source);
  const enemyCount = waveEnemyCount(level, waveIndex, source);
  const tacticFire = (tuning.tacticFireMult || 1) / (tuning.tacticFireDelayMult || 1);
  const core = (tuning.fireChanceMult || 1) *
    (tuning.projectileSpeedMult || 1) *
    (tuning.enemySpeedMult || 1) *
    tacticFire;
  const budget = baseThreatBudget(level, enemyCount, tuning);
  let score = enemyCount *
    Math.pow(core, 0.72) *
    (1 + Math.max(0, budget.dangerBudget - 1) * 0.012) *
    (1 + Math.max(0, budget.plannedActions - 1) * 0.01);

  const moment = dangerMomentFor(level, waveIndex, waveCount, source);
  if (moment) {
    const dangerFire = (moment.fireMult || 1) / (moment.fireDelayMult || 1);
    const threatTiming = 1 +
      Math.max(0, 1 - (moment.threatInitialDelayMult || 1)) * 0.22 +
      Math.max(0, Number(moment.threatInitialDelayMs) || 0) / 4200;
    const threatBudget = 1 +
      Math.max(0, Number(moment.threatDangerBudgetBonus) || 0) * 0.055 +
      Math.max(0, Number(moment.threatMaxActiveBonus) || 0) * 0.05 +
      Math.max(0, Number(moment.threatPlannedActionBonus) || 0) * 0.075;
    score *= Math.pow(dangerFire, 0.46) *
      Math.pow(moment.cadenceMult || 1, 0.16) *
      Math.pow(threatTiming * threatBudget, 0.72);
  }

  return score;
}

function practicalDangerRatio(level) {
  const beforeWaves = normalWaveCount(level, 'baseline');
  const afterWaves = normalWaveCount(level, 'current');
  let before = 0;
  let after = 0;
  for (let wave = 0; wave < beforeWaves; wave += 1) before += waveDangerScore(level, wave, 'baseline');
  for (let wave = 0; wave < afterWaves; wave += 1) after += waveDangerScore(level, wave, 'current');

  const beforeTuning = tuningFor(level, 'baseline');
  const afterTuning = tuningFor(level, 'current');
  const beforeChallenge = challengeChance(level, 'baseline');
  const afterChallenge = challengeChance(level, 'current');
  const challengeFactor = 1 +
    Math.max(0, afterChallenge - beforeChallenge) * 0.7 +
    Math.max(0, (Number(afterTuning.challengeWaveCountBonus) || 0) - (Number(beforeTuning.challengeWaveCountBonus) || 0)) * 0.012;
  const eliteFactor = 1 +
    Math.max(0, (afterTuning.multiEliteChanceMult || 1) - (beforeTuning.multiEliteChanceMult || 1)) * 0.12;

  return (after / Math.max(1, before)) * challengeFactor * eliteFactor;
}

function summarizeBand(label, start, end) {
  const levels = [];
  for (let level = start; level <= end; level += 1) levels.push(level);
  const ratio = levels.reduce((sum, level) => sum + practicalDangerRatio(level), 0) / levels.length;
  return {
    label,
    levels: `${start}-${end}`,
    beforeIndex: 100,
    afterIndex: Number((ratio * 100).toFixed(1)),
    increasePct: pct(ratio - 1)
  };
}

function dangerWaveCountForLevel(level) {
  const waveCount = normalWaveCount(level, 'current');
  let count = 0;
  for (let wave = 0; wave < waveCount; wave += 1) {
    if (getNormalWaveDangerMoment(level, wave, waveCount)) count += 1;
  }
  return count;
}

const summaries = [
  summarizeBand('levels 1 to 2', 1, 2),
  summarizeBand('levels 3 to 5', 3, 5),
  summarizeBand('levels 6 to 10', 6, 10),
  summarizeBand('levels 11 to 15', 11, 15),
  summarizeBand('levels 16 to 20', 16, 20),
  summarizeBand('levels 20 to 29', 20, 29),
  summarizeBand('levels 30 to 49', 30, 49),
  summarizeBand('levels 50 plus', 50, 60)
];
const byLabel = new Map(summaries.map((summary) => [summary.label, summary]));

assertRange('levels 1 to 2', byLabel.get('levels 1 to 2').increasePct / 100, [0, 0.05]);
assertRange('levels 3 to 5', byLabel.get('levels 3 to 5').increasePct / 100, [0.45, 0.65]);
assertRange('levels 6 to 10', byLabel.get('levels 6 to 10').increasePct / 100, [0.85, 1.25]);
assertRange('levels 11 to 15', byLabel.get('levels 11 to 15').increasePct / 100, [1.35, 1.9]);
assertRange('levels 16 to 20', byLabel.get('levels 16 to 20').increasePct / 100, [1.35, 2.05]);
assertRange('levels 20 to 29 runtime lethality step', byLabel.get('levels 20 to 29').increasePct / 100, [1.45, 2.15]);
assertRange('levels 30 to 49 practiced-player threat', byLabel.get('levels 30 to 49').increasePct / 100, [2.2, 3.2]);
assertRange('levels 50 plus remains dangerous', byLabel.get('levels 50 plus').increasePct / 100, [1.5, 2.3]);

if (dangerWaveCountForLevel(1) !== 0 || dangerWaveCountForLevel(2) !== 0) {
  fail('levels 1 to 2 must not add dedicated danger waves');
}
if (dangerWaveCountForLevel(3) < 1 || dangerWaveCountForLevel(5) < 1) {
  fail('levels 3 to 5 must add at least one normal-wave danger moment');
}
if (dangerWaveCountForLevel(6) < 2 || dangerWaveCountForLevel(10) < 2) {
  fail('levels 6 to 10 must add at least two normal-wave danger moments');
}
if (dangerWaveCountForLevel(11) < 2 || dangerWaveCountForLevel(15) < 2) {
  fail('levels 11 to 15 must add at least two normal-wave danger moments');
}
if (dangerWaveCountForLevel(16) < 3 || dangerWaveCountForLevel(20) < 3) {
  fail('levels 16 to 20 must add at least three normal-wave danger moments');
}
if (dangerWaveCountForLevel(30) < 3 || dangerWaveCountForLevel(40) < 3 || dangerWaveCountForLevel(50) < 3) {
  fail('level 30 plus must retain at least three normal-wave runtime danger moments');
}
if (!(challengeChance(5, 'current') >= challengeChance(5, 'baseline') + 0.03)) {
  fail('level 5 challenge-wave chance did not gain a meaningful early presence');
}
if (!(challengeChance(10, 'current') >= challengeChance(10, 'baseline') + 0.05)) {
  fail('level 10 challenge-wave chance did not gain a strong early presence');
}

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

const packageJson = readFileSync('package.json', 'utf8');
const leaderboardTypes = readFileSync('src/leaderboard/LeaderboardTypes.js', 'utf8');
const steamBridge = readFileSync('electron/steamLeaderboardBridge.cjs', 'utf8');
if (!packageJson.includes('"check:early-wave-threat"')) {
  fail('package.json missing check:early-wave-threat script');
}
if (!leaderboardTypes.includes(`STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
  fail(`LeaderboardTypes does not preserve ${EXPECTED_LEADERBOARD}`);
}
if (!steamBridge.includes(`DEFAULT_STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
  fail(`Steam bridge does not preserve ${EXPECTED_LEADERBOARD}`);
}

if (errors.length) {
  console.error(`[early-wave-threat] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(JSON.stringify({
    summaries,
    challengeChance: {
      level5Before: Number(challengeChance(5, 'baseline').toFixed(4)),
      level5After: Number(challengeChance(5, 'current').toFixed(4)),
      level10Before: Number(challengeChance(10, 'baseline').toFixed(4)),
      level10After: Number(challengeChance(10, 'current').toFixed(4))
    },
    dangerWaveCounts: Object.fromEntries([1, 2, 3, 5, 6, 10, 11, 15, 16, 20, 30, 40, 50].map((level) => [level, dangerWaveCountForLevel(level)])),
    changedFiles
  }, null, 2));
  process.exit(1);
}

console.log(`[early-wave-threat] PASS ${summaries.map((summary) => `${summary.levels}:${summary.increasePct}%`).join(' ')}`);
console.log(JSON.stringify({
  summaries,
  challengeChance: {
    level5Before: Number(challengeChance(5, 'baseline').toFixed(4)),
    level5After: Number(challengeChance(5, 'current').toFixed(4)),
    level10Before: Number(challengeChance(10, 'baseline').toFixed(4)),
    level10After: Number(challengeChance(10, 'current').toFixed(4))
  },
  dangerWaveCounts: Object.fromEntries([1, 2, 3, 5, 6, 10, 11, 15, 16, 20, 30, 40, 50].map((level) => [level, dangerWaveCountForLevel(level)])),
  changedFiles
}, null, 2));
