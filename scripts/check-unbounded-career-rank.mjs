import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) { return this.map.get(key) ?? null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.window = {
  localStorage: storage,
  location: { search: '', origin: 'http://localhost' }
};

const {
  MAX_RANK_INDEX,
  POST_CAP_PILOT_XP_STEP,
  formatCareerInteger,
  getAuthoredRankFromPilotXpExact,
  getCareerDisplayRankExact,
  getCareerRankProgress,
  normalizePilotXpExact
} = await import('../src/shared/RankPolicy.js');
const { normalizeHangarProgress } = await import('../src/progression/HangarProgressState.js');
const {
  CAREER_RANK_DETAILS_MARKER,
  GLOBAL_COMPETITIVE_DETAILS_COUNT,
  SECTOR_COMPETITIVE_DETAILS_COUNT,
  STEAM_LEADERBOARD_NAME,
  STEAM_SECTOR_LEADERBOARD_NAME,
  STEAM_TACTICAL_LEADERBOARD_NAME,
  encodeSteamLeaderboardDetails,
  encodeSteamSectorLeaderboardDetails,
  normalizeLeaderboardEntries,
  readCareerRankStatus
} = await import('../src/leaderboard/LeaderboardTypes.js');
const { SteamLeaderboardProvider } = await import('../src/leaderboard/SteamLeaderboardProvider.js');
const { LocalLeaderboard } = await import('../src/api/LocalLeaderboard.js');
const {
  LeaderboardAdapter,
  PENDING_CAREER_RANK_METADATA_KEY
} = await import('../src/leaderboard/LeaderboardAdapter.js');
const { createRunReport } = await import('../src/game/RunReport.js');

assert.equal(getCareerDisplayRankExact('5429999'), '39');
assert.equal(getCareerDisplayRankExact('5430000'), '40');
assert.equal(getCareerDisplayRankExact(String(5430000 + POST_CAP_PILOT_XP_STEP - 1)), '40');
assert.equal(getCareerDisplayRankExact(String(5430000 + POST_CAP_PILOT_XP_STEP)), '41');

const hundredDigitXp = `9${'8'.repeat(99)}`;
const hundredDigitRank = getCareerDisplayRankExact(hundredDigitXp);
assert.ok(hundredDigitRank.length > 90, 'Career Rank must remain arbitrary precision');
assert.equal(getAuthoredRankFromPilotXpExact(hundredDigitXp), MAX_RANK_INDEX, 'gameplay rank must stay capped');
assert.match(formatCareerInteger(hundredDigitRank, { maxPlainDigits: 6 }), /^\d(?:\.\d{1,2})?e\d+$/);
assert.equal(normalizePilotXpExact(`000${hundredDigitXp}`), hundredDigitXp);

const postCapProgress = getCareerRankProgress(String(5430000 + POST_CAP_PILOT_XP_STEP + 320000));
assert.equal(postCapProgress.displayRankExact, '41');
assert.equal(postCapProgress.rankIndex, MAX_RANK_INDEX);
assert.equal(postCapProgress.progress, 0.5);
assert.equal(postCapProgress.xpToNextRank, 320000);

const normalizedSave = normalizeHangarProgress({
  unlockTuningVersion: 3,
  pilotXp: Number.MAX_SAFE_INTEGER,
  pilotXpExact: hundredDigitXp,
  pilotRank: 999,
  highestPilotRank: 999,
  bestRank: 999
});
assert.equal(normalizedSave.pilotXpExact, hundredDigitXp);
assert.equal(normalizedSave.pilotXp, Number.MAX_SAFE_INTEGER);
assert.equal(normalizedSave.pilotRank, MAX_RANK_INDEX);
assert.equal(normalizedSave.highestPilotRank, MAX_RANK_INDEX);
assert.equal(normalizedSave.bestRank, MAX_RANK_INDEX);

const globalBase = [130, 7, 4567, 890, 12, 700];
const globalDetails = encodeSteamLeaderboardDetails({
  levelReached: globalBase[0],
  shipNumericId: globalBase[1],
  runTimeSeconds: globalBase[2],
  kills: globalBase[3],
  bossKills: globalBase[4],
  wavesCleared: globalBase[5],
  careerRankExact: hundredDigitRank
});
assert.deepEqual(globalDetails.slice(0, GLOBAL_COMPETITIVE_DETAILS_COUNT), globalBase);
assert.equal(globalDetails[GLOBAL_COMPETITIVE_DETAILS_COUNT], CAREER_RANK_DETAILS_MARKER);
assert.equal(readCareerRankStatus(globalDetails, GLOBAL_COMPETITIVE_DETAILS_COUNT).label, formatCareerInteger(hundredDigitRank, { maxPlainDigits: 6 }));

const sectorBase = [51, 87, 87, 11, 2222, 9, 180];
const sectorDetails = encodeSteamSectorLeaderboardDetails({
  startSector: sectorBase[0],
  highestSectorReached: sectorBase[1],
  finalSector: sectorBase[2],
  shipNumericId: sectorBase[3],
  runTimeSeconds: sectorBase[4],
  bossKills: sectorBase[5],
  wavesCleared: sectorBase[6],
  careerRankExact: '2147483648'
});
assert.deepEqual(sectorDetails.slice(0, SECTOR_COMPETITIVE_DETAILS_COUNT), sectorBase);
assert.equal(readCareerRankStatus(sectorDetails, SECTOR_COMPETITIVE_DETAILS_COUNT).label, '2.14e9');

const normalizedRows = normalizeLeaderboardEntries([
  { rank: 2, name: 'SECOND', score: 900, details: [...globalBase, CAREER_RANK_DETAILS_MARKER, 100, 123456789, 0], source: 'steam' },
  { rank: 1, name: 'FIRST', score: 1000, details: [...globalBase, CAREER_RANK_DETAILS_MARKER, 2, 77, 77], source: 'steam' }
]);
assert.deepEqual(normalizedRows.map((entry) => entry.score), [1000, 900], 'Career Rank metadata must not change ordering');
assert.equal(normalizedRows[0].careerRankLabel, '77');
assert.equal(normalizedRows[1].careerRankLabel, '1.23e99');

LocalLeaderboard.clear();
const localSave = LocalLeaderboard.saveScore({
  name: 'FOREVER ACE',
  score: 999999,
  level: 72,
  rankIndex: MAX_RANK_INDEX,
  careerRankExact: hundredDigitRank,
  submissionId: 'unbounded-career-rank-local-save'
});
assert.equal(localSave.entry.careerRankExact, hundredDigitRank, 'local save must retain exact Career Rank');
assert.equal(LocalLeaderboard.getScores(1)[0].careerRankExact, hundredDigitRank, 'local reload must retain exact Career Rank');

const rows = new Map([
  [STEAM_LEADERBOARD_NAME, { score: 1000, details: globalBase, isCurrentPlayer: true }],
  [STEAM_TACTICAL_LEADERBOARD_NAME, { score: 900, details: [120, 4, 3333, 700, 8, 640], isCurrentPlayer: true }],
  [STEAM_SECTOR_LEADERBOARD_NAME, { score: 800, details: sectorBase, isCurrentPlayer: true }]
]);
const submissions = [];
window.__novaSteamLeaderboard = {
  async isAvailable() { return true; },
  async getPersonaName() { return 'ENDLESS ACE'; },
  async getPlayerBest({ leaderboardName }) { return rows.get(leaderboardName) || null; },
  async submitScore(payload) {
    submissions.push(structuredClone(payload));
    const previous = rows.get(payload.leaderboardName);
    rows.set(payload.leaderboardName, { ...previous, score: payload.score, details: payload.details, isCurrentPlayer: true });
    return { success: true, entry: { score: payload.score, details: payload.details } };
  }
};

const provider = new SteamLeaderboardProvider();
const directRefresh = await provider.refreshCareerRankMetadata({
  leaderboardName: STEAM_LEADERBOARD_NAME,
  leaderboardKind: 'global',
  careerRankExact: hundredDigitRank
});
assert.equal(directRefresh.status, 'refreshed');
assert.equal(submissions[0].score, 1000);
assert.equal(submissions[0].uploadMethod, 'force_update');
assert.deepEqual(submissions[0].details.slice(0, GLOBAL_COMPETITIVE_DETAILS_COUNT), globalBase);

rows.delete(STEAM_LEADERBOARD_NAME);
const beforeNoRowSubmitCount = submissions.length;
const noRowRefresh = await provider.refreshCareerRankMetadata({
  leaderboardName: STEAM_LEADERBOARD_NAME,
  leaderboardKind: 'global',
  careerRankExact: '999'
});
assert.equal(noRowRefresh.reason, 'no_existing_row');
assert.equal(submissions.length, beforeNoRowSubmitCount, 'missing row must not create a leaderboard entry');
rows.set(STEAM_LEADERBOARD_NAME, { score: 1000, details: globalBase, isCurrentPlayer: true });

const adapter = new LeaderboardAdapter();
adapter.refreshed = true;
adapter.availability = { steam: true, steamFriends: false, cloud: true, local: true };
adapter.queueCareerRankMetadataRefresh('77');
adapter.queueCareerRankMetadataRefresh(hundredDigitRank);
assert.equal(adapter.getPendingCareerRankMetadata().careerRankExact, hundredDigitRank);
const retry = await adapter.retryPendingCareerRankMetadata({ reason: 'focused_test' });
assert.equal(retry.status, 'refreshed');
assert.equal(storage.getItem(PENDING_CAREER_RANK_METADATA_KEY), null);
assert.equal(retry.results.length, 3);
for (const result of retry.results) {
  assert.ok(result.status === 'refreshed' || result.status === 'skipped');
}

const report = createRunReport({
  runMode: 'ranked',
  shipName: 'AURIC CORE',
  finalScore: 1234,
  sectorReached: 10,
  pilotRank: MAX_RANK_INDEX,
  careerRankBefore: (BigInt(hundredDigitRank) - 1n).toString(),
  careerRankAfter: hundredDigitRank,
  pilotXpGained: 5000
});
assert.equal(report.version, 17);
assert.equal(report.summary.careerRankExact, hundredDigitRank);
assert.equal(report.sections.find((section) => section.id === 'rewards').rows.find((row) => row.id === 'careerRank').value, formatCareerInteger(hundredDigitRank, { maxPlainDigits: 6 }));
assert.equal(report.sections.find((section) => section.id === 'rewards').rows.find((row) => row.id === 'newRanks').value, '1');

console.log(`[unbounded-career-rank] PASS rank=${formatCareerInteger(hundredDigitRank, { maxPlainDigits: 6 })} refreshes=${submissions.length}`);
