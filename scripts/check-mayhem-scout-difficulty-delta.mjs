import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  BalanceConfig,
  getNormalWaveDangerMoment,
  getNormalWavePressureTuning
} from '../src/config/BalanceConfig.js';
import { getDefaultShipKey, getShipMetadata } from '../src/config/ShipMetadata.js';
import { RunPressureDirector } from '../src/game/RunPressureDirector.js';
import {
  RUN_MODES,
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  getRunModeProfile,
  getSectorStartCheckpoints,
  getSectorStartPlaySector,
  isSectorStartCheckpointUnlocked
} from '../src/game/RunMode.js';
import { STEAM_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/mayhem-scout-difficulty-delta-${timestamp()}`);
const sectors = [1, 5, 10, 20, 30];
const seeds = [101, 202, 303, 404, 505, 606, 707, 808, 909];
const minimumPressureDelta = 0.18;
const oldBaselineCommit = '8b381fac3bcee96ce47b00fb6bdf8aab848c3edc';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function round(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(digits));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

function normalWaveCount(level, config = BalanceConfig, tuningFn = getNormalWavePressureTuning) {
  const diff = config.difficulty;
  const tuning = tuningFn(level);
  const base = diff.wavesPerBossBase ?? diff.waveCountBase ?? 4;
  const perLevel = diff.wavesPerBossPerLevel ?? 0;
  const max = diff.wavesPerBossMax ?? diff.waveCountMax ?? 6;
  const min = diff.MIN_WAVES_BETWEEN_BOSSES ?? diff.minWavesBetweenBosses ?? 1;
  const waveBonus = Math.max(0, Number(tuning.waveCountBonus) || 0);
  const planned = Math.round(base + Math.max(0, level - 1) * perLevel) + waveBonus;
  return Math.max(min, Math.min(max + waveBonus, planned));
}

function baseWaveEnemyCount(level, waveIndex, rng, config = BalanceConfig, tuningFn = getNormalWavePressureTuning) {
  const diff = config.difficulty;
  const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
  if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) return earlyCounts[waveIndex];

  const tuning = tuningFn(level);
  const varianceRange = Math.max(1, Math.floor(Number(diff.waveEnemyRandom) || 1));
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

function hpPerEnemy(level, config = BalanceConfig) {
  const diff = config.difficulty;
  const hpScale = Math.min(
    diff.enemyHealthMaxMultiplier ?? Number.POSITIVE_INFINITY,
    (diff.baseEnemyHealthMultiplier ?? 1) + Math.max(0, level - 1) * (diff.hpScalePerLevel ?? 0)
  );
  return Math.ceil(hpScale);
}

function runModeBossDifficultyMult(mode) {
  return Math.max(0.1, Math.min(2, finite(getRunModeProfile(mode).bossDifficultyMult, 1)));
}

function runModeBossAttackDangerMult(mode) {
  const profile = getRunModeProfile(mode);
  return Math.max(0.1, Math.min(2,
    runModeBossDifficultyMult(mode) *
    Math.max(0.1, Math.min(2, finite(profile.bossAttackDangerMult, 1)))
  ));
}

function bossHp(sector, mode = RUN_MODES.RANKED, config = BalanceConfig) {
  const diff = config.difficulty;
  const rawHealth = Math.round((diff.bossBaseHealth ?? 40) + Math.max(0, sector - 1) * (diff.bossHealthPerLevel ?? 3.6));
  const healthBeforeEase = Math.max(rawHealth, diff.bossMinHealth || 70);
  const startsAt = Math.max(2, Math.round(Number(diff.bossPostFirstDifficultyStartsAt) || 2));
  const postFirstScalar = sector >= startsAt
    ? Math.max(0.1, Number(diff.bossPostFirstDifficultyScalar) || 1)
    : 1;
  const earlyMaxLevel = Math.max(1, Math.round(Number(diff.bossEarlyDifficultyMaxLevel) || 0));
  const earlyScalar = sector <= earlyMaxLevel
    ? Math.max(0.1, Number(diff.bossEarlyDifficultyScalar) || 1)
    : 1;
  const firstBossHealthScalar = sector === 1 ? 0.86 : 1;
  return Math.max(1, Math.round(
    healthBeforeEase *
    postFirstScalar *
    earlyScalar *
    firstBossHealthScalar *
    runModeBossDifficultyMult(mode)
  ));
}

function bossShootDelay(sector, phase, mode = RUN_MODES.RANKED, config = BalanceConfig) {
  const diff = config.difficulty;
  const baseDelay = phase === 1
    ? diff.bossShootDelayBase
    : phase === 2
      ? diff.bossShootDelayPhase2
      : diff.bossShootDelayPhase3;
  const openingDelayScalar = sector <= 1 ? 1.55 : sector === 2 ? 1.2 : 1;
  const startsAt = Math.max(2, Math.round(Number(diff.bossPostFirstDifficultyStartsAt) || 2));
  const postFirstScalar = sector >= startsAt
    ? Math.max(0.1, Number(diff.bossPostFirstDifficultyScalar) || 1)
    : 1;
  const earlyMaxLevel = Math.max(1, Math.round(Number(diff.bossEarlyDifficultyMaxLevel) || 0));
  const earlyScalar = sector <= earlyMaxLevel
    ? Math.max(0.1, Number(diff.bossEarlyDifficultyScalar) || 1)
    : 1;
  return (baseDelay * openingDelayScalar) / (postFirstScalar * earlyScalar * runModeBossAttackDangerMult(mode));
}

function bossProjectileSpeed(sector, phase, mode = RUN_MODES.RANKED, config = BalanceConfig) {
  const diff = config.difficulty;
  const fairness = diff.bossFairness || {};
  const baseSpeed = phase === 1
    ? diff.bossProjectileSpeedPhase1
    : phase === 2
      ? diff.bossProjectileSpeedPhase2
      : diff.bossProjectileSpeedPhase3;
  return Math.min(
    diff.bossProjectileSpeedMax ?? Number.POSITIVE_INFINITY,
    baseSpeed + Math.max(0, sector - 1) * (diff.bossProjectileSpeedPerLevel ?? 0)
  ) * finite(fairness.globalProjectileMultiplier, 1) * runModeBossAttackDangerMult(mode);
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

function metricForMode(mode, sector, seed) {
  const rng = mulberry32(seed + sector * 997);
  const director = new RunPressureDirector({
    runMode: mode,
    level: sector,
    runElapsedSeconds: 0
  });
  const effectiveLevel = director.getNormalWaveDifficultyLevel(sector);
  const tuning = director.getNormalWavePressureTuning(effectiveLevel);
  const multipliers = director.getMultipliers();
  const waveCount = normalWaveCount(effectiveLevel);
  const counts = [];
  let hpBudget = 0;
  let weightedFirePressure = 0;
  let weightedProjectilePressure = 0;
  let weightedEnemySpeedPressure = 0;
  let eliteThreatPressure = 0;
  let specialThreatPressure = 0;
  let dangerWaveCount = 0;

  for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
    const baseCount = baseWaveEnemyCount(effectiveLevel, waveIndex, rng);
    const moment = getNormalWaveDangerMoment(effectiveLevel, waveIndex, waveCount);
    const countBonus = Math.max(0, Number(moment?.countBonus) || 0);
    const max = (BalanceConfig.difficulty.waveEnemyMax ?? 14) +
      (Number(tuning.waveEnemyMaxBonus) || 0) +
      countBonus;
    const count = moment ? Math.max(baseCount, Math.min(max, baseCount + countBonus)) : baseCount;
    counts.push(count);
    hpBudget += count * hpPerEnemy(effectiveLevel);

    const firePressure = director.scaleEnemyFireChance(
      BalanceConfig.difficulty.enemyFireChance ?? 0.0042,
      effectiveLevel
    ) * finite(tuning.tacticFireMult, 1) / Math.max(0.01, finite(tuning.tacticFireDelayMult, 1)) *
      finite(moment?.fireMult, 1) / Math.max(0.01, finite(moment?.fireDelayMult, 1));
    const projectilePressure = director.scaleProjectileSpeed(
      BalanceConfig.difficulty.enemyProjectileSpeed ?? 1.65,
      effectiveLevel
    ) * finite(moment?.projectileSpeedMult, 1);
    const enemySpeedPressure = director.scaleEnemySpeed(
      BalanceConfig.difficulty.enemySpeedMultiplier ?? 0.78,
      effectiveLevel
    ) * finite(moment?.entrySpeedMult, 1) * finite(moment?.diveBiasMult, 1);

    weightedFirePressure += firePressure * count;
    weightedProjectilePressure += projectilePressure * count;
    weightedEnemySpeedPressure += enemySpeedPressure * count;

    const baseEliteChance = 0.045 * finite(tuning.multiEliteChanceMult, 1) +
      Math.max(0, finite(tuning.eliteSecondSlotChance, 0)) * 0.035 +
      Math.max(0, finite(tuning.multiEliteTriChance, 0)) * 0.025 +
      (moment?.eliteMiddleShipId ? 0.14 * finite(moment.eliteHealthScalar, 1) : 0);
    eliteThreatPressure += director.scaleEliteChance(baseEliteChance);

    const baseSpecialThreat = (
      0.045 * finite(tuning.challengeChanceMult, 1) +
      finite(tuning.challengeChanceBonus, 0) +
      Math.max(0, finite(tuning.threatDangerBudgetBonus, 0)) * 0.018 +
      Math.max(0, finite(tuning.threatMaxActiveBonus, 0)) * 0.025 +
      Math.max(0, finite(tuning.threatPlannedActionBonus, 0)) * 0.012 +
      Math.max(0, finite(moment?.threatDangerBudgetBonus, 0)) * 0.018 +
      Math.max(0, finite(moment?.threatMaxActiveBonus, 0)) * 0.025 +
      Math.max(0, finite(moment?.threatPlannedActionBonus, 0)) * 0.012 +
      (moment?.forcedThreatActionIds?.length || 0) * 0.015
    ) * finite(moment?.threatProjectileSpeedMult, 1);
    specialThreatPressure += director.scaleSpecialThreatChance(baseSpecialThreat);
    if (moment) dangerWaveCount += 1;
  }

  const totalEnemies = counts.reduce((sum, count) => sum + count, 0);
  const avgFire = weightedFirePressure / Math.max(1, totalEnemies);
  const avgProjectile = weightedProjectilePressure / Math.max(1, totalEnemies);
  const avgEnemySpeed = weightedEnemySpeedPressure / Math.max(1, totalEnemies);
  const eliteSpecial = 1 + (eliteThreatPressure / Math.max(1, waveCount)) + (specialThreatPressure / Math.max(1, waveCount));
  const incomingPressureIndex = totalEnemies *
    hpPerEnemy(effectiveLevel) *
    (avgFire / Math.max(0.0001, BalanceConfig.difficulty.enemyFireChance ?? 0.0042)) *
    (avgProjectile / Math.max(0.0001, BalanceConfig.difficulty.enemyProjectileSpeed ?? 1.65)) *
    (avgEnemySpeed / Math.max(0.0001, BalanceConfig.difficulty.enemySpeedMultiplier ?? 0.78)) *
    eliteSpecial *
    (1 + dangerWaveCount * 0.035);

  const dps = starterShipDps();
  const clearTimePressure = (hpBudget / Math.max(0.1, dps.rawDps * 0.42)) +
    waveCount * 4.1 +
    Math.max(0, waveCount - 1) * ((BalanceConfig.difficulty.waveDelayMs ?? 740) / 1000) +
    dangerWaveCount * 1.2;

  return {
    mode,
    sector,
    seed,
    profileId: director.getRunModeProfile().difficultyProfileId,
    effectiveNormalWaveDifficultyLevel: effectiveLevel,
    tuningId: tuning.id,
    waveCount,
    enemyCountEstimate: totalEnemies,
    waveEnemyCounts: counts,
    totalEnemyHpBudget: hpBudget,
    projectileFirePressure: round(avgFire * avgProjectile, 6),
    enemySpeedPressure: round(avgEnemySpeed, 6),
    firePressure: round(avgFire, 6),
    projectilePressure: round(avgProjectile, 6),
    eliteThreatPressure: round(eliteThreatPressure / Math.max(1, waveCount), 6),
    specialThreatPressure: round(specialThreatPressure / Math.max(1, waveCount), 6),
    dangerWaveCount,
    incomingPressureIndex: round(incomingPressureIndex, 3),
    clearTimePressureSeconds: round(clearTimePressure, 1),
    boss: {
      sector,
      hp: bossHp(sector, mode),
      difficultyMult: runModeBossDifficultyMult(mode),
      attackDangerMult: runModeBossAttackDangerMult(mode),
      phase1ShootDelay: round(bossShootDelay(sector, 1, mode), 3),
      phase2ShootDelay: round(bossShootDelay(sector, 2, mode), 3),
      phase3ShootDelay: round(bossShootDelay(sector, 3, mode), 3),
      phase1ProjectileSpeed: round(bossProjectileSpeed(sector, 1, mode), 3),
      phase2ProjectileSpeed: round(bossProjectileSpeed(sector, 2, mode), 3),
      phase3ProjectileSpeed: round(bossProjectileSpeed(sector, 3, mode), 3),
      changedByRunMode: runModeBossDifficultyMult(mode) !== 1 || runModeBossAttackDangerMult(mode) !== 1
    },
    pressureMultipliers: multipliers
  };
}

function average(entries, field) {
  return entries.reduce((sum, entry) => sum + finite(entry[field], 0), 0) / Math.max(1, entries.length);
}

function aggregate(mode, sector) {
  const samples = seeds.map((seed) => metricForMode(mode, sector, seed));
  const first = samples[0];
  return {
    mode,
    sector,
    profileId: first.profileId,
    effectiveNormalWaveDifficultyLevel: first.effectiveNormalWaveDifficultyLevel,
    tuningId: first.tuningId,
    waveCount: first.waveCount,
    enemyCountEstimateAvg: round(average(samples, 'enemyCountEstimate'), 2),
    enemyCountEstimateWorst: Math.max(...samples.map((entry) => entry.enemyCountEstimate)),
    totalEnemyHpBudgetAvg: round(average(samples, 'totalEnemyHpBudget'), 2),
    totalEnemyHpBudgetWorst: Math.max(...samples.map((entry) => entry.totalEnemyHpBudget)),
    projectileFirePressureAvg: round(average(samples, 'projectileFirePressure'), 6),
    enemySpeedPressureAvg: round(average(samples, 'enemySpeedPressure'), 6),
    eliteThreatPressureAvg: round(average(samples, 'eliteThreatPressure'), 6),
    specialThreatPressureAvg: round(average(samples, 'specialThreatPressure'), 6),
    dangerWaveCount: first.dangerWaveCount,
    incomingPressureIndexAvg: round(average(samples, 'incomingPressureIndex'), 3),
    incomingPressureIndexWorst: round(Math.max(...samples.map((entry) => entry.incomingPressureIndex)), 3),
    clearTimePressureSecondsAvg: round(average(samples, 'clearTimePressureSeconds'), 1),
    boss: first.boss,
    samples
  };
}

function ratio(numerator, denominator) {
  return round(numerator / Math.max(0.0001, denominator), 3);
}

function compareSector(sector) {
  const mayhem = aggregate(RUN_MODES.RANKED, sector);
  const scout = aggregate(RUN_MODES.SCOUT, sector);
  return {
    sector,
    mayhem,
    scout,
    scoutVsMayhem: {
      effectiveLevelDelta: scout.effectiveNormalWaveDifficultyLevel - mayhem.effectiveNormalWaveDifficultyLevel,
      enemyCountRatio: ratio(scout.enemyCountEstimateAvg, mayhem.enemyCountEstimateAvg),
      hpBudgetRatio: ratio(scout.totalEnemyHpBudgetAvg, mayhem.totalEnemyHpBudgetAvg),
      projectileFirePressureRatio: ratio(scout.projectileFirePressureAvg, mayhem.projectileFirePressureAvg),
      enemySpeedPressureRatio: ratio(scout.enemySpeedPressureAvg, mayhem.enemySpeedPressureAvg),
      eliteThreatPressureRatio: ratio(scout.eliteThreatPressureAvg, mayhem.eliteThreatPressureAvg),
      specialThreatPressureRatio: ratio(scout.specialThreatPressureAvg, mayhem.specialThreatPressureAvg),
      incomingPressureRatio: ratio(scout.incomingPressureIndexAvg, mayhem.incomingPressureIndexAvg),
      incomingPressureWorstRatio: ratio(scout.incomingPressureIndexWorst, mayhem.incomingPressureIndexWorst),
      clearTimePressureRatio: ratio(scout.clearTimePressureSecondsAvg, mayhem.clearTimePressureSecondsAvg),
      bossHpRatio: ratio(scout.boss.hp, mayhem.boss.hp),
      bossProjectileSpeedRatio: ratio(scout.boss.phase1ProjectileSpeed, mayhem.boss.phase1ProjectileSpeed),
      bossShootDelayRatio: ratio(scout.boss.phase1ShootDelay, mayhem.boss.phase1ShootDelay)
    }
  };
}

async function oldBaselineComparison() {
  try {
    const source = execFileSync('git', ['show', `${oldBaselineCommit}:src/config/BalanceConfig.js`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const oldModulePath = path.join(outputDir, 'old-baseline-BalanceConfig.mjs');
    writeFileSync(oldModulePath, source);
    const oldModule = await import(pathToFileURL(oldModulePath).href);
    const oldConfig = oldModule.BalanceConfig;
    const oldTuning = oldModule.getNormalWavePressureTuning;
    const oldDanger = oldModule.getNormalWaveDangerMoment;
    const rows = sectors.map((sector) => {
      const oldLevel = sector + Math.max(0, Math.floor(Number(oldConfig.difficulty?.normalWaveDifficultyLevelOffset) || 0));
      const waves = normalWaveCount(oldLevel, oldConfig, oldTuning);
      let enemiesTotal = 0;
      let hpTotal = 0;
      for (const seed of seeds) {
        const rng = mulberry32(seed + sector * 997);
        let enemies = 0;
        for (let waveIndex = 0; waveIndex < waves; waveIndex += 1) {
          const baseCount = baseWaveEnemyCount(oldLevel, waveIndex, rng, oldConfig, oldTuning);
          const tuning = oldTuning(oldLevel);
          const moment = oldDanger(oldLevel, waveIndex, waves);
          const bonus = Math.max(0, Number(moment?.countBonus) || 0);
          const max = (oldConfig.difficulty.waveEnemyMax ?? 14) +
            (Number(tuning.waveEnemyMaxBonus) || 0) +
            bonus;
          enemies += moment ? Math.max(baseCount, Math.min(max, baseCount + bonus)) : baseCount;
        }
        enemiesTotal += enemies;
        hpTotal += enemies * hpPerEnemy(oldLevel, oldConfig);
      }
      return {
        sector,
        effectiveNormalWaveDifficultyLevel: oldLevel,
        waveCount: waves,
        enemyCountEstimateAvg: round(enemiesTotal / seeds.length, 2),
        totalEnemyHpBudgetAvg: round(hpTotal / seeds.length, 2)
      };
    });
    return {
      available: true,
      commit: oldBaselineCommit,
      note: 'Old baseline comparison is limited to normal-wave level, wave count, enemy count, and HP budget because run-mode profiles did not exist there.',
      rows
    };
  } catch (error) {
    return {
      available: false,
      commit: oldBaselineCommit,
      error: error.message
    };
  }
}

function actualProfile(mode) {
  const profile = getRunModeProfile(mode);
  return {
    id: profile.id,
    difficultyProfileId: profile.difficultyProfileId,
    ranked: profile.ranked,
    submitsGlobalLeaderboard: profile.submitsGlobalLeaderboard,
    submitsLocalLeaderboard: profile.submitsLocalLeaderboard,
    unlocksAchievements: profile.unlocksAchievements,
    unlocksRankedCheckpoints: profile.unlocksRankedCheckpoints,
    updatesCareerProgress: profile.updatesCareerProgress,
    normalWaveDifficultyLevelOffsetDelta: profile.normalWaveDifficultyLevelOffsetDelta,
    bossDifficultyMult: profile.bossDifficultyMult,
    bossAttackDangerMult: profile.bossAttackDangerMult,
    normalWaveAggressionMult: profile.normalWaveAggressionMult,
    normalWaveScoreXpMult: profile.normalWaveScoreXpMult,
    pressureMultipliers: profile.pressureMultipliers
  };
}

function assertRunModeRules() {
  const mayhemProfile = getRunModeProfile(RUN_MODES.RANKED);
  const scoutProfile = getRunModeProfile(RUN_MODES.SCOUT);

  assert.equal(STEAM_LEADERBOARD_NAME, 'nova_swarm_global_score_v2');
  assert.equal(mayhemProfile.difficultyProfileId, 'accepted_harder_ranked');
  assert.equal(mayhemProfile.normalWaveDifficultyLevelOffsetDelta, 0);
  assert.equal(mayhemProfile.bossDifficultyMult, 1);
  assert.equal(mayhemProfile.bossAttackDangerMult, 1);
  assert.equal(mayhemProfile.normalWaveAggressionMult, 1);
  assert.equal(mayhemProfile.normalWaveScoreXpMult, 1.2);
  assert.equal(mayhemProfile.pressureMultipliers.fireChanceMult, 1);
  assert.equal(mayhemProfile.pressureMultipliers.projectileSpeedMult, 1);
  assert.equal(mayhemProfile.pressureMultipliers.enemySpeedMult, 1);
  assert.equal(mayhemProfile.pressureMultipliers.eliteChanceMult, 1);
  assert.equal(mayhemProfile.pressureMultipliers.specialThreatMult, 1);
  assert.equal(mayhemProfile.pressureMultipliers.scoreMult, 1);
  assert.equal(mayhemProfile.pressureMultipliers.sustainMult, 1);
  assert.equal(mayhemProfile.pressureMultipliers.contentRarityMult, 1);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.RANKED), true);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.RANKED), true);

  assert.equal(scoutProfile.difficultyProfileId, 'scout_lower_pressure_v1');
  assert.notEqual(scoutProfile.normalWaveDifficultyLevelOffsetDelta, mayhemProfile.normalWaveDifficultyLevelOffsetDelta);
  assert.equal(scoutProfile.normalWaveDifficultyLevelOffsetDelta, -3);
  assert.equal(scoutProfile.bossDifficultyMult, 0.75);
  assert.equal(scoutProfile.bossAttackDangerMult, 0.85);
  assert.equal(scoutProfile.normalWaveScoreXpMult, 1);
  assert.equal(runModeBossAttackDangerMult(RUN_MODES.SCOUT), 0.6375);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.SCOUT), false);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.SCOUT), false);
  assert.equal(scoutProfile.submitsLocalLeaderboard, false);
  assert.equal(scoutProfile.updatesCareerProgress, false);
  assert.equal(scoutProfile.unlocksRankedCheckpoints, false);

  const sectorProfile = getRunModeProfile(RUN_MODES.SECTOR_START);
  assert.equal(sectorProfile.bossDifficultyMult, 1);
  assert.equal(sectorProfile.bossAttackDangerMult, 1);
  assert.equal(sectorProfile.normalWaveDifficultyLevelOffsetDelta, 2);
  assert.equal(sectorProfile.normalWaveAggressionMult, 1);
  assert.equal(sectorProfile.normalWaveScoreXpMult, 1);
  assert.equal(sectorProfile.pressureMultipliers.fireChanceMult, 1);
  assert.equal(sectorProfile.pressureMultipliers.projectileSpeedMult, 1);
  assert.equal(sectorProfile.pressureMultipliers.enemySpeedMult, 1);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.SECTOR_START), false);
  assert.equal(sectorProfile.submitsGlobalLeaderboard, false);
  assert.equal(getSectorStartPlaySector(5), 5);
  assert.equal(getSectorStartPlaySector(10), 11);
  assert.equal(getSectorStartPlaySector(20), 21);
  assert.equal(getSectorStartPlaySector(30), 31);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 31, bestLevel: 31 }), [5, 10, 15, 20, 25, 30]);
  assert.equal(isSectorStartCheckpointUnlocked(10, { bestSector: 10, bestLevel: 10 }), false);
  assert.equal(isSectorStartCheckpointUnlocked(10, { bestSector: 11, bestLevel: 11 }), true);
}

function assertDifficultyDelta(comparisons) {
  for (const row of comparisons) {
    const label = `Sector ${row.sector}`;
    assert.ok(
      row.scout.effectiveNormalWaveDifficultyLevel < row.mayhem.effectiveNormalWaveDifficultyLevel,
      `${label}: Scout effective normal-wave level must be lower than Mayhem`
    );
    assert.ok(
      row.scoutVsMayhem.effectiveLevelDelta <= -3,
      `${label}: Scout should keep the lower-pressure effective normal-wave level delta`
    );
    assert.ok(
      row.scout.incomingPressureIndexAvg < row.mayhem.incomingPressureIndexAvg,
      `${label}: Scout incoming pressure must be lower`
    );
    assert.ok(
      row.scoutVsMayhem.incomingPressureRatio <= 1 - minimumPressureDelta,
      `${label}: Scout pressure ratio ${row.scoutVsMayhem.incomingPressureRatio} is too close to Mayhem`
    );
    assert.ok(
      row.scoutVsMayhem.incomingPressureWorstRatio <= 1 - minimumPressureDelta,
      `${label}: Scout worst-case pressure ratio ${row.scoutVsMayhem.incomingPressureWorstRatio} is too close to Mayhem`
    );
    assert.ok(row.scoutVsMayhem.projectileFirePressureRatio < 1, `${label}: Scout projectile/fire pressure should be lower`);
    assert.ok(row.scoutVsMayhem.enemySpeedPressureRatio < 1, `${label}: Scout enemy speed pressure should be lower`);
    assert.ok(row.scoutVsMayhem.eliteThreatPressureRatio < 1, `${label}: Scout elite threat pressure should be lower`);
    assert.ok(row.scoutVsMayhem.specialThreatPressureRatio < 1, `${label}: Scout special threat pressure should be lower`);
    assert.ok(row.scoutVsMayhem.bossHpRatio <= 0.77, `${label}: Scout boss HP should be about 25% lower`);
    assert.ok(row.scoutVsMayhem.bossHpRatio >= 0.72, `${label}: Scout boss HP reduction should stay near 25%`);
    assert.ok(
      row.scoutVsMayhem.bossProjectileSpeedRatio >= 0.637 && row.scoutVsMayhem.bossProjectileSpeedRatio <= 0.638,
      `${label}: Scout boss projectile speed should include the extra 15% attack relief`
    );
    assert.ok(row.scoutVsMayhem.bossShootDelayRatio > 1.55, `${label}: Scout boss firing delay should include the extra 15% attack relief`);
    assert.equal(row.mayhem.boss.difficultyMult, 1, `${label}: Mayhem boss multiplier must stay baseline`);
    assert.equal(row.mayhem.boss.attackDangerMult, 1, `${label}: Mayhem boss attack danger must stay baseline`);
    assert.equal(row.scout.boss.difficultyMult, 0.75, `${label}: Scout boss multiplier must be 0.75`);
    assert.equal(row.scout.boss.attackDangerMult, 0.6375, `${label}: Scout boss attack danger should be 15% lower than the existing Scout boss multiplier`);
    assert.equal(row.scout.boss.changedByRunMode, true, `${label}: Scout boss params should be mode-modified`);
  }
}

mkdirSync(outputDir, { recursive: true });
assertRunModeRules();

const comparisons = sectors.map(compareSector);
assertDifficultyDelta(comparisons);

const oldBaseline = await oldBaselineComparison();
const report = {
  generatedAt: new Date().toISOString(),
  outputDir,
  sectors,
  seeds,
  thresholds: {
    minimumPressureDelta,
    maxScoutIncomingPressureRatio: round(1 - minimumPressureDelta, 3)
  },
  starterShipDps: starterShipDps(),
  balanceInputs: {
    normalWaveDifficultyLevelOffset: BalanceConfig.difficulty.normalWaveDifficultyLevelOffset,
    wavesPerBossBase: BalanceConfig.difficulty.wavesPerBossBase,
    wavesPerBossPerLevel: BalanceConfig.difficulty.wavesPerBossPerLevel,
    wavesPerBossMax: BalanceConfig.difficulty.wavesPerBossMax,
    minWavesBetweenBosses: BalanceConfig.difficulty.MIN_WAVES_BETWEEN_BOSSES
  },
  profiles: {
    mayhem: actualProfile(RUN_MODES.RANKED),
    scout: actualProfile(RUN_MODES.SCOUT),
    sectorRun: actualProfile(RUN_MODES.SECTOR_START)
  },
  leaderboard: {
    global: STEAM_LEADERBOARD_NAME
  },
  comparisons,
  oldBaseline,
  conclusion: {
    scoutMeaningfullyEasier: true,
    scoutBossHpPreservedAtExisting25PercentReduction: true,
    scoutBossAttackDangerReducedByAdditional15Percent: true,
    mayhemNormalWavesFivePercentMoreAggressive: false,
    mayhemNormalWaveScoreXpCompensation: 1.2,
    mayhemBossesUnchanged: true,
    balanceCodeChangedByThisCheck: true,
    recommendation: 'Mayhem removes the final +5% normal-wave aggression and applies ranked normal-wave score/XP compensation while Scout boss relief stays intact.'
  }
};

writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const table = comparisons.map((row) => ({
  sector: row.sector,
  mayhemLevel: row.mayhem.effectiveNormalWaveDifficultyLevel,
  scoutLevel: row.scout.effectiveNormalWaveDifficultyLevel,
  enemyRatio: row.scoutVsMayhem.enemyCountRatio,
  hpRatio: row.scoutVsMayhem.hpBudgetRatio,
  pressureRatio: row.scoutVsMayhem.incomingPressureRatio,
  worstRatio: row.scoutVsMayhem.incomingPressureWorstRatio,
  clearTimeRatio: row.scoutVsMayhem.clearTimePressureRatio,
  bossHpRatio: row.scoutVsMayhem.bossHpRatio,
  bossProjectileRatio: row.scoutVsMayhem.bossProjectileSpeedRatio
}));

console.table(table);
console.log(`[mayhem-scout-difficulty-delta] PASS report=${path.join(outputDir, 'report.json')}`);
