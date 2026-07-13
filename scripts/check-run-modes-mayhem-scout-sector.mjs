import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { AchievementManager } from '../src/achievements/AchievementManager.js';
import { getAchievementIds } from '../src/achievements/AchievementCatalog.js';
import { RunPressureDirector } from '../src/game/RunPressureDirector.js';
import {
  RUN_MODES,
  canRunModeUseTacticalDraft,
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  getRunModeProfile,
  getSectorStartCheckpoints,
  getSectorStartPlaySector,
  isRankedRunMode
} from '../src/game/RunMode.js';
import { STEAM_LEADERBOARD_NAME, STEAM_TACTICAL_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4666));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/run-modes-mayhem-scout-sector-${timestamp()}`);

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
  throw new Error(`No available run mode check port found starting at ${startPort}`);
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

class MemoryStorage {
  constructor() {
    this.map = new Map();
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
}

function makeProgress(bestSector = 31) {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 2200,
    pilotRank: 4,
    highestPilotRank: 4,
    totalRuns: 7,
    bestScore: 11111,
    bestSector,
    bestLevel: bestSector,
    bestRank: 4,
    bestRunTimeSeconds: 420,
    survivedSeconds: 420,
    totalBossesDefeated: 6,
    totalWavesCleared: 32,
    totalCodexDiscoveries: 10,
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
    updatedAt: '2026-06-19T00:00:00.000Z'
  };
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForGame(page) {
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), { timeout: 30000 });
}

async function waitForScene(page, sceneName) {
  await page.waitForFunction((expected) => JSON.parse(window.render_game_to_text?.() || '{}').scene === expected, sceneName, { timeout: 15000 });
  return readState(page);
}

async function waitForGameOverActionStage(page) {
  const actionStages = new Set(['runback', 'submitted', 'skipped', 'unranked']);
  const deadline = Date.now() + 20000;
  let lastState = await readState(page);
  while (Date.now() < deadline) {
    lastState = await waitForScene(page, 'gameOver');
    const stage = lastState.gameOver?.state;
    if (actionStages.has(stage)) return lastState;
    if (
      (stage === 'submitted_hold' && lastState.gameOver?.submittedHoldReady) ||
      (stage === 'result_hold' && lastState.gameOver?.resultHoldReady)
    ) {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`Game Over result action stage not reached; last state=${lastState.gameOver?.state || 'unknown'}`);
}

async function seedProfile(page, progress = makeProgress()) {
  await page.goto(`${baseUrl}/?mockSteamLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  await page.evaluate((nextProgress) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'RUN MODE ACE');
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', '[]');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(nextProgress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: nextProgress.bestScore,
      bestRank: nextProgress.bestRank,
      bestLevel: nextProgress.bestLevel
    }));
    localStorage.setItem('nova_swarm_achievements_v1', JSON.stringify({
      version: 1,
      unlocked: [],
      updatedAt: '2026-06-19T00:00:00.000Z'
    }));
    localStorage.setItem('novaSwarm.localLeaderboard.v2', '[]');
    localStorage.setItem('burt.shipUsage.v1', '{}');
    localStorage.setItem('burt.shipUsageTotal.v1', '0');
  }, progress);
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
    scoutRunRecords: JSON.parse(localStorage.getItem('novaSwarm.scoutRunRecords.v1') || '{"best":null}'),
    shipUsage: JSON.parse(localStorage.getItem('burt.shipUsage.v1') || '{}'),
    shipUsageTotal: localStorage.getItem('burt.shipUsageTotal.v1') || '0',
    mayhemModeRecords: JSON.parse(localStorage.getItem('novaSwarm.mayhemModeRecords.v1') || '{}')
  }));
}

async function focusMenuOption(page, optionId) {
  await page.evaluate((id) => {
    const menu = window.__game?.scenes?.menu || window.__game?.scene;
    const index = menu?.menuOptions?.findIndex((option) => option?.id === id);
    if (index >= 0) {
      menu.setInputDevice?.('keyboard');
      menu.setMenuFocus?.(index);
    }
  }, optionId);
  await page.waitForTimeout(80);
  await page.evaluate((id) => {
    const menu = window.__game?.scenes?.menu || window.__game?.scene;
    const index = menu?.menuOptions?.findIndex((option) => option?.id === id);
    if (index >= 0) {
      menu.setMenuFocus?.(index);
      menu.focusedMenuIndex = index;
      menu.menuOptions?.forEach((option, optionIndex) => {
        if (!option?.button) return;
        option.button._focused = optionIndex === index;
        menu.drawMenuButton?.(option.button, false);
      });
    }
  }, optionId);
  await page.waitForTimeout(150);
  const state = await readState(page);
  assert.equal(state.menu?.focusedOption, optionId, `expected ${optionId} menu focus`);
  return state;
}

