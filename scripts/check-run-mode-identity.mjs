import assert from 'node:assert/strict';
import {
  RUN_MODES,
  canRunModeSubmitGlobalLeaderboard,
  getRunModeReportIdentity,
  isRankedRunMode,
  parseRunMode
} from '../src/game/RunMode.js';
import { createRunReport, summarizeRunReport } from '../src/game/RunReport.js';
import {
  STEAM_LEADERBOARD_NAME,
  STEAM_TACTICAL_LEADERBOARD_NAME,
  createRunResultFromGame
} from '../src/leaderboard/LeaderboardTypes.js';

const supportedModes = [
  [RUN_MODES.RANKED, 'Mayhem Pure'],
  [RUN_MODES.MAYHEM_TACTICAL, 'Mayhem Tactical'],
  [RUN_MODES.DAILY_SIGNAL, 'Daily Signal'],
  [RUN_MODES.SCOUT, 'Scout Run'],
  [RUN_MODES.SECTOR_START, 'Sector Run'],
  [RUN_MODES.OVERRUN_PURE, 'Overrun Pure'],
  [RUN_MODES.OVERRUN_TACTICAL, 'Overrun Tactical'],
  [RUN_MODES.UNRANKED, 'Practice Run']
];

for (const [runMode, expectedLabel] of supportedModes) {
  const report = createRunReport({
    runMode,
    finalScore: 12345,
    sectorReached: 6,
    runElapsedSeconds: 90
  });
  assert.equal(report.version, 16);
  assert.equal(report.summary.runMode, runMode);
  assert.equal(report.summary.runModeCanonical, runMode);
  assert.equal(report.summary.runModeCompatibility, 'canonical');
  assert.equal(report.summary.runModeLabel, expectedLabel);
  assert.equal(report.sections[0].rows.find((row) => row.id === 'mode')?.value, expectedLabel);
  assert.equal(summarizeRunReport(report)?.runModeCanonical, runMode);
}

assert.equal(parseRunMode('mayhem-pure'), RUN_MODES.RANKED);
assert.equal(parseRunMode('TACTICAL'), RUN_MODES.MAYHEM_TACTICAL);
assert.equal(parseRunMode('daily challenge'), RUN_MODES.DAILY_SIGNAL);
assert.equal(parseRunMode('sector continue'), RUN_MODES.SECTOR_START);
assert.equal(parseRunMode('overrun'), RUN_MODES.OVERRUN_TACTICAL);
assert.equal(parseRunMode('overrun-pure'), RUN_MODES.OVERRUN_PURE);
assert.equal(parseRunMode('mystery_mode'), null);
assert.equal(parseRunMode(null), null);

const legacyAlias = getRunModeReportIdentity('mayhem-pure');
assert.equal(legacyAlias.id, RUN_MODES.RANKED);
assert.equal(legacyAlias.label, 'Mayhem Pure');
assert.equal(legacyAlias.compatibility, 'legacy_alias');

const missingLegacyReport = createRunReport({ finalScore: 10, sectorReached: 1 });
assert.equal(missingLegacyReport.summary.runMode, null);
assert.equal(missingLegacyReport.summary.runModeCanonical, null);
assert.equal(missingLegacyReport.summary.runModeLabel, 'Legacy Ranked Run');
assert.equal(missingLegacyReport.summary.runModeCompatibility, 'missing_legacy_mode');
assert.equal(
  missingLegacyReport.sections[0].rows.find((row) => row.id === 'mode')?.value,
  'Legacy Ranked Run',
  'missing legacy mode must not silently display Mayhem Pure'
);

const unknownReport = createRunReport({
  runMode: 'prototype_survival',
  finalScore: 20,
  sectorReached: 2
});
assert.equal(unknownReport.summary.runMode, 'prototype_survival');
assert.equal(unknownReport.summary.runModeCanonical, null);
assert.equal(unknownReport.summary.runModeLabel, 'Unknown Run Mode');
assert.equal(unknownReport.summary.runModeCompatibility, 'unknown_mode');

assert.equal(isRankedRunMode(RUN_MODES.RANKED), true);
assert.equal(isRankedRunMode(RUN_MODES.MAYHEM_TACTICAL), true);
assert.equal(isRankedRunMode(RUN_MODES.RANKED, { isDebugRun: true }), false);
assert.equal(isRankedRunMode(null), false);
assert.equal(isRankedRunMode('prototype_survival'), false);
assert.equal(canRunModeSubmitGlobalLeaderboard('prototype_survival'), false);

const authoritativeCompletedRun = createRunResultFromGame({
  score: 1000,
  level: 4,
  runMode: RUN_MODES.RANKED,
  runSummary: { runMode: RUN_MODES.MAYHEM_TACTICAL },
  isDebugRun: false
});
assert.equal(authoritativeCompletedRun.runMode, RUN_MODES.MAYHEM_TACTICAL);
assert.equal(authoritativeCompletedRun.leaderboardName, STEAM_TACTICAL_LEADERBOARD_NAME);
assert.equal(authoritativeCompletedRun.eligibleForSubmission, true);

const explicitPureOverride = createRunResultFromGame({
  score: 1000,
  level: 4,
  runMode: RUN_MODES.MAYHEM_TACTICAL,
  runSummary: { runMode: RUN_MODES.MAYHEM_TACTICAL },
  isDebugRun: false
}, {
  runMode: RUN_MODES.RANKED
});
assert.equal(explicitPureOverride.runMode, RUN_MODES.RANKED);
assert.equal(explicitPureOverride.leaderboardName, STEAM_LEADERBOARD_NAME);

const unknownSubmission = createRunResultFromGame({
  score: 1000,
  level: 4,
  runMode: 'prototype_survival',
  isDebugRun: false
});
assert.equal(unknownSubmission.runMode, 'prototype_survival');
assert.equal(unknownSubmission.leaderboardName, null);
assert.equal(unknownSubmission.leaderboardKind, 'ineligible');
assert.equal(unknownSubmission.eligibleForSubmission, false);
assert.equal(unknownSubmission.eligibleForAchievements, false);

console.log('[run-mode-identity] PASS canonical modes, legacy aliases, unknown fallback, authoritative completed-run routing');
