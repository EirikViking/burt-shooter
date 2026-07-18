import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLOBAL_SCORE_TUNING_MULTIPLIER } from '../src/config/ScoreTuning.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameSource = fs.readFileSync(path.join(root, 'src', 'game', 'Game.js'), 'utf8');

assert.equal(GLOBAL_SCORE_TUNING_MULTIPLIER, 1.15, 'global score tuning should add exactly 15 percent');
assert.match(
  gameSource,
  /GLOBAL_SCORE_TUNING_MULTIPLIER \* gameMult \* playerMult \* pressureMult/,
  'all score awards should include the global tuning multiplier'
);
assert.match(
  gameSource,
  /GLOBAL_SCORE_TUNING_MULTIPLIER \* gameMult \* playerMult\)/,
  'danger bonus accounting should include the global tuning multiplier in its baseline'
);

console.log('[global-score-tuning] PASS exact 15% multiplier and score-breakdown accounting');
