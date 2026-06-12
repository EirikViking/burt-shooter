import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG } from '../src/audio/SoundCatalog.js';
import {
  GENERATED_ENEMY_EXTRA_TOTAL,
  GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL,
  GENERATED_ENEMY_LEGACY_ASSET_COUNT,
  GENERATED_ENEMY_LEGACY_TOTAL,
  GENERATED_ENEMY_PROFILES,
  GENERATED_ENEMY_TOTAL,
  getGeneratedEnemyProfilesForLevel
} from '../src/config/GeneratedEnemyProfiles.js';

const errors = [];
const root = process.cwd();

function fail(message) {
  errors.push(message);
}

function hashFile(publicPath) {
  const file = path.join(root, 'public', String(publicPath || '').replace(/^\//, ''));
  if (!fs.existsSync(file)) {
    fail(`missing mayhem asset ${publicPath}`);
    return null;
  }
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const profiles = GENERATED_ENEMY_PROFILES;
const late = profiles.filter((profile) => profile.lateMayhem === true);
const level10 = getGeneratedEnemyProfilesForLevel(GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL - 1);
const level11 = getGeneratedEnemyProfilesForLevel(GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL);
const level11Late = level11.filter((profile) => profile.lateMayhem === true);
const assets = AssetManifest.generated?.enemies || [];
const lateAssetPaths = late.map((profile) => assets[profile.spriteIndex]);

if (profiles.length !== GENERATED_ENEMY_TOTAL) {
  fail(`expected ${GENERATED_ENEMY_TOTAL} total generated enemies, found ${profiles.length}`);
}
if (late.length !== GENERATED_ENEMY_EXTRA_TOTAL) {
  fail(`expected ${GENERATED_ENEMY_EXTRA_TOTAL} late-mayhem enemies, found ${late.length}`);
}
if (level10.some((profile) => profile.lateMayhem)) {
  fail(`late-mayhem profiles must not unlock before level ${GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL}`);
}
if (level11Late.length < 1) {
  fail(`level ${GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL} should introduce at least one late-mayhem enemy`);
}
if (level10.length < 40 || level10.length >= GENERATED_ENEMY_LEGACY_TOTAL) {
  fail(`level 10 should still be legacy-only mid progression, found ${level10.length}`);
}

const names = new Set();
const spriteIndexes = new Set();
const behaviorSignatures = new Set();
for (const profile of late) {
  if (profile.unlockLevel < GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL) {
    fail(`${profile.id} unlocks too early at level ${profile.unlockLevel}`);
  }
  if (!profile.displayName || names.has(profile.displayName)) {
    fail(`late-mayhem enemy has duplicate/missing displayName ${profile.displayName || 'none'}`);
  }
  names.add(profile.displayName);
  if (!Number.isInteger(profile.spriteIndex) || profile.spriteIndex < GENERATED_ENEMY_LEGACY_ASSET_COUNT) {
    fail(`${profile.id} should use a unique late sprite index, found ${profile.spriteIndex}`);
  }
  if (spriteIndexes.has(profile.spriteIndex)) {
    fail(`duplicate late-mayhem sprite index ${profile.spriteIndex}`);
  }
  spriteIndexes.add(profile.spriteIndex);
  if (!profile.deathSfx || !SFX_CATALOG[profile.deathSfx]) {
    fail(`${profile.id} references missing death SFX ${profile.deathSfx || 'none'}`);
  }
  if (!Array.isArray(profile.palette) || profile.palette.length < 3) {
    fail(`${profile.id} missing three-color mayhem palette`);
  }
  if ((Number(profile.profileFireScalar) || 1) > 0.86) {
    fail(`${profile.id} profileFireScalar is too hot: ${profile.profileFireScalar}`);
  }
  if ((Number(profile.profileDiveScalar) || 1) > 0.78) {
    fail(`${profile.id} profileDiveScalar is too hot: ${profile.profileDiveScalar}`);
  }
  behaviorSignatures.add([
    profile.unlockLevel,
    profile.role,
    profile.health,
    profile.speed,
    profile.shootDelay,
    profile.radius,
    profile.movementStyle,
    profile.fireStyle,
    profile.projectileSpeedMult,
    profile.damageMult,
    profile.diveBias,
    profile.targetWidth,
    profile.mayhemClass,
    profile.deathSfx,
    profile.spriteIndex
  ].join('|'));
}

const assetHashes = lateAssetPaths.map(hashFile).filter(Boolean);
if (new Set(lateAssetPaths).size !== GENERATED_ENEMY_EXTRA_TOTAL) {
  fail(`expected ${GENERATED_ENEMY_EXTRA_TOTAL} unique late-mayhem asset paths`);
}
if (new Set(assetHashes).size !== GENERATED_ENEMY_EXTRA_TOTAL) {
  fail(`expected ${GENERATED_ENEMY_EXTRA_TOTAL} unique late-mayhem SVG silhouettes`);
}
if (behaviorSignatures.size !== GENERATED_ENEMY_EXTRA_TOTAL) {
  fail(`expected ${GENERATED_ENEMY_EXTRA_TOTAL} unique late-mayhem behavior signatures, found ${behaviorSignatures.size}`);
}

if (errors.length) {
  console.error(`[late-enemy-mayhem] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `[late-enemy-mayhem] PASS total=${profiles.length} late=${late.length} ` +
  `level10=${level10.length} level11Late=${level11Late.length} uniqueAssets=${assetHashes.length}`
);
