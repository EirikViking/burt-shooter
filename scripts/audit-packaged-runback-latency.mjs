import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const exePath = path.resolve('release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR
    || `test-results/packaged-runback-latency-${new Date().toISOString().replace(/[:.]/g, '-')}`
);

async function openPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForCdp(port) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 90000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1500)
      });
      if (response.ok) return;
    } catch {
      // Packaged Chromium is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Packaged CDP endpoint did not start on port ${port}`);
}

async function waitForRenderer(context) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    const page = context.pages().find((candidate) => (
      candidate.url().includes('nova-swarm://') || candidate.url().includes('/index.html')
    ));
    if (page) return page;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Packaged renderer target not found');
}

async function installMonitorAndTrigger(page, inputKind) {
  return page.evaluate(({ kind }) => {
    const scene = window.__game.scenes.gameOver;
    const acceptedAt = performance.now();
    const monitor = {
      acceptedAt,
      firstPlayAt: null,
      firstPlayerAt: null,
      inputAppliedAt: null,
      firstMovementAt: null,
      firstShotAt: null,
      introStartedAt: null,
      introCompletedAt: null,
      firstEnemyAt: null,
      playerStartX: null,
      shotsStart: null,
      sceneHistory: [],
      introTiming: null,
      sampleCount: 0,
      finalState: null
    };
    window.__runbackAuditMonitor = monitor;

    const sample = () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const now = performance.now();
      const sceneName = game?.currentSceneName || null;
      const activeBullets = play?.bulletManager?.playerBullets?.filter?.((bullet) => bullet?.active !== false)?.length || 0;
      const activeEnemies = play?.enemyManager?.enemies?.filter?.((enemy) => enemy?.active !== false)?.length || 0;
      const shots = Number(play?.player?.traitShotCounter) || activeBullets;
      monitor.sampleCount += 1;
      if (!monitor.sceneHistory.includes(sceneName)) monitor.sceneHistory.push(sceneName);
      if (sceneName === 'play' && monitor.firstPlayAt == null) monitor.firstPlayAt = now;
      if (sceneName === 'play' && play?.player && monitor.firstPlayerAt == null) {
        monitor.firstPlayerAt = now;
        monitor.playerStartX = Number(play.player.x) || 0;
        monitor.shotsStart = shots;
      }
      if (sceneName === 'play' && play?.player && monitor.inputAppliedAt == null) {
        monitor.inputAppliedAt = now;
        if (kind === 'controller') {
          window.__burtGamepadOverride = null;
          setTimeout(() => {
            window.__burtGamepadOverride = {
              id: 'runback-audit-gamepad',
              index: 0,
              axes: [1, 0],
              buttons: Array.from({ length: 16 }, (_entry, index) => ({
                pressed: index === 0,
                value: index === 0 ? 1 : 0
              })),
              connected: true
            };
          }, 80);
        } else {
          window.__burtKeyboardOverride = { ArrowRight: true, KeyD: true, Space: true };
        }
      }
      if (monitor.inputAppliedAt != null && play?.player && monitor.firstMovementAt == null
        && Number(play.player.x) > monitor.playerStartX + 0.5) monitor.firstMovementAt = now;
      if (monitor.inputAppliedAt != null && monitor.firstShotAt == null && shots > monitor.shotsStart) monitor.firstShotAt = now;
      if (play?.introActive && monitor.introStartedAt == null) monitor.introStartedAt = now;
      if (play?.introComplete && monitor.introCompletedAt == null) monitor.introCompletedAt = now;
      if (activeEnemies > 0 && monitor.firstEnemyAt == null) monitor.firstEnemyAt = now;
      if (!monitor.introTiming && play?.shipIntroTiming) monitor.introTiming = { ...play.shipIntroTiming };
      monitor.finalState = {
        now,
        scene: sceneName,
        ready: Boolean(play?.isReady),
        introActive: Boolean(play?.introActive),
        introComplete: Boolean(play?.introComplete),
        player: play?.player ? { x: Number(play.player.x) || 0, y: Number(play.player.y) || 0 } : null,
        shots,
        activeBullets,
        activeEnemies,
        enemyState: play?.enemyManager?.state || null
      };
      if (now - acceptedAt < 10000) requestAnimationFrame(sample);
      else {
        window.__burtKeyboardOverride = null;
        window.__burtGamepadOverride = null;
      }
    };
    requestAnimationFrame(sample);

    if (kind === 'keyboard') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    } else if (kind === 'click') {
      scene.retryButton.emit('pointerdown', { type: 'pointerdown', button: 0 });
    } else {
      window.__burtGamepadOverride = {
        id: 'runback-audit-gamepad',
        index: 0,
        axes: [0, 0],
        buttons: Array.from({ length: 16 }, (_entry, index) => ({
          pressed: index === 0,
          value: index === 0 ? 1 : 0
        })),
        connected: true
      };
    }
    return acceptedAt;
  }, { kind: inputKind });
}

