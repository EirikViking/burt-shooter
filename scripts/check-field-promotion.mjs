import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.FIELD_PROMOTION_HOST || '127.0.0.1';
const port = Number(process.env.FIELD_PROMOTION_PORT || await findAvailablePort(4230));
const baseUrl = process.env.FIELD_PROMOTION_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.FIELD_PROMOTION_OUTPUT_DIR || `test-results/field-promotion-${timestamp()}`);

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
  throw new Error(`No available field promotion port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
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
    if (await canFetch(url) || !(await isPortAvailable(port))) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const baseArgs = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
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

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox']
});

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleEvents = [];
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }));

  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 15000 });

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) return { ok: false, reason: 'missing play scene' };

    const savedProgress = {
      version: 1,
      unlockTuningVersion: 2,
      pilotXp: 640,
      pilotRank: 0,
      highestPilotRank: 0
    };
    window.localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(savedProgress));
    game.hangarProgressAtRunStart = { ...savedProgress };
    game.rankIndex = 0;
    game.lastRankIndex = 0;
    game.fieldPromotionRankIndex = 0;
    game.score = 3600;
    game.level = 3;
    play.wavesCleared = 4;
    play.totalKills = 12;
    play.gameTime = 90;
    play.projectedFieldRankIndex = 0;
    play._lastRankUpSeen = 0;
    const beforeRankUps = play._rankUpCount || 0;
    player.setRank?.(0, 'field_promotion_check');

    const promoted = play.updateProjectedFieldPromotion?.('check');
    const stored = JSON.parse(window.localStorage.getItem('nova.hangarProgress.v1') || '{}');
    return {
      ok: Boolean(
        promoted &&
        game.rankIndex === 0 &&
        game.fieldPromotionRankIndex >= 1 &&
        game.getEffectiveRankIndex?.() >= 1 &&
        player.rankIndex >= 1 &&
        (play._rankUpCount || 0) > beforeRankUps &&
        stored.pilotRank === 0
      ),
      promoted,
      committedRank: game.rankIndex,
      fieldPromotionRank: game.fieldPromotionRankIndex,
      effectiveRank: game.getEffectiveRankIndex?.(),
      playerRank: player.rankIndex,
      rankUpCount: play._rankUpCount || 0,
      storedPilotRank: stored.pilotRank,
      storedPilotXp: stored.pilotXp
    };
  });

  await page.waitForTimeout(450);
  const screenshot = path.join(outputDir, 'field-promotion.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = {
    status: state.ok && consoleEvents.length === 0 ? 'passed' : 'failed',
    baseUrl,
    screenshot,
    state,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (report.status !== 'passed') {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(`[field-promotion] PASS projected=${state.fieldPromotionRank} committed=${state.committedRank} screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
