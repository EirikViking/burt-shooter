import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(4983);
const baseUrl = `http://${host}:${port}/?controlSmoke=1`;
const outputDir = path.resolve(`test-results/late-game-experiment-draft-flow-${timestamp()}`);
const matureProfile = {
  bestScore: 1000000,
  bestSector: 150,
  bestLevel: 150,
  bestRank: 50,
  pilotRank: 50,
  pilotXp: 999999,
  unlockedShipIds: Array.from({ length: 30 }, (_entry, index) =>
    `nova_ship_${String(index + 1).padStart(2, '0')}`
  )
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(start) {
  for (let candidate = start; candidate < start + 30; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No local port available for late-game experiment draft-flow check');
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not become ready at ${url}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function startExperimentPage(context, ruleset) {
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript((profile) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(profile));
  }, matureProfile);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame), null, { timeout: 90000 });
  const started = await page.evaluate((selectedRuleset) => window.__game.startGame('nova-player-ship-06.png', {
    countShipUsage: false,
    lateGameExperiment: {
      acknowledged: true,
      scenario: 'standard',
      ruleset: selectedRuleset,
      fixtureId: selectedRuleset === 'tactical' ? 'tactical_saturation_bounded' : 'pure_control',
      startSector: 75,
      lifeStock: 'three_lives',
      phasePulseAvailable: selectedRuleset === 'tactical'
    }
  }), ruleset);
  assert.equal(started, true);
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.enemyManager), null, { timeout: 90000 });
  const initial = await page.evaluate(() => ({
    sector: window.__game.level,
    runMode: window.__game.runMode,
    ruleset: window.__game.lateGameExperiment?.ruleset,
    draftMode: window.__game.lateGameExperiment?.draftMode,
    augmentCount: window.__game.scenes.play.player?.runAugmentIds?.length || 0
  }));
  assert.equal(initial.sector, 75);
  assert.equal(initial.ruleset, ruleset);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    play.shouldHoldProgressionPresentation = () => false;
    play.enemyManager.isLevelComplete = () => true;
    play.enemyManager.spawning = false;
    play.enemyManager.bossDefeatedThisLevel = true;
  });
  return { page, pageErrors, consoleErrors, initial };
}

mkdirSync(outputDir, { recursive: true });
const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

let context;
try {
  await waitForServer(baseUrl);
  const executablePath = findChrome();
  assert.ok(executablePath, 'Installed Chrome or Edge is required');
  context = await chromium.launchPersistentContext(path.join(outputDir, 'browser-profile'), {
    headless: true,
    executablePath,
    viewport: { width: 1366, height: 768 },
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  const tactical = await startExperimentPage(context, 'tactical');
  assert.equal(tactical.initial.runMode, 'ranked_tactical');
  assert.equal(tactical.initial.draftMode, 'enabled');
  await tactical.page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.tacticalDraft?.active === true && state.tacticalDraft?.inputArmed === true;
  }, null, { timeout: 15000 });
  const tacticalDraft = await tactical.page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text());
    return {
      sector: window.__game.level,
      active: state.tacticalDraft?.active === true,
      inputArmed: state.tacticalDraft?.inputArmed === true,
      offers: state.tacticalDraft?.offers || [],
      augmentCount: window.__game.scenes.play.player?.runAugmentIds?.length || 0
    };
  });
  assert.equal(tacticalDraft.sector, 75, 'Tactical experiment advanced before the augment choice');
  assert.equal(tacticalDraft.active, true);
  assert.equal(tacticalDraft.inputArmed, true);
  assert.ok(tacticalDraft.offers.length >= 1, 'Tactical experiment draft opened without selectable offers');
  const draftScreenshot = path.join(outputDir, 'sector-75-tactical-draft.png');
  await tactical.page.screenshot({ path: draftScreenshot, fullPage: true });
  await tactical.page.evaluate(() => window.__game.scenes.play.confirmTacticalDraft(0, 'pointer'));
  await tactical.page.waitForFunction(() => window.__game.level === 76, null, { timeout: 10000 });
  const tacticalAfter = await tactical.page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text());
    return {
      sector: window.__game.level,
      draftActive: state.tacticalDraft?.active === true,
      historyLength: state.tacticalDraft?.history?.length || 0,
      augmentCount: window.__game.scenes.play.player?.runAugmentIds?.length || 0
    };
  });
  assert.equal(tacticalAfter.sector, 76);
  assert.equal(tacticalAfter.draftActive, false);
  assert.equal(tacticalAfter.historyLength, 1, 'Tactical experiment did not retain the post-boss choice');
  assert.ok(tacticalAfter.augmentCount >= tacticalDraft.augmentCount,
    'Tactical experiment lost augments after confirming the draft');
  const sector76Screenshot = path.join(outputDir, 'sector-76-after-tactical-draft.png');
  await tactical.page.screenshot({ path: sector76Screenshot, fullPage: true });
  assert.deepEqual(tactical.pageErrors, []);
  assert.deepEqual(tactical.consoleErrors, []);
  await tactical.page.close();

  const pure = await startExperimentPage(context, 'pure');
  assert.equal(pure.initial.runMode, 'ranked');
  assert.equal(pure.initial.draftMode, 'disabled');
  await pure.page.waitForFunction(() => window.__game.level === 76, null, { timeout: 15000 });
  const pureAfter = await pure.page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text());
    return {
      sector: window.__game.level,
      draftActive: state.tacticalDraft?.active === true,
      historyLength: state.tacticalDraft?.history?.length || 0,
      augmentCount: window.__game.scenes.play.player?.runAugmentIds?.length || 0
    };
  });
  assert.equal(pureAfter.sector, 76);
  assert.equal(pureAfter.draftActive, false);
  assert.equal(pureAfter.historyLength, 0);
  assert.equal(pureAfter.augmentCount, 0);
  assert.deepEqual(pure.pageErrors, []);
  assert.deepEqual(pure.consoleErrors, []);
  await pure.page.close();

  const report = {
    pass: true,
    tactical: { initial: tactical.initial, draft: tacticalDraft, after: tacticalAfter },
    pure: { initial: pure.initial, after: pureAfter },
    screenshots: [draftScreenshot, sector76Screenshot]
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[late-game-experiment-draft-flow] PASS report=${path.join(outputDir, 'report.json')}`);
} finally {
  await context?.close();
  server.kill();
}
