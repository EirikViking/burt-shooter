import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BalanceConfig,
  getNormalWaveDangerMoment,
  getNormalWaveDifficultyLevel,
  getNormalWavePressureTuning
} from '../src/config/BalanceConfig.js';
import {
  getSectorStartPlaySector,
  isSectorStartCheckpointUnlocked
} from '../src/game/RunMode.js';
import { STEAM_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const EXPECTED_NORMAL_WAVE_OFFSET = 9;
const EXPECTED_BOSS_BODY_METRIC_HASH = '07dbfa617171650ef8efa9cb78305984401764ebd9a931e2e09671d3eec6db72';
const EXPECTED_LEADERBOARD_NAME = 'nova_swarm_global_score_v2';
const EXPECTED_MIN_WAVES = 5;

function normalWaveCount(level) {
  const diff = BalanceConfig.difficulty;
  const base = diff.wavesPerBossBase ?? diff.waveCountBase ?? 4;
  const perLevel = diff.wavesPerBossPerLevel ?? 0;
  const max = diff.wavesPerBossMax ?? diff.waveCountMax ?? 6;
  const min = diff.MIN_WAVES_BETWEEN_BOSSES ?? diff.minWavesBetweenBosses ?? 1;
  const pressureTuning = getNormalWavePressureTuning(level);
  const waveBonus = Math.max(0, Number(pressureTuning.waveCountBonus) || 0);
  const planned = Math.round(base + Math.max(0, level - 1) * perLevel) + waveBonus;
  return Math.max(min, Math.min(max + waveBonus, planned));
}

function baseWaveEnemyCount(level, waveIndex = 0, variance = 0) {
  const diff = BalanceConfig.difficulty;
  const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
  if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) {
    return earlyCounts[waveIndex];
  }

  const levelScale = Math.max(0, level - 1);
  const waveScale = Math.max(0, waveIndex);
  const safeVariance = Math.max(0, Math.floor(Number(variance) || 0));
  const pressureTuning = getNormalWavePressureTuning(level);
  const count = Math.round(
    (diff.waveEnemyBase ?? 7) +
    levelScale * (diff.waveEnemyPerLevel ?? 0.35) +
    waveScale * (diff.waveEnemyPerWave ?? 0.45) +
    safeVariance +
    (Number(pressureTuning.waveEnemyCountBonus) || 0)
  );
  const max = (diff.waveEnemyMax ?? 14) + (Number(pressureTuning.waveEnemyMaxBonus) || 0);
  return Math.max(4, Math.min(max, count));
}

function waveMetricsForDifficultyLevel(level) {
  const diff = BalanceConfig.difficulty;
  const tuning = getNormalWavePressureTuning(level);
  const waveCount = normalWaveCount(level);
  const counts = [];
  const dangerMoments = [];

  for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
    const baseCount = baseWaveEnemyCount(level, waveIndex, 0);
    const moment = getNormalWaveDangerMoment(level, waveIndex, waveCount);
    if (!moment) {
      counts.push(baseCount);
      continue;
    }

    const max = (diff.waveEnemyMax ?? 14) +
      (Number(tuning.waveEnemyMaxBonus) || 0) +
      Math.max(0, Number(moment.countBonus) || 0);
    const count = Math.max(baseCount, Math.min(max, baseCount + Math.max(0, Number(moment.countBonus) || 0)));
    counts.push(count);
    dangerMoments.push({
      waveIndex,
      id: moment.id,
      formation: moment.formation,
      tactic: moment.tactic,
      eliteMiddleShipId: moment.eliteMiddleShipId || null,
      countBonus: Math.max(0, Number(moment.countBonus) || 0)
    });
  }

  const totalEnemies = counts.reduce((sum, count) => sum + count, 0);
  const pressureIndex = totalEnemies *
    (Number(tuning.fireChanceMult) || 1) *
    (Number(tuning.projectileSpeedMult) || 1) *
    (Number(tuning.enemySpeedMult) || 1) *
    (Number(tuning.tacticFireMult) || 1) /
    Math.max(0.01, Number(tuning.tacticFireDelayMult) || 1);

  return {
    level,
    tuningId: tuning.id,
    waveCount,
    counts,
    totalEnemies,
    averageEnemies: Number((totalEnemies / waveCount).toFixed(2)),
    fireChanceMult: tuning.fireChanceMult,
    projectileSpeedMult: tuning.projectileSpeedMult,
    enemySpeedMult: tuning.enemySpeedMult,
    tacticFireMult: tuning.tacticFireMult,
    tacticFireDelayMult: tuning.tacticFireDelayMult,
    dangerWaveCount: dangerMoments.length,
    dangerMoments,
    pressureIndex: Number(pressureIndex.toFixed(3))
  };
}

function currentMetricsForSector(sector) {
  const difficultyLevel = getNormalWaveDifficultyLevel(sector);
  return {
    sourceSector: sector,
    difficultyLevel,
    ...waveMetricsForDifficultyLevel(difficultyLevel)
  };
}

function bossMetricHash() {
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

function changedFiles() {
  const output = execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], {
    cwd: root,
    encoding: 'utf8'
  });
  return output.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

