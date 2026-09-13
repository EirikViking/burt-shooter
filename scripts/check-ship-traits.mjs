import { ShipData } from '../src/config/ShipData.js';
import { buildSelectableShipVariants } from '../src/config/VisualVariantCatalog.js';

const ships = buildSelectableShipVariants(ShipData);
const failures = [];

function fail(message) {
  failures.push(message);
}

function signature(ship) {
  const s = ship.stats || {};
  const w = ship.weapon || {};
  const h = ship.hitbox || {};
  const c = ship.trait?.effects?.combat || {};
  return [
    s.speed,
    s.fireRate,
    s.damage,
    s.bulletSpeed,
    w.bullets,
    w.spread,
    h.radius,
    c.projectileRadiusMult,
    c.dodgeCooldownMult,
    c.dodgeDurationMult,
    c.bonusShotEvery,
    c.wingShotEvery,
    c.pierceEvery,
    c.critEvery,
    c.dodgePulseRadius,
    c.nearMissScoreMult
  ].join('|');
}

if (ShipData.length !== 30) {
  fail(`expected 30 playable ships, found ${ShipData.length}`);
}

if (ships.length !== 30) {
  fail(`expected exactly 30 selectable ships, found ${ships.length}`);
}

for (const base of ShipData) {
  const variants = ships.filter(ship => ship.baseId === base.id);
  const signatures = new Set(variants.map(signature));
  const labels = new Set(variants.map(ship => ship.trait?.label).filter(Boolean));

  if (variants.length !== 1) {
    fail(`${base.id} has ${variants.length} selectable entries, expected 1`);
  }
  if (signatures.size < 1) {
    fail(`${base.id} only has ${signatures.size} distinct gameplay signatures`);
  }
  if (labels.size !== 1) {
    fail(`${base.id} has ${labels.size} trait labels, expected 1`);
  }

  for (const ship of variants) {
    const s = ship.stats || {};
    const w = ship.weapon || {};
    const h = ship.hitbox || {};
    const c = ship.trait?.effects?.combat || {};
    const maxCadence = ship.tier === 'ascendant' ? 8 : 5;
    if (!ship.trait?.label || !ship.trait?.description) fail(`${ship.id} is missing trait copy`);
    if (!Number.isFinite(s.speed) || s.speed < 4.8 || s.speed > 8.6) fail(`${ship.id} speed out of range: ${s.speed}`);
    if (!Number.isFinite(s.fireRate) || s.fireRate < 82 || s.fireRate > 245) fail(`${ship.id} fireRate out of range: ${s.fireRate}`);
    if (!Number.isFinite(s.damage) || s.damage < 0.58 || s.damage > 3.05) fail(`${ship.id} damage out of range: ${s.damage}`);
    if (!Number.isFinite(s.bulletSpeed) || s.bulletSpeed < 8.5 || s.bulletSpeed > 14.8) fail(`${ship.id} bulletSpeed out of range: ${s.bulletSpeed}`);
    if (!Number.isFinite(w.spread) || w.spread < 0 || w.spread > 0.34) fail(`${ship.id} spread out of range: ${w.spread}`);
    if (!Number.isFinite(h.radius) || h.radius < 10 || h.radius > 15) fail(`${ship.id} hitbox radius out of range: ${h.radius}`);
    if (!Number.isFinite(c.projectileRadiusMult) || c.projectileRadiusMult < 0.86 || c.projectileRadiusMult > 1.32) fail(`${ship.id} projectile radius multiplier out of range: ${c.projectileRadiusMult}`);
    if (!Number.isFinite(c.dodgeCooldownMult) || c.dodgeCooldownMult < 0.74 || c.dodgeCooldownMult > 1.16) fail(`${ship.id} dodge cooldown multiplier out of range: ${c.dodgeCooldownMult}`);
    if (!Number.isFinite(c.dodgeDurationMult) || c.dodgeDurationMult < 1 || c.dodgeDurationMult > 1.18) fail(`${ship.id} dodge duration multiplier out of range: ${c.dodgeDurationMult}`);
    if (!Number.isInteger(c.bonusShotEvery) || c.bonusShotEvery < 0 || c.bonusShotEvery > maxCadence) fail(`${ship.id} bonus shot cadence out of range: ${c.bonusShotEvery}`);
    if (!Number.isInteger(c.wingShotEvery) || c.wingShotEvery < 0 || c.wingShotEvery > maxCadence) fail(`${ship.id} wing shot cadence out of range: ${c.wingShotEvery}`);
    if (c.wingShotEvery && (!Number.isFinite(c.wingShotDamageMult) || c.wingShotDamageMult < 0.36 || c.wingShotDamageMult > 0.58)) fail(`${ship.id} wing shot damage multiplier out of range: ${c.wingShotDamageMult}`);
    if (c.wingShotEvery && (!Number.isFinite(c.wingShotAngle) || c.wingShotAngle < 0.3 || c.wingShotAngle > 0.48)) fail(`${ship.id} wing shot angle out of range: ${c.wingShotAngle}`);
    if (!Number.isInteger(c.pierceEvery) || c.pierceEvery < 0 || c.pierceEvery > maxCadence) fail(`${ship.id} pierce cadence out of range: ${c.pierceEvery}`);
    if (!Number.isInteger(c.critEvery) || c.critEvery < 0 || c.critEvery > 5) fail(`${ship.id} crit cadence out of range: ${c.critEvery}`);
    if (c.critEvery && (!Number.isFinite(c.critDamageMult) || c.critDamageMult < 1.32 || c.critDamageMult > 1.62)) fail(`${ship.id} crit damage multiplier out of range: ${c.critDamageMult}`);
    if (!Number.isInteger(c.dodgePulseRadius) || c.dodgePulseRadius < 0 || c.dodgePulseRadius > 96) fail(`${ship.id} dodge pulse radius out of range: ${c.dodgePulseRadius}`);
    if (!Number.isFinite(c.nearMissScoreMult) || c.nearMissScoreMult < 0.85 || c.nearMissScoreMult > 1.75) fail(`${ship.id} near miss multiplier out of range: ${c.nearMissScoreMult}`);
    if (c.projectileRadiusMult === 1 && c.dodgeCooldownMult === 1 && c.dodgeDurationMult === 1 && !c.bonusShotEvery && !c.wingShotEvery && !c.pierceEvery && !c.critEvery && !c.dodgePulseRadius && c.nearMissScoreMult === 1) {
      fail(`${ship.id} has no combat trait effect`);
    }
  }
}

