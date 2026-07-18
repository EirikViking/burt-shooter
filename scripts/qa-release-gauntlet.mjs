import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  GENERATED_ENEMY_EARLY_SURGE_TOTAL,
  GENERATED_ENEMY_EXTRA_TOTAL,
  GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL,
  GENERATED_ENEMY_FULL_UNLOCK_LEVEL,
  GENERATED_ENEMY_PROFILES,
  GENERATED_ENEMY_STARTER_COUNT,
  GENERATED_ENEMY_TOTAL,
  SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT,
  getGeneratedEnemyPoolStats,
  isSmallGeneratedEnemyProfile
} from '../src/config/GeneratedEnemyProfiles.js';
import {
  ENEMY_ATTACK_STYLE_DEFS,
  ENEMY_ATTACK_STYLE_IDS,
  getEnemyAttackPattern
} from '../src/config/EnemyAttackStyles.js';
import {
  ENEMY_MOVEMENT_STYLE_DEFS,
  ENEMY_MOVEMENT_STYLE_IDS,
  getEnemyMovementOffset
} from '../src/config/EnemyMovementStyles.js';
import { getSelectableShips, isShipUnlocked } from '../src/config/ShipMetadata.js';
import { ShipUnlockConfig } from '../src/config/ShipUnlockConfig.js';
import {
  createDefaultHangarProgress,
  recalculateUnlockedShipIds
} from '../src/progression/HangarProgressState.js';
import { PRE_RELEASE_SEED_SCORES, sanitizeLocalPilotName } from '../src/api/LocalLeaderboard.js';
import {
  SCORE_NORMALIZATION_FACTOR,
  SCORE_REWARD_MULTIPLIER,
  SCORE_NORMALIZATION_ROUNDING,
  normalizeLegacyScoreForReset,
  normalizeScoreDelta
} from '../src/shared/ScorePolicy.js';
import {
  MAX_RANK_INDEX,
  getPilotXpThresholds,
  getRankFromLevel,
  getRankFromPilotXp,
  getRankTitle,
  getThresholds
} from '../src/shared/RankPolicy.js';
import {
  encodeSteamLeaderboardDetails,
  getPilotNameValidation,
  toPublicPilotName
} from '../src/leaderboard/LeaderboardTypes.js';