function assertInside(bounds, screen, label) {
  assert.ok(bounds?.width > 0 && bounds?.height > 0, `${label}: missing bounds`);
  assert.ok(bounds.x >= -2, `${label}: left edge offscreen`);
  assert.ok(bounds.y >= -2, `${label}: top edge offscreen`);
  assert.ok(bounds.right <= screen.width + 2, `${label}: right edge offscreen`);
  assert.ok(bounds.bottom <= screen.height + 2, `${label}: bottom edge offscreen`);
}

function assertLaunchDeckVisible(state, label) {
  const screen = state.menu?.screen;
  const deck = state.menu?.launchDeck;
  assert.ok(deck?.bounds?.width > 0, `${label}: Launch Deck bounds missing`);
  assertInside(deck.bounds, screen, `${label}: Launch Deck`);
  const cards = [
    ['mayhem', deck.cards?.mayhem],
    ['mayhemTactical', deck.cards?.mayhemTactical],
    ['scout', deck.cards?.scout],
    ['sector', deck.cards?.sector]
  ];
  for (const [name, card] of cards) {
    assertInside(card?.bounds, screen, `${label}: ${name} card`);
    assert.ok(card.bounds.height >= 54 && card.bounds.height <= 104, `${label}: ${name} selector should stay compact`);
    assert.ok(card.bounds.width >= 240 && card.bounds.width <= 560, `${label}: ${name} selector should not become oversized`);
  }
  assert.equal(deck.cards?.mayhem?.label, 'MAYHEM PURE', `${label}: Pure Mayhem label`);
  assert.equal(deck.cards?.mayhem?.sublabel, 'RANKED // RAW SKILL', `${label}: Pure Mayhem sublabel`);
  assert.equal(deck.cards?.mayhem?.body || '', '', `${label}: Mayhem card should not carry paragraph body text`);
  assert.equal(deck.cards?.mayhemTactical?.label, 'MAYHEM TACTICAL', `${label}: Tactical Mayhem label`);
  assert.equal(deck.cards?.mayhemTactical?.sublabel, 'RANKED // BUILDCRAFT', `${label}: Tactical Mayhem sublabel`);
  assert.equal(deck.cards?.mayhemTactical?.body || '', '', `${label}: Tactical card should not carry paragraph body text`);
  assert.equal(deck.cards?.scout?.label, 'SCOUT RUN', `${label}: Scout label`);
  assert.equal(deck.cards?.scout?.sublabel, 'PRACTICE', `${label}: Scout sublabel`);
  assert.equal(deck.cards?.scout?.body || '', '', `${label}: Scout card should not carry paragraph body text`);
  assert.equal(deck.cards?.sector?.label, 'SECTOR RUN', `${label}: Sector label`);
  assert.equal(deck.cards?.sector?.sublabel, 'CHECKPOINT PUSH', `${label}: Sector sublabel`);
  assert.equal(deck.cards?.sector?.body || '', '', `${label}: Sector card should not carry paragraph body text`);
  assert.ok(Math.abs(deck.cards.mayhem.bounds.x - deck.cards.mayhemTactical.bounds.x) < 36, `${label}: Pure/Tactical cards should share the left command stack`);
  assert.ok(Math.abs(deck.cards.mayhemTactical.bounds.x - deck.cards.scout.bounds.x) < 36, `${label}: Tactical/Scout cards should share the left command stack`);
  assert.ok(Math.abs(deck.cards.scout.bounds.x - deck.cards.sector.bounds.x) < 36, `${label}: Scout/Sector cards should share the left command stack`);
  assert.ok(deck.cards.mayhem.bounds.bottom < deck.cards.mayhemTactical.bounds.y + 36, `${label}: Pure/Tactical cards overlap vertically`);
  assert.ok(deck.cards.mayhemTactical.bounds.bottom < deck.cards.scout.bounds.y + 36, `${label}: Tactical/Scout cards overlap vertically`);
  assert.ok(deck.cards.scout.bounds.bottom < deck.cards.sector.bounds.y + 36, `${label}: Scout/Sector cards overlap vertically`);
  assert.ok(deck.bounds.right < screen.width * 0.5, `${label}: Launch Deck should avoid the center ship showcase lane`);
  assert.ok((state.menu?.panel?.y || 0) > deck.bounds.bottom, `${label}: utility dock should sit below Launch Deck`);
  assert.doesNotMatch(JSON.stringify(state.menu || {}), /Sector 1 climb/i, `${label}: old Sector 1 climb wording should not be player-facing`);
  const briefing = state.menu?.missionBriefing;
  assertInside(briefing?.panelBounds, screen, `${label}: Mission Briefing panel`);
  assert.ok(briefing.panelBounds.x > screen.width * 0.58, `${label}: Mission Briefing should sit on the right side`);
  assert.ok(briefing.panelBounds.x > deck.bounds.right + 48, `${label}: Mission Briefing should not overlap Launch Deck`);
  assert.ok(briefing.panelBounds.bottom < (state.menu?.panel?.y || screen.height), `${label}: Mission Briefing should stay above utility dock`);
  assert.ok((briefing.bodyBounds?.bottom || 0) <= briefing.panelBounds.bottom + 4, `${label}: Mission Briefing body should stay inside frame`);
}

