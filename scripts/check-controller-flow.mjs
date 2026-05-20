import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CONTROLLER_HOST || '127.0.0.1';
const port = process.env.CONTROLLER_URL ? null : (Number(process.env.CONTROLLER_PORT) || await findAvailablePort(4460));
const baseUrl = process.env.CONTROLLER_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CONTROLLER_OUTPUT_DIR || `test-results/controller-flow-${timestamp()}`);

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
  throw new Error(`No available controller check port found starting at ${startPort}`);
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
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

async function waitForPlayReady(page, timeout = 30000) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && state.player?.active === true && state.wave?.state && state.wave.state !== 'IDLE';
  }, null, { timeout });
}

async function setGamepad(page, pressedButtons = [], axes = [0, 0]) {
  await page.evaluate(({ pressedButtons, axes }) => {
    const buttons = Array.from({ length: 17 }, (_, index) => {
      const pressed = pressedButtons.includes(index);
      return { pressed, value: pressed ? 1 : 0 };
    });
    window.__burtGamepadOverride = {
      id: 'controller-flow-gamepad',
      index: 0,
      connected: true,
      axes,
      buttons
    };
  }, { pressedButtons, axes });
}

async function tapGamepad(page, buttonIndex, holdMs = 140) {
  await setGamepad(page, [buttonIndex]);
  await page.waitForTimeout(holdMs);
  await setGamepad(page, []);
  await page.waitForTimeout(180);
}

async function forceGameOver(page, score = 250000) {
  await page.evaluate((score) => {
    const game = window.__game;
    if (!game) throw new Error('Missing game instance');
    game.score = score;
    game.level = Math.max(game.level || 1, 3);
    game.rankIndex = Math.max(game.rankIndex || 0, 8);
    game.lives = 0;
    game.gameOver();
  }, score);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'gameOver', null, { timeout: 10000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.gameOver?.canEnterName === true || state.gameOver?.localQualified === true || state.gameOver?.globalQualified === true;
  }, null, { timeout: 10000 });
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
const consoleWarnings = [];
let currentStage = 'boot';

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push({ type: message.type(), text: message.text().slice(0, 600) });
  } else if (message.type() === 'warning') {
    consoleWarnings.push({ type: message.type(), text: message.text().slice(0, 600) });
  }
});

try {
  currentStage = 'load-game';
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await setGamepad(page, []);
  await waitForPlayReady(page);

  currentStage = 'pause-with-start';
  await tapGamepad(page, 9);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').overlays?.pause === true, null, { timeout: 8000 });

  currentStage = 'pause-settings-with-dpad-a';
  await tapGamepad(page, 13);
  await tapGamepad(page, 0);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').overlays?.settings === true, null, { timeout: 8000 });

  currentStage = 'close-settings-with-b';
  await tapGamepad(page, 1);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.overlays?.pause === true && state.overlays?.settings === false;
  }, null, { timeout: 8000 });

  currentStage = 'resume-with-b';
  await tapGamepad(page, 1);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').isPaused === false, null, { timeout: 8000 });

  currentStage = 'game-over-score-entry-with-a';
  await forceGameOver(page, 250000);
  const promptBeforeSubmit = (await readState(page)).gameOver?.prompt || '';
  assert(/A:\s*SAVE PILOT/.test(promptBeforeSubmit), `Game-over prompt does not advertise controller save: ${promptBeforeSubmit}`);
  await tapGamepad(page, 0);
  await page.waitForFunction(() => {
    const game = window.__game;
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return game?.lastLeaderboardResult?.name === 'PILOT' && state.scene === 'highscore';
  }, null, { timeout: 10000 });

  currentStage = 'game-over-restart-with-start';
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlayReady(page);
  await forceGameOver(page, 260000);
  await tapGamepad(page, 9);
  await waitForPlayReady(page, 15000);
  const finalState = await readState(page);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'controller-flow-final.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = {
    ok: finalState.scene === 'play' &&
      finalState.isPaused === false &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0,
    baseUrl,
    promptBeforeSubmit,
    finalState,
    pageErrors,
    consoleErrors,
    consoleWarnings,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  assert(report.ok, `controller flow failed: ${JSON.stringify(report, null, 2)}`);
  console.log(`[controller-flow] PASS output=${outputDir}`);
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  const failureScreenshot = path.join(outputDir, 'controller-flow-failure.png');
  const state = await readState(page).catch((stateError) => ({ readStateError: stateError.message }));
  await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});
  writeFileSync(path.join(outputDir, 'failure-report.json'), JSON.stringify({
    ok: false,
    stage: currentStage,
    error: error.stack || error.message,
    state,
    pageErrors,
    consoleErrors,
    consoleWarnings,
    screenshot: failureScreenshot
  }, null, 2));
  throw error;
} finally {
  await setGamepad(page, []).catch(() => {});
  await browser.close().catch(() => {});
  if (server) server.kill();
}
