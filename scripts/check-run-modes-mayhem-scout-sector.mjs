import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { AchievementManager } from '../src/achievements/AchievementManager.js';
import { getAchievementIds } from '../src/achievements/AchievementCatalog.js';
import { RunPressureDirector } from '../src/game/RunPressureDirector.js';
import {
  DAILY_CABINET_SIGNAL_FINISH_SECTOR,
  deriveDailySignalContract,
  validateDailySignalContract
} from '../src/config/DailyCabinetSignal.js';
import {
  RUN_MODES,
  canRunModeUseTacticalDraft,
  canRunModeUseMayhemReinforcements,
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  getRunModeProfile,
  OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS,
  getSectorStartCheckpoints,
  getSectorStartPlaySector,
  isRankedRunMode
} from '../src/game/RunMode.js';
import { getShipUsageKey } from '../src/config/ShipMetadata.js';
import { STEAM_LEADERBOARD_NAME, STEAM_TACTICAL_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4666));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const NAVIGATION_TIMEOUT_MS = 60000;
const GAME_READY_TIMEOUT_MS = 120000;
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
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), { timeout: GAME_READY_TIMEOUT_MS });
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
  await page.goto(`${baseUrl}/?mockSteamLeaderboard=1`, { waitUntil: 'commit', timeout: NAVIGATION_TIMEOUT_MS });
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
  await page.reload({ waitUntil: 'commit', timeout: NAVIGATION_TIMEOUT_MS });
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
    dailySignalRecords: JSON.parse(localStorage.getItem('novaSwarm.dailySignalRecords.v1') || '{"records":{}}'),
    threatDiscovery: JSON.parse(localStorage.getItem('nova.threatDiscovery.v1') || '{"items":{},"discoveriesThisRun":[],"unreadIds":[]}'),
    shipUsage: JSON.parse(localStorage.getItem('burt.shipUsage.v1') || '{}'),
    shipUsageTotal: localStorage.getItem('burt.shipUsageTotal.v1') || '0',
    mayhemModeRecords: JSON.parse(localStorage.getItem('novaSwarm.mayhemModeRecords.v1') || '{}')
  }));
}

