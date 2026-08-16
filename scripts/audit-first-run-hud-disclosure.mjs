import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4876));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/first-run-hud-disclosure-${timestamp()}`);

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

async function seedProfile(page, locale = 'en') {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((language) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', language);
    localStorage.setItem('nova_ui_scale_v1', '1');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: 0 }));
  }, locale);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
}

async function startRanked(page, inputDevice = 'keyboard') {
  await page.evaluate(async (device) => {
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    await window.__game?.startGame?.(undefined, { runMode: 'ranked', inputDevice: device });
  }, inputDevice);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.toast?.firstRunOnboarding?.stage === 'opening'
      && (state.toast?.active || []).some((toast) => toast.type === 'firstRunControlsOpening');
  }, null, { timeout: 20000 });
}

async function readDisclosure(page) {
  return page.evaluate(() => window.__game?.scenes?.play?.hud?.getFirstRunOpeningDisclosureDebug?.());
}

async function setDeterministicRestorationProgress(page, progress) {
  return page.evaluate((value) => {
    const hud = window.__game?.scenes?.play?.hud;
    if (!hud?.firstRunOpeningDisclosure) throw new Error('Production disclosure unavailable');
    const normalized = Math.max(0, Math.min(1, Number(value) || 0));
    hud.firstRunOpeningDisclosure.phase = 'restoring';
    hud.firstRunOpeningDisclosure.restoreStartedAtMs = 1000;
    hud.updateFirstRunOpeningDisclosure(1000 + normalized * hud.firstRunOpeningDisclosure.durationMs);
    return hud.getFirstRunOpeningDisclosureDebug();
  }, progress);
}

async function capture(page, name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function finishOpening(page, reason) {
  await page.evaluate((completionReason) => {
    const play = window.__game?.scenes?.play;
    play.firstRunOnboardingActions.moved = true;
    play.firstRunOnboardingActions.fired = true;
    play.finishFirstRunOpening(completionReason);
  }, reason);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').toast?.firstRunOnboarding?.stage === 'awaiting_phase', null, { timeout: 3000 });
}

async function showPhase(page) {
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const bullet = { active: true, x: play.game.getWidth() / 2, y: 180, sprite: { visible: true } };
    play.bulletManager.enemyBullets.push(bullet);
    play.updateFirstRunOnboarding();
    play.bulletManager.enemyBullets = play.bulletManager.enemyBullets.filter((entry) => entry !== bullet);
  });
  await page.waitForFunction(() => (JSON.parse(window.render_game_to_text?.() || '{}').toast?.active || []).some((toast) => toast.type === 'firstRunControlsPhase'), null, { timeout: 3000 });
}

async function showFocus(page) {
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.firstRunOnboardingActions.phased = true;
    play.updateFirstRunOnboarding();
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
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const chromePath = findChrome();
const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
const report = { outputDir, productionRuntime: true, runtimeMockUsed: false, captures: [], errors: [] };

try {
  const keyboard = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  keyboard.on('pageerror', (error) => report.errors.push(error.message));
  await seedProfile(keyboard);
  await startRanked(keyboard);
  const hidden = await readDisclosure(keyboard);
  assert.equal(hidden.phase, 'hidden');
  assert.ok(Object.values(hidden.targets).every((entry) => !entry.renderable && entry.alpha === 0 && entry.eventMode === 'none'));
  report.captures.push({ id: 'keyboard-opening-hidden', file: await capture(keyboard, '01-keyboard-opening-hidden-1280x720.png'), targets: hidden.targets });
  await finishOpening(keyboard, 'visual_audit_actions_complete');
  const mid = await setDeterministicRestorationProgress(keyboard, 0.5);
  report.captures.push({ id: 'keyboard-restoring', file: await capture(keyboard, '02-keyboard-restoring-1280x720.png'), targets: mid.targets });
  const restored = await setDeterministicRestorationProgress(keyboard, 1);
  assert.ok(Object.values(restored.targets).every((entry) => entry.renderable && entry.alpha === entry.productionAlpha));
  report.captures.push({ id: 'keyboard-restored', file: await capture(keyboard, '03-keyboard-restored-1280x720.png'), targets: restored.targets });
  await showPhase(keyboard);
  report.captures.push({ id: 'keyboard-phase-full-hud', file: await capture(keyboard, '04-keyboard-phase-full-hud-1280x720.png') });
  await keyboard.close();

  const controller = await browser.newPage({ viewport: { width: 960, height: 640 } });
  controller.on('pageerror', (error) => report.errors.push(error.message));
  await seedProfile(controller);
  await controller.evaluate(() => {
    window.__burtGamepadOverride = {
      connected: true,
      id: 'Nova Virtual Controller',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
    };
  });
  await startRanked(controller, 'controller');
  assert.equal((await readDisclosure(controller)).phase, 'hidden');
  report.captures.push({ id: 'controller-opening-hidden', file: await capture(controller, '05-controller-opening-hidden-960x640.png') });
  await finishOpening(controller, 'visual_audit_controller_complete');
  await setDeterministicRestorationProgress(controller, 1);
  report.captures.push({ id: 'controller-restored', file: await capture(controller, '06-controller-restored-960x640.png') });
  await showPhase(controller);
  await showFocus(controller);
  report.captures.push({ id: 'controller-focus-full-hud', file: await capture(controller, '07-controller-focus-full-hud-960x640.png') });
  await controller.close();

  const german = await browser.newPage({ viewport: { width: 960, height: 640 } });
  german.on('pageerror', (error) => report.errors.push(error.message));
  await seedProfile(german, 'de');
  await startRanked(german);
  assert.equal((await readDisclosure(german)).phase, 'hidden');
  report.captures.push({ id: 'german-opening-hidden', file: await capture(german, '08-german-opening-hidden-960x640.png') });
  await german.close();

  assert.deepEqual(report.errors, []);
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[first-run-hud-disclosure] PASS captures=${report.captures.length}`);
  console.log(`[first-run-hud-disclosure] evidence=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
