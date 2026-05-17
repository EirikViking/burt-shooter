import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.TRAILER_CAPTURE_HOST || '127.0.0.1';
const explicitPort = process.env.TRAILER_CAPTURE_PORT ? Number(process.env.TRAILER_CAPTURE_PORT) : null;
const port = process.env.TRAILER_CAPTURE_URL ? null : (explicitPort || await findAvailablePort(Number(process.env.TRAILER_CAPTURE_PORT_START || 4373)));
const baseUrl = process.env.TRAILER_CAPTURE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.TRAILER_CAPTURE_OUTPUT_DIR || `release/steam-trailer/draft-${dateStamp()}`);
const viewport = {
  width: Number(process.env.TRAILER_CAPTURE_WIDTH || 1280),
  height: Number(process.env.TRAILER_CAPTURE_HEIGHT || 720)
};
const trailerName = 'nova-swarm-steam-trailer-visual-draft.webm';
const consoleEvents = [];
const pageErrors = [];
const badResponses = [];
const timeline = [];

function readBuildInfo() {
  const versionPath = path.resolve('public', 'version.json');
  if (!existsSync(versionPath)) return null;
  try {
    return JSON.parse(readFileSync(versionPath, 'utf8'));
  } catch (error) {
    return { error: error.message };
  }
}

function dateStamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('-');
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
  throw new Error(`No available trailer capture port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) {
    return { command: process.execPath, baseArgs: [viteEntry] };
  }
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', baseArgs: ['vite'] };
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canFetch(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  if (!existsSync(path.resolve('dist', 'index.html'))) {
    throw new Error('dist/index.html is missing. Run npm run build before capturing trailer footage.');
  }

  const { command, baseArgs } = viteCommand();
  const args = [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  if (!(await waitForServer(baseUrl))) {
    server.kill();
    throw new Error(`Preview server did not become ready at ${baseUrl}`);
  }
  return server;
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) next.searchParams.set(key, String(value));
  }
  return next.toString();
}

function observePage(page) {
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleEvents.push({ type, text: message.text().slice(0, 800) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({ status: response.status(), url: response.url(), method: response.request().method() });
    }
  });
}

async function waitForScene(page, sceneName, timeout = 15000) {
  await page.waitForFunction((expected) => window.__game?.currentSceneName === expected, sceneName, { timeout });
}

async function addBeat(page, label, durationMs) {
  await ensureUnpaused(page);
  const state = await collectState(page);
  timeline.push({
    label,
    durationMs,
    scene: state?.scene || null,
    level: state?.level ?? null,
    wave: state?.wave?.currentWaveNumber ?? null,
    audioContext: state?.audio?.currentMusicContext || null
  });
  console.log(`[trailer] ${label} ${Math.round(durationMs / 1000)}s`);
  const stepMs = 500;
  for (let elapsed = 0; elapsed < durationMs; elapsed += stepMs) {
    await page.waitForTimeout(Math.min(stepMs, durationMs - elapsed));
    await ensureUnpaused(page);
  }
}

async function collectState(page) {
  return page.evaluate(() => {
    try {
      return typeof window.render_game_to_text === 'function'
        ? JSON.parse(window.render_game_to_text())
        : null;
    } catch {
      return null;
    }
  });
}

async function waitForGameplayBackdrop(page) {
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return Boolean(play?.gameplayBackdrop?.parent && play?.gameplayBackdrop?.texture);
  }, null, { timeout: 15000 });
}

async function stabilizePlayer(page) {
  await page.evaluate(() => {
    const assist = () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const player = play?.player;
      if (play?.isPaused && typeof play.setPaused === 'function') play.setPaused(false);
      game?.inputManager?.setKeyPressed?.('Escape', false);
      game?.inputManager?.setKeyPressed?.('KeyP', false);
      game?.inputManager?.setKeyPressed?.('p', false);
      game?.inputManager?.setKeyPressed?.('P', false);
      if (game) game.lives = Math.max(game.lives || 0, 3);
      if (player) {
        player.invulnerable = true;
        player.invulnerableTime = 45000;
        if (typeof game?.getWidth === 'function') player.x = game.getWidth() / 2;
        if (typeof game?.getHeight === 'function') player.y = game.getHeight() * 0.82;
      }
      play?.bulletManager?.enemyBullets?.forEach((bullet) => {
        bullet.active = false;
      });
    };
    clearInterval(window.__steamTrailerAssist);
    window.__steamTrailerAssist = window.setInterval(assist, 120);
    assist();
  });
}

async function ensureUnpaused(page) {
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play) return;
    game?.inputManager?.setKeyPressed?.('Escape', false);
    game?.inputManager?.setKeyPressed?.('KeyP', false);
    game?.inputManager?.setKeyPressed?.('p', false);
    game?.inputManager?.setKeyPressed?.('P', false);
    if (play.isPaused && typeof play.setPaused === 'function') play.setPaused(false);
  });
}

async function showIntroAndMenu(page) {
  await page.goto(withQuery(baseUrl, { resetIntro: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem('nova_swarm_intro_seen_v1');
    } catch {}
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'intro', 30000);
  await page.mouse.click(viewport.width * 0.5, viewport.height * 0.55);
  await addBeat(page, 'story_intro_open', 4200);
  await page.keyboard.press('ArrowRight');
  await addBeat(page, 'story_intro_swarm', 2200);
  await page.keyboard.press('Escape');
  await waitForScene(page, 'menu', 15000);
  await addBeat(page, 'main_menu_identity', 2600);
  await page.evaluate(() => window.__game?.showShipSelect?.());
  await waitForScene(page, 'shipSelect', 15000);
  await addBeat(page, 'ship_select_variants', 3000);
}

async function showGameplay(page) {
  await page.evaluate(() => window.__game?.startGame?.());
  await waitForScene(page, 'play', 30000);
  await waitForGameplayBackdrop(page);
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.enemies?.length > 0, null, { timeout: 30000 });
  await stabilizePlayer(page);
  await page.keyboard.down('Space');
  await page.keyboard.down('ArrowRight');
  await addBeat(page, 'first_wave_lasers', 3200);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await addBeat(page, 'dodge_lane_shift', 2600);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowUp');
  await addBeat(page, 'formation_pressure', 2200);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('Space');
}

async function showBoss(page) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play', 30000);
  await waitForGameplayBackdrop(page);
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'BOSS_GATE', null, { timeout: 30000 });
  await addBeat(page, 'boss_inbound', 2600);
  await page.waitForFunction(() => {
    const enemyManager = window.__game?.scenes?.play?.enemyManager;
    return enemyManager?.state === 'BOSS_ACTIVE' && enemyManager?.boss?.active;
  }, null, { timeout: 30000 });
  await stabilizePlayer(page);
  await page.keyboard.down('Space');
  await addBeat(page, 'boss_pattern_fire', 4200);
  await page.keyboard.up('Space');
  await page.evaluate(() => {
    const boss = window.__game?.scenes?.play?.enemyManager?.boss;
    if (!boss) return;
    boss.invulnerableUntilMs = 0;
    boss.takeDamage((boss.health || boss.maxHealth || 1) + 9999);
  });
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'LEVEL_COMPLETE', null, { timeout: 10000 });
  await addBeat(page, 'boss_victory', 3200);
}

async function showGameOver(page) {
  await page.evaluate(() => {
    const game = window.__game;
    if (!game) return;
    if (game.scenes?.play) game.scenes.play.lastStandReadyAt = Date.now() + 60000;
    game.score = Math.max(game.score || 0, 5200);
    game.lives = 0;
    game.gameOver();
  });
  await waitForScene(page, 'gameOver', 10000);
  await addBeat(page, 'game_over_score_log', 3500);
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const server = await startPreviewServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--disable-gpu', '--no-sandbox']
  });
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: outputDir,
      size: viewport
    }
  });
  const page = await context.newPage();
  observePage(page);

  let videoPath = null;
  try {
    await showIntroAndMenu(page);
    await showGameplay(page);
    await showBoss(page);
    await showGameOver(page);
    const video = page.video();
    await page.close();
    videoPath = await video.path();
  } finally {
    await context.close();
    await browser.close();
    if (server) server.kill();
  }

  const trailerPath = path.join(outputDir, trailerName);
  if (videoPath) copyFileSync(videoPath, trailerPath);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    outputDir,
    build: readBuildInfo(),
    viewport,
    trailer: trailerName,
    notes: [
      'Visual trailer draft captured from the production build. Playwright video capture does not include game audio.',
      'Final Steam trailer still needs edited audio/music mix, title cards, and human approval.'
    ],
    timeline,
    consoleEvents,
    pageErrors,
    badResponses
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!videoPath || consoleEvents.length || pageErrors.length || badResponses.length) {
    console.error('[trailer] capture completed with issues');
    console.error(JSON.stringify({ videoPath, consoleEvents, pageErrors, badResponses }, null, 2));
    process.exit(1);
  }

  console.log(`[trailer] wrote ${trailerPath}`);
}

main().catch((error) => {
  console.error('[trailer] failed');
  console.error(error);
  process.exit(1);
});
