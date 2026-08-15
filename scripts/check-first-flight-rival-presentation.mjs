import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(4600);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/first-flight-rival-evidence-${timestamp()}`);
const fixtures = [
  { width: 1280, height: 720, inputDevice: 'keyboard' },
  { width: 960, height: 640, inputDevice: 'controller' }
];
const languages = ['en', 'de', 'zh-CN', 'ru', 'es', 'pt-BR', 'ko', 'ja'];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise(resolve => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available port starting at ${startPort}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find(candidate => existsSync(candidate));
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startVite() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', chunk => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', chunk => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite did not become ready at ${baseUrl}`);
}

async function stopVite(server) {
  if (server.exitCode !== null || server.signalCode !== null) return;
  await new Promise(resolve => {
    const timeout = setTimeout(() => {
      server.kill('SIGKILL');
    }, 2000);
    server.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    server.kill();
  });
}

function seedFreshProfile() {
  localStorage.clear();
  localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
  localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
    version: 1,
    totalRuns: 0,
    bestScore: 0,
    bestRank: 0,
    bestLevel: 1,
    bestSector: 1,
    unlockedShipIds: ['nova_ship_01'],
    updatedAt: new Date().toISOString()
  }));
  localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify([
    { name: 'AURORAFOX', score: 500, leaderboardName: 'nova_swarm_tactical_score_v1' },
    { name: 'NEONWRAITH', score: 1000, leaderboardName: 'nova_swarm_tactical_score_v1' },
    { name: 'VOIDRUNNER', score: 1500, leaderboardName: 'nova_swarm_tactical_score_v1' }
  ]));
}

async function waitForPlayReady(page) {
  await page.waitForFunction(() => (
    window.__game?.currentSceneName === 'play'
    && window.__game?.globalLeaderboardTargets?.length > 0
    && window.__game?.highscoreChase?.syncingTarget === false
    && Boolean(window.__game?.scenes?.play?.hud)
  ), null, { timeout: 30000 });
}

async function readState(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    hud?.updateHighscoreChase?.();
    const bounds = hud?.highscoreChaseGroup?.getBounds?.();
    return {
      scene: game?.currentSceneName || null,
      totalRunsAtStart: Number(game?.hangarProgressAtRunStart?.totalRuns) || 0,
      totalRunsStored: Number(JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}').totalRuns) || 0,
      score: Number(game?.score) || 0,
      inputDevice: game?.runStartInputDevice || null,
      onboardingStage: play?.firstRunOnboardingStage || null,
      hud: hud ? {
        visible: Boolean(hud.highscoreChaseGroup?.visible),
        renderable: Boolean(hud.highscoreChaseGroup?.renderable),
        alpha: Number(hud.highscoreChaseGroup?.alpha) || 0,
        title: hud.highscoreChaseTitle?.text || null,
        target: hud.highscoreChaseTarget?.text || null,
        gap: hud.highscoreChaseGap?.text || null,
        hasTarget: Boolean(hud.highscoreChaseGroup?._debugChase?.hasTarget),
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null
      } : null,
      rivalProjection: game?.getGlobalRivalChaseState?.({ score: game?.score }) || null,
      globalTargetCount: Array.isArray(game?.globalLeaderboardTargets) ? game.globalLeaderboardTargets.length : 0,
      personalTargetScore: Number(game?.highscoreChase?.targetScore) || 0,
      firstFlightResult: game?.scenes?.gameOver?.getFirstFlightDebugState?.() || null
    };
  });
}

async function capture(page, fixture, label) {
  const state = await readState(page);
  const screenshot = path.join(outputDir, `${fixture.width}x${fixture.height}-${fixture.inputDevice}-${label}.png`);
  await page.screenshot({ path: screenshot });
  return { state, screenshot };
}

