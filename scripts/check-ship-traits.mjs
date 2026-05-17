import { ShipData } from '../src/config/ShipData.js';
import { buildSelectableShipVariants, SHIP_VISUAL_VARIANTS } from '../src/config/VisualVariantCatalog.js';

const ships = buildSelectableShipVariants(ShipData);
const failures = [];

function fail(message) {
  failures.push(message);
}

function signature(ship) {
  const s = ship.stats || {};
  const w = ship.weapon || {};
  const h = ship.hitbox || {};
  return [
    s.speed,
    s.fireRate,
    s.damage,
    s.bulletSpeed,
    w.bullets,
    w.spread,
    h.radius
  ].join('|');
}

if (ships.length !== ShipData.length * SHIP_VISUAL_VARIANTS.length) {
  fail(`expected ${ShipData.length * SHIP_VISUAL_VARIANTS.length} selectable variants, found ${ships.length}`);
}

for (const base of ShipData) {
  const variants = ships.filter(ship => ship.baseId === base.id);
  const signatures = new Set(variants.map(signature));
  const labels = new Set(variants.map(ship => ship.trait?.label).filter(Boolean));

  if (variants.length !== SHIP_VISUAL_VARIANTS.length) {
    fail(`${base.id} has ${variants.length} variants, expected ${SHIP_VISUAL_VARIANTS.length}`);
  }
  if (signatures.size < Math.min(20, SHIP_VISUAL_VARIANTS.length)) {
    fail(`${base.id} only has ${signatures.size} distinct gameplay signatures`);
  }
  if (labels.size !== SHIP_VISUAL_VARIANTS.length) {
    fail(`${base.id} has ${labels.size} unique trait labels, expected ${SHIP_VISUAL_VARIANTS.length}`);
  }

  for (const ship of variants) {
    const s = ship.stats || {};
    const w = ship.weapon || {};
    const h = ship.hitbox || {};
    if (!ship.trait?.label || !ship.trait?.description) fail(`${ship.id} is missing trait copy`);
    if (!Number.isFinite(s.speed) || s.speed < 4.8 || s.speed > 8.6) fail(`${ship.id} speed out of range: ${s.speed}`);
    if (!Number.isFinite(s.fireRate) || s.fireRate < 82 || s.fireRate > 245) fail(`${ship.id} fireRate out of range: ${s.fireRate}`);
    if (!Number.isFinite(s.damage) || s.damage < 0.58 || s.damage > 3.05) fail(`${ship.id} damage out of range: ${s.damage}`);
    if (!Number.isFinite(s.bulletSpeed) || s.bulletSpeed < 8.5 || s.bulletSpeed > 14.8) fail(`${ship.id} bulletSpeed out of range: ${s.bulletSpeed}`);
    if (!Number.isFinite(w.spread) || w.spread < 0 || w.spread > 0.34) fail(`${ship.id} spread out of range: ${w.spread}`);
    if (!Number.isFinite(h.radius) || h.radius < 10 || h.radius > 15) fail(`${ship.id} hitbox radius out of range: ${h.radius}`);
  }
}

if (failures.length) {
  console.error(`[ShipTraits] FAIL ${failures.length} issue(s)`);
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

const totalSignatures = new Set(ships.map(signature)).size;
console.log(`[ShipTraits] PASS variants=${ships.length} trims=${SHIP_VISUAL_VARIANTS.length} totalSignatures=${totalSignatures}`);
