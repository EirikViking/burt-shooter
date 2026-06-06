import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4390));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/result-screen-flow-${timestamp()}`);
const badSteamTerms = /Steamboard|Steam Board|Steam board/i;

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
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function makeLocalScores(count, topScore, step = 1000) {
  return Array.from({ length: count }, (_, index) => ({
    name: `LOCAL${String(index + 1).padStart(2, '0')}`,
    score: topScore - index * step,
    level: 9,
    rankIndex: 6,
    timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    source: 'result_screen_seed'
  }));
}

async function openScenarioPage(browser, consoleEvents) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }));
  await page.addInitScript(() => {
    window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
    window.__novaMockSteamPersonaName = 'STEAM ACE';
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'STEAM ACE');
  });
  await page.goto(`${baseUrl}/?mockSteamLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game && window.render_game_to_text), null, { timeout: 15000 });
  return page;
}

async function runSteamGameOver(page, {
  score,
  level,
  rankIndex,
  localScores,
  steamScores,
  hangarProgress,
  runSummary
}, { autoContinue = true } = {}) {
  await page.evaluate((scenario) => {
    localStorage.setItem('novaSwarm.localLeaderboard.v2', JSON.stringify(scenario.localScores));
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify(scenario.steamScores));
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'STEAM ACE');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(scenario.hangarProgress));
    localStorage.removeItem('burt.shipUnlockProgress.v1');
    localStorage.removeItem('nova.threatDiscovery.v1');
    window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
    window.__novaMockSteamPersonaName = 'STEAM ACE';
    const game = window.__game;
    game.lastLeaderboardResult = {
      score: 999999,
      globalStatus: 'submitted',
      steamStatus: 'submitted',
      steamRank: 1,
      globalRank: 1,
      globalPlacement: { placement: 1, qualified: true, numberOne: true, top3: true },
      submissionId: 'stale-result-screen-proof'
    };
    game.runSummary = {
      ...(scenario.runSummary || {}),
      levelReached: scenario.level,
      sectorReached: scenario.level,
      pilotXpGained: scenario.runSummary?.pilotXpGained ?? 0,
      runElapsedSeconds: scenario.runSummary?.runElapsedSeconds ?? 0
    };
    game.score = scenario.score;
    game.level = scenario.level;
    game.rankIndex = scenario.rankIndex;
    game.lives = 0;
    game.switchScene('gameOver');
  }, { score, level, rankIndex, localScores, steamScores, hangarProgress, runSummary });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' &&
      state.gameOver?.state === 'submitted_hold' &&
      state.gameOver?.lastLeaderboardResult?.steamStatus === 'submitted';
  }, null, { timeout: 12000 });

  await page.evaluate(() => {
    const scene = window.__game?.scenes?.gameOver;
    if (!scene) return;
    scene.submittedHoldContinueReadyAt = 0;
    scene.continueInputArmedAt = 0;
    scene.achievementToastQueue = [];
    scene.removeAchievementToast?.({ showNext: false });
    scene.refreshPrimaryCta?.();
    scene.layoutScreen?.();
  });
  if (!autoContinue) {
    await page.waitForTimeout(100);
    return;
  }
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.state === 'runback';
  }, null, { timeout: 5000 });
  await page.waitForTimeout(100);
}

async function continueToRunback(page) {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.state === 'runback';
  }, null, { timeout: 5000 });
  await page.waitForTimeout(100);
}