mkdirSync(outputDir, { recursive: true });
const server = await startVite();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const results = [];
  for (const fixture of fixtures) {
    const context = await browser.newContext({ viewport: fixture });
    await context.addInitScript(seedFreshProfile);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`${baseUrl}/?skipIntro=1&mockSteamLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
    await page.evaluate(inputDevice => window.__game.startGame(undefined, {
      runMode: 'mayhem_tactical',
      inputDevice
    }), fixture.inputDevice);
    await waitForPlayReady(page);

    const scoreZero = await capture(page, fixture, 'first-flight-score-zero');
    await page.evaluate(() => {
      window.__game.score = 100;
      window.__game.scenes.play.hud.updateHighscoreChase();
    });
    await page.waitForTimeout(150);
    const rivalVisible = await capture(page, fixture, 'first-flight-rival-visible');

    const localeVisibility = [];
    for (const language of languages) {
      await page.evaluate(code => window.__novaI18n?.setLanguagePreference?.(code), language);
      await page.waitForFunction(code => window.__novaI18n?.getCurrentLanguage?.() === code, language);
      const localizedState = await readState(page);
      localeVisibility.push({
        language,
        visible: localizedState.hud?.visible,
        renderable: localizedState.hud?.renderable,
        hasTarget: localizedState.hud?.hasTarget
      });
    }
    await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('en'));

    await page.evaluate(() => window.__game.scenes.play.completeFirstRunOnboarding('evidence', {
      flushAchievements: false
    }));
    const afterOnboarding = await capture(page, fixture, 'first-flight-after-onboarding');

    await page.evaluate(() => {
      const game = window.__game;
      const player = game.scenes.play.player;
      game.lives = 3;
      player.invulnerable = false;
      player.invulnerableTime = 0;
      player.shieldActive = false;
      game.loseLife({ source: 'enemy_bullet' });
    });
    await page.waitForTimeout(350);
    const afterLifeLoss = await capture(page, fixture, 'first-flight-after-life-loss');

    await page.evaluate(() => {
      globalThis.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
      window.__game.gameOver();
    });
    await page.waitForFunction(() => window.__game?.currentSceneName === 'gameOver', null, { timeout: 15000 });
    await page.waitForTimeout(250);
    const firstGameOver = await capture(page, fixture, 'first-game-over');

    await page.evaluate(inputDevice => window.__game.startGame(undefined, {
      runMode: 'mayhem_tactical',
      inputDevice
    }), fixture.inputDevice);
    await waitForPlayReady(page);
    await page.evaluate(() => {
      window.__game.score = 101;
      window.__game.scenes.play.hud.updateHighscoreChase();
    });
    await page.waitForTimeout(150);
    const runTwo = await capture(page, fixture, 'run-two-rival-visible');

    assert.equal(scoreZero.state.totalRunsAtStart, 0, 'fixture was not a canonical first flight');
    assert.equal(rivalVisible.state.hud?.title, 'RIVAL TARGET #3', 'first-flight rival computation changed');
    assert.equal(rivalVisible.state.hud?.hasTarget, true, 'first-flight rival target computation stopped');
    assert.equal(rivalVisible.state.rivalProjection?.targetName, 'AURORAFOX', 'first-flight global target changed');
    assert.equal(rivalVisible.state.hud?.visible, false, 'first-flight Rival Target presentation leaked');
    assert.equal(rivalVisible.state.hud?.renderable, false, 'first-flight Rival Target remained renderable');
    assert.equal(afterOnboarding.state.hud?.visible, false, 'Rival Target appeared after first-run onboarding');
    assert.equal(afterLifeLoss.state.hud?.visible, false, 'Rival Target appeared after first life loss');
    assert(localeVisibility.every(entry => entry.visible === false && entry.renderable === false && entry.hasTarget === true),
      'first-flight suppression or hidden computation changed in a supported locale');
    assert.equal(firstGameOver.state.firstFlightResult?.eligible, true, 'first result was not recognized as first flight');
    assert.equal(runTwo.state.totalRunsAtStart, 1, 'relaunch did not become run two');
    assert.equal(runTwo.state.hud?.title, 'RIVAL TARGET #3', 'run-two production Rival Target was missing');
    assert.deepEqual(pageErrors, [], 'page errors during evidence run');

    results.push({ fixture, scoreZero, rivalVisible, localeVisibility, afterOnboarding, afterLifeLoss, firstGameOver, runTwo });
    await context.close();
  }

  const report = { status: 'passed', outputDir, results };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[first-flight-rival] PASS layouts=${fixtures.length} locales=${languages.length} evidence=${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser.close();
  await stopVite(server);
}
