import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : await findAvailablePort(Number(process.env.CHECK_PORT) || 4892);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/first-run-notification-sovereignty-${timestamp()}`);

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

async function startServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not start at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function seedProfile(page, totalRuns) {
  await page.goto(baseUrl, { waitUntil: 'commit', timeout: 60000 });
  await page.evaluate(({ runs }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova_ui_scale_v1', '1');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: runs }));
    localStorage.setItem('burt_music_enabled', 'false');
    localStorage.setItem('burt_voice_enabled', 'false');
  }, { runs: totalRuns });
  await page.reload({ waitUntil: 'commit', timeout: 60000 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 60000 });
}

async function startRanked(page) {
  await page.evaluate(async () => {
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    await window.__game?.startGame?.(undefined, { runMode: 'ranked', inputDevice: 'keyboard' });
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 30000 });
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function capture(page, name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function runFirstRunCase(page, viewport) {
  await seedProfile(page, 0);
  await startRanked(page);
  try {
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage === 'opening', null, { timeout: 12000 });
  } catch (error) {
    const state = await readState(page);
    throw new Error(`First-run opening did not appear: ${JSON.stringify({ scene: state.scene, onboarding: state.toast?.firstRunOnboarding, active: state.toast?.active })}`, { cause: error });
  }
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.firstRunOnboardingActions.moved = true;
    play.firstRunOnboardingActions.fired = true;
    play.finishFirstRunOpening('notification_sovereignty_check');
  });
  await page.waitForFunction(() => (JSON.parse(window.render_game_to_text?.() || '{}').counts?.enemies || 0) > 0, null, { timeout: 12000 });

  const economics = await page.evaluate((width) => {
    const game = window.__game;
    const play = game.scenes.play;
    play.debugInvincible = true;
    play.clearToastState();
    play.firstRunOnboardingStage = 'awaiting_phase';
    play.firstRunOnboardingComplete = false;
    play.firstRunOnboardingActions.phased = false;
    play.firstRunOnboardingActions.focused = false;
    play.firstRunOnboardingUntil = 0;
    const scoreBefore = game.score;
    const bonusBefore = Number(play.discoveryBonus) || 0;
    const result = play.recordThreatDiscovery(`sovereignty_${width}_${Date.now()}`, 'enemies', {
      name: width < 1000 ? 'SCOUT INTERCEPTOR' : 'PULSE NET'
    });
    play.processToastQueue();
    return {
      scoreBefore,
      scoreAfter: game.score,
      bonusBefore,
      bonusAfter: Number(play.discoveryBonus) || 0,
      appliedBonus: result?.appliedBonus,
      isNew: result?.isNew
    };
  }, viewport.width);
  assert.equal(economics.isNew, true);
  assert.equal(economics.bonusAfter - economics.bonusBefore, economics.appliedBonus);
  assert.ok(economics.scoreAfter - economics.scoreBefore >= economics.appliedBonus);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__game.scenes.play.activeTopToast?.__toastMeta?.type), 'discovery');

  const phaseImmediate = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const enemy = play.enemyManager.enemies.find((entry) => entry?.active !== false && entry?.sprite);
    if (!enemy) throw new Error('No active enemy for sovereignty check');
    const fired = enemy.shoot?.(play.player?.x || game.getWidth() * 0.5, play.player?.y || game.getHeight() * 0.8);
    for (const bullet of (Array.isArray(fired) ? fired : [fired]).filter(Boolean)) {
      bullet.vx = 0;
      bullet.vy = 0.01;
      bullet.maxLifetimeMs = 10000;
      play.bulletManager.addEnemyBullet(bullet);
    }
    const beforeType = play.activeTopToast?.__toastMeta?.type || null;
    play.updateFirstRunOnboarding();
    play.processToastQueue();
    return {
      beforeType,
      afterType: play.activeTopToast?.__toastMeta?.type || null,
      yield: play.lastFirstRunDiscoveryYield ? { ...play.lastFirstRunDiscoveryYield } : null,
      discoveryCopies: Number(play.activeTopToast?.__toastMeta?.type === 'discovery')
        + play.toastTopQueue.filter((entry) => entry?.options?.type === 'discovery').length
    };
  });
  assert.equal(phaseImmediate.beforeType, 'discovery');
  assert.equal(phaseImmediate.afterType, 'firstRunControlsPhase');
  assert.equal(phaseImmediate.yield?.reason, 'phase_eligible');
  assert.equal(phaseImmediate.discoveryCopies, 1);
  await page.waitForTimeout(90);
  const phaseState = await readState(page);
  assert.equal(phaseState.toast.active.some((entry) => entry.type === 'discovery'), false);
  assert.ok(phaseState.toast.active.some((entry) => entry.type === 'firstRunControlsPhase'));
  const phaseFile = await capture(page, `${viewport.width}x${viewport.height}-01-phase-sovereign.png`);

  const resumeImmediate = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.firstRunOnboardingActions.phased = true;
    play.updateFirstRunOnboarding();
    play.processToastQueue();
    return play.activeTopToast?.__toastMeta?.type || null;
  });
  assert.equal(resumeImmediate, 'discovery');
  await page.waitForTimeout(90);
  const resumedFile = await capture(page, `${viewport.width}x${viewport.height}-02-discovery-resumed.png`);

  const focusImmediate = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.bulletManager.cleanupDiagnostics.friendlyVfxCompression = {
      enabled: true,
      activeRoutineCount: 220,
      startCount: play.bulletManager.friendlyVfxCompressionStartCount,
      fullCount: play.bulletManager.friendlyVfxCompressionFullCount,
      target: 0.45,
      level: 0.45
    };
    play.firstRunOnboardingStage = 'focus_armed';
    const shown = play.showFirstRunFocusNudge(play.getFirstRunFocusDensityState());
    play.processToastQueue();
    return {
      shown,
      activeType: play.activeTopToast?.__toastMeta?.type || null,
      yield: play.lastFirstRunDiscoveryYield ? { ...play.lastFirstRunDiscoveryYield } : null,
      discoveryCopies: Number(play.activeTopToast?.__toastMeta?.type === 'discovery')
        + play.toastTopQueue.filter((entry) => entry?.options?.type === 'discovery').length
    };
  });
  assert.equal(focusImmediate.shown, true);
  assert.equal(focusImmediate.activeType, 'firstRunControlsFocus');
  assert.equal(focusImmediate.yield?.reason, 'focus_eligible');
  assert.equal(focusImmediate.discoveryCopies, 1);
  await page.waitForTimeout(90);
  const focusState = await readState(page);
  assert.equal(focusState.toast.active.some((entry) => entry.type === 'discovery'), false);
  const focusFile = await capture(page, `${viewport.width}x${viewport.height}-03-focus-sovereign.png`);

  const completionImmediate = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.firstRunOnboardingActions.focused = true;
    play.updateFirstRunOnboarding();
    play.processToastQueue();
    return {
      activeType: play.activeTopToast?.__toastMeta?.type || null,
      complete: play.firstRunOnboardingComplete,
      discoveryCopies: Number(play.activeTopToast?.__toastMeta?.type === 'discovery')
        + play.toastTopQueue.filter((entry) => entry?.options?.type === 'discovery').length
    };
  });
  assert.equal(completionImmediate.complete, true);
  assert.equal(completionImmediate.activeType, 'discovery');
  assert.equal(completionImmediate.discoveryCopies, 1);
  await page.waitForTimeout(90);
  const completedFile = await capture(page, `${viewport.width}x${viewport.height}-04-post-onboarding-discovery.png`);

  const experimentIsolation = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const previousExperiment = play.game.lateGameExperiment;
    play.firstRunOnboardingComplete = false;
    play.firstRunOnboardingStage = 'awaiting_phase';
    play.game.lateGameExperiment = { ...(previousExperiment || {}), active: true };
    const yielded = play.yieldActiveDiscoveryForFirstRunCoaching('experiment_probe');
    const activeType = play.activeTopToast?.__toastMeta?.type || null;
    play.game.lateGameExperiment = previousExperiment;
    play.firstRunOnboardingComplete = true;
    play.firstRunOnboardingStage = 'complete';
    return { yielded, activeType };
  });
  assert.equal(experimentIsolation.yielded, false);
  assert.equal(experimentIsolation.activeType, 'discovery');

  const bossPreemption = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.enqueueToast('PHASE SHIFT // DANGER LANE CHANGED', {
      type: 'boss_phase',
      priority: 5,
      duration: 900,
      fontSize: 19
    });
    play.processToastQueue();
    return play.activeTopToast?.__toastMeta?.type || null;
  });
  assert.equal(bossPreemption, 'boss_phase');

  return { viewport, economics, phaseImmediate, focusImmediate, completionImmediate, experimentIsolation, bossPreemption, phaseFile, resumedFile, focusFile, completedFile };
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({ headless: true, ...(findChrome() ? { executablePath: findChrome() } : {}) });
const report = { baseUrl, outputDir, cases: [], returningRun: null, pageErrors: [], consoleErrors: [] };

try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 960, height: 640 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', (error) => report.pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') report.consoleErrors.push(message.text().slice(0, 800));
    });
    report.cases.push(await runFirstRunCase(page, viewport));
    await page.close();
  }

  const returning = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  returning.on('pageerror', (error) => report.pageErrors.push(error.message));
  returning.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text().slice(0, 800));
  });
  await seedProfile(returning, 4);
  await startRanked(returning);
  await returning.waitForTimeout(1800);
  const returningState = await returning.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    const result = play.recordThreatDiscovery(`returning_${Date.now()}`, 'enemies', { name: 'RETURNING CONTACT' });
    play.processToastQueue();
    const before = play.activeTopToast;
    const yielded = play.yieldActiveDiscoveryForFirstRunCoaching('returning_probe');
    return {
      result: { isNew: result?.isNew, appliedBonus: result?.appliedBonus },
      yielded,
      sameDisplay: before === play.activeTopToast,
      activeType: play.activeTopToast?.__toastMeta?.type || null,
      onboardingComplete: play.firstRunOnboardingComplete
    };
  });
  assert.equal(returningState.activeType, 'discovery');
  assert.equal(returningState.yielded, false);
  assert.equal(returningState.sameDisplay, true);
  assert.equal(returningState.onboardingComplete, true);
  report.returningRun = { ...returningState, screenshot: await capture(returning, '1366x768-05-returning-run-unchanged.png') };
  await returning.close();

  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.consoleErrors, []);
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[first-run-notification-sovereignty] PASS cases=${report.cases.length} evidence=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
