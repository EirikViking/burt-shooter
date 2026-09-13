import assert from 'node:assert/strict';
import { RIVAL_WING_CATALOG, RIVAL_WING_DISCIPLINES, RIVAL_WING_FORMATIONS, RIVAL_WING_MORALES, RIVAL_WING_VARIANT_COUNT, RIVAL_WING_VOLLEYS, activateRivalWingMorale, applyRivalWingToEnemy, getRivalWingMechanicalSignature, pickRivalWingDoctrine } from '../src/config/RivalWingDoctrines.js';

assert.equal(RIVAL_WING_FORMATIONS.length, 10); assert.equal(RIVAL_WING_DISCIPLINES.length, 10); assert.equal(RIVAL_WING_VOLLEYS.length, 10); assert.equal(RIVAL_WING_MORALES.length, 10);
assert.equal(RIVAL_WING_VARIANT_COUNT, 10000); assert.equal(new Set(RIVAL_WING_CATALOG.map((x) => x.id)).size, 10000); assert.equal(new Set(RIVAL_WING_CATALOG.map(getRivalWingMechanicalSignature)).size, 10000);
assert.deepEqual(RIVAL_WING_CATALOG.map((x) => x.number), Array.from({ length: 10000 }, (_, i) => i + 1));
const chosen = pickRivalWingDoctrine('wing-test', 5); assert.deepEqual(pickRivalWingDoctrine('wing-test', 5), chosen); assert.notEqual(pickRivalWingDoctrine('wing-test', 5, { excludeId: chosen.id }).id, chosen.id);
let applications = 0; let moraleActivations = 0;
for (const doctrine of RIVAL_WING_CATALOG) {
  const enemy = { kind: 'enemy', health: 3, maxHealth: 3, speed: 1, shootDelay: 100, tacticalProjectileSpeedScalar: 1, tacticalFireScalar: 1, tacticalDiveBias: 1, tacticalSwayScalar: 1, tacticalMoveStyle: 'standard', tacticalShotPattern: 'aimed', waveTactic: {}, scoreValue: 50, active: true };
  assert.equal(applyRivalWingToEnemy(enemy, doctrine)?.id, doctrine.id); assert.equal(enemy.scoreValue, 50); assert.equal(enemy.tacticalMoveStyle, doctrine.formation.moveStyle); assert.equal(enemy.tacticalShotPattern, doctrine.volley.shotPattern);
  assert.equal(activateRivalWingMorale(enemy)?.id, doctrine.moraleId); assert.equal(enemy.rivalWingMoraleActive, true); assert.equal(activateRivalWingMorale(enemy), null); assert.equal(applyRivalWingToEnemy(enemy, doctrine), null);
  applications += 1; moraleActivations += 1;
}
assert.equal(applyRivalWingToEnemy({ kind: 'enemy', isAce: true }, chosen), null);
console.log(`[rival-wing-doctrines] PASS variants=${RIVAL_WING_VARIANT_COUNT} exhaustiveApplications=${applications} exhaustiveMoraleActivations=${moraleActivations}`);
