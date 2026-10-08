import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getBossProfileForRun} from '../src/config/BossRoster.js';
import {isOverrunRunMode} from '../src/game/RunMode.js';

const scene = readFileSync(new URL('../src/scenes/PlayScene.js', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../src/managers/EnemyManager.js', import.meta.url), 'utf8');
const previewStart = scene.indexOf('    const bossProfile =', scene.indexOf('  showBossTaunt('));
const spawnStart = manager.indexOf('    const bossProfile =', manager.indexOf('  async spawnBoss('));
const previewCode = scene.slice(previewStart, scene.indexOf('    const primaryColor', previewStart));
const spawnCode = manager.slice(spawnStart, manager.indexOf('    const breach=', spawnStart));
assert(previewCode.includes('getBossProfileForRun'));
assert(spawnCode.includes('getBossProfileForRun'));
const preview = Function('getBossProfileForRun', 'isOverrunRunMode', previewCode + 'return bossProfile;');
const spawn = Function('level', 'getBossProfileForRun', 'isOverrunRunMode', spawnCode + 'return bossProfile;');
let count = 0;
for (const runMode of ['overrun_tactical', 'overrun_pure', 'ranked_tactical', 'ranked_pure', 'daily_signal']) {
  for (const seed of ['recording', 'preview-2', 'preview-3']) for (const seen of [20, 50]) {
    for (let level = 1; level <= 120; level++) {
      const game = {level, runMode, contentDirector: {seed}, overrunSeenBossMaxSector: seen};
      const expected = spawn.call({game}, level, getBossProfileForRun, isOverrunRunMode);
      const actual = preview.call({game, enemyManager: {}}, getBossProfileForRun, isOverrunRunMode);
      assert.equal(actual.id, expected.id, `${runMode}, sector${level}, ${seed}, pool${seen}`);
      count++;
    }
  }
}
const active = {id: 'already-active', name: 'Existing boss'};
assert.equal(preview.call({game: {}, enemyManager: {boss: {profile: active}}}, getBossProfileForRun, isOverrunRunMode), active);
console.log(`PASS: ${count} preview/spawn identities match; active boss remains authoritative.`);
