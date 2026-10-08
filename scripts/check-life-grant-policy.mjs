import assert from 'node:assert/strict';
globalThis.Audio = class { addEventListener() {} };
globalThis.window = { location: { origin: 'http://localhost', search: '' }, addEventListener() {}, removeEventListener() {} };
const { Game } = await import('../src/game/Game.js');
const { Player } = await import('../src/entities/Player.js');
const { PowerupManager } = await import('../src/managers/PowerupManager.js');
for (const sector of [100,101,143]) for (const source of ['life', 'super_extra_life', 'nova_miracle', 'nano_patch', 'mercy_protocol', 'life_repair']) {
  const game = Object.assign(Object.create(Game.prototype), { level: sector, lives: 1, currentScene: null });
  const applied = game.gainLife({ count: 1, source });
  assert.equal(game.lives, sector <= 100 ? 2 : 1, `${source} at ${sector}`);
  assert.equal(applied, sector <= 100 ? 1 : 0);
}
const game = Object.assign(Object.create(Game.prototype), { level: 143, lives: 1, currentScene: null });
const player = Object.assign(Object.create(Player.prototype), { game });
assert.equal(player.repairFromPowerup({repairLives: 1}, 'nano_patch'), 0, 'blocked repair cannot report success');
assert.equal(player.repairFromPowerup({repairLives: 1}, 'tactical_draft_nano_patch'), 1);
game.lives = 1;
assert.equal(game.gainLife({source:'life', spawnedSector:100}), 1, 'pre-cutoff pickup remains valid');
game.lives = 1;
assert.equal(game.gainLife({source:'life', allowEnduranceLife:true}), 1, 'isolated debug override remains');
for (const type of ['nano_patch','mercy_protocol','life','super_extra_life','nova_miracle']) {
  assert.equal(PowerupManager.prototype.isExtraLifeType(type), true, `${type} recognized before spawning`);
}
console.log('[life-grant-policy] PASS life families, repairs, late rewards, actual counts, Tactical exception and carried pickups');