async function readScenario(page) {
  return page.evaluate(() => {
    const scene = window.__game?.scenes?.gameOver;
    const isVisible = (node) => {
      let cursor = node;
      while (cursor) {
        if (cursor.visible === false || cursor.alpha === 0) return false;
        cursor = cursor.parent;
      }
      return true;
    };
    const boundsFor = (node, id) => {
      if (!node || !isVisible(node)) return null;
      let bounds = null;
      try {
        bounds = node.getBounds?.();
      } catch {
        bounds = null;
      }
      const width = Number(bounds?.width ?? node.width) || 0;
      const height = Number(bounds?.height ?? node.height) || 0;
      const left = Number(bounds?.x ?? ((Number(node.x) || 0) - width * (Number(node.anchor?.x) || 0))) || 0;
      const top = Number(bounds?.y ?? ((Number(node.y) || 0) - height * (Number(node.anchor?.y) || 0))) || 0;
      if (width <= 1 || height <= 1) return null;
      return {
        id,
        text: String(node.text || ''),
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height
      };
    };
    const nodes = [
      boundsFor(scene?.title, 'title'),
      boundsFor(scene?.scoreText, 'score'),
      boundsFor(scene?.levelText, 'run-summary'),
      boundsFor(scene?.unlockText, 'progress'),
      boundsFor(scene?.rankProgressText, 'rank-progress'),
      boundsFor(scene?.shipUnlockProgressText, 'ship-progress'),
      boundsFor(scene?.nextGoalText, 'next-goal'),
      boundsFor(scene?.comment, 'leaderboard'),
      boundsFor(scene?.leaderboardStatusText, 'status'),
      boundsFor(scene?.ceremonyMedal, 'celebration-medal'),
      boundsFor(scene?.promptText, 'prompt'),
      boundsFor(scene?.retryButton, 'one-more-run-button'),
      boundsFor(scene?.leaderboardButton, 'leaderboard-button'),
      boundsFor(scene?.hangarButton, 'hangar-button'),
      boundsFor(scene?.nameDisplay, 'name-input'),
      boundsFor(scene?.instructions, 'instructions')
    ].filter(Boolean);
    const decorations = [
      boundsFor(scene?.ceremonyFrame, 'celebration-frame'),
      boundsFor(scene?.runSectionBg, 'run-summary-card'),
      boundsFor(scene?.rankProgressBg, 'rank-progress-card'),
      boundsFor(scene?.shipUnlockProgressBg, 'ship-progress-card'),
      boundsFor(scene?.nextGoalGroup, 'next-goal-card'),
      boundsFor(scene?.leaderboardStatusBg, 'status-card')
    ].filter(Boolean);
    const visibleTexts = [];
    const walk = (node) => {
      if (!node || !isVisible(node)) return;
      if (typeof node.text === 'string' && node.text.trim()) visibleTexts.push(node.text);
      for (const child of node.children || []) walk(child);
    };
    walk(scene?.container);
    return {
      state: JSON.parse(window.render_game_to_text?.() || '{}'),
      nodes,
      decorations,
      visibleText: visibleTexts.join('\n')
    };
  });
}

function findOverlaps(nodes) {
  const overlaps = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 2 && overlapY > 2) overlaps.push({ a: a.id, b: b.id, overlapX, overlapY });
    }
  }
  return overlaps;
}

function assertNoOverlaps(snapshot, label) {
  const overlaps = findOverlaps(snapshot.nodes);
  if (overlaps.length > 0) {
    throw new Error(`${label} has overlapping result-screen objects: ${JSON.stringify(overlaps, null, 2)}\n${snapshot.visibleText}`);
  }
}

function assertNoBadSteamTerms(text, label) {
  if (badSteamTerms.test(text)) {
    throw new Error(`${label} still contains forbidden Steam-board copy:\n${text}`);
  }
}

function assertNoRetainedHoldOrSummaryText(text, label) {
  const forbidden = /SCORE SUBMITTED|PLACEMENT READY|LEADERBOARDS|LOCAL BOARD|GLOBAL BOARD|STEAM BOARD|CAREER XP|BEST SECTOR/i;
  if (forbidden.test(text)) {
    throw new Error(`${label} retained old hold/status/full-summary text:\n${text}`);
  }
}

function assertProgressCopy(snapshot, label) {
  if (!/(NEXT SHIP UNLOCK|SHIP UNLOCKED|SHIPS UNLOCKED|ALL SHIPS UNLOCKED)/i.test(snapshot.visibleText)) {
    throw new Error(`${label} did not show ship unlock or next-unlock progress:\n${snapshot.visibleText}`);
  }
}

function getNode(snapshot, id) {
  return snapshot.nodes.find((node) => node.id === id) || null;
}

function getDecoration(snapshot, id) {
  return snapshot.decorations?.find((node) => node.id === id) || null;
}

function getBox(snapshot, id) {
  return getNode(snapshot, id) || getDecoration(snapshot, id);
}

function assertVerticalGap(snapshot, topId, bottomId, minGap, label) {
  const top = getBox(snapshot, topId);
  const bottom = getBox(snapshot, bottomId);
  if (!top || !bottom) return;
  const gap = bottom.top - top.bottom;
  if (gap < minGap) {
    throw new Error(`${label} gap ${topId}->${bottomId} was ${Math.round(gap)}px, expected at least ${minGap}px:\n${snapshot.visibleText}`);
  }
}

