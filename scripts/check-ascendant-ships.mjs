import fs from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { ShipData } from '../src/config/ShipData.js';
import { getSelectableShips } from '../src/config/ShipMetadata.js';
import { ShipUnlockConfig, getShipUnlockDefinition } from '../src/config/ShipUnlockConfig.js';

const root = process.cwd();
const errors = [];
const warn = [];

const EXPECTED_NORMALS = [
  ['nova_ship_01', 'NOVA SPARROW'],
  ['nova_ship_02', 'COMET COURIER'],
  ['nova_ship_03', 'PIXEL NEEDLE'],
  ['nova_ship_04', 'MINT SKATER'],
  ['nova_ship_05', 'CRIMSON BITE'],
  ['nova_ship_06', 'IRON ORBIT'],
  ['nova_ship_07', 'QUASAR FAN'],
  ['nova_ship_08', 'GLACIER SCOPE'],
  ['nova_ship_09', 'ARC STRIKER'],
  ['nova_ship_10', 'SOLAR HAMMER'],
  ['nova_ship_11', 'CIRCUIT TAP'],
  ['nova_ship_12', 'VIOLET FEINT'],
  ['nova_ship_13', 'AURIC CORE'],
  ['nova_ship_14', 'PLASMA SKATE'],
  ['nova_ship_15', 'RUBY SPIKE'],
  ['nova_ship_16', 'SPECTRAL SLIP'],
  ['nova_ship_17', 'COBALT GUARD'],
  ['nova_ship_18', 'EMBER BURST'],
  ['nova_ship_19', 'NEON STUTTER'],
  ['nova_ship_20', 'QUARTZ NEEDLE'],
  ['nova_ship_21', 'CHROME RAIL'],
  ['nova_ship_22', 'VERDANT FLOW'],
  ['nova_ship_23', 'HAZARD RAM'],
  ['nova_ship_24', 'NOVA OVERDRIVE'],
  ['nova_ship_25', 'ARCADE LEGEND']
];

const ASCENDANT_TARGETS = [
  ['nova_ship_26', 'AEGIS COMET', 30, [1.095, 1.13]],
  ['nova_ship_27', 'RAILBREAKER', 35, [1.105, 1.15]],
  ['nova_ship_28', 'DRONE SOVEREIGN', 40, [1.12, 1.16]],
  ['nova_ship_29', 'PHASE SERAPH', 45, [1.145, 1.18]],
  ['nova_ship_30', 'EIRIK THE VIKING', 50, [1.17, 1.2]]
];

function fail(message) {
  errors.push(message);
}

