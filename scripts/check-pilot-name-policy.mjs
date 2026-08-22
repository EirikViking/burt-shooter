import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  PUBLIC_PILOT_NAME_MAX_LENGTH,
  normalizeLeaderboardEntry,
  sanitizePilotName,
  toPublicPilotName
} from '../src/leaderboard/LeaderboardTypes.js';
import { sanitizeLocalPilotName } from '../src/api/LocalLeaderboard.js';

const fullName = 'VIOLET CHIMAERA';

assert.ok(PUBLIC_PILOT_NAME_MAX_LENGTH >= 18, 'shared public pilot-name limit must be at least 18');
assert.equal(sanitizePilotName(fullName), fullName, 'shared sanitization must preserve VIOLET CHIMAERA');
assert.equal(toPublicPilotName(fullName, 0), fullName, 'public submission name must preserve VIOLET CHIMAERA');
assert.equal(sanitizeLocalPilotName(fullName, 0), fullName, 'local storage name must preserve VIOLET CHIMAERA');
assert.equal(
  normalizeLeaderboardEntry({ name: fullName, score: 12900, level: 7 }, 0, { source: 'local' }).name,
  fullName,
  'normalized leaderboard records must preserve VIOLET CHIMAERA'
);

const gameOverSource = readFileSync(new URL('../src/scenes/GameOverScene.js', import.meta.url), 'utf8');
const highscoreSource = readFileSync(new URL('../src/scenes/HighscoreScene.js', import.meta.url), 'utf8');
const cloudSource = readFileSync(new URL('../src/steamCloudPersistence.js', import.meta.url), 'utf8');
const localSource = readFileSync(new URL('../src/api/LocalLeaderboard.js', import.meta.url), 'utf8');

assert.match(gameOverSource, /PUBLIC_PILOT_NAME_MAX_LENGTH/, 'Game Over input paths must use the shared limit');
assert.doesNotMatch(gameOverSource, /PILOT_NAME_MAX_LENGTH\s*=\s*\d+/, 'Game Over must not define a local pilot-name limit');
assert.doesNotMatch(highscoreSource, /score\.name[^\n]*\.slice\(/, 'leaderboard display must not slice stored pilot names');
assert.match(highscoreSource, /fitPilotNameToWidth/, 'leaderboard display must use width fitting with a presentation fallback');
assert.doesNotMatch(cloudSource, /\.slice\(0,\s*14\)/, 'Steam Cloud normalization must not retain the old 14-character cap');
assert.doesNotMatch(localSource, /LOCAL_PILOT_NAME_MAX_LENGTH/, 'local leaderboard must not define a duplicate name limit');

console.log(`[pilot-name-policy] PASS limit=${PUBLIC_PILOT_NAME_MAX_LENGTH} name="${fullName}"`);
