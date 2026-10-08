import assert from 'node:assert/strict';
import { RUN_MODES } from '../src/game/RunMode.js';

globalThis.Audio = class { addEventListener() {} };
const { EnemyManager } = await import('../src/managers/EnemyManager.js');

const manager = Object.create(EnemyManager.prototype);
manager.state = 'LEVEL_COMPLETE';
manager.phase = 'COMPLETE';
manager.bossDefeatedThisLevel = true;
manager.boss = { kind: 'boss', active: false };
manager.hijacker = null;
manager.enemies = [
  { kind: 'boss', active: false },
  { kind: 'boss_add', active: true },
  { kind: 'ordinary', active: true },
  { kind: 'ordinary', active: false, waitingForEntry: true }
];
manager.game = { runMode: RUN_MODES.OVERRUN_TACTICAL };
assert.equal(manager.isLevelComplete(), false, 'Tactical cannot clear with escorts alive or entering');
manager.game.runMode = RUN_MODES.OVERRUN_PURE;
assert.equal(manager.isLevelComplete(), false, 'Pure uses the same survivor rule');
manager.enemies[1].active = false;
manager.enemies[2].active = false;
manager.enemies[3].waitingForEntry = false;
manager.game.runMode = RUN_MODES.OVERRUN_TACTICAL;
assert.equal(manager.isLevelComplete(), true, 'sector clears once the player defeats all escorts');
manager.enemies[1].active = true;
manager.game.runMode = RUN_MODES.RANKED;
assert.equal(manager.isLevelComplete(), true, 'Arcade retains its existing boss-add exemption');
console.log('[onslaught-boss-survivors] PASS Tactical/Pure survivors and Arcade isolation');
