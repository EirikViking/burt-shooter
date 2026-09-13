import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4488));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/personal-best-celebration-${timestamp()}`);
const targetScore = 50000;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
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
  throw new Error(`No available personal-best check port found starting at ${startPort}`);
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.route('**/api/highscores', async (route) => {
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' });
  });
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.hud, null, {
    timeout: 30000
  });

  const setup = await page.evaluate((target) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) return { ok: false };
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState?.();
    game.runMode = 'ranked';
    game.score = target;
    game.personalBestLiveCelebrated = false;
    game.highscoreChase = {
      targetScore: target,
      runMode: 'ranked',
      source: 'test_personal_best',
      syncingTarget: false,
      checkpoint: null,
      surpassed: false,
      celebrationFired: false,
      celebrationScore: 0,
      milestones: new Set(['25', '50', '75', '90']),
      lastTauntAtMs: 0,
      tauntIndex: 0
    };
    game.updateHighscoreChaseCues();
    return {
      ok: true,
      equality: play.getPersonalBestCelebrationDebugState(),
      chase: {
        celebrationFired: game.highscoreChase.celebrationFired,
        surpassed: game.highscoreChase.surpassed
      }
    };
  }, targetScore);

  const syncingGate = await page.evaluate((target) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.highscoreChase.syncingTarget = true;
    game.score = target + 1;
    game.updateHighscoreChaseCues();
    const result = {
      celebration: play.getPersonalBestCelebrationDebugState(),
      celebrationFired: game.highscoreChase.celebrationFired,
      surpassed: game.highscoreChase.surpassed
    };
    game.score = target;
    game.highscoreChase.syncingTarget = false;
    play.clearToastState?.();
    return result;
  }, targetScore);

  const crossingKick = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const applied = game.addScore(10, 'baseScore');
    return {
      applied,
      score: game.score,
      finalScoreLocked: game.finalScoreLocked,
      currentSceneName: game.currentSceneName,
      currentSceneMatchesPlay: game.currentScene === play,
      shouldDefer: play.shouldDeferActiveGameplayPersistence(),
      deferredCueRequested: play.deferredScoreCueRefreshRequested,
      chase: {
        targetScore: game.highscoreChase.targetScore,
        runMode: game.highscoreChase.runMode,
        syncingTarget: game.highscoreChase.syncingTarget,
        celebrationFired: game.highscoreChase.celebrationFired
      }
    };
  });
  console.log(`[personal-best-celebration] crossing kick ${JSON.stringify(crossingKick)}`);
  await page.waitForFunction(() => window.__game?.highscoreChase?.celebrationFired === true, null, { timeout: 5000 });
  const crossing = await page.evaluate((kick) => {
    const game = window.__game;
    const play = game.scenes.play;
    return {
      ...kick,
      score: game.score,
      liveCelebrated: game.personalBestLiveCelebrated,
      chase: {
        celebrationFired: game.highscoreChase.celebrationFired,
        celebrationScore: game.highscoreChase.celebrationScore,
        surpassed: game.highscoreChase.surpassed,
        milestones: [...game.highscoreChase.milestones]
      },
      celebration: play.getPersonalBestCelebrationDebugState()
    };
  }, crossingKick);

  await page.waitForTimeout(620);
  const liveCounter = await page.evaluate((target) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.score = target + 1789;
    game.updateHighscoreChaseCues();
    return new Promise((resolve) => {
      setTimeout(() => {
        const textState = JSON.parse(window.render_game_to_text());
        resolve({
          celebration: play.getPersonalBestCelebrationDebugState(),
          chase: {
            celebrationFired: game.highscoreChase.celebrationFired,
            celebrationScore: game.highscoreChase.celebrationScore
          },
          textState: {
            highscoreChase: textState.highscoreChase,
            personalBestCelebration: textState.personalBestCelebration
          }
        });
      }, 100);
    });
  }, targetScore);

  const screenshot = path.join(outputDir, 'personal-best-celebration.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.waitForFunction(() => window.__game.scenes.play.getPersonalBestCelebrationDebugState().phase === 'hold', null, {
    timeout: 4000
  });
  const settled = await page.evaluate(() => window.__game.scenes.play.getPersonalBestCelebrationDebugState());
  const settledScreenshot = path.join(outputDir, 'personal-best-settled-hold.png');
  await page.screenshot({ path: settledScreenshot, fullPage: true });

  const pauseBefore = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.setPaused(true);
    return play.getPersonalBestCelebrationDebugState();
  });
  await page.waitForTimeout(1100);
  const pauseHeld = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const state = play.getPersonalBestCelebrationDebugState();
    play.setPaused(false);
    return state;
  });
  await page.evaluate(() => {
    const active = window.__game.scenes.play.activePersonalBestCelebration;
    active.elapsedMs = Math.max(active.elapsedMs, active.durationMs - 120);
  });
  await page.waitForFunction(() => window.__game.scenes.play.getPersonalBestCelebrationDebugState().active === false, null, {
    timeout: 3000
  });
  const completed = await page.evaluate(() => window.__game.scenes.play.getPersonalBestCelebrationDebugState());

  const transitionTarget = 70000;
  const transitionKick = await page.evaluate((target) => {
    const game = window.__game;
    const play = game.scenes.play;
    play.clearToastState?.();
    game.score = target;
    game.finalScoreLocked = false;
    game.finalScoreSnapshot = null;
    game.finalScoreLockReason = null;
    game.runFinalized = false;
    game.runSummary = null;
    game.runProgressionResult = null;
    game.personalBestLiveCelebrated = false;
    game.highscoreChase = {
      targetScore: target,
      runMode: 'ranked',
      source: 'test_personal_best_transition',
      syncingTarget: false,
      checkpoint: null,
      surpassed: false,
      celebrationFired: false,
      celebrationScore: 0,
      milestones: new Set(['25', '50', '75', '90']),
      lastTauntAtMs: 0,
      tauntIndex: 0
    };
    game.addScore(25, 'baseScore');
    return {
      score: game.score,
      celebration: play.getPersonalBestCelebrationDebugState()
    };
  }, transitionTarget);
  await page.waitForFunction(() => window.__game.scenes.play.getPersonalBestCelebrationDebugState().active === true, null, {
    timeout: 3000
  });
  await page.waitForTimeout(520);
  const transitionStarted = await page.evaluate(() => window.__game.scenes.play.getPersonalBestCelebrationDebugState());
  await page.evaluate(() => {
    globalThis.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    const game = window.__game;
    game.level = 6;
    game.gameOver();
  });
  await page.waitForFunction(() => (
    window.__game?.currentSceneName === 'gameOver'
    && window.__game?.scenes?.gameOver?.getPersonalBestCarryDebugState?.().active === true
  ), null, { timeout: 20000 });
  const transitionCarry = await page.evaluate(() => JSON.parse(window.render_game_to_text()).gameOver.personalBestCarry);
  const transitionScreenshot = path.join(outputDir, 'personal-best-gameover-carry.png');
  await page.screenshot({ path: transitionScreenshot, fullPage: true });
  await page.waitForTimeout(850);
  const carryAfterHold = await page.evaluate(() => window.__game.scenes.gameOver.getPersonalBestCarryDebugState());
  await page.evaluate(() => {
    const state = window.__game.scenes.gameOver.personalBestCarryState;
    state.elapsedMs = Math.max(state.elapsedMs, state.durationMs - 100);
  });
  await page.waitForFunction(() => window.__game.scenes.gameOver.getPersonalBestCarryDebugState().active === false, null, {
    timeout: 3000
  });
  const carryCompleted = await page.evaluate(() => ({
    banner: window.__game.scenes.gameOver.getPersonalBestCarryDebugState(),
    gameCarry: window.__game.personalBestCelebrationCarry
  }));

  assert.equal(setup.ok, true, 'personal-best setup should attach to the live PlayScene');
  assert.equal(setup.equality.active, false, 'matching the old score must not trigger the celebration');
  assert.equal(setup.chase.celebrationFired, false, 'matching the old score must not consume the one-shot trigger');
  assert.equal(syncingGate.celebration.active, false, 'celebration must wait while the known personal best is syncing');
  assert.equal(syncingGate.celebrationFired, false, 'syncing must not consume the one-shot trigger');
  assert.equal(crossing.liveCelebrated, true, 'strictly beating the target through addScore should trigger live celebration');
  assert.equal(crossing.chase.celebrationFired, true, 'high-score chase should remember the one-shot celebration');
  assert.equal(crossing.chase.surpassed, true, 'strict crossing should mark the target surpassed');
  assert.ok(crossing.score > targetScore, 'the production score path should exceed the target');
  assert.equal(crossing.celebration.active, true, 'celebration overlay should be active at crossing');
  assert.equal(crossing.celebration.overlayCount, 1, 'only one celebration overlay should exist');
  assert.equal(crossing.celebration.scoreNeutral, true, 'celebration should not grant score or rewards');
  assert.equal(crossing.celebration.hasCrown, true, 'celebration should include the record crown');
  assert.equal(crossing.celebration.hasLiveCounter, true, 'celebration should include a live record counter');
  assert.ok(crossing.celebration.rayCount >= 10, 'celebration should include a radial energy burst');
  assert.ok(crossing.celebration.sparkCount >= 14, 'celebration should include a spark field');
  assert.equal(liveCounter.celebration.overlayCount, 1, 'subsequent score updates must not duplicate the overlay');
  assert.equal(liveCounter.celebration.currentScore, targetScore + 1789, 'live record counter should keep climbing');
  assert.equal(liveCounter.celebration.delta, 1789, 'live record advantage should track the current lead');
  assert.equal(liveCounter.textState.highscoreChase.celebrationFired, true, 'render_game_to_text should expose the one-shot trigger');
  assert.equal(liveCounter.textState.personalBestCelebration.active, true, 'render_game_to_text should expose the visible celebration');
  assert.ok(liveCounter.celebration.durationMs >= 6200, 'celebration should linger long enough to read');
  assert.equal(settled.settled, true, 'celebration should settle into its compact gameplay-safe hold');
  assert.equal(settled.phase, 'hold', 'celebration should expose a stable hold phase');
  assert.equal(pauseBefore.active, true, 'celebration should remain active when pause opens');
  assert.equal(pauseHeld.active, true, 'celebration should remain active throughout pause');
  assert.ok(Math.abs(pauseHeld.elapsedMs - pauseBefore.elapsedMs) <= 50, `pause advanced celebration time by ${pauseHeld.elapsedMs - pauseBefore.elapsedMs}ms`);
  assert.equal(completed.active, false, 'celebration should clean itself up');
  assert.equal(completed.overlayCount, 0, 'celebration overlay should be removed after completion');
  assert.equal(completed.completed, true, 'debug state should record natural completion');
  assert.equal(transitionStarted.active, true, 'second personal-best crossing should start a transition test celebration');
  assert.equal(transitionCarry.active, true, 'Game Over should receive the active personal-best celebration');
  assert.equal(transitionCarry.visible, true, 'Game Over personal-best carry should be visible');
  assert.equal(transitionCarry.previousScore, transitionTarget, 'Game Over carry should preserve the old record');
  assert.equal(transitionCarry.currentScore, transitionKick.score, 'Game Over carry should preserve the final live record');
  assert.equal(transitionCarry.handoffReason, 'game_over_transition', 'Game Over carry should report an intentional handoff');
  assert.ok(transitionCarry.durationMs >= 4200, 'Game Over carry should linger for at least 4.2 seconds');
  assert.ok(transitionCarry.bounds?.width > 300, 'Game Over carry should expose a readable compact banner');
  assert.ok(carryAfterHold.elapsedMs > transitionCarry.elapsedMs, 'Game Over carry should advance while visible');
  assert.equal(carryCompleted.banner.active, false, 'Game Over carry should clean itself up');
  assert.equal(carryCompleted.gameCarry, null, 'Game Over carry state should clear after completion');
  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('; ')}`);
  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: true,
    baseUrl,
    targetScore,
    setup,
    syncingGate,
    crossing,
    liveCounter,
    settled,
    pauseBefore,
    pauseHeld,
    completed,
    transitionKick,
    transitionStarted,
    transitionCarry,
    carryAfterHold,
    carryCompleted,
    screenshot,
    settledScreenshot,
    transitionScreenshot,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[personal-best-celebration] PASS target=${targetScore} trigger=${crossing.score} live=${liveCounter.celebration.currentScore} screenshot=${screenshot}`);
  await page.close();
} catch (error) {
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: false, baseUrl, error: error.message }, null, 2)}\n`);
  console.error(`[personal-best-celebration] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