function hasNode(snapshot, id) {
  return Boolean(getNode(snapshot, id));
}

function objectsOverlap(a, b, margin = 0) {
  if (!a || !b) return false;
  return !(
    a.right + margin <= b.left ||
    b.right + margin <= a.left ||
    a.bottom + margin <= b.top ||
    b.bottom + margin <= a.top
  );
}

function assertCelebrationReadable(snapshot, label) {
  const medal = getNode(snapshot, 'celebration-medal');
  if (!medal) {
    throw new Error(`${label} did not show a visible Top Three/#1 celebration medal:\n${snapshot.visibleText}`);
  }
  ['title', 'score', 'status', 'run-summary', 'rank-progress', 'ship-progress', 'leaderboard', 'next-goal', 'one-more-run-button']
    .forEach((id) => {
      const node = getNode(snapshot, id);
      if (node && objectsOverlap(medal, node, 10)) {
        throw new Error(`${label} celebration medal competed with ${id}: ${JSON.stringify({ medal, node }, null, 2)}\n${snapshot.visibleText}`);
      }
    });
}

function assertFrameSpacing(snapshot, label) {
  [
    ['run-summary-card', 'rank-progress-card', 10],
    ['rank-progress-card', 'ship-progress-card', 10],
    ['ship-progress-card', 'leaderboard', 10],
    ['leaderboard', 'next-goal-card', 12],
    ['next-goal-card', 'one-more-run-button', 28]
  ].forEach(([topId, bottomId, minGap]) => {
    assertVerticalGap(snapshot, topId, bottomId, minGap, label);
  });

  const frame = getDecoration(snapshot, 'celebration-frame');
  if (!frame) return;
  if (snapshot.state?.gameOver?.state !== 'runback') return;
  ['one-more-run-button', 'leaderboard-button', 'hangar-button', 'celebration-medal'].forEach((id) => {
    const node = getNode(snapshot, id);
    if (node && objectsOverlap(frame, node, 8)) {
      throw new Error(`${label} frame overlapped ${id}: ${JSON.stringify({ frame, node }, null, 2)}\n${snapshot.visibleText}`);
    }
  });
}

function assertResultSpacing(snapshot, label) {
  assertVerticalGap(snapshot, 'title', 'status', 24, label);
  assertVerticalGap(snapshot, 'status', 'one-more-run-button', 20, label);
  assertVerticalGap(snapshot, 'score', 'run-summary', 14, label);
  if (hasNode(snapshot, 'rank-progress') || hasNode(snapshot, 'ship-progress')) {
    assertVerticalGap(snapshot, 'run-summary', 'rank-progress', 12, label);
    assertVerticalGap(snapshot, 'rank-progress', 'ship-progress', 10, label);
    assertVerticalGap(snapshot, 'ship-progress', 'leaderboard', 12, label);
  } else {
    assertVerticalGap(snapshot, 'run-summary', 'progress', 8, label);
    assertVerticalGap(snapshot, 'progress', 'leaderboard', 8, label);
  }
  assertVerticalGap(snapshot, 'leaderboard', 'next-goal', 10, label);
  assertVerticalGap(snapshot, 'next-goal', 'one-more-run-button', 30, label);
  assertFrameSpacing(snapshot, label);
}

function assertGoodRun(snapshot) {
  const text = snapshot.visibleText;
  assertNoBadSteamTerms(text, 'Good run');
  assertNoRetainedHoldOrSummaryText(text, 'Good run');
  assertProgressCopy(snapshot, 'Good run');
  if (!/(Steam|New Steam best): #2/i.test(text)) {
    throw new Error(`Good run did not show concise Steam rank #2:\n${text}`);
  }
  if (!/Steam Global Leaderboard #2/i.test(text)) {
    throw new Error(`Good run did not show the rank-specific Steam global heading:\n${text}`);
  }
  if (!/Local: #13/i.test(text)) {
    throw new Error(`Good run did not show local rank #13:\n${text}`);
  }
  if (/Steam:\s*Rank #2\s*-\s*Top Three|Steam Board Rank #2 - Top Three|TOP THREE/i.test(text)) {
    throw new Error(`Good run repeated Top Three wording in the rank-2 result flow:\n${text}`);
  }
  if (!/Next rank:/i.test(text) || !/XP to next:/i.test(text)) {
    throw new Error(`Good run did not show next rank and XP-to-next:\n${text}`);
  }
}

