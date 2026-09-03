import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  PUBLIC_PILOT_NAME_MAX_LENGTH,
  getPilotNameValidation,
  normalizeLeaderboardEntry,
  sanitizePilotName,
  toPublicPilotName
} from '../src/leaderboard/LeaderboardTypes.js';
import { sanitizeLocalPilotName } from '../src/api/LocalLeaderboard.js';
import { onRequestGet, onRequestPost } from '../functions/api/highscores.js';

const fullName = 'VIOLET CHIMAERA';
const exactLimitName = 'EIGHTEEN CHAR NAME';
const overLimitName = `${exactLimitName} EXTRA`;

assert.equal(PUBLIC_PILOT_NAME_MAX_LENGTH, 18, 'public pilot-name limit must remain exactly 18');
assert.equal(exactLimitName.length, PUBLIC_PILOT_NAME_MAX_LENGTH, 'exact-limit fixture must be 18 characters');
assert.equal(sanitizePilotName(exactLimitName), exactLimitName, '18-character names must remain complete');
assert.equal(sanitizePilotName(fullName), fullName, 'shared sanitization must preserve VIOLET CHIMAERA');
assert.equal(toPublicPilotName(fullName, 0), fullName, 'public submission name must preserve VIOLET CHIMAERA');
assert.equal(sanitizeLocalPilotName(fullName, 0), fullName, 'local storage name must preserve VIOLET CHIMAERA');
assert.equal(sanitizePilotName(overLimitName), exactLimitName, 'names longer than 18 must truncate at the shared limit');
assert.equal(sanitizePilotName('  ace-<pilot>_42🚀  '), 'ACEPILOT42', 'unsafe characters must still be removed');
assert.deepEqual(
  getPilotNameValidation('F!I@T#T$E'),
  { valid: false, publicName: 'FITTE', reason: 'blocked' },
  'blocked names must remain unavailable after unsafe characters are removed'
);
assert.equal(
  normalizeLeaderboardEntry({ name: fullName, score: 12900, level: 7 }, 0, { source: 'local' }).name,
  fullName,
  'normalized leaderboard records must preserve VIOLET CHIMAERA'
);

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async all() {
    if (this.sql.startsWith('PRAGMA table_info')) {
      return { results: [{ name: 'rank_index' }, { name: 'submission_id' }] };
    }
    if (this.sql.includes('FROM game_highscores')) {
      return {
        results: [...this.db.rows]
          .sort((left, right) => right.score - left.score || right.created_at.localeCompare(left.created_at))
          .slice(0, 20)
      };
    }
    throw new Error(`Unexpected all query: ${this.sql}`);
  }

  async first() {
    if (!this.sql.includes('WHERE submission_id = ?')) {
      throw new Error(`Unexpected first query: ${this.sql}`);
    }
    return this.db.rows.find(entry => entry.submission_id === this.values[0]) || null;
  }

  async run() {
    if (!this.sql.startsWith('INSERT INTO game_highscores')) {
      throw new Error(`Unexpected run query: ${this.sql}`);
    }
    const [name, score, level, rank_index] = this.values;
    const includesSubmissionId = this.sql.includes('submission_id');
    const row = {
      id: this.db.nextId++,
      name,
      score,
      level,
      rank_index,
      submission_id: includesSubmissionId ? this.values[4] : null,
      created_at: this.values[includesSubmissionId ? 5 : 4]
    };
    this.db.rows.push(row);
    return { meta: { last_row_id: row.id, changes: 1 } };
  }
}

