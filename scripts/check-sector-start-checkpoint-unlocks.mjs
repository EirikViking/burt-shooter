import assert from 'node:assert/strict';
import {
  getSectorStartCheckpoints,
  getSectorStartPlaySector,
  getSectorStartState,
  isSectorStartCheckpointUnlocked,
  resolveSectorStartCheckpoint
} from '../src/game/RunMode.js';
import {
  applyRunProgression,
  createDefaultHangarProgress,
  readHangarProgressState,
  writeHangarProgressState
} from '../src/progression/HangarProgressState.js';
import {
  readSectorStartChallengeRecords,
  recordSectorStartChallengeRun
} from '../src/progression/SectorStartChallengeRecords.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  clear() {
    this.map.clear();
  }

  getItem(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }

  setItem(key, value) {
    this.map.set(String(key), String(value));
  }

  removeItem(key) {
    this.map.delete(String(key));
  }
}

globalThis.localStorage = new MemoryStorage();

function progress(highest) {
  return {
    bestSector: highest,
    bestLevel: highest
  };
}

function resetProgress(highest = 1) {
  globalThis.localStorage.clear();
  return writeHangarProgressState({
    ...createDefaultHangarProgress(),
    bestSector: highest,
    bestLevel: highest,
    updatedAt: '2026-06-19T00:00:00.000Z'
  });
}

function normalRunSummary(sectorReached) {
  return {
    score: 1000 * sectorReached,
    finalScore: 1000 * sectorReached,
    levelReached: sectorReached,
    sectorReached,
    runElapsedSeconds: 120,
    bossesKilled: Math.max(0, sectorReached - 1),
    wavesCleared: sectorReached * 3,
    totalKills: sectorReached * 10,
    runCleared: false,
    noHitWaves: 0,
    noHitSectors: 0,
    highestScoreMultiplier: 1,
    codexDiscoveries: 0,
    totalCodexDiscoveries: 0,
    discoveredThreatIds: [],
    defeatedBossIds: [],
    runMode: 'ranked'
  };
}

function sectorChallengeSummary({ checkpoint, sectorReached }) {
  return {
    ...normalRunSummary(sectorReached),
    runMode: 'sector_start',
    sectorStartCheckpoint: checkpoint,
    sectorStartPlaySector: getSectorStartPlaySector(checkpoint)
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

const fresh = createDefaultHangarProgress();
assert.equal(getSectorStartState(fresh).available, false, 'fresh profile should not expose Sector Challenge');
assert.deepEqual(getSectorStartCheckpoints(fresh), [], 'fresh profile has no checkpoint starts');

resetProgress(1);
applyRunProgression(normalRunSummary(5));
assert.deepEqual(getSectorStartCheckpoints(readHangarProgressState()), [5], 'normal Launch Run reaching Sector 5 unlocks Sector 5 start');

resetProgress(5);
applyRunProgression(normalRunSummary(10));
assert.deepEqual(getSectorStartCheckpoints(readHangarProgressState()), [5], 'normal Launch Run at Sector 10 has not cleared into the Sector 11 checkpoint start');

resetProgress(5);
applyRunProgression(normalRunSummary(11));
assert.deepEqual(getSectorStartCheckpoints(readHangarProgressState()), [5, 10], 'normal Launch Run clearing Sector 10 into Sector 11 unlocks Checkpoint 10');

resetProgress(5);
const beforeChallenge = readHangarProgressState();
const challengeResult = recordSectorStartChallengeRun(sectorChallengeSummary({ checkpoint: 5, sectorReached: 11 }), {
  shipId: 'nova_ship_01',
  shipName: 'Nova Sparrow',
  selectedShipSpriteKey: 'nova_ship_01'
});
assert.equal(challengeResult.stored, true, 'Sector Challenge should store its separate local record');
assert.equal(readSectorStartChallengeRecords().byCheckpoint['5']?.highestSectorReached, 11, 'Sector Challenge record should remember the reached sector');
assert.deepEqual(readHangarProgressState(), beforeChallenge, 'Sector Challenge must not update career best sector or unlock progression');
assert.deepEqual(getSectorStartCheckpoints(readHangarProgressState()), [5], 'Sector Challenge from Sector 5 must not unlock Checkpoint 10');

assert.deepEqual(
  getSectorStartCheckpoints(progress(32)),
  [5, 10, 15, 20, 25, 30],
  'every-five checkpoint rule should be enforced through supported range'
);
for (const nonCheckpoint of [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 14, 16, 17, 19, 31, 32]) {
  assert.equal(resolveSectorStartCheckpoint(nonCheckpoint, progress(32)), null, `non-checkpoint sector ${nonCheckpoint} must not resolve as a start point`);
  assert.equal(isSectorStartCheckpointUnlocked(nonCheckpoint, progress(32)), false, `non-checkpoint sector ${nonCheckpoint} must not be independently unlocked`);
}

console.log('[sector-start-checkpoint-unlocks] PASS checkpoint starts unlock only through Launch Run career progress');
