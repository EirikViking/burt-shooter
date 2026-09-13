import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4475));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/rank-up-clarity-${timestamp()}`);

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
  throw new Error(`No available rank-up clarity port found starting at ${startPort}`);
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

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
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

try {
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.createRankUpAnimation, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  let state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) return { ok: false, reason: 'missing play/player' };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.64;
    player.applyRankBoost?.('damage', 8000);
    player.update?.(1);
    play.createRankUpAnimation(4, game.getRankTitle?.(4) || 'Pilot');
    return {
      ok: true,
      badgeCount: play.uiOverlay?.children?.filter?.((child) => child?.label === 'ui_rank_up_badge')?.length || 0,
      badgeDebug: play.uiOverlay?.children?.find?.((child) => child?.label === 'ui_rank_up_badge')?._debugRankUpClarity || null,
      auraDebug: player.boostAura?._debugRankBoostAura || null,
      auraVisible: Boolean(player.boostAura?.visible),
      rankBoostType: player.rankBoost?.type || null
    };
  });

  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return play?.uiOverlay?.children
      ?.find?.((child) => child?.label === 'ui_rank_up_badge')
      ?._debugRankUpClarity?.authoredFlourishReady === true;
  }, null, { timeout: 3000 }).catch(() => {});
  state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    return {
      ok: Boolean(game && play && player),
      badgeCount: play?.uiOverlay?.children?.filter?.((child) => child?.label === 'ui_rank_up_badge')?.length || 0,
      badgeDebug: play?.uiOverlay?.children?.find?.((child) => child?.label === 'ui_rank_up_badge')?._debugRankUpClarity || null,
      auraDebug: player?.boostAura?._debugRankBoostAura || null,
      auraVisible: Boolean(player?.boostAura?.visible),
      rankBoostType: player?.rankBoost?.type || null
    };
  });
  await page.waitForTimeout(120);
  const screenshot = path.join(outputDir, 'rank-up-clarity.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if ((state.badgeCount || 0) < 1) failures.push('rank-up badge did not render');
  if (!state.badgeDebug?.authoredFlourishReady) failures.push(`rank-up authored flourish missing: ${JSON.stringify(state.badgeDebug)}`);
  if (state.badgeDebug?.visualLanguage !== 'authored_rank_broadcast_v2') failures.push(`rank-up visual language mismatch: ${JSON.stringify(state.badgeDebug)}`);
  if ((state.badgeDebug?.primitiveOrnamentCount || 0) !== 0) failures.push(`rank-up retained primitive ornaments: ${JSON.stringify(state.badgeDebug)}`);
  if (!state.badgeDebug?.rankArtworkReady) failures.push(`rank-up achievement artwork missing: ${JSON.stringify(state.badgeDebug)}`);
  if (state.rankBoostType !== 'damage') failures.push(`rank boost did not apply damage state: ${state.rankBoostType}`);
  if (!state.auraVisible) failures.push('rank boost aura not visible after update');
  if (state.auraDebug?.type !== 'damage') failures.push(`damage aura debug mismatch: ${JSON.stringify(state.auraDebug)}`);
  if ((state.auraDebug?.ticks || 0) < 8) failures.push(`damage aura tick count too low: ${JSON.stringify(state.auraDebug)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    state,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[rank-up-clarity] ${failures.join('; ')}`);
  console.log(`[rank-up-clarity] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
