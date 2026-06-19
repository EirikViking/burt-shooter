import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  RUN_MODES,
  getSectorStartCheckpoints,
  getSectorStartPlaySector,
  getSectorStartState,
  isRankedRunMode,
  isSectorStartCheckpointUnlocked,
  resolveSectorStartCheckpoint
} from '../src/game/RunMode.js';
import { STEAM_LEADERBOARD_NAME, STEAM_SECTOR_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4651));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/sector-continue-mode-${timestamp()}`);

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
  throw new Error(`No available sector continue check port found starting at ${startPort}`);
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
  while (Date.now() - start < 15000) {
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

function makeProgress({ bestSector = 1, bestLevel = bestSector, pilotXp = 1200, bestScore = 10000 } = {}) {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp,
    pilotRank: 2,
    highestPilotRank: 2,
    totalRuns: 4,
    bestScore,
    bestSector,
    bestLevel,
    bestRank: 2,
    bestRunTimeSeconds: 300,
    survivedSeconds: 300,
    totalBossesDefeated: 4,
    totalWavesCleared: 24,
    totalCodexDiscoveries: 8,
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
    updatedAt: '2026-06-08T00:00:00.000Z'
  };
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForGame(page) {
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), { timeout: 30000 });
}

async function waitForScene(page, sceneName) {
  await page.waitForFunction((expected) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === expected;
  }, sceneName, { timeout: 15000 });
  return readState(page);
}

async function loadProfile(page, progress, { mockSteam = false } = {}) {
  const url = mockSteam ? `${baseUrl}/?mockSteamLeaderboard=1` : baseUrl;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  await page.evaluate(({ nextProgress, mockSteamEnabled }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    if (mockSteamEnabled) {
      localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'SECTOR ACE');
      localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', '[]');
    }
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(nextProgress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: nextProgress.bestScore,
      bestRank: nextProgress.bestRank,
      bestLevel: nextProgress.bestLevel
    }));
    localStorage.setItem('nova_swarm_achievements_v1', JSON.stringify({
      version: 1,
      unlocked: [],
      updatedAt: '2026-06-08T00:00:00.000Z'
    }));
    localStorage.setItem('novaSwarm.localLeaderboard.v2', '[]');
    localStorage.setItem('burt.shipUsage.v1', '{}');
    localStorage.setItem('burt.shipUsageTotal.v1', '0');
  }, { nextProgress: progress, mockSteamEnabled: mockSteam });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  return waitForScene(page, 'menu');
}

async function storageSnapshot(page) {
  return page.evaluate(() => ({
    hangar: JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}'),
    legacy: JSON.parse(localStorage.getItem('burt.shipUnlockProgress.v1') || '{}'),
    achievements: JSON.parse(localStorage.getItem('nova_swarm_achievements_v1') || '{}'),
    localLeaderboard: JSON.parse(localStorage.getItem('novaSwarm.localLeaderboard.v2') || '[]'),
    mockSteamLeaderboard: JSON.parse(localStorage.getItem('novaSwarm.mockSteamLeaderboard.v1') || '[]'),
    sectorChallenge: JSON.parse(localStorage.getItem('novaSwarm.sectorStartChallengeRecords.v1') || '{"byCheckpoint":{}}'),
    shipUsage: JSON.parse(localStorage.getItem('burt.shipUsage.v1') || '{}'),
    shipUsageTotal: localStorage.getItem('burt.shipUsageTotal.v1') || '0',
    threatDiscoveryRaw: localStorage.getItem('nova.threatDiscovery.v1')
  }));
}

async function clickMenuButton(page, buttonKey) {
  const state = await readState(page);
  const button = state.menu?.items?.[buttonKey];
  assert.ok(button?.width > 0 && button?.height > 0, `Missing menu button bounds for ${buttonKey}`);
  await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
}

async function clickBounds(page, bounds) {
  assert.ok(bounds?.width > 0 && bounds?.height > 0, `cannot click missing bounds: ${JSON.stringify(bounds)}`);
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

function sectorEntry(state, sector) {
  return state.menu?.sectorStart?.selector?.sectors?.find((entry) => entry.sector === sector);
}

async function openSectorSelector(page) {
  await clickMenuButton(page, 'sectorStartButton');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).menu?.sectorStart?.selector?.open === true, { timeout: 8000 });
  await page.waitForTimeout(150);
  return readState(page);
}

async function selectSectorSelectorCheckpoint(page, sector) {
  await page.evaluate((targetSector) => {
    const menu = window.__game?.scenes?.menu;
    if (!menu?.sectorSelectorOpen) throw new Error('sector selector is not open');
    const index = menu.sectorSelectorSectors.findIndex((entry) => entry.sector === targetSector);
    if (index < 0) throw new Error(`sector ${targetSector} not present in selector`);
    menu.selectedSectorSelectorIndex = index;
    menu.drawSectorSelectorOverlay();
  }, sector);
  await page.waitForTimeout(100);
  const state = await readState(page);
  assert.equal(state.menu?.sectorStart?.selector?.selectedSector, sector);
  return state;
}

async function clickMenuButtonZone(page, buttonKey, zone = 'center') {
  const state = await readState(page);
  const button = state.menu?.items?.[buttonKey];
  assert.ok(button?.width > 0 && button?.height > 0, `Missing menu button bounds for ${buttonKey}`);
  const sectorStart = buttonKey === 'sectorStartButton' ? state.menu?.sectorStart : null;
  const arrowCue = sectorStart?.arrowCueBounds;
  const coreButton = sectorStart?.coreButtonBounds;
  if (zone === 'left' && arrowCue && coreButton) {
    await page.mouse.click((arrowCue.x + coreButton.x) / 2, button.y + button.height / 2);
    return;
  }
  if (zone === 'right' && arrowCue && coreButton) {
    await page.mouse.click((coreButton.right + arrowCue.right) / 2, button.y + button.height / 2);
    return;
  }
  const x = zone === 'left'
    ? button.x + button.width * 0.12
    : zone === 'right'
      ? button.x + button.width * 0.88
      : button.x + button.width / 2;
  await page.mouse.click(x, button.y + button.height / 2);
}

function assertStaticRules() {
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 4 }), []);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 5 }), [5]);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 9 }), [5]);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 10 }), [5]);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 11 }), [5, 10]);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 17 }), [5, 10, 15]);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 20 }), [5, 10, 15]);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 21 }), [5, 10, 15, 20]);
  assert.equal(resolveSectorStartCheckpoint(null, { bestSector: 17 }), 15);
  assert.equal(resolveSectorStartCheckpoint(10, { bestSector: 17 }), 10);
  assert.equal(resolveSectorStartCheckpoint(17, { bestSector: 17 }), null);
  assert.equal(resolveSectorStartCheckpoint(10, { bestSector: 10 }), null);
  assert.equal(resolveSectorStartCheckpoint(20, { bestSector: 20 }), null);
  assert.equal(resolveSectorStartCheckpoint(20, { bestSector: 21 }), 20);
  assert.equal(getSectorStartPlaySector(5), 5);
  assert.equal(getSectorStartPlaySector(10), 11);
  assert.equal(getSectorStartPlaySector(15), 15);
  assert.equal(getSectorStartPlaySector(20), 21);
  assert.equal(getSectorStartPlaySector(30), 31);
  assert.equal(isSectorStartCheckpointUnlocked(10, { bestSector: 10 }), false);
  assert.equal(isSectorStartCheckpointUnlocked(10, { bestSector: 11 }), true);
  assert.equal(isSectorStartCheckpointUnlocked(20, { bestSector: 20 }), false);
  assert.equal(isSectorStartCheckpointUnlocked(20, { bestSector: 21 }), true);
  assert.equal(isSectorStartCheckpointUnlocked(30, { bestSector: 30 }), false);
  assert.equal(isSectorStartCheckpointUnlocked(30, { bestSector: 31 }), true);
  assert.equal(getSectorStartState({ bestSector: 3 }).available, false);
  assert.equal(getSectorStartState({ bestSector: 17 }, 15).selectedCheckpoint, 15);
  assert.equal(isRankedRunMode(RUN_MODES.RANKED), true);
  assert.equal(isRankedRunMode(RUN_MODES.SECTOR_START), false);
  assert.equal(isRankedRunMode(RUN_MODES.UNRANKED, { isDebugRun: true }), false);
}

mkdirSync(outputDir, { recursive: true });
assertStaticRules();

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

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  staticRules: 'passed'
};

try {
  const belowFive = await loadProfile(page, makeProgress({ bestSector: 4 }));
  assert.equal(belowFive.menu?.sectorStart?.available, false);
  assert.equal(belowFive.menu?.sectorStart?.buttonVisible, true);

  const sectorProgress = makeProgress({ bestSector: 17, bestLevel: 17, pilotXp: 2200, bestScore: 11111 });
  const menu = await loadProfile(page, sectorProgress, { mockSteam: true });
  assert.equal(menu.menu?.sectorStart?.available, true);
  assert.deepEqual(menu.menu?.sectorStart?.checkpoints, [5, 10, 15]);
  assert.equal(menu.menu?.sectorStart?.selectedCheckpoint, 15);
  assert.equal(menu.menu?.sectorStart?.buttonText, 'SECTOR RUN');
  assert.equal(menu.menu?.sectorStart?.buttonSubtext, 'Checkpoint starts - Every 5 sectors');
  assert.equal(menu.menu?.sectorStart?.arrowCueVisible, false, 'Sector Run dock tile should open the selector instead of showing switch arrows');

  const invalidStart = await page.evaluate(async () => window.__game.startGame(undefined, {
    runMode: 'sector_start',
    startSector: 20
  }));
  assert.equal(invalidStart, false);
  assert.equal((await readState(page)).scene, 'menu');

  const beforeSectorStart = await storageSnapshot(page);
  let selectorState = await openSectorSelector(page);
  assert.equal(selectorState.menu?.sectorStart?.selector?.open, true);
  selectorState = await selectSectorSelectorCheckpoint(page, 10);
  await clickBounds(page, sectorEntry(selectorState, 10).bounds);
  const sectorPlay = await waitForScene(page, 'play');
  assert.equal(sectorPlay.runMode, 'sector_start');
  assert.equal(sectorPlay.runModeReason, 'sector_start_checkpoint');
  assert.equal(sectorPlay.level, 11);
  assert.equal(sectorPlay.sectorStartChallenge?.checkpoint, 10);
  assert.equal(sectorPlay.sectorStartChallenge?.playSector, 11);
  assert.equal(sectorPlay.score, 0, 'sector_start challenge should begin with a separated zero score');
  assert.equal(sectorPlay.scoreSubmissionAllowed, false);
  assert.equal(sectorPlay.maintainerDevtools?.enabled, false);
  assert.equal(sectorPlay.debugTools?.levelJumpAvailable, false);

  await page.evaluate(() => {
    const game = window.__game;
    game.addScore(500000, 'baseScore');
    game.unlockAchievement?.('ACH_SCORE_250K', { source: 'sector_continue_check' });
    game.finalizeRunProgression?.();
    game.gameOver({ fromInterlude: true });
  });
  const sectorGameOver = await waitForScene(page, 'gameOver');
  assert.equal(sectorGameOver.runMode, 'sector_start');
  assert.equal(sectorGameOver.scoreSubmissionAllowed, false);
  assert.equal(sectorGameOver.sectorStartChallenge?.checkpoint, 10);
  assert.equal(sectorGameOver.sectorStartChallenge?.newBest, true);
  const challengeScore = sectorGameOver.score;
  assert.ok(challengeScore > 0, 'sector_start challenge should report a positive challenge score after scoring');
  assert.equal(sectorGameOver.sectorStartChallenge?.best?.scoreEarned, challengeScore);
  assert.match(sectorGameOver.gameOver?.ceremonyTitle || '', /SECTOR RUN/);
  assert.match(sectorGameOver.gameOver?.ceremonyComment || '', /NEW SECTOR 10 BEST|SECTOR 10 BEST/i);
  assert.match(sectorGameOver.gameOver?.ceremonyComment || '', /REACHED SECTOR 11/i);
  assert.match(sectorGameOver.gameOver?.ceremonyComment || '', /UNRANKED SECTOR RUN \| NO ACHIEVEMENTS/i);
  assert.doesNotMatch(sectorGameOver.gameOver?.ceremonyComment || '', /->/);
  assert.equal(sectorGameOver.gameOver?.mainMenuCta?.visible, true, 'sector_start result should expose a Main Menu return CTA');
  assert.equal(sectorGameOver.gameOver?.mainMenuCta?.label, 'BACK TO MAIN MENU');
  assert.equal(sectorGameOver.gameOver?.leaderboardCta?.visible, true, 'sector_start result should expose the separate sector leaderboard CTA');
  assert.equal(sectorGameOver.gameOver?.leaderboardCta?.label, 'VIEW SECTOR BOARD');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.gameOver?.sectorSteamStatus === 'submitted' &&
      state.gameOver?.lastSectorLeaderboardResult?.sectorSteamStatus === 'submitted';
  }, null, { timeout: 10000 });
  const sectorSubmittedGameOver = await readState(page);
  assert.match(sectorSubmittedGameOver.gameOver?.ceremonyComment || '', /STEAM SECTOR: #1|STEAM SECTOR: SUBMITTED/i);
  assert.equal(sectorSubmittedGameOver.gameOver?.lastSectorLeaderboardResult?.leaderboardName, STEAM_SECTOR_LEADERBOARD_NAME);
  await page.waitForTimeout(700);
  const afterSectorStart = await storageSnapshot(page);
  assert.deepEqual(afterSectorStart.hangar, beforeSectorStart.hangar, 'sector_start must not update hangar progress/bests/XP/unlocks');
  assert.deepEqual(afterSectorStart.legacy, beforeSectorStart.legacy, 'sector_start must not update legacy unlock progress');
  assert.deepEqual(afterSectorStart.achievements, beforeSectorStart.achievements, 'sector_start must not unlock achievements');
  assert.deepEqual(afterSectorStart.localLeaderboard, [], 'sector_start must not save local leaderboard entries');
  assert.equal(afterSectorStart.mockSteamLeaderboard.some((entry) => entry.leaderboardName === STEAM_SECTOR_LEADERBOARD_NAME && entry.score === challengeScore), true, 'sector_start should submit to the separate Steam sector leaderboard');
  assert.equal(afterSectorStart.mockSteamLeaderboard.some((entry) => entry.leaderboardName === STEAM_LEADERBOARD_NAME), false, 'sector_start must not submit to the main Steam global leaderboard');
  assert.equal(afterSectorStart.sectorChallenge.byCheckpoint?.['10']?.scoreEarned, challengeScore, 'sector_start must save separate local challenge record');
  assert.equal(afterSectorStart.sectorChallenge.byCheckpoint?.['10']?.startSector, 10, 'challenge record must preserve chosen checkpoint');
  assert.equal(afterSectorStart.sectorChallenge.byCheckpoint?.['10']?.highestSectorReached, 11, 'challenge record must preserve highest sector reached');
  assert.equal(beforeSectorStart.sectorChallenge.byCheckpoint?.['10'], undefined, 'challenge record should be separate from pre-run normal storage');
  assert.deepEqual(afterSectorStart.shipUsage, {}, 'sector_start must not increment ship usage');
  assert.equal(afterSectorStart.shipUsageTotal, '0', 'sector_start must not increment total ship usage');
  assert.equal(afterSectorStart.threatDiscoveryRaw, beforeSectorStart.threatDiscoveryRaw, 'sector_start must not write Threat Codex discoveries');

  const keyboardMenu = await loadProfile(page, sectorProgress);
  assert.equal(keyboardMenu.menu?.focusedOption, 'launch');
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).menu?.focusedOption === 'scout', { timeout: 8000 });
  await page.keyboard.press('ArrowDown');
  const keyboardFocused = await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.menu?.focusedOption === 'sectorStart' ? state : null;
  }, null, { timeout: 8000 });
  const keyboardFocusedState = await keyboardFocused.jsonValue();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).menu?.sectorStart?.selector?.open === true, { timeout: 8000 });
  await selectSectorSelectorCheckpoint(page, 10);
  await page.keyboard.press('Enter');
  const keyboardPlay = await waitForScene(page, 'play');
  assert.equal(keyboardPlay.runMode, 'sector_start');
  assert.equal(keyboardPlay.level, 11);
  assert.equal(keyboardPlay.sectorStartChallenge?.checkpoint, 10);
  assert.equal(keyboardPlay.sectorStartChallenge?.playSector, 11);

  const rankedMenu = await loadProfile(page, makeProgress({ bestSector: 17, bestLevel: 17, pilotXp: 2200, bestScore: 11111 }));
  assert.equal(rankedMenu.menu?.focusedOption, 'launch');
  await page.keyboard.press('Enter');
  const rankedPlay = await waitForScene(page, 'play');
  assert.equal(rankedPlay.runMode, 'ranked');
  assert.equal(rankedPlay.level, 1);
  assert.equal(rankedPlay.scoreSubmissionAllowed, true);
  const rankedUsage = await storageSnapshot(page);
  assert.equal(rankedUsage.shipUsage.nova_ship_01, 1, 'ranked normal start should still increment selected ship usage');

  await page.evaluate(() => {
    const game = window.__game;
    game.score = 750000;
    game.level = 6;
    game.rankIndex = 4;
    game.gameOver({ fromInterlude: true });
  });
  await waitForScene(page, 'gameOver');
  await page.keyboard.press('Enter');
  await page.keyboard.type('QA');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const scores = JSON.parse(localStorage.getItem('novaSwarm.localLeaderboard.v2') || '[]');
    return scores.some((entry) => entry.name === 'QA' && entry.score === 750000);
  }, { timeout: 10000 });
  const rankedAfterSubmit = await storageSnapshot(page);
  assert.ok(rankedAfterSubmit.localLeaderboard.some((entry) => entry.name === 'QA' && entry.score === 750000), 'ranked run should still submit local leaderboard entry');
  assert.ok((rankedAfterSubmit.hangar.pilotXp || 0) > sectorProgress.pilotXp, 'ranked run should still grant pilot XP');
  assert.ok((rankedAfterSubmit.hangar.bestScore || 0) >= 750000, 'ranked run should still update best score');

  const screenshot = path.join(outputDir, 'sector-continue-mode.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  Object.assign(report, {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    sectorStart: {
      checkpoints: menu.menu?.sectorStart?.checkpoints,
      mouseStartLevel: sectorPlay.level,
      keyboardStartLevel: keyboardPlay.level,
      challengeScoreStart: sectorPlay.score,
      challengeRecord: afterSectorStart.sectorChallenge.byCheckpoint?.['10'],
      sideEffectsBlocked: true
    },
    ranked: {
      runMode: rankedPlay.runMode,
      submittedScore: 750000,
      pilotXpAfter: rankedAfterSubmit.hangar.pilotXp,
      bestScoreAfter: rankedAfterSubmit.hangar.bestScore
    },
    pageErrors,
    consoleErrors,
    screenshot
  });

  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[sector-continue-mode] PASS checkpoints=${report.sectorStart.checkpoints.join(',')} report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
