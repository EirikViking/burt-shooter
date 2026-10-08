import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { encodeSteamSectorLeaderboardDetails, normalizeLeaderboardEntry, readLeaderboardDetails } from '../src/leaderboard/LeaderboardTypes.js';
import { SteamLeaderboardProvider } from '../src/leaderboard/SteamLeaderboardProvider.js';
import { getRunHistoryPresentation } from '../src/leaderboard/RunHistoryPresentation.js';

const require = createRequire(import.meta.url);
const koffi = require('koffi');
const { SteamLeaderboardBridge } = require('../electron/steamLeaderboardBridge.cjs');
const entryType = koffi.struct('FixtureLeaderboardEntry_t', {
  m_steamIDUser: 'uint64', m_nGlobalRank: 'int32', m_nScore: 'int32',
  m_cDetails: 'int32', m_hUGC: 'uint64'
});
let expected = [51, 30, 87, 412, 2, 3, 20260922, 19, 0, 0, 20260922, 1234567, 1, 6, 15];
const bridge = new SteamLeaderboardBridge({ allowNativeLoad: false });
let nativeCalls = 0;
let wrapperCalls = 0;
bridge.steam = { leaderboards: {
  apiCore: { getUserStatsInterface: () => 1 },
  callbackPoller: { poll: async () => ({ m_hSteamLeaderboard: 123n, m_hSteamLeaderboardEntries: 456n, m_cEntryCount: 1 }) },
  libraryLoader: {
    SteamAPI_ISteamUserStats_DownloadLeaderboardEntries: () => { nativeCalls++; return 789n; },
    SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry: (_stats, _handle, _index, entryPtr, detailsPtr) => {
      koffi.encode(entryPtr, entryType, { m_steamIDUser: 76561198953993508n, m_nGlobalRank: 1,
        m_nScore: 31302, m_cDetails: expected.length, m_hUGC: 0n });
      koffi.encode(detailsPtr, `int32[${expected.length}]`, expected);
      return true;
    }
  },
  downloadLeaderboardEntries: async () => { wrapperCalls++; return [{ score: 1, details: [1] }]; }
} };

const result = await bridge.downloadEntries({ name: 'nova_swarm_overrun_tactical_score_v2', handle: 123n }, 0, 1, 10);
assert.equal(nativeCalls, 1);
assert.equal(wrapperCalls, 0);
assert.equal(result[0].score, 31302);
assert.deepEqual(result[0].details, expected);
const other = await bridge.downloadEntries({ name: 'nova_swarm_global_score_v2', handle: 124n }, 0, 1, 10);
assert.equal(wrapperCalls, 1);
assert.deepEqual(other[0].details, [1]);
const sectorName = 'nova_swarm_sector_start_score_v1';
expected = encodeSteamSectorLeaderboardDetails({ startSector: 101, highestSectorReached: 147,
  finalSector: 147, shipNumericId: 12, runTimeSeconds: 900, bossKills: 46, wavesCleared: 280, careerRankExact: '19' });
const sectorRows = await bridge.downloadEntries({ name: sectorName, handle: 123n }, 0, 1, 10);
assert.deepEqual(sectorRows[0].details, expected, 'Sector downloads need the same correct int32 decoding as Onslaught');
bridge.getCurrentSteamId = () => '76561198953993508';
bridge.loadNativeModule = () => ({});
bridge.getLeaderboard = async name => ({ name, handle: 123n });
const personalBest = await bridge.getPlayerBest({ leaderboardName: sectorName });
const entry = normalizeLeaderboardEntry(personalBest, { leaderboardKind: 'sector_start' });
assert.equal(entry.startSector, 101);
assert.equal(entry.highestSectorReached, 147);
assert.equal(entry.finalSector, 147);
assert.equal(entry.level, 147);
assert.equal(entry.shipId, 12, 'sector ship index must not be interpreted as a global-board level');
assert.equal(getRunHistoryPresentation(entry).range, 'S 101–147');
const legacyRows = await bridge.normalizeEntries([{ score: 800000, details: [], steamId: '76561198953993508' }], sectorName);
const legacy = normalizeLeaderboardEntry(legacyRows[0], { leaderboardKind: 'sector_start' });
assert.equal(getRunHistoryPresentation(legacy).end, null, 'missing legacy detail must stay unknown, never a score-based sector estimate');
let refreshed = null;
const provider = new SteamLeaderboardProvider();
const providerBridge = {
  isAvailable: async () => true,
  getPlayerBest: async () => personalBest,
  submitScore: async payload => { refreshed = payload; return { success: true, score: payload.score }; }
};
provider.getBridge = () => (provider.bridge = providerBridge);
await provider.refreshCareerRankMetadata({ leaderboardName: sectorName, leaderboardKind: 'sector_start', careerRankExact: '25' });
assert.deepEqual(refreshed.details.slice(0, 7), expected.slice(0, 7), 'career rank refresh preserves all seven competitive fields');
assert.equal(refreshed.score, personalBest.score);
assert.deepEqual(readLeaderboardDetails(personalBest), expected, 'reading and refreshing cannot mutate the downloaded row');
console.log('[onslaught-steam-details-read] PASS complete 15-int v2 metadata and unrelated board isolation');
