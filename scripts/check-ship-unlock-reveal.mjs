import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4395));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ship-unlock-reveal-${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  if (fs.existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
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

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function baseHangarProgress(overrides = {}) {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 0,
    pilotRank: 0,
    totalRuns: 0,
    bestScore: 0,
    bestSector: 1,
    bestLevel: 1,
    totalBossesDefeated: 0,
    totalWavesCleared: 0,
    totalCodexDiscoveries: 0,
    noHitWaves: 0,
    unlockedShipIds: ['nova_ship_01'],
    ...overrides
  };
}

async function preparePage(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/highscores', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, id: 1 }) });
      return;
    }
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([]) });
  });
  await page.addInitScript((progress) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.removeItem('burt.shipUnlockProgress.v1');
    localStorage.removeItem('nova.threatDiscovery.v1');
  }, scenario.previousProgress);
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  return { page, pageErrors };
}

async function forceGameOver(page, finalLevel, finalScore = finalLevel * 5000, runStats = {}) {
  await page.evaluate(({ level, score, runStats }) => {
    const game = window.__game;
    const play = game.scenes?.play;
    if (play) {
      if (runStats.bossKills !== undefined) play.bossKills = runStats.bossKills;
      if (runStats.wavesCleared !== undefined) play.wavesCleared = runStats.wavesCleared;
    }
    game.score = score;
    game.level = level;
    game.rankIndex = Math.max(0, level - 1);
    game.gameOver();
  }, { level: finalLevel, score: finalScore, runStats });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.shipUnlocks?.visible === true;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(1000);
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function runScenario(browser, scenario) {
  const { page, pageErrors } = await preparePage(browser, scenario);
  const state = await forceGameOver(page, scenario.finalLevel, scenario.finalScore, scenario.runStats);
  const unlocks = state.gameOver?.shipUnlocks || {};
  assert(unlocks.count === scenario.expectedCount, `${scenario.name}: expected ${scenario.expectedCount} unlock(s), got ${unlocks.count}`);
  assert(unlocks.visible === true, `${scenario.name}: unlock reveal was not visible`);
  assert(unlocks.voiceKey === scenario.expectedVoiceKey, `${scenario.name}: expected voice ${scenario.expectedVoiceKey}, got ${unlocks.voiceKey}`);
  assert(unlocks.voicePlayed === true, `${scenario.name}: unlock voice did not trigger`);
  assert(String(state.gameOver?.unlockSummary || '').includes(scenario.expectedSummary), `${scenario.name}: unexpected summary ${state.gameOver?.unlockSummary}`);
  assert(String(state.gameOver?.unlockSummary || '').includes('VISIT THE HANGAR'), `${scenario.name}: hangar CTA missing`);
  assert(pageErrors.length === 0, `${scenario.name}: page errors: ${pageErrors.join('; ')}`);
  await page.screenshot({ path: path.join(outputDir, `${scenario.name}.png`), fullPage: true });
  await page.close();
  return {
    scenario: scenario.name,
    count: unlocks.count,
    names: unlocks.names,
    voiceKey: unlocks.voiceKey
  };
}

const server = await startPreviewServer();
console.log(`[ship-unlock-reveal] preview ready ${baseUrl}`);
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const results = [];
  results.push(await runScenario(browser, {
    name: 'single',
    previousProgress: baseHangarProgress({
      totalRuns: 1,
      bestSector: 3,
      bestLevel: 3,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_02']
    }),
    finalLevel: 4,
    finalScore: 25000,
    expectedCount: 1,
    expectedVoiceKey: 'mission_control_ship_unlocked',
    expectedSummary: 'SHIP UNLOCKED'
  }));
  results.push(await runScenario(browser, {
    name: 'several',
    previousProgress: baseHangarProgress(),
    finalLevel: 5,
    runStats: {
      bossKills: 1,
      wavesCleared: 24
    },
    expectedCount: 2,
    expectedVoiceKey: 'mission_control_ships_unlocked',
    expectedSummary: 'SHIPS UNLOCKED'
  }));
  console.log(`[ship-unlock-reveal] PASS ${JSON.stringify(results)}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
