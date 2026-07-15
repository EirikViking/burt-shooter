import assert from 'node:assert/strict';
import { deriveDailySignalContract } from '../src/config/DailyCabinetSignal.js';
import {
  DAILY_SIGNAL_RECORDS_KEY,
  formatDailySignalFlightLogSymbols,
  getDailySignalBest,
  getDailySignalBestAttempt,
  getDailySignalBestClear,
  getDailySignalAttemptCount,
  getDailySignalFlightLog,
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

const TEST_DAY = new Date().toISOString().slice(0, 10);
const TEST_DAY_MS = Date.parse(`${TEST_DAY}T00:00:00.000Z`);
const dayAtOffset = (offset) => new Date(TEST_DAY_MS + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const completedAt = (time) => `${TEST_DAY}T${time}:00.000Z`;

const targetStorage = createStorage();
const contract = deriveDailySignalContract(TEST_DAY);
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

const first = recordDailySignalRun(baseSummary, { targetStorage, completedAt: completedAt('12:00') });
assert.equal(first.isNewBest, true);
assert.equal(first.stored, true);
assert.equal(getDailySignalBest(contract, { targetStorage })?.score, 15000);
assert.equal(getDailySignalAttemptCount(contract, { targetStorage }), 1);

const invalid = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-debug',
  dailySignalContractValid: false,
  dailySignalInvalidReason: 'debug_route',
  score: 999999,
  finalScore: 999999
}, { targetStorage, completedAt: completedAt('12:15') });
assert.equal(invalid.stored, false, 'invalid or debug Daily attempts must never overwrite the cabinet record');
assert.equal(invalid.isNewBest, false);
assert.equal(getDailySignalBest(contract, { targetStorage })?.attemptId, 'attempt-a');
assert.equal(getDailySignalAttemptCount(contract, { targetStorage }), 1, 'invalid attempts must not increment the valid attempt count');

const deeperAttempt = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-deeper',
  score: 9000,
  finalScore: 9000,
  sectorReached: 8,
  levelReached: 8
}, { targetStorage, completedAt: completedAt('12:20') });
assert.equal(deeperAttempt.isNewAttemptBest, true, 'deeper failed progress outranks a higher score from an earlier sector');
assert.equal(getDailySignalBestAttempt(contract, { targetStorage })?.attemptId, 'attempt-deeper');

const lower = recordDailySignalRun({ ...baseSummary, dailySignalAttemptId: 'attempt-b', score: 14000, finalScore: 14000 }, {
  targetStorage,
  completedAt: completedAt('12:30')
});
assert.equal(lower.isNewBest, false);
assert.equal(getDailySignalBestAttempt(contract, { targetStorage })?.attemptId, 'attempt-deeper');

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
}, { targetStorage, completedAt: completedAt('13:00') });
assert.equal(clear.isNewBest, true, 'a completed contract outranks a higher-score failed attempt');
assert.equal(getDailySignalBest(contract, { targetStorage })?.runCleared, true);
assert.equal(getDailySignalBestClear(contract, { targetStorage })?.attemptId, 'attempt-c');
assert.equal(getDailySignalBestAttempt(contract, { targetStorage })?.attemptId, 'attempt-deeper', 'clears and failed attempts retain separate records');

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
}, { targetStorage, completedAt: completedAt('13:30') });
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
}, { targetStorage, completedAt: completedAt('14:00') });
assert.equal(exactTie.isNewBest, false, 'a later timestamp must not turn an identical performance into a new best');
assert.equal(getDailySignalBest(contract, { targetStorage })?.attemptId, 'attempt-d');
assert.equal(getDailySignalAttemptCount(contract, { targetStorage }), 6, 'every valid saved run increments the attempt count');

const unavailableStorage = recordDailySignalRun({
  ...baseSummary,
  dailySignalAttemptId: 'attempt-no-storage',
  score: 25000,
  finalScore: 25000
}, { targetStorage: null, completedAt: completedAt('14:30') });
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
}, { targetStorage: quotaStorage, completedAt: completedAt('14:45') });
assert.equal(quotaFailure.stored, false);
assert.equal(quotaFailure.isNewBest, false);
assert.equal(quotaFailure.saveFailed, true);

