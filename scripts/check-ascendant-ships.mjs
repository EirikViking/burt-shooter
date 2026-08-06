import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { ShipData } from '../src/config/ShipData.js';
import { getSelectableShips } from '../src/config/ShipMetadata.js';
import { ShipUnlockConfig, getShipUnlockDefinition } from '../src/config/ShipUnlockConfig.js';
import { SUPPORT_DRONE_TARGET_SPAN, computeSupportDroneTextureScale } from '../src/entities/SupportDroneVisual.js';
import { getShipMasteryIdentity } from '../src/progression/ShipMastery.js';

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
  ['nova_ship_26', 'AEGIS COMET', 30, [1.09, 1.14]],
  ['nova_ship_27', 'RAILBREAKER', 35, [1.1, 1.15]],
  ['nova_ship_28', 'DRONE SOVEREIGN', 40, [1.1, 1.15]],
  ['nova_ship_29', 'PHASE SERAPH', 45, [1.1, 1.15]],
  ['nova_ship_30', 'EIRIK THE VIKING', 50, [1.11, 1.16]]
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

export function calculateSustainedShotDps(ship = {}, volleys = 240) {
  const stats = ship.stats || {};
  const weapon = ship.weapon || {};
  const combat = ship.trait?.effects?.combat || {};
  const bulletCount = Math.max(1, Number(weapon.bullets) || 1);
  const baseDamage = Math.max(0, Number(stats.damage) || 0);
  const fireRate = Math.max(1, Number(stats.fireRate) || 140);
  let totalDamage = 0;

  for (let shot = 1; shot <= volleys; shot += 1) {
    for (let i = 0; i < bulletCount; i += 1) {
      let damage = baseDamage;
      if (combat.pierceEvery && shot % Number(combat.pierceEvery) === 0) {
        damage = Math.max(0.5, damage * (Number(combat.pierceDamageMult) || 0.72));
      }
      if (combat.critEvery && shot % Number(combat.critEvery) === 0) {
        damage = Math.max(1, damage * (Number(combat.critDamageMult) || 1.38));
      }
      totalDamage += damage;
    }

    if (combat.wingShotEvery && shot % Number(combat.wingShotEvery) === 0) {
      const wingDamage = Math.max(0.35, baseDamage * (Number(combat.wingShotDamageMult) || 0.42));
      totalDamage += wingDamage * 2;
    }

    if (combat.bonusShotEvery && shot % Number(combat.bonusShotEvery) === 0) {
      const bonusDamage = Math.max(0.45, baseDamage * (Number(combat.bonusShotDamageMult) || 0.5));
      totalDamage += bonusDamage;
    }
  }

  return (totalDamage / Math.max(1, volleys)) * (1000 / fireRate);
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
const topNormalSustainedDps = Math.max(...normalShips.map(calculateSustainedShotDps));
let previousPowerRating = 0;
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
  const sustainedDps = calculateSustainedShotDps(ship);
  const sustainedRatio = ratio(sustainedDps, topNormalSustainedDps);
  measuredRows.push({
    id,
    name: ship.name,
    unlockLevel: expectedLevel,
    epi: Number(measured.toFixed(3)),
    epiRatio: Number(measuredRatio.toFixed(3)),
    sustainedDps: Number(sustainedDps.toFixed(3)),
    damageRatio: Number(sustainedRatio.toFixed(3)),
    target: targetRange.join('-')
  });

  if (!(ship.powerRating > previousPowerRating)) fail(`${id} powerRating should be monotonic`);
  if (sustainedRatio < targetRange[0] || sustainedRatio > targetRange[1]) {
    fail(`${id} sustained damage ratio ${sustainedRatio.toFixed(3)} outside target ${targetRange.join('-')}`);
  }
  if (measuredRatio > 1.35) {
    fail(`${id} overall utility EPI ratio ${measuredRatio.toFixed(3)} exceeds the Ascendant utility ceiling 1.35`);
  }
  if (Math.abs((Number(ship.powerRating) || 0) - sustainedRatio) > 0.06) {
    fail(`${id} powerRating ${ship.powerRating} should match sustained damage ratio ${sustainedRatio.toFixed(3)} within 0.06`);
  }
  previousPowerRating = Number(ship.powerRating) || 0;
}

const level30 = shipsById.get('nova_ship_26');
const railbreaker = shipsById.get('nova_ship_27');
const droneSovereign = shipsById.get('nova_ship_28');
const phaseSeraph = shipsById.get('nova_ship_29');
const level50 = shipsById.get('nova_ship_30');
const level30Ratio = level30 ? ratio(calculateSustainedShotDps(level30), topNormalSustainedDps) : 0;
const level50Ratio = level50 ? ratio(calculateSustainedShotDps(level50), topNormalSustainedDps) : 0;
if (level30Ratio < 1.09) fail(`Aegis Comet should stay near 10% above top normal sustained damage, got ${level30Ratio.toFixed(3)}`);
if (level50Ratio < 1.11) fail(`Eirik the Viking should remain a stronger endgame hull, got ${level50Ratio.toFixed(3)}`);
if (level50Ratio > 1.16) fail(`Eirik the Viking exceeds the modest Ascendant damage ceiling, got ${level50Ratio.toFixed(3)}`);

