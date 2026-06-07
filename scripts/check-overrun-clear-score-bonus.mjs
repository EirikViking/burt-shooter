import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { awardRunClearScoreBonuses } from '../src/game/RunClearScoreBonuses.js';

const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
const gameSource = readFileSync('src/game/Game.js', 'utf8');
const bonusSource = readFileSync('src/game/RunClearScoreBonuses.js', 'utf8');
const gameOverSource = readFileSync('src/scenes/GameOverScene.js', 'utf8');
const steamBridgeSource = readFileSync('electron/steamLeaderboardBridge.cjs', 'utf8');

assert.match(gameSource, /awardRunClearScoreBonuses\(\{ clearBonus = 0, livesBonus = 0 \} = \{\}\)/);
assert.match(gameSource, /return awardRunClearScoreBonuses\(this, \{ clearBonus, livesBonus \}\)/);
assert.match(gameSource, /this\.runClearScoreBonusAward = null/);
assert.match(bonusSource, /game\.addScore\(baseClearBonus, 'runClearBonus'\)/);
assert.match(bonusSource, /game\.addScore\(baseLivesBonus, 'remainingLivesBonus'\)/);
assert.match(bonusSource, /appliedTotal: appliedClearBonus \+ appliedLivesBonus/);
assert.match(playSource, /const markedClear = this\.game\.markRunClear\?\.\('target_sector_clear'\);\s*if \(!markedClear\) return false;\s*this\.game\.awardRunClearScoreBonuses\?\.\(\{ clearBonus, livesBonus \}\);/s);
assert.match(gameOverSource, /this\.finalScore = Number\(this\.game\.score\) \|\| 0/);
assert.match(steamBridgeSource, /nova_swarm_global_score_v2/);

const scoreCalls = [];
const fakeGame = {
  score: 42000,
  runClearScoreBonusAward: null,
  addScore(points, source) {
    const applied = Math.max(0, Math.floor(Number(points) || 0));
    this.score += applied;
    scoreCalls.push({ points, source, applied, scoreAfter: this.score });
    return applied;
  }
};

const firstAward = awardRunClearScoreBonuses(fakeGame, {
  clearBonus: 10000,
  livesBonus: 7500
});
assert.equal(firstAward.alreadyApplied, false);
assert.equal(firstAward.clearBonus, 10000);
assert.equal(firstAward.livesBonus, 7500);
assert.equal(firstAward.appliedClearBonus, 10000);
assert.equal(firstAward.appliedLivesBonus, 7500);
assert.equal(firstAward.appliedTotal, 17500);
assert.equal(firstAward.scoreAfter, 59500);
assert.equal(fakeGame.score, 59500);
assert.deepEqual(scoreCalls.map((call) => call.source), ['runClearBonus', 'remainingLivesBonus']);

const duplicateAward = awardRunClearScoreBonuses(fakeGame, {
  clearBonus: 10000,
  livesBonus: 7500
});
assert.equal(duplicateAward.alreadyApplied, true);
assert.equal(duplicateAward.appliedTotal, 17500);
assert.equal(fakeGame.score, 59500);
assert.equal(scoreCalls.length, 2);

const zeroLivesGame = {
  score: 1000,
  runClearScoreBonusAward: null,
  addScore(points, source) {
    const applied = Math.max(0, Math.floor(Number(points) || 0));
    this.score += applied;
    scoreCalls.push({ points, source, applied, scoreAfter: this.score });
    return applied;
  }
};
const zeroLivesAward = awardRunClearScoreBonuses(zeroLivesGame, {
  clearBonus: 10000,
  livesBonus: 0
});
assert.equal(zeroLivesAward.appliedTotal, 10000);
assert.equal(zeroLivesGame.score, 11000);

console.log('[overrun-clear-score-bonus] PASS clear and spare-hull bonuses are applied to final score exactly once');