class FakeDatabase {
  constructor() {
    this.nextId = 2;
    this.rows = [{
      id: 1,
      name: 'LEGACY ACE',
      score: 100,
      level: 2,
      rank_index: 0,
      submission_id: null,
      created_at: '2026-01-01T00:00:00.000Z'
    }];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

const db = new FakeDatabase();

async function submit(name, score, submissionId) {
  return onRequestPost({
    env: { DB: db },
    request: new Request('https://example.test/api/highscores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, level: 7, submissionId })
    })
  });
}

assert.equal((await submit(fullName, 12900, 'violet')).status, 201, 'web submission must accept VIOLET CHIMAERA');
assert.equal((await submit(exactLimitName, 12800, 'exact-limit')).status, 201, 'web submission must accept 18 characters');
assert.equal((await submit(overLimitName, 12700, 'over-limit')).status, 201, 'web submission must consistently truncate over-limit names');
assert.equal((await submit('  ace-<pilot>_42🚀  ', 12600, 'unsafe')).status, 201, 'web submission must sanitize unsafe input');

const blockedResponse = await submit('F!I@T#T$E', 12500, 'blocked');
assert.equal(blockedResponse.status, 400, 'web submission must reject blocked sanitized names');
assert.equal(db.rows.find(entry => entry.submission_id === 'violet')?.name, fullName, 'web storage must preserve VIOLET CHIMAERA');
assert.equal(db.rows.find(entry => entry.submission_id === 'exact-limit')?.name, exactLimitName, 'web storage must preserve 18 characters');
assert.equal(db.rows.find(entry => entry.submission_id === 'over-limit')?.name, exactLimitName, 'web storage must use the shared truncation');
assert.equal(db.rows.find(entry => entry.submission_id === 'unsafe')?.name, 'ACEPILOT42', 'web storage must contain sanitized input');

const getResponse = await onRequestGet({ env: { DB: db } });
assert.equal(getResponse.status, 200, 'normal leaderboard retrieval must succeed');
const retrieved = await getResponse.json();
assert.equal(retrieved.find(entry => entry.id === 1)?.name, 'LEGACY ACE', 'existing leaderboard identities must remain unchanged');
assert.equal(retrieved.find(entry => entry.name === fullName)?.name, fullName, 'retrieval must preserve VIOLET CHIMAERA');
assert.ok(retrieved.every(entry => entry.name.length <= PUBLIC_PILOT_NAME_MAX_LENGTH), 'retrieval must enforce the shared limit');

const sourcePaths = [
  '../functions/api/highscores.js',
  '../electron/main.cjs',
  '../electron/steamCloudSave.cjs',
  '../electron/steamLeaderboardBridge.cjs',
  '../src/scenes/GameOverScene.js',
  '../src/scenes/HighscoreScene.js',
  '../src/steamCloudPersistence.js',
  '../src/api/LocalLeaderboard.js'
];
const sources = Object.fromEntries(sourcePaths.map(relativePath => [
  relativePath,
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')
]));

assert.match(sources['../functions/api/highscores.js'], /pilotNamePolicy\.cjs/, 'web API must consume the shared policy');
assert.match(sources['../electron/main.cjs'], /pilotNamePolicy\.cjs/, 'offline endpoint must consume the shared policy');
assert.match(sources['../electron/steamCloudSave.cjs'], /pilotNamePolicy\.cjs/, 'desktop persistence must consume the shared policy');
assert.match(sources['../electron/steamLeaderboardBridge.cjs'], /pilotNamePolicy\.cjs/, 'Steam fallback naming must consume the shared limit');
assert.match(sources['../src/scenes/GameOverScene.js'], /PUBLIC_PILOT_NAME_MAX_LENGTH/, 'Game Over input paths must use the shared limit');
assert.doesNotMatch(sources['../src/scenes/GameOverScene.js'], /PILOT_NAME_MAX_LENGTH\s*=\s*\d+/, 'Game Over must not define a local pilot-name limit');
assert.doesNotMatch(sources['../src/scenes/HighscoreScene.js'], /score\.name[^\n]*\.slice\(/, 'leaderboard display must not slice stored pilot names');
assert.match(sources['../src/scenes/HighscoreScene.js'], /fitPilotNameToWidth/, 'leaderboard display must use width fitting with a presentation fallback');
assert.doesNotMatch(Object.values(sources).join('\n'), /slice\(0,\s*14\)|PILOT_NAME_MAX_LENGTH\s*=\s*14/, 'pilot-name paths must not retain a 14-character policy');
assert.doesNotMatch(sources['../src/api/LocalLeaderboard.js'], /LOCAL_PILOT_NAME_MAX_LENGTH/, 'local leaderboard must not define a duplicate name limit');

console.log(`[pilot-name-policy] PASS limit=${PUBLIC_PILOT_NAME_MAX_LENGTH} submissions=${db.rows.length - 1} retrieval=${retrieved.length}`);
