import assert from 'node:assert/strict';
import { RUN_MODES } from '../src/game/RunMode.js';

globalThis.Audio = class { addEventListener() {} };
const { Player } = await import('../src/entities/Player.js');
const { PlayScene } = await import('../src/scenes/PlayScene.js');

const player = Object.assign(Object.create(Player.prototype), {
  runAugmentIds: ['drones', 'drones'], consumedRunAugmentIds: [],
  activePowerup: {}, getPowerupSlots: () => [], isPowerupSuppressed: () => false,
  bulletDamage: 1, multiShot: 1, shootDelay: 200, speed: 5, bulletSpeed: 10,
  dodgeDelay: 1000, dodgeDurationMax: 333, stats: { speed: 5 },
  drones: [{}], sprite: {},
  createDrones(count) { this.drones = Array.from({ length: count }, () => ({})); }
});
player.applyRunAugmentModifiers();
assert.equal(player.droneCount, 2, 'two earned drone augments grant two drones');
assert.equal(player.drones.length, 2, 'the second drone appears immediately after the Draft');

for (const mode of [RUN_MODES.OVERRUN_TACTICAL, RUN_MODES.OVERRUN_PURE, RUN_MODES.RANKED]) {
  let clearReason = null;
  const scene = Object.assign(Object.create(PlayScene.prototype), {
    game: { runMode: mode },
    bulletManager: {
      clearEnemyBullets(reason) { clearReason = reason; return 2; }
    }
  });
  scene.clearOnslaughtSectorBullets();
  assert.equal(clearReason, mode === RUN_MODES.RANKED ? null : 'onslaught_sector_clear',
    `${mode} sector bullet cleanup policy`);
}
console.log('[tyrian-feedback-fixes] PASS immediate second drone and Onslaught sector projectile cleanup');
