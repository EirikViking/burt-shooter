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
  7600, 7300, 7000, 6800, 6600, 6400, 6250, 6150, 6050, 6000
].map((score, index) => ({
  name: `GLB${index + 1}`,
  score,
  level: 9,
  rank_index: 12
}));

function assert(condition, message, details = undefined) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
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
  const globalSubmissions = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/highscores', async (route) => {
    if (route.request().method() === 'POST') {
      let body = {};
      try {
        body = JSON.parse(route.request().postData() || '{}');
      } catch {
        body = {};
      }
      globalSubmissions.push({
        name: String(body.name || body.playerName || '').slice(0, 32),
        score: Math.max(0, Math.floor(Number(body.score) || 0)),
        level: Math.max(1, Math.floor(Number(body.level) || 1)),
        rankIndex: Math.max(0, Math.floor(Number(body.rankIndex ?? body.rank_index) || 0))
      });
      await route.fulfill({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, id: globalSubmissions.length, score: body.score })
      });
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
  return { page, pageErrors, globalSubmissions };
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
    return state.scene === 'play' && state.gameOverInterlude?.active === true;
  }, null, { timeout: 5000 });
  const interludeState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(interludeState.gameOverInterlude?.label === 'GAME OVER', 'direct game.gameOver() skipped the in-game Game Over interlude', interludeState.gameOverInterlude);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.globalStatus !== 'checking';
  }, null, { timeout: 20000 });
  const arrivalState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(arrivalState.gameOver?.arrivalTitleActive === false, 'Game Over scene should not hold a second arrival/saving screen before the summary', arrivalState.gameOver);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.gameOver?.backdropLoaded === true;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function checkCeremony(browser, { score, expectedTier, titlePattern, shotName }) {
  const { page, pageErrors, globalSubmissions } = await preparePage(browser);
  const revealState = await forceGameOver(page, score);
  assert(revealState.gameOver.globalPlacementTier === expectedTier, `expected ${expectedTier}, got ${revealState.gameOver.globalPlacementTier}`);
  assert(titlePattern.test(revealState.gameOver.ceremonyTitle || ''), `unexpected title: ${revealState.gameOver.ceremonyTitle}`);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.gameOver?.state === 'input' && state.gameOver?.canEnterName === true;
  }, null, { timeout: 8000 });
  await page.keyboard.type('TEST ACE');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.gameOver?.state === 'submitted';
  }, null, { timeout: 20000 });
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const visibleText = [
    state.gameOver?.prompt,
    state.gameOver?.retryPrompt,
    state.gameOver?.primaryCta?.label,
    state.gameOver?.primaryCta?.hint,
    state.gameOver?.ceremonyTitle
  ].filter(Boolean).join(' ');
  assert(!/SAVING SCORE|SAVING LOCAL SCORE|SAVING TO STEAM|SAVING\.\.\./i.test(visibleText), 'Game Over ceremony shows transient saving copy', { visibleText, gameOver: state.gameOver });
  if (['number1', 'top3'].includes(expectedTier)) {
    const celebration = state.gameOver?.globalCelebration || {};
    assert(celebration.active === true, `expected active confetti celebration for ${expectedTier}`, celebration);
    assert(celebration.confettiCount >= (expectedTier === 'number1' ? 160 : 110), `expected stronger confetti for ${expectedTier}`, celebration);
  }
  const shouldSubmitGlobally = ['number1', 'top3', 'global'].includes(expectedTier);
  const submittedScore = Math.max(0, Math.floor(Number(state.gameOver?.score) || score));
  if (shouldSubmitGlobally) {
    assert(state.gameOver.globalStatus === 'submitted', `expected globalStatus submitted for ${expectedTier}`, state.gameOver);
    assert(state.gameOver.lastLeaderboardResult?.globalStatus === 'submitted', `expected lastLeaderboardResult globalStatus submitted for ${expectedTier}`, state.gameOver.lastLeaderboardResult);
    assert(globalSubmissions.length === 1, `expected one global POST for ${expectedTier}, got ${globalSubmissions.length}`, globalSubmissions);
    assert(globalSubmissions[0].score === submittedScore, `global POST score mismatch for ${expectedTier}`, { submitted: globalSubmissions[0], gameOverScore: submittedScore });
    assert(globalSubmissions[0].name === 'TEST ACE', `global POST name mismatch for ${expectedTier}`, globalSubmissions[0]);
  } else {
    assert(globalSubmissions.length === 0, `near-global should not POST to global leaderboard`, globalSubmissions);
    assert(state.gameOver.lastLeaderboardResult?.globalStatus !== 'submitted', 'near-global should not report submitted globally', state.gameOver.lastLeaderboardResult);
  }
  assert(pageErrors.length === 0, `page errors for ${expectedTier}: ${pageErrors.join('; ')}`);
  await page.screenshot({ path: path.join(outputDir, shotName), fullPage: true });
  await page.close();
  return {
    tier: state.gameOver.globalPlacementTier,
    title: state.gameOver.ceremonyTitle,
    finalTitle: state.gameOver.finalCeremonyTitle,
    placement: state.gameOver.globalPlacement?.placement || null,
    status: state.gameOver.leaderboardStatus,
    globalStatus: state.gameOver.globalStatus,
    submittedGlobally: globalSubmissions.length > 0,
    globalSubmissions
  };
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
      game.globalLeaderboardTargets = [
        { score: 50000 }, { score: 42000 }, { score: 36000 }, { score: 30000 },
        { score: 24000 }, { score: 20000 }, { score: 16000 }, { score: 12000 },
        { score: 9000 }, { score: 8000 }, { score: 7600 }, { score: 7300 },
        { score: 7000 }, { score: 6800 }, { score: 6600 }, { score: 6400 },
        { score: 6250 }, { score: 6150 }, { score: 6050 }, { score: 6000 }
      ];
      game.addScore(52000);
      game.addScore(250000);
      game.addScore(180000);
    });
    const cueState = await page.evaluate(() => JSON.parse(window.render_game_to_text()).globalLeaderboardCues);
    assert(cueState.global === true, 'near-global voice cue did not arm');
    assert(cueState.top3 === true, 'near-top-3 voice cue did not arm');
    assert(cueState.number1 === true, 'near-number-one voice cue did not arm');
    assert(pageErrors.length === 0, `page errors for live cues: ${pageErrors.join('; ')}`);
    results.push({ scenario: 'live_cues', cueState });
    await page.close();
  }

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
    titlePattern: /GLOBAL RANK #3|TOP THREE/i,
    shotName: 'top-three.png'
  }));
  console.log('[gameover-ceremony] checking global-slot ceremony');
  results.push(await checkCeremony(browser, {
    score: 7000,
    expectedTier: 'global',
    titlePattern: /GLOBAL RANK #\d+|GLOBAL RANK SAVED|GLOBAL SLOT/i,
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