const otherDay = deriveDailySignalContract(dayAtOffset(1));
assert.equal(getDailySignalBest(otherDay, { targetStorage }), null, 'daily records must not leak across contracts');
assert.equal(Object.keys(readDailySignalRecords({ targetStorage }).records).length, 1);
assert.equal(isBetterDailySignalRecord(fasterClear.attemptRecord, clear.attemptRecord), true);

const flightStorage = createStorage();
const logDays = Array.from({ length: 7 }, (_, index) => dayAtOffset(index - 6));
for (const [index, day] of logDays.entries()) {
  if (index === 1 || index === 4) continue;
  const dayContract = deriveDailySignalContract(day);
  recordDailySignalRun({
    ...baseSummary,
    dailySignalContract: dayContract,
    dailySignalAttemptId: `flight-${day}`,
    score: 5000 + index * 100,
    finalScore: 5000 + index * 100,
    sectorReached: index === 2 || index >= 5 ? 10 : 6 + index,
    levelReached: index === 2 || index >= 5 ? 10 : 6 + index,
    runCleared: index === 2 || index >= 5
  }, {
    targetStorage: flightStorage,
    contract: dayContract,
    completedAt: `${day}T12:00:00.000Z`
  });
}
const flightLog = getDailySignalFlightLog({
  now: new Date(`${TEST_DAY}T18:00:00.000Z`),
  targetStorage: flightStorage
});
assert.deepEqual(flightLog.entries.map((entry) => entry.status), [
  'attempted', 'unopened', 'cleared', 'attempted', 'unopened', 'cleared', 'cleared'
]);
assert.equal(flightLog.clears, 3);
assert.equal(flightLog.attemptedDays, 5);
assert.equal(flightLog.streak, 2);
assert.equal(flightLog.atRisk, false);
assert.equal(formatDailySignalFlightLogSymbols(flightLog), '◇ · ◆ ◇ · ◆ ◆');

const longStreakStorage = createStorage();
for (let offset = -9; offset <= 0; offset += 1) {
  const day = dayAtOffset(offset);
  const dayContract = deriveDailySignalContract(day);
  recordDailySignalRun({
    ...baseSummary,
    dailySignalContract: dayContract,
    dailySignalAttemptId: `long-streak-${day}`,
    score: 10000 + offset,
    finalScore: 10000 + offset,
    sectorReached: 10,
    levelReached: 10,
    runCleared: true
  }, {
    targetStorage: longStreakStorage,
    contract: dayContract,
    completedAt: `${day}T12:00:00.000Z`
  });
}
const longStreakLog = getDailySignalFlightLog({
  now: new Date(`${TEST_DAY}T18:00:00.000Z`),
  days: 7,
  targetStorage: longStreakStorage
});
assert.equal(longStreakLog.entries.length, 7, 'the visible log should remain seven days');
assert.equal(longStreakLog.streak, 10, 'the streak should use retained history beyond the visible seven-day log');

const migrationStorage = createStorage();
migrationStorage.setItem(DAILY_SIGNAL_RECORDS_KEY, JSON.stringify({
  version: 1,
  records: {
    legacy: first.attemptRecord
  }
}));
const migrated = readDailySignalRecords({ targetStorage: migrationStorage });
const migratedKey = `${contract.dailyKey}:${contract.rulesHash}`;
assert.equal(migrated.bestAttempts[migratedKey]?.attemptId, 'attempt-a');
assert.equal(migrated.bestClears[migratedKey], undefined);
assert.equal(migrated.attemptCounts[migratedKey]?.count, 1);

console.log('[check-daily-signal-records] PASS', {
  rulesHash: contract.rulesHash,
  best: getDailySignalBest(contract, { targetStorage })
});
