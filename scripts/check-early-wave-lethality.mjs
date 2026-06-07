import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  BalanceConfig,
  getNormalWaveDangerMoment,
  getNormalWavePressureTuning
} from '../src/config/BalanceConfig.js';
import { getEnemyThreatAction } from '../src/config/EnemyThreatActions.js';
import { getEliteMiddleShipProfile } from '../src/config/EliteMiddleShips.js';

const EXPECTED_APP_ID = '4765070';
const EXPECTED_LEADERBOARD = 'nova_swarm_global_score_v2';

const errors = [];
const fail = (message) => errors.push(message);

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function normalWaveCount(level) {
  const diff = BalanceConfig.difficulty;
  const tuning = getNormalWavePressureTuning(level);
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

function waveEnemyCount(level, waveIndex = 0) {
  const diff = BalanceConfig.difficulty;
  const tuning = getNormalWavePressureTuning(level);
  const waveCount = normalWaveCount(level);
  const moment = getNormalWaveDangerMoment(level, waveIndex, waveCount);
  const max = (diff.waveEnemyMax ?? 14) +
    (Number(tuning.waveEnemyMaxBonus) || 0) +
    Math.max(0, Number(moment?.countBonus) || 0);
  const count = baseWaveEnemyCount(level, waveIndex) +
    (Number(tuning.waveEnemyCountBonus) || 0) +
    Math.max(0, Number(moment?.countBonus) || 0);
  return Math.max(4, Math.min(max, count));
}

function threatActionWeights(actionId) {
  const action = getEnemyThreatAction(actionId);
  const handler = action?.handlerId || action?.id || actionId;
  const weights = {
    pulse_ring_bloom: { stationary: 0.64, lazyCircle: 0.42, edgeKite: 0.36, density: 0.64 },
    splitter_seed: { stationary: 0.48, lazyCircle: 0.56, edgeKite: 0.42, density: 0.46 },
    crossfire_pair: { stationary: 0.46, lazyCircle: 0.54, edgeKite: 0.58, density: 0.48 },
    lane_cutter: { stationary: 0.58, lazyCircle: 0.48, edgeKite: 0.72, density: 0.52 },
    mine_drop: { stationary: 0.46, lazyCircle: 0.62, edgeKite: 0.5, density: 0.5 },
    brake_dash_bolt: { stationary: 0.5, lazyCircle: 0.68, edgeKite: 0.5, density: 0.42 },
    telegraph_rail_lance: { stationary: 0.62, lazyCircle: 0.54, edgeKite: 0.52, density: 0.5 },
    boomerang_crescent: { stationary: 0.48, lazyCircle: 0.62, edgeKite: 0.56, density: 0.46 },
    shotgun_fan_feint: { stationary: 0.74, lazyCircle: 0.62, edgeKite: 0.58, density: 0.62 },
    orbiting_satellites: { stationary: 0.58, lazyCircle: 0.64, edgeKite: 0.54, density: 0.62 }
  };
  return weights[handler] || { stationary: 0.34, lazyCircle: 0.34, edgeKite: 0.34, density: 0.3 };
}

function compositionWeights(moment) {
  const formation = String(moment?.formation || '');
  const tactic = String(moment?.tactic || '');
  const text = `${formation} ${tactic}`.toLowerCase();
  return {
    pincer: /pincer|crossfire|mirror|lattice/.test(text) ? 0.52 : 0,
    rush: /rush|dive|chain|feint|sidewinder|diagonal/.test(text) ? 0.56 : 0,
    zone: /screen|wall|traffic|orbit|mine|weave|turnpike/.test(text) ? 0.58 : 0
  };
}

function eliteWeights(eliteId) {
  const profile = getEliteMiddleShipProfile(eliteId);
  if (!profile) return { stationary: 0, lazyCircle: 0, edgeKite: 0, priority: 0 };
  const ability = profile.specialAbility;
  const map = {
    tractor_pull: { stationary: 0.68, lazyCircle: 0.54, edgeKite: 0.48, priority: 1 },
    shield_projector: { stationary: 0.48, lazyCircle: 0.5, edgeKite: 0.5, priority: 1 },
    drone_carrier: { stationary: 0.56, lazyCircle: 0.58, edgeKite: 0.46, priority: 1 },
    mine_layer: { stationary: 0.52, lazyCircle: 0.62, edgeKite: 0.58, priority: 1 },
    sniper_rail: { stationary: 0.62, lazyCircle: 0.54, edgeKite: 0.62, priority: 1 },
    jammer_disruptor: { stationary: 0.48, lazyCircle: 0.58, edgeKite: 0.5, priority: 1 }
  };
  return map[ability] || { stationary: 0.45, lazyCircle: 0.45, edgeKite: 0.45, priority: 1 };
}

function firstThreatMs(level, waveIndex, moment) {
  const tuning = getNormalWavePressureTuning(level);
  const entryMs = Math.max(
    760,
    (BalanceConfig.difficulty.enemyEntryDurationMs || 1460) *
      (tuning.entrySpeedMult || 1) *
      (moment.entrySpeedMult || 1)
  );
  const actionIds = Array.isArray(moment.forcedThreatActionIds) ? moment.forcedThreatActionIds : [];
  const telegraphs = actionIds
    .map((id) => getEnemyThreatAction(id)?.telegraphMs)
    .filter(Number.isFinite);
  const telegraphMs = telegraphs.length ? Math.min(...telegraphs) : 620;
  const baseDelayMs = 1450 + Math.max(0, waveIndex) * 140 + 230 + 275;
  const actionDelayMs = Math.max(
    520,
    baseDelayMs * (moment.threatInitialDelayMult || 1) - (Number(moment.threatInitialDelayMs) || 0)
  );
  return Math.round(entryMs + actionDelayMs + telegraphMs);
}

function lethalityForDangerWave(level, waveIndex) {
  const waveCount = normalWaveCount(level);
  const moment = getNormalWaveDangerMoment(level, waveIndex, waveCount);
  if (!moment) return null;

  const count = waveEnemyCount(level, waveIndex);
  const actionIds = Array.isArray(moment.forcedThreatActionIds) ? moment.forcedThreatActionIds : [];
  const actionTotal = actionIds.reduce((sum, id) => {
    const weight = threatActionWeights(id);
    return {
      stationary: sum.stationary + weight.stationary,
      lazyCircle: sum.lazyCircle + weight.lazyCircle,
      edgeKite: sum.edgeKite + weight.edgeKite,
      density: sum.density + weight.density
    };
  }, { stationary: 0, lazyCircle: 0, edgeKite: 0, density: 0 });
  const comp = compositionWeights(moment);
  const elite = eliteWeights(moment.eliteMiddleShipId);
  const threatMs = firstThreatMs(level, waveIndex, moment);
  const timingMult = threatMs <= 2300 ? 1.22 : threatMs <= 2700 ? 1.1 : threatMs <= 3200 ? 1 : 0.82;
  const density = count / 10;
  const fireWindow = (moment.fireMult || 1) / Math.max(0.1, moment.fireDelayMult || 1);
  const budget = 1 +
    Math.max(0, Number(moment.threatDangerBudgetBonus) || 0) * 0.08 +
    Math.max(0, Number(moment.threatMaxActiveBonus) || 0) * 0.08 +
    Math.max(0, Number(moment.threatPlannedActionBonus) || 0) * 0.08;
  const base = density * fireWindow * budget * timingMult;

  const stationary = base * (0.42 + actionTotal.stationary + comp.zone * 0.8 + comp.pincer * 0.35 + elite.stationary * 0.85);
  const lazyCircle = base * (0.35 + actionTotal.lazyCircle + comp.rush * 0.82 + comp.zone * 0.42 + elite.lazyCircle * 0.85);
  const edgeKite = base * (0.28 + actionTotal.edgeKite + comp.pincer * 0.9 + comp.zone * 0.5 + elite.edgeKite * 0.78);

  return {
    level,
    wave: waveIndex + 1,
    waveCount,
    band: moment.bandId,
    formation: moment.formation,
    tactic: moment.tactic,
    enemyCount: count,
    forcedThreatActionIds: actionIds,
    priorityElite: moment.eliteMiddleShipId || null,
    firstThreatMs: threatMs,
    projectileDensityIndex: round(actionTotal.density + count * 0.08 + Math.max(0, fireWindow - 1) * 1.4, 2),
    stationaryDamagePotential: round(stationary, 2),
    lazyCircleDamagePotential: round(lazyCircle, 2),
    edgeKiteDamagePotential: round(edgeKite, 2),
    normalWaveOnlyKillPotential: round(Math.max(stationary, lazyCircle, edgeKite), 2),
    bossContribution: 0
  };
}

function sectorLethality(level) {
  const waveCount = normalWaveCount(level);
  const waves = [];
  for (let wave = 0; wave < waveCount; wave += 1) {
    const summary = lethalityForDangerWave(level, wave);
    if (summary) waves.push(summary);
  }
  const totals = waves.reduce((sum, wave) => ({
    stationary: sum.stationary + wave.stationaryDamagePotential,
    lazyCircle: sum.lazyCircle + wave.lazyCircleDamagePotential,
    edgeKite: sum.edgeKite + wave.edgeKiteDamagePotential,
    projectileDensity: sum.projectileDensity + wave.projectileDensityIndex
  }), { stationary: 0, lazyCircle: 0, edgeKite: 0, projectileDensity: 0 });
  return {
    level,
    dangerWaveCount: waves.length,
    dangerWaves: waves,
    sectorDamagePotential: {
      stationary: round(totals.stationary, 2),
      lazyCircle: round(totals.lazyCircle, 2),
      edgeKite: round(totals.edgeKite, 2)
    },
    normalWaveOnlyKillPotential: round(Math.max(totals.stationary, totals.lazyCircle, totals.edgeKite), 2),
    projectileDensityIndex: round(totals.projectileDensity, 2),
    bossContribution: 0
  };
}

function summarizeBand(label, levels) {
  const sectors = levels.map(sectorLethality);
  return {
    label,
    levels: `${Math.min(...levels)}-${Math.max(...levels)}`,
    minDangerWaves: Math.min(...sectors.map((sector) => sector.dangerWaveCount)),
    maxDangerWaves: Math.max(...sectors.map((sector) => sector.dangerWaveCount)),
    minKillPotential: round(Math.min(...sectors.map((sector) => sector.normalWaveOnlyKillPotential)), 2),
    avgKillPotential: round(sectors.reduce((sum, sector) => sum + sector.normalWaveOnlyKillPotential, 0) / sectors.length, 2),
    fastestFirstThreatMs: Math.min(...sectors.flatMap((sector) => sector.dangerWaves.map((wave) => wave.firstThreatMs))),
    slowestFirstThreatMs: Math.max(...sectors.flatMap((sector) => sector.dangerWaves.map((wave) => wave.firstThreatMs))),
    priorityEliteWaves: sectors.reduce((sum, sector) => sum + sector.dangerWaves.filter((wave) => wave.priorityElite).length, 0),
    sectors
  };
}

function assertSectorBand() {
  const level1 = sectorLethality(1);
  const level2 = sectorLethality(2);
  if (level1.dangerWaveCount !== 0 || level2.dangerWaveCount !== 0) {
    fail('levels 1 to 2 must remain conservative with no deterministic danger waves');
  }
  if (level1.normalWaveOnlyKillPotential > 0 || level2.normalWaveOnlyKillPotential > 0) {
    fail('levels 1 to 2 must not gain normal-wave-only kill potential from danger scheduler');
  }

  for (const level of [3, 4, 5]) {
    const sector = sectorLethality(level);
    if (sector.dangerWaveCount < 1) fail(`level ${level} needs at least one deterministic danger wave`);
    if (sector.normalWaveOnlyKillPotential < 1.45) fail(`level ${level} normal waves do not reach careless damage risk`);
    if (sector.dangerWaves.some((wave) => wave.firstThreatMs > 2850)) {
      fail(`level ${level} first danger-wave threat is too late to punish erasing/passive play`);
    }
    if (sector.dangerWaves.some((wave) => wave.forcedThreatActionIds.length < 2)) {
      fail(`level ${level} danger waves need forced practical threat actions`);
    }
  }

  for (const level of [6, 7, 8, 9, 10]) {
    const sector = sectorLethality(level);
    if (sector.dangerWaveCount < 2) fail(`level ${level} needs at least two deterministic danger waves`);
    if (sector.normalWaveOnlyKillPotential < 4.2) fail(`level ${level} normal waves do not reach careless kill potential`);
    if (sector.dangerWaves.filter((wave) => wave.priorityElite).length < 2) {
      fail(`level ${level} should have priority targets on both danger waves`);
    }
    if (sector.dangerWaves.some((wave) => wave.firstThreatMs > 2750)) {
      fail(`level ${level} danger-wave threats activate too late`);
    }
  }

  for (const level of [11, 12, 13, 14, 15]) {
    const sector = sectorLethality(level);
    if (sector.dangerWaveCount < 3) fail(`level ${level} needs at least three serious normal-wave danger moments`);
    if (sector.normalWaveOnlyKillPotential < 4.8) fail(`level ${level} normal waves should be able to kill through mistakes`);
    if (sector.projectileDensityIndex < 3.3) fail(`level ${level} projectile/reach density is too low for practical lethality`);
  }

  for (const level of [16, 17, 18, 19, 20]) {
    const sector = sectorLethality(level);
    if (sector.dangerWaveCount < 3) fail(`level ${level} needs at least three normal-wave danger moments`);
    if (sector.normalWaveOnlyKillPotential < 6.2) fail(`level ${level} normal waves still read as filler`);
  }

  for (const level of [20, 25, 30]) {
    const sector = sectorLethality(level);
    if (sector.dangerWaveCount < 3) fail(`level ${level} needs runtime danger moments before level 50`);
    if (sector.normalWaveOnlyKillPotential < 7.2) fail(`level ${level} does not reach clear normal-wave danger`);
  }

  for (const level of [30, 35, 40]) {
    const sector = sectorLethality(level);
    if (sector.dangerWaveCount < 3) fail(`level ${level} needs practiced-player normal-wave danger moments`);
    if (sector.normalWaveOnlyKillPotential < 8.2) fail(`level ${level} does not threaten practiced-player mistakes`);
  }

  for (const level of [40, 45, 50]) {
    const sector = sectorLethality(level);
    if (sector.dangerWaveCount < 3) fail(`level ${level} needs brutal pre-boss normal-wave danger moments`);
    if (sector.normalWaveOnlyKillPotential < 9.2) fail(`level ${level} is not intense enough before the boss`);
  }
}

function challengeChance(level) {
  const diff = BalanceConfig.difficulty;
  const tuning = getNormalWavePressureTuning(level);
  const minLevel = Number(tuning.challengeMinLevel) || 1;
  return Math.min(
    0.18,
    ((diff.challengeWaveChance ?? 0.015) * (tuning.challengeChanceMult || 1)) +
    (level >= minLevel ? (Number(tuning.challengeChanceBonus) || 0) : 0)
  );
}

function assertChallengeWavesMatter() {
  const enemyManager = read('src/managers/EnemyManager.js');
  if (!(challengeChance(5) >= 0.05 && challengeChance(10) >= 0.065)) {
    fail('level 5+ challenge-wave chance is too low to produce meaningful early punishment');
  }
  if (!enemyManager.includes("config.isChallenge && enemy.kind === 'bonus_drone'") ||
      !enemyManager.includes("enemy.kind = 'enemy'")) {
    fail('challenge waves must keep bonus raid enemies as objective threats long enough to matter');
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

  const packageJson = read('package.json');
  const leaderboardTypes = read('src/leaderboard/LeaderboardTypes.js');
  const steamBridge = read('electron/steamLeaderboardBridge.cjs');
  if (!packageJson.includes('"check:early-wave-lethality"')) {
    fail('package.json missing check:early-wave-lethality script');
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

  const lateBands = [20, 30, 40, 50].map((level) => getNormalWavePressureTuning(level));
  if (lateBands[0].id !== 'late_run_attrition' ||
      lateBands[1].id !== 'overrun_rising' ||
      lateBands[2].id !== 'overrun_plateau_break' ||
      lateBands[3].id !== 'deep_overrun') {
    fail('level 20+ late-overrun pressure bands changed unexpectedly');
  }

  return changedFiles;
}

assertSectorBand();
assertChallengeWavesMatter();
const changedFiles = assertProtectedSurfaces();

const bandSummaries = [
  summarizeBand('levels 3 to 5', [3, 4, 5]),
  summarizeBand('levels 6 to 10', [6, 7, 8, 9, 10]),
  summarizeBand('levels 11 to 15', [11, 12, 13, 14, 15]),
  summarizeBand('levels 16 to 20', [16, 17, 18, 19, 20]),
  summarizeBand('levels 20 to 30', [20, 25, 30]),
  summarizeBand('levels 30 to 40', [30, 35, 40]),
  summarizeBand('levels 40 to 50', [40, 45, 50]),
  summarizeBand('levels 50 plus', [50, 60])
];

if (errors.length) {
  console.error(`[early-wave-lethality] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(JSON.stringify({
    changedFiles,
    bands: bandSummaries,
    level1: sectorLethality(1),
    level2: sectorLethality(2),
    challengeChance: {
      level5: round(challengeChance(5), 4),
      level10: round(challengeChance(10), 4)
    }
  }, null, 2));
  process.exit(1);
}

console.log(`[early-wave-lethality] PASS ${bandSummaries.map((summary) => `${summary.levels}:danger=${summary.minDangerWaves}-${summary.maxDangerWaves},kill=${summary.avgKillPotential}`).join(' ')}`);
console.log(JSON.stringify({
  changedFiles,
  bands: bandSummaries,
  conservativeOpening: {
    level1: sectorLethality(1),
    level2: sectorLethality(2)
  },
  challengeChance: {
    level5: round(challengeChance(5), 4),
    level10: round(challengeChance(10), 4)
  },
  invariants: {
    bossContribution: 0,
    appId: EXPECTED_APP_ID,
    leaderboard: EXPECTED_LEADERBOARD,
    powerupsNerfed: false,
    scoreChanged: false
  }
}, null, 2));
