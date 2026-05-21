import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4340));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/gameover-motivation-${timestamp()}`);

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
  return candidates.find((candidate) => existsSync(candidate));
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const consoleErrors = [];

function observePage(targetPage) {
  targetPage.on('pageerror', (error) => pageErrors.push(error.message));
  targetPage.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
}

async function clickLaunchRun(targetPage) {
  await targetPage.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'menu' && state.menu?.items?.launchButton;
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
  const bounds = await targetPage.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.menu?.items?.launchButton || null;
  });
  if (!bounds) throw new Error('Launch Run button bounds unavailable');
  await targetPage.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

async function clickPrimaryCta(targetPage) {
  await targetPage.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      const cta = state.gameOver?.primaryCta || state.gameOver?.retryCta;
      return state.scene === 'gameOver' && cta?.visible && cta.width > 0 && cta.height > 0;
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
  const bounds = await targetPage.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.gameOver?.primaryCta || state.gameOver?.retryCta || null;
  });
  if (!bounds) throw new Error('Game-over CTA bounds unavailable');
  await targetPage.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

function fullLocalLeaderboard() {
  return Array.from({ length: 20 }, (_, index) => ({
    name: `ACE${String(index + 1).padStart(2, '0')}`,
    score: 100000 - index * 1000,
    level: 9,
    rankIndex: 6,
    timestamp: new Date(Date.now() - index * 1000).toISOString()
  }));
}

observePage(page);

try {
  await page.addInitScript(() => {
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 0, bestRank: 0, bestLevel: 1 }));
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });

  await page.evaluate(() => {
    const game = window.__game;
    if (!game) return;
    game.score = 12000;
    game.level = 2;
    game.rankIndex = Math.max(game.rankIndex || 0, 1);
    game.lives = 0;
    game.gameOver();
  });
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'gameOver' && state.gameOver?.unlockSummary;
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
  await page.waitForTimeout(500);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'gameover-motivation.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const gameOverState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await clickPrimaryCta(page);
  await page.waitForFunction(() => window.__game?.scenes?.gameOver?.state === 'input', null, { timeout: 5000 });
  await page.keyboard.type('ABCDEFGHIJKLMNO');
  const nameInputState = await page.evaluate(() => ({
    state: window.__game?.scenes?.gameOver?.state || null,
    nameInput: window.__game?.scenes?.gameOver?.nameInput || '',
    hiddenMaxLength: window.__game?.scenes?.gameOver?.hiddenInput?.maxLength || null
  }));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.state === 'runback';
  }, null, { timeout: 15000 });
  const submittedRunbackState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const runbackScreenshot = path.join(outputDir, 'gameover-runback.png');
  await page.screenshot({ path: runbackScreenshot, fullPage: true });

  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 150000, bestRank: 6, bestLevel: 12 }));
    const game = window.__game;
    if (!game) return;
    game.score = 4874;
    game.level = 2;
    game.rankIndex = 0;
    game.lives = 0;
    game.gameOver();
  });
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'gameOver' && state.gameOver?.unlockSummary;
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
  const alreadyUnlockedState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const alreadyUnlockedSummary = alreadyUnlockedState.gameOver?.unlockSummary || '';

  const retryCtaPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  observePage(retryCtaPage);
  await retryCtaPage.addInitScript((scores) => {
    localStorage.setItem('novaSwarm.localLeaderboard.v1', JSON.stringify(scores));
  }, fullLocalLeaderboard());
  await retryCtaPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await retryCtaPage.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await retryCtaPage.evaluate(() => {
    const game = window.__game;
    if (!game) return;
    game.score = 1;
    game.level = 1;
    game.rankIndex = 0;
    game.lives = 0;
    game.gameOver();
  });
  await retryCtaPage.waitForFunction(() => window.__game?.currentSceneName === 'gameOver', null, { timeout: 10000 });
  await retryCtaPage.evaluate(() => {
    const scene = window.__game?.scenes?.gameOver;
    if (!scene) return;
    scene.globalQualified = false;
    scene.globalStatus = 'missed';
    scene.updateQualificationPromptState?.();
  });
  await retryCtaPage.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.gameOver?.primaryCta?.mode === 'restart';
    } catch {
      return false;
    }
  }, null, { timeout: 5000 });
  const noSlotCtaState = await retryCtaPage.evaluate(() => JSON.parse(window.render_game_to_text()));
  await clickPrimaryCta(retryCtaPage);
  await retryCtaPage.waitForFunction(() => window.__game?.currentSceneName === 'play', null, { timeout: 10000 });
  const retryCtaRestartedState = await retryCtaPage.evaluate(() => JSON.parse(window.render_game_to_text()));
  await retryCtaPage.close();

  const menuReplayPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  observePage(menuReplayPage);
  await menuReplayPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await clickLaunchRun(menuReplayPage);
  await menuReplayPage.waitForFunction(() => window.__game?.currentSceneName === 'play', null, { timeout: 10000 });
  const firstMenuLaunchState = await menuReplayPage.evaluate(() => JSON.parse(window.render_game_to_text()));
  await menuReplayPage.evaluate(() => {
    const game = window.__game;
    if (!game) return;
    game.score = 875;
    game.level = 1;
    game.rankIndex = 0;
    game.lives = 0;
    game.gameOver();
  });
  await menuReplayPage.waitForFunction(() => window.__game?.currentSceneName === 'gameOver', null, { timeout: 10000 });
  await menuReplayPage.keyboard.press('Escape');
  await menuReplayPage.waitForFunction(() => {
    const game = window.__game;
    return game?.currentSceneName === 'menu' || game?.scenes?.gameOver?.state === 'runback';
  }, null, { timeout: 10000 });
  if (await menuReplayPage.evaluate(() => window.__game?.currentSceneName === 'gameOver')) {
    await menuReplayPage.keyboard.press('Escape');
  }
  await menuReplayPage.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 10000 });
  await clickLaunchRun(menuReplayPage);
  await menuReplayPage.waitForFunction(() => window.__game?.currentSceneName === 'play', null, { timeout: 10000 });
  const returnMenuLaunchState = await menuReplayPage.evaluate(() => JSON.parse(window.render_game_to_text()));
  await menuReplayPage.close();

  const report = {
    ok: Boolean(
      gameOverState.scene === 'gameOver' &&
      /NEW SHIP UNLOCKED|NEXT SHIP|HANGAR COMPLETE/i.test(gameOverState.gameOver?.unlockSummary || '') &&
      !/NEXT SHIP:\s*VIOLET FEINT/i.test(alreadyUnlockedSummary) &&
      !/NEED .*\b1 RANK\b/i.test(alreadyUnlockedSummary) &&
      /LEADERBOARD FIRST/i.test(gameOverState.gameOver?.retryPrompt || '') &&
      /SUBMIT SCORE/i.test(gameOverState.gameOver?.primaryCta?.label || '') &&
      /PILOT NAME FIRST|TYPE NAME FIRST|ENTER \/ CLICK/i.test(gameOverState.gameOver?.primaryCta?.hint || '') &&
      ['leaderboard', 'submit'].includes(gameOverState.gameOver?.primaryCta?.mode) &&
      nameInputState.nameInput === 'ABCDEFGHIJKLMN' &&
      nameInputState.hiddenMaxLength === 14 &&
      submittedRunbackState.scene === 'gameOver' &&
      submittedRunbackState.gameOver?.state === 'runback' &&
      submittedRunbackState.gameOver?.primaryCta?.mode === 'restart' &&
      submittedRunbackState.gameOver?.ceremonyTitle === 'ONE MORE RUN?' &&
      /^one_more_run_\d\d$/.test(submittedRunbackState.gameOver?.selectedCtaLine?.id || '') &&
      /ONE MORE RUN/i.test(noSlotCtaState.gameOver?.primaryCta?.label || '') &&
      noSlotCtaState.gameOver?.primaryCta?.mode === 'restart' &&
      noSlotCtaState.gameOver?.state === 'runback' &&
      retryCtaRestartedState.scene === 'play' &&
      retryCtaRestartedState.score === 0 &&
      firstMenuLaunchState.scene === 'play' &&
      returnMenuLaunchState.scene === 'play' &&
      returnMenuLaunchState.score === 0 &&
      returnMenuLaunchState.lives === 3 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    gameOver: gameOverState.gameOver,
    leaderboardFirst: {
      submittedScene: submittedRunbackState.scene,
      submittedState: submittedRunbackState.gameOver?.state || null,
      selectedCtaLine: submittedRunbackState.gameOver?.selectedCtaLine || null,
      primaryCta: gameOverState.gameOver?.primaryCta || null
    },
    retryCtaRestarted: {
      scene: retryCtaRestartedState.scene,
      score: retryCtaRestartedState.score,
      level: retryCtaRestartedState.level,
      lives: retryCtaRestartedState.lives,
      noSlotCta: noSlotCtaState.gameOver?.primaryCta || null
    },
    returnMenuLaunch: {
      first: {
        scene: firstMenuLaunchState.scene,
        score: firstMenuLaunchState.score,
        level: firstMenuLaunchState.level,
        lives: firstMenuLaunchState.lives
      },
      second: {
        scene: returnMenuLaunchState.scene,
        score: returnMenuLaunchState.score,
        level: returnMenuLaunchState.level,
        lives: returnMenuLaunchState.lives
      }
    },
    nameInput: nameInputState,
    alreadyUnlocked: alreadyUnlockedState.gameOver,
    pageErrors,
    consoleErrors,
    screenshot,
    runbackScreenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[gameover-motivation] PASS summary="${gameOverState.gameOver.unlockSummary}" screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
