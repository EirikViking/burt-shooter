import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4340));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/debug-run-unranked-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
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

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
let highscorePostCount = 0;
let highscoreGetCount = 0;

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await page.route('**/api/highscores', async (route) => {
  const method = route.request().method();
  if (method === 'POST') highscorePostCount += 1;
  if (method === 'GET') highscoreGetCount += 1;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: method === 'POST' ? JSON.stringify({ ok: true }) : JSON.stringify([])
  });
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '3'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.runMode === 'unranked';
  }, { timeout: 30000 });

  await page.evaluate(() => {
    const game = window.__game;
    game.score = 999999;
    game.level = 9;
    game.rankIndex = 9;
    game.gameOver();
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'gameOver' && state?.runMode === 'unranked';
  }, { timeout: 10000 });

  await page.keyboard.press('Enter');
  await page.keyboard.type('QA');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);

  const result = await page.evaluate(() => {
    const game = window.__game;
    const scene = game?.scenes?.gameOver;
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const achievements = state?.achievements || {};
    return {
      textState: state,
      gameRunMode: game?.runMode || null,
      gameRunModeReason: game?.runModeReason || null,
      scoreSubmissionAllowed: game?.isScoreSubmissionAllowed?.() ?? null,
      pendingHighscore: game?.pendingHighscore || null,
      gameOverState: scene?.state || null,
      isRankedRun: scene?.isRankedRun ?? null,
      isQualified: scene?.isQualified ?? null,
      submitBlockedReason: scene?.submitBlockedReason || null,
      promptText: scene?.promptText?.text || null,
      finalScore: scene?.finalScore || 0,
      achievements
    };
  });

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'debug-run-unranked.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: Boolean(
      result.textState?.runMode === 'unranked' &&
      result.scoreSubmissionAllowed === false &&
      result.isRankedRun === false &&
      ['unranked', 'runback'].includes(result.gameOverState) &&
      result.submitBlockedReason === 'debug_route' &&
      result.pendingHighscore === null &&
      Array.isArray(result.achievements?.unlocked) &&
      result.achievements.unlocked.length === 0 &&
      result.achievements?.lastUnlocked === null &&
      highscorePostCount === 0 &&
      highscoreGetCount === 0 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    result,
    highscorePostCount,
    highscoreGetCount,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[debug-run-unranked] PASS runMode=${result.gameRunMode} postCount=${highscorePostCount} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
