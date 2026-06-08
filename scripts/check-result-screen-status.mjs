import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gameOver = readFileSync('src/scenes/GameOverScene.js', 'utf8');
const adapter = readFileSync('src/leaderboard/LeaderboardAdapter.js', 'utf8');
const steamProvider = readFileSync('src/leaderboard/SteamLeaderboardProvider.js', 'utf8');
const steamMockCheck = readFileSync('scripts/check-steam-leaderboard-mock.mjs', 'utf8');
const gameOverMotivationCheck = readFileSync('scripts/check-gameover-motivation.mjs', 'utf8');
const resultScreenFlowCheck = readFileSync('scripts/check-result-screen-flow.mjs', 'utf8');
const releaseHardening = readFileSync('scripts/check-release-hardening.mjs', 'utf8');

assert.ok(gameOver.includes("return 'ONE MORE RUN?';"), 'One More Run slogan title must remain present');
assert.match(gameOver, /this\.game(?:\)\s*)?\.lastLeaderboardResult\s*=\s*null/, 'Game over init must reset stale leaderboard result state');
assert.ok(gameOver.includes('getVisibleLocalPlacementRank()'), 'Result screen must gate local placement through visible leaderboard rank');
for (const forbidden of ['Steamboard', 'Steam Board', 'Steam board', 'STEAM BOARD']) {
  assert.ok(!gameOver.includes(forbidden), `Result screen copy must not use bad Steam-board term: ${forbidden}`);
}
assert.ok(gameOver.includes('Local: Not in local top'), 'Outside-visible local ranks must use clear not-in-top copy');
assert.ok(gameOver.includes('const localRank = this.getVisibleLocalPlacementRank();'), 'Runback copy must derive local ranks from visible local placement only');
assert.ok(gameOver.includes('steam_best_unchanged'), 'Steam best-unchanged state must be first-class');
assert.ok(gameOver.includes('Best: ${this.formatScoreNumber(best)} | This run: ${this.formatScoreNumber(this.finalScore)}'), 'Steam best-unchanged copy must show retained best and this-run score');
assert.ok(gameOver.includes('Steam: Rank updating...'), 'Steam pending copy should only be the active updating state');
assert.ok(gameOver.includes('Steam: Score submitted'), 'Missing Steam rank should settle to submitted copy, not final rank pending');
assert.ok(gameOver.includes('getRunbackProgressText'), 'One More Run must keep next-rank progress text');
assert.ok(gameOver.includes('getFinalResultScreenLines'), 'One More Run final text must share one final-screen copy source');

assert.ok(adapter.includes('steamPreviousBestScore'), 'Leaderboard adapter must propagate Steam previous-best score');
assert.ok(adapter.includes('steamBestUnchanged'), 'Leaderboard adapter must propagate Steam best-unchanged status');
assert.ok(steamProvider.includes('previousBestScore'), 'Steam provider must compare submissions against previous best');
assert.ok(steamProvider.includes('retainedBestScore'), 'Steam provider must preserve the retained keep-best score after upload');
assert.ok(steamProvider.includes('scoreChangedFalse'), 'Steam provider must respect Steam keep-best scoreChanged=false responses');
assert.ok(steamProvider.includes('responseScore > score ? responseScore : 0'), 'Steam provider must not treat an echoed submitted score as the retained Steam best');
assert.ok(steamProvider.includes('pickBestCurrentPlayerEntry'), 'Steam provider must recover current-player Steam best from downloaded rows when no direct personal-best API exists');

assert.ok(steamMockCheck.includes('Low Steam score should be marked best unchanged'), 'Steam mock must cover low-score best-unchanged result');
assert.ok(steamMockCheck.includes('Best: 87,628') && steamMockCheck.includes('This run: 2,084'), 'Steam mock must cover the exact retained-best unchanged regression');
assert.ok(steamMockCheck.includes('Low Steam score reused stale or misleading rank copy'), 'Steam mock must cover stale-rank protection');
assert.ok(steamMockCheck.includes('Local: Not in local top 20'), 'Steam mock must cover outside-visible local rank copy');
assert.ok(steamMockCheck.includes('Steam rank 3 should get rank-specific global leaderboard celebration copy'), 'Steam mock must keep current top-three rank coverage without visible Top Three heading copy');
assert.ok(steamMockCheck.includes("lastLeaderboardResult?.steamStatus === 'submitted'"), 'Steam mock must still prove autosubmit is called');
assert.ok(resultScreenFlowCheck.includes('score: 25286'), 'Result flow check must cover rank-2 good run');
assert.ok(resultScreenFlowCheck.includes('previous Steam best: 87,628'), 'Result flow check must cover low-score best-unchanged run');
assert.ok(resultScreenFlowCheck.includes('assertNoOverlaps'), 'Result flow check must assert first-render and relayout bounding boxes');
assert.ok(resultScreenFlowCheck.includes('assertNoRetainedHoldOrSummaryText'), 'Result flow check must assert old hold/status/full-summary text cleanup');
assert.ok(gameOverMotivationCheck.includes('lineCount(gameOverState.gameOver?.leaderboardStatus) <= 4'), 'One More Run check must keep a result-screen text-density guard');
assert.ok(releaseHardening.includes("npmStep('result screen leaderboard statuses', 'check:result-screen-status')"), 'release hardening must include the result-screen status guard');
assert.ok(releaseHardening.includes("npmStep('result screen final flow layout', 'check:result-screen-flow')"), 'release hardening must include the result-screen final flow guard');

const originalWindow = globalThis.window;
const { SteamLeaderboardProvider } = await import('../src/leaderboard/SteamLeaderboardProvider.js');
globalThis.window = {
  location: { search: '' },
  __novaSteamLeaderboard: {
    async isAvailable() {
      return true;
    },
    async getPersonaName() {
      return 'STEAM ACE';
    },
    async getFriendsScores() {
      return [
        { playerName: 'STEAM ACE', name: 'STEAM ACE', score: 87628, level: 12, isCurrentPlayer: true, source: 'steam-friends' },
        { playerName: 'ORBIT PAL', score: 24000, level: 6, source: 'steam-friends' }
      ];
    },
    async getTopScores() {
      return [
        { playerName: 'STEAM ACE', name: 'STEAM ACE', score: 87628, level: 12, isCurrentPlayer: true, source: 'steam' }
      ];
    },
    async submitScore(payload = {}) {
      return {
        success: true,
        scoreChanged: false,
        score: payload.score,
        entry: { playerName: 'STEAM ACE', score: payload.score, isCurrentPlayer: true },
        rank: 42
      };
    }
  }
};

const provider = new SteamLeaderboardProvider();
const unchangedResult = await provider.submitScore({ score: 2084, level: 2, levelReached: 2 });
assert.equal(unchangedResult.bestUnchanged, true, 'Steam scoreChanged=false should still mark best unchanged');
assert.equal(unchangedResult.previousBestScore, 87628, 'Steam unchanged result must retain the existing Steam personal best');
assert.equal(unchangedResult.retainedBestScore, 87628, 'Retained Steam best must not fall back to this run');
assert.equal(unchangedResult.response?.score, 2084, 'Test bridge must echo the current run score to cover the bad fallback');
globalThis.window = originalWindow;

console.log('[result-screen-status] PASS result screen status copy, stale-rank reset, and targeted checks are wired');
