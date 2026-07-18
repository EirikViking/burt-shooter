import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  BalanceConfig,
  getNormalWaveDangerMoment,
  getNormalWavePressureTuning
} from '../src/config/BalanceConfig.js';
import { getDefaultShipKey, getShipMetadata } from '../src/config/ShipMetadata.js';
import { getSectorStartPlaySector } from '../src/game/RunMode.js';
import { STEAM_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const EXPECTED_LEADERBOARD_NAME = 'nova_swarm_global_score_v2';
const EXPECTED_BOSS_BODY_HASH = 'd176c11fa649be954d636f883aa5271570d0686f7f804b39fbb091a692624860';
const EXPECTED_WAVES_PER_BOSS_BASE = 5;
const EXPECTED_MIN_WAVES_BETWEEN_BOSSES = 5;

const SCENARIOS = Object.freeze({
  oldSector10Baseline: Object.freeze({
    label: 'old Sector 10 baseline',
    normalWaveDifficultyOffset: 0,
    minWaves: 6,
    wavesBase: 6,
    wavesPerLevel: 0.03,
    wavesMax: 7
  }),
  raisedBeforePacingFix: Object.freeze({
    label: 'raised normal-wave difficulty before pacing fix',
    normalWaveDifficultyOffset: 9,
    minWaves: 6,
    wavesBase: 6,
    wavesPerLevel: 0.03,
    wavesMax: 7
  }),
  currentPacingFix: Object.freeze({
    label: 'current five-wave pacing fix',
    normalWaveDifficultyOffset: 9,
    minWaves: BalanceConfig.difficulty.MIN_WAVES_BETWEEN_BOSSES,
    wavesBase: BalanceConfig.difficulty.wavesPerBossBase,
    wavesPerLevel: BalanceConfig.difficulty.wavesPerBossPerLevel,
    wavesMax: BalanceConfig.difficulty.wavesPerBossMax
  })
});

const HIT_EFFICIENCIES = [0.25, 0.4, 0.55, 0.75];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function bossBodyMetricHash() {
  const bossRunwayKeys = new Set([
    'MIN_WAVES_BETWEEN_BOSSES',
    'MIN_SECONDS_BETWEEN_BOSSES',
    'bossIntervalCatchupWaveMax',
    'wavesPerBossBase',
    'wavesPerBossPerLevel',
    'wavesPerBossMax',
    'bossTargetIntervalSeconds',
    'estimatedWaveSeconds'
  ]);
  const entries = Object.entries(BalanceConfig.difficulty)
    .filter(([key]) =>
      (key.toLowerCase().startsWith('boss') || key.includes('Boss')) &&
      !bossRunwayKeys.has(key)
    )
    .sort(([a], [b]) => a.localeCompare(b));
  return createHash('sha256')
    .update(JSON.stringify(Object.fromEntries(entries)))
    .digest('hex');
}

function normalWaveCount(level, scenario) {
  const tuning = getNormalWavePressureTuning(level);
  const waveBonus = Math.max(0, Number(tuning.waveCountBonus) || 0);
  const planned = Math.round(
    scenario.wavesBase + Math.max(0, level - 1) * scenario.wavesPerLevel
  ) + waveBonus;
  return Math.max(scenario.minWaves, Math.min(scenario.wavesMax + waveBonus, planned));
}

function baseWaveEnemyCount(level, waveIndex = 0) {
  const diff = BalanceConfig.difficulty;
  const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
  if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) {
    return earlyCounts[waveIndex];
  }
  const tuning = getNormalWavePressureTuning(level);
  const count = Math.round(
    (diff.waveEnemyBase ?? 7) +
    Math.max(0, level - 1) * (diff.waveEnemyPerLevel ?? 0.35) +
    Math.max(0, waveIndex) * (diff.waveEnemyPerWave ?? 0.45) +
    (Number(tuning.waveEnemyCountBonus) || 0)
  );
  const max = (diff.waveEnemyMax ?? 14) + (Number(tuning.waveEnemyMaxBonus) || 0);
  return Math.max(4, Math.min(max, count));
}

function waveEnemyCount(level, waveIndex, waveCount) {
  const baseCount = baseWaveEnemyCount(level, waveIndex);
  const moment = getNormalWaveDangerMoment(level, waveIndex, waveCount);
  if (!moment) return { count: baseCount, danger: false };
  const tuning = getNormalWavePressureTuning(level);
  const max = (BalanceConfig.difficulty.waveEnemyMax ?? 14) +
    (Number(tuning.waveEnemyMaxBonus) || 0) +
    Math.max(0, Number(moment.countBonus) || 0);
  return {
    count: Math.max(baseCount, Math.min(max, baseCount + Math.max(0, Number(moment.countBonus) || 0))),
    danger: true
  };
}

