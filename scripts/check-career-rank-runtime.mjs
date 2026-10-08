import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

if (!process.env.CHECK_OUTPUT_DIR || !process.env.CHECK_URL) throw Error('Set CHECK_OUTPUT_DIR and CHECK_URL for source-only testing');
const out = path.resolve(process.env.CHECK_OUTPUT_DIR);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const report = { errors: [], cases: [] };
page.on('pageerror', error => report.errors.push(error.message));
await page.route('**/*', route => /^(https?:\/\/127\.0\.0\.1|blob:|data:)/.test(route.request().url()) ? route.continue() : route.abort());
try {
  await page.goto(`${process.env.CHECK_URL}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'commit' });
  await page.waitForFunction(() => document.body.dataset.menuReady === '1', null, { timeout: 120000 });
  for (const fixture of [
    { rank: 29, score: 0, increase: false },
    { rank: 22, score: 10000, increase: true },
    { rank: 40, score: 10000, increase: true }
  ]) {
    await page.evaluate(async fixture => {
      const { writeHangarProgressState, readHangarProgressState } = await import('/src/progression/HangarProgressState.js');
      const { getPilotXpThresholds, POST_CAP_PILOT_XP_STEP } = await import('/src/shared/RankPolicy.js');
      const thresholds = getPilotXpThresholds();
      const xp = fixture.increase
        ? (fixture.rank === 40 ? thresholds[39] + POST_CAP_PILOT_XP_STEP : thresholds[fixture.rank]) - 1
        : thresholds[fixture.rank - 1];
      writeHangarProgressState({ ...readHangarProgressState(), pilotXp: xp, pilotXpExact: String(xp), totalRuns: 8 });
      window.__game.achievementManager.steamSync = { unlock: async () => ({ ok: true }) };
    }, fixture);
    await page.evaluate(() => window.__game.startGame(undefined, { runMode: 'ranked', countShipUsage: false }));
    await page.waitForFunction(() => window.__game.currentSceneName === 'play' && window.__game.scenes.play.player, null, { timeout: 90000 });
    const result = await page.evaluate(async fixture => {
      const game = window.__game;
      game.app.ticker.stop();
      const requests = [];
      const adapter = game.getLeaderboardAdapter();
      const originalRefresh = adapter.refreshCareerRankMetadata;
      adapter.refreshCareerRankMetadata = async rank => { requests.push(rank); return { status: 'refreshed' }; };
      try {
        game.score = fixture.score;
        const summary = game.finalizeRunProgression({ score: fixture.score });
        await game.careerRankMetadataRefreshPromise;
        game.finalizeRunProgression({ score: fixture.score });
        return { before: summary.careerRankBefore, after: summary.careerRankAfter, increased: summary.careerRankIncreased, requests };
      } finally {
        adapter.refreshCareerRankMetadata = originalRefresh;
      }
    }, fixture);
    assert.equal(result.increased, fixture.increase);
    assert.equal(result.before, String(fixture.rank));
    assert.equal(result.after, String(fixture.rank + (fixture.increase ? 1 : 0)));
    assert.deepEqual(result.requests, [result.after], 'finalization refreshes current rank once, with or without a new rank/PB');
    report.cases.push({ fixture, result });
    await page.evaluate(() => window.__game.app.ticker.start());
  }
  await page.screenshot({ path: path.join(out, 'source-gameplay.png') });
  await page.evaluate(async () => {
    const { writeHangarProgressState, readHangarProgressState } = await import('/src/progression/HangarProgressState.js');
    const { getPilotXpThresholds } = await import('/src/shared/RankPolicy.js');
    const { STEAM_LEADERBOARD_NAME, replaceCareerRankDetails } = await import('/src/leaderboard/LeaderboardTypes.js');
    const { createLeaderboardAdapter, PENDING_CAREER_RANK_METADATA_KEY } = await import('/src/leaderboard/LeaderboardAdapter.js');
    const xp = getPilotXpThresholds()[28];
    writeHangarProgressState({ ...readHangarProgressState(), pilotXp: xp, pilotXpExact: String(xp) });
    localStorage.removeItem(PENDING_CAREER_RANK_METADATA_KEY);
    window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
    window.__novaMockSteamPersonaName = 'RANK SYNC TEST';
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify([
      { name: 'RANK SYNC TEST', playerName: 'RANK SYNC TEST', score: 7654321, details: replaceCareerRankDetails([70, 2, 1000, 800, 5, 90], '22'),
        leaderboardName: STEAM_LEADERBOARD_NAME, isCurrentPlayer: true, source: 'steam' }
    ]));
    const adapter = createLeaderboardAdapter();
    const originalRetryCareerRank = adapter.retryPendingCareerRankMetadata.bind(adapter);
    let releaseCareerRankRefresh;
    const careerRankRefreshGate = new Promise(resolve => { releaseCareerRankRefresh = resolve; });
    window.__careerRankRefreshStarted = false;
    window.__careerRankRefreshReleased = false;
    window.__releaseCareerRankRefresh = () => {
      window.__careerRankRefreshReleased = true;
      releaseCareerRankRefresh();
    };
    adapter.retryPendingCareerRankMetadata = async () => {
      window.__careerRankRefreshStarted = true;
      await careerRankRefreshGate;
      return { status: 'refreshed', reason: 'runtime_fixture' };
    };
    window.__restoreCareerRankRefresh = () => {
      adapter.retryPendingCareerRankMetadata = originalRetryCareerRank;
      adapter.writePendingCareerRankMetadata(null);
    };
    window.__game.leaderboardAdapter = adapter;
    const { RankAssets } = await import('/src/utils/RankAssets.js');
    const originalLoadRankTexture = RankAssets.loadRankTexture;
    window.__careerRankTestBadges = [];
    RankAssets.loadRankTexture = function (rank) {
      window.__careerRankTestBadges.push(rank);
      return originalLoadRankTexture.call(this, rank);
    };
    window.__game.leaderboardView = 'global';
    window.__game.switchScene('highscore');
  });
  await page.waitForFunction(() => (
    window.__careerRankRefreshStarted === true &&
    window.__careerRankRefreshReleased === false &&
    window.__game.scenes.highscore.entriesNormalized?.some(row => row.isCurrentPlayer && row.careerRankLabel === '29')
  ), null, { timeout: 30000 });
  report.leaderboard = await page.evaluate(() => window.__game.scenes.highscore.entriesNormalized.find(row => row.isCurrentPlayer));
  report.leaderboardLoadedWhileCareerRankRefreshPending = true;
  assert.equal(report.leaderboard.score, 7654321);
  assert.equal(report.leaderboard.careerRankIndex, 28);
  await page.waitForFunction(() => window.__careerRankTestBadges.includes(28), null, { timeout: 30000 });
  await page.screenshot({ path: path.join(out, 'source-leaderboard-rank29.png') });
  await page.evaluate(() => window.__releaseCareerRankRefresh());
  await page.waitForFunction(() => window.__game.leaderboardAdapter.careerRankMetadataRefresh === null, null, { timeout: 30000 });
  await page.evaluate(() => window.__restoreCareerRankRefresh());
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
  console.log('[career-rank-runtime] PASS existing rank 29, rank 22 -> 23, rank 40 -> 41, finalization idempotency');
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
