import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4652));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/sector-continue-controller-flow-${timestamp()}`);

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
  throw new Error(`No available sector continue controller check port found starting at ${startPort}`);
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

function makeProgress({ bestSector = 17, bestLevel = bestSector, pilotXp = 2200, bestScore = 11111 } = {}) {
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

async function waitForState(page, predicate, label, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await readState(page);
    if (predicate(latest)) return latest;
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify({
    scene: latest?.scene,
    focus: latest?.menu?.focusedOption,
    sectorStart: latest?.menu?.sectorStart,
    runMode: latest?.runMode,
    level: latest?.level
  })}`);
}

async function setGamepad(page, { buttons = [], axes = [0, 0], connected = true } = {}) {
  await page.evaluate(({ buttons: pressedButtons, axes: nextAxes, connected: nextConnected }) => {
    const buttonState = Array.from({ length: 17 }, (_, index) => {
      const pressed = pressedButtons.includes(index);
      return { pressed, value: pressed ? 1 : 0 };
    });
    window.__burtGamepadOverride = {
      id: 'sector-continue-controller-test-pad',
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
  await page.waitForTimeout(160);
}

async function loadProfile(page, progress) {
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
  await setGamepad(page);
  return waitForState(page, (state) => state.scene === 'menu' && state.menu?.focusedOption === 'launchTactical', 'menu Tactical focus', 30000);
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
  const menu = await loadProfile(page, makeProgress());
  assert.equal(menu.menu?.sectorStart?.available, true);
  assert.deepEqual(menu.menu?.sectorStart?.checkpoints, [5, 10, 15]);
  assert.equal(menu.menu?.sectorStart?.selectedCheckpoint, 15);
  assert.equal(menu.menu?.sectorStart?.buttonText, 'SECTOR RUN', 'menu card should keep its stable run-mode label');
  assert.equal(menu.menu?.sectorStart?.buttonVisualText, 'SECTOR RUN', 'rendered menu card should match the run-mode label');

  for (let index = 0; index < 4; index += 1) await tapButton(page, 13);
  const focused = await waitForState(page, (state) => state.menu?.focusedOption === 'sectorStart', 'sector start focused by D-pad down');
  assert.equal(focused.menu?.sectorStart?.selectedCheckpoint, 15);
  assert.equal(focused.menu?.sectorStart?.arrowCueVisible, false, 'run-mode card should defer checkpoint switching to the selector');
  assert.match(focused.menu?.sectorStart?.primaryHintText || '', /A: CONFIRM/, 'controller hint should explain how to open the selector');

  await tapButton(page, 12);
  const returnedToScout = await waitForState(page, (state) => state.menu?.focusedOption === 'scout', 'controller can move back out of sector start focus');
  assert.equal(returnedToScout.menu?.sectorStart?.selectedCheckpoint, 15);

  await tapButton(page, 13);
  await waitForState(page, (state) => state.menu?.focusedOption === 'sectorStart', 'sector start refocused before launch');

  await tapButton(page, 0);
  const selector = await waitForState(
    page,
    (state) => state.menu?.sectorStart?.selector?.open === true,
    'sector selector opened by controller'
  );
  assert.equal(selector.menu?.sectorStart?.selector?.selectedSector, 15);
  assert.equal(selector.menu?.sectorStart?.selector?.selectedUnlocked, true);
  assert.equal(selector.menu?.sectorStart?.selector?.launchLabel, 'LAUNCH SECTOR 15');

  await tapButton(page, 14);
  const cycledLeft = await waitForState(
    page,
    (state) => state.menu?.sectorStart?.selector?.selectedSector === 10,
    'sector selector checkpoint cycled left'
  );

  await tapButton(page, 15);
  const cycledRight = await waitForState(
    page,
    (state) => state.menu?.sectorStart?.selector?.selectedSector === 15,
    'sector selector checkpoint cycled right'
  );
  assert.equal(cycledRight.menu?.sectorStart?.selector?.selectedUnlocked, true);

  await tapButton(page, 0);
  const play = await waitForState(page, (state) => state.scene === 'play' && state.runMode === 'sector_start', 'sector start launched by controller', 30000);
  assert.equal(play.level, 15);
  assert.equal(play.runModeReason, 'sector_start_checkpoint');
  assert.equal(play.scoreSubmissionAllowed, false);
  assert.equal(play.maintainerDevtools?.enabled, false);
  assert.equal(play.debugTools?.levelJumpAvailable, false);

  const screenshot = path.join(outputDir, 'sector-continue-controller-flow.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  Object.assign(report, {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    focus: focused.menu?.focusedOption,
    checkpoints: focused.menu?.sectorStart?.checkpoints,
    arrowCueVisible: focused.menu?.sectorStart?.arrowCueVisible,
    cycledLeft: cycledLeft.menu?.sectorStart?.selector?.selectedSector,
    cycledRight: cycledRight.menu?.sectorStart?.selector?.selectedSector,
    returnedFocus: returnedToScout.menu?.focusedOption,
    selector: {
      selectedSector: selector.menu?.sectorStart?.selector?.selectedSector,
      launchLabel: selector.menu?.sectorStart?.selector?.launchLabel
    },
    launched: {
      runMode: play.runMode,
      level: play.level,
      scoreSubmissionAllowed: play.scoreSubmissionAllowed
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
    console.log(`[sector-continue-controller-flow] PASS checkpoint=${play.level} report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
