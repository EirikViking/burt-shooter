import assert from 'node:assert/strict';
import { deriveDailySignalContract } from '../src/config/DailyCabinetSignal.js';
import {
  getDailySignalBest,
  isBetterDailySignalRecord,
  readDailySignalRecords,
  recordDailySignalRun
} from '../src/progression/DailySignalRecords.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

const targetStorage = createStorage();
const contract = deriveDailySignalContract('2026-07-15');
const baseSummary = {
  runMode: 'daily_signal',
  dailySignalContract: contract,
  dailySignalAttemptId: 'attempt-a',
  dailySignalContractValid: true,
  dailySignalInvalidReason: null,
  score: 15000,
  finalScore: 15000,
  sectorReached: 7,
  levelReached: 7,
  runCleared: false,
  runElapsedSeconds: 320,
  bossesKilled: 6,
  wavesCleared: 24
};

const first = recordDailySignalRun(baseSummary, { targetStorage, completedAt: '2026-07-15T12:00:00.000Z' });
assert.equal(first.isNewBest, true);
assert.equal(first.stored, true);
assert.equal(getDailySignalBest(contract, { targetStorage })?.score, 15000);

const invalid = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-debug',
  dailySignalContractValid: false,
  dailySignalInvalidReason: 'debug_route',
  score: 999999,
  finalScore: 999999
}, { targetStorage, completedAt: '2026-07-15T12:15:00.000Z' });
assert.equal(invalid.stored, false, 'invalid or debug Daily attempts must never overwrite the cabinet record');
assert.equal(invalid.isNewBest, false);
assert.equal(getDailySignalBest(contract, { targetStorage })?.attemptId, 'attempt-a');

const lower = recordDailySignalRun({ ...baseSummary, dailySignalAttemptId: 'attempt-b', score: 14000, finalScore: 14000 }, {
  targetStorage,
  completedAt: '2026-07-15T12:30:00.000Z'
});
assert.equal(lower.isNewBest, false);
assert.equal(getDailySignalBest(contract, { targetStorage })?.attemptId, 'attempt-a');

const clear = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-c',
  score: 12000,
  finalScore: 12000,
  sectorReached: 10,
  levelReached: 10,
  runCleared: true,
  runElapsedSeconds: 400,
  bossesKilled: 10
}, { targetStorage, completedAt: '2026-07-15T13:00:00.000Z' });
assert.equal(clear.isNewBest, true, 'a completed contract outranks a higher-score failed attempt');
assert.equal(getDailySignalBest(contract, { targetStorage })?.runCleared, true);

const fasterClear = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-d',
  score: 12000,
  finalScore: 12000,
  sectorReached: 10,
  levelReached: 10,
  runCleared: true,
  runElapsedSeconds: 360,
  bossesKilled: 10
}, { targetStorage, completedAt: '2026-07-15T13:30:00.000Z' });
assert.equal(fasterClear.isNewBest, true, 'equal-score clears use faster completion as the tie-break');
assert.equal(getDailySignalBest(contract, { targetStorage })?.attemptId, 'attempt-d');

const exactTie = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-e',
  score: 12000,
  finalScore: 12000,
  sectorReached: 10,
  levelReached: 10,
  runCleared: true,
  runElapsedSeconds: 360,
  bossesKilled: 10
}, { targetStorage, completedAt: '2026-07-15T14:00:00.000Z' });
assert.equal(exactTie.isNewBest, false, 'a later timestamp must not turn an identical performance into a new best');
assert.equal(getDailySignalBest(contract, { targetStorage })?.attemptId, 'attempt-d');

const unavailableStorage = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-no-storage',
  score: 25000,
  finalScore: 25000
}, { targetStorage: null, completedAt: '2026-07-15T14:30:00.000Z' });
assert.equal(unavailableStorage.stored, false);
assert.equal(unavailableStorage.isNewBest, false, 'an unsaved score must never be announced as a new best');
assert.equal(unavailableStorage.saveFailed, true);

const quotaStorage = {
  getItem: () => null,
  setItem: () => { throw new Error('quota exceeded'); }
};
const quotaFailure = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-quota',
  score: 26000,
  finalScore: 26000
}, { targetStorage: quotaStorage, completedAt: '2026-07-15T14:45:00.000Z' });
assert.equal(quotaFailure.stored, false);
assert.equal(quotaFailure.isNewBest, false);
assert.equal(quotaFailure.saveFailed, true);

const otherDay = deriveDailySignalContract('2026-07-16');
assert.equal(getDailySignalBest(otherDay, { targetStorage }), null, 'daily records must not leak across contracts');
assert.equal(Object.keys(readDailySignalRecords({ targetStorage }).records).length, 1);
assert.equal(isBetterDailySignalRecord(fasterClear.attemptRecord, clear.attemptRecord), true);

console.log('[check-daily-signal-records] PASS', {
  rulesHash: contract.rulesHash,
  best: getDailySignalBest(contract, { targetStorage })
});
