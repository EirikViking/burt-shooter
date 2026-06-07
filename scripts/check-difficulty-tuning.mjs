import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { BalanceConfig, getNormalWavePressureTuning } from '../src/config/BalanceConfig.js';
import { getThreatBudgetForLevel } from '../src/config/EnemyThreatActions.js';

const EXPECTED_LEADERBOARD = 'nova_swarm_global_score_v2';

const errors = [];
const fail = (message) => errors.push(message);

function pct(value) {
  return Number((value * 100).toFixed(1));
}

function rangeText([min, max]) {
  return `${pct(min)}-${pct(max)}%`;
}

function assertRange(label, value, [min, max]) {
  if (value < min || value > max) {
    fail(`${label} increase ${pct(value)}% outside target ${rangeText([min, max])}`);
  }
}

function baseThreatBudget(level, enemyCount = 0) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const countBoost = enemyCount >= 10 ? 1 : 0;
  if (safeLevel <= 1) return { maxActive: 1, dangerBudget: 1, plannedActions: Math.min(2, Math.max(1, enemyCount)) };
  if (safeLevel <= 4) return { maxActive: 1, dangerBudget: 2, plannedActions: Math.min(2, Math.max(1, enemyCount)) };
  if (safeLevel <= 8) return { maxActive: 2, dangerBudget: 3, plannedActions: Math.min(3, Math.max(1, enemyCount)) };
  if (safeLevel <= 15) return { maxActive: 3, dangerBudget: 4, plannedActions: Math.min(4, Math.max(1, enemyCount)) };
  return { maxActive: Math.min(5, 3 + countBoost), dangerBudget: 5 + countBoost, plannedActions: Math.min(5, Math.max(1, enemyCount)) };
}

function baseNormalWaveCount(level) {
  const diff = BalanceConfig.difficulty;
  const base = diff.wavesPerBossBase ?? diff.waveCountBase ?? 4;
  const perLevel = diff.wavesPerBossPerLevel ?? 0;
  const max = diff.wavesPerBossMax ?? diff.waveCountMax ?? 6;
  const min = diff.MIN_WAVES_BETWEEN_BOSSES ?? diff.minWavesBetweenBosses ?? 1;
  return Math.max(min, Math.min(max, Math.round(base + Math.max(0, level - 1) * perLevel)));
}

function tunedNormalWaveCount(level) {
  const tuning = getNormalWavePressureTuning(level);
  return baseNormalWaveCount(level) + (Number(tuning.waveCountBonus) || 0);
}

function baseWaveEnemyCount(level, waveIndex = 0) {
  const diff = BalanceConfig.difficulty;
  const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
  if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) {
    return earlyCounts[waveIndex];
  }
  const levelScale = Math.max(0, level - 1);
  const waveScale = Math.max(0, waveIndex);
  const averageVariance = Math.max(0, (diff.waveEnemyRandom ?? 1) - 1) / 2;
  const count = Math.round(
    (diff.waveEnemyBase ?? 7) +
    levelScale * (diff.waveEnemyPerLevel ?? 0.35) +
    waveScale * (diff.waveEnemyPerWave ?? 0.45) +
    averageVariance
  );
  return Math.max(4, Math.min(diff.waveEnemyMax ?? 14, count));
}

function tunedWaveEnemyCount(level, waveIndex = 0) {
  const diff = BalanceConfig.difficulty;
  const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
  if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) {
    return earlyCounts[waveIndex];
  }
  const tuning = getNormalWavePressureTuning(level);
  const levelScale = Math.max(0, level - 1);
  const waveScale = Math.max(0, waveIndex);
  const averageVariance = Math.max(0, (diff.waveEnemyRandom ?? 1) - 1) / 2;
  const count = Math.round(
    (diff.waveEnemyBase ?? 7) +
    levelScale * (diff.waveEnemyPerLevel ?? 0.35) +
    waveScale * (diff.waveEnemyPerWave ?? 0.45) +
    averageVariance +
    (Number(tuning.waveEnemyCountBonus) || 0)
  );
  const max = (diff.waveEnemyMax ?? 14) + (Number(tuning.waveEnemyMaxBonus) || 0);
  return Math.max(4, Math.min(max, count));
}

function averageEnemyCount(level, tuned = false) {
  const waves = tuned ? tunedNormalWaveCount(level) : baseNormalWaveCount(level);
  let total = 0;
  for (let wave = 0; wave < waves; wave += 1) {
    total += tuned ? tunedWaveEnemyCount(level, wave) : baseWaveEnemyCount(level, wave);
  }
  return total / Math.max(1, waves);
}

