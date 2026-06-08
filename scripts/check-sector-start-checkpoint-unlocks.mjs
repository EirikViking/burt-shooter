import assert from 'node:assert/strict';
import {
  getSectorStartCheckpoints,
  getSectorStartPlaySector,
  getSectorStartState,
  isSectorStartCheckpointUnlocked,
  resolveSectorStartCheckpoint
} from '../src/game/RunMode.js';

function progress(highest) {
  return {
    bestSector: highest,
    bestLevel: highest
  };
}

assert.deepEqual(getSectorStartCheckpoints(progress(4)), [], 'highest < 5 should hide Sector Start');
assert.deepEqual(getSectorStartCheckpoints(progress(5)), [5], 'highest 5 should allow Sector 5');
assert.deepEqual(getSectorStartCheckpoints(progress(9)), [5], 'highest 9 should allow Sector 5 only');

assert.deepEqual(getSectorStartCheckpoints(progress(10)), [5], 'highest 10 must not unlock the Sector 10 gate skip');
assert.equal(isSectorStartCheckpointUnlocked(10, progress(10)), false, 'Sector 10 Challenge requires clearing into Sector 11');
assert.equal(resolveSectorStartCheckpoint(10, progress(10)), null, 'locked Sector 10 cannot be selected at highest 10');

assert.deepEqual(getSectorStartCheckpoints(progress(11)), [5, 10], 'highest 11 should unlock Sector 10 Challenge');
assert.equal(isSectorStartCheckpointUnlocked(10, progress(11)), true);
assert.equal(resolveSectorStartCheckpoint(10, progress(11)), 10);
assert.equal(getSectorStartPlaySector(10), 11);

assert.deepEqual(getSectorStartCheckpoints(progress(17)), [5, 10, 15], 'highest 17 should allow 5/10/15');

assert.deepEqual(getSectorStartCheckpoints(progress(20)), [5, 10, 15], 'highest 20 must not unlock the Sector 20 gate skip');
assert.equal(isSectorStartCheckpointUnlocked(20, progress(20)), false, 'Sector 20 Challenge requires clearing into Sector 21');
assert.equal(resolveSectorStartCheckpoint(20, progress(20)), null, 'locked Sector 20 cannot be selected at highest 20');

assert.deepEqual(getSectorStartCheckpoints(progress(21)), [5, 10, 15, 20], 'highest 21 should unlock Sector 20 Challenge');
assert.equal(isSectorStartCheckpointUnlocked(20, progress(21)), true);
assert.equal(resolveSectorStartCheckpoint(20, progress(21)), 20);
assert.equal(getSectorStartPlaySector(20), 21);

assert.equal(isSectorStartCheckpointUnlocked(30, progress(30)), false, 'Sector 30 Challenge requires clearing into Sector 31');
assert.equal(isSectorStartCheckpointUnlocked(30, progress(31)), true);
assert.equal(resolveSectorStartCheckpoint(30, progress(30)), null);
assert.equal(resolveSectorStartCheckpoint(30, progress(31)), 30);
assert.equal(getSectorStartPlaySector(30), 31);

assert.equal(getSectorStartState(progress(10), 10).selectedCheckpoint, null);
assert.equal(getSectorStartState(progress(11), 10).selectedCheckpoint, 10);
assert.equal(getSectorStartState(progress(20), null).selectedCheckpoint, 15);
assert.equal(getSectorStartState(progress(21), null).selectedCheckpoint, 20);

console.log('[sector-start-checkpoint-unlocks] PASS gate checkpoints require post-clear highest sector');
