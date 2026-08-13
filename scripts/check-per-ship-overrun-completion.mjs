import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getShipMasteryTier,
  mergeShipMasteryMaps,
  normalizeShipMasteryRecord,
  recordShipOverrunCompletion,
  recordShipTourCompletion
} from '../src/progression/ShipMastery.js';
import { createRunReport } from '../src/game/RunReport.js';

const shipId = 'nova_ship_01';
const base = { [shipId]: { runs: 3, clears: 0, bestSector: 6, overrunClears: 0 } };
const legitimate = { runMode: 'overrun_tactical', shipId, startSector: 51, sectorReached: 60, overrunCompletionEarned: true };
const first = recordShipOverrunCompletion(base, legitimate, { completedAt: '2026-08-12T12:00:00.000Z' });
assert.equal(first.recorded, true);
assert.equal(first.current.overrunClears, 1);
assert.equal(first.current.tours, 1);
assert.equal(first.current.clears, 0, 'Overrun must never create ranked clears');
assert.equal(getShipMasteryTier(first.current).id, 'silver', 'Overrun must never grant ranked Gold mastery');

for (const invalid of [
  { ...legitimate, sectorReached: 59, overrunCompletionEarned: false },
  { ...legitimate, startSector: 50 }, { ...legitimate, runMode: 'ranked_tactical' },
  { ...legitimate, overrunCompletionEarned: false }, { ...legitimate, isDebugRun: true },
  { ...legitimate, quickStart: true }, { ...legitimate, lateGameExperimentActive: true },
  { ...legitimate, runRewardsSuppressed: true }, { ...legitimate, overrunCompletionRecorded: true }
]) {
  const result = recordShipOverrunCompletion(base, invalid);
  assert.equal(result.recorded, false);
  assert.equal(result.current.overrunClears, 0);
}

const normalized = normalizeShipMasteryRecord({ overrunClears: 4 });
assert.equal(normalized.overrunClears, 4);
assert.equal(normalized.tours, 4);
assert.deepEqual(normalizeShipMasteryRecord(normalized), normalized, 'migration must be idempotent');
const merged = mergeShipMasteryMaps({ [shipId]: { overrunClears: 3 } }, { [shipId]: { overrunClears: 7 } });
assert.equal(merged[shipId].overrunClears, 7);
assert.equal(merged[shipId].tours, 7, 'Steam Cloud merge must use max for Tours');

const rankedTour = recordShipTourCompletion(base, { ...legitimate, runMode: 'ranked', startSector: 1, sectorReached: 10, runCleared: true });
assert.equal(rankedTour.recorded, true);
assert.equal(rankedTour.source, 'ranked');
assert.equal(rankedTour.current.tours, 1);
assert.equal(rankedTour.current.clears, 0, 'Tour recognition must not write ranked mastery itself');
const sectorTour = recordShipTourCompletion(base, { ...legitimate, runMode: 'sector_start', startSector: 55, sectorReached: 65, overrunCompletionEarned: false });
assert.equal(sectorTour.recorded, true);
assert.equal(sectorTour.source, 'sector');
assert.equal(sectorTour.current.tours, 1);
assert.equal(recordShipTourCompletion(base, { ...legitimate, runMode: 'sector_start', startSector: 55, sectorReached: 64 }).recorded, false);
assert.equal(recordShipTourCompletion(base, { ...legitimate, shipTourCompletionRecorded: true }).recorded, false);

const report = createRunReport({
  ...legitimate, runElapsedSeconds: 600, runTotalElapsedSeconds: 780, finalScore: 500000,
  shipName: 'Viking', shipMastery: first.current, shipTour: first.current,
  shipTourCompletionRecorded: true, shipTourCompletionSource: 'overrun'
});
const tourRow = report.sections.find((section) => section.id === 'rewards')?.rows.find((row) => row.id === 'shipTours');
assert.equal(tourRow?.rawValue?.tours, 1);
assert.equal(tourRow?.rawValue?.earnedThisRun, true);

const reportSource = readFileSync(new URL('../src/scenes/GameOverScene.js', import.meta.url), 'utf8');
const hangarSource = readFileSync(new URL('../src/scenes/ShipSelectScene.js', import.meta.url), 'utf8');
assert.ok(reportSource.includes("shipTours: 'TOURS'"));
assert.ok(reportSource.includes("translateText('{count} // NEW THIS RUN'"));
assert.ok(hangarSource.includes("translateText('TOURS')"));
assert.ok(!hangarSource.includes("overrunBadge.label = 'hangarShipOverrunBadge'"));

console.log('[per-ship-overrun-completion] PASS ranked/Overrun/Sector Tours increment once, invalid paths do not credit, ranked mastery is unchanged, migration and max merge are stable');
