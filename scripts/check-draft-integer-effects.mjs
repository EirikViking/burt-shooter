import assert from 'node:assert/strict';
import { buildTacticalDraftModifiers } from '../src/config/TacticalDraft.js';

globalThis.Audio = class { addEventListener() {} };
const { Player } = await import('../src/entities/Player.js');

function project(ids, baseShots = 4) {
  const player = Object.assign(Object.create(Player.prototype), {
    runAugmentIds: ids, consumedRunAugmentIds: [], activePowerup: {},
    getPowerupSlots: () => [], isPowerupSuppressed: () => false,
    bulletDamage: 2, multiShot: baseShots, shootDelay: 200, speed: 5, bulletSpeed: 10,
    dodgeDelay: 1000, dodgeDurationMax: 333, stats: { speed: 5 }, drones: []
  });
  player.applyRunAugmentModifiers({ preview: true });
  return player;
}
for (const level of [1, 2, 3]) {
  const ids = Array(level).fill('double_shot');
  const modifiers = buildTacticalDraftModifiers(ids);
  assert.equal(modifiers.shotBonus, level, `Extra Shot level ${level} grants ${level} whole shots`);
  assert.equal(project(ids).multiShot, 4 + level, `four-lane hull gains a real shot at level ${level}`);
}
assert.equal(project(Array(3).fill('double_shot'), 7).multiShot, 8, 'existing eight-shot cap remains');
assert.equal(project(Array(3).fill('double_shot'), 7).bulletDamage, project(['double_shot'], 7).bulletDamage,
  'stacks beyond the shot cap do not impose additional penalties');
assert.equal(project(['double_shot'], 8).bulletDamage, project([], 8).bulletDamage,
  'a capped volley cannot receive a penalty-only upgrade');
assert.equal(buildTacticalDraftModifiers(['damage_up', 'damage_up', 'damage_up']).damageMult,
  1.12 * Math.pow(1.12, 0.55) * Math.pow(1.12, 0.3), 'continuous buffs retain diminishing effectiveness');
for (const [id, field] of [['drones', 'droneCount'], ['chain_lightning', 'chainMax']]) {
  assert.equal(buildTacticalDraftModifiers([id, id])[field], 2, `${id} counts are whole units`);
}
console.log('[draft-integer-effects] PASS integer upgrades and live Player projection');
