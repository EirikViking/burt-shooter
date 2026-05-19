import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { ENEMY_WEAPON_PROFILES } from '../src/config/EnemyWeaponProfiles.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const assets = AssetManifest.generated?.enemyWeapons || [];
const errors = [];

if (assets.length !== 12) {
  errors.push(`expected 12 generated enemy weapon assets, found ${assets.length}`);
}
if (ENEMY_WEAPON_PROFILES.length !== assets.length) {
  errors.push(`weapon profile count ${ENEMY_WEAPON_PROFILES.length} does not match asset count ${assets.length}`);
}

const seen = new Set();
for (const profile of ENEMY_WEAPON_PROFILES) {
  if (!profile.id) errors.push('weapon profile missing id');
  if (seen.has(profile.id)) errors.push(`duplicate weapon profile id ${profile.id}`);
  seen.add(profile.id);
  if (!Number.isInteger(profile.assetIndex) || profile.assetIndex < 0 || profile.assetIndex >= assets.length) {
    errors.push(`${profile.id} has invalid assetIndex ${profile.assetIndex}`);
  }
  if (!Number.isFinite(profile.radius) || profile.radius < 4 || profile.radius > 8) {
    errors.push(`${profile.id} has unsafe radius ${profile.radius}`);
  }
  if (!Number.isFinite(profile.spriteScale) || profile.spriteScale < 0.1 || profile.spriteScale > 0.18) {
    errors.push(`${profile.id} has unsafe spriteScale ${profile.spriteScale}`);
  }
  if (!profile.behavior) {
    errors.push(`${profile.id} is missing a movement behavior`);
  }
  if (!Number.isFinite(profile.speedMult) || profile.speedMult < 0.65 || profile.speedMult > 1.3) {
    errors.push(`${profile.id} has unsafe speedMult ${profile.speedMult}`);
  }
}

const behaviorCount = new Set(ENEMY_WEAPON_PROFILES.map((profile) => profile.behavior)).size;
if (behaviorCount < 10) {
  errors.push(`expected broad projectile behavior variety, found ${behaviorCount} unique behaviors`);
}

const maxRadius = Math.max(...ENEMY_WEAPON_PROFILES.map((profile) => profile.radius));
const maxScale = Math.max(...ENEMY_WEAPON_PROFILES.map((profile) => profile.spriteScale));
if (maxRadius > 8) errors.push(`enemy projectile hit radius is too ship-like (${maxRadius})`);
if (maxScale > 0.18) errors.push(`enemy projectile sprite scale is too ship-like (${maxScale})`);

for (const asset of assets) {
  const file = path.join(root, 'public', asset.replace(/^\//, ''));
  if (!existsSync(file)) {
    errors.push(`missing enemy weapon asset ${asset}`);
    continue;
  }
  const size = statSync(file).size;
  if (size < 2000) errors.push(`enemy weapon asset looks too small: ${asset} (${size} bytes)`);
}

if (errors.length) {
  console.error(`[enemy-weapons] FAIL\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`[enemy-weapons] PASS profiles=${ENEMY_WEAPON_PROFILES.length} assets=${assets.length} behaviors=${behaviorCount} maxRadius=${maxRadius} maxScale=${maxScale}`);
