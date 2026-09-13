import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { STEAM_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const gameOver = readFileSync('src/scenes/GameOverScene.js', 'utf8');
const steamProvider = readFileSync('src/leaderboard/SteamLeaderboardProvider.js', 'utf8');
const mockCheck = readFileSync('scripts/check-steam-leaderboard-mock.mjs', 'utf8');
const bridge = readFileSync('electron/steamLeaderboardBridge.cjs', 'utf8');

assert.equal(
  STEAM_LEADERBOARD_NAME,
  'nova_swarm_global_score_v2',
  'Steam leaderboard name must stay exactly nova_swarm_global_score_v2'
);
assert.ok(
  bridge.includes("const DEFAULT_STEAM_LEADERBOARD_NAME = 'nova_swarm_global_score_v2';"),
  'Electron Steam bridge default leaderboard name changed'
);
assert.ok(
  steamProvider.includes('this.leaderboardName = STEAM_LEADERBOARD_NAME;'),
  'Steam provider should use the shared leaderboard constant'
);
assert.ok(
  gameOver.includes("this.enterRunbackStage('steam_submitting');") &&
    gameOver.includes('void this.submitSteamScore();') &&
    gameOver.includes('async submitSteamScore()') &&
    gameOver.includes("target: 'steam'"),
  'game over Steam mode must keep automatic score submission'
);
assert.ok(
  gameOver.includes('if (!this.steamSubmissionMode || !this.isRankedRun || this.isSubmitting) return;'),
  'Steam autosubmit must remain ranked-run guarded'
);
assert.ok(
    mockCheck.includes('window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true') &&
    mockCheck.includes("lastLeaderboardResult?.steamStatus === 'submitted'") &&
    mockCheck.includes('Steam auto-submit flow exposed manual submit copy') &&
    mockCheck.includes('Steam mock exposed manual name entry') &&
    mockCheck.includes('Steam result should expose immediate restart without a Continue gate') &&
    mockCheck.includes('Steam runback reused full or stale leaderboard copy') &&
    mockCheck.includes('Final runback did not report exact local placement') &&
    mockCheck.includes('Steam mock did not report exact global placement') &&
    mockCheck.includes('Final runback did not report exact Steam placement') &&
    mockCheck.includes('steamRank: 3') &&
    mockCheck.includes('steamRank: 4') &&
    mockCheck.includes('steamRank: null') &&
    mockCheck.includes('Steam rank 3 should get rank-specific global leaderboard celebration copy') &&
    mockCheck.includes('Steam rank 4 should be heroic Top 10 without Top Three copy') &&
    mockCheck.includes('Missing Steam rank should clear stale Top Three placement without final rank pending copy') &&
    mockCheck.includes('Low Steam score should be marked best unchanged') &&
    mockCheck.includes('Best: 87,628') &&
    mockCheck.includes('This run: 2,084') &&
    mockCheck.includes('Low Steam result should expose immediate restart without a Continue gate') &&
    mockCheck.includes('Low Steam runback reused full or stale leaderboard copy') &&
    mockCheck.includes('Local: Not in local top 50') &&
    mockCheck.includes('Final low-score runback should not show an outside-visible local placement'),
  'Steam leaderboard mock must cover autosubmit without manual name entry'
);
assert.ok(
  !mockCheck.includes('--submit') && !mockCheck.includes('probe-steam-leaderboard-live'),
  'mock check must not submit real Steam scores'
);

console.log('[release-hardening-steam-autosubmit] PASS autosubmit mock guard, leaderboard name, and no dummy live submit');
