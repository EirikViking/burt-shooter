import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4749));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/sector-challenge-selector-${timestamp()}`);
const pageErrors = [];
const consoleErrors = [];

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
  throw new Error(`No available sector selector check port found starting at ${startPort}`);
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
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
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

function makeProgress({
  bestSector = 32,
  bestLevel = bestSector,
  pilotXp = 6800,
  pilotRank = 5,
  highestPilotRank = pilotRank,
  bestScore = 8848,
  totalRuns = 12
} = {}) {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp,
    pilotRank,
    highestPilotRank,
    totalRuns,
    bestScore,
    bestSector,
    bestLevel,
    bestRank: pilotRank,
    bestRunTimeSeconds: 720,
    survivedSeconds: 720,
    totalBossesDefeated: 10,
    totalWavesCleared: 72,
    totalCodexDiscoveries: 25,
    runClears: 0,
    noHitWaves: 0,
    noHitSectors: 0,
    clearWithLivesRemaining: 0,
    highestScoreMultiplier: 1,
    shipSpecificMilestones: {},
    discoveredThreatIds: [],
    defeatedBossIds: [],
    runThemesSurvived: [],
    secretShipUnlockIds: [],
    creditsEasterEggFound: false,
    unlockedShipIds: ['nova_ship_01'],
    lastNewlyUnlockedShipIds: [],
    newRanksThisRun: [],
    rankAchievementsUnlocked: [],
    updatedAt: '2026-06-17T00:00:00.000Z'
  };
}

function challengeRecords() {
  return {
    version: 1,
    updatedAt: '2026-06-17T00:00:00.000Z',
    byCheckpoint: {
      5: {
        startSector: 5,
        scoreEarned: 1200,
        highestSectorReached: 6,
        finalSector: 6,
        shipId: 'nova_ship_01',
        shipName: 'Nova Sparrow',
        completedAt: '2026-06-17T00:00:00.000Z'
      },
      10: {
        startSector: 10,
        scoreEarned: 2400,
        highestSectorReached: 12,
        finalSector: 12,
        shipId: 'nova_ship_01',
        shipName: 'Nova Sparrow',
        completedAt: '2026-06-17T00:00:00.000Z'
      },
      20: {
        startSector: 20,
        scoreEarned: 5200,
        highestSectorReached: 22,
        finalSector: 22,
        shipId: 'nova_ship_01',
        shipName: 'Nova Sparrow',
        completedAt: '2026-06-17T00:00:00.000Z'
      },
      30: {
        startSector: 30,
        scoreEarned: 8848,
        highestSectorReached: 32,
        finalSector: 32,
        shipId: 'nova_ship_01',
        shipName: 'Nova Sparrow',
        completedAt: '2026-06-17T00:00:00.000Z'
      }
    }
  };
}

function withQuery(query) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url.toString();
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function seedProfile(page, progress = makeProgress(), records = challengeRecords()) {
  await page.addInitScript(({ progress, records }) => {
    localStorage.clear();
    window.__novaExitRequests = [];
    Object.defineProperty(window, '__novaApp', {
      configurable: true,
      value: {
        exitGame: async (payload) => {
          window.__novaExitRequests.push(payload || {});
          return { ok: false, canceled: true };
        }
      }
    });
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.sectorStartChallengeRecords.v1', JSON.stringify(records));
  }, { progress, records });
}

async function waitForMenu(page, progress = makeProgress(), records = challengeRecords()) {
  await page.waitForFunction(() => document.body?.dataset?.menuReady === '1', null, { timeout: 30000 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
  await refreshLoadedMenuProfile(page, progress, records);
  await page.waitForTimeout(400);
  return readState(page);
}

async function refreshLoadedMenuProfile(page, progress = makeProgress(), records = challengeRecords()) {
  await page.evaluate(({ progress, records }) => {
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.sectorStartChallengeRecords.v1', JSON.stringify(records));
    const menu = window.__game?.scenes?.menu;
    if (!menu) throw new Error('Menu scene missing while refreshing sector selector test profile');
    menu.refreshSectorStartState?.();
    menu.updateSectorStartButton?.({ forceGpuRefresh: true });
    menu.layoutMenu?.({ forceLabelGpuRefresh: true });
  }, { progress, records });
}

async function clickBounds(page, bounds) {
  assert.ok(bounds?.width > 0 && bounds?.height > 0, `cannot click missing bounds: ${JSON.stringify(bounds)}`);
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

function sectorEntry(state, sector) {
  return state.menu?.sectorStart?.selector?.sectors?.find((entry) => entry.sector === sector);
}

function assertNoNonCheckpointTiles(state, label) {
  const sectors = state.menu?.sectorStart?.selector?.sectors || [];
  assert.ok(sectors.length > 0, `${label}: selector should expose checkpoint cards`);
  for (const entry of sectors) {
    assert.equal(entry.sector % 5, 0, `${label}: selector should only show 5-sector checkpoint cards, found ${entry.sector}`);
    assert.equal(entry.checkpointEligible, true, `${label}: checkpoint card ${entry.sector} should be marked eligible`);
  }
}

async function selectSectorForScreenshot(page, sector) {
  await page.evaluate((targetSector) => {
    const menu = window.__game?.scenes?.menu;
    if (!menu?.sectorSelectorOpen) throw new Error('sector selector is not open');
    const index = menu.sectorSelectorSectors.findIndex((entry) => entry.sector === targetSector);
    if (index < 0) throw new Error(`sector ${targetSector} not present in selector`);
    menu.selectedSectorSelectorIndex = index;
    menu.drawSectorSelectorOverlay();
  }, sector);
  await page.waitForTimeout(100);
  return readState(page);
}

async function newSeededPage(
  browser,
  viewport = { width: 1920, height: 1080 },
  progress = makeProgress(),
  records = challengeRecords()
) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await seedProfile(page, progress, records);
  await page.goto(withQuery({ skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForMenu(page, progress, records);
  return page;
}

async function openSelector(page) {
  let state = await readState(page);
  assert.equal(state.scene, 'menu', 'expected menu before opening selector');
  await clickBounds(page, state.menu.items.sectorStartButton);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.menu?.sectorStart?.selector?.open === true;
  }, null, { timeout: 8000 });
  await page.waitForTimeout(150);
  return readState(page);
}

async function stubStartGame(page) {
  await page.evaluate(() => {
    const game = window.__game;
    window.__sectorSelectorStartArgs = null;
    game.startGame = (...args) => {
      window.__sectorSelectorStartArgs = args;
      return false;
    };
  });
}

async function assertStubLaunch(page, sector, expectedPlaySector) {
  let state = await selectSectorForScreenshot(page, sector);
  await stubStartGame(page);
  await clickBounds(page, sectorEntry(state, sector).bounds);
  await page.waitForFunction(() => Boolean(window.__sectorSelectorStartArgs), null, { timeout: 8000 });
  const startArgs = await page.evaluate(() => window.__sectorSelectorStartArgs);
  assert.equal(startArgs[1]?.runMode, 'sector_start', `sector ${sector} should use sector_start run mode`);
  assert.equal(startArgs[1]?.startSector, sector, `selector cell ${sector} should request checkpoint ${sector}`);
  assert.equal(sectorEntry(state, sector)?.playSector, expectedPlaySector, `checkpoint ${sector} should map to play sector ${expectedPlaySector}`);
  return startArgs;
}

async function assertRealLaunchSpawn(browser, checkpoint, expectedPlaySector) {
  const page = await newSeededPage(browser);
  let state = await openSelector(page);
  await selectSectorForScreenshot(page, checkpoint);
  state = await readState(page);
  await clickBounds(page, sectorEntry(state, checkpoint).bounds);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play';
  }, null, { timeout: 12000 });
  await page.waitForTimeout(450);
  state = await readState(page);
  const challenge = state.sectorStartChallenge || {};
  assert.equal(challenge.checkpoint, checkpoint, `checkpoint ${checkpoint} should be recorded in play state`);
  assert.equal(challenge.playSector, expectedPlaySector, `checkpoint ${checkpoint} should spawn at sector ${expectedPlaySector}`);
  assert.equal(state.sector?.number, expectedPlaySector, `visible sector should be ${expectedPlaySector}`);
  assert.notEqual(state.overrunInterlude?.active, true, `checkpoint ${checkpoint} must not spawn into an active Overrun interlude`);
  assert.notEqual(state.overrunInterlude?.eventKind, 'run_clear', `checkpoint ${checkpoint} must not trigger run_clear Overrun event on spawn`);
  await page.close();
  return {
    checkpoint,
    expectedPlaySector,
    actualSector: state.sector?.number,
    overrunInterlude: state.overrunInterlude || null,
    score: state.score
  };
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  cases: []
};

try {
  await seedProfile(page);
  await page.goto(withQuery({ skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  let state = await waitForMenu(page);
  assert.equal(state.scene, 'menu', 'expected menu scene');
  assert.equal(state.menu?.sectorStart?.selector?.open, false, 'selector should start closed');
  assert.ok(state.menu.items.exitButton?.width > 0, 'exit button should be visible from the main menu');
  await page.waitForFunction(() => {
    const exitButton = window.__game?.scenes?.menu?.exitBtn;
    return exitButton?.visible === true && Number(exitButton.alpha) >= 0.99;
  }, null, { timeout: 15000 });
  state = await readState(page);
  assert.equal(state.menu.sectorStart.arrowCueVisible, false, 'sector run dock tile should not show stepper arrows');
  await page.screenshot({ path: path.join(outputDir, 'main-menu-1920x1080.png'), fullPage: false });
  await page.evaluate(() => {
    const menu = window.__game?.scenes?.menu;
    menu?.setMenuFocusByButton?.(menu.sectorStartBtn);
  });
  await page.waitForTimeout(250);
  state = await readState(page);
  assert.equal(state.menu.focusedOption, 'sectorStart', 'sector run tile should be focusable as a single button');
  assert.equal(state.menu.sectorStart.arrowCueVisible, false, 'focused sector run tile should still not show stepper arrows');
  await page.screenshot({ path: path.join(outputDir, 'main-menu-sector-focused-1920x1080.png'), fullPage: false });
  const selectedCheckpointBeforeArrow = state.menu.sectorStart.selectedCheckpoint;
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(120);
  state = await readState(page);
  assert.equal(state.menu.focusedOption, 'scout', 'left from Sector Run should move dock focus to Scout Run');
  assert.equal(state.menu.sectorStart.selectedCheckpoint, selectedCheckpointBeforeArrow, 'left/right dock navigation must not cycle selected checkpoint');
  const scoutAnomalyBeforeArrow = state.menu.scoutRun.anomaly?.id;
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(120);
  state = await readState(page);
  assert.equal(state.menu.focusedOption, 'scout', 'right on Scout Run should retain focus while cycling its anomaly');
  assert.notEqual(state.menu.scoutRun.anomaly?.id, scoutAnomalyBeforeArrow, 'right on Scout Run should cycle its anomaly');
  assert.equal(state.menu.sectorStart.selectedCheckpoint, selectedCheckpointBeforeArrow, 'cycling Scout anomaly must not change the selected sector checkpoint');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(120);
  state = await readState(page);
  assert.equal(state.menu.focusedOption, 'sectorStart', 'down from Scout Run should move focus to Sector Run');
  assert.equal(state.menu.sectorStart.selectedCheckpoint, selectedCheckpointBeforeArrow, 'returning focus should not cycle selected checkpoint');

  await clickBounds(page, state.menu.items.exitButton);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.menu?.quitConfirmation?.open === true &&
      state.menu?.quitConfirmation?.defaultFocusIsCancel === true;
  }, null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => window.__novaExitRequests?.length || 0), 0, 'top-right Exit should not request desktop exit before confirmation');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.menu?.quitConfirmation?.open === false;
  }, null, { timeout: 5000 });
  report.cases.push({ exitAccessible: true, exitButton: state.menu.items.exitButton, quitConfirmation: 'cancel-focused' });

  state = await openSelector(page);
  await page.screenshot({ path: path.join(outputDir, 'selector-open-1920x1080.png'), fullPage: false });

  const selector = state.menu.sectorStart.selector;
  assert.equal(selector.title, 'SELECT START POINT', 'selector title mismatch');
  assert.match(selector.subtitle || '', /Use Mayhem-unlocked checkpoints to push deeper/i, 'selector subtitle should explain the Sector Run purpose');
  assert.match(selector.subtitle || '', /New start points unlock every 5 sectors in Mayhem/i, 'selector subtitle should explain every-five checkpoint unlocks');
  assertNoNonCheckpointTiles(state, '1920 selector');
  assert.ok(selector.sectors.length >= 6, 'selector should list checkpoint start cards through current progress');
  assert.equal(sectorEntry(state, 5)?.unlocked, true, 'sector 5 should be unlocked by seeded progress');
  assert.equal(sectorEntry(state, 5)?.checkpointEligible, true, 'sector 5 should be a checkpoint start point');
  assert.equal(sectorEntry(state, 5)?.playSector, 5, 'sector 5 must map to play sector 5');
  assert.equal(sectorEntry(state, 4), undefined, 'sector 4 should not be shown because it is not a Sector Run start card');
  assert.equal(sectorEntry(state, 10)?.playSector, 11, 'checkpoint 10 must map to play sector 11');
  assert.equal(sectorEntry(state, 20)?.playSector, 21, 'checkpoint 20 must map to play sector 21');
  assert.equal(sectorEntry(state, 30)?.playSector, 31, 'checkpoint 30 must map to play sector 31');
  assert.equal(sectorEntry(state, 10)?.overrunCheckpoint, true, 'checkpoint 10 should be flagged as Overrun boundary');
  assert.equal(sectorEntry(state, 20)?.overrunCheckpoint, true, 'checkpoint 20 should be flagged as Overrun boundary');
  assert.equal(sectorEntry(state, 30)?.overrunCheckpoint, true, 'checkpoint 30 should be flagged as Overrun boundary');
  assert.equal(sectorEntry(state, 35)?.unlocked, false, 'checkpoint 35 should be visible but locked before reaching it');
  assert.equal(sectorEntry(state, 32), undefined, 'sector 32 should not be shown because it is not a checkpoint card');
  assert.ok(selector.panelBounds?.width > 0 && selector.gridBounds?.width > 0, 'selector bounds should be visible');
  assert.ok(selector.launchButtonBounds?.width > 0, 'selector launch action should be visible');
  assert.ok(selector.backButtonBounds?.width > 0, 'selector back action should be visible');
  state = await selectSectorForScreenshot(page, 35);
  assert.match(state.menu.sectorStart.selector.detailText || '', /LOCKED/);
  assert.match(state.menu.sectorStart.selector.detailText || '', /Unlock new start points every 5 sectors in Mayhem/i);
  assert.match(state.menu.sectorStart.selector.detailText || '', /Use Sector Run later to jump deeper without replaying early sectors/i);
  await page.screenshot({ path: path.join(outputDir, 'selector-locked-checkpoint-35-1920x1080.png'), fullPage: false });
  report.cases.push({
    open: true,
    selectedSector: selector.selectedSector,
    sector5: sectorEntry(state, 5),
    checkpoint10: sectorEntry(state, 10),
    checkpoint20: sectorEntry(state, 20),
    checkpoint30: sectorEntry(state, 30),
    checkpoint35: sectorEntry(state, 35),
    sector32: sectorEntry(state, 32)
  });

  const lockedCheckpointPage = await newSeededPage(
    browser,
    { width: 1366, height: 768 },
    makeProgress({ bestSector: 9, bestLevel: 9, pilotXp: 1200, pilotRank: 2, highestPilotRank: 2, bestScore: 4000, totalRuns: 3 }),
    { version: 1, updatedAt: '2026-06-19T00:00:00.000Z', byCheckpoint: {} }
  );
  let lockedCheckpointState = await openSelector(lockedCheckpointPage);
  assertNoNonCheckpointTiles(lockedCheckpointState, 'locked checkpoint selector');
  assert.deepEqual(lockedCheckpointState.menu.sectorStart.checkpoints, [5], 'sector 9 career progress should only unlock Sector 5');
  lockedCheckpointState = await selectSectorForScreenshot(lockedCheckpointPage, 10);
  assert.equal(sectorEntry(lockedCheckpointState, 10)?.checkpointEligible, true, 'sector 10 should be a checkpoint-eligible cell');
  assert.equal(sectorEntry(lockedCheckpointState, 10)?.unlocked, false, 'sector 10 should remain locked before clearing into sector 11');
  assert.match(lockedCheckpointState.menu.sectorStart.selector.detailText || '', /CLEAR SECTOR 10 IN MAYHEM RUN/);
  assert.match(lockedCheckpointState.menu.sectorStart.selector.detailText || '', /Begins at Sector 11/i);
  assert.match(lockedCheckpointState.menu.sectorStart.selector.detailText || '', /Unlock new start points every 5 sectors in Mayhem/i);
  assert.match(lockedCheckpointState.menu.sectorStart.selector.detailText || '', /Use Sector Run later to jump deeper without replaying early sectors/i);
  await lockedCheckpointPage.screenshot({ path: path.join(outputDir, 'selector-locked-checkpoint-10-1366x768.png'), fullPage: false });
  await lockedCheckpointPage.close();

  const matureProfilePage = await newSeededPage(
    browser,
    { width: 1920, height: 1080 },
    makeProgress({ bestSector: 88, bestLevel: 88, pilotXp: 48000, pilotRank: 24, highestPilotRank: 24, bestScore: 280000, totalRuns: 86 }),
    { version: 1, updatedAt: '2026-07-24T00:00:00.000Z', byCheckpoint: {} }
  );
  let matureProfileState = await openSelector(matureProfilePage);
  assertNoNonCheckpointTiles(matureProfileState, 'Sector 88 mature profile selector');
  assert.equal(sectorEntry(matureProfileState, 65)?.unlocked, true, 'legacy Sector 65 checkpoint should remain available');
  assert.equal(sectorEntry(matureProfileState, 70)?.unlocked, true, 'selector must continue beyond the old Sector 65 display ceiling');
  assert.equal(sectorEntry(matureProfileState, 85)?.unlocked, true, 'Sector 88 profile should expose its earned Sector 85 checkpoint');
  assert.equal(sectorEntry(matureProfileState, 85)?.playSector, 85, 'Sector 85 checkpoint should begin at Sector 85');
  assert.equal(sectorEntry(matureProfileState, 90)?.unlocked, false, 'Sector 90 must stay locked until its existing gate is earned');
  matureProfileState = await selectSectorForScreenshot(matureProfilePage, 85);
  assert.match(matureProfileState.menu.sectorStart.selector.launchLabel || '', /85/, 'mature profile launch action should target Sector 85');
  await matureProfilePage.screenshot({ path: path.join(outputDir, 'selector-sector-88-profile-1920x1080.png'), fullPage: false });
  report.cases.push({
    matureProfile: {
      highestSector: 88,
      checkpoint65: sectorEntry(matureProfileState, 65),
      checkpoint70: sectorEntry(matureProfileState, 70),
      checkpoint85: sectorEntry(matureProfileState, 85),
      checkpoint90: sectorEntry(matureProfileState, 90)
    }
  });
  await matureProfilePage.close();

  for (const sector of [5, 10, 20, 30]) {
    state = await selectSectorForScreenshot(page, sector);
    const expectedPlaySector = sector === 5 ? 5 : sector + 1;
    const label = state.menu.sectorStart.selector.launchLabel;
    assert.ok(label.includes(String(expectedPlaySector)), `launch label for ${sector} should mention play sector ${expectedPlaySector}`);
    assert.match(state.menu.sectorStart.selector.detailText || '', /Unlocked in Mayhem/i, `checkpoint ${sector} detail should explain Mayhem unlock source`);
    assert.match(state.menu.sectorStart.selector.detailText || '', /Sector record only/i, `checkpoint ${sector} detail should explain separate records`);
    assert.match(state.menu.sectorStart.selector.detailText || '', /No achievements/i, `checkpoint ${sector} detail should explain achievement lockout`);
    assert.match(state.menu.sectorStart.selector.detailText || '', new RegExp(`Begins at Sector ${expectedPlaySector}`, 'i'), `checkpoint ${sector} detail should mention play sector ${expectedPlaySector}`);
    await page.screenshot({ path: path.join(outputDir, `selector-selected-${sector}-1920x1080.png`), fullPage: false });
  }

  await page.evaluate(() => {
    const game = window.__game;
    window.__sectorSelectorStartArgs = null;
    game.startGame = (...args) => {
      window.__sectorSelectorStartArgs = args;
      return false;
    };
  });
  state = await readState(page);
  await clickBounds(page, state.menu.items.tacticalLaunchButton);
  await page.waitForTimeout(150);
  state = await readState(page);
  assert.equal(state.menu.sectorStart.selector.open, true, 'underlying launch button should be inert while selector is open');
  assert.equal(await page.evaluate(() => window.__sectorSelectorStartArgs), null, 'underlying launch must not start a run while selector is open');

  await clickBounds(page, sectorEntry(state, 35).bounds);
  await page.waitForTimeout(150);
  state = await readState(page);
  assert.equal(state.scene, 'menu', 'locked sector click must not leave menu');
  assert.equal(state.menu.sectorStart.selector.open, true, 'locked sector click should keep selector open');
  assert.equal(await page.evaluate(() => window.__sectorSelectorStartArgs), null, 'locked sector click must not launch');

  report.cases.push({
    stubLaunches: {
      sector5: await assertStubLaunch(page, 5, 5),
      checkpoint10: await assertStubLaunch(page, 10, 11),
      checkpoint20: await assertStubLaunch(page, 20, 21),
      checkpoint30: await assertStubLaunch(page, 30, 31)
    }
  });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  state = await readState(page);
  assert.equal(state.scene, 'menu', 'Escape should return to menu');
  assert.equal(state.menu.sectorStart.selector.open, false, 'Escape should close selector');

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1280, height: 800 }
  ]) {
    const responsivePage = await newSeededPage(browser, viewport);
    await openSelector(responsivePage);
    await selectSectorForScreenshot(responsivePage, 30);
    await responsivePage.screenshot({ path: path.join(outputDir, `selector-selected-30-${viewport.width}x${viewport.height}.png`), fullPage: false });
    await responsivePage.close();
  }

  report.cases.push({
    realLaunchSpawns: [
      await assertRealLaunchSpawn(browser, 5, 5),
      await assertRealLaunchSpawn(browser, 10, 11),
      await assertRealLaunchSpawn(browser, 20, 21),
      await assertRealLaunchSpawn(browser, 30, 31)
    ]
  });

  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join('; ')}`);
  report.ok = true;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[sector-challenge-selector] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  report.ok = false;
  report.error = error?.stack || String(error);
  report.pageErrors = pageErrors;
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.error(`[sector-challenge-selector] FAIL report=${path.join(outputDir, 'report.json')}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
