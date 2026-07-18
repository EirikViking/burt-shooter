import assert from 'node:assert/strict';
import {
  SECTOR_START_CHALLENGE_RECORDS_KEY,
  getSectorStartChallengeRecord,
  readSectorStartChallengeRecords,
  recordSectorStartChallengeRun
} from '../src/progression/SectorStartChallengeRecords.js';
import { shouldScopeStorageKey } from '../src/profile/ProfileStorageNamespace.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
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

function makeSummary({
  runMode = 'sector_start',
  startSector = 10,
  score = 120000,
  sectorReached = 13,
  finalSector = sectorReached
} = {}) {
  return {
    runMode,
    runModeReason: runMode === 'sector_start' ? 'sector_start_checkpoint' : null,
    sectorStartCheckpoint: startSector,
    score,
    finalScore: score,
    sectorReached,
    levelReached: sectorReached,
    finalSector,
    selectedShipSpriteKey: 'nova_ship_01',
    runElapsedSeconds: 88,
    bossesKilled: Math.max(0, sectorReached - startSector),
    wavesCleared: 9,
    runCleared: false
  };
}

const storage = new MemoryStorage();

assert.equal(shouldScopeStorageKey(SECTOR_START_CHALLENGE_RECORDS_KEY), true, 'challenge records must be profile-scoped');

const rankedIgnored = recordSectorStartChallengeRun(makeSummary({ runMode: 'ranked' }), {
  targetStorage: storage,
  selectedShipSpriteKey: 'nova_ship_01',
  shipId: 'nova_ship_01',
  shipName: 'Nova Sparrow'
});
assert.equal(rankedIgnored.stored, false);
assert.equal(storage.getItem(SECTOR_START_CHALLENGE_RECORDS_KEY), null, 'ranked summaries must not write challenge records');

const first = recordSectorStartChallengeRun(makeSummary(), {
  targetStorage: storage,
  selectedShipSpriteKey: 'nova_ship_01',
  shipId: 'nova_ship_01',
  shipName: 'Nova Sparrow'
});
assert.equal(first.stored, true);
assert.equal(first.isNewBest, true);
assert.equal(first.bestRecord.startSector, 10);
assert.equal(first.bestRecord.scoreEarned, 120000);
assert.equal(first.bestRecord.highestSectorReached, 13);
assert.equal(first.bestRecord.finalSector, 13);
assert.equal(first.bestRecord.shipId, 'nova_ship_01');
assert.equal(first.bestRecord.shipName, 'Nova Sparrow');
assert.ok(first.bestRecord.completedAt, 'challenge record should include date/time');

const lower = recordSectorStartChallengeRun(makeSummary({ score: 90000, sectorReached: 14 }), {
  targetStorage: storage,
  selectedShipSpriteKey: 'nova_ship_01',
  shipId: 'nova_ship_01',
  shipName: 'Nova Sparrow'
});
assert.equal(lower.stored, false);
assert.equal(lower.isNewBest, false);
assert.equal(getSectorStartChallengeRecord(10, { targetStorage: storage }).scoreEarned, 120000, 'lower score must not replace checkpoint best');

const higher = recordSectorStartChallengeRun(makeSummary({ score: 140000, sectorReached: 12 }), {
  targetStorage: storage,
  selectedShipSpriteKey: 'nova_ship_02',
  shipId: 'nova_ship_02',
  shipName: 'Comet Needle'
});
assert.equal(higher.stored, true);
assert.equal(higher.isNewBest, true);
assert.equal(getSectorStartChallengeRecord(10, { targetStorage: storage }).scoreEarned, 140000);
assert.equal(getSectorStartChallengeRecord(10, { targetStorage: storage }).shipName, 'Comet Needle');

const secondCheckpoint = recordSectorStartChallengeRun(makeSummary({ startSector: 15, score: 70000, sectorReached: 16 }), {
  targetStorage: storage,
  selectedShipSpriteKey: 'nova_ship_01',
  shipId: 'nova_ship_01',
  shipName: 'Nova Sparrow'
});
assert.equal(secondCheckpoint.stored, true);

const records = readSectorStartChallengeRecords({ targetStorage: storage });
assert.deepEqual(Object.keys(records.byCheckpoint).sort(), ['10', '15']);

for (const normalKey of [
  'novaSwarm.localLeaderboard.v2',
  'nova.hangarProgress.v1',
  'burt.shipUnlockProgress.v1',
  'nova_swarm_achievements_v1',
  'burt.shipUsage.v1',
  'burt.shipUsageTotal.v1',
  'nova.threatDiscovery.v1'
]) {
  assert.equal(storage.getItem(normalKey), null, `${normalKey} must stay untouched by challenge records`);
}

console.log(`[sector-start-challenge-records] PASS key=${SECTOR_START_CHALLENGE_RECORDS_KEY} checkpoints=${Object.keys(records.byCheckpoint).join(',')}`);