function hpPerEnemy(level) {
  const diff = BalanceConfig.difficulty;
  const hpScale = Math.min(
    diff.enemyHealthMaxMultiplier ?? Number.POSITIVE_INFINITY,
    (diff.baseEnemyHealthMultiplier ?? 1) + Math.max(0, level - 1) * (diff.hpScalePerLevel ?? 0)
  );
  return Math.ceil(hpScale);
}

function sectorMetrics(sector, scenario) {
  const normalLevel = Math.max(1, sector + scenario.normalWaveDifficultyOffset);
  const waves = normalWaveCount(normalLevel, scenario);
  let enemies = 0;
  let hpBudget = 0;
  let dangerWaves = 0;
  const waveCounts = [];
  for (let waveIndex = 0; waveIndex < waves; waveIndex += 1) {
    const { count, danger } = waveEnemyCount(normalLevel, waveIndex, waves);
    waveCounts.push(count);
    enemies += count;
    hpBudget += count * hpPerEnemy(normalLevel);
    if (danger) dangerWaves += 1;
  }
  return {
    sector,
    normalWaveDifficultyLevel: normalLevel,
    waves,
    enemies,
    hpBudget,
    dangerWaves,
    waveCounts,
    waveClearScore: 500 * waves * (waves + 1) / 2,
    noHitBonus: 400 * waves,
    dropRolls: enemies
  };
}

function bossHp(level) {
  const diff = BalanceConfig.difficulty;
  const rawHealth = Math.round(diff.bossBaseHealth + Math.max(0, level - 1) * diff.bossHealthPerLevel);
  const healthBeforeEase = Math.max(rawHealth, diff.bossMinHealth || 70);
  const startsAt = Math.max(2, Math.round(Number(diff.bossPostFirstDifficultyStartsAt) || 2));
  const postFirstScalar = level >= startsAt
    ? Math.max(0.1, Number(diff.bossPostFirstDifficultyScalar) || 1)
    : 1;
  const earlyMaxLevel = Math.max(1, Math.round(Number(diff.bossEarlyDifficultyMaxLevel) || 0));
  const earlyScalar = level <= earlyMaxLevel
    ? Math.max(0.1, Number(diff.bossEarlyDifficultyScalar) || 1)
    : 1;
  const firstBossHealthScalar = level === 1 ? 0.86 : 1;
  return Math.max(1, Math.round(healthBeforeEase * postFirstScalar * earlyScalar * firstBossHealthScalar));
}

function starterShipDps() {
  const ship = getShipMetadata(getDefaultShipKey());
  const bullets = Math.max(1, Number(ship?.weapon?.bullets) || 1);
  const damage = Math.max(0.1, Number(ship?.stats?.damage) || 1);
  const fireRateMs = Math.max(1, Number(ship?.stats?.fireRate) || 120);
  return {
    ship: ship?.name || getDefaultShipKey(),
    damage,
    bullets,
    fireRateMs,
    rawDps: damage * bullets * (1000 / fireRateMs)
  };
}

function estimateSectorSeconds(metric, efficiency, dpsInfo) {
  const effectiveDps = Math.max(0.1, dpsInfo.rawDps * efficiency);
  const shootingSeconds = metric.hpBudget / effectiveDps;
  const wavePresentationSeconds = metric.waves * 4.1 + Math.max(0, metric.waves - 1) * 0.74 + metric.dangerWaves * 1.2;
  return shootingSeconds + wavePresentationSeconds;
}

function estimateBossSeconds(sector, efficiency, dpsInfo) {
  const effectiveDps = Math.max(0.1, dpsInfo.rawDps * efficiency);
  const hpSeconds = bossHp(sector) / effectiveDps;
  const patternReadSeconds = 63 + Math.min(16, sector * 0.9);
  return hpSeconds + patternReadSeconds;
}

function estimateRunThroughSector10(scenario, efficiency, dpsInfo) {
  const sectors = [];
  let normalSeconds = 0;
  let bossSeconds = 0;
  let enemies = 0;
  let hpBudget = 0;
  let waves = 0;
  let waveClearScore = 0;
  let noHitBonus = 0;
  let dropRolls = 0;
  for (let sector = 1; sector <= 10; sector += 1) {
    const metric = sectorMetrics(sector, scenario);
    const sectorNormalSeconds = estimateSectorSeconds(metric, efficiency, dpsInfo);
    const sectorBossSeconds = estimateBossSeconds(sector, efficiency, dpsInfo);
    sectors.push({
      ...metric,
      normalSeconds: Number(sectorNormalSeconds.toFixed(1)),
      bossSeconds: Number(sectorBossSeconds.toFixed(1))
    });
    normalSeconds += sectorNormalSeconds;
    bossSeconds += sectorBossSeconds;
    enemies += metric.enemies;
    hpBudget += metric.hpBudget;
    waves += metric.waves;
    waveClearScore += metric.waveClearScore;
    noHitBonus += metric.noHitBonus;
    dropRolls += metric.dropRolls;
  }
  return {
    label: scenario.label,
    hitEfficiency: efficiency,
    totalSeconds: Number((normalSeconds + bossSeconds).toFixed(1)),
    normalSeconds: Number(normalSeconds.toFixed(1)),
    bossSeconds: Number(bossSeconds.toFixed(1)),
    waves,
    enemies,
    hpBudget,
    waveClearScore,
    noHitBonus,
    dropRolls,
    sectors
  };
}

