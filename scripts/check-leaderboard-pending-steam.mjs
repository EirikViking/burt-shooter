import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    const text = String(key);
    return this.store.has(text) ? this.store.get(text) : null;
  }

  setItem(key, value) {
    this.store.set(String(key), String(value));
  }

  removeItem(key) {
    this.store.delete(String(key));
  }

  clear() {
    this.store.clear();
  }
}

globalThis.Storage = MemoryStorage;
const localStorage = new MemoryStorage();
let syncCount = 0;

globalThis.window = {
  location: { search: '', origin: 'http://127.0.0.1' },
  localStorage,
  __novaSteamCloudDiagnostics: {
    sync: async () => {
      syncCount += 1;
      return { ok: true };
    }
  }
};

const { installProfileStorageNamespace, getProfileScopedStorageKey } = await import('../src/profile/ProfileStorageNamespace.js');
const {
  LeaderboardAdapter,
  PENDING_STEAM_SUBMISSIONS_KEY
} = await import('../src/leaderboard/LeaderboardAdapter.js');
const {
  STEAM_LEADERBOARD_NAME,
  STEAM_SECTOR_LEADERBOARD_NAME,
  LeaderboardView
} = await import('../src/leaderboard/LeaderboardTypes.js');

function readPendingRaw() {
  return JSON.parse(window.localStorage.getItem(PENDING_STEAM_SUBMISSIONS_KEY) || '{"entries":[]}');
}

function pendingEntries() {
  return readPendingRaw().entries || [];
}

function mockScores() {
  return JSON.parse(window.localStorage.getItem('novaSwarm.mockSteamLeaderboard.v1') || '[]');
}

function assertProfileScopedRawKey(steamId) {
  const scoped = getProfileScopedStorageKey(PENDING_STEAM_SUBMISSIONS_KEY, { steamId });
  assert.ok(localStorage.store.has(scoped), `missing scoped pending key ${scoped}`);
}

installProfileStorageNamespace({ steamId: '76561198000000001', personaName: 'Main Pilot' });
window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = false;

const offlineAdapter = new LeaderboardAdapter();
const globalRun = {
  name: 'ACE',
  playerName: 'ACE',
  score: 120000,
  level: 16,
  levelReached: 16,
  rankIndex: 8,
  submissionId: 'global-offline-1',
  runTimeSeconds: 600,
  kills: 900,
  bossKills: 3,
  wavesCleared: 80
};

const offlineResult = await offlineAdapter.submitScore(globalRun, {
  target: 'steam',
  saveLocal: true,
  name: 'ACE'
});
assert.equal(offlineResult.localStatus, 'saved', 'offline submit should preserve local record');
assert.equal(offlineResult.steamStatus, 'failed', 'offline Steam submit should fail safely');
assert.equal(offlineResult.steamPendingQueued, true, 'offline Steam submit should queue pending retry');
assert.equal(pendingEntries().length, 1, 'pending queue should contain one global submit');
assertProfileScopedRawKey('76561198000000001');

window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
const retryAdapter = new LeaderboardAdapter();
await retryAdapter.refreshAvailability();
const retryResult = await retryAdapter.retryPendingSteamSubmissions({ reason: 'test_restart' });
assert.equal(retryResult.submitted >= 1, true, 'retry should submit queued global score when Steam becomes available');
assert.equal(pendingEntries().length, 0, 'successful retry should clear pending queue');
assert.equal(mockScores().some((entry) => entry.leaderboardName === STEAM_LEADERBOARD_NAME && entry.score === 120000), true, 'mock Steam global should receive queued score');

retryAdapter.enqueuePendingSteamSubmission({ ...globalRun, score: 90000, submissionId: 'worse-global' }, { target: 'global' });
const worseRetry = await retryAdapter.retryPendingSteamSubmissions({ reason: 'worse_score_guard' });
assert.equal(worseRetry.submitted, 1, 'worse pending score is attempted once');
const bestGlobal = mockScores()
  .filter((entry) => entry.leaderboardName === STEAM_LEADERBOARD_NAME && entry.isCurrentPlayer)
  .sort((a, b) => b.score - a.score)[0];
assert.equal(bestGlobal.score, 120000, 'worse pending score must not overwrite better Steam score');
assert.equal(pendingEntries().length, 0, 'best-unchanged Steam response should clear worse pending score');

window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = false;
const sectorOfflineAdapter = new LeaderboardAdapter();
await sectorOfflineAdapter.refreshAvailability();
const sectorRun = {
  name: 'SECTOR ACE',
  playerName: 'SECTOR ACE',
  score: 64000,
  level: 18,
  levelReached: 18,
  startSector: 10,
  sectorStart: 10,
  highestSectorReached: 18,
  finalSector: 18,
  rankIndex: 6,
  submissionId: 'sector-offline-1',
  leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME,
  leaderboardKind: 'sector_start',
  runTimeSeconds: 420,
  bossKills: 2,
  wavesCleared: 32
};
const sectorOffline = await sectorOfflineAdapter.submitSectorStartScore(sectorRun, { name: 'SECTOR ACE' });
assert.equal(sectorOffline.sectorSteamStatus, 'unavailable', 'offline Sector Run should report unavailable');
assert.equal(sectorOffline.sectorSteamPendingQueued, true, 'offline Sector Run should queue Steam retry');
assert.equal(pendingEntries().length, 1, 'pending queue should contain one sector submit');

window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
const sectorRetryAdapter = new LeaderboardAdapter();
await sectorRetryAdapter.refreshAvailability();
const sectorRetry = await sectorRetryAdapter.retryPendingSteamSubmissions({ reason: 'sector_restart' });
assert.equal(sectorRetry.submitted >= 1, true, 'sector retry should submit when Steam returns');
assert.equal(pendingEntries().length, 0, 'sector retry should clear pending queue');
assert.equal(mockScores().some((entry) =>
  entry.leaderboardName === STEAM_SECTOR_LEADERBOARD_NAME &&
  entry.leaderboardKind === 'sector_start' &&
  entry.startSector === 10 &&
  entry.score === 64000
), true, 'mock Steam sector board should receive queued sector score');

installProfileStorageNamespace({ steamId: '76561198000000002', personaName: 'Other Pilot' });
assert.equal(pendingEntries().length, 0, 'pending queue must be isolated for another Steam profile');

window.__novaSteamLeaderboard = {
  async isAvailable() { return true; },
  async getPersonaName() { return 'ACE'; },
  async getTopScores() { throw new Error('forced fetch failure'); },
  async getFriendsScores() { return []; },
  async submitScore() { return { success: true, rank: 1 }; },
  async getPlayerBest() { return null; }
};
delete window.__novaMockSteamLeaderboardBridge;
window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = false;
const failingFetchAdapter = new LeaderboardAdapter();
await failingFetchAdapter.refreshAvailability();
const failedScores = await failingFetchAdapter.getScores(LeaderboardView.GLOBAL, { limit: 10, useCache: false });
assert.equal(failedScores.status, 'failed', 'forced Steam fetch failure should not be treated as empty');
assert.equal(failedScores.message, 'Steam leaderboard unavailable. Local score is saved.');
assert.equal(/No global scores yet/i.test(failedScores.message), false, 'failed fetch must not claim the board is empty');

assert.ok(syncCount > 0, 'pending queue writes should use existing cloud diagnostics sync hook');

console.log('[leaderboard-pending-steam] PASS pending queue, retry, profile isolation, and unavailable state');
