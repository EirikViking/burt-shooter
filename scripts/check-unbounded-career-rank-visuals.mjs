import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(Number(process.env.CHECK_PORT) || 4494);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/unbounded-career-rank-visuals-${timestamp()}`);
const seedPilotXpExact = '80309999';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function right(bounds) {
  return Number(bounds?.x) + Number(bounds?.width);
}

function bottom(bounds) {
  return Number(bounds?.y) + Number(bounds?.height);
}

function contains(outer, inner, pad = 1) {
  if (!outer || !inner) return false;
  return Number(inner.x) >= Number(outer.x) - pad
    && Number(inner.y) >= Number(outer.y) - pad
    && right(inner) <= right(outer) + pad
    && bottom(inner) <= bottom(outer) + pad;
}

async function findAvailablePort(start) {
  for (let candidate = start; candidate < start + 30; candidate += 1) {
    const free = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (free) return candidate;
  }
  throw new Error('No preview port available.');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find(existsSync);
}

async function waitForServer(url) {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview did not become ready at ${url}.`);
}

function boundsInPage(displayObject) {
  if (!displayObject?.getBounds) return null;
  const value = displayObject.getBounds();
  return {
    x: Math.round(value.x),
    y: Math.round(value.y),
    width: Math.round(value.width),
    height: Math.round(value.height)
  };
}

function assertCareerOverlay(state, viewport) {
  assert(state.visible, `${viewport}: Career Intel is not visible.`);
  assert(state.panel.x >= 0 && state.panel.y >= 0, `${viewport}: Career Intel escaped the viewport.`);
  assert(state.panel.right <= viewport.width && state.panel.bottom <= viewport.height, `${viewport}: Career Intel is clipped.`);
  for (const [label, bounds] of [
    ['title', state.title],
    ['rank gauge', state.rankGauge],
    ['value chip', state.valueChip],
    ['body', state.body],
    ['progress bar', state.flowBar],
    ['Pilot Orders archive', state.pilotOrdersArchive?.bounds],
    ['back button', state.backButton]
  ]) {
    assert(contains(state.panel, bounds, 2), `${viewport}: ${label} escapes the Career Intel frame.`);
  }
  state.stats.forEach((bounds, index) => assert(contains(state.panel, bounds, 2), `${viewport}: stat ${index + 1} escapes the Career Intel frame.`));
  state.pilotOrdersArchive.lines.forEach((bounds, index) => {
    assert(contains(state.pilotOrdersArchive.bounds, bounds, 1), `${viewport}: Pilot Order line ${index + 1} escapes its archive frame.`);
  });
}

const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

