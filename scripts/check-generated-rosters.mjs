import fs from 'node:fs';
import path from 'node:path';
import { ShipData } from '../src/config/ShipData.js';
import { buildSelectableShipVariants } from '../src/config/VisualVariantCatalog.js';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { GENERATED_ENEMY_PROFILES } from '../src/config/GeneratedEnemyProfiles.js';

const root = process.cwd();
const errors = [];

function fail(message) {
  errors.push(message);
}

function existsPublic(publicPath) {
  const relative = String(publicPath || '').replace(/^\//, '');
  return fs.existsSync(path.join(root, 'public', relative));
}

const ships = buildSelectableShipVariants(ShipData);
if (ships.length !== 25) fail(`expected 25 playable ships, found ${ships.length}`);
if ((AssetManifest.generated?.playerShips || []).length !== 25) fail('AssetManifest.generated.playerShips must contain 25 assets');
if ((AssetManifest.sprites?.playerRankShips || []).length !== 25) fail('AssetManifest.sprites.playerRankShips must contain 25 generated playable assets');

for (const ship of ships) {
  const asset = AssetManifest.sprites.playerRankShips[ship.textureIndex];
  if (!asset || !existsPublic(asset)) fail(`${ship.id} missing playable ship asset ${asset || 'none'}`);
  if (!ship.trait?.label || !ship.trait?.effects?.combat) fail(`${ship.id} missing gameplay trait`);
  if (!ship.unlock) fail(`${ship.id} missing unlock rule`);
}

const starterCount = ships.filter(ship => !(ship.unlock?.score || 0) && !(ship.unlock?.rank || 0)).length;
if (starterCount !== 1) fail(`expected exactly one starter ship, found ${starterCount}`);

const enemyAssets = AssetManifest.generated?.enemies || [];
if (enemyAssets.length !== 50) fail(`expected 50 generated enemy assets, found ${enemyAssets.length}`);
if (GENERATED_ENEMY_PROFILES.length !== 50) fail(`expected 50 generated enemy profiles, found ${GENERATED_ENEMY_PROFILES.length}`);

const behaviorSignatures = new Set();
for (const profile of GENERATED_ENEMY_PROFILES) {
  const asset = enemyAssets[profile.spriteIndex];
  if (!asset || !existsPublic(asset)) fail(`${profile.id} missing generated enemy asset ${asset || 'none'}`);
  behaviorSignatures.add([
    profile.health,
    profile.speed,
    profile.shootDelay,
    profile.radius,
    profile.movementStyle,
    profile.fireStyle,
    profile.shotCount,
    profile.spread,
    profile.projectileSpeedMult,
    profile.diveBias
  ].join('|'));
}

if (behaviorSignatures.size < 45) fail(`expected at least 45 distinct enemy behavior signatures, found ${behaviorSignatures.size}`);

if (errors.length) {
  console.error(`[GeneratedRosters] FAIL ${errors.length} issue(s)`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[GeneratedRosters] PASS ships=${ships.length} enemies=${GENERATED_ENEMY_PROFILES.length} enemyBehaviors=${behaviorSignatures.size}`);
