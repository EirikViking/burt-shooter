import assert from 'node:assert/strict';
import {
  ACE_BOUNTY_CATALOG,
  ACE_BOUNTY_CHASSIS,
  ACE_BOUNTY_FLIGHT_PATTERNS,
  ACE_BOUNTY_VARIANT_COUNT,
  ACE_BOUNTY_WEAPONS,
  applyAceBountyToEnemy,
  getAceBountyMechanicalSignature,
  pickAceBounty,
  planAceBountyEncounter
} from '../src/config/AceBounties.js';

assert.equal(ACE_BOUNTY_CHASSIS.length, 10, 'Ace grid must expose ten chassis profiles');
assert.equal(ACE_BOUNTY_FLIGHT_PATTERNS.length, 10, 'Ace grid must expose ten flight patterns');
assert.equal(ACE_BOUNTY_WEAPONS.length, 10, 'Ace grid must expose ten weapon packages');
assert.equal(ACE_BOUNTY_VARIANT_COUNT, 1000, 'Ace grid must contain exactly 1000 variants');
assert.equal(new Set(ACE_BOUNTY_CATALOG.map((entry) => entry.id)).size, 1000, 'all Ace IDs must be unique');
assert.equal(new Set(ACE_BOUNTY_CATALOG.map(getAceBountyMechanicalSignature)).size, 1000, 'all Ace variants must be mechanically distinct');
assert.deepEqual(ACE_BOUNTY_CATALOG.map((entry) => entry.number), Array.from({ length: 1000 }, (_, index) => index + 1), 'Ace numbers must be stable and contiguous');

for (const chassis of ACE_BOUNTY_CHASSIS) {
  assert.equal(ACE_BOUNTY_CATALOG.filter((entry) => entry.chassisId === chassis.id).length, 100, `${chassis.id} must contribute 100 variants`);
}
for (const flight of ACE_BOUNTY_FLIGHT_PATTERNS) {
  assert.equal(ACE_BOUNTY_CATALOG.filter((entry) => entry.flightId === flight.id).length, 100, `${flight.id} must contribute 100 variants`);
}
for (const weapon of ACE_BOUNTY_WEAPONS) {
  assert.equal(ACE_BOUNTY_CATALOG.filter((entry) => entry.weaponId === weapon.id).length, 100, `${weapon.id} must contribute 100 variants`);
}

const deterministic = pickAceBounty('ace-test', 4);
assert.deepEqual(pickAceBounty('ace-test', 4), deterministic, 'Ace selection must be deterministic');
assert.notEqual(pickAceBounty('ace-test', 4, { excludeId: deterministic.id }).id, deterministic.id, 'Ace selection must exclude immediate repeats');
assert.deepEqual(planAceBountyEncounter('ace-test', 3, 5), planAceBountyEncounter('ace-test', 3, 5), 'Ace encounter planning must be deterministic');
assert.equal(planAceBountyEncounter('ace-test', 3, 5, { targetWaveIndex: 99 }).targetWaveIndex, 4, 'forced Ace wave must clamp to the sector wave count');

let appliedVariants = 0;
for (const variant of ACE_BOUNTY_CATALOG) {
  const enemy = {
    health: 3,
    maxHealth: 3,
    speed: 1,
    radius: 15,
    shootDelay: 100,
    tacticalProjectileSpeedScalar: 1,
    tacticalFireScalar: 1,
    tacticalDiveBias: 1,
    tacticalSwayScalar: 1,
    tacticalMoveStyle: 'standard',
    tacticalShotPattern: 'aimed',
    waveTactic: { id: 'test-wave', move: 'standard', shot: 'aimed', volley: null },
    threatActionDefinition: { id: 'replaced-by-ace' },
    currentThreatAction: { id: 'replaced-by-ace' },
    scoreValue: 50
  };
  const applied = applyAceBountyToEnemy(enemy, variant);
  assert.equal(applied?.id, variant.id, `${variant.id} must apply to an eligible enemy`);
  assert.equal(enemy.isAce, true, `${variant.id} must mark its target as an Ace`);
  assert.equal(enemy.health, enemy.maxHealth, `${variant.id} must preserve full health after scaling`);
  assert.ok(enemy.health >= 4, `${variant.id} must be tougher than the test enemy`);
  assert.equal(enemy.tacticalMoveStyle, variant.effects.moveStyle, `${variant.id} must apply its flight pattern`);
  assert.equal(enemy.tacticalShotPattern, variant.effects.shotPattern, `${variant.id} must apply its weapon pattern`);
  assert.equal(enemy.waveTactic.volley, variant.effects.volley, `${variant.id} must apply its volley program`);
  assert.equal(enemy.scoreValue, 50, `${variant.id} must not alter score value`);
  assert.equal(enemy.threatActionDefinition, null, `${variant.id} must replace unrelated threat actions instead of stacking them`);
  assert.equal(applyAceBountyToEnemy(enemy, variant), null, `${variant.id} must not apply twice to the same enemy`);
  appliedVariants += 1;
}

console.log(`[ace-bounties] PASS variants=${ACE_BOUNTY_VARIANT_COUNT} exhaustiveApplications=${appliedVariants}`);
