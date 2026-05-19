import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4380));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/voice-cadence-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForVoice(page, eventName, timeout = 12000) {
  await page.waitForFunction((expected) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.audio?.lastVoiceEvent === expected;
  }, eventName, { timeout });
  return readState(page);
}

async function waitForSuppression(page, eventName, reason, timeout = 12000) {
  await page.waitForFunction(({ expectedEvent, expectedReason }) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const suppressions = state.audio?.recentVoiceSuppressions || [];
    return suppressions.some((entry) => (
      entry.eventName === expectedEvent &&
      (!expectedReason || entry.reason === expectedReason)
    ));
  }, { expectedEvent: eventName, expectedReason: reason }, { timeout });
  return readState(page);
}

async function waitForPlayReady(page, timeout = 30000) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return (
      state.scene === 'play' &&
      state.player?.active === true &&
      state.wave?.state &&
      state.wave.state !== 'IDLE'
    );
  }, null, { timeout });
}

async function forceGameOver(page) {
  await page.evaluate(() => {
    const game = window.__game;
    game.score = Math.max(game.score || 0, 1600);
    game.lives = 0;
    game.gameOver();
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'gameOver', null, { timeout: 10000 });
  await page.waitForTimeout(250);
}

async function restartRun(page) {
  await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    if (!scene?.restartRun) throw new Error('Missing game-over restartRun');
    scene.restartRun();
  });
  await waitForPlayReady(page);
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
let currentStage = 'boot';
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  currentStage = 'enable-audio';
  await page.addInitScript(() => {
    localStorage.setItem('burt_music_enabled', 'true');
    localStorage.setItem('burt_voice_enabled', 'true');
  });
  currentStage = 'load-game';
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  currentStage = 'wait-first-play-ready';
  await waitForPlayReady(page);

  currentStage = 'wait-first-launch-voice';
  const firstLaunch = await waitForVoice(page, 'mission_control_launch');
  currentStage = 'force-first-game-over';
  await forceGameOver(page);
  currentStage = 'restart-first-run';
  await restartRun(page);
  currentStage = 'wait-first-restart-voice';
  const firstRestart = await waitForVoice(page, 'mission_control_restart');
  currentStage = 'wait-launch-suppression';
  const launchSuppressed = await waitForSuppression(page, 'mission_control_launch', null);

  currentStage = 'force-second-game-over';
  await forceGameOver(page);
  currentStage = 'restart-second-run';
  await restartRun(page);
  currentStage = 'wait-restart-suppression';
  const restartSuppressed = await waitForSuppression(page, 'mission_control_restart', 'event_cooldown');
  currentStage = 'read-final-state';
  const finalState = await readState(page);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'voice-cadence.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const launchSuppression = (launchSuppressed.audio?.recentVoiceSuppressions || [])
    .find((entry) => entry.eventName === 'mission_control_launch');
  const restartSuppression = (restartSuppressed.audio?.recentVoiceSuppressions || [])
    .find((entry) => entry.eventName === 'mission_control_restart' && entry.reason === 'event_cooldown');
  const report = {
    ok: Boolean(
      firstLaunch.audio?.lastVoiceEvent === 'mission_control_launch' &&
      firstRestart.audio?.lastVoiceEvent === 'mission_control_restart' &&
      launchSuppression &&
      restartSuppression &&
      finalState.audio?.activeVoiceCount <= 1 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    firstLaunch: firstLaunch.audio || null,
    firstRestart: firstRestart.audio || null,
    launchSuppression,
    restartSuppression,
    finalAudio: finalState.audio || null,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  assert(report.ok, `voice cadence failed: ${JSON.stringify(report, null, 2)}`);
  console.log(`[voice-cadence] PASS launchSuppressed=${launchSuppression.reason} restartSuppressed=${restartSuppression.reason} screenshot=${screenshot}`);
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  const failureScreenshot = path.join(outputDir, 'voice-cadence-failure.png');
  const failureState = await readState(page).catch((stateError) => ({ readStateError: stateError.message }));
  await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});
  writeFileSync(path.join(outputDir, 'failure-report.json'), JSON.stringify({
    ok: false,
    stage: currentStage,
    baseUrl,
    error: error.message,
    state: failureState,
    pageErrors,
    consoleErrors,
    screenshot: failureScreenshot
  }, null, 2));
  console.error(`[voice-cadence] FAIL stage=${currentStage} ${error.message}`);
  console.error(`[voice-cadence] failureReport=${path.join(outputDir, 'failure-report.json')}`);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