async function selectSectorSelectorCheckpoint(page, checkpoint) {
  await page.evaluate((sector) => {
    const menu = window.__game?.scenes?.menu || window.__game?.scene;
    const index = menu?.sectorSelectorSectors?.findIndex((entry) => entry?.sector === sector);
    if (index >= 0) {
      menu.selectedSectorSelectorIndex = index;
      menu.updateSectorSelectorSelection?.();
    }
  }, checkpoint);
  await page.waitForTimeout(150);
  const state = await readState(page);
  assert.equal(state.menu?.sectorStart?.selector?.selectedSector, checkpoint, `expected Sector Run selector checkpoint ${checkpoint}`);
  return state;
}

function assertStaticRules() {
  assert.equal(STEAM_LEADERBOARD_NAME, 'nova_swarm_global_score_v2');
  assert.equal(STEAM_TACTICAL_LEADERBOARD_NAME, 'nova_swarm_tactical_score_v1');
  assert.equal(isRankedRunMode(RUN_MODES.RANKED), true);
  assert.equal(isRankedRunMode(RUN_MODES.MAYHEM_TACTICAL), true);
  assert.equal(isRankedRunMode(RUN_MODES.SCOUT), false);
  assert.equal(isRankedRunMode(RUN_MODES.SECTOR_START), false);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.RANKED), true);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.MAYHEM_TACTICAL), true);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.SCOUT), false);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.SECTOR_START), false);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.RANKED), true);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.MAYHEM_TACTICAL), true);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.SCOUT), false);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.SECTOR_START), false);
  assert.equal(getRunModeProfile(RUN_MODES.RANKED).difficultyProfileId, 'accepted_harder_ranked');
  assert.equal(getRunModeProfile(RUN_MODES.MAYHEM_TACTICAL).difficultyProfileId, 'accepted_harder_ranked');
  assert.equal(canRunModeUseTacticalDraft(RUN_MODES.RANKED), false);
  assert.equal(canRunModeUseTacticalDraft(RUN_MODES.MAYHEM_TACTICAL), true);
  assert.equal(getRunModeProfile(RUN_MODES.SCOUT).difficultyProfileId, 'scout_lower_pressure_v1');
  assert.equal(getRunModeProfile(RUN_MODES.RANKED).normalWaveScoreXpMult, 1.2);
  assert.equal(getRunModeProfile(RUN_MODES.SCOUT).normalWaveDifficultyLevelOffsetDelta, -3);
  assert.equal(getRunModeProfile(RUN_MODES.SCOUT).normalWaveScoreXpMult, 1);
  assert.equal(getRunModeProfile(RUN_MODES.SECTOR_START).normalWaveDifficultyLevelOffsetDelta, 2);
  assert.equal(getRunModeProfile(RUN_MODES.SECTOR_START).normalWaveScoreXpMult, 1);
  assert.deepEqual(getSectorStartCheckpoints({ bestSector: 31 }), [5, 10, 15, 20, 25, 30]);
  assert.equal(getSectorStartPlaySector(5), 5);
  assert.equal(getSectorStartPlaySector(10), 11);
  assert.equal(getSectorStartPlaySector(20), 21);
  assert.equal(getSectorStartPlaySector(30), 31);

  const mayhemPressure = new RunPressureDirector({ runMode: RUN_MODES.RANKED, level: 1 });
  const scoutPressure = new RunPressureDirector({ runMode: RUN_MODES.SCOUT, level: 1 });
  assert.equal(mayhemPressure.getNormalWaveDifficultyLevel(1), 8, 'Mayhem should use the recalibrated Sector 1 normal-wave difficulty');
  assert.equal(scoutPressure.getNormalWaveDifficultyLevel(1), 5, 'Scout should lower the accepted profile pressure');
  assert.ok(scoutPressure.getMultipliers().fireChanceMult < mayhemPressure.getMultipliers().fireChanceMult);
  assert.ok(scoutPressure.getMultipliers().projectileSpeedMult < mayhemPressure.getMultipliers().projectileSpeedMult);

  const [achievementId] = getAchievementIds();
  const mayhemAchievements = new AchievementManager({
    storage: new MemoryStorage(),
    steamSync: false,
    getRunState: () => ({ runMode: RUN_MODES.RANKED, isDebugRun: false })
  });
  assert.equal(mayhemAchievements.unlock(achievementId, {
    runMode: RUN_MODES.RANKED,
    allowAchievements: true
  })?.id, achievementId);
  const scoutAchievements = new AchievementManager({
    storage: new MemoryStorage(),
    steamSync: false,
    getRunState: () => ({ runMode: RUN_MODES.SCOUT, isDebugRun: false })
  });
  assert.equal(scoutAchievements.unlock(achievementId, {
    runMode: RUN_MODES.SCOUT,
    allowAchievements: false
  }), null);
  const sectorAchievements = new AchievementManager({
    storage: new MemoryStorage(),
    steamSync: false,
    getRunState: () => ({ runMode: RUN_MODES.SECTOR_START, isDebugRun: false })
  });
  assert.equal(sectorAchievements.unlock(achievementId, {
    runMode: RUN_MODES.SECTOR_START,
    allowAchievements: false
  }), null);
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
  const menu = await seedProfile(page);
  await page.waitForTimeout(1500);
  const settledMenu = await readState(page);
  assert.equal(menu.menu?.items?.launchButton?.width > 0, true, 'Mayhem Pure should be visible');
  assert.equal(menu.menu?.items?.tacticalLaunchButton?.width > 0, true, 'Mayhem Tactical should be visible');
  assert.equal(menu.menu?.items?.scoutRunButton?.width > 0, true, 'Scout Run should be visible');
  assert.equal(menu.menu?.items?.sectorStartButton?.width > 0, true, 'Sector Run should be visible');
  assertLaunchDeckVisible(settledMenu, '1366x768 initial menu');
  assert.equal(settledMenu.menu?.missionBriefing?.mode, 'launch', 'Mission briefing should default to Mayhem Pure');
  assert.match(settledMenu.menu?.missionBriefing?.title || '', /RUN MODES.*MAYHEM PURE/i);
  assert.match(settledMenu.menu?.missionBriefing?.body || '', /RANKED.*RAW SKILL[\s\S]*No tactical drafts[\s\S]*original leaderboard[\s\S]*Achievements[\s\S]*career XP[\s\S]*checkpoint unlocks/i);
  assert.ok(settledMenu.menu?.missionBriefing?.panelBounds?.width > 0, 'Mission briefing panel should be visible');
  assert.equal(settledMenu.menu?.scoutRun?.buttonText, 'SCOUT RUN');
  assert.equal(settledMenu.menu?.scoutRun?.buttonSubtext, 'PRACTICE');
  assert.equal(settledMenu.menu?.sectorStart?.buttonText, 'SECTOR RUN');
  assert.equal(settledMenu.menu?.sectorStart?.buttonSubtext, 'CHECKPOINT PUSH');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForScene(page, 'menu');
  await page.waitForTimeout(500);
  assertLaunchDeckVisible(await readState(page), '1920x1080 menu');
  await page.screenshot({ path: path.join(outputDir, 'menu-launch-deck-1920x1080.png'), fullPage: false });
  await page.setViewportSize({ width: 1366, height: 768 });
  await waitForScene(page, 'menu');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, 'menu-run-modes-1366x768.png'), fullPage: false });
  await page.setViewportSize({ width: 1280, height: 800 });
  await waitForScene(page, 'menu');
  await page.waitForTimeout(500);
  assertLaunchDeckVisible(await readState(page), '1280x800 menu');
  await page.screenshot({ path: path.join(outputDir, 'menu-run-modes-1280x800.png'), fullPage: false });

  for (const viewport of [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1280, height: 800, name: '1280x800' }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await waitForScene(page, 'menu');
    await page.waitForTimeout(250);
    for (const mode of ['launch', 'launchTactical', 'scout', 'sectorStart']) {
      assertLaunchDeckVisible(await focusMenuOption(page, mode), `${viewport.name} ${mode} briefing`);
    }
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await waitForScene(page, 'menu');
  await focusMenuOption(page, 'launch');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  assert.equal((await readState(page)).menu?.focusedOption, 'launchTactical', 'ArrowRight should move Pure focus to Tactical');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  assert.equal((await readState(page)).menu?.focusedOption, 'scout', 'ArrowRight should move Tactical focus to Scout');
  const mayhemFocus = await focusMenuOption(page, 'launch');
  assert.equal(mayhemFocus.menu?.missionBriefing?.mode, 'launch');
  assert.match(mayhemFocus.menu?.missionBriefing?.body || '', /RANKED.*RAW SKILL[\s\S]*No tactical drafts[\s\S]*original leaderboard[\s\S]*Achievements[\s\S]*career XP[\s\S]*checkpoint unlocks/i);
  assert.doesNotMatch(mayhemFocus.menu?.missionBriefing?.body || '', /Sector 1 climb/i);
  await page.screenshot({ path: path.join(outputDir, 'menu-mayhem-focused.png'), fullPage: false });
  const tacticalFocus = await focusMenuOption(page, 'launchTactical');
  assert.equal(tacticalFocus.menu?.missionBriefing?.mode, 'launchTactical');
  assert.match(tacticalFocus.menu?.missionBriefing?.body || '', /RANKED.*BUILDCRAFT[\s\S]*Bosses offer permanent tactical upgrades[\s\S]*separate Tactical leaderboard/i);
  await page.screenshot({ path: path.join(outputDir, 'menu-mayhem-tactical-focused.png'), fullPage: false });
  const scoutFocus = await focusMenuOption(page, 'scout');
  assert.equal(scoutFocus.menu?.missionBriefing?.mode, 'scout');
  assert.match(scoutFocus.menu?.missionBriefing?.body || '', /UNRANKED PRACTICE[\s\S]*Lower pressure practice[\s\S]*testing ships[\s\S]*learning routes[\s\S]*No leaderboard submission[\s\S]*achievements[\s\S]*career XP[\s\S]*checkpoint unlocks/i);
  await page.screenshot({ path: path.join(outputDir, 'menu-scout-focused.png'), fullPage: false });
  const sectorFocus = await focusMenuOption(page, 'sectorStart');
  assert.equal(sectorFocus.menu?.missionBriefing?.mode, 'sectorStart');
  assert.match(sectorFocus.menu?.missionBriefing?.body || '', /CHECKPOINT PUSH[\s\S]*Jump to checkpoints unlocked in Mayhem[\s\S]*Push deeper[\s\S]*without replaying the early sectors[\s\S]*No achievements[\s\S]*Sector records are separate/i);
  await page.screenshot({ path: path.join(outputDir, 'menu-sector-run-focused.png'), fullPage: false });
  await page.evaluate(() => window.__game?.scenes?.menu?.openSectorSelector?.());
  await page.waitForTimeout(250);
  const sectorSelector = await selectSectorSelectorCheckpoint(page, 10);
  const selectorText = [
    sectorSelector.menu?.sectorStart?.selector?.subtitle,
    sectorSelector.menu?.sectorStart?.selector?.detailText
  ].filter(Boolean).join('\n');
  assert.match(selectorText, /Use Mayhem-unlocked checkpoints to push deeper/i);
  assert.match(selectorText, /New start points unlock every 5 sectors in Mayhem/i);
  assert.match(selectorText, /Begins at Sector 11/i);
  await page.screenshot({ path: path.join(outputDir, 'sector-run-selector-every-5-sectors.png'), fullPage: false });
  await page.evaluate(() => window.__game?.scenes?.menu?.closeSectorSelector?.());
  await waitForScene(page, 'menu');

  const beforeScout = await storageSnapshot(page);
  await page.evaluate(() => window.__game.startGame(undefined, { runMode: 'scout' }));
  const scoutPlay = await waitForScene(page, 'play');
  assert.equal(scoutPlay.runMode, RUN_MODES.SCOUT);
  assert.equal(scoutPlay.runModeProfile?.difficultyProfileId, 'scout_lower_pressure_v1');
  assert.equal(scoutPlay.scoreSubmissionAllowed, false);
  assert.equal(scoutPlay.runModeProfile?.unlocksAchievements, false);
  await page.evaluate(() => {
    const game = window.__game;
    game.addScore(250000, 'baseScore');
    game.level = 11;
    game.unlockAchievement?.('ACH_SCORE_250K', { source: 'scout_guard' });
    game.finalizeRunProgression?.();
    game.gameOver({ fromInterlude: true });
  });
  const scoutGameOver = await waitForScene(page, 'gameOver');
  assert.equal(scoutGameOver.runMode, RUN_MODES.SCOUT);
  assert.equal(scoutGameOver.scoreSubmissionAllowed, false);
  assert.match(scoutGameOver.gameOver?.ceremonyTitle || '', /SCOUT RUN/);
  const scoutResultText = [
    scoutGameOver.gameOver?.ceremonyComment,
    scoutGameOver.gameOver?.prompt,
    scoutGameOver.gameOver?.leaderboardStatus
  ].filter(Boolean).join('\n');
  assert.match(scoutResultText, /Scout|Unranked|no submission|SCORE NOT LOGGED/i);
  assert.doesNotMatch(scoutResultText, /submitted to global leaderboard|achievement unlocked/i);
  assert.equal(scoutGameOver.gameOver?.leaderboardCta?.visible, false, 'Scout result must not show a leaderboard CTA');
  assert.equal(scoutGameOver.gameOver?.primaryCta?.label, 'ONE MORE SCOUT RUN');
  const afterScout = await storageSnapshot(page);
  assert.deepEqual(afterScout.hangar, beforeScout.hangar, 'Scout must not update hangar progress');
  assert.deepEqual(afterScout.legacy, beforeScout.legacy, 'Scout must not update legacy bests');
  assert.deepEqual(afterScout.achievements, beforeScout.achievements, 'Scout must not unlock achievements');
  assert.deepEqual(afterScout.localLeaderboard, [], 'Scout must not save local leaderboard entries');
  const scoutFinalScoreText = new Intl.NumberFormat('en-US').format(scoutGameOver.score || 0);
  assert.equal(afterScout.scoutRunRecords.best?.score, scoutGameOver.score, 'Scout should save the profile-local Scout best for the actual run score');
  assert.match(scoutResultText, new RegExp(`Scout Best:\\s*${scoutFinalScoreText.replace(/,/g, ',?')}`, 'i'), 'Scout result should show local Scout best');
  assert.match(scoutResultText, new RegExp(`This Run:\\s*${scoutFinalScoreText.replace(/,/g, ',?')}`, 'i'), 'Scout result should show this run score');
  assert.match(scoutResultText, /New Scout Best/i, 'Scout result should celebrate a new Scout best');
  assert.match(scoutResultText, /No leaderboard submission/i, 'Scout result should explicitly block leaderboard submission');
  assert.equal(afterScout.mockSteamLeaderboard.some((entry) => entry.leaderboardName === STEAM_LEADERBOARD_NAME), false, 'Scout must not submit to global Steam leaderboard');
  assert.deepEqual(afterScout.shipUsage, {}, 'Scout must not increment ship usage');
  assert.equal(afterScout.shipUsageTotal, '0', 'Scout must not increment total ship usage');
  await page.screenshot({ path: path.join(outputDir, 'scout-result-unranked.png'), fullPage: false });

  await page.keyboard.press('Enter');
  const scoutRestart = await waitForScene(page, 'play');
  assert.equal(scoutRestart.runMode, RUN_MODES.SCOUT, 'One More Scout Run must preserve Scout mode');

  await seedProfile(page);
  await page.evaluate(() => window.__game.startGame(undefined, { runMode: 'ranked' }));
  const mayhemPlay = await waitForScene(page, 'play');
  assert.equal(mayhemPlay.runMode, RUN_MODES.RANKED);
  assert.equal(mayhemPlay.runModeProfile?.difficultyProfileId, 'accepted_harder_ranked');
  assert.equal(mayhemPlay.scoreSubmissionAllowed, true);
  assert.equal(mayhemPlay.runModeProfile?.unlocksAchievements, true);
  const pureDraftAttempt = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    return {
      opened: play?.openTacticalDraft?.({ sectorCleared: 5 }) || false,
      active: Boolean(play?.getTacticalDraftDebugState?.().active)
    };
  });
  assert.deepEqual(pureDraftAttempt, { opened: false, active: false }, 'Mayhem Pure must never open the Tactical Draft');
  await page.screenshot({ path: path.join(outputDir, 'mayhem-focused-ranked.png'), fullPage: false });
  await page.evaluate(() => {
    const game = window.__game;
    game.addScore(250000, 'baseScore');
    game.level = 6;
    game.gameOver({ fromInterlude: true });
  });
  const mayhemGameOver = await waitForGameOverActionStage(page);
  const mayhemResultText = [
    mayhemGameOver.gameOver?.ceremonyTitle,
    mayhemGameOver.gameOver?.ceremonyComment,
    mayhemGameOver.gameOver?.leaderboardStatus,
    mayhemGameOver.gameOver?.prompt
  ].filter(Boolean).join('\n');
  assert.equal(mayhemGameOver.runMode, RUN_MODES.RANKED);
  assert.equal(mayhemGameOver.scoreSubmissionAllowed, true);
  assert.doesNotMatch(mayhemResultText, /SCOUT RUN|UNRANKED|NO ACHIEVEMENTS/i);
  await page.screenshot({ path: path.join(outputDir, 'mayhem-result-ranked.png'), fullPage: false });

  const pureStorage = await storageSnapshot(page);
  assert.equal(pureStorage.mockSteamLeaderboard.some((entry) => entry.leaderboardName === STEAM_LEADERBOARD_NAME), true, 'Mayhem Pure must keep the current Steam board');
  assert.equal(pureStorage.mockSteamLeaderboard.some((entry) => entry.leaderboardName === STEAM_TACTICAL_LEADERBOARD_NAME), false, 'Mayhem Pure must not touch the Tactical board');

  await seedProfile(page);
  await page.evaluate(() => window.__game.startGame(undefined, { runMode: 'ranked_tactical' }));
  const tacticalPlay = await waitForScene(page, 'play');
  assert.equal(tacticalPlay.runMode, RUN_MODES.MAYHEM_TACTICAL);
  assert.equal(tacticalPlay.scoreSubmissionAllowed, true);
  assert.equal(tacticalPlay.runModeProfile?.tacticalDraftEnabled, true);
  const tacticalReinforcementReasons = await page.evaluate(() =>
    window.__game?.scenes?.play?.enemyManager?.getMayhemReinforcementEligibility?.()?.reasons || []
  );
  assert.equal(
    tacticalReinforcementReasons.includes('not_mayhem'),
    false,
    'Mayhem Tactical must retain the same Mayhem reinforcement and super-storm eligibility as Pure'
  );
  const tacticalDraftAttempt = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const opened = play?.openTacticalDraft?.({ sectorCleared: 5 }) || false;
    const debug = play?.getTacticalDraftDebugState?.() || {};
    return { opened, active: Boolean(debug.active), offerCount: debug.offers?.length || 0 };
  });
  assert.equal(tacticalDraftAttempt.opened, true, 'Mayhem Tactical must open the Tactical Draft');
  assert.equal(tacticalDraftAttempt.active, true);
  assert.equal(tacticalDraftAttempt.offerCount, 3);
  await page.screenshot({ path: path.join(outputDir, 'mayhem-tactical-draft.png'), fullPage: false });
  await page.evaluate(() => window.__game?.scenes?.play?.clearTacticalDraft?.('qa_close'));
  await page.evaluate(() => {
    const game = window.__game;
    game.addScore(225000, 'baseScore');
    game.level = 6;
    game.gameOver({ fromInterlude: true });
  });
  const tacticalGameOver = await waitForGameOverActionStage(page);
  assert.equal(tacticalGameOver.runMode, RUN_MODES.MAYHEM_TACTICAL);
  assert.equal(tacticalGameOver.gameOver?.lastLeaderboardResult?.leaderboardKind, 'mayhem_tactical');
  const tacticalStorage = await storageSnapshot(page);
  assert.equal(tacticalStorage.mockSteamLeaderboard.some((entry) => entry.leaderboardName === STEAM_TACTICAL_LEADERBOARD_NAME), true, 'Mayhem Tactical must submit to its new Steam board');
  assert.equal(tacticalStorage.mockSteamLeaderboard.some((entry) => entry.leaderboardName === STEAM_LEADERBOARD_NAME), false, 'Mayhem Tactical must not touch the Pure Steam board');
  assert.ok(Number(tacticalStorage.mayhemModeRecords.tactical) > 0, 'Tactical personal best must be stored separately');
  await page.screenshot({ path: path.join(outputDir, 'mayhem-tactical-result.png'), fullPage: false });

  await seedProfile(page);
  await page.evaluate(() => window.__game.startGame(undefined, { runMode: 'sector_start', startSector: 30 }));
  const sectorPlay = await waitForScene(page, 'play');
  assert.equal(sectorPlay.runMode, RUN_MODES.SECTOR_START);
  assert.equal(sectorPlay.level, 31);
  assert.equal(sectorPlay.sectorStartChallenge?.checkpoint, 30);
  assert.equal(sectorPlay.scoreSubmissionAllowed, false);
  assert.equal(sectorPlay.runModeProfile?.unlocksAchievements, false);
  await page.screenshot({ path: path.join(outputDir, 'sector-run-checkpoint-30.png'), fullPage: false });
  await page.evaluate(() => {
    const game = window.__game;
    game.addScore(125000, 'baseScore');
    game.level = 32;
    game.unlockAchievement?.('ACH_SCORE_250K', { source: 'sector_guard' });
    game.finalizeRunProgression?.();
    game.gameOver({ fromInterlude: true });
  });
  const sectorGameOver = await waitForScene(page, 'gameOver');
  const sectorResultText = [
    sectorGameOver.gameOver?.ceremonyTitle,
    sectorGameOver.gameOver?.ceremonyComment,
    sectorGameOver.gameOver?.prompt,
    sectorGameOver.gameOver?.leaderboardStatus
  ].filter(Boolean).join('\n');
  assert.equal(sectorGameOver.runMode, RUN_MODES.SECTOR_START);
  assert.match(sectorResultText, /SECTOR RUN/i);
  assert.match(sectorResultText, /NO ACHIEVEMENTS/i);
  assert.match(sectorResultText, /Sector board|STEAM SECTOR/i);
  assert.equal(sectorGameOver.scoreSubmissionAllowed, false);
  await page.screenshot({ path: path.join(outputDir, 'sector-result-run.png'), fullPage: false });

  Object.assign(report, {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    scout: {
      difficultyProfile: scoutPlay.runModeProfile?.difficultyProfileId,
      sideEffectsBlocked: true,
      retryLabel: scoutGameOver.gameOver?.primaryCta?.label
    },
    mayhem: {
      difficultyProfile: mayhemPlay.runModeProfile?.difficultyProfileId,
      scoreSubmissionAllowed: mayhemPlay.scoreSubmissionAllowed,
      pureDraftBlocked: pureDraftAttempt.opened === false,
      tacticalDraftOpened: tacticalDraftAttempt.opened,
      boardsSeparated: true
    },
    sectorRun: {
      checkpoint: sectorPlay.sectorStartChallenge?.checkpoint,
      playSector: sectorPlay.level,
      achievements: sectorPlay.runModeProfile?.unlocksAchievements,
      resultExplained: /NO ACHIEVEMENTS/i.test(sectorResultText)
    },
    pageErrors,
    consoleErrors
  });
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[run-modes] PASS report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