function finalizeTiming(monitor) {
  const fromAccepted = (value) => value == null ? null : value - monitor.acceptedAt;
  return {
    ...monitor,
    durationsMs: {
      acceptedToPlay: fromAccepted(monitor.firstPlayAt),
      acceptedToPlayer: fromAccepted(monitor.firstPlayerAt),
      acceptedToMovement: fromAccepted(monitor.firstMovementAt),
      acceptedToShot: fromAccepted(monitor.firstShotAt),
      acceptedToIntroStart: fromAccepted(monitor.introStartedAt),
      acceptedToIntroComplete: fromAccepted(monitor.introCompletedAt),
      acceptedToFirstEnemy: fromAccepted(monitor.firstEnemyAt),
      playToMovement: monitor.firstMovementAt == null || monitor.firstPlayAt == null ? null : monitor.firstMovementAt - monitor.firstPlayAt,
      playToShot: monitor.firstShotAt == null || monitor.firstPlayAt == null ? null : monitor.firstShotAt - monitor.firstPlayAt
    }
  };
}

async function runCase({ name, resultKind, inputKind }) {
  const caseDir = path.join(outputDir, name);
  mkdirSync(caseDir, { recursive: true });
  const port = await openPort();
  const child = spawn(exePath, ['--windowed', `--remote-debugging-port=${port}`], {
    cwd: root,
    windowsHide: true,
    env: { ...process.env, NOVA_SWARM_USER_DATA_DIR: path.join(caseDir, 'userData') },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(String(chunk)));
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)));

  let browser;
  let page;
  const consoleErrors = [];
  const pageErrors = [];
  try {
    await waitForCdp(port);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    page = await waitForRenderer(browser.contexts()[0]);
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error?.message || String(error)));
    await page.setViewportSize({ width: 1280, height: 720 });
    const runUrl = new URL(page.url());
    runUrl.searchParams.set('desktop', '1');
    runUrl.searchParams.set('offlineLeaderboard', '1');
    await page.goto(runUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });

    const setup = await page.evaluate(async ({ resultKind: kind }) => {
      const game = window.__game;
      let selectedHullReadyAtGameOver = true;
      window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
      const startAndFinish = async () => {
        await game.startGame(game.selectedShipSpriteKey, {
          runMode: 'mayhem_tactical',
          inputDevice: 'keyboard',
          countShipUsage: false
        });
        const waitStarted = performance.now();
        while (game.scenes.play?.shipIntroAgencyState !== 'complete' && performance.now() - waitStarted < 10000) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        selectedHullReadyAtGameOver &&= game.scenes.play?.shipIntroAgencyState === 'complete'
          && Boolean(game.scenes.play?.player?.shipSprite?.texture);
        game.gameOver();
      };
      await startAndFinish();
      if (kind === 'ordinary') await startAndFinish();
      const scene = game.scenes.gameOver;
      const waitStarted = performance.now();
      while (scene.state !== 'runback' && performance.now() - waitStarted < 12000) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const naturalRunback = scene.state === 'runback';
      if (!naturalRunback) scene.enterRunbackStage?.('audit_timeout_fallback');

      window.__runbackAuditTrace = {
        setupCompleteAt: performance.now(),
        naturalRunback,
        resultKind: kind,
        gameStartCalledAt: null,
        gameStartResolvedAt: null,
        restartCalledAt: null
      };
      const originalStartGame = game.startGame.bind(game);
      game.startGame = async (...args) => {
        window.__runbackAuditTrace.gameStartCalledAt = performance.now();
        const result = await originalStartGame(...args);
        window.__runbackAuditTrace.gameStartResolvedAt = performance.now();
        return result;
      };
      const originalRestart = scene.restartRun.bind(scene);
      scene.restartRun = (...args) => {
        window.__runbackAuditTrace.restartCalledAt = performance.now();
        return originalRestart(...args);
      };
      return {
        naturalRunback,
        state: scene.state,
        firstFlightResult: Boolean(scene.firstFlightResult),
        selectedHullReadyAtGameOver,
        cta: scene.getPrimaryCtaConfig?.() || null,
        build: JSON.parse(window.render_game_to_text?.() || '{}')?.gitSha || null
      };
    }, { resultKind });

    await page.screenshot({ path: path.join(caseDir, '00-runback-ready.png') });
    const acceptedAt = await installMonitorAndTrigger(page, inputKind);
    await page.waitForFunction(() => window.__runbackAuditTrace?.restartCalledAt != null, null, { timeout: 3000, polling: 10 });
    await new Promise((resolve) => setTimeout(resolve, 10500));
    const timing = finalizeTiming(await page.evaluate(() => window.__runbackAuditMonitor));
    await page.screenshot({ path: path.join(caseDir, '01-first-controllable-frame.png') });
    const trace = await page.evaluate(() => window.__runbackAuditTrace);
    const report = { name, resultKind, inputKind, setup, trace, timing, consoleErrors, pageErrors };
    writeFileSync(path.join(caseDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    return report;
  } finally {
    if (page) await page.evaluate(() => window.__novaApp?.exitGame?.()).catch(() => {});
    await browser?.close().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (!child.killed) child.kill();
    writeFileSync(path.join(caseDir, 'process.log'), `${stdout.join('')}\n${stderr.join('')}`);
  }
}