for (const ship of [level30, railbreaker, droneSovereign, phaseSeraph, level50].filter(Boolean)) {
  const asset = AssetManifest.sprites.playerRankShips[ship.textureIndex];
  const fallbackAsset = AssetManifest.sprites.playerRankShipFallbacks?.[ship.textureIndex];
  if (ship.art?.temporaryFallback) fail(`${ship.id} must use dedicated final art, not a temporary fallback`);
  if (ship.art?.sourceSpritePath !== asset) fail(`${ship.id} art source must match its playable manifest asset`);
  if (!fallbackAsset || !publicPathExists(fallbackAsset)) fail(`${ship.id} must retain a valid runtime-safe fallback asset`);
  const assetFile = path.join(root, 'public', String(asset || '').replace(/^\//, ''));
  const metadata = await sharp(assetFile).metadata();
  const sourceSpan = Math.max(Number(metadata.width) || 0, Number(metadata.height) || 0);
  const renderedSpan = sourceSpan * computeSupportDroneTextureScale(metadata);
  if (!sourceSpan || renderedSpan > SUPPORT_DRONE_TARGET_SPAN + 0.001) {
    fail(`${ship.id} support drone would exceed ${SUPPORT_DRONE_TARGET_SPAN}px from its real ${metadata.width}x${metadata.height} texture`);
  }
}
if (phaseSeraph && phaseSeraph.textureIndex === shipsById.get('nova_ship_24')?.textureIndex) {
  fail('Phase Seraph must not share Nova Overdrive art');
}
if (level50 && level50.textureIndex === shipsById.get('nova_ship_25')?.textureIndex) {
  fail('Eirik the Viking must not share Arcade Legend art');
}
if (level50?.art?.inscription !== 'ᛖᛁᚱᛁᚲ') fail('Eirik the Viking must carry its explicit Viking runic inscription');
if (!level50?.art?.sourceSpritePath?.includes('eirik-viking-20260801-v2.png')) {
  fail('Eirik the Viking must use the detailed v2 Viking flagship art');
}
const textureIndices = ships.map((ship) => ship.textureIndex);
if (new Set(textureIndices).size !== ships.length) {
  fail(`all playable hulls must have distinct texture slots, got ${new Set(textureIndices).size}/${ships.length}`);
}
const hangarSignatures = ships.map((ship) => ship.art?.hangarSignature?.style).filter(Boolean);
if (hangarSignatures.length !== ships.length || new Set(hangarSignatures).size !== ships.length) {
  fail(`all playable hulls must have distinct Hangar signatures, got ${new Set(hangarSignatures).size}/${ships.length}`);
}
const masteryIdentities = ships.map((ship) => getShipMasteryIdentity(ship));
if (masteryIdentities.some((identity) => !identity?.key || !Number.isFinite(Number(identity.accent)))) {
  fail('all playable hulls must expose a deterministic mastery identity motif');
}
if (new Set(masteryIdentities.map((identity) => identity.key)).size !== ships.length) {
  fail(`all playable hulls must have distinct mastery identity keys, got ${new Set(masteryIdentities.map((identity) => identity.key)).size}/${ships.length}`);
}
const largestNonEirikScale = Math.max(...ships.filter((ship) => ship !== level50).map((ship) => Number(ship.art?.hangarHeroScale) || 1));
if ((Number(level50?.art?.hangarHeroScale) || 0) <= largestNonEirikScale) {
  fail(`Eirik must remain the largest Hangar hull (${level50?.art?.hangarHeroScale} <= ${largestNonEirikScale})`);
}
if ((Number(level50?.art?.hangarHeroScale) || 0) < 1.7) {
  fail('Eirik the Viking must have a materially larger desktop Hangar presentation');
}
if (!String(level50?.art?.note || '').toLowerCase().includes('runic inscriptions')) {
  fail('Eirik the Viking art contract must call out its prominent runic inscriptions');
}

const generatedDroneScale = computeSupportDroneTextureScale({ width: 1536, height: 1536 });
if (generatedDroneScale * 1536 > SUPPORT_DRONE_TARGET_SPAN + 0.001) {
  fail(`large generated hull drones must be normalized (${generatedDroneScale * 1536}px)`);
}
if (computeSupportDroneTextureScale({ width: 48, height: 32 }) > 0.45) {
  fail('support drone scale must retain the legacy upper bound');
}
const playerSource = fs.readFileSync(path.join(root, 'src/entities/Player.js'), 'utf8');
if (!playerSource.includes('computeSupportDroneTextureScale(texture)')) {
  fail('Player support drones must normalize generated hull texture dimensions');
}

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
console.log(`[ascendant-ships] PASS ships=${ships.length} ascendant=${ascendant.length} topNormalEpi=${topNormalEpi.toFixed(3)} topNormalSustainedDps=${topNormalSustainedDps.toFixed(3)} level30DamageRatio=${level30Ratio.toFixed(3)} level50DamageRatio=${level50Ratio.toFixed(3)}`);
