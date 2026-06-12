import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4654));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/sector-start-menu-layout-${timestamp()}`);

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
  throw new Error(`No available sector start menu-layout port found starting at ${startPort}`);
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

function makeProgress() {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 6800,
    pilotRank: 5,
    highestPilotRank: 5,
    totalRuns: 12,
    bestScore: 987654321,
    bestSector: 101,
    bestLevel: 101,
    bestRank: 5,
    bestRunTimeSeconds: 1200,
    survivedSeconds: 1200,
    totalBossesDefeated: 40,
    totalWavesCleared: 240,
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
    updatedAt: '2026-06-08T00:00:00.000Z'
  };
}

function challengeRecords() {
  return {
    version: 1,
    updatedAt: '2026-06-08T00:00:00.000Z',
    byCheckpoint: {
      5: { startSector: 5, scoreEarned: 900, highestSectorReached: 6, finalSector: 6, shipId: 'nova_ship_01', shipName: 'Nova Sparrow', completedAt: '2026-06-08T00:00:00.000Z' },
      20: { startSector: 20, scoreEarned: 1683, highestSectorReached: 22, finalSector: 22, shipId: 'nova_ship_01', shipName: 'Nova Sparrow', completedAt: '2026-06-08T00:00:00.000Z' },
      100: { startSector: 100, scoreEarned: 987654321, highestSectorReached: 103, finalSector: 103, shipId: 'nova_ship_01', shipName: 'Nova Sparrow', completedAt: '2026-06-08T00:00:00.000Z' }
    }
  };
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForGame(page) {
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), { timeout: 30000 });
}

async function waitForMenu(page) {
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', { timeout: 30000 });
  return readState(page);
}

async function loadProfile(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  await page.evaluate(({ progress, records }) => {
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
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  return waitForMenu(page);
}

async function selectCheckpoint(page, checkpoint) {
  await page.evaluate((targetCheckpoint) => {
    const menu = window.__game?.scenes?.menu;
    if (!menu) return;
    menu.refreshSectorStartState?.();
    const checkpoints = menu.sectorStartState?.checkpoints || [];
    const index = checkpoints.indexOf(targetCheckpoint);
    if (index < 0) throw new Error(`Missing checkpoint ${targetCheckpoint}`);
    menu.selectedSectorStartIndex = index;
    menu.sectorStartState = {
      ...menu.sectorStartState,
      selectedCheckpoint: checkpoints[index]
    };
    menu.updateSectorStartButton?.({ forceGpuRefresh: true });
    menu.layoutMenu?.({ forceLabelGpuRefresh: true });
  }, checkpoint);
  await page.waitForFunction((targetCheckpoint) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.menu?.sectorStart?.selectedCheckpoint === targetCheckpoint;
  }, checkpoint, { timeout: 8000 });
  return readState(page);
}

function assertNoMenuOverlap(state, label) {
  const sector = state.menu?.sectorStart || {};
  const button = sector.buttonBounds || state.menu?.items?.sectorStartButton;
  const labelBounds = sector.labelBounds;
  const launch = state.menu?.items?.launchButton;
  const explainer = state.menu?.items?.runModeExplainer;
  const explainerText = sector.runModeExplainerText || '';
  const configuredWidth = Number(sector.buttonConfiguredWidth) || button?.width || 0;
  const configuredHeight = Number(sector.buttonConfiguredHeight) || button?.height || 0;
  const hangar = state.menu?.items?.hangarButton;
  assert.match(explainerText, /LAUNCH RUN|RANKED RUN:/, `${label}: missing launch/ranked run explainer`);
  assert.match(explainerText, /SECTOR START:/, `${label}: missing sector start explainer`);
  assert.match(explainerText, /leaderboard/i, `${label}: explainer should mention leaderboard behavior`);
  assert.match(explainerText, /checkpoint/i, `${label}: explainer should mention checkpoint practice`);
  assert.ok(explainer?.width > 0 && explainer?.height > 0, `${label}: missing run mode explainer bounds`);
  if (launch?.height > 0) {
    assert.ok(explainer.bottom <= launch.y + 1, `${label}: run mode explainer overlaps Launch Run button`);
  }
  assert.ok(button?.width > 0 && button?.height > 0, `${label}: missing Sector Start button bounds`);
  assert.ok(labelBounds?.width > 0 && labelBounds?.height > 0, `${label}: missing Sector Start label bounds`);
  assert.ok(labelBounds.width <= configuredWidth - 12, `${label}: label too wide for button ${JSON.stringify({ labelBounds, configuredWidth, button })}`);
  assert.ok(labelBounds.height <= configuredHeight - 2, `${label}: label too tall for button ${JSON.stringify({ labelBounds, configuredHeight, button })}`);
  assert.ok(Number(sector.labelScale) >= 0.74, `${label}: label scale too small (${sector.labelScale})`);
  assert.equal(sector.arrowCueVisible, true, `${label}: missing checkpoint switch arrows`);
  assert.ok((sector.arrowCueBounds?.width || 0) > 0, `${label}: checkpoint switch arrows have no visible bounds`);
  assert.ok((sector.arrowCueBounds?.height || 0) > 0, `${label}: checkpoint switch arrows have no visible height`);
  if (hangar?.height > 0) {
    assert.ok(button.y + button.height <= hangar.y + 1, `${label}: Sector Start button overlaps Hangar button`);
  }
  assert.doesNotMatch(sector.buttonText || '', /SECTOR START CHALLENGE:/, `${label}: old cramped challenge label returned`);
  assert.doesNotMatch(sector.buttonText || '', /</, `${label}: old selector arrow label returned`);
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
  outputDir,
  cases: []
};

try {
  const viewports = [
    { width: 1366, height: 768, name: 'desktop' },
    { width: 1024, height: 768, name: 'tablet' },
    { width: 390, height: 844, name: 'mobile' }
  ];
  const checkpoints = [5, 10, 20, 100];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loadProfile(page);
    for (const checkpoint of checkpoints) {
      const state = await selectCheckpoint(page, checkpoint);
      const text = state.menu?.sectorStart?.buttonText || '';
      assert.match(text, new RegExp(`SECTOR ${checkpoint} CHALLENGE`), `${viewport.name} sector ${checkpoint}: bad label ${text}`);
      if (checkpoint === 10) {
        assert.doesNotMatch(text, /BEST/, `${viewport.name} sector 10 should handle no-record label`);
      } else {
        assert.match(text, /BEST/, `${viewport.name} sector ${checkpoint} should show record label`);
      }
      assertNoMenuOverlap(state, `${viewport.name} sector ${checkpoint}`);
      report.cases.push({
        viewport,
        checkpoint,
        text,
        buttonBounds: state.menu?.sectorStart?.buttonBounds,
        buttonConfiguredWidth: state.menu?.sectorStart?.buttonConfiguredWidth,
        buttonConfiguredHeight: state.menu?.sectorStart?.buttonConfiguredHeight,
        labelBounds: state.menu?.sectorStart?.labelBounds,
        labelScale: state.menu?.sectorStart?.labelScale,
        arrowCueBounds: state.menu?.sectorStart?.arrowCueBounds
      });
    }
    const screenshot = path.join(outputDir, `sector-start-menu-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    report.cases.push({ viewport, screenshot });
  }

  Object.assign(report, {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    pageErrors,
    consoleErrors
  });
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[sector-start-menu-layout] PASS cases=${report.cases.length} report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
