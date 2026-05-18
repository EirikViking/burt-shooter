import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4350));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/leaderboard-split-${timestamp()}`);
const localKey = 'novaSwarm.localLeaderboard.v1';

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

function lowGlobalScores() {
  return Array.from({ length: 10 }, (_, index) => ({
    name: `CPU${index}`,
    score: 1000 - index * 10,
    level: 1,
    rank_index: 0
  }));
}

function highGlobalScores() {
  return Array.from({ length: 10 }, (_, index) => ({
    name: `PRO${index}`,
    score: 999999 - index * 1000,
    level: 9,
    rank_index: 12
  }));
}

async function preparePage(browser, routeHandler) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/highscores', routeHandler);
  await page.addInitScript((storageKey) => {
    localStorage.removeItem(storageKey);
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 0, bestRank: 0, bestLevel: 1 }));
  }, localKey);
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  return { page, pageErrors };
}

async function forceGameOver(page, score = 12000) {
  await page.evaluate((finalScore) => {
    const game = window.__game;
    if (!game) return;
    game.score = finalScore;
    game.level = 3;
    game.rankIndex = 2;
    game.lives = 0;
    game.gameOver();
  }, score);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver;
  }, null, { timeout: 10000 });
}

async function readTextState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function submitInitials(page, initials, expectPost = false) {
  const postPromise = expectPost
    ? page.waitForRequest((request) => request.url().includes('/api/highscores') && request.method() === 'POST')
    : null;
  await page.keyboard.press('Enter');
  await page.keyboard.type(initials);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'highscore', null, { timeout: 10000 });
  if (postPromise) await postPromise;
}

async function readLocalScores(page) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || '[]'), localKey);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const results = [];

try {
  {
    let postCount = 0;
    const { page, pageErrors } = await preparePage(browser, async (route) => {
      if (route.request().method() === 'POST') {
        postCount += 1;
        await route.fulfill({ status: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, id: 1 }) });
        return;
      }
      await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lowGlobalScores()) });
    });
    await forceGameOver(page, 12000);
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.gameOver?.localQualified === true && state.gameOver?.globalQualified === true;
    }, null, { timeout: 10000 });
    const qualifiedState = await readTextState(page);
    assert(qualifiedState.gameOver.globalFanfarePlayed === true, 'global fanfare did not fire for global qualification');
    await submitInitials(page, 'ACE', true);
    const localScores = await readLocalScores(page);
    assert(localScores.some((entry) => entry.name === 'ACE' && entry.score === 12000), 'same-run local score was not saved');
    assert(postCount === 1, `expected one global POST, got ${postCount}`);
    assert(pageErrors.length === 0, `page errors in both-qualified scenario: ${pageErrors.join('; ')}`);
    results.push({ scenario: 'local_and_global', ok: true, postCount, localCount: localScores.length });
    await page.close();
  }

  {
    let postCount = 0;
    const { page, pageErrors } = await preparePage(browser, async (route) => {
      if (route.request().method() === 'POST') {
        postCount += 1;
        await route.fulfill({ status: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) });
        return;
      }
      await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(highGlobalScores()) });
    });
    await forceGameOver(page, 12000);
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.gameOver?.localQualified === true && state.gameOver?.globalStatus === 'missed';
    }, null, { timeout: 10000 });
    const qualifiedState = await readTextState(page);
    assert(qualifiedState.gameOver.globalFanfarePlayed === false, 'global fanfare fired for local-only qualification');
    await submitInitials(page, 'LOC', false);
    await page.waitForTimeout(700);
    const localScores = await readLocalScores(page);
    const activeView = await page.evaluate(() => window.__game?.scenes?.highscore?.activeLeaderboard);
    assert(localScores.some((entry) => entry.name === 'LOC' && entry.score === 12000), 'local-only score was not saved');
    assert(activeView === 'local', `expected local leaderboard view, got ${activeView}`);
    assert(postCount === 0, `expected no global POST for local-only qualification, got ${postCount}`);
    assert(pageErrors.length === 0, `page errors in local-only scenario: ${pageErrors.join('; ')}`);
    results.push({ scenario: 'local_only', ok: true, postCount, activeView });
    await page.close();
  }

  {
    let postCount = 0;
    const { page, pageErrors } = await preparePage(browser, async (route) => {
      if (route.request().method() === 'POST') {
        postCount += 1;
        await route.fulfill({ status: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'offline' }) });
        return;
      }
      await route.fulfill({ status: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'offline' }) });
    });
    await forceGameOver(page, 13000);
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.gameOver?.localQualified === true && state.gameOver?.globalStatus === 'offline';
    }, null, { timeout: 15000 });
    const offlineState = await readTextState(page);
    assert(offlineState.gameOver.globalFanfarePlayed === false, 'global fanfare fired while global board was offline');
    await submitInitials(page, 'OFF', false);
    await page.waitForTimeout(700);
    const localScores = await readLocalScores(page);
    assert(localScores.some((entry) => entry.name === 'OFF' && entry.score === 13000), 'offline local score was not preserved');
    assert(postCount === 0, `expected no global POST when global qualification fetch failed, got ${postCount}`);
    assert(pageErrors.length === 0, `page errors in offline scenario: ${pageErrors.join('; ')}`);
    results.push({ scenario: 'global_offline_local_saved', ok: true, postCount });
    await page.close();
  }

  {
    const { page, pageErrors } = await preparePage(browser, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 12000));
      await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lowGlobalScores()) });
    });
    await forceGameOver(page, 14000);
    await page.keyboard.press('KeyR');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 5000 });
    const restarted = await readTextState(page);
    assert(restarted.scene === 'play' && restarted.score === 0, 'restart was blocked by slow global leaderboard check');
    assert(pageErrors.length === 0, `page errors in restart scenario: ${pageErrors.join('; ')}`);
    results.push({ scenario: 'restart_while_global_check_slow', ok: true });
    await page.close();
  }

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: true, baseUrl, results }, null, 2)}\n`);
  console.log(`[leaderboard-split] PASS ${results.map((entry) => entry.scenario).join(', ')} report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: false, baseUrl, results, error: error.message }, null, 2)}\n`);
  console.error(`[leaderboard-split] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
