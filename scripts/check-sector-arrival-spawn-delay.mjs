import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4717));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/sector-arrival-spawn-delay-${timestamp()}`);
const devtoolsHash = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

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
  throw new Error(`No available sector arrival delay check port found starting at ${startPort}`);
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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function readArrivalDebug(page) {
  return page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    return {
      level: window.__game?.level || null,
      stingerVisible: Boolean(play?.sectorArrivalStinger?.container?.parent),
      pendingEnemyStart: Boolean(play?.pendingEnemyStartTimeout),
      enemyCount: play?.enemyManager?.enemies?.length || 0,
      activeEnemyCount: JSON.parse(window.render_game_to_text?.() || '{}')?.counts?.enemies || 0,
      waveState: play?.enemyManager?.state || null,
      wavePhase: play?.enemyManager?.phase || null,
      levelAdvancePending: Boolean(play?.levelAdvancePending),
      levelComplete: play?.enemyManager?.isLevelComplete?.() === true
    };
  });
}

async function startPlay(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 30000 });
  await page.evaluate(() => window.__game.startGame());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 30000 });
}

async function runStaleCompleteRegression(page) {
  const url = `${baseUrl}/?nova-devtools-hash=${devtoolsHash}&debugBossToken=NOVA_DEBUG_2026&controlSmoke=1`;
  await startPlay(page, url);
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.enemyManager), null, { timeout: 30000 });
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play?.enemyManager) throw new Error('Play scene or enemy manager missing');
    play.clearPendingEnemyStart?.();
    if (play.levelAdvanceTimeout) {
      clearTimeout(play.levelAdvanceTimeout);
      play.levelAdvanceTimeout = null;
    }
    play.levelAdvancePending = false;
    play.enemyManager.clearEnemies?.();
    play.enemyManager.spawning = false;
    play.enemyManager.phase = 'COMPLETE';
    play.enemyManager.state = 'LEVEL_COMPLETE';
    game.level = 2;
    play._lastStartedLevel = null;
    play.startLevel('stale_complete_regression');
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.sectorArrivalStinger?.container?.parent), null, { timeout: 15000 });

  const holdStart = await readArrivalDebug(page);
  await page.screenshot({ path: path.join(outputDir, 'sector-2-stale-complete-hold.png'), fullPage: true });
  assert.equal(holdStart.level, 2, 'stale complete regression should start sector 2');
  assert.equal(holdStart.stingerVisible, true, 'stale complete regression should show the sector arrival stinger');
  assert.equal(holdStart.pendingEnemyStart, true, 'stale complete regression should delay enemy release');
  assert.equal(holdStart.waveState, 'LEVEL_ENTRY_HOLD', 'delayed entry should replace stale LEVEL_COMPLETE state');
  assert.equal(holdStart.wavePhase, 'ENTRY_HOLD', 'delayed entry should replace stale COMPLETE phase');
  assert.equal(holdStart.levelComplete, false, 'entry hold must not report level complete');

  await page.waitForTimeout(1900);
  const holdLate = await readArrivalDebug(page);
  assert.equal(holdLate.level, 2, 'sector should not auto-advance while arrival stinger is holding enemies');
  assert.equal(holdLate.pendingEnemyStart, true, 'enemy release should still be pending before the release gate');
  assert.equal(holdLate.waveState, 'LEVEL_ENTRY_HOLD', 'stale complete state should stay suppressed during the hold');
  assert.equal(holdLate.levelComplete, false, 'entry hold must remain non-complete until enemies release');

  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return !play?.sectorArrivalStinger && (play?.enemyManager?.enemies?.length || 0) > 0 && (state?.counts?.enemies || 0) > 0;
  }, null, { timeout: 10000 });

  const afterRelease = await readArrivalDebug(page);
  await page.screenshot({ path: path.join(outputDir, 'sector-2-stale-complete-release.png'), fullPage: true });
  assert.equal(afterRelease.level, 2, 'sector should still be 2 after delayed enemies release');
  assert.equal(afterRelease.pendingEnemyStart, false, 'enemy release should finish after the stinger');
  assert.ok(afterRelease.enemyCount > 0, 'sector 2 enemies should spawn after the stinger');

  return { holdStart, holdLate, afterRelease };
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  const url = `${baseUrl}/?nova-devtools-hash=${devtoolsHash}&debugBossToken=NOVA_DEBUG_2026&startLevel=2&controlSmoke=1`;
  await startPlay(page, url);
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.sectorArrivalStinger?.container?.parent), null, { timeout: 15000 });

  const duringStart = await readArrivalDebug(page);
  await page.screenshot({ path: path.join(outputDir, 'sector-2-stinger-before-enemies.png'), fullPage: true });
  assert.equal(duringStart.level, 2, 'debug route should start at sector 2');
  assert.equal(duringStart.stingerVisible, true, 'sector arrival stinger should be visible');
  assert.equal(duringStart.pendingEnemyStart, true, 'enemy release should be pending while stinger is visible');
  assert.equal(duringStart.enemyCount, 0, 'no enemies should be spawned at stinger start');
  assert.equal(duringStart.activeEnemyCount, 0, 'no active enemies should be visible at stinger start');

  await page.waitForTimeout(1100);
  const duringLate = await readArrivalDebug(page);
  assert.equal(duringLate.stingerVisible, true, 'sector arrival stinger should still be visible before the release gate');
  assert.equal(duringLate.enemyCount, 0, 'no enemies should spawn before the stinger is done');
  assert.equal(duringLate.activeEnemyCount, 0, 'no active enemies should appear before the stinger is done');

  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return !play?.sectorArrivalStinger && (play?.enemyManager?.enemies?.length || 0) > 0 && (state?.counts?.enemies || 0) > 0;
  }, null, { timeout: 10000 });

  const afterRelease = {
    arrival: await readArrivalDebug(page),
    state: await readState(page),
    perf: await page.evaluate(() => window.__perfStats || null)
  };
  await page.screenshot({ path: path.join(outputDir, 'sector-2-enemies-after-stinger.png'), fullPage: true });
  const staleCompleteRegression = await runStaleCompleteRegression(page);

  const report = {
    status: 'passed',
    generatedAt: new Date().toISOString(),
    duringStart,
    duringLate,
    afterRelease,
    staleCompleteRegression,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('; ')}`);
  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join('; ')}`);
  console.log(`[sector-arrival-spawn-delay] PASS ${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
