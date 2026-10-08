import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

class MemoryStorage {
  store = new Map();
  getItem(key) { return this.store.get(String(key)) ?? null; }
  setItem(key, value) { this.store.set(String(key), String(value)); }
  removeItem(key) { this.store.delete(String(key)); }
}
globalThis.Storage = MemoryStorage;
globalThis.window = { localStorage: new MemoryStorage(), location: { search: '', origin: 'http://127.0.0.1' } };
globalThis.fetch = async () => { throw new Error('Unexpected network access in isolated regression'); };
const { installProfileStorageNamespace } = await import('../src/profile/ProfileStorageNamespace.js');
const { LeaderboardAdapter, PENDING_STEAM_SUBMISSIONS_KEY } = await import('../src/leaderboard/LeaderboardAdapter.js');
const { RUN_MODES } = await import('../src/game/RunMode.js');
const { STEAM_TACTICAL_LEADERBOARD_NAME, STEAM_SECTOR_LEADERBOARD_NAME } = await import('../src/leaderboard/LeaderboardTypes.js');
const sceneSource = readFileSync(new URL('../src/scenes/GameOverScene.js', import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const routeStart = sceneSource.indexOf('    this.leaderboardAdapter = typeof this.game.getLeaderboardAdapter');
const routeEnd = sceneSource.indexOf('    this.lastInputDevice =', routeStart);
assert.ok(routeStart > 0 && routeEnd > routeStart);
// Execute the actual Game Over routing block, including the availability read.
const routeGameOver = new AsyncFunction('settleWithin', 'RUN_MODES', sceneSource.slice(routeStart, routeEnd));
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
let uploads = 0;
let failures = 0;
function setup() {
  window.localStorage.store.clear();
  installProfileStorageNamespace({ steamId: '76561198000000001' });
  uploads = 0;
  window.__novaSteamLeaderboard = {
    async isAvailable() { return true; },
    async getPersonaName() { return 'ACE'; },
    async getPlayerBest() { return null; },
    async getTopScores() { return []; },
    async getFriendsScores() { return []; },
    async submitScore() { uploads++; return { success: true, accepted: true, scoreChanged: false }; }
  };
  const adapter = new LeaderboardAdapter();
  // Career metadata repair is unrelated; leave all score production logic intact.
  adapter.queueCurrentCareerRankMetadataRefresh = () => null;
  const run = adapter.createRunResult({ runMode: RUN_MODES.RANKED, score: 735155, level: 50 },
    { playerName: 'ACE', submissionId: 'run-1' });
  return { adapter, run };
}
async function check(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.stack}`); }
}
await check('normal Game Over selects Steam offline and default submit persists Pure', async () => {
  const { adapter, run } = setup();
  window.__novaSteamLeaderboard.isAvailable = async () => false;
  const scene = { game: { runMode: RUN_MODES.RANKED, getLeaderboardAdapter: () => adapter, isScoreSubmissionAllowed: () => true },
    isDailySignalResult: () => false, isLateGameExperimentResult: () => false };
  await routeGameOver.call(scene, promise => promise, RUN_MODES);
  assert.equal(scene.steamSubmissionMode, true, 'Steam transport must not depend on current connectivity');
  const result = await adapter.submitScore(run, { saveLocal: true });
  assert.equal(result.localStatus, 'saved');
  assert.equal(result.steamPendingQueued, true);
  assert.equal(adapter.getPendingSteamSubmissions()[0].score, 735155);
});
await check('pending record exists before upload; successful unchanged upload survives failed reads', async () => {
  const { adapter, run } = setup();
  window.__novaSteamLeaderboard.submitScore = async () => {
    assert.equal(adapter.getPendingSteamSubmissions()[0]?.runResult.submissionId, run.submissionId);
    return { success: true, accepted: true, scoreChanged: false };
  };
  window.__novaSteamLeaderboard.getTopScores = async () => { throw new Error('read failed'); };
  const result = await adapter.submitScore(run, { target: 'steam', saveLocal: true });
  assert.equal(result.steamStatus, 'submitted');
  assert.equal(adapter.getPendingSteamSubmissions().length, 0);
});
await check('Onslaught records cache is profile-scoped and used only for offline display reads', async () => {
  const { adapter } = setup();
  adapter.refreshed = true; adapter.availability.steam = true; adapter.availabilityCheckedAt = now;
  window.__novaSteamLeaderboard.getTopScores = async () => ([{ rank: 1, name: 'ACE', score: 11895 }]);
  const live = await adapter.getScores('onslaught', { start: 1, limit: 100, useCache: true });
  assert.equal(live.cached, undefined);
  assert.equal(live.entries[0].score, 11895);
  window.__novaSteamLeaderboard.isAvailable = async () => false;
  adapter.availability.steam = false; adapter.availabilityCheckedAt = now;
  const cached = await adapter.getScores('onslaught', { start: 1, limit: 100, useCache: true });
  assert.equal(cached.cached, true);
  assert.equal(cached.offline, true);
  assert.equal(cached.entries[0].score, 11895);
  const forcedFresh = await adapter.getScores('onslaught', { start: 1, limit: 100, useCache: false });
  assert.equal(forcedFresh.status, 'unavailable');
  installProfileStorageNamespace({ steamId: '76561198000000002' });
  const otherAccount = await adapter.getScores('onslaught', { start: 1, limit: 100, useCache: true });
  assert.equal(otherAccount.status, 'unavailable');
  assert.deepEqual(otherAccount.entries, []);
});
await check('older retry acknowledgement cannot erase newer pending record', async () => {
  const { adapter, run } = setup();
  adapter.refreshed = true; adapter.availability.steam = true; adapter.availabilityCheckedAt = now;
  adapter.enqueuePendingSteamSubmission(run);
  window.__novaSteamLeaderboard.submitScore = async () => {
    adapter.enqueuePendingSteamSubmission({ ...run, submissionId: 'run-2', score: 800000 });
    return { success: true, accepted: true };
  };
  await adapter.retryPendingSteamSubmissions();
  assert.equal(adapter.getPendingSteamSubmissions()[0]?.runResult.submissionId, 'run-2');
});
await check('explicit Steam rejection must retain pending record', async () => {
  const { adapter, run } = setup();
  window.__novaSteamLeaderboard.submitScore = async () => ({ success: false, accepted: false });
  const result = await adapter.submitScore(run, { target: 'steam', saveLocal: true });
  assert.notEqual(result.steamStatus, 'submitted');
  assert.equal(adapter.getPendingSteamSubmissions().length, 1);
});
await check('ineligible/debug submissions cannot enter retry queue', async () => {
  const { adapter, run } = setup();
  assert.equal(adapter.enqueuePendingSteamSubmission({ ...run, isDebugRun: true }).queued, false);
  assert.equal(adapter.enqueuePendingSteamSubmission({ ...run, runMode: RUN_MODES.SCOUT }).queued, false);
  assert.equal(adapter.getPendingSteamSubmissions().length, 0);
});
await check('failure, restart, persisted backoff and recovery without another run', async () => {
  const { adapter, run } = setup();
  window.__novaSteamLeaderboard.submitScore = async () => { uploads++; throw new Error('offline'); };
  await adapter.submitScore(run, { saveLocal: true });
  assert.equal(uploads, 1);
  const restarted = new LeaderboardAdapter();
  restarted.queueCurrentCareerRankMetadataRefresh = () => null;
  await restarted.retryPendingSteamSubmissions();
  assert.equal(uploads, 1, 'restart must not bypass durable backoff');
  now += 120001;
  window.__novaSteamLeaderboard.submitScore = async () => { uploads++; return { success: true, scoreChanged: false }; };
  let recoveryTick;
  const realInterval = globalThis.setInterval;
  globalThis.setInterval = callback => { recoveryTick = callback; return { unref() {} }; };
  try {
    restarted.startPendingSteamRecovery();
    restarted.startPendingSteamRecovery();
    await restarted.pendingSteamRetry;
    assert.equal(uploads, 2);
    assert.equal(restarted.getPendingSteamSubmissions().length, 0);
    recoveryTick();
    assert.equal(uploads, 2, 'empty queue has no network work');
  } finally { globalThis.setInterval = realInterval; }
});
await check('concurrent retries and direct submit share one outstanding upload', async () => {
  const { adapter, run } = setup();
  adapter.refreshed = true; adapter.availability.steam = true; adapter.availabilityCheckedAt = now;
  adapter.enqueuePendingSteamSubmission(run);
  let release;
  let started;
  const uploadStarted = new Promise(resolve => { started = resolve; });
  window.__novaSteamLeaderboard.submitScore = () => { uploads++; started(); return new Promise(resolve => { release = resolve; }); };
  const first = adapter.retryPendingSteamSubmissions();
  await uploadStarted;
  const second = adapter.retryPendingSteamSubmissions();
  const direct = adapter.submitScore(run);
  assert.equal(first, second);
  release({ success: true });
  await Promise.all([first, second, direct]);
  assert.equal(uploads, 1);
});
await check('storage failure never claims pending or attempts upload; local save remains independent', async () => {
  const { adapter, run } = setup();
  const setItem = window.localStorage.setItem;
  window.localStorage.setItem = function (key, value) {
    if (String(key).includes(PENDING_STEAM_SUBMISSIONS_KEY)) throw new Error('disk full');
    return setItem.call(this, key, value);
  };
  try {
    const result = await adapter.submitScore(run, { saveLocal: true });
    assert.equal(result.localStatus, 'saved');
    assert.equal(result.steamPendingQueued, false);
    assert.equal(uploads, 0);
  } finally { window.localStorage.setItem = setItem; }
});
await check('account switch during callback cannot clear the new account queue', async () => {
  const { adapter, run } = setup();
  window.__novaSteamLeaderboard.submitScore = async () => {
    installProfileStorageNamespace({ steamId: '76561198000000002' });
    adapter.enqueuePendingSteamSubmission({ ...run, submissionId: 'other-account' });
    return { success: true };
  };
  await adapter.submitScore(run);
  assert.equal(adapter.getPendingSteamSubmissions()[0].runResult.submissionId, 'other-account');
  installProfileStorageNamespace({ steamId: '76561198000000001' });
  assert.equal(adapter.getPendingSteamSubmissions().length, 0);
});
await check('account switch before native upload suppresses old account submission', async () => {
  const { adapter, run } = setup();
  window.__novaSteamLeaderboard.getPlayerBest = async () => {
    installProfileStorageNamespace({ steamId: '76561198000000002' });
    return null;
  };
  const result = await adapter.submitScore(run);
  assert.notEqual(result.steamStatus, 'submitted');
  assert.equal(uploads, 0);
  installProfileStorageNamespace({ steamId: '76561198000000001' });
  assert.equal(adapter.getPendingSteamSubmissions().length, 1);
});
await check('Pure, Tactical and Sector stay separate; ineligible and mismatched boards excluded', async () => {
  const { adapter, run } = setup();
  adapter.enqueuePendingSteamSubmission(run);
  adapter.enqueuePendingSteamSubmission({ ...run, runMode: RUN_MODES.MAYHEM_TACTICAL,
    leaderboardName: STEAM_TACTICAL_LEADERBOARD_NAME, leaderboardKind: 'mayhem_tactical', submissionId: 'tactical' });
  const sector = adapter.createSectorStartRunResult({ isDebugRun: false, score: 5000, sectorStartCheckpoint: 10 }, { submissionId: 'sector' });
  adapter.enqueuePendingSteamSubmission(sector);
  assert.equal(adapter.getPendingSteamSubmissions().length, 3);
  assert.equal(adapter.enqueuePendingSteamSubmission({ ...run, leaderboardName: STEAM_TACTICAL_LEADERBOARD_NAME }).queued, false);
  for (const runMode of ['scout', 'daily_signal', 'overrun_pure', 'overrun_tactical', 'unranked']) {
    assert.equal(adapter.enqueuePendingSteamSubmission({ ...run, runMode }).queued, false);
  }
  const debugSector = adapter.createSectorStartRunResult({ isDebugRun: true, score: 9999, sectorStartCheckpoint: 10 });
  assert.equal(adapter.enqueuePendingSteamSubmission(debugSector).queued, false);
  const seen = [];
  window.__novaSteamLeaderboard.submitScore = async payload => { seen.push(payload.leaderboardName); return { success: true }; };
  await adapter.retryPendingSteamSubmissions();
  assert.equal(new Set(seen).size, 3);
  assert.ok(seen.includes(STEAM_SECTOR_LEADERBOARD_NAME));
});
await check('scheduler performs no storage or Steam work during combat', async () => {
  const { adapter, run } = setup();
  adapter.enqueuePendingSteamSubmission(run);
  adapter.canRetryPendingSteam = () => false;
  const getItem = window.localStorage.getItem;
  window.localStorage.getItem = () => { throw new Error('combat storage read'); };
  try {
    const result = await adapter.retryPendingSteamSubmissions();
    assert.equal(result.reason, 'combat_deferred');
    assert.equal(uploads, 0);
  } finally { window.localStorage.getItem = getItem; }
});
await check('legacy valid pending entries recover; local historical scores are never imported', async () => {
  const { adapter, run } = setup();
  window.localStorage.setItem(PENDING_STEAM_SUBMISSIONS_KEY, JSON.stringify({ version: 1, entries: [{
    key: `${run.leaderboardName}:global`, score: run.score, runResult: run, queuedAt: '2026-09-10T00:00:00Z'
  }] }));
  await adapter.retryPendingSteamSubmissions();
  assert.equal(uploads, 1);
  await adapter.localProvider.submitScore({ ...run, score: 9999999 });
  await adapter.retryPendingSteamSubmissions();
  assert.equal(uploads, 1);
});
await check('confirmed upload does not wait for hung display reads', async () => {
  const { adapter, run } = setup();
  window.__novaSteamLeaderboard.getTopScores = () => new Promise(() => {});
  window.__novaSteamLeaderboard.getFriendsScores = () => new Promise(() => {});
  const result = await adapter.submitScore(run);
  assert.equal(result.steamStatus, 'submitted');
  assert.equal(adapter.getPendingSteamSubmissions().length, 0);
});
await check('result text distinguishes pending, unconfirmed and acknowledged uploads', async () => {
  const begin = sceneSource.indexOf('  getSteamPlacementLine() {');
  const end = sceneSource.indexOf('  getLeaderboardPlacementLines()', begin);
  const methods = new Function('translateText', `return { ${sceneSource.slice(begin, end)} };`)(text => text);
  const result = { steamStatus: 'failed', steamPendingQueued: true };
  const scene = { ...methods, globalStatus: 'failed', getCurrentLeaderboardResult: () => result,
    isSteamBestUnchangedResult: () => false, isOnslaughtTacticalResult: () => false, getGlobalPlacementRank: () => null };
  assert.equal(scene.getSteamPlacementLine(), 'Steam: Upload pending');
  result.steamPendingQueued = false;
  assert.equal(scene.getSteamPlacementLine(), 'Steam: Upload not confirmed');
  result.steamStatus = 'submitted';
  assert.equal(scene.getSteamPlacementLine(), 'Steam: Score submitted');
});
await check('queued Onslaught rate limit is shown as pending instead of failed', async () => {
  const begin = sceneSource.indexOf('  getSteamPlacementLine() {');
  const end = sceneSource.indexOf('  getLeaderboardPlacementLines()', begin);
  const methods = new Function('translateText', `return { ${sceneSource.slice(begin, end)} };`)(text => text);
  const result = {
    localStatus: 'saved', steamStatus: 'failed', steamPendingQueued: true,
    steamError: 'steam_upload_rate_limited'
  };
  const scene = {
    ...methods, globalStatus: 'failed', getCurrentLeaderboardResult: () => result,
    isSteamBestUnchangedResult: () => false, isOnslaughtTacticalResult: () => true,
    getGlobalPlacementRank: () => null,
    leaderboardAdapter: { isSteamAvailable: () => true }
  };
  assert.equal(scene.getSteamPlacementLine(), 'Steam: Upload pending');
  scene.leaderboardAdapter.isSteamAvailable = () => false;
  assert.equal(scene.getSteamPlacementLine(), 'Queued offline');
  result.steamPendingQueued = false;
  assert.equal(scene.getSteamPlacementLine(), 'Submission failed — Retry');
});
await check('native bridge rate window and account guard prevent upload calls', async () => {
  const { SteamLeaderboardBridge } = await import('../electron/steamLeaderboardBridge.cjs');
  const bridge = new SteamLeaderboardBridge({ allowNativeLoad: false, logger: { warn() {} } });
  bridge.requestCurrentStats = async () => ({ available: false });
  bridge.getLeaderboard = async () => ({ handle: 1 });
  bridge.getCurrentSteamId = () => '76561198000000001';
  let nativeCalls = 0;
  bridge.steam = { leaderboards: { uploadScore: async () => { nativeCalls++; return { success: true, scoreChanged: false }; } } };
  bridge.uploadScoreViaRawSdk = async () => ({ available: false });
  for (let index = 0; index < 10; index++) assert.equal((await bridge.submitScoreDetailed({ score: index + 1 })).success, true);
  assert.equal((await bridge.submitScoreDetailed({ score: 50 })).interpretedStatus, 'steam_upload_rate_limited');
  assert.equal(nativeCalls, 10);
  now += 600001;
  assert.equal((await bridge.submitScoreDetailed({ score: 50 })).success, true);
  assert.equal((await bridge.submitScoreDetailed({ score: 50, expectedSteamId: '76561198000000002' })).interpretedStatus, 'steam_account_changed');
  assert.equal((await bridge.submitScoreDetailed({ score: 50, expectedSteamId: null })).interpretedStatus, 'steam_account_changed');
  assert.equal(nativeCalls, 11);
});
await check('Onslaught retains contract across restart and KeepBest retry without mixing Arcade local rows', async () => {
  const { adapter, run } = setup();
  globalThis.localStorage = window.localStorage;
  const { ONSLAUGHT_BOARD, ONSLAUGHT_RULESET, ONSLAUGHT_LOADOUT, ONSLAUGHT_AUGMENTS } = await import('../electron/onslaughtContract.cjs');
  const ranked = {...run, runMode:'overrun_tactical',runId:'onslaught-test-run',shipId:'nova_ship_01',startSector:51,rulesetVersion:ONSLAUGHT_RULESET,
    leaderboardName:ONSLAUGHT_BOARD,leaderboardKind:'overrun_tactical',competitionStart:{runId:'onslaught-test-run',shipId:'nova_ship_01',startSector:51,startScore:0,loadoutVersion:ONSLAUGHT_LOADOUT,augmentIds:[...ONSLAUGHT_AUGMENTS],checkpoint:null,prototype:false}};
  const scene={game:{runMode:'overrun_tactical',getLeaderboardAdapter:()=>adapter,isScoreSubmissionAllowed:()=>true},isDailySignalResult:()=>false,isLateGameExperimentResult:()=>false};
  await routeGameOver.call(scene,p=>p,RUN_MODES);
  assert.equal(scene.steamSubmissionMode,true);
  adapter.localProvider.submitScore=()=>{throw new Error('Onslaught leaked into Arcade local board');};
  window.__novaSteamLeaderboard.isAvailable=async()=>false;
  const result=await adapter.submitScore(ranked,{saveLocal:true});
  assert.equal(result.localStatus,'saved');assert.equal(result.steamPendingQueued,true);
  assert.deepEqual(adapter.getPendingSteamSubmissions()[0].runResult.competitionStart,ranked.competitionStart);
  now+=120001;
  window.__novaSteamLeaderboard.isAvailable=async()=>true;
  window.__novaSteamLeaderboard.submitScore=async payload=>{
    assert.equal(payload.leaderboardName,ONSLAUGHT_BOARD);assert.equal(payload.uploadMethod,'keep_best');
    assert.equal(payload.runResult.rulesetVersion,ONSLAUGHT_RULESET);assert.equal(payload.runResult.runId,ranked.runId);
    return {success:true,accepted:true,scoreChanged:false};
  };
  const restarted=new LeaderboardAdapter();restarted.queueCurrentCareerRankMetadataRefresh=()=>null;
  await restarted.retryPendingSteamSubmissions();
  assert.equal(restarted.getPendingSteamSubmissions().length,0);
  assert.equal(adapter.enqueuePendingSteamSubmission({...ranked,competitionStart:{...ranked.competitionStart,shipId:'other'}}).queued,false);
});
await check('distinct scored Onslaught runs remain queued and upload serially', async () => {
  const { adapter, run } = setup();
  const { ONSLAUGHT_BOARD, ONSLAUGHT_RULESET, ONSLAUGHT_LOADOUT, ONSLAUGHT_AUGMENTS } = await import('../electron/onslaughtContract.cjs');
  const makeRun = (runId, score) => ({...run,score,runMode:'overrun_tactical',runId,shipId:'nova_ship_23',startSector:51,rulesetVersion:ONSLAUGHT_RULESET,
    leaderboardName:ONSLAUGHT_BOARD,leaderboardKind:'overrun_tactical',competitionStart:{runId,shipId:'nova_ship_23',startSector:51,startScore:0,loadoutVersion:ONSLAUGHT_LOADOUT,augmentIds:[...ONSLAUGHT_AUGMENTS],checkpoint:null,prototype:false}});
  window.__novaSteamLeaderboard.isAvailable=async()=>false;
  await adapter.submitScore(makeRun('onslaught-run-one',4800),{saveLocal:true});
  await adapter.submitScore(makeRun('onslaught-run-two',11895),{saveLocal:true});
  assert.equal(adapter.getPendingSteamSubmissions().length,2);
  const uploaded=[];
  window.__novaSteamLeaderboard.isAvailable=async()=>true;
  window.__novaSteamLeaderboard.submitScore=async payload=>{uploaded.push(payload.runResult.runId);return {success:true,accepted:true,scoreChanged:payload.runResult.score===11895};};
  now+=120001;
  await adapter.retryPendingSteamSubmissions();
  assert.deepEqual(uploaded,['onslaught-run-two','onslaught-run-one']);
  assert.equal(adapter.getPendingSteamSubmissions().length,0);
});
await check('a genuine zero-score Onslaught defeat remains durable and eligible', async () => {
  const { adapter, run } = setup();
  const { ONSLAUGHT_BOARD, ONSLAUGHT_RULESET, ONSLAUGHT_LOADOUT, ONSLAUGHT_AUGMENTS } = await import('../electron/onslaughtContract.cjs');
  const ranked = {...run, score:0, runMode:'overrun_tactical',runId:'onslaught-short-run',shipId:'nova_ship_01',startSector:51,rulesetVersion:ONSLAUGHT_RULESET,
    leaderboardName:ONSLAUGHT_BOARD,leaderboardKind:'overrun_tactical',competitionStart:{runId:'onslaught-short-run',shipId:'nova_ship_01',startSector:51,startScore:0,loadoutVersion:ONSLAUGHT_LOADOUT,augmentIds:[...ONSLAUGHT_AUGMENTS],checkpoint:null,prototype:false}};
  window.__novaSteamLeaderboard.isAvailable=async()=>false;
  const result=await adapter.submitScore(ranked,{saveLocal:true});
  assert.equal(result.steamPendingQueued,true);
  assert.equal(adapter.getPendingSteamSubmissions()[0]?.score,0);
  const restarted=new LeaderboardAdapter();
  assert.equal(restarted.getPendingSteamSubmissions()[0]?.runResult.runId,'onslaught-short-run');
});
await check('a valid pre-queue Onslaught record is recovered once and marked after acceptance', async () => {
  const { adapter, run } = setup();
  globalThis.localStorage = window.localStorage;
  const { ONSLAUGHT_BOARD, ONSLAUGHT_RULESET, ONSLAUGHT_LOADOUT, ONSLAUGHT_AUGMENTS } = await import('../electron/onslaughtContract.cjs');
  const { recordOnslaughtRun, getRecoverableOnslaughtSubmission } = await import('../src/progression/OnslaughtChallenge.js');
  const ranked = {...run,score:11895,runMode:'overrun_tactical',runId:'preserved-real-run',shipId:'nova_ship_23',startSector:51,rulesetVersion:ONSLAUGHT_RULESET,
    leaderboardName:ONSLAUGHT_BOARD,leaderboardKind:'overrun_tactical',competitionStart:{runId:'preserved-real-run',shipId:'nova_ship_23',startSector:51,startScore:0,loadoutVersion:ONSLAUGHT_LOADOUT,augmentIds:[...ONSLAUGHT_AUGMENTS],checkpoint:null,prototype:false}};
  assert.equal(recordOnslaughtRun(ranked).stored,true);
  assert.equal(adapter.recoverOnslaughtBestSubmission().queued,true);
  assert.equal(adapter.getPendingSteamSubmissions()[0]?.runResult.runId,'preserved-real-run');
  window.__novaSteamLeaderboard.submitScore=async()=>({success:true,accepted:true,scoreChanged:true});
  now+=120001;
  await adapter.retryPendingSteamSubmissions();
  assert.equal(getRecoverableOnslaughtSubmission(),null);
  assert.equal(adapter.recoverOnslaughtBestSubmission().queued,false);
});
Date.now = realNow;
if (failures) process.exitCode = 1;
console.log(`[leaderboard-reliability] ${failures ? `${failures} FAILED` : 'PASS'}`);
