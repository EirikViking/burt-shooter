import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries.map(([key, value]) => [String(key), String(value)]));
  }

  getItem(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }

  setItem(key, value) {
    this.map.set(String(key), String(value));
  }

  removeItem(key) {
    this.map.delete(String(key));
  }

  clear() {
    this.map.clear();
  }
}

globalThis.Storage = MemoryStorage;
globalThis.window = { localStorage: new MemoryStorage() };
globalThis.localStorage = globalThis.window.localStorage;

const { RUN_MODES } = await import('../src/game/RunMode.js');
const {
  HANGAR_PROGRESS_KEY,
  readHangarProgressState,
  writeHangarProgressState
} = await import('../src/progression/HangarProgressState.js');
const {
  DEFAULT_ACTIVE_RUN_CONTRACT_IDS,
  RUN_CONTRACTS_VERSION,
  getRunContractCatalog,
  getRunContractMenuState,
  mergeRunContractsState,
  normalizeRunContractsState,
  applyRunContractEvent,
  recordRunContractCompletion,
  startRunContractSession
} = await import('../src/progression/RunContracts.js');

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4778));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/run-contracts-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function setStorage(storage) {
  globalThis.window.localStorage = storage;
  globalThis.localStorage = storage;
  return storage;
}

function runCatalogAndSaveTests() {
  const storage = setStorage(new MemoryStorage());
  const catalog = getRunContractCatalog();
  assert.equal(catalog.length, 3, 'first pass should expose exactly three active contracts');
  assert.equal(new Set(catalog.map((contract) => contract.id)).size, catalog.length, 'contract ids must be unique');
  assert.deepEqual(DEFAULT_ACTIVE_RUN_CONTRACT_IDS, [
    'graze_break_drill',
    'support_hunter',
    'slow_mo_finisher'
  ]);

  const migrated = readHangarProgressState();
  assert.equal(migrated.runContracts.version, RUN_CONTRACTS_VERSION, 'default profile should gain runContracts state');
  assert.deepEqual(migrated.runContracts.activeIds, DEFAULT_ACTIVE_RUN_CONTRACT_IDS);
  const menuState = getRunContractMenuState(migrated);
  assert.equal(menuState.active.length, 3, 'menu state should expose the three default contracts');
  assert.equal(menuState.rewardsEnabled, false, 'rewards should stay disabled in the low-risk first pass');

  let session = startRunContractSession({ runMode: RUN_MODES.RANKED, progress: migrated });
  for (let index = 0; index < 2; index += 1) {
    const result = applyRunContractEvent(session, { type: 'graze_break', sector: 1 });
    session = result.session;
    assert.equal(result.completed.length, 0, 'Graze Break contract should wait for the third trigger');
  }
  const rankedResult = applyRunContractEvent(session, { type: 'graze_break', sector: 1 });
  assert.equal(rankedResult.completed.length, 1, 'third Graze Break should complete the ranked contract');
  assert.equal(rankedResult.completed[0].id, 'graze_break_drill');
  assert.equal(rankedResult.session.active.find((item) => item.id === 'graze_break_drill').progress, 3);

  const scoutSession = startRunContractSession({ runMode: RUN_MODES.SCOUT, progress: migrated });
  const scoutResult = applyRunContractEvent(scoutSession, { type: 'graze_break', sector: 1 });
  assert.equal(scoutResult.completed.length, 0, 'Scout runs should not complete Mayhem-only contracts');
  assert.equal(scoutResult.session.active.find((item) => item.id === 'graze_break_drill').eligible, false);

  const firstSave = recordRunContractCompletion(migrated.runContracts, rankedResult.completed[0]);
  const secondSave = recordRunContractCompletion(firstSave, rankedResult.completed[0]);
  assert.equal(secondSave.completed.graze_break_drill.count, 2, 'completion count should increment locally');

  const merged = mergeRunContractsState(
    { completed: { graze_break_drill: { id: 'graze_break_drill', count: 1, completedAt: '2026-07-02T10:00:00.000Z' } } },
    { completed: { graze_break_drill: { id: 'graze_break_drill', count: 4, completedAt: '2026-07-02T11:00:00.000Z' } } }
  );
  assert.equal(merged.completed.graze_break_drill.count, 4, 'cloud/local merge should keep the higher completion count');

  writeHangarProgressState({
    ...migrated,
    runContracts: secondSave
  });
  const written = JSON.parse(storage.getItem(HANGAR_PROGRESS_KEY));
  assert.equal(written.runContracts.completed.graze_break_drill.count, 2, 'hangar profile should persist contract completions');

  const normalized = normalizeRunContractsState({
    activeIds: ['unknown', 'support_hunter', 'support_hunter'],
    completed: {
      missing: { id: 'missing', count: 99 },
      support_hunter: { id: 'support_hunter', count: 1 }
    }
  });
  assert.deepEqual(normalized.activeIds, [
    'support_hunter',
    'graze_break_drill',
    'slow_mo_finisher'
  ], 'normalization should drop invalid/duplicate ids and refill active slots');
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
  throw new Error(`No available run-contract check port found starting at ${startPort}`);
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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

function assertInside(bounds, screen, label) {
  assert.ok(bounds?.width > 0 && bounds?.height > 0, `${label}: missing bounds`);
  assert.ok(bounds.x >= -2, `${label}: left edge offscreen`);
  assert.ok(bounds.y >= -2, `${label}: top edge offscreen`);
  assert.ok(bounds.right <= screen.width + 2, `${label}: right edge offscreen`);
  assert.ok(bounds.bottom <= screen.height + 2, `${label}: bottom edge offscreen`);
}

function assertMissionBoardLayout(menu) {
  const screen = menu?.screen;
  const board = menu?.missionBoard;
  assert.ok(screen?.width > 0 && screen?.height > 0, 'menu screen bounds should be exposed');
  assert.equal(board?.title, 'MISSION BOARD');
  assert.equal(board?.subtitle, 'Optional goals for your next Mayhem run.');
  assert.equal(board?.rows?.length, 3, 'Mission Board should show exactly three rows');
  assert.deepEqual(board.rows.map((row) => row.id), DEFAULT_ACTIVE_RUN_CONTRACT_IDS);
  assertInside(board.bounds, screen, 'Mission Board');
  assertInside(board.titleBounds, screen, 'Mission Board title');
  assertInside(board.subtitleBounds, screen, 'Mission Board subtitle');
  for (const row of board.rows) {
    assertInside(row.bounds, screen, `${row.id} row`);
    assertInside(row.titleBounds, screen, `${row.id} title`);
    assertInside(row.detailBounds, screen, `${row.id} detail`);
    assertInside(row.progressBounds, screen, `${row.id} progress`);
    assert.match(row.progress, /^0\/\d+$/, `${row.id} should start incomplete`);
  }
  assert.ok(board.bounds.y >= menu.launchDeck.bounds.bottom - 6, 'Mission Board should sit below the launch deck');
  assert.ok(board.bounds.bottom <= menu.panel.y + 6, 'Mission Board should stay above the utility dock');
}

async function runBrowserSmoke() {
  const server = await startDevServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  try {
    await page.goto(`${baseUrl}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__game && window.render_game_to_text), null, { timeout: 30000 });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
    await page.waitForTimeout(1200);

    const menuState = await readState(page);
    assertMissionBoardLayout(menuState.menu);
    mkdirSync(outputDir, { recursive: true });
    const menuScreenshot = path.join(outputDir, 'mission-board-main-menu.png');
    await page.screenshot({ path: menuScreenshot, fullPage: true });

    await page.evaluate(async () => {
      await window.__game?.startGame?.(undefined, { runMode: 'ranked' });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && Boolean(window.__game?.scenes?.play?.emitRunContractEvent);
    }, null, { timeout: 30000 });

    await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      for (let index = 0; index < 3; index += 1) {
        play.emitRunContractEvent('graze_break', { sector: window.__game?.level || 1 });
      }
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return (state.toast?.active || []).some((toast) => String(toast.message || '').includes('MISSION COMPLETE'));
    }, null, { timeout: 5000 });
    const completionResult = await page.evaluate(() => {
      const textState = JSON.parse(window.render_game_to_text?.() || '{}');
      const profile = JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}');
      return {
        runContracts: textState.runContracts,
        toastMessages: (textState.toast?.active || []).map((toast) => toast.message),
        savedRunContracts: profile.runContracts || null
      };
    });
    const graze = completionResult.runContracts?.active?.find((item) => item.id === 'graze_break_drill');
    assert.equal(graze?.progress, 3, 'in-run Graze Break contract should reach target');
    assert.equal(graze?.completed, true, 'in-run Graze Break contract should mark complete');
    assert.equal(
      completionResult.savedRunContracts?.completed?.graze_break_drill?.count,
      1,
      'completion should persist to hangar profile'
    );
    assert.ok(
      completionResult.toastMessages.some((message) => message.includes('MISSION COMPLETE: Graze Break x3')),
      'completion toast should be visible through text state'
    );

    await page.waitForTimeout(250);
    const playScreenshot = path.join(outputDir, 'mission-complete-play.png');
    await page.screenshot({ path: playScreenshot, fullPage: true });

    const report = {
      ok: pageErrors.length === 0 && consoleErrors.length === 0,
      baseUrl,
      menuRows: menuState.menu.missionBoard.rows.map((row) => ({
        id: row.id,
        title: row.title,
        progress: row.progress,
        bounds: row.bounds
      })),
      completionResult,
      pageErrors,
      consoleErrors,
      screenshots: {
        menu: menuScreenshot,
        play: playScreenshot
      }
    };
    writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    assert.deepEqual(pageErrors, [], 'browser page errors should be empty');
    assert.deepEqual(consoleErrors, [], 'browser console errors should be empty');
    console.log(`[run-contracts] PASS menu=${menuScreenshot} play=${playScreenshot}`);
    return report;
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

runCatalogAndSaveTests();
await runBrowserSmoke();
