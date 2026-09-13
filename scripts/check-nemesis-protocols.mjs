import assert from 'node:assert/strict';
import {
  NEMESIS_BONUSES,
  NEMESIS_DEFENSES,
  NEMESIS_ENRAGES,
  NEMESIS_OPENINGS,
  NEMESIS_PROTOCOL_CATALOG,
  NEMESIS_PROTOCOL_VARIANT_COUNT,
  applyNemesisProtocolToEnemy,
  getNemesisProtocolMechanicalSignature,
  maybeActivateNemesisEnrage,
  pickNemesisProtocol,
  resolveNemesisDamage
} from '../src/config/NemesisProtocols.js';

assert.equal(NEMESIS_OPENINGS.length, 10, 'Nemesis grid must expose ten openings');
assert.equal(NEMESIS_DEFENSES.length, 10, 'Nemesis grid must expose ten defenses');
assert.equal(NEMESIS_ENRAGES.length, 10, 'Nemesis grid must expose ten enrage phases');
assert.equal(NEMESIS_BONUSES.length, 10, 'Nemesis grid must expose ten bonus rewards');
assert.equal(NEMESIS_PROTOCOL_VARIANT_COUNT, 10000, 'Nemesis grid must contain exactly 10000 protocols');
assert.equal(new Set(NEMESIS_PROTOCOL_CATALOG.map((entry) => entry.id)).size, 10000, 'all Nemesis IDs must be unique');
assert.equal(new Set(NEMESIS_PROTOCOL_CATALOG.map(getNemesisProtocolMechanicalSignature)).size, 10000, 'all Nemesis protocols must have unique mechanical signatures');
assert.deepEqual(NEMESIS_PROTOCOL_CATALOG.map((entry) => entry.number), Array.from({ length: 10000 }, (_, index) => index + 1), 'Nemesis numbers must be stable and contiguous');

for (const opening of NEMESIS_OPENINGS) {
  assert.equal(NEMESIS_PROTOCOL_CATALOG.filter((entry) => entry.openingId === opening.id).length, 1000, `${opening.id} must contribute 1000 protocols`);
}
for (const defense of NEMESIS_DEFENSES) {
  assert.equal(NEMESIS_PROTOCOL_CATALOG.filter((entry) => entry.defenseId === defense.id).length, 1000, `${defense.id} must contribute 1000 protocols`);
}
for (const enrage of NEMESIS_ENRAGES) {
  assert.equal(NEMESIS_PROTOCOL_CATALOG.filter((entry) => entry.enrageId === enrage.id).length, 1000, `${enrage.id} must contribute 1000 protocols`);
}
for (const bonus of NEMESIS_BONUSES) {
  assert.equal(NEMESIS_PROTOCOL_CATALOG.filter((entry) => entry.bonusId === bonus.id).length, 1000, `${bonus.id} must contribute 1000 protocols`);
}

const deterministic = pickNemesisProtocol('nemesis-test', 7);
assert.deepEqual(pickNemesisProtocol('nemesis-test', 7), deterministic, 'Nemesis selection must be deterministic');
assert.notEqual(pickNemesisProtocol('nemesis-test', 7, { excludeId: deterministic.id }).id, deterministic.id, 'Nemesis selection must exclude immediate repeats');

let exhaustiveApplications = 0;
let exhaustiveDamageResolutions = 0;
let exhaustiveEnrages = 0;
for (const protocol of NEMESIS_PROTOCOL_CATALOG) {
  const enemy = {
    isAce: true,
    health: 12,
    maxHealth: 12,
    speed: 1,
    radius: 16,
    shootDelay: 100,
    tacticalProjectileSpeedScalar: 1,
    tacticalDiveBias: 1,
    tacticalSwayScalar: 1,
    tacticalMoveStyle: 'sweep',
    tacticalShotPattern: 'aimed',
    waveTactic: { move: 'sweep', shot: 'aimed', volley: null },
    scoreValue: 75
  };
  const applied = applyNemesisProtocolToEnemy(enemy, protocol);
  assert.equal(applied?.id, protocol.id, `${protocol.id} must apply to an Ace`);
  assert.equal(enemy.scoreValue, 75, `${protocol.id} must preserve score value`);
  assert.equal(enemy.health, enemy.maxHealth, `${protocol.id} must preserve full health after scaling`);
  assert.equal(enemy.nemesisOpeningEntryDurationMult, protocol.opening.entryDurationMult, `${protocol.id} must apply its entry timing`);
  const rawDamage = Math.max(0.5, enemy.maxHealth * 0.2);
  const resolvedDamage = resolveNemesisDamage(enemy, rawDamage);
  assert.ok(resolvedDamage > 0 && resolvedDamage <= rawDamage, `${protocol.id} must resolve bounded positive damage`);
  enemy.health = enemy.maxHealth * Math.max(0.01, protocol.enrage.threshold - 0.01);
  const enrage = maybeActivateNemesisEnrage(enemy);
  assert.equal(enrage?.id, protocol.enrageId, `${protocol.id} must activate its configured enrage`);
  assert.equal(maybeActivateNemesisEnrage(enemy), null, `${protocol.id} must not enrage twice`);
  assert.equal(applyNemesisProtocolToEnemy(enemy, protocol), null, `${protocol.id} must not apply twice`);
  exhaustiveApplications += 1;
  exhaustiveDamageResolutions += 1;
  exhaustiveEnrages += 1;
}

assert.equal(applyNemesisProtocolToEnemy({ isAce: false }, deterministic), null, 'Nemesis protocols must only apply to Aces');
console.log(`[nemesis-protocols] PASS variants=${NEMESIS_PROTOCOL_VARIANT_COUNT} exhaustiveApplications=${exhaustiveApplications} exhaustiveDamageResolutions=${exhaustiveDamageResolutions} exhaustiveEnrages=${exhaustiveEnrages}`);