if (!existsSync(exePath)) throw new Error(`Packaged executable not found: ${exePath}`);
mkdirSync(outputDir, { recursive: true });

const matrix = [];
for (const resultKind of ['first_flight', 'ordinary']) {
  for (const inputKind of ['keyboard', 'click', 'controller']) {
    matrix.push(await runCase({ name: `${resultKind}-${inputKind}`, resultKind, inputKind }));
  }
}

for (const entry of matrix) {
  assert(entry.setup.naturalRunback, `${entry.name}: runback CTA did not become ready naturally`);
  assert(entry.setup.selectedHullReadyAtGameOver, `${entry.name}: selected hull was not ready before the warm retry`);
  assert.equal(entry.timing.sceneHistory.includes('menu'), false, `${entry.name}: flashed menu during restart`);
  assert.equal(entry.timing.sceneHistory.includes('shipSelect'), false, `${entry.name}: flashed Hangar during restart`);
  assert.equal(entry.timing.introTiming?.totalMs, 420, `${entry.name}: did not use the warm retry intro`);
  assert(entry.timing.durationsMs.acceptedToIntroStart != null, `${entry.name}: intro never started`);
  assert(entry.timing.durationsMs.acceptedToIntroComplete != null, `${entry.name}: intro never completed`);
  assert(entry.timing.durationsMs.acceptedToMovement != null, `${entry.name}: movement never became active`);
  assert(entry.timing.durationsMs.acceptedToShot != null, `${entry.name}: firing never became active`);
  assert(
    entry.timing.firstMovementAt >= entry.timing.introCompletedAt,
    `${entry.name}: movement became active before the arrival completed`
  );
  assert(
    entry.timing.firstShotAt >= entry.timing.introCompletedAt,
    `${entry.name}: firing became active before the arrival completed`
  );
  assert(
    Math.max(entry.timing.durationsMs.acceptedToMovement, entry.timing.durationsMs.acceptedToShot) <= 750,
    `${entry.name}: controllable retry exceeded the 750ms budget`
  );
  assert.equal(entry.pageErrors.length, 0, `${entry.name}: page errors: ${entry.pageErrors.join('; ')}`);
}

const summary = {
  status: 'passed',
  exePath,
  outputDir,
  cases: matrix.map((entry) => ({
    name: entry.name,
    build: entry.setup.build,
    naturalRunback: entry.setup.naturalRunback,
    firstFlightResult: entry.setup.firstFlightResult,
    sceneHistory: entry.timing.sceneHistory,
    introTiming: entry.timing.introTiming,
    durationsMs: entry.timing.durationsMs,
    consoleErrors: entry.consoleErrors,
    pageErrors: entry.pageErrors
  }))
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`[packaged-runback-latency] PASS report=${path.join(outputDir, 'report.json')}`);
console.log(JSON.stringify(summary.cases, null, 2));
