import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { getNormalWavePressureTuning } from '../src/config/BalanceConfig.js';

const EXPECTED_APP_ID = '4765070';
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
  challengeWaveCountBonus: 0,
  multiEliteChanceMult: 1,
  multiEliteTriChance: 0,
  eliteSecondSlotChance: 0,
  threatDangerBudgetBonus: 0,
  threatMaxActiveBonus: 0,
  threatPlannedActionBonus: 0,
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

const APPROVED_BUILD_23613899_BANDS = Object.freeze([
  {
    id: 'opening_readable',
    minLevel: 1,
    maxLevel: 2,
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
    fireChanceMult: 1.145,
    projectileSpeedMult: 1.16,
    enemySpeedMult: 1.032,
    tacticFireMult: 1.115,
    tacticFireDelayMult: 0.948,
    multiEliteChanceMult: 1.2,
    challengeChanceMult: 1.42,
    challengeChanceBonus: 0.037,
    dangerWaveCount: 1,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.155,
    dangerWaveFireMult: 1.225,
    dangerWaveFireDelayMult: 0.885,
    dangerWaveProjectileSpeedMult: 1.115,
    threatProjectileSpeedMult: 1.095,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.44,
    threatInitialDelayMs: 660,
    dangerWaveEliteHealthScalar: 0.6,
    dangerWaveEliteFireDelayMult: 1.08,
    dangerWaveEliteSpecialDelayMs: 860,
    diveBiasMult: 1.02,
    entrySpeedMult: 0.94
  },
  {
    id: 'early_kill_window',
    minLevel: 6,
    maxLevel: 10,
    fireChanceMult: 1.2,
    projectileSpeedMult: 1.34,
    enemySpeedMult: 1.045,
    tacticFireMult: 1.19,
    tacticFireDelayMult: 0.92,
    challengeChanceMult: 1.68,
    challengeChanceBonus: 0.05,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.18,
    dangerWaveCount: 2,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.19,
    dangerWaveFireMult: 1.31,
    dangerWaveFireDelayMult: 0.855,
    dangerWaveProjectileSpeedMult: 1.19,
    threatProjectileSpeedMult: 1.18,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.39,
    threatInitialDelayMs: 760,
    dangerWaveEliteHealthScalar: 0.68,
    dangerWaveEliteFireDelayMult: 0.98,
    dangerWaveEliteSpecialDelayMs: 700,
    diveBiasMult: 1.05,
    entrySpeedMult: 0.93
  },
  {
    id: 'serious_run',
    minLevel: 11,
    maxLevel: 15,
    fireChanceMult: 1.205,
    projectileSpeedMult: 1.425,
    enemySpeedMult: 1.05,
    tacticFireMult: 1.19,
    tacticFireDelayMult: 0.915,
    challengeChanceMult: 1.63,
    challengeChanceBonus: 0.048,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.2,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.19,
    dangerWaveFireMult: 1.3,
    dangerWaveFireDelayMult: 0.86,
    dangerWaveProjectileSpeedMult: 1.18,
    threatProjectileSpeedMult: 1.18,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 2,
    threatInitialDelayMult: 0.385,
    threatInitialDelayMs: 780,
    dangerWaveEliteHealthScalar: 0.74,
    dangerWaveEliteFireDelayMult: 0.94,
    dangerWaveEliteSpecialDelayMs: 660,
    diveBiasMult: 1.05,
    entrySpeedMult: 0.93
  },
  {
    id: 'early_late_bridge',
    minLevel: 16,
    maxLevel: 19,
    fireChanceMult: 1.245,
    projectileSpeedMult: 1.56,
    enemySpeedMult: 1.055,
    tacticFireMult: 1.22,
    tacticFireDelayMult: 0.9,
    challengeChanceMult: 1.48,
    challengeChanceBonus: 0.04,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.18,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 3,
    dangerWaveCadenceMult: 1.2,
    dangerWaveFireMult: 1.32,
    dangerWaveFireDelayMult: 0.855,
    dangerWaveProjectileSpeedMult: 1.2,
    threatProjectileSpeedMult: 1.2,
    dangerWaveThreatDangerBudgetBonus: 2,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 3,
    threatInitialDelayMult: 0.365,
    threatInitialDelayMs: 820,
    dangerWaveEliteHealthScalar: 0.82,
    dangerWaveEliteFireDelayMult: 0.92,
    dangerWaveEliteSpecialDelayMs: 640,
    diveBiasMult: 1.04,
    entrySpeedMult: 0.94
  },
  {
    id: 'sector_twenty_gate',
    minLevel: 20,
    maxLevel: 20,
    fireChanceMult: 1.285,
    projectileSpeedMult: 1.66,
    enemySpeedMult: 1.06,
    tacticFireMult: 1.23,
    tacticFireDelayMult: 0.89,
    waveEnemyCountBonus: 1,
    waveEnemyMaxBonus: 1,
    challengeChanceMult: 1.65,
    challengeWaveCountBonus: 1,
    multiEliteChanceMult: 1.34,
    eliteSecondSlotChance: 0.42,
    threatDangerBudgetBonus: 3,
    threatMaxActiveBonus: 1,
    threatPlannedActionBonus: 2,
    dangerWaveCount: 3,
    dangerWaveCountBonus: 2,
    dangerWaveCadenceMult: 1.19,
    dangerWaveFireMult: 1.31,
    dangerWaveFireDelayMult: 0.855,
    dangerWaveProjectileSpeedMult: 1.2,
    threatProjectileSpeedMult: 1.2,
    dangerWaveThreatDangerBudgetBonus: 3,
    dangerWaveThreatMaxActiveBonus: 1,
    dangerWaveThreatPlannedActionBonus: 3,
    threatInitialDelayMult: 0.36,
    threatInitialDelayMs: 820,
    dangerWaveEliteHealthScalar: 0.84,
    dangerWaveEliteFireDelayMult: 0.9,
    dangerWaveEliteSpecialDelayMs: 620,
    diveBiasMult: 1.06,
    entrySpeedMult: 0.93
  },
  {
    id: 'late_run_attrition',
    minLevel: 21,
    maxLevel: 29,
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

const COMPARED_TUNING_KEYS = Object.freeze([
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
]);

function pct(value) {
  return Number((value * 100).toFixed(2));
}

function tuningFromBands(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const band = APPROVED_BUILD_23613899_BANDS.find((entry) => safeLevel >= entry.minLevel && safeLevel <= entry.maxLevel) || {};
  return { ...BASELINE_DEFAULT_TUNING, ...band, level: safeLevel };
}

function pressureIndex(tuning) {
  const core = (tuning.fireChanceMult || 1) *
    (tuning.projectileSpeedMult || 1) *
    (tuning.enemySpeedMult || 1) *
    ((tuning.tacticFireMult || 1) / (tuning.tacticFireDelayMult || 1));
  const dangerFire = (tuning.dangerWaveFireMult || 1) / (tuning.dangerWaveFireDelayMult || 1);
  const dangerProjection = (tuning.dangerWaveProjectileSpeedMult || 1) * (tuning.threatProjectileSpeedMult || 1);
  const dangerCadence = 1 +
    Math.max(0, (tuning.dangerWaveCadenceMult || 1) - 1) * 0.3 +
    Math.max(0, Number(tuning.dangerWaveCount) || 0) * 0.025 +
    Math.max(0, Number(tuning.dangerWaveCountBonus) || 0) * 0.01;
  const threatTiming = 1 +
    Math.max(0, 1 - (tuning.threatInitialDelayMult || 1)) * 0.14 +
    Math.max(0, Number(tuning.threatInitialDelayMs) || 0) / 10000;
  const threatBudget = 1 +
    Math.max(0, Number(tuning.threatDangerBudgetBonus) || 0) * 0.02 +
    Math.max(0, Number(tuning.threatMaxActiveBonus) || 0) * 0.02 +
    Math.max(0, Number(tuning.threatPlannedActionBonus) || 0) * 0.015 +
    Math.max(0, Number(tuning.dangerWaveThreatDangerBudgetBonus) || 0) * 0.018 +
    Math.max(0, Number(tuning.dangerWaveThreatMaxActiveBonus) || 0) * 0.018 +
    Math.max(0, Number(tuning.dangerWaveThreatPlannedActionBonus) || 0) * 0.014;
  const challenge = 1 +
    Math.max(0, (tuning.challengeChanceMult || 1) - 1) * 0.015 +
    Math.max(0, Number(tuning.challengeChanceBonus) || 0) * 0.28 +
    Math.max(0, Number(tuning.challengeWaveCountBonus) || 0) * 0.012;
  const elite = 1 +
    Math.max(0, (tuning.multiEliteChanceMult || 1) - 1) * 0.018 +
    Math.max(0, Number(tuning.multiEliteTriChance) || 0) * 0.025 +
    Math.max(0, Number(tuning.eliteSecondSlotChance) || 0) * 0.01;
  const density = 1 +
    Math.max(0, Number(tuning.waveCountBonus) || 0) * 0.04 +
    Math.max(0, Number(tuning.waveEnemyCountBonus) || 0) * 0.035 +
    Math.max(0, Number(tuning.waveEnemyMaxBonus) || 0) * 0.025;

  return Math.pow(core, 0.5) *
    Math.pow(dangerFire * dangerProjection * dangerCadence * threatTiming, 0.25) *
    Math.pow(threatBudget * challenge * elite * density, 0.35);
}

function bandSummary(label, levels) {
  const before = levels.reduce((sum, level) => sum + pressureIndex(tuningFromBands(level)), 0) / levels.length;
  const after = levels.reduce((sum, level) => sum + pressureIndex(getNormalWavePressureTuning(level)), 0) / levels.length;
  const ratio = after / Math.max(0.001, before);
  return {
    label,
    levels: levels.join(','),
    beforeIndex: Number((before * 100).toFixed(2)),
    afterIndex: Number((after * 100).toFixed(2)),
    increasePct: pct(ratio - 1)
  };
}

function assertIncrease(label, summary, minPct, maxPct) {
  const value = summary.increasePct;
  if (value < minPct || value > maxPct) {
    fail(`${label} normal-wave pressure ${value}% outside target ${minPct}-${maxPct}%`);
  }
}

const summaries = [
  bandSummary('Level 1 to 10', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  bandSummary('Level 11 to 20', [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
  bandSummary('Level 21 plus', [21, 25, 29, 30, 35, 40, 45, 50, 60])
];
const byLabel = new Map(summaries.map((summary) => [summary.label, summary]));

assertIncrease('Level 1 to 10', byLabel.get('Level 1 to 10'), 10, 14);
assertIncrease('Level 11 to 20', byLabel.get('Level 11 to 20'), 3.5, 6.5);
assertIncrease('Level 21 plus', byLabel.get('Level 21 plus'), -0.05, 0.05);

for (const level of [21, 25, 29, 30, 35, 39, 40, 45, 49, 50, 60]) {
  const before = tuningFromBands(level);
  const after = getNormalWavePressureTuning(level);
  for (const key of COMPARED_TUNING_KEYS) {
    if (before[key] !== after[key]) {
      fail(`level ${level} changed protected 21+ tuning key ${key}: ${before[key]} -> ${after[key]}`);
    }
  }
}

const changedFiles = execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .map((line) => line.trim().replaceAll('\\', '/'))
  .filter(Boolean);
const allowedFiles = new Set([
  'package.json',
  'scripts/check-difficulty-tuning.mjs',
  'scripts/check-early-mid-wave-tighten.mjs',
  'scripts/check-early-wave-threat.mjs',
  'scripts/check-final-release-difficulty-nudge.mjs',
  'src/config/BalanceConfig.js'
]);
const unexpectedFiles = changedFiles.filter((file) => !allowedFiles.has(file));
if (unexpectedFiles.length) {
  fail(`unexpected non-difficulty files changed: ${unexpectedFiles.join(', ')}`);
}

const forbiddenNames = [
  'src/scenes/ThreatCodexScene.js',
  'src/game/RunClearScoreBonuses.js',
  'src/config/OverrunMilestoneCelebrations.js',
  'src/shared/ScorePolicy.js'
];
const forbiddenPrefixes = [
  'src/leaderboard/',
  'src/achievements/',
  'src/progression/',
  'src/config/Ship',
  'electron/',
  'release/steamworks/'
];
const protectedChanges = changedFiles.filter((file) =>
  forbiddenNames.includes(file) || forbiddenPrefixes.some((prefix) => file.startsWith(prefix))
);
if (protectedChanges.length) {
  fail(`protected runtime/Steam/profile/progression/Codex/Overrun files changed: ${protectedChanges.join(', ')}`);
}

const leaderboardTypes = readFileSync('src/leaderboard/LeaderboardTypes.js', 'utf8');
const steamBridge = readFileSync('electron/steamLeaderboardBridge.cjs', 'utf8');
if (!leaderboardTypes.includes(`STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
  fail(`LeaderboardTypes does not preserve ${EXPECTED_LEADERBOARD}`);
}
if (!steamBridge.includes(`DEFAULT_STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
  fail(`Steam bridge does not preserve ${EXPECTED_LEADERBOARD}`);
}
if (!steamBridge.includes(`DEFAULT_STEAM_APP_ID = ${EXPECTED_APP_ID}`)) {
  fail(`Steam bridge does not preserve AppID ${EXPECTED_APP_ID}`);
}

if (errors.length) {
  console.error(`[final-release-difficulty-nudge] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(JSON.stringify({
    summaries,
    changedFiles,
    invariants: {
      appId: EXPECTED_APP_ID,
      leaderboard: EXPECTED_LEADERBOARD,
      bossContribution: 0,
      level21PlusPreserved: false
    }
  }, null, 2));
  process.exit(1);
}

console.log(`[final-release-difficulty-nudge] PASS L1-10 +${byLabel.get('Level 1 to 10').increasePct}% L11-20 +${byLabel.get('Level 11 to 20').increasePct}% L21+ ${byLabel.get('Level 21 plus').increasePct}%`);
console.log(JSON.stringify({
  summaries,
  changedFiles,
  invariants: {
    appId: EXPECTED_APP_ID,
    leaderboard: EXPECTED_LEADERBOARD,
    bossContribution: 0,
    level21PlusPreserved: true,
    codexLayoutChanged: false,
    overrunScoreChanged: false,
    overrunVoiceChanged: false,
    steamSettingsChanged: false
  }
}, null, 2));
