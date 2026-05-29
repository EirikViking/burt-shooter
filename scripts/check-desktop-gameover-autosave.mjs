import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4356));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/desktop-gameover-autosave-${timestamp()}`);

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

function assert(condition, message, details = {}) {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
const consoleErrors = [];
const desktopScores = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.route('**/api/highscores', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      desktopScores.push({
        name: String(body?.name || 'STEAM PILOT').slice(0, 14),
        score: Math.max(0, Math.floor(Number(body?.score) || 0)),
        level: Math.max(1, Math.floor(Number(body?.level) || 1)),
        rankIndex: Math.max(0, Math.floor(Number(body?.rankIndex) || 0)),
        timestamp: new Date().toISOString()
      });
      desktopScores.sort((a, b) => b.score - a.score);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ scores: desktopScores.slice(0, 20), localPlacement: 1 })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ scores: desktopScores.slice(0, 20) })
    });
  });
  await page.addInitScript(() => {
    window.__NOVA_SWARM_DESKTOP__ = true;
    localStorage.clear();
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 0, bestRank: 0, bestLevel: 1 }));
  });
  await page.goto(`${baseUrl}/?desktop=1&autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.evaluate(() => {
    const game = window.__game;
    game.score = 504;
    game.level = 1;
    game.rankIndex = 0;
    game.lives = 1;
    game.loseLife();
  });

  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && state.gameOverInterlude?.active === true;
    } catch {
      return false;
    }
  }, null, { timeout: 5000 });
  const interludeState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const activeToastText = [
    ...(interludeState.toast?.active || []).map((toast) => toast.message),
    interludeState.toast?.current?.message
  ].filter(Boolean).join(' ');
  assert(/GAME OVER/i.test(interludeState.gameOverInterlude?.label || ''), 'in-game game-over interlude did not show the Game Over celebration', {
    gameOverInterlude: interludeState.gameOverInterlude
  });
  assert(!/LOW LIFE|LIFE LOST/i.test(activeToastText), 'low-life/life-lost message is visible during game-over interlude', {
    activeToastText,
    toast: interludeState.toast
  });

  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'gameOver' && ['submitted', 'runback'].includes(state.gameOver?.state);
    } catch {
      return false;
    }
  }, null, { timeout: 15000 });
  await page.waitForTimeout(350);

  const firstState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page.waitForTimeout(350);
  const secondState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(180);
  const focusState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const persisted = await page.evaluate(() => ({
    hangar: JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}'),
    highscores: JSON.parse(localStorage.getItem('novaSwarm.localLeaderboard.v2') || '[]')
  }));

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'desktop-gameover-autosave.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const gameOver = focusState.gameOver || secondState.gameOver || {};
  const visibleText = [
    gameOver.retryPrompt,
    gameOver.primaryCta?.label,
    gameOver.primaryCta?.hint,
    gameOver.ceremonyTitle
  ].filter(Boolean).join(' ');

  assert(gameOver.state === 'submitted', 'desktop game-over did not auto-submit to celebration', { gameOver });
  assert(gameOver.canEnterName === false, 'desktop game-over still allows manual name entry', { gameOver });
  assert(gameOver.primaryCta?.mode === 'restart', 'desktop game-over primary CTA is not restart', { primaryCta: gameOver.primaryCta });
  assert(/ONE MORE RUN/i.test(gameOver.primaryCta?.label || ''), 'desktop game-over is missing one-more-run CTA', { primaryCta: gameOver.primaryCta });
  assert(gameOver.primaryCta?.spinVisible === true, 'desktop game-over CTA spin/glow is not visible', { primaryCta: gameOver.primaryCta });
  assert(Math.abs((gameOver.primaryCta?.spinRotation || 0) - (firstState.gameOver?.primaryCta?.spinRotation || 0)) > 0.01, 'desktop game-over CTA is not animating', {
    before: firstState.gameOver?.primaryCta,
    after: gameOver.primaryCta
  });
  assert(gameOver.ceremonyTitle !== 'ONE MORE RUN?', 'desktop game-over skipped celebration title', { gameOver });
  assert(!/ENTER PILOT NAME|SUBMIT SCORE|TYPE NAME|NAME:/i.test(visibleText), 'desktop game-over still shows manual name-copy', { visibleText });
  assert(!/SAVING SCORE|SAVING LOCAL SCORE|SAVING TO STEAM|SAVING\.\.\./i.test(visibleText), 'desktop auto-save still shows transient saving copy', { visibleText });
  assert((persisted.hangar.pilotXp || 0) > 0 && (persisted.hangar.totalRuns || 0) >= 1, 'hangar progress did not persist after desktop run', persisted);
  assert((persisted.highscores[0]?.score || 0) >= 504, 'desktop local score did not persist', persisted);
  assert(pageErrors.length === 0 && consoleErrors.length === 0, 'browser errors occurred', { pageErrors, consoleErrors });

  const leaderboardCta = gameOver.leaderboardCta;
  assert(leaderboardCta?.visible && leaderboardCta.width > 0 && leaderboardCta.height > 0, 'leaderboard CTA is not available from game-over', { leaderboardCta });
  const hangarCta = gameOver.hangarCta;
  assert(hangarCta?.visible && hangarCta.width > 0 && hangarCta.height > 0, 'hangar CTA is not available from game-over', { hangarCta });
  const mainMenuCta = gameOver.mainMenuCta;
  assert(mainMenuCta?.visible && mainMenuCta.width > 0 && mainMenuCta.height > 0, 'main menu CTA is not available from game-over', { mainMenuCta });
  assert(Math.abs((leaderboardCta.y || 0) - (hangarCta.y || 0)) < 6, 'leaderboard and hangar CTAs are not aligned', { leaderboardCta, hangarCta });
  assert(Math.abs((hangarCta.y || 0) - (mainMenuCta.y || 0)) < 8, 'secondary CTAs are not aligned', { leaderboardCta, hangarCta, mainMenuCta });
  for (const [label, cta] of [['primary', gameOver.primaryCta], ['leaderboard', leaderboardCta], ['hangar', hangarCta], ['mainMenu', mainMenuCta]]) {
    assert(
      cta.x >= 0 && cta.y >= 0 && cta.x + cta.width <= 1920 && cta.y + cta.height <= 1080,
      `${label} CTA moved off screen after focus/resize`,
      { cta }
    );
  }
  await page.mouse.click(leaderboardCta.x + leaderboardCta.width / 2, leaderboardCta.y + leaderboardCta.height / 2);
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'highscore' && state.highscore?.runAgainCta?.visible;
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
  const leaderboardFirst = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page.waitForTimeout(350);
  const leaderboardSecond = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const leaderboardScreenshot = path.join(outputDir, 'leaderboard-one-more-run.png');
  await page.screenshot({ path: leaderboardScreenshot, fullPage: true });
  const runAgain = leaderboardSecond.highscore?.runAgainCta || {};
  assert(/ONE MORE RUN/i.test(runAgain.label || ''), 'leaderboard is missing one-more-run CTA', { runAgain });
  assert(runAgain.spinVisible === true, 'leaderboard one-more-run CTA spin/glow is not visible', { runAgain });
  assert(Math.abs((runAgain.spinRotation || 0) - (leaderboardFirst.highscore?.runAgainCta?.spinRotation || 0)) > 0.01, 'leaderboard one-more-run CTA is not animating', {
    before: leaderboardFirst.highscore?.runAgainCta,
    after: runAgain
  });
  const runAgainBounds = runAgain.bounds || runAgain;
  await page.mouse.click(runAgainBounds.x + runAgainBounds.width / 2, runAgainBounds.y + runAgainBounds.height / 2);
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && state.player?.active;
    } catch {
      return false;
    }
  }, null, { timeout: 12000 });
  await page.waitForTimeout(3600);
  const playBeforeInput = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowLeft');
  const playAfterInput = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    Number(playAfterInput.player?.x) < Number(playBeforeInput.player?.x) - 1,
    'keyboard movement did not work after one-more-run restart',
    { before: playBeforeInput.player, after: playAfterInput.player }
  );

  const report = {
    ok: true,
    baseUrl,
    screenshot,
    leaderboardScreenshot,
    gameOver,
    leaderboard: leaderboardSecond.highscore,
    restartedPlay: {
      before: playBeforeInput.player,
      after: playAfterInput.player
    },
    persisted,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[desktop-gameover-autosave] PASS screenshot=${screenshot}`);
} catch (error) {
  const report = {
    ok: false,
    message: error.message,
    details: error.details || null,
    pageErrors,
    consoleErrors
  };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
