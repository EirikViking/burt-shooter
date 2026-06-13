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
  STEAM_SECTOR_LEADERBOARD_NAME,
  createRunResultFromGame,
  encodeSteamLeaderboardDetails,
  encodeSteamSectorLeaderboardDetails,
  estimateLeaderboardLevelFromScore,
  getPilotNameValidation,
  normalizeLeaderboardEntry,
  readLeaderboardDetails,
  toPublicPilotName
} = await import('../src/leaderboard/LeaderboardTypes.js');
const { LOCAL_LEADERBOARD_KEY, LocalLeaderboard } = await import('../src/api/LocalLeaderboard.js');

assert.equal(normalizeLeaderboardEntry({ name: 'META', score: 100, metadata: { level: 9 } })?.level, 9);
assert.equal(normalizeLeaderboardEntry({ name: 'DETAILS', score: 100, details: [10] })?.level, 10);
assert.equal(normalizeLeaderboardEntry({ name: 'REACHED', score: 100, levelReached: 11 })?.level, 11);
assert.equal(estimateLeaderboardLevelFromScore(69212), 14);
assert.equal(normalizeLeaderboardEntry({ name: 'STEAMOLD', score: 69212 })?.level, 14, 'legacy Steam rows without details must not display as LV1');
assert.equal(normalizeLeaderboardEntry({ name: 'STEAMOLD', score: 69212 })?.levelSource, 'score_estimate', 'legacy rows without encoded details must be flagged as estimates');
assert.equal(normalizeLeaderboardEntry({ name: 'DETAILSWIN', score: 69212, details: [6] })?.level, 6, 'encoded Steam details must beat score fallback');
assert.equal(normalizeLeaderboardEntry({ name: 'DETAILSWIN', score: 69212, details: [6] })?.levelSource, 'encoded', 'encoded details must be marked as trusted level data');
assert.deepEqual(readLeaderboardDetails({ details: '0x0a00000018000000f30100003d020000' }).slice(0, 4), [10, 24, 499, 573], 'Steamworks hex details should decode little-endian int32 values');
assert.equal(normalizeLeaderboardEntry({ source: 'steam', playerName: 'EVILEIRIK', score: 41413, level: 1, levelReached: 1, details: '0x0a00000018000000f30100003d020000' })?.level, 10, 'Steam details must beat stale LV1 row metadata');
assert.equal(normalizeLeaderboardEntry({ source: 'steam', playerName: 'EVILEIRIK', score: 41413, level: 1, levelReached: 1 })?.level, 9, 'Steam LV1 fallback without details should estimate from score instead of showing LV1');
assert.equal(normalizeLeaderboardEntry({ source: 'steam', playerName: 'EVILEIRIK', score: 41413, level: 1, levelReached: 1 })?.levelSource, 'score_estimate', 'Steam rows without details must not mark fallback levels as encoded');
assert.equal(STEAM_LEADERBOARD_NAME, 'nova_swarm_global_score_v2', 'Steam default leaderboard must stay on the metadata-preserving v2 board');
assert.equal(STEAM_SECTOR_LEADERBOARD_NAME, 'nova_swarm_sector_start_score_v1', 'Steam sector challenge leaderboard must use the Steamworks-created board');
const encodedRun = createRunResultFromGame({ score: 12345, level: 12, rankIndex: 4 }, { levelReached: 9 });
assert.equal(encodedRun.level, 9, 'run result should prefer explicit levelReached');
assert.equal(encodedRun.levelReached, 9, 'run result should carry levelReached alias');
assert.equal(encodeSteamLeaderboardDetails(encodedRun)[0], 9, 'Steam details must encode reached level in slot 0');
assert.deepEqual(
  encodeSteamSectorLeaderboardDetails({ startSector: 20, highestSectorReached: 24, finalSector: 23, shipNumericId: 7, runTimeSeconds: 88, bossKills: 2, wavesCleared: 9 }),
  [20, 24, 23, 7, 88, 2, 9],
  'Steam sector details must encode start/highest/final sectors without touching global level details'
);

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
  const emptyPersonalBest = await adapter.getKnownPersonalBest({ useCache: false });
  assert.equal(emptyPersonalBest.score, 0, 'seed leaderboard rows must not become the personal high-score chase target');

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

  const reachedRun = {
    score: 5432,
    level: 4,
    levelReached: 5,
    rankIndex: 4,
    playerName: 'REACHED ACE',
    submissionId: 'web-reached-level'
  };
  const reachedLocal = await adapter.submitScore(reachedRun, { target: 'local', saveLocal: true, name: 'REACHED ACE' });
  assert.equal(reachedLocal.localEntry.level, 5, 'local leaderboard should prefer reached level over stale current level');
  assert.equal(reachedLocal.localEntry.levelReached, 5, 'local leaderboard should carry reached level alias');
  await adapter.submitScore(reachedRun, { target: 'cloud', saveLocal: false, name: 'REACHED ACE' });
  assert.equal(cloudState.lastPost.level, 5, 'cloud leaderboard should submit reached level, not stale current level');

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
  assert.deepEqual(adapter.getTabs().map(tab => tab.id), ['global', 'sector', 'local'], 'Steam Friends tab should stay hidden without friend entries while Sector is visible');

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
  assert.deepEqual(adapter.getTabs().map(tab => tab.id), ['global', 'sector', 'friends', 'local']);

  const result = await adapter.submitScore({
    score: 12345,
    level: 4,
    levelReached: 5,
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
  assert.equal(result.level, 5, 'Steam submit result should expose reached level');
  assert.equal(result.steamDetails[0], 5, 'Steam details slot 0 should encode reached level');

  const global = await adapter.getScores('global', { useCache: false });
  const friends = await adapter.getScores('friends', { useCache: false });
  assert.equal(global.source, 'steam');
  assert.equal(friends.source, 'steam-friends');
  assert.equal(global.entries[0].score, 12345);
  assert.equal(global.entries[0].level, 5);
  assert.equal(friends.entries[0].playerName, 'STEAM ACE');
  assert.equal(win.localStorage.getItem('novaSwarm.localLeaderboard.v2')?.includes('STEAM ACE'), true);

  win.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify([
    { name: 'LOCAL ACE', score: 54321, level: 10, rankIndex: 8, timestamp: '2026-06-01T00:00:00.000Z' }
  ]));
  const knownLocalBest = await adapter.getKnownPersonalBest({ useCache: false });
  assert.equal(knownLocalBest.score, 54321, 'known personal best should use the highest local score instead of stale progress');

  const staleLevelScores = JSON.parse(win.localStorage.getItem('novaSwarm.mockSteamLeaderboard.v1') || '[]')
    .map((entry) => entry.isCurrentPlayer ? { ...entry, level: 1, levelReached: 1, details: [1, 1, 321, 55, 2, 14] } : entry);
  win.localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify(staleLevelScores));
  const repaired = await adapter.submitScore({
    score: 12345,
    level: 12,
    levelReached: 12,
    rankIndex: 8,
    shipId: 'nova_sparrow',
    shipNumericId: 1,
    shipName: 'Nova Sparrow',
    runTimeSeconds: 333,
    kills: 60,
    bossKills: 3,
    wavesCleared: 18,
    submissionId: 'steam-level-repair'
  }, { target: 'steam', saveLocal: false });
  assert.equal(repaired.steamStatus, 'submitted');
  assert.equal(repaired.steamUploadMethod, 'force_update', 'same-score stale Steam level metadata should use a one-row repair update');
  const repairedGlobal = await adapter.getScores('global', { useCache: false });
  assert.equal(repairedGlobal.entries.filter((entry) => entry.playerName === 'STEAM ACE').length, 1, 'Steam mock should keep one current-player entry');
  assert.equal(repairedGlobal.entries[0].score, 12345);
  assert.equal(repairedGlobal.entries[0].level, 12);

  const steamBestScores = JSON.parse(win.localStorage.getItem('novaSwarm.mockSteamLeaderboard.v1') || '[]')
    .map((entry) => entry.isCurrentPlayer ? { ...entry, score: 120140, m_nScore: 120140 } : entry);
  win.localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify(steamBestScores));
  const knownSteamBest = await adapter.getKnownPersonalBest({ useCache: false });
  assert.equal(knownSteamBest.score, 120140, 'known personal best should raise the chase target to the Steam player best');

  const sectorBeforeSubmit = await adapter.getScores('sector', { useCache: false });
  assert.equal(sectorBeforeSubmit.sourceLabel, 'Steam Sector');
  assert.equal(sectorBeforeSubmit.entries.length, 0, 'sector board should not show global Steam rows');

  const sectorResult = await adapter.submitSectorStartScore({
    score: 45678,
    startSector: 20,
    sectorStart: 20,
    highestSectorReached: 24,
    finalSector: 23,
    level: 24,
    levelReached: 24,
    rankIndex: 8,
    shipId: 'nova_sparrow',
    shipNumericId: 1,
    shipName: 'Nova Sparrow',
    runTimeSeconds: 222,
    bossKills: 3,
    wavesCleared: 12,
    submissionId: 'steam-sector-run-1',
    leaderboardName: STEAM_SECTOR_LEADERBOARD_NAME,
    leaderboardKind: 'sector_start'
  }, { name: 'STEAM ACE' });
  assert.equal(sectorResult.sectorSteamStatus, 'submitted');
  assert.equal(sectorResult.sectorSteamDetails[0], 20, 'sector details slot 0 should encode start sector');
  assert.equal(sectorResult.sectorSteamDetails[1], 24, 'sector details slot 1 should encode highest sector reached');
  assert.equal(sectorResult.leaderboardName, STEAM_SECTOR_LEADERBOARD_NAME);

  const sectorAfterSubmit = await adapter.getScores('sector', { useCache: false });
  assert.equal(sectorAfterSubmit.sourceLabel, 'Steam Sector');
  assert.equal(sectorAfterSubmit.entries[0].score, 45678);
  assert.equal(sectorAfterSubmit.entries[0].leaderboardKind, 'sector_start');
  assert.equal(sectorAfterSubmit.entries[0].sectorStart, 20);
  assert.equal(sectorAfterSubmit.entries[0].highestSectorReached, 24);
  const globalAfterSectorSubmit = await adapter.getScores('global', { useCache: false });
  assert.equal(globalAfterSectorSubmit.entries[0].score, knownSteamBest.score, 'sector submit must not overwrite the global Steam board');
  const storedMockScores = JSON.parse(win.localStorage.getItem('novaSwarm.mockSteamLeaderboard.v1') || '[]');
  assert.equal(storedMockScores.some(entry => entry.leaderboardName === STEAM_SECTOR_LEADERBOARD_NAME && entry.score === 45678), true);
  assert.equal(storedMockScores.some(entry => entry.leaderboardName === STEAM_LEADERBOARD_NAME && entry.score === knownSteamBest.score), true);
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
