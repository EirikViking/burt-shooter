import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4476));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/highscore-chase-hud-${timestamp()}`);

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
  throw new Error(`No available highscore chase HUD port found starting at ${startPort}`);
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

async function setChase(score, target) {
  return page.evaluate(({ score, target }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    if (!game || !play || !hud) return { ok: false, reason: 'missing game/play/hud' };
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    game.score = score;
    game.highscoreChase = {
      targetScore: target,
      runMode: 'ranked',
      source: 'test_personal_best',
      syncingTarget: false,
      checkpoint: null,
      surpassed: score > target,
      milestones: new Set(),
      lastTauntAtMs: 0,
      tauntIndex: 0
    };
    hud.highscoreChaseDisplayKey = '';
    hud.highscoreChaseRenderKey = '';
    hud.updateHighscoreChase();
    return {
      ok: true,
      debug: hud.highscoreChaseGroup?._debugChase || null,
      text: {
        title: hud.highscoreChaseTitle?.text || '',
        target: hud.highscoreChaseTarget?.text || '',
        gap: hud.highscoreChaseGap?.text || ''
      }
    };
  }, { score, target });
}

try {
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.hud?.updateHighscoreChase, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const near = await setChase(930, 1000);
  await page.waitForTimeout(160);
  const nearScreenshot = path.join(outputDir, 'highscore-chase-near.png');
  await page.screenshot({ path: nearScreenshot, fullPage: true });

  const surpassed = await setChase(1120, 1000);
  await page.waitForTimeout(160);
  const surpassedScreenshot = path.join(outputDir, 'highscore-chase-surpassed.png');
  await page.screenshot({ path: surpassedScreenshot, fullPage: true });

  const failures = [];
  if (!near.ok) failures.push(near.reason || 'near state setup failed');
  if (!surpassed.ok) failures.push(surpassed.reason || 'surpassed state setup failed');
  if (!near.debug?.nearTarget) failures.push(`near-target state did not activate: ${JSON.stringify(near.debug)}`);
  if (near.debug?.surpassed) failures.push(`near-target state incorrectly surpassed: ${JSON.stringify(near.debug)}`);
  if ((near.debug?.tickCount || 0) !== 4) failures.push(`near-target marker count mismatch: ${JSON.stringify(near.debug)}`);
  if (!Number.isFinite(near.debug?.glintX)) failures.push(`near-target glint missing: ${JSON.stringify(near.debug)}`);
  if ((near.debug?.targetChevronCount || 0) < 3) failures.push(`near-target chevrons missing: ${JSON.stringify(near.debug)}`);
  if (!surpassed.debug?.surpassed) failures.push(`surpassed state did not activate: ${JSON.stringify(surpassed.debug)}`);
  if (surpassed.debug?.nearTarget) failures.push(`surpassed state should not be near-only: ${JSON.stringify(surpassed.debug)}`);
  if ((surpassed.debug?.tickCount || 0) !== 4) failures.push(`surpassed marker count mismatch: ${JSON.stringify(surpassed.debug)}`);
  if ((surpassed.debug?.victoryBurstCount || 0) < 6) failures.push(`surpassed victory burst missing: ${JSON.stringify(surpassed.debug)}`);
  if (!/OLD SCORE|HUMILIATED/i.test(surpassed.text?.gap || '')) failures.push(`surpassed text mismatch: ${JSON.stringify(surpassed.text)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshots: { near: nearScreenshot, surpassed: surpassedScreenshot },
    near,
    surpassed,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[highscore-chase-hud] ${failures.join('; ')}`);
  console.log(`[highscore-chase-hud] PASS near=${nearScreenshot} surpassed=${surpassedScreenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
