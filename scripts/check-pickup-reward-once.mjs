import assert from 'node:assert/strict';
globalThis.window = { location: { origin: 'http://localhost', search: '' }, addEventListener() {} };
globalThis.Audio = class { addEventListener() {} removeEventListener() {} load() {} pause() {} play() { return Promise.resolve(); } };
const { PowerupManager } = await import('../src/managers/PowerupManager.js');
const { Game } = await import('../src/game/Game.js');
const manager = new PowerupManager({ addChild() {}, removeChild() {} }, { getWidth: () => 800, getHeight: () => 600, scenes: { play: {} } });
for (const initial of [1, 5, 6, 7]) {
  for (const visualFailure of [false, true]) {
    const game = { lives: initial, gainLife: Game.prototype.gainLife };
    const pickup = manager.spawnSpecific(400, 300, 'super_extra_life');
    pickup.showPickupEffect = () => { if (visualFailure) throw Error('simulated lost graphics'); };
    pickup.playPickupSFX = () => {};
    pickup.showMessage = () => {};
    const player = { grantInvulnerability() {} };
    pickup.collect(player, { game });
    assert.equal(game.lives, initial + 2, 'reward must survive a presentation failure and stack beyond old cap');
    pickup.collect(player, { game });
    assert.equal(game.lives, initial + 2, 'duplicate collection must not award again');
  }
}
console.log('PASS: rare pickup grants exactly two once, beyond old cap, despite visual failure');
const { Enemy } = await import('../src/entities/Enemy.js');
const { Hijacker } = await import('../src/entities/Hijacker.js');
const { Player } = await import('../src/entities/Player.js');
for (const flag of ['invulnerable', 'isDodging', 'ghost']) {
  const player = { active: true, x: 405, y: 400, radius: 14, [flag]: true, isGhostActive: () => flag === 'ghost',
    applyTractorDebuff: () => { throw Error('protected flight received debuff'); } };
  const actor = { x: 400, y: 100, radius: 20, game: { scenes: { play: { player } }, getWidth: () => 800, getHeight: () => 600 } };
  Enemy.prototype.applyEliteTractorPull.call(actor, 1, player.x, player.y);
  assert.deepEqual([player.x, player.y], [405, 400], `${flag}: elite tractor must not pull protected flight`);
  Hijacker.prototype.applyTractorPull.call(actor, 1);
  assert.deepEqual([player.x, player.y], [405, 400], `${flag}: hijacker must not pull protected flight`);
}
assert.equal(Player.prototype.takeDamage.call({ invulnerable: true, shieldActive: true, isDefenseSuppressed: () => false,
  deactivateShield: () => { throw Error('protected impact spent shield'); } }), false);
console.log('PASS: protected tractor paths and shield preservation');