const outputDir = path.resolve(process.env.QA_RELEASE_OUTPUT_DIR || `test-results/release-qa-gauntlet-${timestamp()}`);
const sampledLevels = [1, 5, 10, 11, 20, 30, 40];
const errors = [];
const warnings = [];
const findings = [];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function unique(values) {
  return [...new Set(values)];
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function buildHangarProfile(partial = {}) {
  const defaults = createDefaultHangarProgress();
  const pilotXp = Number(partial.pilotXp ?? defaults.pilotXp) || 0;
  const pilotRank = Number(partial.pilotRank ?? getRankFromPilotXp(pilotXp)) || 0;
  const progress = {
    ...defaults,
    ...partial,
    pilotXp,
    pilotRank,
    highestPilotRank: Math.max(Number(partial.highestPilotRank ?? 0) || 0, pilotRank),
    bestRank: Math.max(Number(partial.bestRank ?? 0) || 0, pilotRank)
  };
  progress.unlockedShipIds = recalculateUnlockedShipIds(progress);
  return progress;
}

function unlockedShipsFor(progress) {
  return getSelectableShips().filter((ship) => isShipUnlocked(ship.spriteKey, progress));
}

function nextLockedShip(progress) {
  return getSelectableShips()
    .filter((ship) => !isShipUnlocked(ship.spriteKey, progress))
    .sort((a, b) => (Number(a.unlock?.level) || 1) - (Number(b.unlock?.level) || 1))[0] || null;
}

function summarizeProfile(progress) {
  const unlocked = unlockedShipsFor(progress);
  const next = nextLockedShip(progress);
  return {
    unlockedShips: unlocked.length,
    unlockedShipIds: progress.unlockedShipIds,
    pilotRank: progress.pilotRank,
    rankTitle: getRankTitle(progress.pilotRank),
    bestSector: progress.bestSector,
    bestScore: progress.bestScore,
    totalRuns: progress.totalRuns,
    totalBossesDefeated: progress.totalBossesDefeated,
    totalWavesCleared: progress.totalWavesCleared,
    totalCodexDiscoveries: progress.totalCodexDiscoveries,
    nextLockedShip: next ? {
      id: next.id,
      name: next.name,
      requirement: next.unlock?.label || null
    } : null
  };
}

function validateEnemyVariety() {
  const movementIds = new Set(ENEMY_MOVEMENT_STYLE_IDS);
  const attackIds = new Set(ENEMY_ATTACK_STYLE_IDS);
  const ids = new Set();
  const types = new Set();

  if (GENERATED_ENEMY_PROFILES.length !== GENERATED_ENEMY_TOTAL) {
    fail(`expected ${GENERATED_ENEMY_TOTAL} normal enemy profiles, found ${GENERATED_ENEMY_PROFILES.length}`);
  }
  const lateMayhem = GENERATED_ENEMY_PROFILES.filter((profile) => profile.lateMayhem === true);
  if (lateMayhem.length !== GENERATED_ENEMY_EXTRA_TOTAL) {
    fail(`expected ${GENERATED_ENEMY_EXTRA_TOTAL} late-mayhem enemy profiles, found ${lateMayhem.length}`);
  }
  const earlySurge = GENERATED_ENEMY_PROFILES.filter((profile) => profile.earlySurge === true);
  if (earlySurge.length !== GENERATED_ENEMY_EARLY_SURGE_TOTAL) {
    fail(`expected ${GENERATED_ENEMY_EARLY_SURGE_TOTAL} early surge enemy profiles, found ${earlySurge.length}`);
  }

  for (const profile of GENERATED_ENEMY_PROFILES) {
    if (!profile.id) fail('normal enemy profile missing id');
    if (!profile.type) fail(`${profile.id || 'unknown'} missing type`);
    if (ids.has(profile.id)) fail(`duplicate normal enemy id ${profile.id}`);
    if (types.has(profile.type)) fail(`duplicate normal enemy type ${profile.type}`);
    ids.add(profile.id);
    types.add(profile.type);

    if (!Number.isInteger(profile.unlockLevel) || profile.unlockLevel < 1) {
      fail(`${profile.id} has invalid unlockLevel ${profile.unlockLevel}`);
    }
    if (profile.unlockLevel > GENERATED_ENEMY_FULL_UNLOCK_LEVEL) {
      fail(`${profile.id} unlocks after level ${GENERATED_ENEMY_FULL_UNLOCK_LEVEL}: ${profile.unlockLevel}`);
    }
    if (!movementIds.has(profile.movementStyle)) {
      fail(`${profile.id} references unknown movementStyle ${profile.movementStyle}`);
    }
    if (!attackIds.has(profile.fireStyle)) {
      fail(`${profile.id} references unknown fireStyle ${profile.fireStyle}`);
    }
  }

  for (const style of ENEMY_MOVEMENT_STYLE_DEFS) {
    const sample = getEnemyMovementOffset(style.id, {
      phase: 1.37,
      tacticalWave: 2.11,
      side: 1,
      slot: 2,
      size: 5,
      x: 620,
      playerX: 700
    });
    if (!isFinitePoint(sample)) fail(`movement style ${style.id} returned non-finite offset`);
  }

  for (const style of ENEMY_ATTACK_STYLE_DEFS) {
    const pattern = getEnemyAttackPattern(style.id, {
      baseAngle: Math.PI / 2,
      side: 1,
      slot: 2,
      now: 1779460000000,
      playerX: 700,
      enemyX: 620
    });
    if (!Array.isArray(pattern) || pattern.length < 1) {
      fail(`attack style ${style.id} returned an empty pattern`);
      continue;
    }
    for (const shot of pattern) {
      if (!Number.isFinite(Number(shot.angle))) fail(`attack style ${style.id} returned non-finite angle`);
      if (!Number.isFinite(Number(shot.speedMult))) fail(`attack style ${style.id} returned non-finite speedMult`);
      if (!Number.isFinite(Number(shot.damage))) fail(`attack style ${style.id} returned non-finite damage`);
    }
  }

  const stats = sampledLevels.map((level) => getGeneratedEnemyPoolStats(level));
  const total = GENERATED_ENEMY_PROFILES.length;
  const level1 = stats.find((entry) => entry.level === 1);
  const level10Profiles = getGeneratedEnemyPoolStats(GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL - 1);
  const level11 = stats.find((entry) => entry.level === 11);
  const level40 = stats.find((entry) => entry.level === 40);
  const smallLateMayhem = lateMayhem.filter(isSmallGeneratedEnemyProfile);
  const expectedLevel40 = SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT
    ? total
    : total - smallLateMayhem.length;
  const expectedLevel1 = GENERATED_ENEMY_STARTER_COUNT + GENERATED_ENEMY_EARLY_SURGE_TOTAL;
  if (level1.availableProfiles !== expectedLevel1) {
    fail(`level 1 should expose ${expectedLevel1} normal enemy profiles, found ${level1.availableProfiles}`);
  }
  if (getGeneratedEnemyPoolStats(GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL - 1).availableProfiles >= level11.availableProfiles) {
    fail(`level ${GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL} should expand the pool beyond level ${GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL - 1}`);
  }
  if (level11.availableProfiles >= total) fail(`level 11 exposes all ${total} normal enemy profiles`);
  if (level11.movementFamilies >= level11.totalMovementFamilies) fail('level 11 exposes all movement families');
  if (level11.attackFamilies >= level11.totalAttackFamilies) fail('level 11 exposes all attack families');
  if (level40.availableProfiles !== expectedLevel40) {
    fail(`level 40 exposes ${level40.availableProfiles}/${expectedLevel40} default-playable profiles (${total} total)`);
  }
  if (level40.movementFamilies !== level40.totalMovementFamilies) fail('level 40 does not expose all movement families');
  if (level40.attackFamilies !== level40.totalAttackFamilies) fail('level 40 does not expose all attack families');
  return stats;
}

function validateProgression() {
  const ships = getSelectableShips();
  const shipThresholds = ships.map((ship) => Number(ship.unlock?.level) || 1);
  const rankThresholds = getThresholds();
  const pilotXpThresholds = getPilotXpThresholds();
  const expectedLegacyLevels = [
    1, 2, 3, 4, 5, 7, 9, 11, 14, 17,
    20, 23, 26, 29, 32, 35, 38, 41, 44, 47,
    50, 53, 56, 58, 60, 30, 35, 40, 45, 50
  ];
  const actualLegacyLevels = ShipUnlockConfig.map((entry) => Number(entry.legacyLevel));

  const profiles = {
    fresh: buildHangarProfile(),
    firstSession: buildHangarProfile({
      totalRuns: 1,
      bestSector: 3,
      bestScore: 25000,
      totalBossesDefeated: 1,
      totalWavesCleared: 10,
      totalCodexDiscoveries: 28,
      pilotRank: 6
    }),
    midCareer: buildHangarProfile({
      totalRuns: 10,
      bestSector: 12,
      bestScore: 58273,
      pilotRank: 10,
      totalBossesDefeated: 18,
      totalWavesCleared: 60,
      totalCodexDiscoveries: 118,
      survivedSeconds: 900,
      noHitWaves: 3,
      runClears: 1,
      runThemesSurvived: ['swarm_lattice', 'hunter_wing', 'minefield_protocol', 'orbit_collapse']
    }),
    mastery: buildHangarProfile({
      totalRuns: 50,
      bestSector: 50,
      bestScore: 550000,
      pilotRank: MAX_RANK_INDEX,
      totalBossesDefeated: 40,
      totalWavesCleared: 160,
      totalCodexDiscoveries: 180,
      runClears: 3,
      noHitWaves: 8,
      noHitSectors: 1,
      survivedSeconds: 1800,
      runThemesSurvived: ['swarm_lattice', 'hunter_wing', 'minefield_protocol', 'orbit_collapse', 'crossfire_doctrine', 'glitch_parade'],
      clearWithLivesRemaining: 2,
      highestScoreMultiplier: 2
    })
  };

  const profileSummaries = Object.fromEntries(
    Object.entries(profiles).map(([name, progress]) => [name, summarizeProfile(progress)])
  );

  if (ships.length !== 30) fail(`expected 30 selectable ships, found ${ships.length}`);
  if (ShipUnlockConfig.length !== ships.length) fail(`ship unlock config should cover every ship ${ShipUnlockConfig.length}/${ships.length}`);
  if (JSON.stringify(actualLegacyLevels) !== JSON.stringify(expectedLegacyLevels)) {
    fail(`legacy ship unlock levels drifted: ${actualLegacyLevels.join(', ')}`);
  }
  if (profileSummaries.fresh.unlockedShips !== 1) {
    fail(`fresh profile should unlock only starter ship, found ${profileSummaries.fresh.unlockedShips}`);
  }
  if (profileSummaries.firstSession.unlockedShips < 2 || profileSummaries.firstSession.unlockedShips > 3) {
    fail(`first-session profile should unlock 2-3 ships, found ${profileSummaries.firstSession.unlockedShips}`);
  }
  for (const shipId of ['nova_ship_02', 'nova_ship_03']) {
    if (!profiles.firstSession.unlockedShipIds.includes(shipId)) fail(`first-session profile should unlock ${shipId}`);
  }
  for (const shipId of ['nova_ship_04', 'nova_ship_05', 'nova_ship_07', 'nova_ship_11']) {
    if (profiles.firstSession.unlockedShipIds.includes(shipId)) fail(`first-session profile should not unlock ${shipId}`);
  }
  if (profileSummaries.midCareer.unlockedShips < 10 || profileSummaries.midCareer.unlockedShips > 12) {
    fail(`rank-10 codex-118 profile should unlock about 10-12 ships, found ${profileSummaries.midCareer.unlockedShips}`);
  }
  for (const shipId of ['nova_ship_08', 'nova_ship_09', 'nova_ship_11', 'nova_ship_17']) {
    if (!profiles.midCareer.unlockedShipIds.includes(shipId)) fail(`mid-career profile should unlock ${shipId}`);
  }
  for (const shipId of ['nova_ship_14', 'nova_ship_16', 'nova_ship_19', 'nova_ship_22', 'nova_ship_23']) {
    if (profiles.midCareer.unlockedShipIds.includes(shipId)) fail(`mid-career profile should not already unlock ${shipId}`);
  }
  if (profileSummaries.mastery.unlockedShips !== ships.length) {
    fail(`mastery profile should unlock ${ships.length}/${ships.length} ships, found ${profileSummaries.mastery.unlockedShips}`);
  }
  if (getRankFromLevel(1) !== 0) fail(`level 1 rank should be 0, found ${getRankFromLevel(1)}`);
  if (getRankFromLevel(11) >= MAX_RANK_INDEX) fail('level 11 reaches max rank');
  if (getRankFromLevel(60) !== 19) fail(`level 60 should reach launch rank 19, found ${getRankFromLevel(60)}`);
  if (getRankFromLevel(410) !== MAX_RANK_INDEX) fail(`level 410 should reach max rank ${MAX_RANK_INDEX}`);
  if (getRankFromPilotXp(0) !== 0) fail(`0 pilot XP rank should be 0, found ${getRankFromPilotXp(0)}`);
  if (getRankFromPilotXp(pilotXpThresholds[6]) !== 6) fail('rank 6 should be reachable from pilot XP thresholds');
  if (getRankFromPilotXp(pilotXpThresholds.at(-1)) !== MAX_RANK_INDEX) {
    fail(`top pilot XP threshold should award max rank ${MAX_RANK_INDEX}`);
  }
  for (let index = 1; index < pilotXpThresholds.length; index += 1) {
    if (pilotXpThresholds[index] <= pilotXpThresholds[index - 1]) {
      fail(`pilot XP threshold ${index} should increase`);
    }
  }

  return {
    legacyShipLevels: shipThresholds,
    unlockConfigLegacyLevels: actualLegacyLevels,
    legacyRankLevelThresholds: rankThresholds,
    pilotXpThresholds,
    profiles: profileSummaries,
    legacyLevelRanks: {
      level1: {
        rankIndex: getRankFromLevel(1),
        rankTitle: getRankTitle(getRankFromLevel(1))
      },
      level11: {
        rankIndex: getRankFromLevel(11),
        rankTitle: getRankTitle(getRankFromLevel(11))
      },
      level60: {
        rankIndex: getRankFromLevel(60),
        rankTitle: getRankTitle(getRankFromLevel(60))
      },
      level410: {
        rankIndex: getRankFromLevel(410),
        rankTitle: getRankTitle(getRankFromLevel(410))
      }
    }
  };
}

function validateScoreAndLeaderboards() {
  if (SCORE_NORMALIZATION_FACTOR !== 0.1) fail(`score normalization factor is ${SCORE_NORMALIZATION_FACTOR}, expected 0.1`);
  if (SCORE_REWARD_MULTIPLIER !== 1.265) fail(`score reward multiplier is ${SCORE_REWARD_MULTIPLIER}, expected 1.265`);
  if (SCORE_NORMALIZATION_ROUNDING !== 'Math.round') fail(`score rounding is ${SCORE_NORMALIZATION_ROUNDING}, expected Math.round`);
  if (normalizeScoreDelta(100000) !== 12650) fail(`100000 should normalize to 12650 with reward multiplier, got ${normalizeScoreDelta(100000)}`);
  if (normalizeLegacyScoreForReset(553006) !== 55301) {
    fail(`553006 should normalize to 55301, got ${normalizeLegacyScoreForReset(553006)}`);
  }

  const eirikValidation = getPilotNameValidation('Eirik');
  if (!eirikValidation.valid || eirikValidation.publicName !== 'EIRIK') {
    fail(`Eirik validation failed: ${JSON.stringify(eirikValidation)}`);
  }
  if (toPublicPilotName('Eirik', 553006) !== 'EIRIK') fail('global pilot sanitizer would replace Eirik');
  if (sanitizeLocalPilotName('Eirik', 553006) !== 'EIRIK') fail('local pilot sanitizer would replace Eirik');
  if (toPublicPilotName('', 553006) !== 'PILOT06') fail('blank global pilot fallback should be PILOT06 for seed 553006');
  if (sanitizeLocalPilotName('', 553006) !== 'PILOT06') fail('blank local pilot fallback should be PILOT06 for seed 553006');
  if (getPilotNameValidation('KLAUS').valid) fail('blocked pilot name validation did not reject invalid name');

  const maxSeedScore = Math.max(...PRE_RELEASE_SEED_SCORES.map((entry) => Number(entry.score) || 0));
  const minSeedScore = Math.min(...PRE_RELEASE_SEED_SCORES.map((entry) => Number(entry.score) || 0));
  if (maxSeedScore > 8000) warn(`pre-release seed high score is ${maxSeedScore}; target was low and beatable`);
  if (unique(PRE_RELEASE_SEED_SCORES.map((entry) => entry.name)).length !== PRE_RELEASE_SEED_SCORES.length) {
    fail('pre-release seed leaderboard names contain duplicates');
  }

  const steamDetails = encodeSteamLeaderboardDetails({
    score: normalizeLegacyScoreForReset(553006),
    level: 11,
    shipNumericId: 8,
    runTimeSeconds: 240,
    kills: 100,
    bossKills: 2,
    wavesCleared: 10
  });
  if (steamDetails[0] !== 11 || steamDetails[1] !== 8) fail(`Steam details encoding drifted: ${steamDetails.join(',')}`);

  return {
    scoreFactor: SCORE_NORMALIZATION_FACTOR,
    scoreRewardMultiplier: SCORE_REWARD_MULTIPLIER,
    scoreRounding: SCORE_NORMALIZATION_ROUNDING,
    examples: {
      old100000: normalizeScoreDelta(100000),
      old553006: normalizeLegacyScoreForReset(553006)
    },
    eirikPublicName: toPublicPilotName('Eirik', 553006),
    blankFallback: toPublicPilotName('', 553006),
    seedScoreRange: [minSeedScore, maxSeedScore],
    seedNames: PRE_RELEASE_SEED_SCORES.map((entry) => entry.name),
    steamDetailsExample: steamDetails
  };
}

const enemyStats = validateEnemyVariety();
const progression = validateProgression();
const scoreAndLeaderboards = validateScoreAndLeaderboards();

const movementAfter11 = ENEMY_MOVEMENT_STYLE_DEFS
  .filter((style) => style.unlockLevel > 11)
  .map((style) => `${style.id}@${style.unlockLevel}`);
const attacksAfter11 = ENEMY_ATTACK_STYLE_DEFS
  .filter((style) => style.unlockLevel > 11)
  .map((style) => `${style.id}@${style.unlockLevel}`);
const levelBeforeLateMayhem = getGeneratedEnemyPoolStats(GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL - 1);

const report = {
  ok: errors.length === 0,
  generatedAt: new Date().toISOString(),
  outputDir,
  coverage: [
    'static enemy profile/style validation',
    'movement and attack implementation probes',
    'ship unlock and rank pacing',
    'score normalization examples',
    'pilot name sanitization regression',
    'pre-release seed leaderboard bounds',
    'Steam details metadata encoding'
  ],
  enemyVariety: {
    totalProfiles: GENERATED_ENEMY_PROFILES.length,
    totalMovementFamilies: unique(GENERATED_ENEMY_PROFILES.map((profile) => profile.movementStyle)).length,
    totalAttackFamilies: unique(GENERATED_ENEMY_PROFILES.map((profile) => profile.fireStyle)).length,
    fullUnlockLevel: GENERATED_ENEMY_FULL_UNLOCK_LEVEL,
    sampledLevels: enemyStats,
    levelBeforeLateMayhem,
    movementFamiliesAfterLevel11: movementAfter11,
    attackFamiliesAfterLevel11: attacksAfter11
  },
  progression,
  scoreAndLeaderboards,
  findings,
  warnings,
  errors
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error(`[release-qa-gauntlet] FAIL ${errors.length} issue(s) report=${path.join(outputDir, 'report.json')}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `[release-qa-gauntlet] PASS profiles=${report.enemyVariety.totalProfiles} ` +
  `movement=${report.enemyVariety.totalMovementFamilies} attacks=${report.enemyVariety.totalAttackFamilies} ` +
  `level11=${enemyStats.find((entry) => entry.level === 11).availableProfiles}/${GENERATED_ENEMY_PROFILES.length} ` +
  `score553006=${scoreAndLeaderboards.examples.old553006} report=${path.join(outputDir, 'report.json')}`
);
for (const warning of warnings) console.warn(`[release-qa-gauntlet] warning: ${warning}`);
for (const finding of findings) console.warn(`[release-qa-gauntlet] finding(${finding.severity}): ${finding.summary}`);
