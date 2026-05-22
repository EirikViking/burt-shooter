import assert from 'node:assert/strict';
import {
  SCORE_NORMALIZATION_FACTOR,
  SCORE_NORMALIZATION_ROUNDING,
  normalizeLegacyScoreForReset,
  normalizeScoreDelta
} from '../src/shared/ScorePolicy.js';

assert.equal(SCORE_NORMALIZATION_FACTOR, 0.1);
assert.equal(SCORE_NORMALIZATION_ROUNDING, 'Math.round');
assert.equal(normalizeScoreDelta(100000), 10000);
assert.equal(normalizeLegacyScoreForReset(553006), 55301);
assert.equal(normalizeScoreDelta(500, 2), 100);
assert.equal(normalizeScoreDelta(10), 1);

console.log('[score-normalization] PASS factor=0.1 rounding=Math.round examples=100000->10000,553006->55301');
