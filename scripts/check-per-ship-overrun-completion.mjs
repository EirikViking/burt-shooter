import assert from 'node:assert/strict';
import {
  getShipMasteryTier,
  mergeShipMasteryMaps,
  normalizeShipMasteryRecord,
  recordShipOverrunCompletion
} from '../src/progression/ShipMastery.js';
import { createRunReport } from '../src/game/RunReport.js';

const shipId = 'nova_ship_01';
const base = { [shipId]: { runs: 3, clears: 0, bestSector: 6, overrunClears: 0 } };
const legitimate = {
  runMode: 'overrun_tactical',
  shipId,
  startSector: 51,
  sectorReached: 60,
  overrunCompletionEarned: true
};

const first = recordShipOverrunCompletion(base, legitimate, { completedAt: '2026-08-12T12:00:00.000Z' });
assert.equal(first.recorded, true);
assert.equal(first.current.overrunClears, 1);
assert.equal(first.current.clears, 0, 'Overrun must never create ranked clears');
assert.equal(getShipMasteryTier(first.current).id, 'silver', 'Overrun must never grant ranked Gold mastery');

for (const invalid of [
  { ...legitimate, sectorReached: 59, overrunCompletionEarned: false },
  { ...legitimate, startSector: 50 },
  { ...legitimate, runMode: 'ranked_tactical' },
  { ...legitimate, overrunCompletionEarned: false },
  { ...legitimate, isDebugRun: true },
  { ...legitimate, quickStart: true },
  { ...legitimate, lateGameExperimentActive: true },
  { ...legitimate, runRewardsSuppressed: true },
  { ...legitimate, overrunCompletionRecorded: true }
]) {
  const result = recordShipOverrunCompletion(base, invalid);
  assert.equal(result.recorded, false, 'early death, wrong start/mode, and unearned later milestones must not credit');
  assert.equal(result.current.overrunClears, 0);
}

const normalized = normalizeShipMasteryRecord({ overrunClears: 4 });
assert.equal(normalized.overrunClears, 4);
assert.equal(normalizeShipMasteryRecord(normalized).overrunClears, 4, 'migration must be idempotent');
const merged = mergeShipMasteryMaps(
  { [shipId]: { overrunClears: 3 } },
  { [shipId]: { overrunClears: 7 } }
);
assert.equal(merged[shipId].overrunClears, 7, 'Steam Cloud merge must use max for per-ship Overrun completions');

const report = createRunReport({
  ...legitimate,
  runElapsedSeconds: 600,
  runTotalElapsedSeconds: 780,
  finalScore: 500000,
  shipName: 'Viking',
  shipMastery: first.current,
  shipOverrun: first.current,
  shipOverrunCompletionRecorded: true
});
const overrunRow = report.sections
  .find((section) => section.id === 'rewards')
  ?.rows.find((row) => row.id === 'overrunClears');
assert.equal(overrunRow?.rawValue?.clears, 1, 'Run Report must surface the per-ship Overrun tally');
assert.equal(overrunRow?.rawValue?.earnedThisRun, true, 'Run Report must attach NEW only to this run increment');

const reportSource = await import('node:fs').then(({ readFileSync }) => readFileSync(new URL('../src/scenes/GameOverScene.js', import.meta.url), 'utf8'));
const hangarSource = await import('node:fs').then(({ readFileSync }) => readFileSync(new URL('../src/scenes/ShipSelectScene.js', import.meta.url), 'utf8'));
assert.ok(reportSource.includes("overrunClears: 'OVERRUN CLEARS'"));
assert.ok(reportSource.includes("translateText('{count} // NEW THIS RUN'"));
assert.ok(hangarSource.includes("overrunBadge.label = 'hangarShipOverrunBadge'"));
assert.ok(hangarSource.includes("translateText('OVERRUN ×{count}'"));
assert.ok(hangarSource.includes('if (mastery.overrunClears > 0)'), 'Hangar Overrun chip must stay hidden until earned');
assert.ok(hangarSource.includes('separateFromRankedMastery: true'));

console.log('[per-ship-overrun-completion] PASS legitimate S51-S60 completion increments once, early/later invalid paths do not credit, ranked mastery is unchanged, migration and max merge are stable');
