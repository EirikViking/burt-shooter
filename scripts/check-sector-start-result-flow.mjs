import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4653));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/sector-start-result-flow-${timestamp()}`);

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
  throw new Error(`No available sector start result-flow port found starting at ${startPort}`);
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

function makeProgress({ bestSector = 21, bestLevel = bestSector, pilotXp = 2600, bestScore = 22222 } = {}) {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp,
    pilotRank: 2,
    highestPilotRank: 2,
    totalRuns: 5,
    bestScore,
    bestSector,
    bestLevel,
    bestRank: 2,
    bestRunTimeSeconds: 360,
    survivedSeconds: 360,
    totalBossesDefeated: 5,
    totalWavesCleared: 30,
    totalCodexDiscoveries: 9,
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

async function waitForState(page, predicate, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await readState(page);
    if (predicate(latest)) return latest;
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify({
    scene: latest?.scene,
    runMode: latest?.runMode,
    level: latest?.level,
    gameOver: latest?.gameOver
  })}`);
}

async function loadProfile(page, progress = makeProgress()) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  await page.evaluate((nextProgress) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
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
  }, progress);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  return waitForState(page, (state) => state.scene === 'menu', 'menu scene', 30000);
}

async function clickMenuButton(page, buttonKey) {
  const state = await readState(page);
  const button = state.menu?.items?.[buttonKey];
  assert.ok(button?.width > 0 && button?.height > 0, `Missing menu button bounds for ${buttonKey}`);
  await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
}

async function clickGameOverCta(page, key) {
  const state = await readState(page);
  const cta = state.gameOver?.[key];
  assert.ok(cta?.visible && cta?.width > 0 && cta?.height > 0, `Missing visible game-over CTA ${key}: ${JSON.stringify(cta)}`);
  await page.mouse.click(cta.x + cta.width / 2, cta.y + cta.height / 2);
}

async function finishChallenge(page, score = 1683) {
  await page.evaluate((nextScore) => {
    const game = window.__game;
    game.score = nextScore;
    game.finalizeRunProgression?.();
    game.gameOver({ fromInterlude: true });
  }, score);
  return waitForState(page, (state) => state.scene === 'gameOver' && state.runMode === 'sector_start', 'sector start game over', 30000);
}

async function setGamepad(page, { buttons = [], axes = [0, 0], connected = true } = {}) {
  await page.evaluate(({ buttons: pressedButtons, axes: nextAxes, connected: nextConnected }) => {
    const buttonState = Array.from({ length: 17 }, (_, index) => {
      const pressed = pressedButtons.includes(index);
      return { pressed, value: pressed ? 1 : 0 };
    });
    window.__burtGamepadOverride = {
      id: 'sector-start-result-flow-pad',
      index: 0,
      connected: nextConnected,
      axes: nextAxes,
      buttons: buttonState
    };
  }, { buttons, axes, connected });
}

async function tapButton(page, button, holdMs = 140) {
  await setGamepad(page, { buttons: [button] });
  await page.waitForTimeout(holdMs);
  await setGamepad(page);
  await page.waitForTimeout(180);
}

mkdirSync(outputDir, { recursive: true });

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
  outputDir
};