const dpsInfo = starterShipDps();
const report = {
  generatedAt: new Date().toISOString(),
  dpsInfo,
  bossBodyMetricHash: bossBodyMetricHash(),
  leaderboard: STEAM_LEADERBOARD_NAME,
  currentWaveSettings: {
    MIN_WAVES_BETWEEN_BOSSES: BalanceConfig.difficulty.MIN_WAVES_BETWEEN_BOSSES,
    wavesPerBossBase: BalanceConfig.difficulty.wavesPerBossBase,
    wavesPerBossPerLevel: BalanceConfig.difficulty.wavesPerBossPerLevel,
    wavesPerBossMax: BalanceConfig.difficulty.wavesPerBossMax
  },
  sectorStartPlaySectors: {
    sector5: getSectorStartPlaySector(5),
    checkpoint10: getSectorStartPlaySector(10),
    checkpoint20: getSectorStartPlaySector(20),
    checkpoint30: getSectorStartPlaySector(30)
  },
  measurements: HIT_EFFICIENCIES.map((hitEfficiency) => {
    const oldBaseline = estimateRunThroughSector10(SCENARIOS.oldSector10Baseline, hitEfficiency, dpsInfo);
    const raisedBefore = estimateRunThroughSector10(SCENARIOS.raisedBeforePacingFix, hitEfficiency, dpsInfo);
    const current = estimateRunThroughSector10(SCENARIOS.currentPacingFix, hitEfficiency, dpsInfo);
    return {
      hitEfficiency,
      oldBaseline,
      raisedBefore,
      current,
      raisedDeltaPct: Number((((raisedBefore.totalSeconds / oldBaseline.totalSeconds) - 1) * 100).toFixed(1)),
      currentDeltaPct: Number((((current.totalSeconds / oldBaseline.totalSeconds) - 1) * 100).toFixed(1)),
      recoveredPct: Number((((raisedBefore.totalSeconds - current.totalSeconds) / Math.max(1, raisedBefore.totalSeconds - oldBaseline.totalSeconds)) * 100).toFixed(1))
    };
  })
};

assert.equal(report.currentWaveSettings.MIN_WAVES_BETWEEN_BOSSES, EXPECTED_MIN_WAVES_BETWEEN_BOSSES);
assert.equal(report.currentWaveSettings.wavesPerBossBase, EXPECTED_WAVES_PER_BOSS_BASE);
assert.equal(report.bossBodyMetricHash, EXPECTED_BOSS_BODY_HASH, 'boss body tuning should stay unchanged');
assert.equal(report.leaderboard, EXPECTED_LEADERBOARD_NAME, 'leaderboard identity should stay unchanged');
assert.deepEqual(report.sectorStartPlaySectors, {
  sector5: 5,
  checkpoint10: 11,
  checkpoint20: 21,
  checkpoint30: 31
});

for (const row of report.measurements) {
  assert.ok(row.current.totalSeconds < row.raisedBefore.totalSeconds, `${row.hitEfficiency}: five-wave pacing should be faster than the raised-before state`);
  assert.ok(row.current.waves === row.raisedBefore.waves - 10, `${row.hitEfficiency}: sectors 1-10 should remove one normal wave per sector`);
  assert.equal(row.current.bossSeconds, row.raisedBefore.bossSeconds, `${row.hitEfficiency}: modeled boss seconds should be unchanged by normal-wave pacing`);
  for (const sector of [1, 5, 10]) {
    const currentSector = row.current.sectors.find((entry) => entry.sector === sector);
    assert.ok(currentSector?.waves >= EXPECTED_MIN_WAVES_BETWEEN_BOSSES, `Sector ${sector} should still generate normal waves`);
  }
}

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/sector10-clear-time-pacing-${timestamp()}`);
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const summary = report.measurements
  .map((row) => `${Math.round(row.hitEfficiency * 100)}%:${row.current.totalSeconds}s(${row.currentDeltaPct}%)`)
  .join(' ');
console.log(`[sector10-clear-time-pacing] PASS ${summary} report=${path.join(outputDir, 'report.json')}`);
