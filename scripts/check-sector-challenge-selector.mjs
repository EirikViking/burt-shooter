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

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
const consoleErrors = [];
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
  await clickBounds(page, state.menu.items.sectorStartButton);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.menu?.sectorStart?.selector?.open === true;
  }, null, { timeout: 8000 });
  state = await readState(page);
  await page.screenshot({ path: path.join(outputDir, 'selector-open-1920x1080.png'), fullPage: false });

  const selector = state.menu.sectorStart.selector;
  assert.equal(selector.title, 'SELECT SECTOR', 'selector title mismatch');
  assert.ok(selector.sectors.length >= 32, 'selector should list at least 32 sectors');
  assert.equal(sectorEntry(state, 5)?.unlocked, true, 'sector 5 should be unlocked by seeded progress');
  assert.equal(sectorEntry(state, 5)?.playSector, 5, 'sector 5 must map to play sector 5');
  assert.equal(sectorEntry(state, 4)?.unlocked, false, 'sector 4 should be locked because it is not an existing checkpoint');
  assert.equal(sectorEntry(state, 32)?.unlocked, false, 'sector 32 should not be invented as an unlocked checkpoint');
  assert.ok(selector.panelBounds?.width > 0 && selector.gridBounds?.width > 0, 'selector bounds should be visible');
  report.cases.push({
    open: true,
    selectedSector: selector.selectedSector,
    sector5: sectorEntry(state, 5),
    sector4: sectorEntry(state, 4),
    sector32: sectorEntry(state, 32)
  });

  await clickBounds(page, sectorEntry(state, 4).bounds);
  await page.waitForTimeout(150);
  state = await readState(page);
  assert.equal(state.scene, 'menu', 'locked sector click must not leave menu');
  assert.equal(state.menu.sectorStart.selector.open, true, 'locked sector click should keep selector open');

  await page.evaluate(() => {
    const game = window.__game;
    window.__sectorSelectorStartArgs = null;
    const original = game.startGame.bind(game);
    game.__originalStartGameForSectorSelectorCheck = original;
    game.startGame = (...args) => {
      window.__sectorSelectorStartArgs = args;
      return false;
    };
  });
  state = await readState(page);
  await clickBounds(page, sectorEntry(state, 5).bounds);
  await page.waitForFunction(() => Boolean(window.__sectorSelectorStartArgs), null, { timeout: 8000 });
  const startArgs = await page.evaluate(() => window.__sectorSelectorStartArgs);
  assert.equal(startArgs[1]?.runMode, 'sector_start', 'selector should use sector_start run mode');
  assert.equal(startArgs[1]?.startSector, 5, 'sector 5 selector cell must request startSector 5');
  await page.screenshot({ path: path.join(outputDir, 'selector-sector5-start-requested.png'), fullPage: false });
  report.cases.push({ sector5StartArgs: startArgs });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  state = await readState(page);
  assert.equal(state.scene, 'menu', 'Escape should return to menu');

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
