import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gameOver = readFileSync('src/scenes/GameOverScene.js', 'utf8');
const adapter = readFileSync('src/leaderboard/LeaderboardAdapter.js', 'utf8');
const steamProvider = readFileSync('src/leaderboard/SteamLeaderboardProvider.js', 'utf8');
const steamMockCheck = readFileSync('scripts/check-steam-leaderboard-mock.mjs', 'utf8');
const gameOverMotivationCheck = readFileSync('scripts/check-gameover-motivation.mjs', 'utf8');
const releaseHardening = readFileSync('scripts/check-release-hardening.mjs', 'utf8');

assert.ok(gameOver.includes("return 'ONE MORE RUN?';"), 'One More Run slogan title must remain present');
assert.ok(gameOver.includes('this.game.lastLeaderboardResult = null'), 'Game over init must reset stale leaderboard result state');
assert.ok(gameOver.includes('getVisibleLocalPlacementRank()'), 'Result screen must gate local placement through visible leaderboard rank');
assert.ok(gameOver.includes('LOCAL BOARD: NOT IN LOCAL TOP'), 'Outside-visible local ranks must use clear not-in-top copy');
assert.ok(gameOver.includes('const localRank = this.getVisibleLocalPlacementRank();'), 'Runback copy must derive local ranks from visible local placement only');
assert.ok(gameOver.includes('steam_best_unchanged'), 'Steam best-unchanged state must be first-class');
assert.ok(gameOver.includes('THIS RUN DID NOT BEAT YOUR STEAM BEST'), 'Steam best-unchanged copy must show the retained Steam best score');
assert.ok(gameOver.includes('STEAM BOARD: STEAM RANK UPDATING...'), 'Steam pending copy should only be the active updating state');
assert.ok(gameOver.includes('STEAM BOARD: SCORE SUBMITTED'), 'Missing Steam rank should settle to submitted copy, not final rank pending');

assert.ok(adapter.includes('steamPreviousBestScore'), 'Leaderboard adapter must propagate Steam previous-best score');
assert.ok(adapter.includes('steamBestUnchanged'), 'Leaderboard adapter must propagate Steam best-unchanged status');
assert.ok(steamProvider.includes('previousBestScore'), 'Steam provider must compare submissions against previous best');
assert.ok(steamProvider.includes('bestUnchanged: previousBestScore > 0 && score <= previousBestScore'), 'Steam provider must expose keep-best unchanged result');

assert.ok(steamMockCheck.includes('Low Steam score should be marked best unchanged'), 'Steam mock must cover low-score best-unchanged result');
assert.ok(steamMockCheck.includes('Low Steam score reused stale or misleading rank copy'), 'Steam mock must cover stale-rank protection');
assert.ok(steamMockCheck.includes('LOCAL BOARD: NOT IN LOCAL TOP 20'), 'Steam mock must cover outside-visible local rank copy');
assert.ok(steamMockCheck.includes('Steam rank 3 should be treated as Top Three'), 'Steam mock must keep current top-three rank coverage');
assert.ok(steamMockCheck.includes("lastLeaderboardResult?.steamStatus === 'submitted'"), 'Steam mock must still prove autosubmit is called');
assert.ok(gameOverMotivationCheck.includes('lineCount(gameOverState.gameOver?.leaderboardStatus) <= 4'), 'One More Run check must keep a result-screen text-density guard');
assert.ok(releaseHardening.includes("npmStep('result screen leaderboard statuses', 'check:result-screen-status')"), 'release hardening must include the result-screen status guard');

console.log('[result-screen-status] PASS result screen status copy, stale-rank reset, and targeted checks are wired');
