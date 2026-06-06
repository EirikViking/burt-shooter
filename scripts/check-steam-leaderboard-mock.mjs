import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4370));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/steam-leaderboard-mock-${timestamp()}`);

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

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

async function waitForGame(page) {
  await page.waitForFunction(() => Boolean(window.__game && window.render_game_to_text), null, { timeout: 15000 });
}

async function state(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;

try {
  server = await startPreviewServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome()
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleEvents = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }));
  await page.addInitScript(() => {
    window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
    window.__novaMockSteamPersonaName = 'STEAM ACE';
  });
  await page.goto(`${baseUrl}/?mockSteamLeaderboard=1`, { waitUntil: 'domcontentloaded' });
  await waitForGame(page);
  await page.evaluate(() => {
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'STEAM ACE');
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify([
      { playerName: 'STEAM ACE', score: 22000, level: 7, isCurrentPlayer: true, source: 'steam' },
      { playerName: 'ORBIT PAL', score: 18000, level: 6, source: 'steam' },
      { playerName: 'RIFT PAL', score: 14000, level: 5, source: 'steam' }
    ]));
    window.__game.leaderboardView = 'global';
    window.__game.switchScene('highscore');
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'highscore' && state.highscore?.status === 'LOADED';
  }, null, { timeout: 12000 });
  const globalState = await state(page);
  if (globalState.highscore?.tabs?.join(',') !== 'global,friends,local') {
    throw new Error(`Steam tabs missing: ${globalState.highscore?.tabs}`);
  }
  if (globalState.highscore?.sourceLabel !== 'Steam Global') {
    throw new Error(`Expected Steam Global source, got ${globalState.highscore?.sourceLabel}`);
  }

  await page.evaluate(() => window.__game.scenes.highscore.setLeaderboardView('friends'));
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.highscore?.activeLeaderboard === 'friends' && state.highscore?.status === 'LOADED';
  }, null, { timeout: 12000 });
  const friendsState = await state(page);
  if (friendsState.highscore?.sourceLabel !== 'Steam Friends') {
    throw new Error(`Expected Steam Friends source, got ${friendsState.highscore?.sourceLabel}`);
  }
  await page.screenshot({ path: path.join(outputDir, 'steam-friends-tab.png'), fullPage: true });

  await page.evaluate(() => {
    window.__game.score = 33333;
    window.__game.level = 8;
    window.__game.rankIndex = 10;
    window.__game.switchScene('gameOver');
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'gameOver' &&
      state.gameOver?.state === 'submitted_hold' &&
      state.gameOver?.lastLeaderboardResult?.steamStatus === 'submitted';
  }, null, { timeout: 12000 });
  const steamSubmittedState = await state(page);
  if (!steamSubmittedState.gameOver?.steamSubmissionMode) throw new Error('Game over did not enter Steam submission mode');
  if (steamSubmittedState.gameOver?.canEnterName) throw new Error('Steam submission should not require manual name entry');
  if (/PILOT NAME|TYPE NAME|ENTER PILOT|SUBMIT SCORE/i.test(`${steamSubmittedState.gameOver?.prompt || ''} ${steamSubmittedState.gameOver?.primaryCta?.label || ''} ${steamSubmittedState.gameOver?.primaryCta?.hint || ''}`)) {
    throw new Error(`Steam auto-submit flow exposed manual submit copy: ${JSON.stringify(steamSubmittedState.gameOver)}`);
  }
  if (steamSubmittedState.gameOver?.lastLeaderboardResult?.steamStatus !== 'submitted') {
    throw new Error(`Steam mock submission failed: ${JSON.stringify(steamSubmittedState.gameOver?.lastLeaderboardResult)}`);
  }
  if (steamSubmittedState.gameOver?.lastLeaderboardResult?.name !== 'STEAM ACE') {
    throw new Error(`Steam mock submission did not use Steam persona: ${JSON.stringify(steamSubmittedState.gameOver?.lastLeaderboardResult)}`);
  }
  if (steamSubmittedState.gameOver?.state === 'input' || steamSubmittedState.gameOver?.canEnterName) {
    throw new Error(`Steam mock exposed manual name entry: ${JSON.stringify(steamSubmittedState.gameOver)}`);
  }
  const submittedHoldStatus = steamSubmittedState.gameOver?.leaderboardStatus || '';
  if (/Steamboard|Steam Board|Steam board|LEADERBOARDS|LOCAL BOARD|GLOBAL BOARD/i.test(submittedHoldStatus)) {
    throw new Error(`Steam hold status reused full or stale leaderboard copy: ${JSON.stringify(steamSubmittedState.gameOver)}`);
  }
  if (!/(Steam|New Steam best): #1/i.test(submittedHoldStatus)) {
    throw new Error(`Steam mock did not report exact global placement: ${JSON.stringify(steamSubmittedState.gameOver)}`);
  }
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'gameOver' &&
      state.gameOver?.state === 'submitted_hold' &&
      state.gameOver?.submittedHoldReady === true;
  }, null, { timeout: 8000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'gameOver' && state.gameOver?.state === 'runback';
  }, null, { timeout: 5000 });
  const gameOverState = await state(page);
  const finalStatus = gameOverState.gameOver?.leaderboardStatus || '';
  if (!/Local: #\d+/i.test(finalStatus)) {
    throw new Error(`Final runback did not report exact local placement: ${JSON.stringify(gameOverState.gameOver)}`);
  }
  if (!/(Steam|New Steam best): #1/i.test(finalStatus)) {
    throw new Error(`Final runback did not report exact Steam placement: ${JSON.stringify(gameOverState.gameOver)}`);
  }
  if (/Steamboard|Steam Board|Steam board|Rank #1 - Top Three|Top Three/i.test(finalStatus)) {
    throw new Error(`Final runback reused stale Steam leaderboard copy: ${JSON.stringify(gameOverState.gameOver)}`);
  }
  const mockScoresAfterSubmit = await page.evaluate(() => JSON.parse(localStorage.getItem('novaSwarm.mockSteamLeaderboard.v1') || '[]'));
  if (!mockScoresAfterSubmit.some((entry) => entry.playerName === 'STEAM ACE' && entry.score === 33333 && entry.level === 8)) {
    throw new Error(`Steam mock submission did not preserve level 8: ${JSON.stringify(mockScoresAfterSubmit)}`);
  }
  await page.evaluate(() => {
    const localScores = Array.from({ length: 43 }, (_, index) => ({
      name: `LOCAL${String(index + 1).padStart(2, '0')}`,
      score: 50000 - index * 100,
      level: 8,
      rankIndex: 10,
      timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      source: 'local_seed'
    }));
    localStorage.setItem('novaSwarm.localLeaderboard.v2', JSON.stringify(localScores));
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify([
      { playerName: 'STEAM ACE', name: 'STEAM ACE', score: 87628, level: 12, isCurrentPlayer: true, source: 'steam' },
      { playerName: 'ORBIT PAL', score: 28000, level: 7, source: 'steam' },
      { playerName: 'RIFT PAL', score: 24000, level: 6, source: 'steam' }
    ]));
    window.__game.lastLeaderboardResult = {
      score: 33333,
      globalStatus: 'submitted',
      steamStatus: 'submitted',
      steamRank: 1,
      globalRank: 1,
      globalPlacement: { placement: 1, qualified: true, numberOne: true, top3: true },
      globalPlacementTier: 'number1',
      submissionId: 'stale-top-three'
    };
    window.__game.score = 2084;
    window.__game.level = 2;
    window.__game.rankIndex = 1;
    window.__game.switchScene('gameOver');
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'gameOver' &&
      state.gameOver?.state === 'submitted_hold' &&
      state.gameOver?.lastLeaderboardResult?.steamStatus === 'submitted';
  }, null, { timeout: 12000 });
  const lowScoreState = await state(page);
  const lowStatus = lowScoreState.gameOver?.leaderboardStatus || '';
  if (lowScoreState.gameOver?.globalStatus !== 'steam_best_unchanged') {
    throw new Error(`Low Steam score should be marked best unchanged: ${JSON.stringify(lowScoreState.gameOver)}`);
  }
  if (!lowScoreState.gameOver?.lastLeaderboardResult?.steamBestUnchanged || lowScoreState.gameOver?.lastLeaderboardResult?.steamPreviousBestScore !== 87628) {
    throw new Error(`Low Steam score did not preserve previous-best diagnostics: ${JSON.stringify(lowScoreState.gameOver?.lastLeaderboardResult)}`);
  }
  if (!/Steam: Best unchanged/i.test(lowStatus) || !/Best: 87,628/i.test(lowStatus) || !/This run: 2,084/i.test(lowStatus)) {
    throw new Error(`Low Steam score did not explain unchanged Steam best: ${JSON.stringify(lowScoreState.gameOver)}`);
  }
  if (/rank pending|top three|number one|Steam: #|New Steam best|Global: #/i.test(lowStatus)) {
    throw new Error(`Low Steam score reused stale or misleading rank copy: ${JSON.stringify(lowScoreState.gameOver)}`);
  }
  if (/Local:|LEADERBOARDS|LOCAL BOARD|GLOBAL BOARD|Steamboard|Steam Board|Steam board/i.test(lowStatus)) {
    throw new Error(`Low Steam hold status reused full or stale leaderboard copy: ${JSON.stringify(lowScoreState.gameOver)}`);
  }
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'gameOver' &&
      state.gameOver?.state === 'submitted_hold' &&
      state.gameOver?.submittedHoldReady === true;
  }, null, { timeout: 8000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'gameOver' && state.gameOver?.state === 'runback';
  }, null, { timeout: 5000 });
  const lowRunbackState = await state(page);
  const lowFinalStatus = lowRunbackState.gameOver?.leaderboardStatus || '';
  if (!/Steam: Best unchanged/i.test(lowFinalStatus) || !/Best: 87,628/i.test(lowFinalStatus) || !/This run: 2,084/i.test(lowFinalStatus)) {
    throw new Error(`Final low-score runback did not explain unchanged Steam best: ${JSON.stringify(lowRunbackState.gameOver)}`);
  }
  if (!/Local: Not in local top 20/i.test(lowFinalStatus) || /Local #44|Local: #4[0-9]/i.test(lowFinalStatus)) {
    throw new Error(`Final low-score runback should not show an outside-visible local placement: ${JSON.stringify(lowRunbackState.gameOver)}`);
  }
  if (/rank pending|top three|number one|Steam: #|New Steam best|Global: #|Steamboard|Steam Board|Steam board/i.test(lowFinalStatus)) {
    throw new Error(`Final low-score runback reused stale or misleading rank copy: ${JSON.stringify(lowRunbackState.gameOver)}`);
  }
  const mockScoresAfterLowScore = await page.evaluate(() => JSON.parse(localStorage.getItem('novaSwarm.mockSteamLeaderboard.v1') || '[]'));
  if (!mockScoresAfterLowScore.some((entry) => entry.isCurrentPlayer && entry.score === 87628)) {
    throw new Error(`Steam mock keep-best score was overwritten by low score: ${JSON.stringify(mockScoresAfterLowScore)}`);
  }
  const rank3Probe = await page.evaluate(async () => {
    const scene = window.__game?.scenes?.gameOver;
    if (!scene) throw new Error('Missing GameOver scene for rank-3 placement probe');
    scene.isRankedRun = true;
    if (scene.game) {
      scene.game.runMode = 'ranked';
      scene.game.isDebugRun = false;
    }
    scene.finalScore = 31000;
    scene.globalStatus = 'submitted';
    scene.globalQualified = false;
    scene.globalPlacement = null;
    scene.globalPlacementTier = 'none';
    scene.qualificationFanfarePlayed = true;
    scene.previousSteamBestScore = 0;
    scene.steamBestUnchanged = false;
    const result = { globalStatus: 'submitted', globalProvider: 'steam', steamRank: 3 };
    const placement = await scene.confirmGlobalLeaderboardAchievements(result);
    return {
      placement,
      tier: scene.globalPlacementTier,
      status: scene.getLeaderboardStatusMessage?.() || '',
      runbackTitle: scene.getRunbackTitle?.() || ''
    };
  });
  if (
    !rank3Probe.placement?.top3 ||
    rank3Probe.tier !== 'top3' ||
    rank3Probe.runbackTitle !== 'Steam Global Leaderboard #3' ||
    /Top Three/i.test(`${rank3Probe.status} ${rank3Probe.runbackTitle}`)
  ) {
    throw new Error(`Steam rank 3 should get rank-specific global leaderboard celebration copy: ${JSON.stringify(rank3Probe)}`);
  }
  const rank4Probe = await page.evaluate(async () => {
    const scene = window.__game?.scenes?.gameOver;
    if (!scene) throw new Error('Missing GameOver scene for rank-4 placement probe');
    scene.isRankedRun = true;
    if (scene.game) {
      scene.game.runMode = 'ranked';
      scene.game.isDebugRun = false;
    }
    scene.finalScore = 30000;
    scene.globalStatus = 'submitted';
    scene.globalQualified = true;
    scene.globalPlacement = null;
    scene.globalPlacementTier = 'none';
    scene.qualificationFanfarePlayed = true;
    scene.previousSteamBestScore = 0;
    scene.steamBestUnchanged = false;
    const result = { globalStatus: 'submitted', globalProvider: 'steam', steamRank: 4 };
    const placement = await scene.confirmGlobalLeaderboardAchievements(result);
    return {
      placement,
      tier: scene.globalPlacementTier,
      status: scene.getLeaderboardStatusMessage?.() || '',
      runbackTitle: scene.getRunbackTitle?.() || ''
    };
  });
  if (
    rank4Probe.placement?.top3 ||
    rank4Probe.placement?.numberOne ||
    rank4Probe.tier === 'top3' ||
    /TOP THREE|Steam Global Leaderboard #4/i.test(`${rank4Probe.status} ${rank4Probe.runbackTitle}`)
  ) {
    throw new Error(`Steam rank 4 was incorrectly treated as Top Three: ${JSON.stringify(rank4Probe)}`);
  }
  if (rank4Probe.placement?.placement !== 4 || rank4Probe.tier !== 'global') {
    throw new Error(`Steam rank 4 should be a global placement only: ${JSON.stringify(rank4Probe)}`);
  }
  const missingRankProbe = await page.evaluate(async () => {
    const scene = window.__game?.scenes?.gameOver;
    if (!scene) throw new Error('Missing GameOver scene for missing-rank placement probe');
    scene.isRankedRun = true;
    if (scene.game) {
      scene.game.runMode = 'ranked';
      scene.game.isDebugRun = false;
    }
    scene.finalScore = 28000;
    scene.globalStatus = 'submitted';
    scene.globalQualified = true;
    scene.globalPlacement = { score: 28000, placement: 2, qualified: true, top3: true, numberOne: false, source: 'stale_probe' };
    scene.globalPlacementTier = 'top3';
    scene.qualificationFanfarePlayed = true;
    scene.previousSteamBestScore = 0;
    scene.steamBestUnchanged = false;
    const result = { globalStatus: 'submitted', globalProvider: 'steam', steamRank: null };
    const placement = await scene.confirmGlobalLeaderboardAchievements(result);
    return {
      placement,
      result,
      qualified: scene.globalQualified,
      tier: scene.globalPlacementTier,
      status: scene.getLeaderboardStatusMessage?.() || '',
      runbackTitle: scene.getRunbackTitle?.() || ''
    };
  });
  if (
    missingRankProbe.placement?.qualified ||
    missingRankProbe.qualified ||
    missingRankProbe.tier !== 'none' ||
    /TOP THREE|NUMBER ONE/i.test(`${missingRankProbe.status} ${missingRankProbe.runbackTitle}`) ||
    !/Steam: Score submitted/i.test(missingRankProbe.status)
  ) {
    throw new Error(`Missing Steam rank should clear stale Top Three placement without final rank pending copy: ${JSON.stringify(missingRankProbe)}`);
  }
  await page.screenshot({ path: path.join(outputDir, 'steam-gameover-runback.png'), fullPage: true });

  const report = {
    status: 'passed',
    baseUrl,
    outputDir,
    tabs: globalState.highscore.tabs,
    friendsRows: friendsState.highscore.rows.length,
    steamSubmittedHold: steamSubmittedState.gameOver.lastLeaderboardResult,
    steamGameOver: gameOverState.gameOver.lastLeaderboardResult,
    rank3Probe,
    rank4Probe,
    missingRankProbe,
    lowScoreState: lowScoreState.gameOver,
    lowRunbackState: lowRunbackState.gameOver,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[steam-leaderboard-mock] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[steam-leaderboard-mock] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
