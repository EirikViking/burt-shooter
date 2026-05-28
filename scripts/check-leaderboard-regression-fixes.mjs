import assert from 'node:assert/strict';

globalThis.window ??= {
  location: { origin: 'http://localhost', search: '' },
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout
};
globalThis.document ??= {
  createElement() {
    return {
      style: {},
      addEventListener() {},
      removeEventListener() {},
      focus() {},
      blur() {},
      remove() {}
    };
  },
  body: { appendChild() {} },
  getElementById() { return null; }
};
globalThis.localStorage ??= {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};
globalThis.navigator ??= { getGamepads: () => [] };
globalThis.Audio ??= class {
  constructor() {
    this.volume = 1;
    this.loop = false;
    this.paused = true;
    this.currentTime = 0;
  }
  addEventListener() {}
  removeEventListener() {}
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
};

const { LeaderboardAdapter } = await import('../src/leaderboard/LeaderboardAdapter.js');
const { normalizeLeaderboardEntry } = await import('../src/leaderboard/LeaderboardTypes.js');
const { GameOverScene } = await import('../src/scenes/GameOverScene.js');

const unknownLevel = normalizeLeaderboardEntry({
  playerName: 'STEAM ACE',
  score: 39212,
  rank: 4,
  details: [],
  source: 'steam'
});
assert.equal(unknownLevel.level, null, 'Steam rows without score details must not be displayed as level 1');
assert.equal(unknownLevel.levelKnown, false, 'Steam rows without score details must expose unknown level state');

const detailedLevel = normalizeLeaderboardEntry({
  playerName: 'STEAM ACE',
  score: 39212,
  rank: 4,
  details: [7, 2, 180, 100, 1, 8],
  source: 'steam'
});
assert.equal(detailedLevel.level, 7, 'Steam details[0] must be used as the leaderboard level when present');
assert.equal(detailedLevel.levelKnown, true, 'Steam rows with score details must expose known level state');

const fakeScene = {
  isRankedRun: true,
  game: {
    runMode: 'ranked',
    isDebugRun: false
  },
  steamSubmissionMode: true,
  finalScore: 39212,
  unlockConfirmedLeaderboardAchievements() {
    throw new Error('Unknown Steam rank must not unlock global leaderboard achievements');
  }
};
const ranklessSteamResult = {
  globalStatus: 'submitted',
  globalProvider: 'steam',
  steamRank: null,
  rank: null,
  globalRank: null
};
const placement = await GameOverScene.prototype.confirmGlobalLeaderboardAchievements.call(fakeScene, ranklessSteamResult);
assert.equal(placement.placement, null, 'Rankless Steam submit should keep placement null');
assert.equal(placement.qualified, false, 'Rankless Steam submit must not be marked as a confirmed global placement');

async function adapterWithFriends(entries) {
  const adapter = new LeaderboardAdapter();
  adapter.steamProvider = {
    async isAvailable() {
      return true;
    },
    async getFriendsScores() {
      return { status: entries.length ? 'available' : 'empty', source: 'steam-friends', entries };
    }
  };
  adapter.cloudProvider = {
    async isAvailable() {
      return false;
    }
  };
  adapter.localProvider = {
    async isAvailable() {
      return true;
    }
  };
  await adapter.refreshAvailability();
  return adapter;
}

const noFriendAdapter = await adapterWithFriends([
  { playerName: 'STEAM ACE', score: 1000, rank: 1, isCurrentPlayer: true, level: 3 }
]);
assert.equal(noFriendAdapter.availability.steamFriends, false, 'Friends tab must stay hidden when Steam only returns the current player');
assert.deepEqual(noFriendAdapter.getTabs().map((tab) => tab.id), ['global', 'local'], 'Friends tab must not render without friend-owned game rows');

const friendAdapter = await adapterWithFriends([
  { playerName: 'STEAM ACE', score: 1000, rank: 1, isCurrentPlayer: true, level: 3 },
  { playerName: 'ORBIT PAL', score: 900, rank: 2, isCurrentPlayer: false, level: 2 }
]);
assert.equal(friendAdapter.availability.steamFriends, true, 'Friends tab should appear when Steam returns at least one friend score');
assert.deepEqual(friendAdapter.getTabs().map((tab) => tab.id), ['global', 'friends', 'local'], 'Friends tab order changed unexpectedly');

console.log(JSON.stringify({
  status: 'passed',
  checks: {
    noNullGlobalPlacement: true,
    unknownSteamLevelNotLevelOne: true,
    friendsTabRequiresFriendRows: true
  }
}, null, 2));
