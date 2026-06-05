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
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
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
}) {
  await page.evaluate((scenario) => {
    localStorage.setItem('novaSwarm.localLeaderboard.v2', JSON.stringify(scenario.localScores));
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify(scenario.steamScores));
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'STEAM ACE');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(scenario.hangarProgress));
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
    scene.refreshPrimaryCta?.();
    scene.layoutScreen?.();
  });
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
      boundsFor(scene?.nextGoalText, 'next-goal'),
      boundsFor(scene?.comment, 'leaderboard'),
      boundsFor(scene?.leaderboardStatusText, 'status'),
      boundsFor(scene?.promptText, 'prompt'),
      boundsFor(scene?.retryButton, 'one-more-run-button'),
      boundsFor(scene?.leaderboardButton, 'leaderboard-button'),
      boundsFor(scene?.hangarButton, 'hangar-button'),
      boundsFor(scene?.nameDisplay, 'name-input'),
      boundsFor(scene?.instructions, 'instructions')
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
  const forbidden = /SCORE SUBMITTED|PLACEMENT READY|LEADERBOARDS|LOCAL BOARD|GLOBAL BOARD|STEAM BOARD|CAREER XP|BEST SECTOR|NEXT SHIP|HANGAR COMPLETE/i;
  if (forbidden.test(text)) {
    throw new Error(`${label} retained old hold/status/full-summary text:\n${text}`);
  }
}

function assertGoodRun(snapshot) {
  const text = snapshot.visibleText;
  assertNoBadSteamTerms(text, 'Good run');
  assertNoRetainedHoldOrSummaryText(text, 'Good run');
  if (!/(Steam|New Steam best): #2/i.test(text)) {
    throw new Error(`Good run did not show concise Steam rank #2:\n${text}`);
  }
  if (!/Local: #13/i.test(text)) {
    throw new Error(`Good run did not show local rank #13:\n${text}`);
  }
  if (/Steam:\s*Rank #2\s*-\s*Top Three|Steam Board Rank #2 - Top Three/i.test(text)) {
    throw new Error(`Good run repeated Top Three on the Steam rank line:\n${text}`);
  }
  if (!/Next rank:/i.test(text) || !/XP to next:/i.test(text)) {
    throw new Error(`Good run did not show next rank and XP-to-next:\n${text}`);
  }
}

function assertLowRun(snapshot) {
  const text = snapshot.visibleText;
  assertNoBadSteamTerms(text, 'Low-score run');
  assertNoRetainedHoldOrSummaryText(text, 'Low-score run');
  if (!/Steam: Best unchanged/i.test(text)) {
    throw new Error(`Low-score run did not show Steam best unchanged:\n${text}`);
  }
  if (!/Best: 35,923/i.test(text) || !/This run: 254/i.test(text)) {
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

async function assertRelayoutStable(page, label) {
  await page.setViewportSize({ width: 1919, height: 1079 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.__game?.scenes?.gameOver?.layoutScreen?.();
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('focus'));
    window.__game?.scenes?.gameOver?.layoutScreen?.();
  });
  await page.waitForTimeout(120);
  const snapshot = await readScenario(page);
  assertNoOverlaps(snapshot, `${label} after resize/focus`);
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
  });
  const goodInitial = await readScenario(goodPage);
  assertGoodRun(goodInitial);
  assertNoOverlaps(goodInitial, 'Good run initial render');
  const goodAfterRelayout = await assertRelayoutStable(goodPage, 'Good run');
  await goodPage.screenshot({ path: path.join(outputDir, 'good-run-rank2.png'), fullPage: true });
  await goodPage.close();

  const lowPage = await openScenarioPage(browser, consoleEvents);
  await runSteamGameOver(lowPage, {
    // Low score with previous Steam best: 35,923 and this run: 254.
    score: 254,
    level: 2,
    rankIndex: 1,
    localScores: makeLocalScores(43, 50000, 100),
    steamScores: [
      { playerName: 'STEAM ACE', name: 'STEAM ACE', score: 35923, level: 9, isCurrentPlayer: true, source: 'steam' },
      { playerName: 'ORBIT PAL', score: 28000, level: 7, source: 'steam' },
      { playerName: 'RIFT PAL', score: 24000, level: 6, source: 'steam' }
    ],
    hangarProgress: {
      version: 1,
      pilotXp: 84300,
      pilotRank: 15,
      bestScore: 35923,
      bestSector: 10,
      bestLevel: 10
    },
    runSummary: { runElapsedSeconds: 31, pilotXpGained: 25 }
  });
  const lowInitial = await readScenario(lowPage);
  assertLowRun(lowInitial);
  assertNoOverlaps(lowInitial, 'Low-score initial render');
  const lowAfterRelayout = await assertRelayoutStable(lowPage, 'Low-score');
  await lowPage.screenshot({ path: path.join(outputDir, 'low-score-best-unchanged.png'), fullPage: true });
  await lowPage.close();

  const report = {
    status: 'passed',
    baseUrl,
    outputDir,
    goodInitial,
    goodAfterRelayout,
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
