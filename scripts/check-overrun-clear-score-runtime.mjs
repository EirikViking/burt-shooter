import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(5190));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/overrun-clear-score-runtime-${timestamp()}`);
const baseScore = 42000;
const clearBonus = 10000;
const livesBonus = 7500;
const expectedScore = baseScore + clearBonus + livesBonus;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function waitForGame(page) {
  await page.waitForFunction(() => Boolean(window.__game && window.render_game_to_text), null, { timeout: 30000 });
}

async function renderState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

function assertScoreInvariant(snapshot, label) {
  assert.equal(snapshot.gameScore, expectedScore, `${label}: game.score should include clear+lives bonus exactly once`);
  assert.equal(snapshot.award?.appliedTotal, clearBonus + livesBonus, `${label}: applied award total mismatch`);
  assert.equal(snapshot.award?.scoreAfter, expectedScore, `${label}: award scoreAfter mismatch`);
  assert.equal(snapshot.breakdown?.runClearBonus, clearBonus, `${label}: runClearBonus breakdown mismatch`);
  assert.equal(snapshot.breakdown?.remainingLivesBonus, livesBonus, `${label}: remainingLivesBonus breakdown mismatch`);
  assert.equal(snapshot.breakdown?.finalScore, expectedScore, `${label}: final score breakdown mismatch`);
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;
let expectedFinalScore = expectedScore;
const consoleEvents = [];

try {
  server = await startDevServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    const play = window.HTMLMediaElement?.prototype?.play;
    if (play) {
      window.HTMLMediaElement.prototype.play = function playMediaForRuntimeCheck() {
        return Promise.resolve();
      };
    }
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  await page.evaluate(async () => {
    await window.__game.startGame(window.__game.selectedShipSpriteKey);
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  const immediate = await page.evaluate(({ baseScore, clearBonus, livesBonus, expectedScore }) => {
    const game = window.__game;
    const play = game.scenes.play;
    window.__overrunScoreSubmissions = [];
    window.__expectedScore = expectedScore;
    game.score = baseScore;
    game.level = 10;
    game.lives = livesBonus / 2500;
    game.runCleared = false;
    game.runClearReason = null;
    game.runClearLivesRemaining = 0;
    game.runClearLifeLosses = 0;
    game.runClearScoreBonusAward = null;
    game.runClearScoreBonusAwards = {};
    game.runFinalized = false;
    game.runSummary = null;
    game.runProgressionResult = null;
    game.scoreMultiplier = 2;
    game.scoreBreakdown = game.createEmptyScoreBreakdown();
    game.scoreBreakdown.baseScore = baseScore;
    game.scoreBreakdown.finalScore = baseScore;
    play.lifeLossesThisRun = 0;
    game.globalLeaderboardTargets = [];
    game.runPressureDirector = { getScoreMultiplier: () => 2 };
    if (play.player) play.player.scoreMultiplier = 2;
    play.overrunCelebratedMilestones = new Set();
    game.leaderboardAdapter = {
      availability: { cloud: true, steam: true, local: true },
      async refreshAvailability() {
        return this.availability;
      },
      getRuntimeSummary() {
        return {
          provider: 'steam',
          steamAvailable: true,
          steamEnabled: true,
          steamPersona: 'STEAM ACE'
        };
      },
      shouldUseSteamSubmission() {
        return true;
      },
      async getSteamPlayerName() {
        return 'STEAM ACE';
      },
      qualifiesLocal(score) {
        return Number(score) > 0;
      },
      getLocalCutoff() {
        return 0;
      },
      createRunResult(sourceGame, overrides = {}) {
        return {
          name: overrides.name || overrides.playerName || 'STEAM ACE',
          playerName: overrides.playerName || overrides.name || 'STEAM ACE',
          score: overrides.score ?? sourceGame.score,
          level: overrides.level ?? sourceGame.level,
          levelReached: overrides.levelReached ?? sourceGame.level,
          rankIndex: overrides.rankIndex ?? sourceGame.rankIndex ?? 0,
          submissionId: overrides.submissionId || 'runtime-check-submission'
        };
      },
      async submitScore(runResult, options = {}) {
        const payload = {
          target: options.target || 'unknown',
          saveLocal: options.saveLocal === true,
          name: runResult.name || runResult.playerName || 'STEAM ACE',
          playerName: runResult.playerName || runResult.name || 'STEAM ACE',
          score: Math.floor(Number(runResult.score) || 0),
          level: Math.floor(Number(runResult.levelReached || runResult.level) || 0),
          submissionId: runResult.submissionId || null
        };
        window.__overrunScoreSubmissions.push(payload);
        return {
          ...payload,
          score: payload.score,
          localStatus: 'saved',
          localPlacement: 1,
          localEntry: { name: payload.name, playerName: payload.playerName, score: payload.score, level: payload.level },
          steamStatus: 'submitted',
          steamRank: 1,
          globalStatus: 'submitted',
          globalProvider: 'steam',
          updatedAt: new Date().toISOString()
        };
      },
      async getGlobalScoresForPlacement() {
        return [
          { playerName: 'STEAM ACE', score: expectedScore, level: 10, source: 'steam' },
          { playerName: 'ORBIT PAL', score: Math.max(1, expectedScore - 1), level: 9, source: 'steam' }
        ];
      }
    };
    const triggered = play.maybeTriggerOverrunCelebration({
      sectorCleared: 10,
      bossCompletion: true,
      compactHud: false
    });
    return {
      triggered,
      gameScore: game.score,
      runCleared: game.runCleared,
      clearLivesRemaining: game.runClearLivesRemaining,
      clearLifeLosses: game.runClearLifeLosses,
      award: game.runClearScoreBonusAward,
      breakdown: { ...game.scoreBreakdown }
    };
  }, { baseScore, clearBonus, livesBonus, expectedScore });

  assert.equal(immediate.triggered, true, 'runtime clear celebration did not trigger');
  assert.equal(immediate.runCleared, true, 'runtime clear did not mark the run cleared');
  assert.equal(immediate.clearLivesRemaining, 3, 'runtime clear did not snapshot spare hulls');
  assert.equal(immediate.clearLifeLosses, 0, 'runtime clear did not snapshot clean-clear life losses');
  assertScoreInvariant(immediate, 'immediate clear');

  const duplicate = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const beforePauseScore = game.score;
    play.setPaused?.(true);
    play.setPaused?.(false);
    const afterPauseScore = game.score;
    const triggeredAgain = play.maybeTriggerOverrunCelebration({
      sectorCleared: 10,
      bossCompletion: true,
      compactHud: false
    });
    const duplicateAward = game.awardRunClearScoreBonuses?.({ clearBonus: 10000, livesBonus: 7500 });
    return {
      beforePauseScore,
      afterPauseScore,
      triggeredAgain,
      duplicateAward,
      gameScore: game.score,
      award: game.runClearScoreBonusAward,
      breakdown: { ...game.scoreBreakdown }
    };
  });
  assert.equal(duplicate.beforePauseScore, expectedScore, 'score changed before pause/resume check');
  assert.equal(duplicate.afterPauseScore, expectedScore, 'pause/resume changed the clear score');
  assert.equal(duplicate.triggeredAgain, false, 'clear popup should not award again when reopened/retriggered');
  assert.equal(duplicate.duplicateAward?.alreadyApplied, true, 'duplicate award did not report alreadyApplied');
  assertScoreInvariant(duplicate, 'duplicate guard');

  const overrun20 = await page.evaluate(({ clearBonus, livesBonus, expectedScore }) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.level = 20;
    game.lives = livesBonus / 2500;
    game.runCleared = true;
    game.currentScene = play;
    game.currentSceneName = 'play';
    play.lifeLossesThisRun = 1;
    play.gameOverInterlude = null;
    game.gameOverTransitionPending = false;
    const triggered = play.maybeTriggerOverrunCelebration({
      sectorCleared: 20,
      bossCompletion: true,
      compactHud: false
    });
    const scoreAfterFirst = game.score;
    const triggeredAgain = play.maybeTriggerOverrunCelebration({
      sectorCleared: 20,
      bossCompletion: true,
      compactHud: false
    });
    const duplicateAward = game.awardRunClearScoreBonuses?.({
      clearBonus,
      livesBonus,
      awardKey: 'overrun_20'
    });
    return {
      triggered,
      triggeredAgain,
      scoreAfterFirst,
      gameScore: game.score,
      runClearAward: game.runClearScoreBonusAward,
      overrun20Award: game.runClearScoreBonusAwards?.overrun_20,
      duplicateAward,
      breakdown: { ...game.scoreBreakdown },
      expectedOverrunScore: expectedScore + clearBonus + livesBonus
    };
  }, { clearBonus, livesBonus, expectedScore });
  assert.equal(overrun20.triggered, true, 'sector 20 overrun milestone did not trigger');
  assert.equal(overrun20.triggeredAgain, false, 'sector 20 milestone should not retrigger after celebration');
  assert.equal(overrun20.overrun20Award?.awardKey, 'overrun_20', 'sector 20 award should use its own guard key');
  assert.equal(overrun20.overrun20Award?.appliedTotal, clearBonus + livesBonus, 'sector 20 award total mismatch');
  assert.equal(overrun20.scoreAfterFirst, overrun20.expectedOverrunScore, 'sector 20 score was not applied immediately');
  assert.equal(overrun20.gameScore, overrun20.expectedOverrunScore, 'sector 20 duplicate guard changed score');
  assert.equal(overrun20.duplicateAward?.alreadyApplied, true, 'sector 20 duplicate award did not report alreadyApplied');
  assert.equal(overrun20.runClearAward?.awardKey, 'run_clear', 'sector 20 should not replace the sector 10 run-clear award record');
  assert.equal(overrun20.breakdown?.runClearBonus, clearBonus * 2, 'sector 20 should add another milestone clear bonus');
  assert.equal(overrun20.breakdown?.remainingLivesBonus, livesBonus * 2, 'sector 20 should add another spare-hulls bonus');
  assert.equal(overrun20.breakdown?.finalScore, overrun20.expectedOverrunScore, 'sector 20 final score breakdown mismatch');
  expectedFinalScore = overrun20.expectedOverrunScore;

  await page.evaluate(() => window.__game.gameOver({ fromInterlude: true }));
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' &&
      state.gameOver?.lastLeaderboardResult?.steamStatus === 'submitted';
  }, null, { timeout: 15000 });

  const gameOver = await page.evaluate(() => {
    const game = window.__game;
    const scene = game.scenes.gameOver;
    return {
      gameScore: game.score,
      finalScore: scene?.finalScore || 0,
      runSummaryScore: game.runSummary?.score || 0,
      runSummaryFinalScore: game.runSummary?.finalScore || 0,
      runSummaryLifeLosses: game.runSummary?.lifeLosses,
      runSummaryClearLifeLosses: game.runSummary?.clearLifeLosses,
      progressionBestScore: game.runProgressionResult?.next?.bestScore || 0,
      lastLeaderboardResult: game.lastLeaderboardResult || null,
      submissions: [...(window.__overrunScoreSubmissions || [])],
      renderState: JSON.parse(window.render_game_to_text?.() || '{}')
    };
  });
  assert.equal(gameOver.gameScore, expectedFinalScore, 'game.score changed during game over');
  assert.equal(gameOver.finalScore, expectedFinalScore, 'GameOver finalScore did not include overrun milestone bonuses');
  assert.equal(gameOver.runSummaryScore, expectedFinalScore, 'run summary score did not include overrun milestone bonuses');
  assert.equal(gameOver.runSummaryFinalScore, expectedFinalScore, 'run summary finalScore did not include overrun milestone bonuses');
  assert.equal(gameOver.runSummaryLifeLosses, 1, 'run summary should retain the later Overrun life loss');
  assert.equal(gameOver.runSummaryClearLifeLosses, 0, 'run summary should preserve the clean Sector 10 snapshot');
  assert.equal(gameOver.progressionBestScore, expectedFinalScore, 'career/profile best score did not include overrun milestone bonuses');
  assert.equal(gameOver.lastLeaderboardResult?.score, expectedFinalScore, 'last leaderboard result did not include overrun milestone bonuses');
  assert.ok(gameOver.submissions.length >= 1, 'Steam leaderboard submit path was not exercised');
  assert.ok(gameOver.submissions.every((entry) => entry.score === expectedFinalScore), 'Steam submission score did not include overrun milestone bonuses');

  const beforeRetryScore = await page.evaluate(() => window.__game.score);
  await page.evaluate(async () => {
    const scene = window.__game?.scenes?.gameOver;
    if (scene) {
      await scene.submitSteamScore();
    }
  });
  await page.waitForTimeout(250);
  const afterRetry = await page.evaluate(() => ({
    gameScore: window.__game.score,
    finalScore: window.__game?.scenes?.gameOver?.finalScore || 0,
    submissions: [...(window.__overrunScoreSubmissions || [])],
    lastLeaderboardResult: window.__game.lastLeaderboardResult || null
  }));
  assert.equal(beforeRetryScore, expectedFinalScore, 'score was wrong before Steam retry');
  assert.equal(afterRetry.gameScore, expectedFinalScore, 'Steam retry mutated game.score');
  assert.equal(afterRetry.finalScore, expectedFinalScore, 'Steam retry changed finalScore');
  assert.ok(afterRetry.submissions.every((entry) => entry.score === expectedFinalScore), 'Steam retry submitted a score without overrun milestone bonuses');

  const report = {
    ok: true,
    baseUrl,
    baseScore,
    clearBonus,
    livesBonus,
    expectedScore,
    expectedFinalScore,
    immediate,
    duplicate,
    overrun20,
    gameOver,
    afterRetry,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'overrun-clear-score-runtime-report.json'), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(outputDir, 'overrun-clear-score-runtime-gameover.png'), fullPage: true });
  assert.equal(consoleEvents.length, 0, `browser console/page errors: ${JSON.stringify(consoleEvents)}`);
  console.log(`[overrun-clear-score-runtime] PASS expectedScore=${expectedFinalScore} outputDir=${outputDir}`);
} catch (error) {
  const report = {
    ok: false,
    baseUrl,
    baseScore,
    clearBonus,
    livesBonus,
    expectedScore,
    expectedFinalScore,
    consoleEvents,
    error: error?.stack || error?.message || String(error)
  };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'overrun-clear-score-runtime-report.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
}