function assertLowRun(snapshot) {
  const text = snapshot.visibleText;
  assertNoBadSteamTerms(text, 'Low-score run');
  assertNoRetainedHoldOrSummaryText(text, 'Low-score run');
  assertProgressCopy(snapshot, 'Low-score run');
  if (!/Steam: Best unchanged/i.test(text)) {
    throw new Error(`Low-score run did not show Steam best unchanged:\n${text}`);
  }
  if (!/Best: 87,628/i.test(text) || !/This run: 2,084/i.test(text)) {
    throw new Error(`Low-score run did not compare old Steam best and this run:\n${text}`);
  }
  if (!/Local: Not in local top 20/i.test(text)) {
    throw new Error(`Low-score run did not hide outside-visible local rank:\n${text}`);
  }
  if (/rank pending|Steam score submitted|Local #44/i.test(text)) {
    throw new Error(`Low-score run retained misleading final status:\n${text}`);
  }
  if (!/Next rank:/i.test(text) || !/XP to next:/i.test(text)) {
    throw new Error(`Low-score run did not show next rank and XP-to-next:\n${text}`);
  }
}

function assertNumberOneRun(snapshot) {
  const text = snapshot.visibleText;
  assertNoBadSteamTerms(text, 'Number-one run');
  assertNoRetainedHoldOrSummaryText(text, 'Number-one run');
  assertProgressCopy(snapshot, 'Number-one run');
  if (!/NUMBER ONE/i.test(text) || !/#1/i.test(text)) {
    throw new Error(`Number-one run did not show an obvious #1 celebration:\n${text}`);
  }
  if (/TOP THREE/i.test(text)) {
    throw new Error(`Number-one run used redundant Top Three wording:\n${text}`);
  }
}

async function assertRelayoutStable(page, label) {
  const viewports = [
    { width: 1600, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 }
  ];
  let snapshot = null;
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.__game?.scenes?.gameOver?.layoutScreen?.();
    });
    await page.waitForTimeout(120);
    snapshot = await readScenario(page);
    const labelWithSize = `${label} ${viewport.width}x${viewport.height}`;
    assertNoOverlaps(snapshot, `${labelWithSize} after resize/focus`);
    assertResultSpacing(snapshot, labelWithSize);
  }
  return snapshot;
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;