function publicPathExists(publicPath) {
  const relative = String(publicPath || '').replace(/^\//, '');
  return relative && fs.existsSync(path.join(root, 'public', relative));
}

function ratio(value, baseline) {
  return baseline > 0 ? value / baseline : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateEffectivePowerIndex(ship = {}) {
  const stats = ship.stats || {};
  const weapon = ship.weapon || {};
  const hitbox = ship.hitbox || {};
  const combat = ship.trait?.effects?.combat || {};

  const damageFactor = (Number(stats.damage) || 1) * Math.max(1, Number(weapon.bullets) || 1);
  const cadenceFactor = 140 / Math.max(1, Number(stats.fireRate) || 140);
  const projectileFactor = 0.92 + (Math.min(16, Number(stats.bulletSpeed) || 12) / 16) * 0.08;
  const mobilityFactor = 0.86 + (Math.min(9, Number(stats.speed) || 6) / 9) * 0.14;
  const survivabilityFactor =
    1 +
    clamp((12 - (Number(hitbox.radius) || 12)) * 0.025, -0.12, 0.16) +
    Math.min(0.14, (Number(combat.dodgePulseRadius) || 0) / 700) +
    clamp((1 - (Number(combat.dodgeCooldownMult) || 1)) * 0.16, -0.06, 0.08);
  const specialUptimeFactor =
    1 +
    (combat.bonusShotEvery ? 0.28 / Number(combat.bonusShotEvery) : 0) +
    (combat.wingShotEvery ? 0.34 / Number(combat.wingShotEvery) : 0) +
    (combat.pierceEvery ? 0.32 / Number(combat.pierceEvery) : 0) +
    (combat.critEvery ? ((Number(combat.critDamageMult) || 1) - 1) / Number(combat.critEvery) : 0);
  const controlUtilityFactor =
    1 +
    Math.min(0.09, (Number(weapon.spread) || 0) * 0.2) +
    clamp(((Number(combat.projectileRadiusMult) || 1) - 1) * 0.32, -0.04, 0.08);

  return damageFactor *
    cadenceFactor *
    projectileFactor *
    mobilityFactor *
    survivabilityFactor *
    specialUptimeFactor *
    controlUtilityFactor;
}

const ships = getSelectableShips();
const shipsById = new Map(ships.map((ship) => [ship.id, ship]));
const unlocksById = new Map(ShipUnlockConfig.map((entry) => [entry.shipId, entry]));

if (ShipData.length !== 30) fail(`ShipData should expose 30 player-facing ships, found ${ShipData.length}`);
if (ships.length !== 30) fail(`selectable ship count should be 30, found ${ships.length}`);
if (ShipUnlockConfig.length !== 30) fail(`ShipUnlockConfig should cover 30 ships, found ${ShipUnlockConfig.length}`);

for (const [id, name] of EXPECTED_NORMALS) {
  const ship = shipsById.get(id);
  if (!ship) fail(`existing normal ship removed: ${id}`);
  else if (ship.name !== name) fail(`existing normal ship renamed: ${id} expected ${name}, found ${ship.name}`);
}

const ascendant = ships.filter((ship) => ship.tier === 'ascendant');
if (ascendant.length !== 5) fail(`expected exactly 5 Ascendant ships, found ${ascendant.length}`);

const normalShips = ships.filter((ship) => ship.tier !== 'ascendant');
const topNormalEpi = Math.max(...normalShips.map(calculateEffectivePowerIndex));
let previousPowerRating = 0;
let previousMeasuredRatio = 0;
const measuredRows = [];

for (const [id, expectedName, expectedLevel, targetRange] of ASCENDANT_TARGETS) {
  const ship = shipsById.get(id);
  const unlock = getShipUnlockDefinition(id);
  const config = unlocksById.get(id);
  if (!ship) {
    fail(`missing Ascendant ship ${id}`);
    continue;
  }

  if (ship.name !== expectedName) fail(`${id} expected name ${expectedName}, found ${ship.name}`);
  if (ship.tier !== 'ascendant') fail(`${id} tier should be ascendant`);
  if (ship.powerClass !== 'late_game') fail(`${id} powerClass should be late_game`);
  if (Number(ship.unlockLevel) !== expectedLevel) fail(`${id} unlockLevel should be ${expectedLevel}, found ${ship.unlockLevel}`);
  if (Number(ship.unlock?.level) !== expectedLevel) fail(`${id} ship unlock label level should be ${expectedLevel}`);
  if (!unlock) fail(`${id} missing ShipUnlockConfig entry`);
  if (Number(unlock?.requirements?.bestSector) !== expectedLevel) fail(`${id} should unlock at bestSector ${expectedLevel}`);
  if (!String(config?.label || '').includes(`Level ${expectedLevel}`)) fail(`${id} unlock label should mention Level ${expectedLevel}`);
  if (String(config?.label || '').length > 32) fail(`${id} unlock label is too long for hangar cards: ${config.label}`);
  if (!ship.spriteKey || !ship.id) fail(`${id} missing id/spriteKey`);
  if (!ship.stats?.speed || !ship.stats?.fireRate || !ship.stats?.damage || !ship.stats?.bulletSpeed) fail(`${id} missing stats`);
  if (!ship.weapon?.bullets || !Number.isFinite(Number(ship.weapon.spread))) fail(`${id} missing weapon stats`);
  if (!ship.trait?.label || !ship.trait?.description || !ship.traitExplanation?.lines?.length) fail(`${id} missing trait or explanation`);
  if (!ship.role || !ship.fantasy || !ship.weakness || !ship.difficulty) fail(`${id} missing role/fantasy/weakness/difficulty metadata`);
  if (!Array.isArray(ship.recommendedBuildTags) || ship.recommendedBuildTags.length < 2) fail(`${id} missing recommendedBuildTags`);
  if (!ship.intendedSectorBand) fail(`${id} missing intendedSectorBand`);
  if (!ship.art || !Number.isInteger(ship.art.textureIndex)) fail(`${id} missing art reference`);

  const asset = AssetManifest.sprites?.playerRankShips?.[ship.textureIndex];
  if (!asset || !publicPathExists(asset)) fail(`${id} invalid fallback playable asset at textureIndex ${ship.textureIndex}: ${asset || 'none'}`);
  if (ship.art?.temporaryFallback) {
    const fallbackIndex = ship.art.textureIndex;
    const fallbackAsset = AssetManifest.sprites?.playerRankShips?.[fallbackIndex];
    if (!fallbackAsset || !publicPathExists(fallbackAsset)) fail(`${id} invalid temporary fallback art ${fallbackAsset || 'none'}`);
    warn.push(`${id} uses temporary fallback art ${ship.art.fallbackSpriteKey || fallbackAsset}`);
  }

  const measured = calculateEffectivePowerIndex(ship);
  const measuredRatio = ratio(measured, topNormalEpi);
  measuredRows.push({
    id,
    name: ship.name,
    unlockLevel: expectedLevel,
    epi: Number(measured.toFixed(3)),
    ratio: Number(measuredRatio.toFixed(3)),
    target: targetRange.join('-')
  });

  if (!(ship.powerRating > previousPowerRating)) fail(`${id} powerRating should be monotonic`);
  if (!(measuredRatio > previousMeasuredRatio)) fail(`${id} measured EPI ratio should be monotonic`);
  if (measuredRatio < targetRange[0] || measuredRatio > targetRange[1]) {
    fail(`${id} measured EPI ratio ${measuredRatio.toFixed(3)} outside target ${targetRange.join('-')}`);
  }
  if (Math.abs((Number(ship.powerRating) || 0) - measuredRatio) > 0.08) {
    fail(`${id} powerRating ${ship.powerRating} should match measured ratio ${measuredRatio.toFixed(3)} within 0.08`);
  }
  previousPowerRating = Number(ship.powerRating) || 0;
  previousMeasuredRatio = measuredRatio;
}

const level30 = shipsById.get('nova_ship_26');
const level50 = shipsById.get('nova_ship_30');
const level30Ratio = level30 ? ratio(calculateEffectivePowerIndex(level30), topNormalEpi) : 0;
const level50Ratio = level50 ? ratio(calculateEffectivePowerIndex(level50), topNormalEpi) : 0;
if (level30Ratio < 1.095) fail(`Aegis Comet should be about 10% above top normal, got ${level30Ratio.toFixed(3)}`);
if (level50Ratio < 1.17) fail(`Eirik the Viking should remain a stronger endgame hull, got ${level50Ratio.toFixed(3)}`);
if (level50Ratio > 1.2) fail(`Eirik the Viking exceeds the 20% Ascendant safety ceiling, got ${level50Ratio.toFixed(3)}`);

const shipSelectSource = fs.readFileSync(path.join(root, 'src/scenes/ShipSelectScene.js'), 'utf8');
for (const token of ['getShipTierLabel', 'tierBadge', 'this.ships.length', 'WEAKNESS:']) {
  if (!shipSelectSource.includes(token)) fail(`ShipSelectScene missing Ascendant UI token ${token}`);
}

const detailsSource = fs.readFileSync(path.join(root, 'src/scenes/ShipDetailsScene.js'), 'utf8');
if (!detailsSource.includes('getShipTierLabel') || !detailsSource.includes('WEAKNESS:')) {
  fail('ShipDetailsScene should show Ascendant tier and weakness metadata');
}

if (errors.length) {
  console.error(`[ascendant-ships] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  if (warn.length) warn.forEach((message) => console.warn(`[ascendant-ships] WARN ${message}`));
  process.exit(1);
}

console.table(measuredRows);
if (warn.length) warn.forEach((message) => console.warn(`[ascendant-ships] WARN ${message}`));
console.log(`[ascendant-ships] PASS ships=${ships.length} ascendant=${ascendant.length} topNormalEpi=${topNormalEpi.toFixed(3)} level30Ratio=${level30Ratio.toFixed(3)} level50Ratio=${level50Ratio.toFixed(3)}`);
