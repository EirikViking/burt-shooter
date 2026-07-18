import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4382));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/gameover-interlude-${timestamp()}`);

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

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function assert(condition, message, details = undefined) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function withQuery(url, params) {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) parsed.searchParams.set(key, value);
  return parsed.toString();
}

let server = null;
if (!process.env.CHECK_URL) {
  const command = viteCommand();
  server = spawn(command.command, [...command.args, '--host', host, '--port', String(port)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview:err] ${chunk}`));
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await canFetch(baseUrl)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(withQuery(baseUrl, { autostart: '1', controlSmoke: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && Boolean(window.__game?.scenes?.play?.player);
  }, null, { timeout: 30000 });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    game.lives = 1;
    play.debugInvincible = false;
    if (player) {
      player.invulnerable = false;
      player.invulnerableTime = 0;
      player.shieldActive = false;
    }
    game.loseLife();
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const play = window.__game?.scenes?.play;
    return state.scene === 'play' &&
      play?.gameOverSequenceStarted === true &&
      Boolean(play?.gameOverAnimationLayer?.parent) &&
      state.gameOverInterlude?.active !== true;
  }, null, { timeout: 5000 });

  const interludeState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const ceremonyLayers = await page.evaluate(() => window.__game?.scenes?.play?.gameOverAnimationLayer?.children?.length || 0);
  assert(ceremonyLayers >= 4, 'single game-over ceremony is missing its title/score visual stack', { ceremonyLayers });
  assert(interludeState.gameOverInterlude?.active !== true, 'normal final death started the duplicate legacy interlude', interludeState.gameOverInterlude);

  await page.evaluate(() => window.advanceTime?.(700));
  const heldState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(heldState.scene === 'play', 'single game-over ceremony did not hold briefly inside gameplay', heldState);
  assert(heldState.gameOverInterlude?.active !== true, 'duplicate game-over interlude appeared during the hold', heldState);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'gameover-interlude.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  await page.evaluate(() => window.advanceTime?.(1100));
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.backdropLoaded === true;
  }, null, { timeout: 10000 });

  const finalState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(finalState.gameOver?.backdropLoaded === true, 'game-over scene did not load its generated ceremony art', finalState.gameOver);

  const report = {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    interludeState,
    heldState,
    finalGameOver: finalState.gameOver,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  assert(report.ok, 'page errors during game-over interlude check', report);
  console.log(`[gameover-interlude] PASS single-ceremony screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
