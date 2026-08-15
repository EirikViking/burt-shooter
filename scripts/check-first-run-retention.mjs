import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4862));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/first-run-retention-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available port starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not start at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function seedProfile(page, totalRuns, locale = 'en', uiScale = 1) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(({ runs, language, scale }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', language);
    localStorage.setItem('nova_ui_scale_v1', String(scale));
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: runs }));
  }, { runs: totalRuns, language: locale, scale: uiScale });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
}

async function startRanked(page, inputDevice = 'keyboard') {
  await page.evaluate(async (device) => {
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    await window.__game?.startGame?.(undefined, { runMode: 'ranked', inputDevice: device });
  }, inputDevice);
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function driveFocusDensity(page, { activeCount, target = 0, level = target, advanceMs = 0 } = {}) {
  return page.evaluate((payload) => {
    const play = window.__game?.scenes?.play;
    play.gameTime += Math.max(0, Number(payload.advanceMs) || 0) / 1000;
    play.bulletManager.cleanupDiagnostics.friendlyVfxCompression = {
      enabled: true,
      activeRoutineCount: Math.max(0, Math.floor(Number(payload.activeCount) || 0)),
      startCount: play.bulletManager.friendlyVfxCompressionStartCount,
      fullCount: play.bulletManager.friendlyVfxCompressionFullCount,
      target: Math.max(0, Number(payload.target) || 0),
      level: Math.max(0, Number(payload.level) || 0)
    };
    play.updateFirstRunOnboarding();
    return JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding;
  }, { activeCount, target, level, advanceMs });
}

async function driveFocusDensitySequence(page, steps = []) {
  return page.evaluate((payload) => {
    const play = window.__game?.scenes?.play;
    return payload.map((step) => {
      play.gameTime += Math.max(0, Number(step.advanceMs) || 0) / 1000;
      play.bulletManager.cleanupDiagnostics.friendlyVfxCompression = {
        enabled: true,
        activeRoutineCount: Math.max(0, Math.floor(Number(step.activeCount) || 0)),
        startCount: play.bulletManager.friendlyVfxCompressionStartCount,
        fullCount: play.bulletManager.friendlyVfxCompressionFullCount,
        target: Math.max(0, Number(step.target) || 0),
        level: Math.max(0, Number(step.level ?? step.target) || 0)
      };
      play.updateFirstRunOnboarding();
      return JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding;
    });
  }, steps);
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const chromePath = findChrome();
const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
const report = { outputDir, scenarios: [] };

try {
  const keyboard = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const keyboardErrors = [];
  keyboard.on('pageerror', (error) => keyboardErrors.push(error.message));
  await seedProfile(keyboard, 0);
  await startRanked(keyboard);
  await keyboard.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.toast?.firstRunOnboarding?.stage === 'opening'
      && (state.toast?.active || []).some((toast) => toast.type === 'firstRunControlsOpening');
  }, null, { timeout: 20000 });

  const opening = await readState(keyboard);
  const openingToast = opening.toast.active.find((toast) => toast.type === 'firstRunControlsOpening');
  const openingRuntime = await keyboard.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.__firstRunOriginalEnemyUpdate = play.enemyManager.update;
    play.enemyManager.update = () => {};
    return {
      enemies: (play.enemyManager?.enemies || []).filter((enemy) => enemy?.active).length,
      pendingEnemyStart: Boolean(play.pendingEnemyStartTimeout),
      experimentPrompt: (() => {
        const saved = play.game.lateGameExperiment;
        play.game.lateGameExperiment = { active: true };
        const result = play.getFirstRunControlsNudge();
        play.game.lateGameExperiment = saved;
        return result;
      })()
    };
  });
  assert.match(openingToast?.message || '', /MOVE.*WASD \/ ARROWS.*SHOOT.*SPACE/);
  assert.doesNotMatch(openingToast?.message || '', /PAUSE|PHASE|FOCUS/i);
  assert.equal(openingRuntime.enemies, 0, 'enemies must remain held before the opening beat is demonstrated');
  assert.equal(openingRuntime.pendingEnemyStart, true, 'opening beat must own a finite enemy-start hold');
  assert.equal(openingRuntime.experimentPrompt, null, 'experimental runs must not inherit normal first-run onboarding');
  const openingShot = path.join(outputDir, 'keyboard-opening-1280x720.png');
  await keyboard.screenshot({ path: openingShot, fullPage: true });

  const actionStartedAt = Date.now();
  await keyboard.evaluate(() => {
    window.__burtKeyboardOverride = { KeyD: true, Space: true };
  });
  await keyboard.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage === 'awaiting_phase', null, { timeout: 3000 });
  const actionElapsedMs = Date.now() - actionStartedAt;
  assert.ok(actionElapsedMs < 2500, `demonstrated opening actions should dismiss early (${actionElapsedMs}ms)`);
  await keyboard.evaluate(() => { delete window.__burtKeyboardOverride; });
  const afterOpening = await readState(keyboard);
  assert.equal((afterOpening.toast?.active || []).some((toast) => toast.type === 'firstRunControlsOpening'), false);
  assert.equal((afterOpening.toast?.active || []).some((toast) => toast.type === 'firstRunControlsPhase'), false, 'Phase lesson must wait for a visible hostile projectile');
  assert.equal((afterOpening.toast?.active || []).some((toast) => toast.type === 'firstRunControlsFocus'), false, 'Focus lesson must wait for meaningful friendly density');

  await keyboard.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const bullet = { active: true, x: play.game.getWidth() / 2, y: 180, sprite: { visible: true } };
    play.bulletManager.enemyBullets.push(bullet);
    play.updateFirstRunOnboarding();
    play.bulletManager.enemyBullets = play.bulletManager.enemyBullets.filter((entry) => entry !== bullet);
  });
  await keyboard.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.toast?.firstRunOnboarding?.stage === 'phase'
      && (state.toast?.active || []).some((toast) => toast.type === 'firstRunControlsPhase');
  }, null, { timeout: 3000 });
  const phase = await readState(keyboard);
  const phaseToast = phase.toast.active.find((toast) => toast.type === 'firstRunControlsPhase');
  assert.match(phaseToast?.message || '', /PHASE.*SHIFT/);
  assert.doesNotMatch(phaseToast?.message || '', /FOCUS|CTRL/);
  assert.equal(phase.toast.active.filter((toast) => /firstRunControls/.test(toast.type || '')).length, 1, 'onboarding beats must never stack');
  const phaseShot = path.join(outputDir, 'keyboard-phase-1280x720.png');
  await keyboard.screenshot({ path: phaseShot, fullPage: true });

  await keyboard.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.player.startDodge?.();
    play.updateFirstRunOnboarding();
  });
  await keyboard.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage === 'focus_pending', null, { timeout: 3000 });

  const lowDensity = await driveFocusDensity(keyboard, { activeCount: 70, target: 0.25, advanceMs: 400 });
  assert.equal(lowDensity.stage, 'focus_pending');
  assert.equal(lowDensity.focusDensity.enterCount, 87);
  assert.equal(lowDensity.focusDensity.exitCount, 59);
  assert.equal((await readState(keyboard)).toast.active.some((toast) => toast.type === 'firstRunControlsFocus'), false);

  await keyboard.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.enqueueToast('TACTICAL PRIORITY FIXTURE', {
      slot: 'top',
      type: 'fixture_priority',
      priority: 6,
      duration: 10000,
      minVisibleMs: 0,
      bypassFocusLock: true
    });
  });
  const [shortCrossingStart, shortCrossing, sustainedDeferred] = await driveFocusDensitySequence(keyboard, [
    { activeCount: 90, target: 0.45, advanceMs: 0 },
    { activeCount: 90, target: 0.45, advanceMs: 200 },
    { activeCount: 90, target: 0.45, advanceMs: 60 }
  ]);
  assert.equal(shortCrossingStart.stage, 'focus_pending');
  assert.equal(shortCrossing.stage, 'focus_pending', 'crossing shorter than 250ms must not arm Focus');
  assert.equal(sustainedDeferred.stage, 'focus_armed', 'qualifying density should arm while tactical communication owns the lane');
  assert.equal((await readState(keyboard)).toast.active.some((toast) => toast.type === 'firstRunControlsFocus'), false, 'Focus must not overlap tactical communication');
  const [, staleOpportunity] = await driveFocusDensitySequence(keyboard, [
    { activeCount: 50, target: 0, level: 0, advanceMs: 0 },
    { activeCount: 50, target: 0, level: 0, advanceMs: 520 }
  ]);
  assert.equal(staleOpportunity.stage, 'focus_pending', 'deferred Focus opportunity must clear after density crosses the exit hysteresis');
  await keyboard.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.cancelNotificationTypes(['fixture_priority'], 'fixture_complete');
    play.toastSlotLockUntil.top = 0;
  });
  await driveFocusDensitySequence(keyboard, [
    { activeCount: 90, target: 0.45, advanceMs: 0 },
    { activeCount: 90, target: 0.45, advanceMs: 260 }
  ]);
  await keyboard.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.toast?.firstRunOnboarding?.stage === 'focus'
      && (state.toast?.active || []).some((toast) => toast.type === 'firstRunControlsFocus');
  }, null, { timeout: 3000 });
  const focus = await readState(keyboard);
  const focusToast = focus.toast.active.find((toast) => toast.type === 'firstRunControlsFocus');
  assert.match(focusToast?.message || '', /FOCUS.*CTRL/);
  assert.doesNotMatch(focusToast?.message || '', /PHASE|SHIFT/);
  assert.equal(focus.toast.active.filter((toast) => /firstRunControls/.test(toast.type || '')).length, 1, 'Phase and Focus lessons must never stack');
  const focusShot = path.join(outputDir, 'keyboard-focus-1280x720.png');
  await keyboard.screenshot({ path: focusShot, fullPage: true });

  await keyboard.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.player.focusRequested = true;
    play.updateFirstRunOnboarding();
  });
  await keyboard.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.complete === true, null, { timeout: 3000 });
  const complete = await readState(keyboard);
  assert.equal(complete.toast.firstRunOnboarding.completion?.reason, 'actions_complete');
  assert.equal((complete.toast.active || []).some((toast) => /firstRunControls/.test(toast.type || '')), false);
  assert.deepEqual(keyboardErrors, []);
  report.scenarios.push({
    id: 'keyboard-contextual-beats',
    actionElapsedMs,
    openingShot,
    phaseShot,
    focusShot,
    thresholds: focus.toast.firstRunOnboarding.focusDensity,
    completion: complete.toast.firstRunOnboarding.completion
  });
  await keyboard.close();

  const fallback = await browser.newPage({ viewport: { width: 960, height: 640 } });
  await seedProfile(fallback, 0);
  await startRanked(fallback);
  await fallback.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage === 'opening', null, { timeout: 20000 });
  const fallbackStartedAt = Date.now();
  await fallback.waitForFunction(() => {
    const stage = JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage;
    return stage === 'awaiting_phase' || stage === 'phase' || stage === 'focus_pending' || stage === 'complete';
  }, null, { timeout: 5200 });
  const fallbackElapsedMs = Date.now() - fallbackStartedAt;
  assert.ok(fallbackElapsedMs >= 3300 && fallbackElapsedMs <= 5000, `opening fallback must remain finite and near 3.8s (${fallbackElapsedMs}ms)`);
  report.scenarios.push({ id: 'opening-fallback', elapsedMs: fallbackElapsedMs });
  await fallback.close();

  const controller = await browser.newPage({ viewport: { width: 960, height: 640 } });
  await seedProfile(controller, 0);
  await controller.evaluate(() => {
    window.__burtGamepadOverride = {
      connected: true,
      id: 'Nova Virtual Controller',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
    };
  });
  await startRanked(controller, 'controller');
  await controller.waitForFunction(() => (JSON.parse(window.render_game_to_text?.() || '{}').toast?.active || []).some((toast) => toast.type === 'firstRunControlsOpening'), null, { timeout: 20000 });
  const controllerState = await readState(controller);
  const controllerToast = controllerState.toast.active.find((toast) => toast.type === 'firstRunControlsOpening');
  assert.match(controllerToast?.message || '', /MOVE.*STICK \/ D-PAD.*SHOOT.*A \/ RT/);
  const controllerShot = path.join(outputDir, 'controller-opening-960x640.png');
  await controller.screenshot({ path: controllerShot, fullPage: true });
  await controller.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.firstRunOnboardingActions.moved = true;
    play.firstRunOnboardingActions.fired = true;
    play.finishFirstRunOpening('controller_fixture');
    const bullet = { active: true, x: play.game.getWidth() / 2, y: 180, sprite: { visible: true } };
    play.bulletManager.enemyBullets.push(bullet);
    play.updateFirstRunOnboarding();
    play.bulletManager.enemyBullets = play.bulletManager.enemyBullets.filter((entry) => entry !== bullet);
  });
  await controller.waitForFunction(() => (JSON.parse(window.render_game_to_text?.() || '{}').toast?.active || []).some((toast) => toast.type === 'firstRunControlsPhase'), null, { timeout: 3000 });
  const controllerPhase = await readState(controller);
  assert.match(controllerPhase.toast.active.find((toast) => toast.type === 'firstRunControlsPhase')?.message || '', /PHASE.*B \/ LB/);
  assert.doesNotMatch(controllerPhase.toast.active.find((toast) => toast.type === 'firstRunControlsPhase')?.message || '', /FOCUS|LT/);
  await controller.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.firstRunOnboardingActions.phased = true;
    play.updateFirstRunOnboarding();
  });
  await driveFocusDensitySequence(controller, [
    { activeCount: 90, target: 0.45, advanceMs: 0 },
    { activeCount: 90, target: 0.45, advanceMs: 260 }
  ]);
  await controller.waitForFunction(() => (JSON.parse(window.render_game_to_text?.() || '{}').toast?.active || []).some((toast) => toast.type === 'firstRunControlsFocus'), null, { timeout: 3000 });
  const controllerFocus = await readState(controller);
  assert.match(controllerFocus.toast.active.find((toast) => toast.type === 'firstRunControlsFocus')?.message || '', /FOCUS.*LT/);
  assert.doesNotMatch(controllerFocus.toast.active.find((toast) => toast.type === 'firstRunControlsFocus')?.message || '', /PHASE|B \/ LB/);
  const controllerFocusShot = path.join(outputDir, 'controller-focus-960x640.png');
  await controller.screenshot({ path: controllerFocusShot, fullPage: true });
  report.scenarios.push({ id: 'controller-copy-and-layout', openingScreenshot: controllerShot, focusScreenshot: controllerFocusShot });
  await controller.close();

  const prelearned = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await seedProfile(prelearned, 0);
  await startRanked(prelearned);
  await prelearned.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage === 'opening', null, { timeout: 20000 });
  await prelearned.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.player.focusRequested = true;
    play.firstRunOnboardingActions.focused = true;
    play.firstRunOnboardingActions.moved = true;
    play.firstRunOnboardingActions.fired = true;
    play.finishFirstRunOpening('prelearned_fixture');
    play.firstRunOnboardingActions.phased = true;
    play.updateFirstRunOnboarding();
  });
  await prelearned.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.complete === true, null, { timeout: 3000 });
  const prelearnedState = await readState(prelearned);
  assert.equal(prelearnedState.toast.firstRunOnboarding.completion?.reason, 'focus_prelearned');
  assert.equal(prelearnedState.toast.firstRunOnboarding.focusShownAt, 0);
  assert.equal((prelearnedState.toast.active || []).some((toast) => toast.type === 'firstRunControlsFocus'), false);
  report.scenarios.push({ id: 'prelearned-focus-suppresses-prompt' });
  await prelearned.close();

  const returning = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await seedProfile(returning, 1);
  await startRanked(returning);
  await returning.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipIntro?.complete === true, null, { timeout: 15000 });
  await returning.waitForTimeout(800);
  const returningState = await readState(returning);
  assert.equal(returningState.toast?.firstRunOnboarding?.complete, true);
  assert.equal((returningState.toast?.active || []).some((toast) => /firstRunControls/.test(toast.type || '')), false, 'returning runs must preserve shipped presentation');
  report.scenarios.push({ id: 'returning-run-parity' });
  await returning.close();

  const localeExpectations = {
    en: /FOCUS.*CTRL/,
    de: /FOKUS.*STRG/,
    es: /ENFOQUE.*CTRL/,
    ru: /ФОКУС.*CTRL/,
    'zh-CN': /专注.*CTRL/,
    'pt-BR': /FOCO.*CTRL/,
    ko: /집중.*CTRL/,
    ja: /フォーカス.*CTRL/
  };
  const viewports = [
    { id: '1920x1080', width: 1920, height: 1080 },
    { id: '1280x720', width: 1280, height: 720 },
    { id: '960x640', width: 960, height: 640 }
  ];
  const localizedScreenshots = [];
  for (const [locale, expectedCopy] of Object.entries(localeExpectations)) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await seedProfile(page, 0, locale, 2);
      await startRanked(page);
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 20000 });
      await page.evaluate(() => {
        const play = window.__game?.scenes?.play;
        play.clearFirstRunOnboardingCompletion();
        play.enemyManager.update = () => {};
        play.clearToastState();
        play.firstRunOnboardingComplete = false;
        play.firstRunOnboardingActions ||= {};
        play.firstRunOnboardingStage = 'focus_pending';
        play.firstRunOnboardingUntil = 0;
        play.firstRunOnboardingActions.moved = true;
        play.firstRunOnboardingActions.fired = true;
        play.firstRunOnboardingActions.phased = true;
        play.firstRunOnboardingActions.focused = false;
      });
      await page.evaluate(() => {
        const play = window.__game?.scenes?.play;
        play.clearToastState();
        play.bulletManager.cleanupDiagnostics.friendlyVfxCompression = {
          enabled: true,
          activeRoutineCount: 90,
          startCount: play.bulletManager.friendlyVfxCompressionStartCount,
          fullCount: play.bulletManager.friendlyVfxCompressionFullCount,
          target: 0.45,
          level: 0.45
        };
        play.firstRunOnboardingStage = 'focus_armed';
        play.showFirstRunFocusNudge(play.getFirstRunFocusDensityState());
        play.processToastQueue();
      });
      await page.waitForFunction(() => (JSON.parse(window.render_game_to_text?.() || '{}').toast?.active || []).some((toast) => toast.type === 'firstRunControlsFocus'), null, { timeout: 3000 });
      const state = await readState(page);
      const toast = state.toast.active.find((entry) => entry.type === 'firstRunControlsFocus');
      assert.match(toast?.message || '', expectedCopy, `${locale} Focus copy`);
      assert.equal(state.toast.firstRunOnboarding.stage, 'focus');
      assert.equal((state.toast.active || []).filter((entry) => /firstRunControls/.test(entry.type || '')).length, 1);
      const bounds = toast?.bounds || {};
      assert.ok(Number(bounds.x) >= 8, `${locale} ${viewport.id} Focus left clearance`);
      assert.ok(Number(bounds.y) >= 8, `${locale} ${viewport.id} Focus top clearance`);
      assert.ok(Number(bounds.x) + Number(bounds.width) <= viewport.width - 8, `${locale} ${viewport.id} Focus right clearance`);
      assert.ok(Number(bounds.y) + Number(bounds.height) <= viewport.height - 8, `${locale} ${viewport.id} Focus bottom clearance`);
      assert.deepEqual(pageErrors, [], `${locale} ${viewport.id} page errors`);
      const screenshot = path.join(outputDir, `focus-${locale}-${viewport.id}-scale-2.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      localizedScreenshots.push({ locale, viewport: viewport.id, message: toast.message, bounds, screenshot });
      await page.close();
    }
  }
  report.scenarios.push({ id: 'localized-focus-layout-matrix', captures: localizedScreenshots });

  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[first-run-retention] PASS scenarios=${report.scenarios.length}`);
  console.log(`[first-run-retention] evidence=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
