import assert from 'node:assert/strict';
import { buildLeaderboardPresentationRoster } from '../src/leaderboard/LeaderboardPresentationRoster.js';
import { LEADERBOARD_DISPLAY_LIMIT } from '../src/leaderboard/LeaderboardTypes.js';
import { analyzeGlobalLeaderboardScore, analyzeGlobalRivalProjection } from '../src/shared/GlobalLeaderboardPlacement.js';
import { readFileSync } from 'node:fs';

const highscoreSource = readFileSync(new URL('../src/scenes/HighscoreScene.js', import.meta.url), 'utf8');

assert.equal(LEADERBOARD_DISPLAY_LIMIT, 50);
const real = Array.from({ length: 12 }, (_, index) => ({
  rank: index + 1,
  name: `STEAM PILOT ${index + 1}`,
  score: 500000 - index * 12000,
  source: 'steam'
}));
const roster = buildLeaderboardPresentationRoster(real, { view: 'global', limit: 50 });
assert.equal(roster.length, 50);
assert.deepEqual(roster.slice(0, 12), real, 'verified Steam rows must remain byte-for-byte unchanged');
assert.equal(new Set(roster.map((entry) => entry.name)).size, 50, 'presentation callsigns must be varied');
assert.ok(roster.slice(12).every((entry) => entry.isCpuRival && entry.presentationOnly && entry.excludedFromCompetition));
assert.ok(roster.every((entry, index) => index === 0 || entry.score < roster[index - 1].score), 'presentation scores must remain strictly descending');
assert.deepEqual(buildLeaderboardPresentationRoster(real, { view: 'global', limit: 50 }), roster, 'CPU rival roster must be deterministic');

const competitive = analyzeGlobalLeaderboardScore(1000, real, { maxEntries: 50 });
assert.equal(competitive.scoresCount, 12, 'CPU presentation rows must never enter qualification');
const rival = analyzeGlobalRivalProjection(1000, real, { maxEntries: 50 });
assert.equal(rival.boardCount, 12, 'CPU presentation rows must never enter the in-run rival ladder');
assert.equal(rival.boardFull, false);
assert.match(highscoreSource, /CPU RIVALS \/\/ NOT STEAM RANKS/, 'CPU sections must explicitly deny Steam rank status');
assert.match(highscoreSource, /isCpuRival \? 'CPU' : translateText\('#\{rank\}'/, 'CPU rivals must never receive numeric Steam ranks');

console.log('[leaderboard-top50-roster] PASS top50, deterministic natural callsigns, explicit CPU provenance, real-row preservation, competitive isolation');
