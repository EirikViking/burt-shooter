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

async function seedProfile(page, totalRuns) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((runs) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: runs }));
  }, totalRuns);
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
  await keyboard.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage === 'awaiting_threat', null, { timeout: 3000 });
  const actionElapsedMs = Date.now() - actionStartedAt;
  assert.ok(actionElapsedMs < 2500, `demonstrated opening actions should dismiss early (${actionElapsedMs}ms)`);
  await keyboard.evaluate(() => { delete window.__burtKeyboardOverride; });
  const afterOpening = await readState(keyboard);
  assert.equal((afterOpening.toast?.active || []).some((toast) => toast.type === 'firstRunControlsOpening'), false);
  assert.equal((afterOpening.toast?.active || []).some((toast) => toast.type === 'firstRunControlsThreat'), false, 'threat beat must wait for a visible hostile projectile');

  await keyboard.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const bullet = { active: true, x: play.game.getWidth() / 2, y: 180, sprite: { visible: true } };
    play.bulletManager.enemyBullets.push(bullet);
    play.updateFirstRunOnboarding();
    play.bulletManager.enemyBullets = play.bulletManager.enemyBullets.filter((entry) => entry !== bullet);
  });
  await keyboard.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.toast?.firstRunOnboarding?.stage === 'threat'
      && (state.toast?.active || []).some((toast) => toast.type === 'firstRunControlsThreat');
  }, null, { timeout: 3000 });
  const threat = await readState(keyboard);
  const threatToast = threat.toast.active.find((toast) => toast.type === 'firstRunControlsThreat');
  assert.match(threatToast?.message || '', /PHASE.*SHIFT.*FOCUS.*CTRL/);
  assert.equal(threat.toast.active.filter((toast) => /firstRunControls/.test(toast.type || '')).length, 1, 'onboarding beats must never stack');
  const threatShot = path.join(outputDir, 'keyboard-threat-1280x720.png');
  await keyboard.screenshot({ path: threatShot, fullPage: true });

  await keyboard.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.player.startDodge?.();
    play.player.focusRequested = true;
    play.updateFirstRunOnboarding();
  });
  await keyboard.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.complete === true, null, { timeout: 3000 });
  const complete = await readState(keyboard);
  assert.equal(complete.toast.firstRunOnboarding.completion?.reason, 'actions_complete');
  assert.equal((complete.toast.active || []).some((toast) => /firstRunControls/.test(toast.type || '')), false);
  assert.deepEqual(keyboardErrors, []);
  report.scenarios.push({ id: 'keyboard-contextual-beats', actionElapsedMs, openingShot, threatShot, completion: complete.toast.firstRunOnboarding.completion });
  await keyboard.close();

  const fallback = await browser.newPage({ viewport: { width: 960, height: 640 } });
  await seedProfile(fallback, 0);
  await startRanked(fallback);
  await fallback.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage === 'opening', null, { timeout: 20000 });
  const fallbackStartedAt = Date.now();
  await fallback.waitForFunction(() => {
    const stage = JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage;
    return stage === 'awaiting_threat' || stage === 'threat' || stage === 'complete';
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
  report.scenarios.push({ id: 'controller-copy-and-layout', screenshot: controllerShot });
  await controller.close();

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

  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[first-run-retention] PASS scenarios=${report.scenarios.length}`);
  console.log(`[first-run-retention] evidence=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
