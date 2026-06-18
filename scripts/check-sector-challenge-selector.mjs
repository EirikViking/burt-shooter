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

function makeProgress() {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 6800,
    pilotRank: 5,
    highestPilotRank: 5,
    totalRuns: 12,
    bestScore: 8848,
    bestSector: 32,
    bestLevel: 32,
    bestRank: 5,
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

async function seedProfile(page) {
  await page.addInitScript(({ progress, records }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.sectorStartChallengeRecords.v1', JSON.stringify(records));
  }, { progress: makeProgress(), records: challengeRecords() });
}

async function waitForMenu(page) {
  await page.waitForFunction(() => document.body?.dataset?.menuReady === '1', null, { timeout: 30000 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
  await refreshLoadedMenuProfile(page);
  await page.waitForTimeout(400);
  return readState(page);
}

async function refreshLoadedMenuProfile(page) {
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
  }, { progress: makeProgress(), records: challengeRecords() });
}

async function clickBounds(page, bounds) {
  assert.ok(bounds?.width > 0 && bounds?.height > 0, `cannot click missing bounds: ${JSON.stringify(bounds)}`);
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

function sectorEntry(state, sector) {
  return state.menu?.sectorStart?.selector?.sectors?.find((entry) => entry.sector === sector);
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

async function newSeededPage(browser, viewport = { width: 1920, height: 1080 }) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await seedProfile(page);
  await page.goto(withQuery({ skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForMenu(page);
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
  await page.waitForTimeout(1800);
  state = await readState(page);
  assert.equal(state.menu.sectorStart.arrowCueVisible, false, 'sector challenge dock tile should not show stepper arrows');
  await page.screenshot({ path: path.join(outputDir, 'main-menu-1920x1080.png'), fullPage: false });
  await page.evaluate(() => {
    const menu = window.__game?.scenes?.menu;
    menu?.setMenuFocusByButton?.(menu.sectorStartBtn);
  });
  await page.waitForTimeout(250);
  state = await readState(page);
  assert.equal(state.menu.focusedOption, 'sectorStart', 'sector challenge tile should be focusable as a single button');
  assert.equal(state.menu.sectorStart.arrowCueVisible, false, 'focused sector challenge tile should still not show stepper arrows');
  await page.screenshot({ path: path.join(outputDir, 'main-menu-sector-focused-1920x1080.png'), fullPage: false });
  const selectedCheckpointBeforeArrow = state.menu.sectorStart.selectedCheckpoint;
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(120);
  state = await readState(page);
  assert.equal(state.menu.focusedOption, 'launch', 'left from Sector Challenge should move dock focus to Launch Run');
  assert.equal(state.menu.sectorStart.selectedCheckpoint, selectedCheckpointBeforeArrow, 'left/right dock navigation must not cycle selected checkpoint');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(120);
  state = await readState(page);
  assert.equal(state.menu.focusedOption, 'sectorStart', 'right from Launch Run should return focus to Sector Challenge');
  assert.equal(state.menu.sectorStart.selectedCheckpoint, selectedCheckpointBeforeArrow, 'returning focus should not cycle selected checkpoint');

  await page.evaluate(() => {
    const menu = window.__game?.scenes?.menu;
    window.__exitButtonCalled = false;
    menu.exitGame = () => {
      window.__exitButtonCalled = true;
    };
  });
  await clickBounds(page, state.menu.items.exitButton);
  await page.waitForFunction(() => window.__exitButtonCalled === true, null, { timeout: 5000 });
  report.cases.push({ exitAccessible: true, exitButton: state.menu.items.exitButton });

  state = await openSelector(page);
  await page.screenshot({ path: path.join(outputDir, 'selector-open-1920x1080.png'), fullPage: false });

  const selector = state.menu.sectorStart.selector;
  assert.equal(selector.title, 'SELECT START POINT', 'selector title mismatch');
  assert.ok(selector.sectors.length >= 32, 'selector should list at least 32 sectors');
  assert.equal(sectorEntry(state, 5)?.unlocked, true, 'sector 5 should be unlocked by seeded progress');
  assert.equal(sectorEntry(state, 5)?.playSector, 5, 'sector 5 must map to play sector 5');
  assert.equal(sectorEntry(state, 10)?.playSector, 11, 'checkpoint 10 must map to play sector 11');
  assert.equal(sectorEntry(state, 20)?.playSector, 21, 'checkpoint 20 must map to play sector 21');
  assert.equal(sectorEntry(state, 30)?.playSector, 31, 'checkpoint 30 must map to play sector 31');
  assert.equal(sectorEntry(state, 10)?.overrunCheckpoint, true, 'checkpoint 10 should be flagged as Overrun boundary');
  assert.equal(sectorEntry(state, 20)?.overrunCheckpoint, true, 'checkpoint 20 should be flagged as Overrun boundary');
  assert.equal(sectorEntry(state, 30)?.overrunCheckpoint, true, 'checkpoint 30 should be flagged as Overrun boundary');
  assert.equal(sectorEntry(state, 4)?.unlocked, false, 'sector 4 should be locked because it is not an existing checkpoint');
  assert.equal(sectorEntry(state, 32)?.unlocked, false, 'sector 32 should not be invented as an unlocked checkpoint');
  assert.ok(selector.panelBounds?.width > 0 && selector.gridBounds?.width > 0, 'selector bounds should be visible');
  assert.ok(selector.launchButtonBounds?.width > 0, 'selector launch action should be visible');
  assert.ok(selector.backButtonBounds?.width > 0, 'selector back action should be visible');
  report.cases.push({
    open: true,
    selectedSector: selector.selectedSector,
    sector5: sectorEntry(state, 5),
    checkpoint10: sectorEntry(state, 10),
    checkpoint20: sectorEntry(state, 20),
    checkpoint30: sectorEntry(state, 30),
    sector4: sectorEntry(state, 4),
    sector32: sectorEntry(state, 32)
  });

  for (const sector of [5, 10, 20, 30]) {
    state = await selectSectorForScreenshot(page, sector);
    const expectedPlaySector = sector === 5 ? 5 : sector + 1;
    const label = state.menu.sectorStart.selector.launchLabel;
    assert.ok(label.includes(String(expectedPlaySector)), `launch label for ${sector} should mention play sector ${expectedPlaySector}`);
    if (sector !== 5) {
      assert.ok(state.menu.sectorStart.selector.detailText.includes('OVERRUN'), `checkpoint ${sector} detail should explain Overrun`);
      assert.ok(state.menu.sectorStart.selector.detailText.includes(String(expectedPlaySector)), `checkpoint ${sector} detail should mention sector ${expectedPlaySector}`);
    }
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
  await clickBounds(page, state.menu.items.launchButton);
  await page.waitForTimeout(150);
  state = await readState(page);
  assert.equal(state.menu.sectorStart.selector.open, true, 'underlying launch button should be inert while selector is open');
  assert.equal(await page.evaluate(() => window.__sectorSelectorStartArgs), null, 'underlying launch must not start a run while selector is open');

  await clickBounds(page, sectorEntry(state, 4).bounds);
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
