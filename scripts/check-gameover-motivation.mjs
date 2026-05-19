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
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

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
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game?.scenes?.gameOver?.state === 'input', null, { timeout: 5000 });
  await page.keyboard.type('ABCDEFGHIJKLMNO');
  const nameInputState = await page.evaluate(() => ({
    state: window.__game?.scenes?.gameOver?.state || null,
    nameInput: window.__game?.scenes?.gameOver?.nameInput || '',
    hiddenMaxLength: window.__game?.scenes?.gameOver?.hiddenInput?.maxLength || null
  }));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__game?.scenes?.gameOver?.state === 'prompt', null, { timeout: 5000 });

  await page.evaluate(() => {
    window.__burtGamepadOverride = {
      id: 'gameover-restart-smoke',
      connected: true,
      axes: [0, 0],
      buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: index === 0, value: index === 0 ? 1 : 0 }))
    };
  });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play', null, { timeout: 5000 });
  const restartedState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));

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

  const report = {
    ok: Boolean(
      gameOverState.scene === 'gameOver' &&
      /NEW SHIP UNLOCKED|NEXT SHIP|HANGAR COMPLETE/i.test(gameOverState.gameOver?.unlockSummary || '') &&
      !/NEXT SHIP:\s*VIOLET FEINT/i.test(alreadyUnlockedSummary) &&
      !/NEED .*\b1 RANK\b/i.test(alreadyUnlockedSummary) &&
      /GAMEPAD A/i.test(gameOverState.gameOver?.prompt || '') &&
      nameInputState.nameInput === 'ABCDEFGHIJKLMN' &&
      nameInputState.hiddenMaxLength === 14 &&
      restartedState.scene === 'play' &&
      restartedState.score === 0 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    gameOver: gameOverState.gameOver,
    restarted: {
      scene: restartedState.scene,
      score: restartedState.score,
      level: restartedState.level,
      lives: restartedState.lives
    },
    nameInput: nameInputState,
    alreadyUnlocked: alreadyUnlockedState.gameOver,
    pageErrors,
    consoleErrors,
    screenshot
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
