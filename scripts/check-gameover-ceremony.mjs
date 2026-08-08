import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4370));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const localKey = 'novaSwarm.localLeaderboard.v2';
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/gameover-ceremony-${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });

const board = [
  50000, 42000, 36000, 30000, 24000, 20000, 16000, 12000, 9000, 8000,
  7900, 7800, 7700, 7600, 7500, 7400, 7300, 7200, 7100, 7000,
  6900, 6800, 6700, 6600, 6500, 6400, 6350, 6300, 6250, 6200,
  6180, 6160, 6140, 6120, 6100, 6080, 6060, 6040, 6020, 6000
].map((score, index) => ({
  name: `GLB${index + 1}`,
  score,
  level: 9,
  rank_index: 12
}));

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

async function preparePage(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/highscores', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, id: 1 }) });
      return;
    }
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(board) });
  });
  await page.addInitScript((storageKey) => {
    localStorage.removeItem(storageKey);
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 0, bestRank: 0, bestLevel: 1 }));
  }, localKey);
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  return { page, pageErrors };
}

async function forceGameOver(page, score) {
  await page.evaluate((finalScore) => {
    const game = window.__game;
    game.score = finalScore;
    game.level = 6;
    game.rankIndex = 8;
    game.gameOver();
  }, score);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.globalStatus !== 'checking';
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.gameOver?.backdropLoaded === true;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function checkCeremony(browser, { score, expectedTier, titlePattern, shotName }) {
  const { page, pageErrors } = await preparePage(browser);
  const state = await forceGameOver(page, score);
  assert(state.gameOver.globalPlacementTier === expectedTier, `expected ${expectedTier}, got ${state.gameOver.globalPlacementTier}`);
  assert(titlePattern.test(state.gameOver.ceremonyTitle || ''), `unexpected title: ${state.gameOver.ceremonyTitle}`);
  assert(pageErrors.length === 0, `page errors for ${expectedTier}: ${pageErrors.join('; ')}`);
  await page.screenshot({ path: path.join(outputDir, shotName), fullPage: true });
  await page.close();
  return {
    tier: state.gameOver.globalPlacementTier,
    title: state.gameOver.ceremonyTitle,
    placement: state.gameOver.globalPlacement?.placement || null,
    status: state.gameOver.leaderboardStatus
  };
}

async function checkInGameFinalDeathAnimation(browser) {
  const { page, pageErrors } = await preparePage(browser);
  await page.evaluate(async () => {
    await window.__game?.scenes?.play?.gameOverFinalTransmissionReady;
  });
  const injectedHazard = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes?.play;
    const width = game.getWidth();
    const height = game.getHeight();
    const wall = {
      kind: 'wall',
      type: 'wall',
      sourceX: width / 2,
      sourceY: 80,
      columns: [width * 0.41, width * 0.59],
      startY: 100,
      endY: height + 80,
      width: 24,
      durationMs: 500,
      armingMs: 80,
      elapsedMs: 250,
      color: 0xff315f,
      hit: false
    };
    play.bossHazards = [wall];
    play.drawBossHazard(wall, 0.5);
    const before = {
      hazards: play.bossHazards.length,
      geometry: play.bossHazardLayerHasGeometry
    };
    game.score = 12345;
    game.level = 6;
    game.lives = 1;
    game.loseLife({ source: 'boss_wall' });
    return before;
  });
  assert(injectedHazard.hazards === 1 && injectedHazard.geometry === true, `synthetic wall hazard did not render before final death: ${JSON.stringify(injectedHazard)}`);
  await page.waitForFunction(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    return game?.currentSceneName === 'play' &&
      play?.gameOverSequenceStarted === true &&
      Boolean(play?.gameOverAnimationLayer?.parent);
  }, null, { timeout: 5000 });
  const lockedState = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes?.play;
    return {
      blockedAward: game.addScore(999, 'baseScore'),
      score: game.score,
      finalScoreSnapshot: game.finalScoreSnapshot,
      finalScoreLocked: game.finalScoreLocked,
      animation: structuredClone(play?.gameOverAnimationDebug || null),
      layerAlpha: play?.gameOverAnimationLayer?.alpha,
      deathHoldCueAttached: Boolean(play?.uiOverlay?.children?.some((child) => child?.label === 'game_over_death_hold_cue')),
      fatalImpact: structuredClone(play?.finalDeathImpact || null),
      combatCleanup: structuredClone(play?.lastFinalDeathCombatCleanup || null),
      damageFlash: structuredClone(play?.lastPlayerDamageFlashDebug || null),
      bossHazards: play?.bossHazards?.length || 0,
      bossHazardGeometry: Boolean(play?.bossHazardLayerHasGeometry)
    };
  });
  assert(lockedState.blockedAward === 0, `post-death score award was not blocked: ${lockedState.blockedAward}`);
  assert(lockedState.score === 12345, `score changed after final death: ${lockedState.score}`);
  assert(lockedState.finalScoreSnapshot === 12345, `wrong final score snapshot: ${lockedState.finalScoreSnapshot}`);
  assert(lockedState.finalScoreLocked === true, 'final score did not lock on the final life');
  assert(lockedState.animation?.deathHoldMs === 1100 && lockedState.animation?.skippable === true, `death hold/skip contract missing: ${JSON.stringify(lockedState.animation)}`);
  assert(lockedState.layerAlpha === 0, `frozen battle should remain visible during the death hold: ${lockedState.layerAlpha}`);
  assert(lockedState.deathHoldCueAttached === true, 'visible frozen-battle death-hold cue is missing');
  assert(lockedState.fatalImpact?.source === 'boss_wall', `fatal source was not preserved: ${JSON.stringify(lockedState.fatalImpact)}`);
  assert(lockedState.combatCleanup?.bossHazardsCleared === 1, `final-death wall hazard was not cleared: ${JSON.stringify(lockedState.combatCleanup)}`);
  assert(lockedState.bossHazards === 0 && lockedState.bossHazardGeometry === false, `boss-hazard seam geometry survived final death: ${JSON.stringify(lockedState)}`);
  assert(lockedState.damageFlash?.renderMode === 'filled_edge_bands' && lockedState.damageFlash?.strokeCount === 0, `damage cue still uses seam-prone strokes: ${JSON.stringify(lockedState.damageFlash)}`);
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const earlySkipState = await page.evaluate(() => window.__game?.currentSceneName);
  assert(earlySkipState === 'play', `held/early input skipped the final-death presentation before 750ms: ${earlySkipState}`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outputDir, 'in-game-final-death.png'), fullPage: true });
  await page.waitForTimeout(850);
  const signalState = await page.evaluate(() => structuredClone(window.__game?.scenes?.play?.gameOverAnimationDebug || null));
  assert(signalState?.signalAssetReady === true, `generated final-signal asset was not visible: ${JSON.stringify(signalState)}`);
  await page.screenshot({ path: path.join(outputDir, 'in-game-final-signal.png'), fullPage: true });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game?.currentSceneName === 'gameOver', null, { timeout: 5000 });
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const invariant = await page.evaluate(() => {
    const game = window.__game;
    return {
      gameScore: game.score,
      finalScoreSnapshot: game.finalScoreSnapshot,
      breakdownScore: game.scoreBreakdown?.finalScore,
      summaryScore: game.runSummary?.finalScore,
      reportScore: game.lastRunReport?.summary?.score,
      sceneScore: game.scenes?.gameOver?.finalScore
    };
  });
  assert(state.scene === 'gameOver', `expected gameOver after final death ceremony, got ${state.scene}`);
  assert(state.gameOverAnimation?.skipped === true && state.gameOverAnimation?.skipReason === 'keyboard', `game-over ceremony did not record the intentional skip: ${JSON.stringify(state.gameOverAnimation)}`);
  assert(Object.values(invariant).every((value) => value === 12345), `final score invariant failed: ${JSON.stringify(invariant)}`);
  assert(pageErrors.length === 0, `page errors for in-game final death animation: ${pageErrors.join('; ')}`);
  await page.close();
  return {
    scenario: 'in_game_final_death_animation',
    finalScene: state.scene,
    finalScore: state.gameOver?.score || 0,
    invariant
  };
}

