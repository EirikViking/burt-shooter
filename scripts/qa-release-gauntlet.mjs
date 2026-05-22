import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  GENERATED_ENEMY_FULL_UNLOCK_LEVEL,
  GENERATED_ENEMY_PROFILES,
  getGeneratedEnemyPoolStats
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
import { PRE_RELEASE_SEED_SCORES, sanitizeLocalPilotName } from '../src/api/LocalLeaderboard.js';
import {
  SCORE_NORMALIZATION_FACTOR,
  SCORE_NORMALIZATION_ROUNDING,
  normalizeLegacyScoreForReset,
  normalizeScoreDelta
} from '../src/shared/ScorePolicy.js';
import {
  MAX_RANK_INDEX,
  getRankFromLevel,
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

function unlockedShipsAt(level) {
  const progress = {
    bestScore: 0,
    bestRank: getRankFromLevel(level),
    bestLevel: level
  };
  return getSelectableShips().filter((ship) => isShipUnlocked(ship.spriteKey, progress));
}

function nextShipAfter(level) {
  const progress = {
    bestScore: 0,
    bestRank: getRankFromLevel(level),
    bestLevel: level
  };
  return getSelectableShips()
    .filter((ship) => !isShipUnlocked(ship.spriteKey, progress))
    .sort((a, b) => (Number(a.unlock?.level) || 1) - (Number(b.unlock?.level) || 1))[0] || null;
}

function validateEnemyVariety() {
  const movementIds = new Set(ENEMY_MOVEMENT_STYLE_IDS);
  const attackIds = new Set(ENEMY_ATTACK_STYLE_IDS);
  const ids = new Set();
  const types = new Set();

  if (GENERATED_ENEMY_PROFILES.length < 120) {
    fail(`expected at least 120 normal enemy profiles, found ${GENERATED_ENEMY_PROFILES.length}`);
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
  const level11 = stats.find((entry) => entry.level === 11);
  const level40 = stats.find((entry) => entry.level === 40);
  if (level1.availableProfiles < 8 || level1.availableProfiles > 12) {
    fail(`level 1 should expose 8-12 normal enemy profiles, found ${level1.availableProfiles}`);
  }
  if (level11.availableProfiles >= total) fail(`level 11 exposes all ${total} normal enemy profiles`);
  if (level11.movementFamilies >= level11.totalMovementFamilies) fail('level 11 exposes all movement families');
  if (level11.attackFamilies >= level11.totalAttackFamilies) fail('level 11 exposes all attack families');
  if (level40.availableProfiles !== total) fail(`level 40 exposes ${level40.availableProfiles}/${total} profiles`);
  if (level40.movementFamilies !== level40.totalMovementFamilies) fail('level 40 does not expose all movement families');
  if (level40.attackFamilies !== level40.totalAttackFamilies) fail('level 40 does not expose all attack families');
  return stats;
}

function validateProgression() {
  const ships = getSelectableShips();
  const shipThresholds = ships.map((ship) => Number(ship.unlock?.level) || 1);
  const rankThresholds = getThresholds();
  const level1Ships = unlockedShipsAt(1);
  const level11Ships = unlockedShipsAt(11);
  const level60Ships = unlockedShipsAt(60);

  if (ships.length !== 25) fail(`expected 25 selectable ships, found ${ships.length}`);
  if (level1Ships.length !== 1) fail(`level 1 should unlock only starter ship, found ${level1Ships.length}`);
  if (level11Ships.length >= ships.length) fail('level 11 unlocks the full hangar');
  if (level11Ships.length !== 8) warn(`level 11 currently unlocks ${level11Ships.length} ships; expected 8 after pacing fix`);
  if (level60Ships.length !== ships.length) fail(`level 60 unlocks ${level60Ships.length}/${ships.length} ships`);
  if (getRankFromLevel(1) !== 0) fail(`level 1 rank should be 0, found ${getRankFromLevel(1)}`);
  if (getRankFromLevel(11) >= MAX_RANK_INDEX) fail('level 11 reaches max rank');
  if (getRankFromLevel(60) !== MAX_RANK_INDEX) fail(`level 60 should reach max rank ${MAX_RANK_INDEX}`);

  const afterLevel21 = nextShipAfter(21);
  if (afterLevel21?.name === 'VIOLET FEINT' && Number(afterLevel21.unlock?.level) === 23) {
    findings.push({
      severity: 'polish',
      area: 'progression copy',
      summary: 'A run that reaches level 5 can still show next ship Violet Feint at level 23 if stored career best is level 21.',
      suggestedFix: 'Label the game-over next ship and next goal lines as career progress when they are based on stored best level.'
    });
  }

  return {
    shipThresholds,
    rankThresholds,
    level1: {
      unlockedShips: level1Ships.length,
      rankIndex: getRankFromLevel(1),
      rankTitle: getRankTitle(getRankFromLevel(1))
    },
    level11: {
      unlockedShips: level11Ships.length,
      rankIndex: getRankFromLevel(11),
      rankTitle: getRankTitle(getRankFromLevel(11))
    },
    level60: {
      unlockedShips: level60Ships.length,
      rankIndex: getRankFromLevel(60),
      rankTitle: getRankTitle(getRankFromLevel(60))
    },
    nextShipAfterLevel21: afterLevel21
      ? { name: afterLevel21.name, requiredLevel: Number(afterLevel21.unlock?.level) || 1 }
      : null
  };
}

function validateScoreAndLeaderboards() {
  if (SCORE_NORMALIZATION_FACTOR !== 0.1) fail(`score normalization factor is ${SCORE_NORMALIZATION_FACTOR}, expected 0.1`);
  if (SCORE_NORMALIZATION_ROUNDING !== 'Math.round') fail(`score rounding is ${SCORE_NORMALIZATION_ROUNDING}, expected Math.round`);
  if (normalizeScoreDelta(100000) !== 10000) fail(`100000 should normalize to 10000, got ${normalizeScoreDelta(100000)}`);
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