let browser;
const consoleErrors = [];
const pageErrors = [];
try {
  mkdirSync(outputDir, { recursive: true });
  await waitForServer(baseUrl);
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(({ pilotXpExact }) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      version: 1,
      unlockTuningVersion: 3,
      pilotXp: Number(pilotXpExact),
      pilotXpExact,
      pilotRank: 39,
      highestPilotRank: 39,
      bestRank: 39,
      bestScore: 562399,
      bestSector: 72,
      bestLevel: 72,
      totalRuns: 412,
      totalBossesDefeated: 287,
      totalCodexDiscoveries: 2280,
      totalWavesCleared: 1987,
      unlockedShipIds: ['nova_ship_01']
    }));
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'FOREVER ACE');
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
  }, { pilotXpExact: seedPilotXpExact });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 90000 });
  await page.evaluate(() => window.__game.showShipSelect());
  await page.waitForFunction(() => window.__game?.currentSceneName === 'shipSelect' && window.__game?.scenes?.shipSelect?.leftIntel, null, { timeout: 90000 });
  await page.evaluate(() => window.__game.scenes.shipSelect.openCareerInfoOverlay('visual_check'));
  await page.waitForTimeout(800);

  const careerResults = [];
  for (const viewport of [{ width: 1280, height: 720 }, { width: 960, height: 640 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => {
      const scene = window.__game.scenes.shipSelect;
      scene.rebuildCareerInfoOverlay();
      scene.openCareerInfoOverlay('visual_check_resize');
      return scene.getCareerInfoDebugState((displayObject) => {
        if (!displayObject?.getBounds) return null;
        const value = displayObject.getBounds();
        return { x: Math.round(value.x), y: Math.round(value.y), width: Math.round(value.width), height: Math.round(value.height) };
      });
    });
    await page.waitForTimeout(500);
    assertCareerOverlay(state, viewport);
    const screenshot = `career-intel-rank-156-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
    careerResults.push({ viewport, screenshot, state });
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => {
    window.__game.switchScene('menu');
    const menu = window.__game.scenes.menu;
    menu.openHowToPlayOverlay();
    menu.howToPlayOverlay.setPage(5);
  });
  await page.waitForTimeout(500);
  const helpState = await page.evaluate(() => window.__game.scenes.menu.howToPlayOverlay.getDebugState());
  assert(helpState.pageId === 'career', 'How To Play did not open the Career page.');
  assert(helpState.cards.some((card) => card.label === 'Career Rank' && /climbing forever/i.test(card.tip)), 'How To Play does not explain endless Career Rank.');
  assert((helpState.layout?.warnings || []).length === 0, `How To Play Career layout warnings: ${JSON.stringify(helpState.layout?.warnings)}`);
  const helpScreenshot = 'how-to-play-career-1280x720.png';
  await page.screenshot({ path: path.join(outputDir, helpScreenshot), fullPage: true });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseUrl}/?autostart=1&mockSteamLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 90000 });
  await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    game.score = 54321;
    game.level = 6;
    game.lives = 0;
    play.gameTime = 187;
    play.totalKills = 73;
    play.bossKills = 2;
    play.wavesCleared = 9;
    play.lifeLossesThisRun = 3;
    play.powerupsCollectedThisRun = 5;
    play.finalLifeLossSource = 'enemy_bullet';
    game.gameOver({ fromInterlude: true });
  });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'gameOver', null, { timeout: 15000 });
  const resultState = await page.evaluate(() => {
    const scene = window.__game.scenes.gameOver;
    scene.enterRunbackStage('endless_rank_visual_check');
    scene.layoutScreen();
    return {
      careerRankBefore: window.__game.runSummary?.careerRankBefore,
      careerRankAfter: window.__game.runSummary?.careerRankAfter,
      careerRankIncreased: window.__game.runSummary?.careerRankIncreased,
      rankText: scene.rankProgressText?.text || '',
      haloVisible: Boolean(scene.endlessRankHalo?.visible),
      celebrationPlayed: Boolean(scene.endlessRankCelebrationPlayed)
    };
  });
  assert(resultState.careerRankBefore === '156', `Expected Career Rank 156 before the run, got ${resultState.careerRankBefore}.`);
  assert(resultState.careerRankAfter === '157', `Expected Career Rank 157 after the run, got ${resultState.careerRankAfter}.`);
  assert(resultState.careerRankIncreased === true, 'Post-cap Career Rank increase was not recorded.');
  assert(/NEW CAREER RANK:\s*157/i.test(resultState.rankText), `Promotion reveal did not name the earned Career Rank: ${resultState.rankText}`);
  assert(resultState.haloVisible && resultState.celebrationPlayed, 'Endless Rank visual/audio celebration did not activate.');
  const resultScreenshot = 'career-rank-157-celebration-1280x720.png';
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outputDir, resultScreenshot), fullPage: true });

  const reportResults = [];
  await page.evaluate(() => window.__game.scenes.gameOver.openRunReport());
  for (const viewport of [{ width: 1280, height: 720 }, { width: 960, height: 640 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(350);
    const state = await page.evaluate(() => {
      const scene = window.__game.scenes.gameOver;
      scene.layoutScreen();
      return scene.getRunReportOverlayDebugState();
    });
    assert(state.visible, `${viewport.width}x${viewport.height}: Run Report is not visible.`);
    assert(/CAREER RANK:\s*157/i.test(state.text), `${viewport.width}x${viewport.height}: Run Report does not show Career Rank 157.`);
    assert(/NEW RANKS:\s*1/i.test(state.text), `${viewport.width}x${viewport.height}: Run Report does not count the earned Career Rank.`);
    assert(state.x >= 0 && state.y >= 0 && state.x + state.width <= viewport.width && state.y + state.height <= viewport.height,
      `${viewport.width}x${viewport.height}: Run Report is clipped.`);
    const screenshot = `run-report-career-rank-157-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
    reportResults.push({ viewport, screenshot, state });
  }

  assert(pageErrors.length === 0, `Page errors: ${JSON.stringify(pageErrors)}`);
  assert(consoleErrors.length === 0, `Console errors: ${JSON.stringify(consoleErrors)}`);
  const report = {
    ok: true,
    baseUrl,
    seedPilotXpExact,
    careerResults,
    helpState,
    helpScreenshot,
    resultState,
    resultScreenshot,
    reportResults,
    consoleErrors,
    pageErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[unbounded-career-rank-visuals] PASS output=${outputDir}`);
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}
