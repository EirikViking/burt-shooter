import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { _electron as electron, chromium } from 'playwright';

const executablePath = process.env.NOVA_SWARM_PACKAGED_EXE;
const sourceUrl = process.env.NOVA_SWARM_TEST_URL || '';
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/highscore-lifecycle');
assert.ok(executablePath || sourceUrl, 'Set NOVA_SWARM_PACKAGED_EXE or NOVA_SWARM_TEST_URL');
const sourceRuntime = process.env.NOVA_SWARM_SOURCE_RUNTIME === '1';
mkdirSync(outputDir, { recursive: true });

const errors = [];
const report = {
  executablePath,
  sourceUrl,
  sourceRuntime,
  productionUploads: false,
  switches: [],
  errors
};

const app = sourceUrl ? null : await electron.launch({
  executablePath,
  args: [
    ...(sourceRuntime ? [path.resolve('electron/main.cjs')] : []),
    '--nova-fresh-profile',
    '--windowed'
  ],
  env: {
    ...process.env,
    NOVA_SWARM_DISABLE_STEAMWORKS: '1',
    NOVA_SWARM_FRESH_PROFILE: '1',
    NOVA_SWARM_USER_DATA_DIR: path.join(outputDir, 'profile'),
    NOVA_SWARM_WINDOWED: '1'
  },
  timeout: 120000
});
const browser = sourceUrl ? await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
}) : null;

try {
  const page = sourceUrl
    ? await browser.newPage({ viewport: { width: 1280, height: 720 } })
    : await app.firstWindow();
  page.on('pageerror', (error) => errors.push(error.stack || error.message));
  if (sourceUrl) await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (
    window.__game?.scenes?.menu?.astraMenuShip?.ready
    && document.querySelector('#loading')?.style.display === 'none'
  ), null, { timeout: 120000 });

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await page.evaluate(() => window.__game.showHighscores({ view: 'tactical' }));
    await page.waitForFunction(() => (
      window.__game?.currentSceneName === 'highscore'
      && window.__game?.scenes?.highscore?.comment
    ), null, { timeout: 30000 });
    await page.evaluate(() => {
      const scene = window.__game.scenes.highscore;
      scene.fetchToken += 1;
      scene.activeLeaderboard = 'tactical';
      scene.applyLeaderboardResult({
        status: 'available',
        entries: [
          { rank: 1, name: 'SIGNED IN PILOT', score: 87628, level: 16, isCurrentPlayer: true },
          { rank: 2, name: 'RIVAL', score: 45000, level: 11 }
        ]
      });
    });
    await page.waitForFunction(() => window.__game.scenes.highscore.playerHighlightEffects.length > 0);

    const before = await page.evaluate(() => ({
      view: window.__game.scenes.highscore.activeLeaderboard,
      highlights: window.__game.scenes.highscore.playerHighlightEffects.length
    }));
    await page.evaluate(() => window.__game.scenes.highscore.setLeaderboardView('onslaught'));
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => ({
      scene: window.__game.currentSceneName,
      view: window.__game.scenes.highscore.activeLeaderboard,
      highlights: window.__game.scenes.highscore.playerHighlightEffects.length
    }));
    report.switches.push({ cycle, before, after });

    await page.evaluate(() => window.__game.scenes.highscore.returnToMenu('lifecycle_test'));
    await page.waitForFunction(() => window.__game?.currentSceneName === 'menu');
  }

  await page.evaluate(() => window.__game.showHighscores({ view: 'tactical' }));
  await page.waitForFunction(() => (
    window.__game?.currentSceneName === 'highscore'
    && window.__game?.scenes?.highscore?.comment
  ), null, { timeout: 30000 });
  await page.evaluate(() => {
    const scene = window.__game.scenes.highscore;
    scene.fetchToken += 1;
    scene.leaderboardAdapter.getScores = () => new Promise((resolve) => {
      window.__resolveClosedHighscoreRequest = resolve;
    });
    void scene.fetchHighscores();
  });
  await page.waitForFunction(() => typeof window.__resolveClosedHighscoreRequest === 'function');
  await page.evaluate(() => window.__game.scenes.highscore.returnToMenu('pending_request_test'));
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu');
  await page.evaluate(() => window.__resolveClosedHighscoreRequest({
    status: 'available',
    entries: [{ rank: 1, name: 'STALE AFTER CLOSE', score: 999999, isCurrentPlayer: true }]
  }));
  await page.waitForTimeout(500);
  report.closedRequest = await page.evaluate(() => {
    const scene = window.__game.scenes.highscore;
    return {
      currentScene: window.__game.currentSceneName,
      staleEntryApplied: scene.entriesNormalized.some((entry) => entry.name === 'STALE AFTER CLOSE'),
      rowsFadeTickerActive: Boolean(scene.rowsFadeTicker)
    };
  });
  assert.deepEqual(report.closedRequest, {
    currentScene: 'menu',
    staleEntryApplied: false,
    rowsFadeTickerActive: false
  }, 'A leaderboard request resolved after Back must not mutate or restart the inactive scene');

  await page.screenshot({ path: path.join(outputDir, 'menu-after-switches.png') });
  assert.deepEqual(errors, [], `Highscore lifecycle emitted runtime errors:\n${errors.join('\n')}`);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.stack || error.message;
  throw error;
} finally {
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  if (app) await app.close();
}

console.log('[highscore-lifecycle] PASS repeated Arcade/Onslaught switching and reopen');