async function checkNormalLifeLossFeedback(browser) {
  const { page, pageErrors } = await preparePage(browser);
  const setup = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    game.lives = 2;
    play.clearToastState();
    play.showToast('SHIP GRAZE +8', { slot: 'corner', type: 'nearMiss', priority: 1, duration: 4000 });
    play.enqueueToast('CABINET LOG PARAGRAPH', { slot: 'top', type: 'lore', priority: 1, duration: 4000 });
    game.loseLife({ source: 'enemy_contact' });
    play.triggerPlayerDeathFeedback({ source: 'enemy_contact' });
    return {
      lives: game.lives,
      gameOverSequenceStarted: Boolean(play.gameOverSequenceStarted),
      suppression: structuredClone(play.lastLifeLossNotificationSuppression || null),
      damageFlash: structuredClone(play.lastPlayerDamageFlashDebug || null),
      toast: structuredClone(play.getToastDebugState?.() || null),
      playerInvulnerable: Boolean(play.player?.invulnerable)
    };
  });
  await page.waitForTimeout(120);
  const screenshot = path.join(outputDir, 'in-game-normal-life-loss.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  assert(setup.lives === 1 && setup.gameOverSequenceStarted === false, `normal life loss entered final-death flow: ${JSON.stringify(setup)}`);
  const suppressedSecondaryCount = Number(setup.suppression?.queuedRemoved || 0)
    + Number(setup.suppression?.activeDismissed || 0)
    + Number(setup.suppression?.hiddenPositiveSurfaces || 0);
  assert(suppressedSecondaryCount >= 2, `secondary notifications survived life loss: ${JSON.stringify(setup.suppression)}`);
  assert(setup.toast?.active?.some?.((toast) => toast?.type === 'player_survival'), `survival notice did not replace positive notifications: ${JSON.stringify(setup.toast)}`);
  assert(setup.damageFlash?.finalDeath === false && setup.damageFlash?.impactSource === 'enemy_contact', `normal impact feedback lost its source: ${JSON.stringify(setup.damageFlash)}`);
  assert(setup.playerInvulnerable === true, 'normal life loss did not enter respawn invulnerability');
  assert(pageErrors.length === 0, `page errors for normal life loss: ${pageErrors.join('; ')}`);
  await page.close();
  return { scenario: 'normal_life_loss_feedback', screenshot, setup };
}

