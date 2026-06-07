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
assert.match(bonusSource, /function applyExactScoreBonus\(game, amount, source\)/);
assert.doesNotMatch(bonusSource, /game\.addScore\(baseClearBonus/);
assert.doesNotMatch(bonusSource, /game\.addScore\(baseLivesBonus/);
assert.match(bonusSource, /appliedTotal: appliedClearBonus \+ appliedLivesBonus/);
assert.match(playSource, /const markedClear = this\.game\.markRunClear\?\.\('target_sector_clear'\);\s*if \(!markedClear\) return false;\s*this\.game\.awardRunClearScoreBonuses\?\.\(\{ clearBonus, livesBonus \}\);/s);
assert.match(gameOverSource, /this\.finalScore = Number\(this\.game\.score\) \|\| 0/);
assert.match(steamBridgeSource, /nova_swarm_global_score_v2/);

let addScoreCalls = 0;
let liveRankUpdates = 0;
let globalCueUpdates = 0;
const fakeGame = {
  score: 42000,
  runClearScoreBonusAward: null,
  scoreMultiplier: 2,
  scoreBreakdown: {
    baseScore: 42000,
    enemyScore: 0,
    waveClearBonus: 0,
    sectorClearBonus: 0,
    bossBonus: 0,
    bossSpeedBonus: 0,
    noHitBonus: 0,
    discoveryBonus: 0,
    dangerMultiplierBonus: 0,
    remainingLivesBonus: 0,
    runClearBonus: 0,
    pilotXpGained: 0,
    finalScore: 42000
  },
  createEmptyScoreBreakdown() {
    return {
      baseScore: 0,
      remainingLivesBonus: 0,
      runClearBonus: 0,
      finalScore: 0
    };
  },
  addScore() {
    addScoreCalls += 1;
    throw new Error('run clear bonuses must not use multiplier-aware addScore');
  },
  updateLiveRunRank() {
    liveRankUpdates += 1;
  },
  updateGlobalLeaderboardVoiceCues() {
    globalCueUpdates += 1;
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
assert.equal(fakeGame.scoreBreakdown.runClearBonus, 10000);
assert.equal(fakeGame.scoreBreakdown.remainingLivesBonus, 7500);
assert.equal(fakeGame.scoreBreakdown.finalScore, 59500);
assert.equal(addScoreCalls, 0);
assert.ok(liveRankUpdates > 0, 'live rank preview should be refreshed after immediate score mutation');
assert.ok(globalCueUpdates > 0, 'leaderboard voice cue state should be refreshed after immediate score mutation');

const duplicateAward = awardRunClearScoreBonuses(fakeGame, {
  clearBonus: 10000,
  livesBonus: 7500
});
assert.equal(duplicateAward.alreadyApplied, true);
assert.equal(duplicateAward.appliedTotal, 17500);
assert.equal(fakeGame.score, 59500);
assert.equal(addScoreCalls, 0);

const zeroLivesGame = {
  score: 1000,
  runClearScoreBonusAward: null,
  scoreBreakdown: {
    baseScore: 1000,
    remainingLivesBonus: 0,
    runClearBonus: 0,
    finalScore: 1000
  },
  createEmptyScoreBreakdown() {
    return {
      baseScore: 0,
      remainingLivesBonus: 0,
      runClearBonus: 0,
      finalScore: 0
    };
  },
  addScore() {
    throw new Error('zero-lives clear bonus must still use exact score mutation');
  }
};
const zeroLivesAward = awardRunClearScoreBonuses(zeroLivesGame, {
  clearBonus: 10000,
  livesBonus: 0
});
assert.equal(zeroLivesAward.appliedTotal, 10000);
assert.equal(zeroLivesGame.score, 11000);

console.log('[overrun-clear-score-bonus] PASS clear and spare-hull bonuses are applied immediately and exactly once');
