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
  RUN_CONTRACT_ORDER_IDS,
  acknowledgeRunContractCompletionNotice,
  applyRunContractEvent,
  getRunContractCatalog,
  getRunContractMenuState,
  mergeRunContractsState,
  normalizeRunContractsState,
  prepareRunContractsForEligibleRun,
  recordRunContractCompletion,
  recordRunContractSessionProgress,
  startRunContractSession
} = await import('../src/progression/RunContracts.js');

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4778));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/run-contracts-${timestamp()}`);

const FIRST_THREE = ['graze_break_drill', 'support_hunter', 'slow_mo_finisher'];
const SECOND_THREE = ['phase_runner', 'near_miss_streak', 'blink_control'];
const ACTIVE_DESCRIPTIONS = {
  graze_break_drill: '3 grazes in Mayhem.',
  support_hunter: 'Destroy 2 support ships.',
  slow_mo_finisher: 'Boss defeat during Slow Time.'
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function setStorage(storage) {
  globalThis.window.localStorage = storage;
  globalThis.localStorage = storage;
  return storage;
}

function completion(id, overrides = {}) {
  return {
    id,
    count: overrides.count || 1,
    completedAt: overrides.completedAt || '2026-07-02T12:00:00.000Z',
    lastRunMode: overrides.lastRunMode || RUN_MODES.RANKED,
    lastSector: overrides.lastSector || 1,
    buildVersion: overrides.buildVersion || 'check-run-contracts'
  };
}

function runContractState({ activeIds = DEFAULT_ACTIVE_RUN_CONTRACT_IDS, completedIds = [], completionNoticeSeen = false } = {}) {
  return normalizeRunContractsState({
    activeIds,
    completedIds,
    completed: Object.fromEntries(completedIds.map((id) => [id, completion(id)])),
    completionNoticeSeen
  });
}

function completeIds(state, ids) {
  return ids.reduce((next, id) => recordRunContractCompletion(next, completion(id)), state);
}

function sessionFor(activeIds) {
  return startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      runContracts: normalizeRunContractsState({ activeIds })
    }
  });
}

function applyEvents(session, events) {
  let next = session;
  let completed = [];
  for (const event of events) {
    const result = applyRunContractEvent(next, event);
    next = result.session;
    completed = completed.concat(result.completed || []);
  }
  return { session: next, completed };
}

function findSessionItem(session, id) {
  return session.active.find((item) => item.id === id);
}

function runCatalogAndSaveTests() {
  const storage = setStorage(new MemoryStorage());
  const catalog = getRunContractCatalog();
  assert.equal(catalog.length, 10, 'Pilot Orders should expose the finite starter catalog');
  assert.equal(new Set(catalog.map((contract) => contract.id)).size, catalog.length, 'contract ids must be unique');
  assert.deepEqual(RUN_CONTRACT_ORDER_IDS, [
    'graze_break_drill',
    'support_hunter',
    'slow_mo_finisher',
    'phase_runner',
    'near_miss_streak',
    'blink_control',
    'sector_5_survivor',
    'boss_breaker',
    'sector_10_signal',
    'enemy_sweep_1000'
  ]);
  assert.deepEqual(DEFAULT_ACTIVE_RUN_CONTRACT_IDS, FIRST_THREE);

  const migrated = readHangarProgressState();
  assert.equal(migrated.runContracts.version, RUN_CONTRACTS_VERSION, 'default profile should gain runContracts state');
  assert.deepEqual(migrated.runContracts.activeIds, DEFAULT_ACTIVE_RUN_CONTRACT_IDS);
  const menuState = getRunContractMenuState(migrated);
  assert.equal(menuState.title, 'PILOT ORDERS');
  assert.equal(menuState.subtitle, 'Starter combat goals for Mayhem.');
  assert.equal(menuState.status, 'active');
  assert.equal(menuState.active.length, 3, 'menu state should expose three active orders');
  assert.equal(menuState.rewardsEnabled, false, 'rewards should stay disabled');

  let session = startRunContractSession({ runMode: RUN_MODES.RANKED, progress: migrated });
  for (let index = 0; index < 2; index += 1) {
    const result = applyRunContractEvent(session, { type: 'near_miss', streak: index + 1, sector: 1 });
    session = result.session;
    assert.equal(result.completed.length, 0, 'Graze order should wait for the third graze');
  }
  const grazeResult = applyRunContractEvent(session, { type: 'near_miss', streak: 3, sector: 1 });
  assert.equal(grazeResult.completed.length, 1, 'third graze should complete the ranked order');
  assert.equal(grazeResult.completed[0].id, 'graze_break_drill');
  assert.equal(findSessionItem(grazeResult.session, 'graze_break_drill').progress, 3);

  const supportResult = applyEvents(sessionFor(['support_hunter']), [
    { type: 'boss_support_defeated', sector: 4 },
    { type: 'boss_support_defeated', sector: 4 }
  ]);
  assert.deepEqual(supportResult.completed.map((entry) => entry.id), ['support_hunter']);

  const slowNope = applyRunContractEvent(sessionFor(['slow_mo_finisher']), { type: 'boss_defeated', slowTimeActive: false, sector: 2 });
  assert.equal(slowNope.completed.length, 0, 'boss defeat without Slow Time should not satisfy Slow-Mo Finisher');
  const slowResult = applyRunContractEvent(slowNope.session, { type: 'boss_defeated', slowTimeActive: true, sector: 2 });
  assert.deepEqual(slowResult.completed.map((entry) => entry.id), ['slow_mo_finisher']);

  const phaseResult = applyRunContractEvent(sessionFor(['phase_runner']), { type: 'phase_used', dangerous: true, sector: 1 });
  assert.deepEqual(phaseResult.completed.map((entry) => entry.id), ['phase_runner']);

  const nearMissResult = applyRunContractEvent(sessionFor(['near_miss_streak']), { type: 'near_miss', streak: 5, sector: 1 });
  assert.deepEqual(nearMissResult.completed.map((entry) => entry.id), ['near_miss_streak']);

  const blinkResult = applyRunContractEvent(sessionFor(['blink_control']), { type: 'blink_drive_survived', survivedSeconds: 6, sector: 1 });
  assert.deepEqual(blinkResult.completed.map((entry) => entry.id), ['blink_control']);

  const sectorFailed = applyEvents(sessionFor(['sector_5_survivor']), [
    { type: 'life_lost', sector: 3 },
    { type: 'sector_reached', sector: 5 }
  ]);
  assert.equal(sectorFailed.completed.length, 0, 'Sector 5 Survivor should require no life loss');
  const sectorResult = applyRunContractEvent(sessionFor(['sector_5_survivor']), { type: 'sector_reached', sector: 5 });
  assert.deepEqual(sectorResult.completed.map((entry) => entry.id), ['sector_5_survivor']);

  const bossBreaker = applyRunContractEvent(sessionFor(['boss_breaker']), { type: 'boss_defeated', sector: 2 });
  assert.deepEqual(bossBreaker.completed.map((entry) => entry.id), ['boss_breaker']);

  const sectorTen = applyRunContractEvent(sessionFor(['sector_10_signal']), { type: 'sector_reached', sector: 10 });
  assert.deepEqual(sectorTen.completed.map((entry) => entry.id), ['sector_10_signal']);

  const enemySweepBase = normalizeRunContractsState({ activeIds: ['enemy_sweep_1000'] });
  const enemySweepPartial = applyEvents(sessionFor(['enemy_sweep_1000']), [
    { type: 'enemy_defeated', sector: 2, count: 250 },
    { type: 'enemy_defeated', sector: 3, count: 250 }
  ]);
  assert.equal(findSessionItem(enemySweepPartial.session, 'enemy_sweep_1000').progress, 500, 'enemy sweep should count cumulative enemy defeats');
  const savedSweep = recordRunContractSessionProgress(enemySweepBase, enemySweepPartial.session);
  const resumedSweep = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      runContracts: normalizeRunContractsState({
        ...savedSweep,
        activeIds: ['enemy_sweep_1000']
      })
    }
  });
  assert.equal(findSessionItem(resumedSweep, 'enemy_sweep_1000').progress, 500, 'enemy sweep should preserve progress across eligible Mayhem starts');
  const enemySweepComplete = applyRunContractEvent(resumedSweep, { type: 'enemy_defeated', sector: 4, count: 500 });
  assert.deepEqual(enemySweepComplete.completed.map((entry) => entry.id), ['enemy_sweep_1000']);

  const scoutSession = startRunContractSession({ runMode: RUN_MODES.SCOUT, progress: migrated });
  const scoutResult = applyRunContractEvent(scoutSession, { type: 'near_miss', streak: 1, sector: 1 });
  assert.equal(scoutResult.completed.length, 0, 'Scout runs should not complete Mayhem-only orders');
  assert.equal(findSessionItem(scoutResult.session, 'graze_break_drill').eligible, false);

  let firstSave = recordRunContractCompletion(migrated.runContracts, grazeResult.completed[0]);
  firstSave = recordRunContractSessionProgress(firstSave, applyRunContractEvent(sessionFor(['support_hunter']), { type: 'boss_support_defeated', sector: 3 }).session);
  assert.equal(firstSave.progress.support_hunter.progress, 1, 'partial progress should persist for active unfinished orders');

  const completedFirstThree = completeIds(migrated.runContracts, FIRST_THREE);
  assert.deepEqual(completedFirstThree.activeIds, FIRST_THREE, 'completed orders should linger in active slots before transition');
  const completedMenu = getRunContractMenuState(completedFirstThree);
  assert.equal(completedMenu.active[0].progress, 3, 'completed active row should report target progress');
  assert.equal(completedMenu.active[0].completed, true);

  const rotated = prepareRunContractsForEligibleRun(completedFirstThree);
  assert.deepEqual(rotated.activeIds, SECOND_THREE, 'next eligible Mayhem run should rotate completed starters out');
  assert.deepEqual(Object.keys(rotated.progress), [], 'rotation should clear old partial active progress');

  const allComplete = completeIds(migrated.runContracts, RUN_CONTRACT_ORDER_IDS);
  assert.ok(allComplete.allCompletedAt, 'all-complete state should keep a lightweight completion timestamp');
  const allCompleteMenu = getRunContractMenuState(allComplete);
  assert.equal(allCompleteMenu.status, 'complete');
  assert.equal(allCompleteMenu.completionTitle, 'PILOT ORDERS COMPLETE');
  assert.equal(allCompleteMenu.completionNoticeSeen, false);
  assert.ok(allCompleteMenu.allCompletedAt, 'menu state should expose all-complete timestamp');
  const acknowledged = acknowledgeRunContractCompletionNotice(allComplete);
  assert.equal(acknowledged.completionNoticeSeen, true);
  assert.ok(acknowledged.completionNoticeSeenAt, 'acknowledged state should record notice seen time');
  const hiddenMenu = getRunContractMenuState(acknowledged);
  assert.equal(hiddenMenu.status, 'hidden', 'all-complete board should hide after the completion notice is seen');
  assert.equal(hiddenMenu.completionNoticeSeen, true);
  assert.ok(hiddenMenu.completionNoticeSeenAt, 'hidden menu state should expose notice seen time');

  const merged = mergeRunContractsState(
    { completed: { graze_break_drill: { id: 'graze_break_drill', count: 1, completedAt: '2026-07-02T10:00:00.000Z' } } },
    { completed: { graze_break_drill: { id: 'graze_break_drill', count: 4, completedAt: '2026-07-02T11:00:00.000Z' } } }
  );
  assert.equal(merged.completed.graze_break_drill.count, 4, 'cloud/local merge should keep the higher completion count');
  const mergedAcknowledged = mergeRunContractsState(acknowledged, {});
  assert.equal(mergedAcknowledged.completionNoticeSeen, true, 'merge should preserve completion notice acknowledgement');
  assert.ok(mergedAcknowledged.completionNoticeSeenAt, 'merge should preserve notice seen timestamp');

  writeHangarProgressState({
    ...migrated,
    runContracts: completedFirstThree
  });
  const written = JSON.parse(storage.getItem(HANGAR_PROGRESS_KEY));
  assert.equal(written.runContracts.completed.graze_break_drill.count, 1, 'hangar profile should persist order completions');

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

  const expandedCompleteState = normalizeRunContractsState({
    version: RUN_CONTRACTS_VERSION - 1,
    activeIds: FIRST_THREE,
    completedIds: RUN_CONTRACT_ORDER_IDS.filter((id) => id !== 'enemy_sweep_1000'),
    completed: Object.fromEntries(RUN_CONTRACT_ORDER_IDS
      .filter((id) => id !== 'enemy_sweep_1000')
      .map((id) => [id, completion(id)])),
    completionNoticeSeen: true
  });
  assert.deepEqual(expandedCompleteState.activeIds, ['enemy_sweep_1000'], 'catalog expansion should surface the new unfinished starter order');
  assert.equal(expandedCompleteState.completionNoticeSeen, false, 'catalog expansion should let the final completion notice show again after the new order');
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

async function waitForMenu(page) {
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
}

async function seedMenuProfile(page, runContracts, uiScale) {
  await page.evaluate(({ key, runContracts: seededRunContracts, uiScale: seededUiScale }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova_ui_scale_v1', String(seededUiScale));
    if (seededRunContracts) {
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        runContracts: seededRunContracts
      }));
    }
  }, {
    key: HANGAR_PROGRESS_KEY,
    runContracts,
    uiScale
  });
}

async function captureMenuProof(page, { label, width, height, uiScale = 1, runContracts = null, expectedStatus = 'active', waitMs = 2400 }) {
  await page.setViewportSize({ width, height });
  await seedMenuProfile(page, runContracts, uiScale);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForMenu(page);
  await page.waitForTimeout(waitMs);
  const state = await readState(page);
  const screenshot = path.join(outputDir, `${label}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  assertPilotOrdersLayout(state.menu, expectedStatus);
  return {
    label,
    width,
    height,
    uiScale,
    screenshot,
    focusedOption: state.menu?.focusedOption || null,
    state
  };
}