const server = await startPreviewServer();
console.log(`[gameover-ceremony] preview ready ${baseUrl}`);
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const results = [];
  {
    console.log('[gameover-ceremony] checking live score cues');
    const { page, pageErrors } = await preparePage(browser);
    await page.evaluate(() => {
      const game = window.__game;
      game.scoreMultiplier = 1;
      if (game.scenes?.play?.player) game.scenes.play.player.scoreMultiplier = 1;
      if (game.runPressureDirector) game.runPressureDirector.getScoreMultiplier = () => 1;
      game.globalLeaderboardTargets = [
        { score: 50000 }, { score: 42000 }, { score: 36000 }, { score: 30000 },
        { score: 24000 }, { score: 20000 }, { score: 16000 }, { score: 12000 },
        { score: 9000 }, { score: 8000 }, { score: 7600 }, { score: 7300 },
        { score: 7000 }, { score: 6800 }, { score: 6600 }, { score: 6400 },
        { score: 6250 }, { score: 6150 }, { score: 6050 }, { score: 6000 }
      ];
      game.score = 100;
      game.updateGlobalLeaderboardVoiceCues?.();
      game.score = 33000;
      game.updateGlobalLeaderboardVoiceCues?.();
      game.score = 46000;
      game.updateGlobalLeaderboardVoiceCues?.();
    });
    const cueState = await page.evaluate(() => JSON.parse(window.render_game_to_text()).globalLeaderboardCues);
    assert(cueState.global === true, 'near-global voice cue did not arm');
    assert(cueState.top3 === true, 'near-top-3 voice cue did not arm');
    assert(cueState.number1 === true, 'near-number-one voice cue did not arm');
    assert(pageErrors.length === 0, `page errors for live cues: ${pageErrors.join('; ')}`);
    results.push({ scenario: 'live_cues', cueState });
    await page.close();
  }

  console.log('[gameover-ceremony] checking in-game final death animation');
  results.push(await checkInGameFinalDeathAnimation(browser));

  console.log('[gameover-ceremony] checking normal life-loss hierarchy');
  results.push(await checkNormalLifeLossFeedback(browser));

  console.log('[gameover-ceremony] checking number-one ceremony');
  results.push(await checkCeremony(browser, {
    score: 55000,
    expectedTier: 'number1',
    titlePattern: /NUMBER ONE/i,
    shotName: 'number-one.png'
  }));
  console.log('[gameover-ceremony] checking top-three ceremony');
  results.push(await checkCeremony(browser, {
    score: 39000,
    expectedTier: 'top3',
    titlePattern: /Steam Global Leaderboard #3/i,
    shotName: 'top-three.png'
  }));
  console.log('[gameover-ceremony] checking global-slot ceremony');
  results.push(await checkCeremony(browser, {
    score: 7000,
    expectedTier: 'global',
    titlePattern: /GLOBAL SLOT/i,
    shotName: 'global-slot.png'
  }));
  console.log('[gameover-ceremony] checking near-global ceremony');
  results.push(await checkCeremony(browser, {
    score: 5200,
    expectedTier: 'near_global',
    titlePattern: /GLOBAL BOARD IN SIGHT/i,
    shotName: 'near-global.png'
  }));

  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(results, null, 2));
  console.log(`[gameover-ceremony] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[gameover-ceremony] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
