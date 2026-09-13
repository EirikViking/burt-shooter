import assert from 'node:assert/strict';
import {
  TACTICAL_DOCTRINE_NAMES,
  analyzeTacticalDoctrine,
  getTacticalDoctrineDisplay,
  projectTacticalDoctrine
} from '../src/config/TacticalDoctrine.js';

function doctrine(ids, consumed = []) {
  return analyzeTacticalDoctrine(ids, consumed);
}

assert.equal(TACTICAL_DOCTRINE_NAMES.length, 11, 'expected four pure, six hybrid, and one synthesis doctrine');
assert.equal(new Set(TACTICAL_DOCTRINE_NAMES).size, 11, 'doctrine names must remain unique');
assert.equal(doctrine([]), null, 'empty loadout should not claim a doctrine');

assert.equal(doctrine(['damage_up']).id, 'gunship');
assert.equal(doctrine(['speed_up']).id, 'phantom');
assert.equal(doctrine(['shield']).id, 'bastion');
assert.equal(doctrine(['magnet']).id, 'salvage');

assert.equal(doctrine(['damage_up', 'speed_up']).id, 'strike_vector');
assert.equal(doctrine(['damage_up', 'shield']).id, 'siege_bulwark');
assert.equal(doctrine(['damage_up', 'magnet']).id, 'arsenal_network');
assert.equal(doctrine(['speed_up', 'shield']).id, 'aegis_vector');
assert.equal(doctrine(['speed_up', 'magnet']).id, 'courier_matrix');
assert.equal(doctrine(['shield', 'magnet']).id, 'fortress_network');

const synthesis = doctrine(['damage_up', 'speed_up', 'shield', 'magnet']);
assert.equal(synthesis.id, 'nova_synthesis');
assert.equal(synthesis.synthesis, true);
assert.deepEqual(synthesis.categories, { offense: 1, mobility: 1, defense: 1, utility: 1 });

assert.equal(doctrine(['damage_up']).stage, 'CALIBRATING');
assert.equal(doctrine(['damage_up', 'rapid_fire', 'speed_up']).stage, 'ONLINE');
assert.equal(doctrine(['damage_up', 'rapid_fire', 'speed_up', 'shield', 'magnet']).stage, 'ASCENDANT');
assert.equal(doctrine(['damage_up', 'damage_up', 'damage_up', 'speed_up']).id, 'gunship', 'clear category lead should resolve to a pure doctrine');
assert.equal(doctrine(['damage_up', 'nano_patch'], ['nano_patch']).totalPicks, 1, 'consumed one-shots must not define the active doctrine');
assert.match(getTacticalDoctrineDisplay(synthesis), /^NOVA SYNTHESIS \/\/ ONLINE$/, 'display should expose identity and maturity');
const newBuild = projectTacticalDoctrine([], [], 'damage_up');
assert.equal(newBuild.after.id, 'gunship');
assert.equal(newBuild.identityChanged, true);
const hybridShift = projectTacticalDoctrine(['damage_up'], [], 'speed_up');
assert.equal(hybridShift.after.id, 'strike_vector');
assert.equal(hybridShift.identityChanged, true);
const reinforcement = projectTacticalDoctrine(['damage_up', 'rapid_fire'], [], 'rail_surge');
assert.equal(reinforcement.after.id, 'gunship');
assert.equal(reinforcement.identityChanged, false);
assert.equal(reinforcement.stageChanged, true);
const oneShot = projectTacticalDoctrine(['damage_up'], [], 'nano_patch');
assert.equal(oneShot.consumed, true);
assert.equal(oneShot.after.id, 'gunship');

console.log('[tactical-doctrine] PASS identities=11 stages=3 consumed-state=active-only');
