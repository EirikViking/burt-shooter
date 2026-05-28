import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4370));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/steam-leaderboard-mock-${timestamp()}`);

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

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
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

async function waitForGame(page) {
  await page.waitForFunction(() => Boolean(window.__game && window.render_game_to_text), null, { timeout: 15000 });
}

async function state(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;

try {
  server = await startPreviewServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome()
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleEvents = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }));
  await page.addInitScript(() => {
    window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
    window.__novaMockSteamPersonaName = 'STEAM ACE';
  });
  await page.goto(`${baseUrl}/?mockSteamLeaderboard=1`, { waitUntil: 'domcontentloaded' });
  await waitForGame(page);
  await page.evaluate(() => {
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'STEAM ACE');
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify([
      { playerName: 'STEAM ACE', score: 22000, level: 7, isCurrentPlayer: true, source: 'steam' },
      { playerName: 'ORBIT PAL', score: 18000, level: 6, source: 'steam' },
      { playerName: 'RIFT PAL', score: 14000, level: 5, source: 'steam' }
    ]));
    window.__game.leaderboardView = 'global';
    window.__game.switchScene('highscore');
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'highscore' && state.highscore?.status === 'LOADED';
  }, null, { timeout: 12000 });
  const globalState = await state(page);
  if (globalState.highscore?.tabs?.join(',') !== 'global,friends,local') {
    throw new Error(`Steam tabs missing: ${globalState.highscore?.tabs}`);
  }
  if (globalState.highscore?.sourceLabel !== 'Steam Global') {
    throw new Error(`Expected Steam Global source, got ${globalState.highscore?.sourceLabel}`);
  }

  await page.evaluate(() => window.__game.scenes.highscore.setLeaderboardView('friends'));
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.highscore?.activeLeaderboard === 'friends' && state.highscore?.status === 'LOADED';
  }, null, { timeout: 12000 });
  const friendsState = await state(page);
  if (friendsState.highscore?.sourceLabel !== 'Steam Friends') {
    throw new Error(`Expected Steam Friends source, got ${friendsState.highscore?.sourceLabel}`);
  }
  await page.screenshot({ path: path.join(outputDir, 'steam-friends-tab.png'), fullPage: true });

  await page.evaluate(() => {
    window.__game.score = 33333;
    window.__game.level = 8;
    window.__game.rankIndex = 10;
    window.__game.switchScene('gameOver');
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.scene === 'gameOver' && state.gameOver?.state === 'submitted';
  }, null, { timeout: 12000 });
  const gameOverState = await state(page);
  if (!gameOverState.gameOver?.steamSubmissionMode) throw new Error('Game over did not enter Steam submission mode');
  if (gameOverState.gameOver?.canEnterName) throw new Error('Steam submission should not require manual name entry');
  if (gameOverState.gameOver?.lastLeaderboardResult?.steamStatus !== 'submitted') {
    throw new Error(`Steam mock submission failed: ${JSON.stringify(gameOverState.gameOver?.lastLeaderboardResult)}`);
  }
  if (/ONE MORE RUN\?/i.test(gameOverState.gameOver?.ceremonyTitle || '')) {
    throw new Error('Steam game over skipped the result ceremony and landed on the runback title');
  }
  if (!/#1|RANK #1/i.test(`${gameOverState.gameOver?.ceremonyTitle || ''}\n${gameOverState.gameOver?.leaderboardStatus || ''}`)) {
    throw new Error(`Steam global placement was not visible: ${gameOverState.gameOver?.ceremonyTitle} / ${gameOverState.gameOver?.leaderboardStatus}`);
  }
  if (!gameOverState.gameOver?.primaryCta?.spinVisible) {
    throw new Error('One More Run CTA did not expose the rotating accent state');
  }
  await page.waitForTimeout(350);
  const ctaAfterSpin = (await state(page)).gameOver?.primaryCta;
  if (Math.abs((ctaAfterSpin?.spinRotation || 0) - (gameOverState.gameOver?.primaryCta?.spinRotation || 0)) < 0.01) {
    throw new Error('One More Run CTA rotating accent did not advance');
  }
  await page.screenshot({ path: path.join(outputDir, 'steam-gameover-submitted.png'), fullPage: true });

  const report = {
    status: 'passed',
    baseUrl,
    outputDir,
    tabs: globalState.highscore.tabs,
    friendsRows: friendsState.highscore.rows.length,
    steamGameOver: gameOverState.gameOver.lastLeaderboardResult,
    gameOverTitle: gameOverState.gameOver.ceremonyTitle,
    leaderboardStatus: gameOverState.gameOver.leaderboardStatus,
    primaryCta: ctaAfterSpin,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[steam-leaderboard-mock] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[steam-leaderboard-mock] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
