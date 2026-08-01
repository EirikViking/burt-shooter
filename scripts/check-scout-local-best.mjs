import assert from 'node:assert/strict';
import {
  SCOUT_RUN_RECORDS_KEY,
  compareScoutRunRecords,
  getScoutRunBest,
  isBetterScoutRunRecord,
  readScoutRunRecords,
  recordScoutRun
} from '../src/progression/ScoutRunRecords.js';
import { shouldScopeStorageKey } from '../src/profile/ProfileStorageNamespace.js';

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries);
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

const storage = new MemoryStorage();
assert.equal(shouldScopeStorageKey(SCOUT_RUN_RECORDS_KEY), true, 'Scout best must be profile-scoped');
assert.equal(getScoutRunBest({ targetStorage: storage }), null, 'Scout best should default to empty');

const mayhemIgnored = recordScoutRun({
  runMode: 'ranked',
  score: 999999,
  sectorReached: 12,
  levelReached: 12
}, { targetStorage: storage });
assert.equal(mayhemIgnored.stored, false, 'Mayhem summary must not write Scout best');
assert.equal(storage.getItem(SCOUT_RUN_RECORDS_KEY), null, 'Non-Scout summaries must leave Scout storage untouched');

const first = recordScoutRun({
  runMode: 'scout',
  score: 120000,
  sectorReached: 8,
  levelReached: 8,
  runElapsedSeconds: 240,
  bossesKilled: 1,
  wavesCleared: 18
}, {
  targetStorage: storage,
  shipId: 'nova_ship_01',
  shipName: 'Nova Sparrow',
  selectedShipSpriteKey: 'nova-player-ship-01.png'
});
assert.equal(first.stored, true, 'First Scout score should store a best');
assert.equal(first.isNewBest, true, 'First Scout score should be a new best');
assert.equal(first.bestRecord.score, 120000);
assert.equal(getScoutRunBest({ targetStorage: storage }).score, 120000, 'Stored Scout best should survive readback');

const lower = recordScoutRun({
  runMode: 'scout',
  score: 90000,
  sectorReached: 10,
  levelReached: 10
}, { targetStorage: storage });
assert.equal(lower.stored, false, 'Lower Scout score must not overwrite best');
assert.equal(lower.isNewBest, false, 'Lower Scout score must not be a new best');
assert.equal(getScoutRunBest({ targetStorage: storage }).score, 120000, 'Scout best must not decrease');

const higher = recordScoutRun({
  runMode: 'scout',
  score: 150000,
  sectorReached: 9,
  levelReached: 9
}, { targetStorage: storage });
assert.equal(higher.stored, true, 'Higher Scout score should update best');
assert.equal(higher.bestRecord.score, 150000);
assert.equal(readScoutRunRecords({ targetStorage: storage }).best.score, 150000, 'Scout best should survive save/load');

const sameScoreDeeper = {
  runMode: 'scout',
  score: 150000,
  sectorReached: 11,
  levelReached: 11
};
assert.equal(isBetterScoutRunRecord(sameScoreDeeper, higher.bestRecord), true, 'Equal score deeper sector should be better');
const deeper = recordScoutRun(sameScoreDeeper, { targetStorage: storage });
assert.equal(deeper.stored, true, 'Deeper same-score Scout run should update best');
assert.equal(getScoutRunBest({ targetStorage: storage }).sectorReached, 11);

const duplicate = recordScoutRun(sameScoreDeeper, { targetStorage: storage });
assert.equal(duplicate.stored, false, 'Running the same Scout best twice should be idempotent');
assert.equal(getScoutRunBest({ targetStorage: storage }).score, 150000);

const sameScoreSameDepthLater = {
  ...sameScoreDeeper,
  completedAt: '2099-01-01T00:00:00.000Z'
};
assert.equal(compareScoutRunRecords(sameScoreSameDepthLater, deeper.bestRecord), 0,
  'Equal score/depth ties must remain a deterministic tie regardless of completion timestamp');
assert.equal(isBetterScoutRunRecord(sameScoreSameDepthLater, deeper.bestRecord), false,
  'A later identical Scout score must not replace the existing local best');
const laterTie = recordScoutRun(sameScoreSameDepthLater, { targetStorage: storage });
assert.equal(laterTie.stored, false, 'A later identical Scout score must remain idempotent');
assert.equal(laterTie.bestRecord.completedAt, deeper.bestRecord.completedAt,
  'An exact tie must preserve the incumbent record metadata');

console.log('[check-scout-local-best] PASS');
