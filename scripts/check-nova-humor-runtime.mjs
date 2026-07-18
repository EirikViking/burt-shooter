import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4488);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/nova-humor-runtime-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available humor check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (process.env.CHECK_URL || await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry)
    ? [viteEntry, '--host', host, '--port', String(port), '--strictPort']
    : ['vite', '--host', host, '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const screenshots = {};
const states = {};
try {
  await page.goto(`${baseUrl}/?offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu' && window.__game?.scenes?.menu?.flavor, null, { timeout: 90000 });
  states.menu = await page.evaluate(() => {
    const scene = window.__game.scenes.menu;
    scene.rotateStory();
    return {
      humor: scene.menuHumorLine || '',
      briefing: scene.runModeExplainer?.text || ''
    };
  });
  await page.waitForTimeout(180);
  screenshots.menu = path.join(outputDir, '01-menu-cabinet-humor.png');
  await page.screenshot({ path: screenshots.menu, fullPage: true });

  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1&debug=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.setPaused, null, { timeout: 90000 });
  states.pause = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.setPaused(true);
    return play.getPauseDebugState();
  });
  await page.waitForTimeout(220);
  screenshots.pause = path.join(outputDir, '02-pause-cabinet-humor.png');
  await page.screenshot({ path: screenshots.pause, fullPage: true });

  states.wave = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.setPaused(false);
    play.destroyPauseOverlay();
    play.showWaveBonusEffect(1500, 'WAVE CLEARED!');
    return play.activeWaveBonusEffect?._debugWaveClearEffect || null;
  });
  await page.waitForTimeout(300);
  screenshots.wave = path.join(outputDir, '03-wave-clear-cabinet-humor.png');
  await page.screenshot({ path: screenshots.wave, fullPage: true });

  await page.waitForTimeout(3400);
  states.directive = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.showTacticalDirectiveCompletion({
      objectiveLabel: 'PHASE USES',
      rewardLabel: 'EXTRA RESCAN',
      momentumBonus: 450
    });
    return play.lastDirectiveHumor || null;
  });
  await page.waitForTimeout(260);
  screenshots.directive = path.join(outputDir, '04-directive-cabinet-humor.png');
  await page.screenshot({ path: screenshots.directive, fullPage: true });

  await page.evaluate(() => {
    window.__game.leaderboardView = 'local';
    window.__game.switchScene('highscore');
  });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'highscore' && window.__game?.scenes?.highscore?.comment, null, { timeout: 30000 });
  states.leaderboardEmpty = await page.evaluate(() => {
    const scene = window.__game.scenes.highscore;
    scene.applyLeaderboardResult({ status: 'empty', entries: [], sourceLabel: 'Local cabinet' });
    return { comment: scene.comment.text, humor: scene.lastLeaderboardHumor, status: scene.status };
  });
  await page.waitForTimeout(220);
  screenshots.leaderboardEmpty = path.join(outputDir, '05-leaderboard-empty-cabinet-humor.png');
  await page.screenshot({ path: screenshots.leaderboardEmpty, fullPage: true });

  states.leaderboardError = await page.evaluate(() => {
    const scene = window.__game.scenes.highscore;
    scene.applyLeaderboardResult({ status: 'unavailable', entries: [], sourceLabel: 'Steam' });
    return { comment: scene.comment.text, humor: scene.lastLeaderboardHumor, status: scene.status };
  });
  states.leaderboardLoaded = await page.evaluate(() => {
    const scene = window.__game.scenes.highscore;
    scene.applyLeaderboardResult({
      status: 'available',
      sourceLabel: 'Local cabinet',
      entries: [{ name: 'NOVA ACE', score: 123456, level: 8, rank_index: 4 }]
    });
    return { comment: scene.comment.text, humor: scene.lastLeaderboardHumor, status: scene.status };
  });

  assert(states.menu.humor.length > 12, 'menu humor line was empty');
  assert(states.menu.briefing.includes(states.menu.humor), 'menu briefing did not render its cabinet humor');
  assert(states.pause.humor?.category === 'pause', `pause humor missing: ${JSON.stringify(states.pause)}`);
  assert(states.pause.humor.text.length > 12, 'pause humor was empty');
  assert(states.wave?.humor?.category === 'wave_clear_quip', `wave humor missing: ${JSON.stringify(states.wave)}`);
  assert(states.wave.subtitleText === states.wave.humor.text, 'wave subtitle did not use the selected humor line');
  assert(states.directive?.category === 'directive_complete_quip', `directive humor missing: ${JSON.stringify(states.directive)}`);
  assert(states.leaderboardEmpty.humor?.category === 'leaderboard_empty', 'empty leaderboard humor missing');
  assert(states.leaderboardEmpty.comment === states.leaderboardEmpty.humor.text, 'empty leaderboard did not show its humor line');
  assert(states.leaderboardError.humor?.category === 'leaderboard_error', 'leaderboard error humor missing');
  assert(states.leaderboardLoaded.humor?.category === 'leaderboard_loaded', 'loaded leaderboard humor missing');
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join('; ')}`);

  const report = { ok: true, baseUrl, outputDir, screenshots, states, pageErrors, consoleErrors };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  if (server) server.kill();
}