const diff = BalanceConfig.difficulty;
assert.equal(diff.normalWaveDifficultyLevelOffset, EXPECTED_NORMAL_WAVE_OFFSET, 'normal wave level offset should be +9');
assert.equal(diff.MIN_WAVES_BETWEEN_BOSSES, EXPECTED_MIN_WAVES, 'boss runway should now allow five normal waves before a boss');
assert.equal(diff.wavesPerBossBase, EXPECTED_MIN_WAVES, 'base normal-wave count should be five after the pacing trim');
assert.equal(getNormalWaveDifficultyLevel(1), 10, 'Sector 1 normal waves should use old Sector 10 difficulty');
assert.equal(getNormalWaveDifficultyLevel(2), 11, 'Sector 2 normal waves should continue as old Sector 11');
assert.equal(getNormalWaveDifficultyLevel(5), 14, 'Sector 5 normal waves should use old Sector 14 difficulty');

const oldSector10 = waveMetricsForDifficultyLevel(10);
const newSector1 = currentMetricsForSector(1);
assert.equal(newSector1.difficultyLevel, 10);
assert.equal(newSector1.waveCount, EXPECTED_MIN_WAVES, 'new Sector 1 should keep old Sector 10 intensity but trim one normal wave');
assert.equal(newSector1.tuningId, oldSector10.tuningId, 'new Sector 1 should land in old Sector 10 pressure band');
assert.deepEqual(newSector1.counts, oldSector10.counts, 'new Sector 1 counts should match old Sector 10 counts with deterministic variance');
assert.deepEqual(newSector1.dangerMoments, oldSector10.dangerMoments, 'new Sector 1 danger moments should match old Sector 10');
assert.ok(
  Math.abs(newSector1.pressureIndex - oldSector10.pressureIndex) <= 0.001,
  `new Sector 1 pressure ${newSector1.pressureIndex} should approximate old Sector 10 ${oldSector10.pressureIndex}`
);

const oldSector5 = waveMetricsForDifficultyLevel(5);
const newSector5 = currentMetricsForSector(5);
assert.ok(newSector5.difficultyLevel > oldSector5.level, 'new Sector 5 should map later than old Sector 5');
assert.ok(newSector5.totalEnemies > oldSector5.totalEnemies, `new Sector 5 enemies ${newSector5.totalEnemies} should exceed old Sector 5 ${oldSector5.totalEnemies}`);
assert.ok(newSector5.pressureIndex > oldSector5.pressureIndex, `new Sector 5 pressure ${newSector5.pressureIndex} should exceed old Sector 5 ${oldSector5.pressureIndex}`);

for (const sector of [1, 5, 10, 20, 30]) {
  const metrics = currentMetricsForSector(sector);
  assert.ok(metrics.waveCount >= 1, `Sector ${sector} should still generate normal waves`);
  assert.equal(metrics.counts.length, metrics.waveCount, `Sector ${sector} should report every normal wave count`);
  assert.ok(metrics.totalEnemies > 0, `Sector ${sector} should contain normal enemies`);
}

assert.equal(bossMetricHash(), EXPECTED_BOSS_BODY_METRIC_HASH, 'boss body difficulty metrics must remain unchanged');
assert.equal(getSectorStartPlaySector(5), 5, 'Sector 5 start should remain Sector 5');
assert.equal(getSectorStartPlaySector(10), 11, 'Checkpoint 10 should still start at Sector 11');
assert.equal(getSectorStartPlaySector(20), 21, 'Checkpoint 20 should still start at Sector 21');
assert.equal(getSectorStartPlaySector(30), 31, 'Checkpoint 30 should still start at Sector 31');
assert.equal(isSectorStartCheckpointUnlocked(10, { bestSector: 10, bestLevel: 10 }), false, 'Sector Run should not unlock Checkpoint 10 from Sector 10');
assert.equal(isSectorStartCheckpointUnlocked(10, { bestSector: 11, bestLevel: 11 }), true, 'Checkpoint 10 should unlock only after reaching Sector 11');

assert.equal(STEAM_LEADERBOARD_NAME, EXPECTED_LEADERBOARD_NAME, 'global leaderboard identity should remain unchanged');
const steamBridge = fs.readFileSync(path.join(root, 'electron', 'steamLeaderboardBridge.cjs'), 'utf8');
assert.ok(steamBridge.includes(`'${EXPECTED_LEADERBOARD_NAME}'`), 'Electron Steam bridge should still use the global leaderboard v2 name');

const protectedPrefixes = [
  'src/steamCloudPersistence.js',
  'electron/steamCloudSave.cjs',
  'electron/steamLeaderboardBridge.cjs'
];
const changed = changedFiles().map((entry) => entry.replaceAll(path.sep, '/'));
const protectedChanges = changed.filter((entry) => protectedPrefixes.some((prefix) => entry === prefix || entry.startsWith(prefix)));
assert.deepEqual(protectedChanges, [], `save, achievement, and leaderboard files should be unchanged: ${protectedChanges.join(', ')}`);

console.log('[normal-wave-difficulty-shift] PASS', {
  offset: EXPECTED_NORMAL_WAVE_OFFSET,
  newSector1,
  oldSector10,
  newSector5Pressure: newSector5.pressureIndex,
  oldSector5Pressure: oldSector5.pressureIndex,
  bossBodyMetricHash: EXPECTED_BOSS_BODY_METRIC_HASH,
  leaderboard: STEAM_LEADERBOARD_NAME
});
