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
  const state = { postCount: 0, lastPost: null };
  globalThis.fetch = async (url, options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    if (!String(url).includes('/api/highscores')) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }
    if (method === 'POST') {
      state.postCount += 1;
      state.lastPost = JSON.parse(String(options.body || '{}'));
      return new Response(JSON.stringify({ success: true, id: 100 + state.postCount, rank_index: 3 }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify([
      { id: 1, name: 'ORB', score: 9000, levelReached: 4, rank_index: 7 },
      { id: 2, name: 'NOVA', score: 7000, metadata: { level: 3 }, rank_index: 5 }
    ]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  return state;
}

installWindow();
installCloudFetch();

const { createLeaderboardAdapter } = await import('../src/leaderboard/LeaderboardAdapter.js');
const {
  STEAM_LEADERBOARD_NAME,
  estimateLeaderboardLevelFromScore,
  getPilotNameValidation,
  normalizeLeaderboardEntry,
  toPublicPilotName
} = await import('../src/leaderboard/LeaderboardTypes.js');
const { LOCAL_LEADERBOARD_KEY, LocalLeaderboard } = await import('../src/api/LocalLeaderboard.js');

assert.equal(normalizeLeaderboardEntry({ name: 'META', score: 100, metadata: { level: 9 } })?.level, 9);
assert.equal(normalizeLeaderboardEntry({ name: 'DETAILS', score: 100, details: [10] })?.level, 10);
assert.equal(normalizeLeaderboardEntry({ name: 'REACHED', score: 100, levelReached: 11 })?.level, 11);
assert.equal(estimateLeaderboardLevelFromScore(69212), 14);
assert.equal(normalizeLeaderboardEntry({ name: 'STEAMOLD', score: 69212 })?.level, 14, 'legacy Steam rows without details must not display as LV1');
assert.equal(normalizeLeaderboardEntry({ name: 'DETAILSWIN', score: 69212, details: [6] })?.level, 6, 'encoded Steam details must beat score fallback');
assert.equal(STEAM_LEADERBOARD_NAME, 'nova_swarm_global_score_v2', 'Steam default leaderboard must stay on the metadata-preserving v2 board');

async function checkWebRuntime() {
  const win = installWindow();
  const cloudState = installCloudFetch();
  const adapter = createLeaderboardAdapter();
  await adapter.refreshAvailability();
  assert.equal(adapter.isSteamAvailable(), false, 'web runtime should not use Steam without a bridge');
  assert.deepEqual(adapter.getTabs().map(tab => tab.id), ['global', 'local']);

  const global = await adapter.getScores('global', { useCache: false });
  assert.equal(global.source, 'cloud');
  assert.equal(global.entries.length, 2);
  assert.equal(global.entries[0].playerName, 'ORB');
  assert.equal(global.entries[0].level, 4);
  assert.equal(global.entries[1].level, 3);

  win.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify([
    { name: 'OLDMETA', score: 3210, metadata: { level: 8 }, timestamp: new Date().toISOString() }
  ]));
  assert.equal(LocalLeaderboard.getScores(1)[0]?.level, 8, 'local leaderboard must preserve metadata.level from stored entries');

  const localSubmit = await adapter.submitScore({
    score: 4321,
    level: 2,
    rankIndex: 4,
    playerName: 'WEB ACE',
    submissionId: 'web-local-1'
  }, { target: 'local', saveLocal: true, name: 'WEB ACE' });
  assert.equal(localSubmit.localStatus, 'saved');
  assert.equal(win.localStorage.getItem('novaSwarm.localLeaderboard.v2')?.includes('WEB ACE'), true);

  assert.equal(getPilotNameValidation('Eirik').valid, true, 'Eirik should be a valid pilot name');
  assert.equal(toPublicPilotName('Eirik', 553006), 'EIRIK', 'Eirik must not fall back to Pilot06');
  const eirikRun = {
    score: 55301,
    level: 11,
    rankIndex: 6,
    playerName: 'Eirik',
    submissionId: 'eirik-name-regression'
  };
  const eirikLocal = await adapter.submitScore(eirikRun, { target: 'local', saveLocal: true, name: 'Eirik' });
  assert.equal(eirikLocal.localEntry.name, 'EIRIK');
  assert.equal(win.localStorage.getItem('novaSwarm.localLeaderboard.v2')?.includes('PILOT06'), false);
  await adapter.submitScore(eirikRun, { target: 'cloud', saveLocal: false, name: 'Eirik' });
  assert.equal(cloudState.lastPost.name, 'EIRIK');
  assert.equal(cloudState.lastPost.level, 11);
}

async function checkMockSteamRuntime() {
  const win = installWindow({ search: '?mockSteamLeaderboard=1', mockSteam: true });
  installCloudFetch();
  const adapter = createLeaderboardAdapter();
  await adapter.refreshAvailability();
  assert.equal(adapter.isSteamAvailable(), true, 'mock Steam runtime should be available');
  assert.deepEqual(adapter.getTabs().map(tab => tab.id), ['global', 'local'], 'Steam Friends tab should stay hidden without friend entries');

  win.localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify([
    {
      playerName: 'ORBIT FRIEND',
      name: 'ORBIT FRIEND',
      score: 10000,
      level: 4,
      rankIndex: 4,
      source: 'steam-friends',
      timestamp: '2026-02-01T00:00:00.000Z'
    }
  ]));
  await adapter.refreshAvailability();
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
  assert.equal(global.entries[0].level, 5);
  assert.equal(friends.entries[0].playerName, 'STEAM ACE');
  assert.equal(win.localStorage.getItem('novaSwarm.localLeaderboard.v2')?.includes('STEAM ACE'), true);
}

async function checkDesktopLocalPersistenceRuntime() {
  const desktopScores = [{ name: 'TYSKER', score: 2028, level: 2, rankIndex: 1, submissionId: 'desktop-seed' }];
  globalThis.fetch = async (url, options = {}) => {
    const parsedUrl = new URL(String(url));
    assert.equal(parsedUrl.pathname, '/api/highscores');
    const method = String(options.method || 'GET').toUpperCase();
    if (method === 'POST') {
      const entry = JSON.parse(String(options.body || '{}'));
      const saved = {
        ...entry,
        name: String(entry.name || 'PILOT').toUpperCase(),
        timestamp: new Date().toISOString(),
        local: true
      };
      desktopScores.push(saved);
      desktopScores.sort((a, b) => (b.score || 0) - (a.score || 0));
      return new Response(JSON.stringify({
        ok: true,
        score: saved,
        placement: desktopScores.findIndex(score => score === saved) + 1,
        duplicate: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const limit = Number(parsedUrl.searchParams.get('limit')) || 20;
    return new Response(JSON.stringify(desktopScores.slice(0, limit)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const firstWindow = installWindow({ search: '?desktop=1', origin: 'http://127.0.0.1:41001' });
  const firstAdapter = createLeaderboardAdapter();
  await firstAdapter.refreshAvailability();
  const submitted = await firstAdapter.submitScore({
    score: 56,
    level: 7,
    rankIndex: 0,
    playerName: 'evileirik',
    submissionId: 'evileirik-local-restart'
  }, { target: 'local', saveLocal: true, name: 'evileirik' });
  assert.equal(submitted.localStatus, 'saved');
  assert.equal(desktopScores.some(entry => entry.name === 'EVILEIRIK' && entry.score === 56), true);
  assert.equal(desktopScores.some(entry => entry.name === 'EVILEIRIK' && entry.score === 56 && entry.level === 7), true);
  assert.equal(firstWindow.localStorage.getItem('novaSwarm.localLeaderboard.v2')?.includes('EVILEIRIK'), true);

  const secondWindow = installWindow({ search: '?desktop=1', origin: 'http://127.0.0.1:41099' });
  const secondAdapter = createLeaderboardAdapter();
  await secondAdapter.refreshAvailability();
  const local = await secondAdapter.getScores('local', { useCache: false });
  assert.equal(local.source, 'local');
  assert.equal(local.entries.some(entry => entry.playerName === 'EVILEIRIK' && entry.score === 56), true);
  assert.equal(local.entries.some(entry => entry.playerName === 'EVILEIRIK' && entry.score === 56 && entry.level === 7), true);
  assert.equal(secondWindow.localStorage.getItem('novaSwarm.localLeaderboard.v2')?.includes('EVILEIRIK'), true);
}

await checkWebRuntime();
await checkMockSteamRuntime();
await checkDesktopLocalPersistenceRuntime();
console.log('[leaderboard-adapter] PASS web cloud/local, mock Steam global/friends/local, fallback-safe provider selection');