function assertInside(bounds, screen, label) {
  assert.ok(bounds?.width > 0 && bounds?.height > 0, `${label}: missing bounds`);
  assert.ok(bounds.x >= -2, `${label}: left edge offscreen`);
  assert.ok(bounds.y >= -2, `${label}: top edge offscreen`);
  assert.ok(bounds.right <= screen.width + 2, `${label}: right edge offscreen`);
  assert.ok(bounds.bottom <= screen.height + 2, `${label}: bottom edge offscreen`);
}

function boundsOverlap(a, b, pad = 0) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + pad <= b.x
    || b.x + b.width + pad <= a.x
    || a.y + a.height + pad <= b.y
    || b.y + b.height + pad <= a.y
  );
}

function assertPilotOrdersLayout(menu, expectedStatus = 'active') {
  const screen = menu?.screen;
  const board = menu?.missionBoard;
  assert.ok(screen?.width > 0 && screen?.height > 0, 'menu screen bounds should be exposed');
  assert.match(menu?.missionBriefing?.title || '', /^RUN MODES \/\/ /, 'run mode panel should avoid Mission wording repetition');
  assert.equal(board?.status, expectedStatus);

  if (expectedStatus === 'hidden') {
    assert.equal(board?.hidden, true, 'completed Pilot Orders board should be hidden after notice is seen');
    assert.equal(board?.rows?.length, 0, 'hidden Pilot Orders board should expose no visible rows');
    return;
  }

  assertInside(board.bounds, screen, 'Pilot Orders');
  assertInside(board.titleBounds, screen, 'Pilot Orders title');
  assertInside(board.subtitleBounds, screen, 'Pilot Orders subtitle');
  assert.ok(Math.abs(board.bounds.x - menu.launchDeck.bounds.x) <= 2, 'Pilot Orders should align with launch deck x');
  assert.ok(Math.abs(board.bounds.width - menu.launchDeck.bounds.width) <= 8, 'Pilot Orders should align with launch deck width');
  assert.ok(board.bounds.y >= menu.launchDeck.bounds.bottom - 6, 'Pilot Orders should sit below the launch deck');
  assert.ok(board.bounds.bottom <= menu.panel.y + 6, 'Pilot Orders should stay above the utility dock');

  if (expectedStatus === 'complete') {
    assert.equal(board.title, 'PILOT ORDERS COMPLETE');
    assert.equal(board.subtitle, 'All starter combat goals cleared.');
    assert.equal(board.rows.length, 0, 'complete notice should not show active rows');
    return;
  }

  assert.equal(board?.title, 'PILOT ORDERS');
  assert.equal(board?.subtitle, 'Starter combat goals for Mayhem.');
  assert.equal(board?.rows?.length, 3, 'Pilot Orders should show exactly three active rows');
  for (const row of board.rows) {
    assertInside(row.bounds, screen, `${row.id} row`);
    assertInside(row.titleBounds, screen, `${row.id} title`);
    assertInside(row.detailBounds, screen, `${row.id} detail`);
    assertInside(row.progressBounds, screen, `${row.id} progress`);
    assert.ok(!boundsOverlap(row.titleBounds, row.detailBounds, 0), `${row.id} title/detail text should not overlap`);
    assert.ok(!boundsOverlap(row.titleBounds, row.progressBounds, 2), `${row.id} title/progress text should not overlap`);
    assert.ok(!boundsOverlap(row.detailBounds, row.progressBounds, 2), `${row.id} detail/progress text should not overlap`);
    assert.equal(row.detail, ACTIVE_DESCRIPTIONS[row.id], `${row.id} should show its starter goal description`);
    assert.match(row.progress, /^(COMPLETE|[0-9]+\/[0-9]+)$/, `${row.id} should show clear progress`);
  }
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
    mkdirSync(outputDir, { recursive: true });

    const activeState = runContractState();
    const completedOrderState = runContractState({ completedIds: ['graze_break_drill'] });
    const completeNoticeState = runContractState({ completedIds: RUN_CONTRACT_ORDER_IDS, completionNoticeSeen: false });
    const hiddenState = runContractState({ completedIds: RUN_CONTRACT_ORDER_IDS, completionNoticeSeen: true });
    const finalRunState = runContractState({
      activeIds: ['graze_break_drill'],
      completedIds: RUN_CONTRACT_ORDER_IDS.filter((id) => id !== 'graze_break_drill'),
      completionNoticeSeen: false
    });

    const activeProof = await captureMenuProof(page, {
      label: 'pilot-orders-active-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: activeState,
      expectedStatus: 'active'
    });
    assert.deepEqual(activeProof.state.menu.missionBoard.rows.map((row) => row.id), FIRST_THREE);
    assert.deepEqual(activeProof.state.menu.missionBoard.rows.map((row) => row.progress), ['0/3', '0/2', '0/1']);

    const steamDeckProof = await captureMenuProof(page, {
      label: 'pilot-orders-steam-deck',
      width: 1280,
      height: 800,
      uiScale: 1,
      runContracts: activeState,
      expectedStatus: 'active'
    });

    const largeUiProof = await captureMenuProof(page, {
      label: 'pilot-orders-1080p-ui150',
      width: 1920,
      height: 1080,
      uiScale: 1.5,
      runContracts: activeState,
      expectedStatus: 'active'
    });

    const completedProof = await captureMenuProof(page, {
      label: 'pilot-orders-completed-order-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: completedOrderState,
      expectedStatus: 'active'
    });
    assert.equal(completedProof.state.menu.missionBoard.rows[0].progress, 'COMPLETE');

    const completeProof = await captureMenuProof(page, {
      label: 'pilot-orders-complete-state-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: completeNoticeState,
      expectedStatus: 'complete'
    });
    assert.equal(completeProof.state.menu.missionBoard.completionNoticePending, true, 'complete notice should wait to be acknowledged until visible');

    const hiddenProof = await captureMenuProof(page, {
      label: 'pilot-orders-hidden-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: hiddenState,
      expectedStatus: 'hidden'
    });

    const autoHiddenProof = await captureMenuProof(page, {
      label: 'pilot-orders-hidden-after-completion-notice',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: completeNoticeState,
      expectedStatus: 'hidden',
      waitMs: 4400
    });
    assert.equal(autoHiddenProof.state.menu.missionBoard.completionNoticeSeen, true, 'visible completion notice should be marked seen before hiding');

    await page.setViewportSize({ width: 1280, height: 720 });
    await seedMenuProfile(page, finalRunState, 1);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForMenu(page);
    await page.waitForTimeout(500);

    await page.evaluate(async () => {
      window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
      await window.__game?.startGame?.(undefined, { runMode: 'ranked' });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && Boolean(window.__game?.scenes?.play?.emitRunContractEvent);
    }, null, { timeout: 30000 });

    await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      for (let index = 0; index < 3; index += 1) {
        play.emitRunContractEvent('near_miss', { streak: index + 1, sector: window.__game?.level || 1 });
      }
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return (state.toast?.active || []).some((toast) => String(toast.message || '').includes('ORDER COMPLETE'));
    }, null, { timeout: 5000 });
    const completionResult = await page.evaluate(() => {
      const textState = JSON.parse(window.render_game_to_text?.() || '{}');
      const profile = JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}');
      return {
        runContracts: textState.runContracts,
        toastActive: textState.toast?.active || [],
        toastMessages: (textState.toast?.active || []).map((toast) => toast.message),
        savedRunContracts: profile.runContracts || null
      };
    });
    const graze = completionResult.runContracts?.active?.find((item) => item.id === 'graze_break_drill');
    assert.equal(graze?.progress, 3, 'in-run Graze order should reach target');
    assert.equal(graze?.completed, true, 'in-run Graze order should mark complete');
    assert.equal(completionResult.runContracts?.allCompleteThisRun, true, 'final order completion should be exposed to run report state');
    assert.equal(
      completionResult.savedRunContracts?.completed?.graze_break_drill?.count,
      1,
      'completion should persist to hangar profile'
    );
    assert.ok(
      completionResult.toastMessages.some((message) => message.includes('ORDER COMPLETE: Graze x3')),
      'completion toast should be visible through text state'
    );
    const orderToast = completionResult.toastActive.find((toast) => String(toast.message || '').includes('ORDER COMPLETE'));
    assert.equal(orderToast?.slot, 'top', 'completion toast should use the top queue instead of the crowded corner');
    assert.equal(orderToast?.type, 'runContract', 'completion toast should expose the runContract type');
    assert.ok(orderToast?.duration >= 3200, 'completion toast should stay visible long enough to notice');

    await page.waitForTimeout(250);
    const playScreenshot = path.join(outputDir, 'pilot-order-complete-play.png');
    await page.screenshot({ path: playScreenshot, fullPage: true });

    await page.evaluate(() => {
      const game = window.__game;
      game.score = Math.max(game.score || 0, 12345);
      game.gameOver();
    });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'gameOver', null, { timeout: 30000 });
    await page.evaluate(() => {
      window.__game?.scenes?.gameOver?.openRunReport?.();
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'gameOver' && state.gameOver?.runReportOverlay?.visible === true;
    }, null, { timeout: 10000 });
    const reportState = await readState(page);
    assert.match(reportState.gameOver?.runReportOverlay?.text || '', /Pilot orders: PILOT ORDERS COMPLETE, Graze x3/);
    const reportScreenshot = path.join(outputDir, 'pilot-orders-run-report.png');
    await page.screenshot({ path: reportScreenshot, fullPage: true });

    const report = {
      ok: pageErrors.length === 0 && consoleErrors.length === 0,
      baseUrl,
      activeRows: activeProof.state.menu.missionBoard.rows.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.detail,
        progress: row.progress,
        bounds: row.bounds
      })),
      completionResult,
      runReportText: reportState.gameOver?.runReportOverlay?.text || '',
      pageErrors,
      consoleErrors,
      screenshots: {
        activeMenu: activeProof.screenshot,
        steamDeckMenu: steamDeckProof.screenshot,
        largeUiMenu: largeUiProof.screenshot,
        completedOrderMenu: completedProof.screenshot,
        completeStateMenu: completeProof.screenshot,
        hiddenMenu: hiddenProof.screenshot,
        hiddenAfterCompletionNotice: autoHiddenProof.screenshot,
        playToast: playScreenshot,
        runReport: reportScreenshot
      }
    };
    writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    assert.deepEqual(pageErrors, [], 'browser page errors should be empty');
    assert.deepEqual(consoleErrors, [], 'browser console errors should be empty');
    console.log(`[run-contracts] PASS active=${activeProof.screenshot} toast=${playScreenshot} report=${reportScreenshot}`);
    return report;
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

runCatalogAndSaveTests();
await runBrowserSmoke();
