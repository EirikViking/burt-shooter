import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage();
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4197'}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.updateOnslaughtRecordChase, null, { timeout: 120000 });
  const result = await page.evaluate(async () => {
    const toast = [];
    const prototype = Object.getPrototypeOf(window.__game);
    const fake = {
      runId: 'genuine-shaped-fixture', score: 100,
      onslaughtRecordLastScore: 99,
      onslaughtRecordBeatPlayed: false, onslaughtRecordClosePlayed: false,
      onslaughtRecordSnapshot: { source: 'fresh_steam', runId: 'genuine-shaped-fixture', leaderboardName: 'nova_swarm_overrun_tactical_score_v2', entries: [{ score: 100, rank: 1, steamId: 'pilot' }] },
      getRunLeaderboardDescriptor: () => ({ leaderboardName: 'nova_swarm_overrun_tactical_score_v2' }),
      currentScene: { enqueueToast: text => toast.push(text) },
      highscoreChase: { syncingTarget: false, targetScore: 50, celebrationFired: false, milestones: new Set() }
    };
      prototype.updateOnslaughtRecordChase.call(fake);
      const tie = toast.length;
      fake.score = 101;
      prototype.updateOnslaughtRecordChase.call(fake);
      const crossing = { toast: [...toast], personalSuppressed: fake.highscoreChase.celebrationFired };
      prototype.updateOnslaughtRecordChase.call(fake);
      const repeat = toast.length;
      fake.onslaughtRecordSnapshot = { ...fake.onslaughtRecordSnapshot, entries: [] };
      fake.score = 200;
      prototype.updateOnslaughtRecordChase.call(fake);
      const empty = toast.length;
      const near = { ...fake, score: 95, onslaughtRecordLastScore: 60, onslaughtRecordBeatPlayed: false, onslaughtRecordClosePlayed: false,
        onslaughtRecordSnapshot: { ...fake.onslaughtRecordSnapshot, entries: [{ score: 100 }] } };
      prototype.updateOnslaughtRecordChase.call(near);
      prototype.updateOnslaughtRecordChase.call(near);
      const ownToasts = [];
      const own = { ...fake, score: 101, onslaughtRecordLastScore: 99,
        onslaughtRecordBeatPlayed: false, onslaughtRecordClosePlayed: false,
        onslaughtRecordSnapshot: { ...fake.onslaughtRecordSnapshot,
          entries: [{ score: 100, rank: 1, isCurrentPlayer: true }] },
        currentScene: { enqueueToast: text => ownToasts.push(text) },
        highscoreChase: { runMode: 'overrun_tactical', syncingTarget: false, targetScore: 50,
          celebrationFired: false, milestones: new Set() } };
      own.updateOnslaughtRecordChase = prototype.updateOnslaughtRecordChase;
      prototype.updateHighscoreChaseCues.call(own, { personalBestOnly: true });
      const personalCelebrations = [];
      const personal = {
        ...fake, score: 60, onslaughtRecordBeatPlayed: false,
        onslaughtRecordSnapshot: { ...fake.onslaughtRecordSnapshot, entries: [{ score: 100, rank: 1 }] },
        currentScene: {
          enqueueToast: text => toast.push(text),
          showPersonalBestCelebration: details => { personalCelebrations.push(details); return true; }
        },
        highscoreChase: { runMode: 'overrun_tactical', syncingTarget: false, targetScore: 50,
          source: 'known_personal_best', celebrationFired: false, milestones: new Set() },
        updateOnslaughtRecordChase: prototype.updateOnslaughtRecordChase
      };
      prototype.updateHighscoreChaseCues.call(personal, { personalBestOnly: true });
      prototype.updateHighscoreChaseCues.call(personal, { personalBestOnly: true });
      const personalBelowGlobal = { count: personalCelebrations.length, live: personal.personalBestLiveCelebrated,
        previousScore: personalCelebrations[0]?.previousScore };
      personal.onslaughtRecordSnapshot = null;
      personal.highscoreChase.celebrationFired = false;
      personal.personalBestLiveCelebrated = false;
      prototype.updateHighscoreChaseCues.call(personal, { personalBestOnly: true });
      const modeCelebrations = {};
      for (const runMode of ['ranked_tactical', 'ranked', 'overrun_pure']) {
        let shown = 0;
        const mode = { ...personal,
          highscoreChase: { ...personal.highscoreChase, runMode, celebrationFired: false, milestones: new Set() },
          currentScene: { enqueueToast: () => {},
            showPersonalBestCelebration: () => { shown += 1; return true; } } };
        prototype.updateHighscoreChaseCues.call(mode, { personalBestOnly: true });
        prototype.updateHighscoreChaseCues.call(mode, { personalBestOnly: true });
        modeCelebrations[runMode] = shown;
      }
      return { tie, crossing, repeat, empty, nearPlayed: near.onslaughtRecordClosePlayed,
        ownToasts, ownPersonalSuppressed: own.highscoreChase.celebrationFired,
        personalBelowGlobal, personalWithoutBoard: personalCelebrations.length, modeCelebrations };
  });
  assert.equal(result.tie, 0);
  assert.equal(result.crossing.toast.length, 1);
  assert.equal(result.crossing.personalSuppressed, true);
  assert.equal(result.repeat, 1);
  assert.equal(result.empty, 1);
  assert.equal(result.nearPlayed, true);
  assert.equal(result.ownToasts.length, 1);
  assert.ok(result.ownToasts[0].includes('YOUR #1'));
  assert.equal(result.ownPersonalSuppressed, true);
  assert.deepEqual(result.personalBelowGlobal, { count: 1, live: true, previousScore: 50 });
  assert.equal(result.personalWithoutBoard, 2);
  assert.deepEqual(result.modeCelebrations, { ranked_tactical: 1, ranked: 1, overrun_pure: 1 });
  console.log('[onslaught-record-chase] PASS strict crossing, combined PB, live PB in all Arcade/Onslaught modes, offline PB, once-only, empty board and near threshold');
} finally {
  await browser.close();
}