function summarizeThreatDiscoveryProgress(state = {}) {
  const entries = [];
  for (const [category, bucket] of Object.entries(state.items || {})) {
    for (const [id, item] of Object.entries(bucket || {})) {
      entries.push({
        category,
        id,
        timesSeen: Number(item?.timesSeen) || 0,
        timesDefeated: Number(item?.timesDefeated) || 0,
        timesSurvived: Number(item?.timesSurvived) || 0,
        timesKilledPlayer: Number(item?.timesKilledPlayer) || 0
      });
    }
  }
  entries.sort((left, right) => `${left.category}:${left.id}`.localeCompare(`${right.category}:${right.id}`));
  return {
    entries,
    unreadIds: [...(state.unreadIds || [])].sort()
  };
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

function assertContained(inner, outer, label, padding = 3) {
  assert.ok(inner?.width > 0 && outer?.width > 0, `${label}: missing bounds`);
  assert.ok(inner.x >= outer.x + padding, `${label}: crosses left edge`);
  assert.ok(inner.y >= outer.y + padding, `${label}: crosses top edge`);
  assert.ok(inner.right <= outer.right - padding, `${label}: crosses right edge`);
  assert.ok(inner.bottom <= outer.bottom - padding, `${label}: crosses bottom edge`);
}

function assertSeparated(upperBounds, lowerBounds, label, gap = 0) {
  if (
    !upperBounds || !lowerBounds
    || upperBounds.width <= 0 || upperBounds.height <= 0
    || lowerBounds.width <= 0 || lowerBounds.height <= 0
  ) return;
  assert.ok(
    upperBounds.bottom + gap <= lowerBounds.y,
    `${label}: overlap upper=${JSON.stringify(upperBounds)} lower=${JSON.stringify(lowerBounds)}`
  );
}

function assertNoOverlap(firstBounds, secondBounds, label, gap = 0) {
  if (
    !firstBounds || !secondBounds
    || firstBounds.width <= 0 || firstBounds.height <= 0
    || secondBounds.width <= 0 || secondBounds.height <= 0
  ) return;
  const separated = (
    firstBounds.right + gap <= secondBounds.x
    || secondBounds.right + gap <= firstBounds.x
    || firstBounds.bottom + gap <= secondBounds.y
    || secondBounds.bottom + gap <= firstBounds.y
  );
  assert.ok(
    separated,
    `${label}: overlap first=${JSON.stringify(firstBounds)} second=${JSON.stringify(secondBounds)}`
  );
}

function assertLaunchDeckVisible(state, label) {
  const screen = state.menu?.screen;
  const deck = state.menu?.launchDeck;
  assert.ok(deck?.bounds?.width > 0, `${label}: Launch Deck bounds missing`);
  assertInside(deck.bounds, screen, `${label}: Launch Deck`);
  const daily = deck.featuredDailySignal;
  assertInside(daily?.bounds, screen, `${label}: Daily Signal feature`);
  assert.equal(daily?.label, 'DAILY CHALLENGE', `${label}: Daily Challenge label`);
  assert.match(daily?.sublabel || '', /(?:CLEAR S10|CLEARED)/i, `${label}: Daily Challenge should explain today's activity`);
  assert.equal(daily?.role, 'activity', `${label}: Daily Challenge should be identified as a side activity`);
  assert.deepEqual(deck.hierarchy, ['launchTactical', 'dailySignal', 'scout', 'sectorStart', 'overrun'], `${label}: mode hierarchy`);
  assert.equal(Object.keys(deck.cards || {}).length, 5, `${label}: Launch Deck must contain five clear mode families`);
  const cards = [
    ['mayhemTactical', deck.cards?.mayhemTactical],
    ['daily', deck.cards?.daily],
    ['scout', deck.cards?.scout],
    ['sector', deck.cards?.sector],
    ['overrun', deck.cards?.overrun]
  ];
  for (const [name, card] of cards) {
    assertInside(card?.bounds, screen, `${label}: ${name} card`);
    const minimumHeight = name === 'mayhemTactical' ? 60 : 40;
    const maximumHeight = name === 'mayhemTactical' ? 120 : 104;
    assert.ok(
      card.bounds.height >= minimumHeight && card.bounds.height <= maximumHeight,
      `${label}: ${name} selector should stay compact; bounds=${JSON.stringify(card.bounds)}`
    );
    assert.ok(
      card.bounds.width >= 220 && card.bounds.width <= 560,
      `${label}: ${name} selector should not become oversized; bounds=${JSON.stringify(card.bounds)}`
    );
  }
  assert.equal(deck.cards?.mayhemTactical?.label, 'MAYHEM TACTICAL', `${label}: Tactical Mayhem label`);
  assert.equal(deck.cards?.mayhemTactical?.sublabel, 'MAIN MODE · RECOMMENDED · RANKED', `${label}: Tactical Mayhem sublabel`);
  assert.equal(deck.cards?.mayhemTactical?.role, 'main', `${label}: Tactical Mayhem role`);
  assert.equal(deck.cards?.mayhemTactical?.runMode, RUN_MODES.MAYHEM_TACTICAL, `${label}: Mayhem family should default to Tactical`);
  assert.equal(deck.cards?.mayhemTactical?.body || '', '', `${label}: Tactical card should not carry paragraph body text`);
  assert.equal(deck.cards?.daily?.label, 'DAILY CHALLENGE', `${label}: Daily label`);
  assert.equal(deck.cards?.daily?.role, 'activity', `${label}: Daily role`);
  assert.equal(deck.cards?.scout?.label, 'SCOUT RUN', `${label}: Scout label`);
  assert.match(deck.cards?.scout?.sublabel || '', /^ANOMALY: (CALIBRATION|BULLET SCHOOL|BOSS LAB)$/, `${label}: Scout anomaly sublabel`);
  assert.equal(deck.cards?.scout?.role, 'practice', `${label}: Scout role`);
  assert.equal(deck.cards?.scout?.body || '', '', `${label}: Scout card should not carry paragraph body text`);
  assert.equal(deck.cards?.sector?.label, 'SECTOR RUN', `${label}: Sector label`);
  if (state.menu?.sectorStart?.available) {
    assert.match(deck.cards?.sector?.sublabel || '', /^CHECKPOINT \d+$/, `${label}: unlocked Sector sublabel should expose the selected checkpoint`);
  } else {
    assert.equal(deck.cards?.sector?.sublabel, 'LOCKED', `${label}: locked Sector sublabel`);
  }
  assert.equal(deck.cards?.sector?.role, 'checkpoint', `${label}: Sector role`);
  assert.equal(deck.cards?.sector?.body || '', '', `${label}: Sector card should not carry paragraph body text`);
  assert.equal(deck.cards?.overrun?.label, 'OVERRUN TACTICAL', `${label}: Overrun label`);
  assert.equal(deck.cards?.overrun?.sublabel, 'TACTICAL · S51 · CAREER', `${label}: Overrun sublabel`);
  assert.equal(deck.cards?.overrun?.role, 'advanced', `${label}: Overrun role`);
  assert.equal(deck.cards?.overrun?.available, true, `${label}: Overrun should be unlocked by the mature fixture`);
  assert.equal(deck.cards?.overrun?.startSector, 51, `${label}: Overrun fixed start`);
  assert.ok(deck.cards.mayhemTactical.bounds.height >= deck.cards.daily.bounds.height * 1.25, `${label}: Mayhem family should remain materially taller than side modes`);
  assert.ok(deck.cards.mayhemTactical.bounds.width > deck.cards.daily.bounds.width, `${label}: Mayhem family should remain wider than side modes`);
  assert.ok(Math.abs(deck.cards.mayhemTactical.bounds.x - deck.cards.daily.bounds.x) < 36, `${label}: Mayhem/Daily cards should share the left command stack`);
  assert.ok(Math.abs(deck.cards.daily.bounds.x - deck.cards.scout.bounds.x) < 36, `${label}: Daily/Scout cards should share the left command stack`);
  assert.ok(Math.abs(deck.cards.scout.bounds.x - deck.cards.sector.bounds.x) < 36, `${label}: Scout/Sector cards should share the left command stack`);
  assert.ok(Math.abs(deck.cards.sector.bounds.x - deck.cards.overrun.bounds.x) < 36, `${label}: Sector/Overrun cards should share the left command stack`);
  assert.ok(deck.cards.mayhemTactical.bounds.bottom < deck.cards.daily.bounds.y + 36, `${label}: Mayhem/Daily cards overlap vertically`);
  assert.ok(deck.cards.daily.bounds.bottom < deck.cards.scout.bounds.y + 36, `${label}: Daily/Scout cards overlap vertically`);
  assert.ok(deck.cards.scout.bounds.bottom < deck.cards.sector.bounds.y + 36, `${label}: Scout/Sector cards overlap vertically`);
  assert.ok(deck.cards.sector.bounds.bottom < deck.cards.overrun.bounds.y + 36, `${label}: Sector/Overrun cards overlap vertically`);
  assert.ok(deck.bounds.right < screen.width * 0.5, `${label}: Launch Deck should avoid the center ship showcase lane`);
  assert.ok((state.menu?.panel?.y || 0) > deck.bounds.bottom, `${label}: utility dock should sit below Launch Deck`);
  assert.doesNotMatch(JSON.stringify(state.menu || {}), /Sector 1 climb/i, `${label}: old Sector 1 climb wording should not be player-facing`);
  const briefing = state.menu?.missionBriefing;
  assertInside(briefing?.panelBounds, screen, `${label}: Mission Briefing panel`);
  assert.ok(briefing.panelBounds.x > screen.width * 0.58, `${label}: Mission Briefing should sit on the right side`);
  assert.ok(briefing.panelBounds.x > deck.bounds.right + 48, `${label}: Mission Briefing should not overlap Launch Deck`);
  assert.ok(briefing.panelBounds.bottom < (state.menu?.panel?.y || screen.height), `${label}: Mission Briefing should stay above utility dock`);
  assert.ok(
    (briefing.bodyBounds?.bottom || 0) <= briefing.panelBounds.bottom + 4,
    `${label}: Mission Briefing body should stay inside frame body=${JSON.stringify(briefing.bodyBounds)} panel=${JSON.stringify(briefing.panelBounds)}`
  );
  assertSeparated(
    briefing.statusBounds,
    briefing.variantSelectorBounds,
    `${label}: status badge and ruleset selector`,
    2
  );
  assertSeparated(
    briefing.restrictionBounds,
    briefing.detailsButtonBounds,
    `${label}: restriction and details button`,
    2
  );
  assertNoOverlap(
    briefing.personalBestBounds,
    briefing.detailsButtonBounds,
    `${label}: personal best and details button`,
    2
  );
  if (briefing.launchButtonBounds?.width > 0) {
    assertContained(briefing.launchButtonLabelBounds, briefing.launchButtonBounds, `${label}: launch label`, 2);
  }
  if (briefing.detailsButtonBounds?.width > 0) {
    assertContained(briefing.detailsButtonLabelBounds, briefing.detailsButtonBounds, `${label}: details label`, 2);
    if (briefing.detailsButtonIconBounds) {
      assertContained(briefing.detailsButtonIconBounds, briefing.detailsButtonBounds, `${label}: details icon`, 2);
      assertNoOverlap(
        briefing.detailsButtonIconBounds,
        briefing.detailsButtonLabelBounds,
        `${label}: details icon and label`,
        2
      );
    }
  }
}

async function selectSectorSelectorCheckpoint(page, checkpoint) {
  await page.evaluate((sector) => {
    const menu = window.__game?.scenes?.menu || window.__game?.scene;
    const index = menu?.sectorSelectorSectors?.findIndex((entry) => entry?.sector === sector);
    if (index >= 0) {
      menu.selectedSectorSelectorIndex = index;
      menu.drawSectorSelectorOverlay?.();
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
  assert.equal(isRankedRunMode(RUN_MODES.DAILY_SIGNAL), false);
  assert.equal(isRankedRunMode(RUN_MODES.SCOUT), false);
  assert.equal(isRankedRunMode(RUN_MODES.SECTOR_START), false);
  assert.equal(isRankedRunMode(RUN_MODES.OVERRUN_PURE), false);
  assert.equal(isRankedRunMode(RUN_MODES.OVERRUN_TACTICAL), false);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.RANKED), true);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.MAYHEM_TACTICAL), true);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.DAILY_SIGNAL), false);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.SCOUT), false);
  assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.SECTOR_START), false);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.RANKED), true);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.MAYHEM_TACTICAL), true);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.DAILY_SIGNAL), false);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.SCOUT), false);
  assert.equal(canRunModeUnlockAchievements(RUN_MODES.SECTOR_START), false);
  assert.equal(getRunModeProfile(RUN_MODES.RANKED).difficultyProfileId, 'accepted_harder_ranked');
  assert.equal(getRunModeProfile(RUN_MODES.MAYHEM_TACTICAL).difficultyProfileId, 'accepted_harder_ranked');
  assert.equal(canRunModeUseTacticalDraft(RUN_MODES.RANKED), false);
  assert.equal(canRunModeUseTacticalDraft(RUN_MODES.MAYHEM_TACTICAL), true);
  assert.equal(canRunModeUseTacticalDraft(RUN_MODES.DAILY_SIGNAL), true);
  assert.equal(canRunModeUseMayhemReinforcements(RUN_MODES.DAILY_SIGNAL), true);
  assert.equal(getRunModeProfile(RUN_MODES.DAILY_SIGNAL).updatesCareerProgress, false);
  assert.equal(getRunModeProfile(RUN_MODES.DAILY_SIGNAL).difficultyProfileId, 'accepted_harder_ranked');
  const dailyContract = deriveDailySignalContract();
  assert.equal(validateDailySignalContract(dailyContract).valid, true);
  assert.equal(dailyContract.finishSector, DAILY_CABINET_SIGNAL_FINISH_SECTOR);
  assert.equal(dailyContract.onlineCompetitive, false);
  const playSceneSource = readFileSync(path.resolve('src/scenes/PlayScene.js'), 'utf8');
  const dailyFinishGateIndex = playSceneSource.indexOf('const dailySignalFinish =');
  const gatedLevelVoiceIndex = playSceneSource.indexOf('if (!dailySignalFinish) this.playLevelClearVoice');
  const dailyFinishBranchIndex = playSceneSource.indexOf('if (dailySignalFinish) {', gatedLevelVoiceIndex);
  assert.ok(dailyFinishGateIndex >= 0 && gatedLevelVoiceIndex > dailyFinishGateIndex && dailyFinishBranchIndex > gatedLevelVoiceIndex,
    'terminal Daily sector must suppress the delayed generic level-clear voice before entering its dedicated clear presentation');
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
  await page.goto(`${baseUrl}/?mockSteamLeaderboard=1&skipIntro=1&overrunPreview=1`, {
    waitUntil: 'commit',
    timeout: NAVIGATION_TIMEOUT_MS
  });
  await waitForGame(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
  });
  await page.reload({ waitUntil: 'commit', timeout: NAVIGATION_TIMEOUT_MS });
  await waitForGame(page);
  await waitForScene(page, 'menu');
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.waitForTimeout(1600);
  const webPreviewMenu = await readState(page);
  assertLaunchDeckVisible(webPreviewMenu, '1920x900 fresh web-preview menu');
  assert.equal(webPreviewMenu.menu?.launchDeck?.cards?.overrun?.available, true);
  assert.equal(webPreviewMenu.menu?.launchDeck?.cards?.overrun?.progressionUnlocked, false);
  assert.equal(webPreviewMenu.menu?.launchDeck?.cards?.overrun?.previewAccess, true);
  assert.equal(webPreviewMenu.menu?.missionBoard?.hidden, false, 'fresh web-preview profiles should show Pilot Orders');
  assert.equal(webPreviewMenu.menu?.missionBoard?.rows?.length, 3, 'fresh web-preview profiles should show three Pilot Orders');
  assert.equal(webPreviewMenu.menu?.missionBoard?.bounds?.placement, 'rightRail');
  assertInside(webPreviewMenu.menu?.missionBoard?.bounds, webPreviewMenu.menu?.screen, 'web-preview Pilot Orders');
  await focusMenuOption(page, 'overrun');
  await page.screenshot({ path: path.join(outputDir, 'menu-overrun-web-preview.png'), fullPage: false });
  const webPreviewStarted = await page.evaluate(() => window.__game?.currentScene?.startOverrunRun?.());
  assert.equal(webPreviewStarted, true, 'web-preview access should launch Overrun from a fresh local profile');
  const webPreviewPlay = await waitForScene(page, 'play');
  assert.equal(webPreviewPlay.runMode, RUN_MODES.OVERRUN_TACTICAL);
  assert.equal(webPreviewPlay.level, 51);
  report.webPreview = {
    overrun: webPreviewMenu.menu?.launchDeck?.cards?.overrun,
    missionBoard: webPreviewMenu.menu?.missionBoard,
    launchedRunMode: webPreviewPlay.runMode,
    launchedSector: webPreviewPlay.level
  };

  const menu = await seedProfile(page);
  await page.waitForTimeout(1500);
  const settledMenu = await readState(page);
  assert.equal(menu.menu?.items?.dailySignalButton?.width > 0, true, 'Daily Signal should be visible');
  assert.equal(menu.menu?.items?.launchButton, null, 'Mayhem Pure should not consume a separate top-level card');
  assert.equal(menu.menu?.items?.tacticalLaunchButton?.width > 0, true, 'Mayhem Tactical should be visible');
  assert.equal(menu.menu?.items?.scoutRunButton?.width > 0, true, 'Scout Run should be visible');
  assert.equal(menu.menu?.items?.sectorStartButton?.width > 0, true, 'Sector Run should be visible');
  assert.equal(menu.menu?.items?.overrunStartButton?.width > 0, true, 'Overrun should be visible');
  assertLaunchDeckVisible(settledMenu, '1366x768 initial menu');
  assert.equal(settledMenu.menu?.focusedOption, 'launchTactical', 'Mayhem Tactical should receive default focus');
  assert.equal(settledMenu.menu?.missionBriefing?.mode, 'launchTactical', 'Mission briefing should default to Mayhem Tactical');
  assert.equal(settledMenu.menu?.missionBriefing?.eyebrow, 'RUN MODE');
  assert.equal(settledMenu.menu?.missionBriefing?.title, 'MAYHEM');
  assert.equal(settledMenu.menu?.missionBriefing?.status, 'RANKED');
  assert.ok(settledMenu.menu?.missionBriefing?.renderPadding?.title >= 12, 'dynamic mode title needs anti-clipping render padding');
  assert.ok(settledMenu.menu?.missionBriefing?.renderPadding?.status >= 12, 'dynamic status badge needs anti-clipping render padding');
  assert.ok(settledMenu.menu?.missionBriefing?.renderPadding?.details >= 24, 'dynamic details label needs anti-clipping render padding');
  assert.match(settledMenu.menu?.missionBriefing?.body || '', /permanent tactical upgrade[\s\S]*separate Tactical leaderboard/i);
  assert.ok(settledMenu.menu?.missionBriefing?.panelBounds?.width > 0, 'Mission briefing panel should be visible');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(180);
  const pureMayhemMenu = await readState(page);
  assert.equal(pureMayhemMenu.menu?.focusedOption, 'launchTactical', 'changing Mayhem ruleset should keep focus on the Mayhem family');
  assert.equal(pureMayhemMenu.menu?.launchDeck?.cards?.mayhemTactical?.label, 'MAYHEM PURE', 'Mayhem family should expose Pure');
  assert.equal(pureMayhemMenu.menu?.launchDeck?.cards?.mayhemTactical?.sublabel, 'ALTERNATIVE RANKED MODE', 'Pure ruleset should explain its role');
  assert.equal(pureMayhemMenu.menu?.launchDeck?.cards?.mayhemTactical?.runMode, RUN_MODES.RANKED, 'Pure ruleset should retain ranked identity');
  assert.equal(pureMayhemMenu.menu?.missionBriefing?.title, 'MAYHEM');
  assert.equal(pureMayhemMenu.menu?.missionBriefing?.status, 'RANKED');
  assert.match(pureMayhemMenu.menu?.missionBriefing?.body || '', /original Mayhem rules[\s\S]*no Tactical Drafts[\s\S]*Pure leaderboard/i);
  const pureLaunch = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    const game = window.__game;
    const originalStartGame = game.startGame;
    let captured = null;
    game.startGame = (ship, options) => {
      captured = { ship, options };
    };
    scene.launchingRun = false;
    scene.activateFocusedMenuOption();
    scene.launchingRun = false;
    game.startGame = originalStartGame;
    return captured;
  });
  assert.equal(pureLaunch?.options?.runMode, RUN_MODES.RANKED, 'Mayhem family should launch the selected Pure ruleset');
  await page.screenshot({ path: path.join(outputDir, 'menu-mayhem-pure-ruleset.png'), fullPage: false });
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(180);
  const restoredTacticalMenu = await readState(page);
  assert.equal(restoredTacticalMenu.menu?.launchDeck?.cards?.mayhemTactical?.label, 'MAYHEM TACTICAL', 'Mayhem family should return to Tactical');
  assert.equal(restoredTacticalMenu.menu?.launchDeck?.cards?.mayhemTactical?.runMode, RUN_MODES.MAYHEM_TACTICAL, 'Tactical ruleset should retain ranked Tactical identity');
  const tacticalLaunch = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    const game = window.__game;
    const originalStartGame = game.startGame;
    let captured = null;
    game.startGame = (ship, options) => {
      captured = { ship, options };
    };
    scene.launchingRun = false;
    scene.activateFocusedMenuOption();
    scene.launchingRun = false;
    game.startGame = originalStartGame;
    return captured;
  });
  assert.equal(tacticalLaunch?.options?.runMode, RUN_MODES.MAYHEM_TACTICAL, 'Mayhem family should launch the selected Tactical ruleset');
  assert.equal(settledMenu.menu?.scoutRun?.buttonText, 'SCOUT RUN');
  assert.match(
    settledMenu.menu?.scoutRun?.buttonSubtext || '',
    /^ANOMALY: (CALIBRATION|BULLET SCHOOL|BOSS LAB)$/,
    'Scout launch card should expose the selected anomaly'
  );
  assert.equal(settledMenu.menu?.sectorStart?.buttonText, 'SECTOR RUN');
  assert.equal(settledMenu.menu?.sectorStart?.buttonSubtext, 'CHECKPOINT 30');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await waitForScene(page, 'menu');
  await page.waitForTimeout(500);
  assertLaunchDeckVisible(await readState(page), '1920x1080 menu');
  await page.screenshot({ path: path.join(outputDir, 'menu-launch-deck-1920x1080.png'), fullPage: false });
  await focusMenuOption(page, 'dailySignal');
  await page.screenshot({ path: path.join(outputDir, 'menu-daily-signal-focused-1920x1080.png'), fullPage: false });
  await focusMenuOption(page, 'launchTactical');
  await page.setViewportSize({ width: 1366, height: 768 });
  await waitForScene(page, 'menu');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, 'menu-run-modes-1366x768.png'), fullPage: false });
  await page.setViewportSize({ width: 1280, height: 720 });
  await waitForScene(page, 'menu');
  await page.waitForTimeout(500);
  assertLaunchDeckVisible(await readState(page), '1280x720 menu');
  await page.screenshot({ path: path.join(outputDir, 'menu-run-modes-1280x720.png'), fullPage: false });
  await page.setViewportSize({ width: 1280, height: 800 });
  await waitForScene(page, 'menu');
  await page.waitForTimeout(500);
  assertLaunchDeckVisible(await readState(page), '1280x800 menu');
  await page.screenshot({ path: path.join(outputDir, 'menu-run-modes-1280x800.png'), fullPage: false });
  await page.setViewportSize({ width: 2560, height: 1440 });
  await waitForScene(page, 'menu');
  await page.waitForTimeout(500);
  assertLaunchDeckVisible(await readState(page), '2560x1440 menu');
  await page.screenshot({ path: path.join(outputDir, 'menu-run-modes-2560x1440.png'), fullPage: false });

  for (const viewport of [
    { width: 2560, height: 1440, name: '2560x1440' },
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1280, height: 720, name: '1280x720' },
    { width: 1280, height: 800, name: '1280x800' }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await waitForScene(page, 'menu');
    await page.waitForTimeout(250);
    for (const mode of ['dailySignal', 'launchTactical', 'scout', 'sectorStart', 'overrun']) {
      assertLaunchDeckVisible(await focusMenuOption(page, mode), `${viewport.name} ${mode} briefing`);
    }
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await waitForScene(page, 'menu');
  const dailyFocus = await focusMenuOption(page, 'dailySignal');
  assert.equal(dailyFocus.menu?.missionBriefing?.mode, 'dailySignal');
  assert.match(dailyFocus.menu?.missionBriefing?.body || '', /Clear today’s challenge with a loaner ship[\s\S]*local daily record/i);
  const dailyTiles = Object.fromEntries(
    dailyFocus.menu?.missionBriefing?.tiles?.map(({ label, value }) => [label, value]) || []
  );
  assert.equal(dailyTiles.TARGET, 'SECTOR 10');
  assert.ok(String(dailyTiles.SHIP || '').length > 2, 'Daily briefing should expose the derived loaner ship');
  assert.equal(dailyTiles.DRAFTS, 'TACTICAL');
  assert.equal(dailyTiles.RECORD, 'NOT ATTEMPTED');
  assert.match(dailyFocus.menu?.missionBriefing?.restriction || '', /Local record only.*No public daily leaderboard/i);
  assert.doesNotMatch(dailyFocus.menu?.missionBriefing?.body || '', /[◆◇]/, 'Daily menu briefing must use words and numbers instead of symbolic status glyphs');
  assert.doesNotMatch(dailyFocus.menu?.missionBriefing?.body || '', /fixed route/i, 'Daily briefing must not overclaim full route determinism');
  assert.equal(dailyFocus.menu?.launchDeck?.featuredDailySignal?.contract?.localOnly, true);
  await page.screenshot({ path: path.join(outputDir, 'menu-daily-signal-focused.png'), fullPage: false });
  await focusMenuOption(page, 'launchTactical');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const mayhemFocus = await readState(page);
  assert.equal(mayhemFocus.menu?.focusedOption, 'launchTactical', 'ArrowRight should keep focus on the Mayhem family');
  assert.equal(mayhemFocus.menu?.missionBriefing?.mode, 'launchTactical');
  assert.equal(mayhemFocus.menu?.launchDeck?.cards?.mayhemTactical?.label, 'MAYHEM PURE');
  assert.match(mayhemFocus.menu?.missionBriefing?.body || '', /original Mayhem rules[\s\S]*no Tactical Drafts[\s\S]*Pure leaderboard/i);
  assert.doesNotMatch(mayhemFocus.menu?.missionBriefing?.body || '', /Sector 1 climb/i);
  await page.screenshot({ path: path.join(outputDir, 'menu-mayhem-focused.png'), fullPage: false });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  assert.equal((await readState(page)).menu?.launchDeck?.cards?.mayhemTactical?.label, 'MAYHEM TACTICAL', 'ArrowRight should toggle the Mayhem family back to Tactical');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  assert.equal((await readState(page)).menu?.focusedOption, 'dailySignal', 'ArrowDown should move from Mayhem to Daily Challenge');
  const tacticalFocus = await focusMenuOption(page, 'launchTactical');
  assert.equal(tacticalFocus.menu?.missionBriefing?.mode, 'launchTactical');
  assert.match(tacticalFocus.menu?.missionBriefing?.body || '', /permanent tactical upgrade[\s\S]*separate Tactical leaderboard/i);
  await page.screenshot({ path: path.join(outputDir, 'menu-mayhem-tactical-focused.png'), fullPage: false });
  const scoutFocus = await focusMenuOption(page, 'scout');
  assert.equal(scoutFocus.menu?.missionBriefing?.mode, 'scout');
  assert.match(
    scoutFocus.menu?.missionBriefing?.body || '',
    /Lower-pressure route and hull practice[\s\S]*Scout pressure.*Scout bosses/i
  );
  await page.screenshot({ path: path.join(outputDir, 'menu-scout-focused.png'), fullPage: false });
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'ArrowRight',
    code: 'ArrowRight',
    bubbles: true,
    cancelable: true
  })));
  await page.waitForTimeout(180);
  const bulletSchoolFocus = await readState(page);
  assert.equal(bulletSchoolFocus.menu?.focusedOption, 'scout', 'cycling an anomaly should keep Scout focused');
  assert.equal(bulletSchoolFocus.menu?.scoutRun?.anomaly?.id, 'bullet_school');
  assert.equal(bulletSchoolFocus.menu?.scoutRun?.buttonSubtext, 'ANOMALY: BULLET SCHOOL');
  assert.match(
    bulletSchoolFocus.menu?.missionBriefing?.body || '',
    /Ranked-speed shots and firing pressure with Scout sustain[\s\S]*Ranked bullet pressure.*Scout sustain/i
  );
  assert.equal(
    Object.fromEntries(bulletSchoolFocus.menu?.missionBriefing?.tiles?.map(({ label, value }) => [label, value]) || []).ANOMALY,
    'BULLET SCHOOL'
  );
  await page.screenshot({ path: path.join(outputDir, 'menu-scout-bullet-school.png'), fullPage: false });
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'ArrowLeft',
    code: 'ArrowLeft',
    bubbles: true,
    cancelable: true
  })));
  await page.waitForTimeout(180);
  assert.equal((await readState(page)).menu?.scoutRun?.anomaly?.id, 'calibration', 'Scout anomaly should cycle back deterministically');
  const sectorFocus = await focusMenuOption(page, 'sectorStart');
  assert.equal(sectorFocus.menu?.missionBriefing?.mode, 'sectorStart');
  assert.match(sectorFocus.menu?.missionBriefing?.body || '', /STARTS AT SECTOR 31[\s\S]*MAYHEM BEST: SECTOR 31/i);
  assert.deepEqual(
    Object.fromEntries(sectorFocus.menu?.missionBriefing?.tiles?.map(({ label, value }) => [label, value]) || []),
    { START: 'SECTOR 31', 'MAYHEM BEST': 'SECTOR 31', RECORD: 'LOCAL' }
  );
  assert.match(sectorFocus.menu?.missionBriefing?.restriction || '', /No leaderboard submission or achievements.*Sector records stay local/i);
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

  await page.evaluate(() => {
    const scene = window.__game?.scenes?.menu;
    const progress = JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      ...progress,
      bestSector: 29,
      bestLevel: 29
    }));
    scene.overrunStartState = null;
    scene.refreshButtonCopy?.(scene.overrunStartBtn, { forceGpuRefresh: true });
    scene.setMenuFocusByButton?.(scene.overrunStartBtn);
  });
  await page.waitForTimeout(180);
  const lockedOverrunFocus = await readState(page);
  assert.equal(lockedOverrunFocus.menu?.launchDeck?.cards?.overrun?.available, false);
  assert.equal(lockedOverrunFocus.menu?.launchDeck?.cards?.overrun?.sublabel, 'LOCKED · REACH SECTOR 30');
  assert.match(
    lockedOverrunFocus.menu?.missionBriefing?.body || '',
    /Reach Sector 30 in Mayhem Tactical to unlock the Sector 51 start/i
  );
  assert.equal(lockedOverrunFocus.menu?.missionBriefing?.status, 'LOCKED');
  assert.match(lockedOverrunFocus.menu?.missionBriefing?.restriction || '', /highest Sector reached, not Pilot Rank/i);
  await page.screenshot({ path: path.join(outputDir, 'menu-overrun-locked-focused.png'), fullPage: false });
  await page.evaluate(() => {
    const scene = window.__game?.scenes?.menu;
    const progress = JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      ...progress,
      bestSector: 31,
      bestLevel: 31
    }));
    scene.overrunStartState = null;
    scene.refreshButtonCopy?.(scene.overrunStartBtn, { forceGpuRefresh: true });
  });

  const overrunFocus = await focusMenuOption(page, 'overrun');
  assert.equal(overrunFocus.menu?.missionBriefing?.mode, 'overrun');
  assert.match(
    overrunFocus.menu?.missionBriefing?.body || '',
    /Start at Sector 51 with five fixed upgrades[\s\S]*Boss victories still offer new upgrade choices/i
  );
  assert.deepEqual(
    overrunFocus.menu?.missionBriefing?.tiles?.map(({ label, value }) => [label, value]),
    [['START', 'SECTOR 51'], ['SCORE', 'STARTS AT 0'], ['CAREER XP', '85% OF NORMAL'], ['BOSS DRAFTS', 'CONTINUE']]
  );
  await page.screenshot({ path: path.join(outputDir, 'menu-overrun-tactical-focused.png'), fullPage: false });
  await page.evaluate(() => window.__game?.scenes?.menu?.cycleOverrunRunMode?.(-1, { force: true }));
  await page.waitForTimeout(180);
  const overrunPureFocus = await readState(page);
  assert.equal(overrunPureFocus.menu?.launchDeck?.cards?.overrun?.runMode, RUN_MODES.OVERRUN_PURE);
  assert.equal(overrunPureFocus.menu?.launchDeck?.cards?.overrun?.label, 'OVERRUN PURE');
  assert.match(
    overrunPureFocus.menu?.missionBriefing?.body || '',
    /Start at Sector 51 on the Pure ship baseline[\s\S]*No Tactical upgrades or Boss Drafts/i
  );
  await page.screenshot({ path: path.join(outputDir, 'menu-overrun-pure-focused.png'), fullPage: false });

  await page.evaluate(() => window.__game?.scenes?.menu?.startOverrunRun?.());
  const overrunPurePlay = await waitForScene(page, 'play');
  const overrunPureRuntime = await page.evaluate(() => ({
    level: window.__game?.level,
    startSector: window.__game?.runStartSector,
    runMode: window.__game?.runMode,
    baselineIds: window.__game?.scenes?.play?.overrunBaselineAugmentIds || [],
    playerAugmentIds: window.__game?.scenes?.play?.player?.runAugmentIds || [],
    leaderboardAllowed: window.__game?.getRunModeProfile?.()?.submitsGlobalLeaderboard === true,
    achievementAllowed: window.__game?.canUnlockAchievementsForCurrentRun?.()
  }));
  assert.equal(overrunPurePlay.runMode, RUN_MODES.OVERRUN_PURE);
  assert.equal(overrunPureRuntime.level, 51);
  assert.equal(overrunPureRuntime.startSector, 51);
  assert.deepEqual(overrunPureRuntime.baselineIds, []);
  assert.deepEqual(overrunPureRuntime.playerAugmentIds, []);
  assert.equal(overrunPureRuntime.leaderboardAllowed, false);
  assert.equal(overrunPureRuntime.achievementAllowed, false);
  await page.screenshot({ path: path.join(outputDir, 'overrun-pure-sector-51.png'), fullPage: false });

  await page.evaluate(() => window.__game?.showMenu?.());
  await waitForScene(page, 'menu');
  const beforeOverrunResult = await storageSnapshot(page);
  await page.evaluate((mode) => {
    const menuScene = window.__game?.scenes?.menu;
    menuScene.overrunRunMode = mode;
    menuScene.startOverrunRun?.();
  }, RUN_MODES.OVERRUN_TACTICAL);
  const overrunTacticalPlay = await waitForScene(page, 'play');
  const overrunTacticalRuntime = await page.evaluate(() => ({
    level: window.__game?.level,
    startSector: window.__game?.runStartSector,
    runMode: window.__game?.runMode,
    baselineIds: window.__game?.scenes?.play?.overrunBaselineAugmentIds || [],
    playerAugmentIds: window.__game?.scenes?.play?.player?.runAugmentIds || []
  }));
  assert.equal(overrunTacticalPlay.runMode, RUN_MODES.OVERRUN_TACTICAL);
  assert.equal(overrunTacticalRuntime.level, 51);
  assert.equal(overrunTacticalRuntime.startSector, 51);
  assert.deepEqual(overrunTacticalRuntime.baselineIds, OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS);
  assert.deepEqual(overrunTacticalRuntime.playerAugmentIds, OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS);
  await page.screenshot({ path: path.join(outputDir, 'overrun-tactical-sector-51.png'), fullPage: false });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    const config = manager?.createOverrunRoutineReinforcementConfig?.(1);
    if (!manager || !config) throw new Error('Overrun routine reinforcement config unavailable');
    manager.clearPendingWaveSpawns?.();
    manager.clearEnemies?.();
    manager.state = 'WAVE_ACTIVE';
    manager.phase = 'WAVES';
    manager.waveEnding = false;
    manager.spawning = false;
    manager.pendingWaveConfig = null;
    manager.spawnWave({
      ...config,
      reinforcementEntryRoute: 'bottom',
      reinforcementEntryDelayMs: 0
    });
  });
  await page.waitForTimeout(650);
  const overrunReinforcementState = await readState(page);
  const routineReinforcements = (overrunReinforcementState.visibleEnemies || [])
    .filter((enemy) => enemy.reinforcement?.routine);
  assert.ok(routineReinforcements.length >= 2 && routineReinforcements.length <= 4);
  assert.ok(routineReinforcements.every((enemy) => enemy.reinforcement?.entryRoute === 'bottom'));
  assert.ok(routineReinforcements.every((enemy) => enemy.reinforcement?.swarmEntry === true));
  await page.screenshot({ path: path.join(outputDir, 'overrun-bottom-reinforcements.png'), fullPage: false });
  await page.evaluate(() => {
    const game = window.__game;
    game.addScore(250000, 'baseScore');
    game.level = 52;
    const playScene = game.scenes?.play;
    playScene.bossKills = 1;
    playScene.wavesCleared = 2;
    game.finalizeRunProgression?.();
    game.gameOver({ fromInterlude: true });
  });
  const overrunResult = await waitForGameOverActionStage(page);
  const overrunResultText = [
    overrunResult.gameOver?.ceremonyTitle,
    overrunResult.gameOver?.ceremonyComment,
    overrunResult.gameOver?.prompt,
    overrunResult.gameOver?.leaderboardStatus,
    overrunResult.gameOver?.runback?.runSummary
  ].filter(Boolean).join('\n');
  assert.match(overrunResultText, /OVERRUN/i);
  assert.match(overrunResultText, /CAREER XP/i);
  assert.match(overrunResultText, /LEADERBOARD/i);
  assert.equal(overrunResult.gameOver?.leaderboardCta?.visible, false, 'Overrun result must not expose a leaderboard CTA');
  assert.equal(overrunResult.gameOver?.primaryCta?.label, 'ONE MORE OVERRUN');
  const afterOverrunResult = await storageSnapshot(page);
  assert.ok(afterOverrunResult.hangar.pilotXp > beforeOverrunResult.hangar.pilotXp, 'Overrun result should persist career XP');
  assert.equal(afterOverrunResult.hangar.totalRuns, beforeOverrunResult.hangar.totalRuns + 1);
  assert.equal(afterOverrunResult.hangar.bestScore, beforeOverrunResult.hangar.bestScore);
  assert.equal(afterOverrunResult.hangar.bestSector, beforeOverrunResult.hangar.bestSector);
  assert.equal(afterOverrunResult.hangar.bestLevel, beforeOverrunResult.hangar.bestLevel);
  await page.screenshot({ path: path.join(outputDir, 'overrun-tactical-result.png'), fullPage: false });

  await seedProfile(page);

  const expiredDailyRejected = await page.evaluate(async () => {
    const game = window.__game;
    const menuScene = game?.scenes?.menu || game?.currentScene;
    const current = menuScene?.dailySignalContract;
    const expired = {
      ...current,
      reinforcementSectors: [...(current?.reinforcementSectors || [])],
      superStormSectors: [...(current?.superStormSectors || [])],
      validFrom: '2000-01-01T00:00:00.000Z',
      validUntil: '2000-01-02T00:00:00.000Z'
    };
    const started = await game.startGame(undefined, { runMode: 'daily_signal', dailySignalContract: expired });
    return { started, scene: game.currentSceneName };
  });
  assert.equal(expiredDailyRejected.started, false, 'an expired captured Daily contract must be rejected instead of silently rolling to today');
  assert.equal(expiredDailyRejected.scene, 'menu');

  const beforeDaily = await storageSnapshot(page);
  await page.evaluate(() => {
    window.__game?.pendingAchievementToasts?.push?.({
      id: 'qa-stale-ranked-achievement',
      achievement: { id: 'qa-stale-ranked-achievement', name: 'First Ranked Run' }
    });
  });
  const menuDailyContract = (await readState(page)).menu?.launchDeck?.featuredDailySignal?.contract;
  await page.evaluate(() => window.__game?.scenes?.menu?.startDailySignalRun?.());
  const dailyPlay = await waitForScene(page, 'play');
  const firstDailyAttempt = await page.evaluate(() => ({
    attemptId: window.__game?.dailySignalAttemptId,
    contract: window.__game?.dailySignalContract,
    valid: window.__game?.dailySignalContractValidation?.valid === true,
    runTheme: window.__game?.contentDirector?.runTheme?.id || null,
    tacticalDraftEnabled: window.__game?.getRunModeProfile?.()?.tacticalDraftEnabled === true,
    reinforcementReasons: window.__game?.scenes?.play?.enemyManager?.getMayhemReinforcementEligibility?.()?.reasons || [],
    codexProbe: window.__game?.scenes?.play?.recordThreatDiscovery?.('daily_signal_qa_probe', 'enemies', { name: 'QA PROBE' }) || null
  }));
  assert.equal(dailyPlay.runMode, RUN_MODES.DAILY_SIGNAL);
  assert.equal(dailyPlay.scoreSubmissionAllowed, false);
  assert.equal(dailyPlay.selectedShipSpriteKey, menuDailyContract.loanerShipKey, 'Daily must use the fixed loaner even when it is not unlocked');
  assert.equal(firstDailyAttempt.valid, true);
  assert.ok(firstDailyAttempt.attemptId, 'Daily attempt must receive a stable ID before play starts');
  assert.equal(firstDailyAttempt.contract.rulesHash, menuDailyContract.rulesHash);
  assert.equal(firstDailyAttempt.runTheme, firstDailyAttempt.contract.runThemeId, 'Daily route theme must be pinned by the contract');
  assert.equal(firstDailyAttempt.tacticalDraftEnabled, true);
  assert.equal(firstDailyAttempt.reinforcementReasons.includes('not_mayhem'), false, 'Daily must keep reinforcement swarm eligibility');
  assert.equal(firstDailyAttempt.codexProbe?.skipped, 'daily_signal_no_codex_progress', 'Daily must not advance persistent Threat Codex state');
  assert.equal(dailyPlay.highscoreChase?.goalMode, 'daily_clear', 'Daily HUD must target the Sector 10 clear before a clear record exists');
  assert.equal(dailyPlay.highscoreChase?.targetSector, 10);
  const staleAchievementState = await page.evaluate(() => ({
    active: window.__game?.scenes?.play?.activeAchievementToast?.__achievementToastId || null,
    sceneQueued: window.__game?.scenes?.play?.achievementToastQueue?.length || 0,
    pending: (window.__game?.pendingAchievementToasts || []).map((entry) => entry?.id || null)
  }));
  assert.equal(staleAchievementState.active, null, 'stale ranked achievement toast must not appear during Daily');
  assert.equal(staleAchievementState.sceneQueued, 0, 'stale ranked achievement toast must not queue inside Daily');
  assert.equal(staleAchievementState.pending.includes('qa-stale-ranked-achievement'), true, 'blocked toast should remain deferred for a future ranked scene');
  await page.evaluate(() => {
    window.__game.pendingAchievementToasts = (window.__game.pendingAchievementToasts || [])
      .filter((entry) => entry?.id !== 'qa-stale-ranked-achievement');
  });
  await page.screenshot({ path: path.join(outputDir, 'daily-signal-loaner-play.png'), fullPage: false });

  await page.evaluate(() => {
    const game = window.__game;
    game.addScore(5000, 'baseScore');
    game.level = 4;
    const play = game?.scenes?.play;
    if (play) play.bossKills = 3;
    game.gameOver({ fromInterlude: true });
  });
  const failedDaily = await waitForScene(page, 'gameOver');
  assert.equal(failedDaily.runMode, RUN_MODES.DAILY_SIGNAL);
  assert.equal(failedDaily.gameOver?.level, 4, 'failed Daily must report the actual reached sector, not the Sector 10 finish target');
  assert.match(failedDaily.gameOver?.ceremonyTitle || '', /DAILY SIGNAL ENDED/i);
  assert.equal(failedDaily.gameOver?.leaderboardCta?.visible, false, 'Daily must not expose a public leaderboard CTA before deterministic online verification');
  assert.equal(failedDaily.gameOver?.primaryCta?.label, "RETRY TODAY'S SIGNAL");
  const failedDailyStorage = await storageSnapshot(page);
  const failedDailyRecords = Object.values(failedDailyStorage.dailySignalRecords.records || {});
  const failedDailyAttempts = Object.values(failedDailyStorage.dailySignalRecords.bestAttempts || {});
  const failedDailyClears = Object.values(failedDailyStorage.dailySignalRecords.bestClears || {});
  assert.equal(failedDailyRecords.length, 1);
  assert.equal(failedDailyAttempts.length, 1);
  assert.equal(failedDailyClears.length, 0);
  assert.equal(failedDailyRecords[0].sectorReached, 4);
  assert.equal(failedDailyRecords[0].runCleared, false);
  assert.match(failedDaily.gameOver?.leaderboardStatus || '', /NEW BEST ATTEMPT:\s*S4[^\n]*TIME\s+\d+:\d{2}/i, 'failed Daily result must expose the survival-time tie-break');
  assert.doesNotMatch(failedDaily.gameOver?.leaderboardStatus || '', /NEW DAILY SIGNAL BEST/i);
  assert.deepEqual(failedDailyStorage.hangar, beforeDaily.hangar, 'Daily must not update hangar career progress');
  assert.deepEqual(failedDailyStorage.achievements, beforeDaily.achievements, 'Daily must not unlock achievements');
  assert.deepEqual(failedDailyStorage.mockSteamLeaderboard, [], 'Daily must not submit to a Steam leaderboard');
  assert.deepEqual(
    summarizeThreatDiscoveryProgress(failedDailyStorage.threatDiscovery),
    summarizeThreatDiscoveryProgress(beforeDaily.threatDiscovery),
    'Daily must not discover or advance persistent Codex entries'
  );
  await page.screenshot({ path: path.join(outputDir, 'daily-signal-failed-sector-4.png'), fullPage: false });

  await page.evaluate(() => window.__game?.scenes?.gameOver?.openRunReport?.());
  await page.waitForTimeout(250);
  const failedDailyReport = await readState(page);
  assert.equal(failedDailyReport.gameOver?.runReportOverlay?.visible, true);
  assert.equal(failedDailyReport.gameOver?.runReportOverlay?.sectionIds?.includes('dailySignal'), true);
  assert.match(failedDailyReport.gameOver?.runReportOverlay?.text || '', /Valid attempts:[\s\S]*Best attempt:[^\n]*TIME\s+\d+:\d{2}[\s\S]*7-day flight log:/i, 'Daily Run Report must expose the failed-attempt survival-time tie-break');
  await page.screenshot({ path: path.join(outputDir, 'daily-signal-run-report.png'), fullPage: false });
  await page.evaluate(() => window.__game?.scenes?.gameOver?.closeRunReport?.());
  await page.waitForTimeout(150);

  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  const dailyRetry = await waitForScene(page, 'play');
  const retryIdentity = await page.evaluate(() => ({
    attemptId: window.__game?.dailySignalAttemptId,
    dailyKey: window.__game?.dailySignalContract?.dailyKey,
    rulesHash: window.__game?.dailySignalContract?.rulesHash
  }));
  assert.equal(dailyRetry.runMode, RUN_MODES.DAILY_SIGNAL);
  assert.equal(retryIdentity.dailyKey, firstDailyAttempt.contract.dailyKey, 'retry must preserve the captured UTC day');
  assert.equal(retryIdentity.rulesHash, firstDailyAttempt.contract.rulesHash, 'retry must preserve the exact rules contract');
  assert.notEqual(retryIdentity.attemptId, firstDailyAttempt.attemptId, 'retry must receive a fresh attempt ID');

  const dailyFinishStarted = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    game.addScore(50000, 'baseScore');
    game.level = 10;
    if (play) {
      play.bossKills = 10;
      play.gameTime = 90;
    }
    const started = play?.beginDailySignalFinish?.({ sectorCleared: 10 }) || false;
    const interlude = play?.overrunMilestoneInterlude;
    if (interlude) {
      interlude.confirmed = true;
      interlude.startedAt = Date.now() - interlude.durationMs - 20;
      if (interlude.effect) {
        interlude.effect.confirmed = true;
        interlude.effect.startedAt = Date.now() - interlude.effect.durationMs - 20;
      }
      play.updateOverrunMilestoneInterlude?.(16);
    }
    return started;
  });
  assert.equal(dailyFinishStarted, true, 'Sector 10 must enter the Daily clear presentation');
  const clearedDaily = await waitForScene(page, 'gameOver');
  assert.equal(clearedDaily.runMode, RUN_MODES.DAILY_SIGNAL);
  assert.equal(clearedDaily.gameOver?.level, 10);
  assert.match(clearedDaily.gameOver?.ceremonyTitle || '', /DAILY SIGNAL CLEARED/i);
  assert.equal(clearedDaily.gameOver?.leaderboardCta?.visible, false);
  const clearedDailySummary = await page.evaluate(() => ({
    summary: window.__game?.runSummary,
    report: window.__game?.lastRunReport
  }));
  assert.equal(clearedDailySummary.summary?.runCleared, true);
  assert.equal(clearedDailySummary.summary?.sectorReached, 10);
  assert.equal(clearedDailySummary.summary?.levelReached, 10);
  assert.equal(clearedDailySummary.summary?.dailySignalFinishSector, 10);
  assert.equal(clearedDailySummary.summary?.dailySignalContractValid, true);
  assert.equal(clearedDailySummary.summary?.dailySignalStored, true);
  assert.equal(clearedDailySummary.summary?.dailySignalNewClearBest, true);
  assert.equal(clearedDailySummary.summary?.dailySignalBestAttempt?.sectorReached, 4);
  assert.equal(clearedDailySummary.summary?.dailySignalBestClear?.runCleared, true);
  assert.equal(clearedDailySummary.summary?.dailySignalAttemptCount, 2);
  assert.equal(clearedDailySummary.summary?.dailySignalFlightLog?.clears, 1);
  assert.equal(clearedDailySummary.report?.summary?.dailySignal?.rulesHash, firstDailyAttempt.contract.rulesHash);
  assert.equal(clearedDailySummary.report?.summary?.dailySignal?.bestAttemptSector, 4);
  assert.equal(clearedDailySummary.report?.summary?.dailySignal?.attemptCount, 2);
  const clearedDailyStorage = await storageSnapshot(page);
  const clearedDailyRecords = Object.values(clearedDailyStorage.dailySignalRecords.records || {});
  const clearedDailyAttempts = Object.values(clearedDailyStorage.dailySignalRecords.bestAttempts || {});
  const clearedDailyClears = Object.values(clearedDailyStorage.dailySignalRecords.bestClears || {});
  assert.equal(clearedDailyRecords.length, 1);
  assert.equal(clearedDailyAttempts.length, 1);
  assert.equal(clearedDailyClears.length, 1);
  assert.equal(clearedDailyRecords[0].runCleared, true, 'a clear must outrank the earlier failed Daily attempt');
  assert.equal(clearedDailyRecords[0].sectorReached, 10);
  assert.deepEqual(clearedDailyStorage.hangar, beforeDaily.hangar);
  assert.deepEqual(clearedDailyStorage.achievements, beforeDaily.achievements);
  assert.deepEqual(clearedDailyStorage.mockSteamLeaderboard, []);
  assert.deepEqual(
    summarizeThreatDiscoveryProgress(clearedDailyStorage.threatDiscovery),
    summarizeThreatDiscoveryProgress(beforeDaily.threatDiscovery)
  );
  assert.match(clearedDaily.gameOver?.leaderboardStatus || '', /BEST CLEAR:[^\n]*TIME\s+\d+:/i, 'clear result must expose the completion-time tie-break');
  const unsavedDailyCopy = await page.evaluate(() => {
    const game = window.__game;
    const scene = game?.scenes?.gameOver;
    const original = game?.runSummary;
    const unsaved = {
      ...original,
      dailySignalBest: null,
      dailySignalBestAttempt: null,
      dailySignalBestClear: null,
      dailySignalNewBest: false,
      dailySignalNewAttemptBest: false,
      dailySignalNewClearBest: false,
      dailySignalRecordSaveFailed: true
    };
    game.runSummary = { ...unsaved, runCleared: false, sectorReached: 4, levelReached: 4 };
    const failed = scene?.getDailySignalResultLines?.().join('\n') || '';
    game.runSummary = { ...unsaved, runCleared: true, sectorReached: 10, levelReached: 10 };
    const cleared = scene?.getDailySignalResultLines?.().join('\n') || '';
    game.runSummary = original;
    return { failed, cleared };
  });
  assert.doesNotMatch(unsavedDailyCopy.failed, /BEST ATTEMPT|BEST CLEAR/i, 'an unsaved failed run must not be labeled as a stored best');
  assert.doesNotMatch(unsavedDailyCopy.cleared, /BEST ATTEMPT|BEST CLEAR/i, 'an unsaved clear must not be labeled as a stored best');
  assert.match(unsavedDailyCopy.failed, /THIS RUN:[\s\S]*SAVE FAILED/i);
  assert.match(unsavedDailyCopy.cleared, /THIS RUN:[\s\S]*SAVE FAILED/i);
  await page.screenshot({ path: path.join(outputDir, 'daily-signal-cleared-sector-10.png'), fullPage: false });

  await page.evaluate(() => window.__game?.showMenu?.());
  await waitForScene(page, 'menu');
  await page.evaluate(() => {
    const menu = window.__game?.scenes?.menu || window.__game?.currentScene;
    menu?.setMenuFocusByButton?.(menu?.dailySignalBtn);
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').menu?.missionBriefing?.mode === 'dailySignal', null, { timeout: 15000 });
  const clearedDailyMenu = await readState(page);
  assert.match(clearedDailyMenu.menu?.missionBriefing?.personalBest || '', /BEST[\s\S]*CLEARED[\s\S]*1:30/i, 'stored clear compact record must expose the time tie-break');
  await page.screenshot({ path: path.join(outputDir, 'menu-daily-signal-cleared.png'), fullPage: false });
  await page.evaluate(() => window.__game?.scenes?.menu?.startDailySignalRun?.());
  const improveDaily = await waitForScene(page, 'play');
  assert.equal(improveDaily.runMode, RUN_MODES.DAILY_SIGNAL);
  assert.equal(improveDaily.highscoreChase?.goalMode, 'score', 'after the first clear, Daily HUD should switch to the best-clear score chase');
  assert.equal(improveDaily.highscoreChase?.hasDailyClear, true);
  assert.equal(improveDaily.highscoreChase?.targetScore, clearedDailySummary.summary?.dailySignalBestClear?.score);
  assert.equal(improveDaily.highscoreChase?.targetTimeSeconds, clearedDailySummary.summary?.dailySignalBestClear?.runElapsedSeconds);
  const tieBreakState = await page.evaluate(() => {
    const game = window.__game;
    const hud = game?.scenes?.play?.hud;
    game.score = Math.max(0, Number(game.highscoreChase?.targetScore) || 0);
    hud?.updateHighscoreChase?.();
    return {
      target: hud?.highscoreChaseTarget?.text || '',
      gap: hud?.highscoreChaseGap?.text || ''
    };
  });
  assert.match(tieBreakState.target, /BEAT/i);
  assert.match(tieBreakState.gap, /=\s*[\d,]+.*TIME\s*</i, 'equal-score Daily clears must expose the faster-time tie-break');
  await page.screenshot({ path: path.join(outputDir, 'daily-signal-tie-break-hud.png'), fullPage: false });
  const scoreReadyState = await page.evaluate(() => {
    const game = window.__game;
    const hud = game?.scenes?.play?.hud;
    game.score = Math.max(1, Number(game.highscoreChase?.targetScore) || 0) + 250;
    hud?.updateHighscoreChase?.();
    return {
      title: hud?.highscoreChaseTitle?.text || '',
      target: hud?.highscoreChaseTarget?.text || '',
      gap: hud?.highscoreChaseGap?.text || '',
      personalBestCelebration: Boolean(game?.scenes?.play?.personalBestCelebration)
    };
  });
  assert.match(scoreReadyState.title, /BEST CLEAR/i);
  assert.match(scoreReadyState.target, /BEAT/i);
  assert.match(scoreReadyState.gap, /SCORE READY.*CLEAR SECTOR 10/i, 'beating the score early must still require the contract clear');
  assert.equal(scoreReadyState.personalBestCelebration, false, 'Daily must not announce a best clear before Sector 10 is completed');
  await page.screenshot({ path: path.join(outputDir, 'daily-signal-best-clear-hud.png'), fullPage: false });

  const beforeScout = await storageSnapshot(page);
  await page.evaluate(() => window.__game.startGame(undefined, { runMode: 'scout' }));
  const scoutPlay = await waitForScene(page, 'play');
  assert.equal(scoutPlay.runMode, RUN_MODES.SCOUT);
  assert.equal(scoutPlay.scoutAnomaly?.id, 'calibration');
  assert.equal(scoutPlay.runModeProfile?.difficultyProfileId, 'scout_lower_pressure_v1:calibration');
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
  const scoutShipKey = getShipUsageKey(scoutPlay.selectedShipSpriteKey);
  const expectedScoutUsage = {
    ...beforeScout.shipUsage,
    [scoutShipKey]: (Number(beforeScout.shipUsage?.[scoutShipKey]) || 0) + 1
  };
  assert.deepEqual(afterScout.shipUsage, expectedScoutUsage, 'a valid Scout launch must increment the selected ship once');
  assert.equal(
    afterScout.shipUsageTotal,
    String((Number(beforeScout.shipUsageTotal) || 0) + 1),
    'a valid Scout launch must increment total ship usage once'
  );
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

  await seedProfile(page);
  await page.evaluate(() => {
    localStorage.setItem('nova.highSectorPrototype.v1', JSON.stringify({ enabled: true, quickStart: true }));
    return window.__game.startGame(undefined, { runMode: 'ranked_tactical' });
  });
  const prototypePlay = await waitForScene(page, 'play');
  const prototypeRuntime = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    return {
      level: game?.level,
      startSector: game?.runStartSector,
      runMode: game?.runMode,
      runModeReason: game?.runModeReason,
      isDebugRun: game?.isDebugRun,
      prototype: game?.highSectorPrototypeRun || null,
      escalationProfile: game?.highSectorEscalationProfile || null,
      baselineIds: play?.overrunBaselineAugmentIds || [],
      playerAugmentIds: play?.player?.runAugmentIds || [],
      leaderboardAllowed: game?.isScoreSubmissionAllowed?.(),
      achievementAllowed: game?.canUnlockAchievementsForCurrentRun?.(),
      careerAllowed: game?.canUpdateCareerProgressForCurrentRun?.()
    };
  });
  assert.equal(prototypePlay.runMode, RUN_MODES.MAYHEM_TACTICAL);
  assert.equal(prototypeRuntime.level, 75);
  assert.equal(prototypeRuntime.startSector, 75);
  assert.equal(prototypeRuntime.isDebugRun, true);
  assert.equal(prototypeRuntime.runModeReason, 'high_sector_prototype_quick_start');
  assert.equal(prototypeRuntime.prototype?.enabled, true);
  assert.equal(prototypeRuntime.prototype?.quickStart, true);
  assert.equal(prototypeRuntime.escalationProfile?.armed, true);
  assert.equal(prototypeRuntime.escalationProfile?.source, 'settings_prototype');
  assert.deepEqual(prototypeRuntime.baselineIds, OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS);
  assert.deepEqual(prototypeRuntime.playerAugmentIds, OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS);
  assert.equal(prototypeRuntime.leaderboardAllowed, false);
  assert.equal(prototypeRuntime.achievementAllowed, false);
  assert.equal(prototypeRuntime.careerAllowed, false);
  await page.screenshot({ path: path.join(outputDir, 'high-sector-prototype-quick-start-75.png'), fullPage: false });

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
    dailySignal: {
      dailyKey: firstDailyAttempt.contract.dailyKey,
      rulesHash: firstDailyAttempt.contract.rulesHash,
      loanerShipKey: firstDailyAttempt.contract.loanerShipKey,
      failedSectorReported: failedDaily.gameOver?.level,
      clearSectorReported: clearedDaily.gameOver?.level,
      localOnly: true,
      retryPreservedContract: retryIdentity.rulesHash === firstDailyAttempt.contract.rulesHash
    },
    sectorRun: {
      checkpoint: sectorPlay.sectorStartChallenge?.checkpoint,
      playSector: sectorPlay.level,
      achievements: sectorPlay.runModeProfile?.unlocksAchievements,
      resultExplained: /NO ACHIEVEMENTS/i.test(sectorResultText)
    },
    highSectorPrototype: {
      enabled: prototypeRuntime.prototype?.enabled,
      quickStart: prototypeRuntime.prototype?.quickStart,
      startSector: prototypeRuntime.startSector,
      unranked: prototypeRuntime.isDebugRun,
      baselineIds: prototypeRuntime.baselineIds
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
