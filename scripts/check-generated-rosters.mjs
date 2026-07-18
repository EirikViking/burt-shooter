import fs from 'node:fs';
import path from 'node:path';
import { ShipData } from '../src/config/ShipData.js';
import { buildSelectableShipVariants } from '../src/config/VisualVariantCatalog.js';
import { AssetManifest } from '../src/assets/assetManifest.js';
import {
  GENERATED_ENEMY_ASSET_COUNT,
  GENERATED_ENEMY_EARLY_SURGE_TOTAL,
  GENERATED_ENEMY_EXTRA_TOTAL,
  GENERATED_ENEMY_PROFILES,
  GENERATED_ENEMY_TOTAL
} from '../src/config/GeneratedEnemyProfiles.js';

const root = process.cwd();
const errors = [];
const PLAYABLE_SHIP_COUNT = 30;
const GENERATED_PLAYER_SHIP_ASSET_COUNT = 25;

function fail(message) {
  errors.push(message);
}

function existsPublic(publicPath) {
  const relative = String(publicPath || '').replace(/^\//, '');
  return fs.existsSync(path.join(root, 'public', relative));
}

const ships = buildSelectableShipVariants(ShipData);
if (ships.length !== PLAYABLE_SHIP_COUNT) fail(`expected ${PLAYABLE_SHIP_COUNT} playable ships, found ${ships.length}`);
if ((AssetManifest.generated?.playerShips || []).length !== GENERATED_PLAYER_SHIP_ASSET_COUNT) fail(`AssetManifest.generated.playerShips must contain ${GENERATED_PLAYER_SHIP_ASSET_COUNT} real generated assets`);
if ((AssetManifest.sprites?.playerRankShips || []).length !== GENERATED_PLAYER_SHIP_ASSET_COUNT) fail(`AssetManifest.sprites.playerRankShips must contain ${GENERATED_PLAYER_SHIP_ASSET_COUNT} real generated playable assets`);

for (const ship of ships) {
  const asset = AssetManifest.sprites.playerRankShips[ship.textureIndex];
  if (!asset || !existsPublic(asset)) fail(`${ship.id} missing playable ship asset ${asset || 'none'}`);
  if (!ship.trait?.label || !ship.trait?.effects?.combat) fail(`${ship.id} missing gameplay trait`);
  if (!ship.unlock) fail(`${ship.id} missing unlock rule`);
}

const starterCount = ships.filter(ship => (Number(ship.unlock?.level) || 1) <= 1).length;
if (starterCount !== 1) fail(`expected exactly one starter ship, found ${starterCount}`);

const enemyAssets = AssetManifest.generated?.enemies || [];
if (enemyAssets.length !== GENERATED_ENEMY_ASSET_COUNT) fail(`expected ${GENERATED_ENEMY_ASSET_COUNT} generated enemy assets, found ${enemyAssets.length}`);
if (GENERATED_ENEMY_PROFILES.length !== GENERATED_ENEMY_TOTAL) fail(`expected ${GENERATED_ENEMY_TOTAL} generated enemy profiles, found ${GENERATED_ENEMY_PROFILES.length}`);
const lateMayhemProfiles = GENERATED_ENEMY_PROFILES.filter((profile) => profile.lateMayhem === true);
if (lateMayhemProfiles.length !== GENERATED_ENEMY_EXTRA_TOTAL) fail(`expected ${GENERATED_ENEMY_EXTRA_TOTAL} late mayhem profiles, found ${lateMayhemProfiles.length}`);
const earlySurgeProfiles = GENERATED_ENEMY_PROFILES.filter((profile) => profile.earlySurge === true);
if (earlySurgeProfiles.length !== GENERATED_ENEMY_EARLY_SURGE_TOTAL) fail(`expected ${GENERATED_ENEMY_EARLY_SURGE_TOTAL} early surge profiles, found ${earlySurgeProfiles.length}`);

const behaviorSignatures = new Set();
const enemyIds = new Set();
for (const profile of GENERATED_ENEMY_PROFILES) {
  if (enemyIds.has(profile.id)) fail(`duplicate enemy profile id ${profile.id}`);
  enemyIds.add(profile.id);
  const asset = enemyAssets[profile.spriteIndex];
  if (!asset || !existsPublic(asset)) fail(`${profile.id} missing generated enemy asset ${asset || 'none'}`);
  behaviorSignatures.add([
    profile.displayName,
    profile.tint,
    profile.accent,
    profile.unlockLevel,
    profile.role,
    profile.health,
    profile.speed,
    profile.shootDelay,
    profile.radius,
    profile.movementStyle,
    profile.fireStyle,
    profile.shotCount,
    profile.spread,
    profile.projectileSpeedMult,
    profile.damageMult,
    profile.diveBias,
    profile.targetWidth,
    profile.behaviorSeed || ''
  ].join('|'));
}

if (behaviorSignatures.size !== GENERATED_ENEMY_TOTAL) fail(`expected ${GENERATED_ENEMY_TOTAL} distinct enemy behavior signatures, found ${behaviorSignatures.size}`);

if (errors.length) {
  console.error(`[GeneratedRosters] FAIL ${errors.length} issue(s)`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[GeneratedRosters] PASS ships=${ships.length} enemies=${GENERATED_ENEMY_PROFILES.length} enemyBehaviors=${behaviorSignatures.size}`);
