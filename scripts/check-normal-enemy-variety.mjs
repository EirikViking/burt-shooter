import { AssetManifest } from '../src/assets/assetManifest.js';
import {
  GENERATED_ENEMY_FULL_UNLOCK_LEVEL,
  GENERATED_ENEMY_PROFILES,
  getGeneratedEnemyProfilesForLevel,
  getGeneratedEnemyPoolStats
} from '../src/config/GeneratedEnemyProfiles.js';
import { ENEMY_ATTACK_STYLE_DEFS, ENEMY_ATTACK_STYLE_IDS } from '../src/config/EnemyAttackStyles.js';
import { ENEMY_MOVEMENT_STYLE_DEFS, ENEMY_MOVEMENT_STYLE_IDS } from '../src/config/EnemyMovementStyles.js';
import { FIRE_STYLE_WEAPON_IDS } from '../src/config/EnemyWeaponProfiles.js';

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function unique(values) {
  return [...new Set(values)];
}

const profiles = GENERATED_ENEMY_PROFILES;
const total = profiles.length;
const assetCount = AssetManifest.generated?.enemies?.length || 0;
const movementIds = new Set(ENEMY_MOVEMENT_STYLE_IDS);
const attackIds = new Set(ENEMY_ATTACK_STYLE_IDS);
const usedMovement = new Set(profiles.map((profile) => profile.movementStyle));
const usedAttacks = new Set(profiles.map((profile) => profile.fireStyle));
const ids = new Set();
const types = new Set();

if (total < 120) fail(`expected at least 120 normal enemy profiles, found ${total}`);
if (usedMovement.size < 24) fail(`expected at least 24 movement families, found ${usedMovement.size}`);
if (usedAttacks.size < 20) fail(`expected at least 20 attack families, found ${usedAttacks.size}`);
if (assetCount < 50) fail(`expected at least 50 generated enemy assets to reuse, found ${assetCount}`);

for (const profile of profiles) {
  if (!profile.id) fail('profile missing id');
  if (!profile.type) fail(`${profile.id || 'unknown'} missing type`);
  if (ids.has(profile.id)) fail(`duplicate enemy id ${profile.id}`);
  if (types.has(profile.type)) fail(`duplicate enemy type ${profile.type}`);
  ids.add(profile.id);
  types.add(profile.type);

  if (!Number.isInteger(profile.unlockLevel) || profile.unlockLevel < 1) {
    fail(`${profile.id} has invalid unlockLevel ${profile.unlockLevel}`);
  }
  if (profile.unlockLevel > GENERATED_ENEMY_FULL_UNLOCK_LEVEL) {
    fail(`${profile.id} unlocks after level ${GENERATED_ENEMY_FULL_UNLOCK_LEVEL}: ${profile.unlockLevel}`);
  }
  if (!movementIds.has(profile.movementStyle)) {
    fail(`${profile.id} references unimplemented movementStyle ${profile.movementStyle}`);
  }
  if (!attackIds.has(profile.fireStyle)) {
    fail(`${profile.id} references unimplemented fireStyle ${profile.fireStyle}`);
  }
  if (!Number.isInteger(profile.spriteIndex) || profile.spriteIndex < 0 || profile.spriteIndex >= assetCount) {
    fail(`${profile.id} has invalid spriteIndex ${profile.spriteIndex}`);
  }
  if (profile.movementStyle && profile.unlockLevel < (ENEMY_MOVEMENT_STYLE_DEFS.find((style) => style.id === profile.movementStyle)?.unlockLevel || 1)) {
    fail(`${profile.id} uses movement ${profile.movementStyle} before its unlock level`);
  }
  if (profile.fireStyle && profile.unlockLevel < (ENEMY_ATTACK_STYLE_DEFS.find((style) => style.id === profile.fireStyle)?.unlockLevel || 1)) {
    fail(`${profile.id} uses attack ${profile.fireStyle} before its unlock level`);
  }
}

for (const style of ENEMY_MOVEMENT_STYLE_DEFS) {
  if (!usedMovement.has(style.id)) fail(`movement style ${style.id} is defined but unused by profiles`);
}

for (const style of ENEMY_ATTACK_STYLE_DEFS) {
  if (!usedAttacks.has(style.id)) fail(`attack style ${style.id} is defined but unused by profiles`);
  if (!FIRE_STYLE_WEAPON_IDS[style.id]) fail(`attack style ${style.id} has no weapon profile mapping`);
}

const level1 = getGeneratedEnemyProfilesForLevel(1);
const level11 = getGeneratedEnemyProfilesForLevel(11);
const level40 = getGeneratedEnemyProfilesForLevel(40);
const level11Move = unique(level11.map((profile) => profile.movementStyle));
const level40Move = unique(level40.map((profile) => profile.movementStyle));
const level11Attack = unique(level11.map((profile) => profile.fireStyle));
const level40Attack = unique(level40.map((profile) => profile.fireStyle));

if (level1.length < 8 || level1.length > 12) fail(`level 1 should expose 8-12 profiles, found ${level1.length}`);
if (level11.length >= total) fail(`level 11 exposes all ${total} profiles`);
if (level11.length < Math.floor(total * 0.3) || level11.length > Math.ceil(total * 0.45)) {
  fail(`level 11 should expose roughly 30-45 percent of profiles, found ${level11.length}/${total}`);
}
if (level40.length !== total) fail(`level 40 should expose all profiles, found ${level40.length}/${total}`);
if (level11Move.length >= usedMovement.size) fail(`level 11 exposes all ${usedMovement.size} movement families`);
if (level40Move.length !== usedMovement.size) fail(`level 40 exposes ${level40Move.length}/${usedMovement.size} movement families`);
if (level11Attack.length >= usedAttacks.size) fail(`level 11 exposes all ${usedAttacks.size} attack families`);
if (level40Attack.length !== usedAttacks.size) fail(`level 40 exposes ${level40Attack.length}/${usedAttacks.size} attack families`);

const stats = [1, 5, 10, 11, 20, 30, 40].map((level) => getGeneratedEnemyPoolStats(level));
for (let i = 1; i < stats.length; i += 1) {
  if (stats[i].availableProfiles <= stats[i - 1].availableProfiles && stats[i].level < 40) {
    warnings.push(`profile count did not increase between sampled levels ${stats[i - 1].level} and ${stats[i].level}`);
  }
}

if (errors.length) {
  console.error(`[normal-enemy-variety] FAIL ${errors.length} issue(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `[normal-enemy-variety] PASS profiles=${total} movement=${usedMovement.size} attacks=${usedAttacks.size} ` +
  `level1=${level1.length} level11=${level11.length} level40=${level40.length}`
);
if (warnings.length) {
  for (const warning of warnings) console.warn(`[normal-enemy-variety] warning: ${warning}`);
}