function modeledPressureRatio(level) {
  const tuning = getNormalWavePressureTuning(level);
  const tacticFire = (tuning.tacticFireMult || 1) / (tuning.tacticFireDelayMult || 1);
  const core = (tuning.fireChanceMult || 1) *
    (tuning.projectileSpeedMult || 1) *
    (tuning.enemySpeedMult || 1) *
    tacticFire;

  const baseWaves = baseNormalWaveCount(level);
  const tunedWaves = tunedNormalWaveCount(level);
  const density = (tunedWaves * averageEnemyCount(level, true)) /
    Math.max(1, baseWaves * averageEnemyCount(level, false));

  const baseThreat = baseThreatBudget(level, Math.round(averageEnemyCount(level, false)));
  const tunedThreat = getThreatBudgetForLevel(level, Math.round(averageEnemyCount(level, true)));
  const threat = 1 +
    Math.max(0, tunedThreat.dangerBudget - baseThreat.dangerBudget) * 0.025 +
    Math.max(0, tunedThreat.maxActive - baseThreat.maxActive) * 0.025 +
    Math.max(0, tunedThreat.plannedActions - baseThreat.plannedActions) * 0.018;

  const challenge = 1 + Math.max(0, (tuning.challengeChanceMult || 1) - 1) * 0.015;
  const elite = 1 +
    Math.max(0, (tuning.multiEliteChanceMult || 1) - 1) * 0.018 +
    Math.max(0, tuning.multiEliteTriChance || 0) * 0.025;

  return Math.pow(core, 0.68) * Math.pow(density * threat * challenge * elite, 0.45);
}

function summarizeBand(label, start, end) {
  const levels = [];
  for (let level = start; level <= end; level += 1) levels.push(level);
  const ratio = levels.reduce((sum, level) => sum + modeledPressureRatio(level), 0) / levels.length;
  return {
    label,
    levels: `${start}-${end}`,
    beforeIndex: 100,
    afterIndex: Number((100 * ratio).toFixed(1)),
    increasePct: pct(ratio - 1)
  };
}

const summaries = [
  summarizeBand('levels 1 to 2', 1, 2),
  summarizeBand('levels 3 to 5', 3, 5),
  summarizeBand('levels 6 to 10', 6, 10),
  summarizeBand('levels 11 to 15', 11, 15),
  summarizeBand('levels 16 to 20', 16, 20),
  summarizeBand('levels 20 to 29', 20, 29),
  summarizeBand('levels 30 to 39', 30, 39),
  summarizeBand('levels 40 to 49', 40, 49),
  summarizeBand('levels 50 plus', 50, 60)
];

const summaryByLabel = new Map(summaries.map((summary) => [summary.label, summary]));

assertRange('levels 1 to 2 conservative opening', summaryByLabel.get('levels 1 to 2').increasePct / 100, [0.03, 0.07]);
assertRange('levels 3 to 5 early movement checks', summaryByLabel.get('levels 3 to 5').increasePct / 100, [0.08, 0.2]);
assertRange('levels 6 to 10 early kill window', summaryByLabel.get('levels 6 to 10').increasePct / 100, [0.12, 0.24]);
assertRange('levels 11 to 15 serious normal waves', summaryByLabel.get('levels 11 to 15').increasePct / 100, [0.14, 0.28]);
assertRange('levels 16 to 20 early-late bridge', summaryByLabel.get('levels 16 to 20').increasePct / 100, [0.1, 0.24]);
assertRange('levels 20 to 29', summaryByLabel.get('levels 20 to 29').increasePct / 100, [0.08, 0.12]);
assertRange('levels 30 to 39', summaryByLabel.get('levels 30 to 39').increasePct / 100, [0.12, 0.16]);
assertRange('levels 40 to 49', summaryByLabel.get('levels 40 to 49').increasePct / 100, [0.16, 0.22]);

const level50 = getNormalWavePressureTuning(50);
if ((summaryByLabel.get('levels 50 plus').increasePct / 100) < 0.26) {
  fail(`levels 50 plus deep step too small: ${summaryByLabel.get('levels 50 plus').increasePct}%`);
}
if ((Number(level50.waveCountBonus) || 0) < 1) fail('level 50 plus must add an extra normal wave');
if ((Number(level50.waveEnemyMaxBonus) || 0) < 3) fail('level 50 plus must raise the normal enemy cap');
if ((Number(level50.threatDangerBudgetBonus) || 0) < 2) fail('level 50 plus must raise threat-action budget');
if ((Number(level50.threatMaxActiveBonus) || 0) < 1) fail('level 50 plus must raise max active threat actions');
if ((Number(level50.multiEliteTriChance) || 0) < 0.2) fail('level 50 plus must allow rare tri-elite pressure');

const changedFiles = execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.replaceAll('\\', '/'));

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

const leaderboardTypes = readFileSync('src/leaderboard/LeaderboardTypes.js', 'utf8');
const steamBridge = readFileSync('electron/steamLeaderboardBridge.cjs', 'utf8');
if (!leaderboardTypes.includes(`STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
  fail(`LeaderboardTypes does not preserve ${EXPECTED_LEADERBOARD}`);
}
if (!steamBridge.includes(`DEFAULT_STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
  fail(`Steam bridge does not preserve ${EXPECTED_LEADERBOARD}`);
}

if (errors.length) {
  console.error(`[difficulty-tuning] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(JSON.stringify({ summaries, changedFiles }, null, 2));
  process.exit(1);
}

console.log(`[difficulty-tuning] PASS ${summaries.map((summary) => `${summary.levels}:${summary.increasePct}%`).join(' ')}`);
console.log(JSON.stringify({ summaries, changedFiles }, null, 2));