try {
  server = await startPreviewServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const consoleEvents = [];

  const goodPage = await openScenarioPage(browser, consoleEvents);
  await runSteamGameOver(goodPage, {
    score: 25286,
    level: 8,
    rankIndex: 10,
    localScores: makeLocalScores(19, 37000, 1000),
    steamScores: [
      { playerName: 'ORBIT PAL', score: 40000, level: 9, source: 'steam' },
      { playerName: 'STEAM ACE', name: 'STEAM ACE', score: 22000, level: 7, isCurrentPlayer: true, source: 'steam' },
      { playerName: 'RIFT PAL', score: 18000, level: 6, source: 'steam' }
    ],
    hangarProgress: {
      version: 1,
      pilotXp: 85000,
      pilotRank: 15,
      bestScore: 20000,
      bestSector: 8,
      bestLevel: 8
    },
    runSummary: { runElapsedSeconds: 367, pilotXpGained: 1490 }
  }, { autoContinue: false });
  const goodHold = await readScenario(goodPage);
  assertNoBadSteamTerms(goodHold.visibleText, 'Good run hold');
  assertNoOverlaps(goodHold, 'Good run hold render');
  assertResultSpacing(goodHold, 'Good run hold render');
  assertCelebrationReadable(goodHold, 'Good run hold render');
  await goodPage.screenshot({ path: path.join(outputDir, 'good-run-status-rank2.png'), fullPage: true });
  await continueToRunback(goodPage);
  const goodInitial = await readScenario(goodPage);
  assertGoodRun(goodInitial);
  assertNoOverlaps(goodInitial, 'Good run initial render');
  assertResultSpacing(goodInitial, 'Good run initial render');
  assertCelebrationReadable(goodInitial, 'Good run initial render');
  const goodAfterRelayout = await assertRelayoutStable(goodPage, 'Good run');
  await goodPage.screenshot({ path: path.join(outputDir, 'good-run-rank2.png'), fullPage: true });
  await goodPage.close();

  const numberOnePage = await openScenarioPage(browser, consoleEvents);
  await runSteamGameOver(numberOnePage, {
    score: 61286,
    level: 10,
    rankIndex: 12,
    localScores: makeLocalScores(19, 57000, 1000),
    steamScores: [
      { playerName: 'ORBIT PAL', score: 52000, level: 9, source: 'steam' },
      { playerName: 'STEAM ACE', name: 'STEAM ACE', score: 22000, level: 7, isCurrentPlayer: true, source: 'steam' },
      { playerName: 'RIFT PAL', score: 18000, level: 6, source: 'steam' }
    ],
    hangarProgress: {
      version: 1,
      unlockTuningVersion: 3,
      pilotXp: 85000,
      pilotRank: 15,
      totalRuns: 9,
      bestScore: 52000,
      bestSector: 10,
      bestLevel: 10,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_02', 'nova_ship_04', 'nova_ship_05', 'nova_ship_08']
    },
    runSummary: { runElapsedSeconds: 511, pilotXpGained: 1890 }
  }, { autoContinue: false });
  const numberOneHold = await readScenario(numberOnePage);
  assertNoBadSteamTerms(numberOneHold.visibleText, 'Number-one hold');
  assertNoOverlaps(numberOneHold, 'Number-one hold render');
  assertResultSpacing(numberOneHold, 'Number-one hold render');
  assertCelebrationReadable(numberOneHold, 'Number-one hold render');
  await numberOnePage.screenshot({ path: path.join(outputDir, 'great-run-status-number1.png'), fullPage: true });
  await continueToRunback(numberOnePage);
  const numberOneInitial = await readScenario(numberOnePage);
  assertNumberOneRun(numberOneInitial);
  assertNoOverlaps(numberOneInitial, 'Number-one initial render');
  assertResultSpacing(numberOneInitial, 'Number-one initial render');
  assertCelebrationReadable(numberOneInitial, 'Number-one initial render');
  const numberOneAfterRelayout = await assertRelayoutStable(numberOnePage, 'Number-one');
  await numberOnePage.screenshot({ path: path.join(outputDir, 'great-run-number1.png'), fullPage: true });
  await numberOnePage.close();

  const lowPage = await openScenarioPage(browser, consoleEvents);
  await runSteamGameOver(lowPage, {
    // Low score with previous Steam best: 87,628 and this run: 2,084.
    score: 2084,
    level: 2,
    rankIndex: 1,
    localScores: makeLocalScores(43, 50000, 100),
    steamScores: [
      { playerName: 'STEAM ACE', name: 'STEAM ACE', score: 87628, level: 12, isCurrentPlayer: true, source: 'steam' },
      { playerName: 'ORBIT PAL', score: 28000, level: 7, source: 'steam' },
      { playerName: 'RIFT PAL', score: 24000, level: 6, source: 'steam' }
    ],
    hangarProgress: {
      version: 1,
      pilotXp: 84300,
      pilotRank: 15,
      bestScore: 87628,
      bestSector: 10,
      bestLevel: 10
    },
    runSummary: { runElapsedSeconds: 31, pilotXpGained: 25 }
  });
  const lowInitial = await readScenario(lowPage);
  assertLowRun(lowInitial);
  assertNoOverlaps(lowInitial, 'Low-score initial render');
  assertResultSpacing(lowInitial, 'Low-score initial render');
  const lowAfterRelayout = await assertRelayoutStable(lowPage, 'Low-score');
  await lowPage.screenshot({ path: path.join(outputDir, 'low-score-best-unchanged.png'), fullPage: true });
  await lowPage.close();

  const report = {
    status: 'passed',
    baseUrl,
    outputDir,
    goodHold,
    goodInitial,
    goodAfterRelayout,
    numberOneHold,
    numberOneInitial,
    numberOneAfterRelayout,
    lowInitial,
    lowAfterRelayout,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (consoleEvents.some((event) => event.type === 'pageerror')) {
    throw new Error(`Page errors during result-flow check: ${JSON.stringify(consoleEvents, null, 2)}`);
  }
  console.log(`[result-screen-flow] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[result-screen-flow] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