const unlockedAtStart = ships.filter(ship => !ship.unlock || (Number(ship.unlock.level) || 1) <= 1);
if (unlockedAtStart.length !== 1) {
  fail(`expected one starter ship, found ${unlockedAtStart.length}`);
}

const shipById = new Map(ships.map(ship => [ship.id, ship]));
const firstFiveIdentityChecks = [
  ['nova_ship_01', (ship) => (ship.trait?.effects?.combat?.dodgePulseRadius || 0) >= 50, 'starter should carry a forgiving dodge pulse'],
  ['nova_ship_02', (ship) => (ship.trait?.effects?.combat?.bonusShotEvery || 0) === 5 && !(ship.trait?.effects?.combat?.wingShotEvery), 'courier should stand out as the early bonus-shot ship'],
  ['nova_ship_03', (ship) => (ship.trait?.effects?.combat?.pierceEvery || 0) === 4 && ship.weapon?.bullets === 1, 'needle should stand out as the single-shot piercing ship'],
  ['nova_ship_04', (ship) => (ship.trait?.effects?.combat?.dodgePulseRadius || 0) >= 80 && (ship.trait?.effects?.combat?.nearMissScoreMult || 1) >= 1.3, 'skater should stand out as the dodge and near-miss ship'],
  ['nova_ship_05', (ship) => (ship.trait?.effects?.combat?.critEvery || 0) === 4 && (ship.trait?.effects?.combat?.projectileRadiusMult || 1) >= 1.12, 'biter should stand out as the heavy critical ship']
];
for (const [id, predicate, message] of firstFiveIdentityChecks) {
  const ship = shipById.get(id);
  if (!ship) {
    fail(`${id} missing from selectable ships`);
  } else if (!predicate(ship)) {
    fail(`${id} identity regression: ${message}`);
  }
}

const totalSignatures = new Set(ships.map(signature)).size;
if (totalSignatures < 25) {
  fail(`expected at least 25 distinct ship combat signatures, found ${totalSignatures}`);
}

if (failures.length) {
  console.error(`[ShipTraits] FAIL ${failures.length} issue(s)`);
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`[ShipTraits] PASS ships=${ships.length} totalSignatures=${totalSignatures} starter=${unlockedAtStart[0]?.name}`);
