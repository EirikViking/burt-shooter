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

let server = null;
if (!process.env.CHECK_URL) {
  const command = viteCommand();
  server = spawn(command.command, [...command.args, '--host', host, '--port', String(port)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview:err] ${chunk}`));
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await canFetch(baseUrl)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
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
    return state.scene === 'play' &&
      state.gameOverInterlude?.active === true &&
      /GAME OVER|SPIEL VORBEI|FIN DE|FIM DE|游戏结束|ИГРА|게임|ゲーム/.test(String(state.gameOverInterlude?.label || ''));
  }, null, { timeout: 5000 });
  const interludeState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(interludeState.gameOverInterlude?.sfxKey === 'nova_game_over_drop', 'game-over interlude did not expose the dedicated game-over SFX key', interludeState.gameOverInterlude);
  assert((interludeState.gameOverInterlude?.cinematicLayers || 0) >= 24, 'game-over interlude is missing the cinematic VFX layer stack', interludeState.gameOverInterlude);

  await page.evaluate(() => window.advanceTime?.(1000));
  const heldState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(heldState.scene === 'play', 'game-over interlude did not hold inside gameplay before transition', heldState);
  assert(heldState.gameOverInterlude?.active === true, 'game-over interlude disappeared before its hold elapsed', heldState);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'gameover-interlude.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const remainingInterludeMs = Math.max(0, Number(heldState.gameOverInterlude?.durationMs || 0) - Number(heldState.gameOverInterlude?.elapsedMs || 0));
  await page.evaluate((ms) => window.advanceTime?.(ms), remainingInterludeMs + 260);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver';
  }, null, { timeout: 5000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.backdropLoaded === true;
  }, null, { timeout: 5000 });
  const finalState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(finalState.gameOver?.ceremonyTitle !== 'ONE MORE RUN?', 'game-over scene skipped to One More Run title', finalState.gameOver);
  assert(finalState.gameOver?.state !== 'runback', 'game-over result surface entered runback before the minimum hold', finalState.gameOver);
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
  console.log(`[gameover-interlude] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
