import assert from 'node:assert/strict';
import {
  SCORE_NORMALIZATION_FACTOR,
  SCORE_REWARD_MULTIPLIER,
  SCORE_NORMALIZATION_ROUNDING,
  normalizeLegacyScoreForReset,
  normalizeScoreDelta
} from '../src/shared/ScorePolicy.js';

assert.equal(SCORE_NORMALIZATION_FACTOR, 0.1);
assert.equal(SCORE_REWARD_MULTIPLIER, 1.15);
assert.equal(SCORE_NORMALIZATION_ROUNDING, 'Math.round');
assert.equal(normalizeScoreDelta(100000), 11500);
assert.equal(normalizeLegacyScoreForReset(553006), 55301);
assert.equal(normalizeScoreDelta(500, 2), 115);
assert.equal(normalizeScoreDelta(10), 1);

console.log('[score-normalization] PASS factor=0.1 reward=1.15 rounding=Math.round examples=100000->11500,553006->55301');