try {
  const menu = await loadProfile(page);
  assert.match(menu.menu?.sectorStart?.buttonText || '', /SECTOR 20 CHALLENGE/);
  await clickMenuButton(page, 'sectorStartButton');
  const play = await waitForState(page, (state) => state.scene === 'play' && state.runMode === 'sector_start', 'sector start play');
  assert.equal(play.level, 21);
  assert.equal(play.sectorStartChallenge?.checkpoint, 20);
  assert.equal(play.sectorStartChallenge?.playSector, 21);
  assert.equal(play.score, 0);
  const gameOver = await finishChallenge(page, 1683);
  const comment = gameOver.gameOver?.ceremonyComment || '';
  assert.match(comment, /NEW SECTOR 20 BEST: 1,683/);
  assert.match(comment, /REACHED SECTOR 21/);
  assert.match(comment, /UNRANKED CHALLENGE \| MAIN LEADERBOARD OFF/);
  assert.doesNotMatch(comment, /->/);
  assert.equal(gameOver.gameOver?.mainMenuCta?.visible, true);
  assert.equal(gameOver.gameOver?.mainMenuCta?.label, 'BACK TO MAIN MENU');
  assert.equal(gameOver.gameOver?.hangarCta?.visible, true);
  assert.equal(gameOver.gameOver?.leaderboardCta?.visible, false);
  assert.equal(gameOver.gameOver?.primaryCta?.label, 'ONE MORE RUN');
  assert.match(gameOver.gameOver?.retryPrompt || '', /MAIN MENU/);

  await clickGameOverCta(page, 'retryCta');
  const retryPlay = await waitForState(page, (state) => state.scene === 'play' && state.runMode === 'sector_start', 'one more run sector start');
  assert.equal(retryPlay.level, 21, 'One More Run should restart the same Sector Start Challenge checkpoint at its play sector');
  assert.equal(retryPlay.sectorStartChallenge?.checkpoint, 20);
  assert.equal(retryPlay.sectorStartChallenge?.playSector, 21);

  await finishChallenge(page, 100);
  await clickGameOverCta(page, 'mainMenuCta');
  const backToMenu = await waitForState(page, (state) => state.scene === 'menu', 'mouse main menu return');
  assert.equal(backToMenu.menu?.sectorStart?.selectedCheckpoint, 20);
  assert.match(backToMenu.menu?.sectorStart?.buttonText || '', /BEST 1,683/);

  await clickMenuButton(page, 'sectorStartButton');
  await waitForState(page, (state) => state.scene === 'play' && state.runMode === 'sector_start', 'sector restart for controller menu');
  await finishChallenge(page, 150);
  await setGamepad(page);
  await tapButton(page, 1);
  await waitForState(page, (state) => state.scene === 'menu', 'controller B returns to main menu');

  await clickMenuButton(page, 'sectorStartButton');
  await waitForState(page, (state) => state.scene === 'play' && state.runMode === 'sector_start', 'sector restart for controller hangar');
  await finishChallenge(page, 160);
  await setGamepad(page);
  await tapButton(page, 2);
  await waitForState(page, (state) => state.scene === 'shipSelect', 'controller X opens hangar');

  await loadProfile(page, makeProgress({ bestSector: 20 }));
  await clickMenuButton(page, 'launchButton');
  const rankedPlay = await waitForState(page, (state) => state.scene === 'play' && state.runMode === 'ranked', 'ranked start');
  assert.equal(rankedPlay.level, 1);
  assert.equal(rankedPlay.scoreSubmissionAllowed, true);
  await page.evaluate(() => {
    const game = window.__game;
    game.score = 500;
    game.gameOver({ fromInterlude: true });
  });
  const rankedGameOver = await waitForState(page, (state) => state.scene === 'gameOver' && state.runMode === 'ranked', 'ranked game over');
  assert.equal(rankedGameOver.gameOver?.mainMenuCta?.visible, false, 'ranked result flow should not gain Sector Start Main Menu CTA');
  assert.equal(rankedGameOver.scoreSubmissionAllowed, true);

  const screenshot = path.join(outputDir, 'sector-start-result-flow.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  Object.assign(report, {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    sectorStart: {
      resultComment: comment,
      mainMenuCta: gameOver.gameOver?.mainMenuCta,
      hangarCta: gameOver.gameOver?.hangarCta,
      leaderboardCta: gameOver.gameOver?.leaderboardCta,
      oneMoreRunLevel: retryPlay.level,
      menuRecordLabel: backToMenu.menu?.sectorStart?.buttonText
    },
    ranked: {
      runMode: rankedGameOver.runMode,
      mainMenuCta: rankedGameOver.gameOver?.mainMenuCta,
      scoreSubmissionAllowed: rankedGameOver.scoreSubmissionAllowed
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
    console.log(`[sector-start-result-flow] PASS report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
