import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  getGeneratedEnemyProfile,
  getGeneratedEnemyTypeAtLevelProgress
} from '../src/config/GeneratedEnemyProfiles.js';
import { getDefaultShipKey, getShipMetadata } from '../src/config/ShipMetadata.js';
import { STEAM_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const BASELINES = [
  {
    id: 'old_easier_display_build',
    label: 'Old easier baseline before early wave difficulty',
    commit: '8b381fac3bcee96ce47b00fb6bdf8aab848c3edc'
  },
  {
    id: 'accepted_wave_pacing',
    label: 'Raised wave difficulty and pacing accepted source',
    commit: 'b7c8d7eafcb63c223cf2e21ee44aa776cd058dd1'
  },
  {
    id: 'current_early_boss_relief',
    label: 'Current build with early boss relief',
    commit: '0aad2d87782c10168579a5c089c90dd8d7c93950'
  }
];

const TARGET_SECTORS = [5, 10, 20, 30];
const EXPECTED_LEADERBOARD = 'nova_swarm_global_score_v2';
const WAVE_CLEAR_BASE = 500;
const NO_HIT_WAVE_BONUS = 400;
const SECTOR_CLEAR_BONUS = 1000;
const NO_HIT_SECTOR_BONUS = 1500;
const BOSS_SCORE = 1000;
const RUN_CLEAR_SECTOR = 10;
const RUN_CLEAR_BONUS = 10000;
const SPARE_LIFE_BONUS = 2500;
const SCORE_FORMULA_GUARD_FILES = [
  'src/game/Game.js',
  'src/scenes/PlayScene.js',
  'src/config/GeneratedEnemyProfiles.js',
  'src/leaderboard/LeaderboardTypes.js',
  'src/leaderboard/LeaderboardAdapter.js',
  'src/leaderboard/SteamLeaderboardProvider.js'
];

const SKILL_MODELS = [
  {
    id: 'low_combo_clear',
    label: 'Low combo clear',
    hitEfficiency: 0.25,
    combo: 'none',
    noHitWaveRate: 0,
    noHitSectorRate: 0,
    spareLivesAtRunClear: 0
  },
  {
    id: 'average_clear',
    label: 'Average clear',
    hitEfficiency: 0.4,
    combo: 'wave',
    noHitWaveRate: 0.35,
    noHitSectorRate: 0,
    spareLivesAtRunClear: 1
  },
  {
    id: 'perfect_clear',
    label: 'Perfect clear',
    hitEfficiency: 0.75,
    combo: 'sector',
    noHitWaveRate: 1,
    noHitSectorRate: 1,
    spareLivesAtRunClear: 3
  }
];

const CURATED_WAVES = {
  1: [
    { type: 'nova_enemy_001', count: 6 },
    { type: 'nova_enemy_003', count: 8 },
    { type: 'nova_enemy_001', count: 8 },
    { type: 'nova_enemy_003', count: 8 },
    { type: 'nova_enemy_003', count: 8 },
    { type: 'nova_enemy_003', count: 6 }
  ],
  2: [
    { type: 'nova_enemy_003', count: 7 },
    { type: 'nova_enemy_005', count: 8 },
    { type: 'nova_enemy_007', count: 8 },
    { type: 'nova_enemy_008', count: 9 },
    { type: 'nova_enemy_007', count: 9 },
    { type: 'nova_enemy_009', count: 10 }
  ],
  3: [
    { type: 'nova_enemy_005', count: 7 },
    { type: 'nova_enemy_008', count: 8 },
    { type: 'nova_enemy_010', count: 9 },
    { type: 'nova_enemy_011', count: 9 },
    { type: 'nova_enemy_010', count: 10 },
    { type: 'nova_enemy_011', count: 10 }
  ],
  4: [
    { type: 'nova_enemy_008', count: 8 },
    { type: 'nova_enemy_010', count: 9 },
    { type: 'nova_enemy_012', count: 9 },
    { type: 'nova_enemy_013', count: 10 },
    { type: 'nova_enemy_012', count: 10 },
    { type: 'nova_enemy_013', count: 11 }
  ]
};

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

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function gitShow(commit, file) {
  return execFileSync('git', ['show', `${commit}:${file}`], { encoding: 'utf8' });
}

async function importBalanceConfigAt(commit) {
  const source = gitShow(commit, 'src/config/BalanceConfig.js');
  const encoded = Buffer.from(source, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

function readGitText(commit, file) {
  return gitShow(commit, file);
}

function hasText(commit, file, needle) {
  return readGitText(commit, file).includes(needle);
}

function fileMatchesAcrossCommits(file, leftCommit, rightCommit) {
  return readGitText(leftCommit, file) === readGitText(rightCommit, file);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function normalWaveCount(diff, tuning, level) {
  const base = diff.wavesPerBossBase ?? diff.waveCountBase ?? 4;
  const perLevel = diff.wavesPerBossPerLevel ?? 0;
  const max = diff.wavesPerBossMax ?? diff.waveCountMax ?? 6;
  const min = diff.MIN_WAVES_BETWEEN_BOSSES ?? diff.minWavesBetweenBosses ?? 1;
  const waveBonus = Math.max(0, Number(tuning.waveCountBonus) || 0);
  const planned = Math.round(base + Math.max(0, level - 1) * perLevel) + waveBonus;
  return Math.max(min, Math.min(max + waveBonus, planned));
}

function normalWaveDifficultyLevel(mod, level) {
  if (typeof mod.getNormalWaveDifficultyLevel === 'function') {
    return mod.getNormalWaveDifficultyLevel(level);
  }
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const offset = Math.max(0, Math.floor(Number(mod.BalanceConfig.difficulty?.normalWaveDifficultyLevelOffset) || 0));
  return safeLevel + offset;
}

function normalWavePressureTuning(mod, level) {
  if (typeof mod.getNormalWavePressureTuning === 'function') {
    return mod.getNormalWavePressureTuning(level);
  }
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const bands = mod.BalanceConfig.difficulty?.normalWavePressureLadder?.bands || [];
  const band = bands.find((entry) =>
    safeLevel >= (Number(entry.minLevel) || 1) &&
    safeLevel <= (Number(entry.maxLevel) || Number.POSITIVE_INFINITY)
  ) || {};
  return {
    id: band.id || 'baseline',
    level: safeLevel,
    fireChanceMult: 1,
    projectileSpeedMult: 1,
    enemySpeedMult: 1,
    tacticFireMult: 1,
    tacticFireDelayMult: 1,
    dangerWaveCount: 0,
    dangerWaveCountBonus: 0,
    waveCountBonus: 0,
    waveEnemyCountBonus: 0,
    waveEnemyMaxBonus: 0,
    ...band
  };
}

function normalWaveDangerMoment(mod, level, waveIndex, waveCount) {
  if (typeof mod.getNormalWaveDangerMoment === 'function') {
    return mod.getNormalWaveDangerMoment(level, waveIndex, waveCount);
  }
  const tuning = normalWavePressureTuning(mod, level);
  const dangerWaveCount = Math.max(0, Math.floor(Number(tuning.dangerWaveCount) || 0));
  const totalWaves = Math.max(1, Math.floor(Number(waveCount) || 1));
  const safeWaveIndex = Math.max(0, Math.floor(Number(waveIndex) || 0));
  if (dangerWaveCount <= 0 || totalWaves < 3) return null;
  const maxThreatIndex = Math.max(1, totalWaves - 2);
  const candidates = [
    Math.min(maxThreatIndex, Math.max(1, Math.round(totalWaves * 0.55))),
    Math.min(maxThreatIndex, Math.max(2, Math.round(totalWaves * 0.78))),
    Math.min(maxThreatIndex, Math.max(1, Math.round(totalWaves * 0.35)))
  ];
  const indices = [...new Set(candidates)].slice(0, dangerWaveCount);
  const dangerSlot = indices.indexOf(safeWaveIndex);
  if (dangerSlot < 0) return null;
  return {
    id: `${tuning.id || 'baseline'}_danger_${dangerSlot + 1}`,
    countBonus: Number(tuning.dangerWaveCountBonus) || 0
  };
}

function baseWaveEnemyCount(diff, tuning, level, waveIndex) {
  const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
  if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) {
    return earlyCounts[waveIndex];
  }
  const count = Math.round(
    (diff.waveEnemyBase ?? 7) +
    Math.max(0, level - 1) * (diff.waveEnemyPerLevel ?? 0.35) +
    Math.max(0, waveIndex) * (diff.waveEnemyPerWave ?? 0.45) +
    (Number(tuning.waveEnemyCountBonus) || 0)
  );
  const max = (diff.waveEnemyMax ?? 14) + (Number(tuning.waveEnemyMaxBonus) || 0);
  return Math.max(4, Math.min(max, count));
}

function profileForType(type) {
  const profile = getGeneratedEnemyProfile(type);
  if (profile) return profile;
  return {
    type,
    scoreValue: LEGACY_SCORE_VALUES[type] || 10,
    health: LEGACY_HEALTH_VALUES[type] || 1,
    unlockLevel: 1
  };
}

function hpForType(type, diff, normalLevel) {
  const profile = profileForType(type);
  const hpScale = Math.min(
    diff.enemyHealthMaxMultiplier ?? Number.POSITIVE_INFINITY,
    (diff.baseEnemyHealthMultiplier ?? 1) + Math.max(0, normalLevel - 1) * (diff.hpScalePerLevel ?? 0)
  );
  return Math.ceil((Number(profile.health) || 1) * hpScale);
}

function scoreForType(type) {
  return Number(profileForType(type).scoreValue) || 10;
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

function scoreKillsWithCombo(scores, mode) {
  if (mode === 'none') return scores.reduce((sum, score) => sum + score, 0);
  let comboCount = 0;
  let total = 0;
  for (const score of scores) {
    total += comboKillScore(score, comboCount);
    comboCount += 1;
    total += comboMilestoneBonus(comboCount);
    total += comboTickBonus(comboCount);
  }
  return total;
}

function bossHp(diff, level, hasEarlyBossRelief) {
  const rawHealth = Math.round((diff.bossBaseHealth ?? 40) + Math.max(0, level - 1) * (diff.bossHealthPerLevel ?? 3.6));
  const healthBeforeEase = Math.max(rawHealth, diff.bossMinHealth || 70);
  const startsAt = Math.max(2, Math.round(Number(diff.bossPostFirstDifficultyStartsAt) || 2));
  const postFirstScalar = level >= startsAt ? Number(diff.bossPostFirstDifficultyScalar || 1) : 1;
  const earlyMaxLevel = Math.max(1, Math.round(Number(diff.bossEarlyDifficultyMaxLevel) || 0));
  const earlyScalar = hasEarlyBossRelief && level <= earlyMaxLevel ? Number(diff.bossEarlyDifficultyScalar || 1) : 1;
  const firstBossScalar = level <= 1 ? 0.86 : 1;
  return Math.max(1, Math.round(healthBeforeEase * postFirstScalar * earlyScalar * firstBossScalar));
}

function sectorWaves(mod, sourceSector) {
  const diff = mod.BalanceConfig.difficulty;
  const normalLevel = normalWaveDifficultyLevel(mod, sourceSector);
  const tuning = normalWavePressureTuning(mod, normalLevel);
  const curated = CURATED_WAVES[normalLevel];
  const waveCount = curated ? Math.min(curated.length, normalWaveCount(diff, tuning, normalLevel)) : normalWaveCount(diff, tuning, normalLevel);
  const waves = [];

  for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
    const moment = normalWaveDangerMoment(mod, normalLevel, waveIndex, waveCount);
    const progress = Math.min(0.98, ((waveIndex + 1) / Math.max(1, waveCount)) * 0.72 + (normalLevel / 40) * 0.24);
    const base = curated?.[waveIndex] || {
      type: getGeneratedEnemyTypeAtLevelProgress(normalLevel, progress),
      count: baseWaveEnemyCount(diff, tuning, normalLevel, waveIndex)
    };
    const count = Math.max(
      Number(base.count) || 0,
      Math.min(
        (diff.waveEnemyMax ?? 14) + (Number(tuning.waveEnemyMaxBonus) || 0) + Math.max(0, Number(moment?.countBonus) || 0),
        (Number(base.count) || 0) + Math.max(0, Number(moment?.countBonus) || 0)
      )
    );
    const type = base.type;
    const scoreValue = scoreForType(type);
    const hpValue = hpForType(type, diff, normalLevel);
    waves.push({
      sourceSector,
      normalLevel,
      waveIndex,
      type,
      count,
      scoreValue,
      hpValue,
      enemyScore: count * scoreValue,
      hpBudget: count * hpValue,
      danger: Boolean(moment),
      dangerId: moment?.id || null
    });
  }

  return waves;
}

function scoreThroughSector(metrics, throughSector, model) {
  let total = 0;
  let enemyScore = 0;
  let waveClearScore = 0;
  let noHitWaveScore = 0;
  let bossScore = 0;
  let sectorClearScore = 0;
  let noHitSectorScore = 0;
  let runClearScore = 0;

  for (let sector = 1; sector <= throughSector; sector += 1) {
    const sectorMetric = metrics.sectors.find((entry) => entry.sector === sector);
    const waves = sectorMetric.waves;
    if (model.combo === 'sector') {
      const scores = waves.flatMap((wave) => Array.from({ length: wave.count }, () => wave.scoreValue));
      const scored = scoreKillsWithCombo(scores, 'sector');
      enemyScore += scored;
      total += scored;
    } else {
      for (const wave of waves) {
        const scores = Array.from({ length: wave.count }, () => wave.scoreValue);
        const scored = scoreKillsWithCombo(scores, model.combo);
        enemyScore += scored;
        total += scored;
      }
    }

    const waveBonus = WAVE_CLEAR_BASE * waves.length * (waves.length + 1) / 2;
    waveClearScore += waveBonus;
    total += waveBonus;

    const noHitWaves = Math.round(waves.length * model.noHitWaveRate);
    const noHitWaveBonus = noHitWaves * NO_HIT_WAVE_BONUS;
    noHitWaveScore += noHitWaveBonus;
    total += noHitWaveBonus;

    bossScore += BOSS_SCORE;
    total += BOSS_SCORE;

    sectorClearScore += SECTOR_CLEAR_BONUS;
    total += SECTOR_CLEAR_BONUS;

    const noHitSectorBonus = Math.round(model.noHitSectorRate) * NO_HIT_SECTOR_BONUS;
    noHitSectorScore += noHitSectorBonus;
    total += noHitSectorBonus;

    if (sector === RUN_CLEAR_SECTOR) {
      const bonus = RUN_CLEAR_BONUS + model.spareLivesAtRunClear * SPARE_LIFE_BONUS;
      runClearScore += bonus;
      total += bonus;
    }
  }

  return {
    total,
    enemyScore,
    waveClearScore,
    noHitWaveScore,
    bossScore,
    sectorClearScore,
    noHitSectorScore,
    runClearScore
  };
}

function starterShipDps() {
  const ship = getShipMetadata(getDefaultShipKey());
  const bullets = Math.max(1, Number(ship?.weapon?.bullets) || 1);
  const damage = Math.max(0.1, Number(ship?.stats?.damage) || 1);
  const fireRateMs = Math.max(1, Number(ship?.stats?.fireRate) || 120);
  return {
    ship: ship?.name || getDefaultShipKey(),
    rawDps: damage * bullets * (1000 / fireRateMs)
  };
}

function estimateSecondsThroughSector(metrics, throughSector, model, dpsInfo) {
  const effectiveDps = Math.max(0.1, dpsInfo.rawDps * model.hitEfficiency);
  let normalSeconds = 0;
  let bossSeconds = 0;
  for (let sector = 1; sector <= throughSector; sector += 1) {
    const sectorMetric = metrics.sectors.find((entry) => entry.sector === sector);
    normalSeconds += sectorMetric.hpBudget / effectiveDps;
    normalSeconds += sectorMetric.waveCount * 4.1 + Math.max(0, sectorMetric.waveCount - 1) * 0.74 + sectorMetric.dangerWaveCount * 1.2;
    bossSeconds += sectorMetric.bossHp / effectiveDps + 63 + Math.min(16, sector * 0.9);
  }
  return {
    totalSeconds: round(normalSeconds + bossSeconds, 1),
    normalSeconds: round(normalSeconds, 1),
    bossSeconds: round(bossSeconds, 1)
  };
}

function recommendationForDelta(currentVsOldPct) {
  if (currentVsOldPct >= -3) return { needed: false, percent: 0, reason: 'current deterministic score budget is within 3% of the old baseline' };
  if (currentVsOldPct >= -8) return { needed: true, percent: 5, reason: 'small gap versus old baseline' };
  if (currentVsOldPct >= -13) return { needed: true, percent: 10, reason: 'moderate gap versus old baseline' };
  return { needed: true, percent: 15, reason: 'large gap versus old baseline' };
}

const loaded = [];
for (const baseline of BASELINES) {
  const mod = await importBalanceConfigAt(baseline.commit);
  const hasEarlyBossRelief = hasText(baseline.commit, 'src/entities/Boss.js', 'getEarlyBossDifficultyScalar');
  const sectors = [];
  for (let sector = 1; sector <= Math.max(...TARGET_SECTORS); sector += 1) {
    const waves = sectorWaves(mod, sector);
    sectors.push({
      sector,
      normalLevel: normalWaveDifficultyLevel(mod, sector),
      waveCount: waves.length,
      enemies: waves.reduce((sum, wave) => sum + wave.count, 0),
      enemyScoreBudget: waves.reduce((sum, wave) => sum + wave.enemyScore, 0),
      hpBudget: waves.reduce((sum, wave) => sum + wave.hpBudget, 0),
      dangerWaveCount: waves.filter((wave) => wave.danger).length,
      bossScore: BOSS_SCORE,
      bossHp: bossHp(mod.BalanceConfig.difficulty, sector, hasEarlyBossRelief),
      waveClearScore: WAVE_CLEAR_BASE * waves.length * (waves.length + 1) / 2,
      noHitWaveScoreMax: waves.length * NO_HIT_WAVE_BONUS,
      sectorClearScore: SECTOR_CLEAR_BONUS,
      noHitSectorScoreMax: NO_HIT_SECTOR_BONUS,
      waves
    });
  }

  const dpsInfo = starterShipDps();
  const cumulative = {};
  for (const throughSector of TARGET_SECTORS) {
    cumulative[throughSector] = {};
    for (const model of SKILL_MODELS) {
      const score = scoreThroughSector({ sectors }, throughSector, model);
      const time = estimateSecondsThroughSector({ sectors }, throughSector, model, dpsInfo);
      cumulative[throughSector][model.id] = {
        ...score,
        ...time,
        scorePerMinute: round(score.total / Math.max(1, time.totalSeconds / 60), 1)
      };
    }
  }

  loaded.push({
    ...baseline,
    buildSettings: {
      normalWaveDifficultyLevelOffset: mod.BalanceConfig.difficulty.normalWaveDifficultyLevelOffset || 0,
      MIN_WAVES_BETWEEN_BOSSES: mod.BalanceConfig.difficulty.MIN_WAVES_BETWEEN_BOSSES,
      wavesPerBossBase: mod.BalanceConfig.difficulty.wavesPerBossBase,
      wavesPerBossMax: mod.BalanceConfig.difficulty.wavesPerBossMax,
      bossEarlyDifficultyMaxLevel: mod.BalanceConfig.difficulty.bossEarlyDifficultyMaxLevel || null,
      bossEarlyDifficultyScalar: mod.BalanceConfig.difficulty.bossEarlyDifficultyScalar || null
    },
    hasEarlyBossRelief,
    sectors,
    cumulative
  });
}

const oldBaseline = loaded.find((entry) => entry.id === 'old_easier_display_build');
const current = loaded.find((entry) => entry.id === 'current_early_boss_relief');
const sourceGuards = Object.fromEntries(
  SCORE_FORMULA_GUARD_FILES.map((file) => [
    file,
    fileMatchesAcrossCommits(file, oldBaseline.commit, current.commit)
  ])
);
const comparisons = {};
for (const sector of TARGET_SECTORS) {
  comparisons[sector] = {};
  for (const model of SKILL_MODELS) {
    const oldScore = oldBaseline.cumulative[sector][model.id].total;
    const currentScore = current.cumulative[sector][model.id].total;
    const oldSpm = oldBaseline.cumulative[sector][model.id].scorePerMinute;
    const currentSpm = current.cumulative[sector][model.id].scorePerMinute;
    comparisons[sector][model.id] = {
      scoreDelta: currentScore - oldScore,
      scoreDeltaPct: round(((currentScore / oldScore) - 1) * 100, 2),
      scorePerMinuteDeltaPct: round(((currentSpm / oldSpm) - 1) * 100, 2),
      currentVsOldScoreRatio: round(currentScore / oldScore, 4)
    };
  }
}

const averageSector10Delta = comparisons[10].average_clear.scoreDeltaPct;
const perfectSector10Delta = comparisons[10].perfect_clear.scoreDeltaPct;
const lowSector10Delta = comparisons[10].low_combo_clear.scoreDeltaPct;
const worstSector10Delta = Math.min(averageSector10Delta, perfectSector10Delta, lowSector10Delta);
const recommended = recommendationForDelta(worstSector10Delta);

const report = {
  generatedAt: new Date().toISOString(),
  leaderboard: STEAM_LEADERBOARD_NAME,
  constants: {
    waveClearBase: WAVE_CLEAR_BASE,
    noHitWaveBonus: NO_HIT_WAVE_BONUS,
    sectorClearBonus: SECTOR_CLEAR_BONUS,
    noHitSectorBonus: NO_HIT_SECTOR_BONUS,
    bossScore: BOSS_SCORE,
    runClearSector: RUN_CLEAR_SECTOR,
    runClearBonus: RUN_CLEAR_BONUS,
    spareLifeBonus: SPARE_LIFE_BONUS
  },
  skillModels: SKILL_MODELS,
  baselines: loaded,
  comparisons,
  recommendation: {
    ...recommended,
    basis: 'worst Sector 10 deterministic score delta among low, average, and perfect models',
    sector10Deltas: {
      lowComboClear: lowSector10Delta,
      averageClear: averageSector10Delta,
      perfectClear: perfectSector10Delta
    }
  },
  sourceGuards,
  limitations: [
    'Score formula, leaderboard submission, and generated enemy profile files are checked unchanged between the old easier baseline and current early-boss-relief source.',
    'Historical BalanceConfig values are loaded directly from git; the deterministic model then reconstructs normal wave budgets from those values.',
    'Random bonus drones, score multiplier pickups, discovery bonuses, powerup trait bonuses, hijacker bonuses, and stochastic elite/multi-elite rolls are excluded from the core deterministic budget.',
    'Average and perfect combo models are deterministic approximations; real combo uptime depends on player damage cadence, wave gaps, and ship choice.',
    'Score-per-minute uses starter-ship DPS and the same presentation model as the existing pacing checks, so it is a relative estimate rather than a stopwatch capture.',
    'Run pressure elapsed-time score multipliers are not applied in the deterministic score budget because the same score formula exists in both baselines and actual timing depends on player routing.'
  ]
};

assert.equal(STEAM_LEADERBOARD_NAME, EXPECTED_LEADERBOARD, 'leaderboard identity changed');
assert.equal(current.buildSettings.normalWaveDifficultyLevelOffset, 9, 'current normal wave offset should stay accepted');
assert.equal(current.buildSettings.MIN_WAVES_BETWEEN_BOSSES, 5, 'current wave pacing should stay accepted');
assert.equal(current.buildSettings.bossEarlyDifficultyScalar, 0.9, 'current early boss relief should stay accepted');
for (const [file, unchanged] of Object.entries(sourceGuards)) {
  assert.equal(unchanged, true, `${file} changed between old baseline and current source`);
}

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/score-fairness-after-difficulty-shift-${timestamp()}`);
mkdirSync(outputDir, { recursive: true });
const reportPath = path.join(outputDir, 'report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const summary = TARGET_SECTORS
  .map((sector) => {
    const avg = comparisons[sector].average_clear;
    return `S${sector}:score ${avg.scoreDeltaPct >= 0 ? '+' : ''}${avg.scoreDeltaPct}% spm ${avg.scorePerMinuteDeltaPct >= 0 ? '+' : ''}${avg.scorePerMinuteDeltaPct}%`;
  })
  .join(' | ');

console.log(`[score-fairness-after-difficulty-shift] PASS ${summary} recommendation=${recommended.percent}% report=${reportPath}`);
