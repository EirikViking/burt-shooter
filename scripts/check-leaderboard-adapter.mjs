import assert from 'node:assert/strict';

function createStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

function installWindow({ search = '', origin = 'https://novaswarm.tinyfoundry.app', mockSteam = false } = {}) {
  const storage = createStorage();
  globalThis.window = {
    location: { search, origin },
    localStorage: storage,
    __NOVA_SWARM_MOCK_STEAM_LEADERBOARD__: mockSteam,
    __novaMockSteamPersonaName: 'STEAM ACE'
  };
  globalThis.localStorage = storage;
  return globalThis.window;
}

function installCloudFetch() {
  let postCount = 0;
  globalThis.fetch = async (url, options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    if (!String(url).includes('/api/highscores')) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }
    if (method === 'POST') {
      postCount += 1;
      return new Response(JSON.stringify({ success: true, id: 100 + postCount, rank_index: 3 }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify([
      { id: 1, name: 'ORB', score: 9000, level: 4, rank_index: 7 },
      { id: 2, name: 'NOVA', score: 7000, level: 3, rank_index: 5 }
    ]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

installWindow();
installCloudFetch();

const { createLeaderboardAdapter } = await import('../src/leaderboard/LeaderboardAdapter.js');

async function checkWebRuntime() {
  const win = installWindow();
  installCloudFetch();
  const adapter = createLeaderboardAdapter();
  await adapter.refreshAvailability();
  assert.equal(adapter.isSteamAvailable(), false, 'web runtime should not use Steam without a bridge');
  assert.deepEqual(adapter.getTabs().map(tab => tab.id), ['global', 'local']);

  const global = await adapter.getScores('global', { useCache: false });
  assert.equal(global.source, 'cloud');
  assert.equal(global.entries.length, 2);
  assert.equal(global.entries[0].playerName, 'ORB');

  const localSubmit = await adapter.submitScore({
    score: 4321,
    level: 2,
    rankIndex: 4,
    playerName: 'WEB ACE',
    submissionId: 'web-local-1'
  }, { target: 'local', saveLocal: true, name: 'WEB ACE' });
  assert.equal(localSubmit.localStatus, 'saved');
  assert.equal(win.localStorage.getItem('novaSwarm.localLeaderboard.v1')?.includes('WEB ACE'), true);
}

async function checkMockSteamRuntime() {
  const win = installWindow({ search: '?mockSteamLeaderboard=1', mockSteam: true });
  installCloudFetch();
  const adapter = createLeaderboardAdapter();
  await adapter.refreshAvailability();
  assert.equal(adapter.isSteamAvailable(), true, 'mock Steam runtime should be available');
  assert.deepEqual(adapter.getTabs().map(tab => tab.id), ['global', 'friends', 'local']);

  const result = await adapter.submitScore({
    score: 12345,
    level: 5,
    rankIndex: 8,
    shipId: 'nova_sparrow',
    shipNumericId: 1,
    shipName: 'Nova Sparrow',
    runTimeSeconds: 321,
    kills: 55,
    bossKills: 2,
    wavesCleared: 14,
    submissionId: 'steam-run-1'
  }, { target: 'steam', saveLocal: true });
  assert.equal(result.steamStatus, 'submitted');
  assert.equal(result.localStatus, 'saved');
  assert.equal(result.name, 'STEAM ACE');

  const global = await adapter.getScores('global', { useCache: false });
  const friends = await adapter.getScores('friends', { useCache: false });
  assert.equal(global.source, 'steam');
  assert.equal(friends.source, 'steam-friends');
  assert.equal(global.entries[0].score, 12345);
  assert.equal(friends.entries[0].playerName, 'STEAM ACE');
  assert.equal(win.localStorage.getItem('novaSwarm.localLeaderboard.v1')?.includes('STEAM ACE'), true);
}

await checkWebRuntime();
await checkMockSteamRuntime();
console.log('[leaderboard-adapter] PASS web cloud/local, mock Steam global/friends/local, fallback-safe provider selection');
