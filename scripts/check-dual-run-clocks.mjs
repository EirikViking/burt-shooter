import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRunReport, summarizeRunReport } from '../src/game/RunReport.js';
import { createRunResultFromGame, encodeSteamLeaderboardDetails } from '../src/leaderboard/LeaderboardTypes.js';
import { RunSessionClock } from '../src/game/RunSessionClock.js';

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(
  mainSource,
  /const elapsedFrameMs = Number\(delta\.elapsedMS\);[\s\S]*?game\.update\([\s\S]*?clampedDelta,[\s\S]*?elapsedFrameMs/,
  'the total clock must receive Pixi elapsedMS, the raw uncapped monotonic frame delta'
);
assert.doesNotMatch(
  mainSource,
  /game\.update\(clampedDelta,\s*Number\(delta\.deltaMS\)/,
  'Pixi deltaMS is capped and must not drive total elapsed time'
);

const activeSeconds = 412;
const totalSeconds = 587;
const baseSummary = {
  runMode: 'ranked_tactical',
  shipId: 'nova_ship_01',
  shipName: 'Viking',
  finalScore: 987654,
  sectorReached: 10,
  runElapsedSeconds: activeSeconds,
  runTotalElapsedSeconds: totalSeconds,
  runCleared: true
};

const report = createRunReport(baseSummary);
assert.equal(report.summary.runtimeSeconds, activeSeconds, 'active time must preserve runElapsedSeconds');
assert.equal(report.summary.totalElapsedSeconds, totalSeconds, 'total elapsed must include no-agency and pause time');
assert.equal(report.summary.runtimeLabel, '6:52');
assert.equal(report.summary.totalElapsedLabel, '9:47');
assert.equal(report.sections[0].rows.find((row) => row.id === 'activeTime')?.rawValue, activeSeconds);
assert.equal(report.sections[0].rows.find((row) => row.id === 'totalElapsed')?.rawValue, totalSeconds);
assert.equal(summarizeRunReport(report).totalElapsedSeconds, totalSeconds);

const legacy = createRunReport({ ...baseSummary, runTotalElapsedSeconds: undefined });
assert.equal(legacy.summary.totalElapsedSeconds, activeSeconds, 'old summaries must safely normalize to active time');

const payloadGame = {
  score: baseSummary.finalScore,
  level: baseSummary.sectorReached,
  rankIndex: 4,
  runMode: baseSummary.runMode,
  runSummary: baseSummary,
  selectedShipSpriteKey: baseSummary.shipId,
  scenes: { play: { gameTime: activeSeconds, totalKills: 42, bossKills: 4, wavesCleared: 18 } }
};
const beforePayload = createRunResultFromGame({
  ...payloadGame,
  runSummary: { ...baseSummary, runTotalElapsedSeconds: undefined }
}, { runTimeSeconds: activeSeconds });
const afterPayload = createRunResultFromGame({
  ...payloadGame,
  runSummary: { ...baseSummary, runTotalElapsedSeconds: totalSeconds },
  runTotalElapsedSeconds: totalSeconds
}, { runTimeSeconds: activeSeconds });
assert.deepEqual(afterPayload, beforePayload, 'the new display-only clock must not change competitive payloads');
assert.deepEqual(encodeSteamLeaderboardDetails(afterPayload), encodeSteamLeaderboardDetails(beforePayload));

const segments = [
  ['combat', 60, 60],
  ['transition', 0, 5],
  ['draft', 0, 12],
  ['wonder', 0, 8],
  ['pause', 0, 15],
  ['combat', 40, 40]
];
const sessionClock = new RunSessionClock();
sessionClock.start();
const totals = segments.reduce((state, [, active, total]) => {
  sessionClock.advanceRealFrame(total * 1000);
  return { active: state.active + active, total: sessionClock.elapsedSeconds };
}, { active: 0, total: 0 });
assert.deepEqual(totals, { active: 100, total: 140 });

const pauseSnapshot = sessionClock.snapshot();
sessionClock.advanceRealFrame(5000);
assert.equal(sessionClock.elapsedSeconds, 145, 'user pause remains part of total elapsed');
assert.equal(pauseSnapshot.running, true);

const throttledFrameClock = new RunSessionClock();
throttledFrameClock.start();
throttledFrameClock.advanceRealFrame(1250);
assert.equal(
  throttledFrameClock.elapsedSeconds,
  1.25,
  'a throttled long frame must retain its full monotonic elapsed duration'
);

const restoredLegacy = new RunSessionClock();
restoredLegacy.restore({}, 77);
assert.equal(restoredLegacy.elapsedSeconds, 77, 'legacy persisted runs initialize total from active once');
restoredLegacy.advanceRealFrame(3000);
assert.equal(restoredLegacy.elapsedSeconds, 80, 'migrated total clock must then diverge normally');

const restoredModern = new RunSessionClock();
restoredModern.restore({ elapsedMs: 99000 }, 77);
assert.equal(restoredModern.elapsedSeconds, 99, 'saved accumulated total resumes without offline/calendar time');
assert.equal(restoredModern.finalize(82), 99000);
restoredModern.advanceRealFrame(10000);
assert.equal(restoredModern.elapsedSeconds, 99, 'finalization freezes total exactly once');

console.log('[dual-run-clocks] PASS active clock remains competitive; total elapsed includes transitions, Drafts, Wonders, and pause; legacy summaries normalize safely');
