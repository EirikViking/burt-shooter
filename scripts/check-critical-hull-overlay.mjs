import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4469));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/critical-hull-overlay-${timestamp()}`);

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
  throw new Error(`No available critical hull overlay port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.updateCriticalHullOverlay, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const active = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) return { ok: false, reason: 'missing play scene' };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    play.gameOverSequenceStarted = false;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    game.lives = 1;
    play.updateCriticalHullOverlay(1);
    return {
      ok: true,
      visible: Boolean(play.criticalHullOverlay?.visible),
      debug: { ...(play.criticalHullOverlay?._debugCriticalHull || {}) }
    };
  });

  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, 'critical-hull-overlay.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const hideStates = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    game.lives = 2;
    play.isPaused = false;
    play.updateCriticalHullOverlay(1);
    const recovered = { ...(play.criticalHullOverlay?._debugCriticalHull || {}) };
    game.lives = 1;
    play.isPaused = true;
    play.updateCriticalHullOverlay(1);
    const paused = { ...(play.criticalHullOverlay?._debugCriticalHull || {}) };
    play.isPaused = false;
    game.lives = 0;
    play.updateCriticalHullOverlay(1);
    const dead = { ...(play.criticalHullOverlay?._debugCriticalHull || {}) };
    return { recovered, paused, dead };
  });

  const failures = [];
  if (!active.ok) failures.push(active.reason || 'state setup failed');
  if (!active.visible || !active.debug?.visible) failures.push(`critical overlay was not visible: ${JSON.stringify(active)}`);
  if (active.debug?.lives !== 1) failures.push(`critical overlay lives debug mismatch: ${active.debug?.lives}`);
  if ((active.debug?.edge || 0) < 10) failures.push(`critical edge too small: ${active.debug?.edge}`);
  if ((active.debug?.hotAlpha || 0) <= 0.1) failures.push(`critical overlay alpha too low: ${active.debug?.hotAlpha}`);
  if (hideStates.recovered?.visible) failures.push(`overlay should hide after life recovery: ${JSON.stringify(hideStates.recovered)}`);
  if (hideStates.paused?.visible) failures.push(`overlay should hide while paused: ${JSON.stringify(hideStates.paused)}`);
  if (hideStates.dead?.visible) failures.push(`overlay should hide when dead: ${JSON.stringify(hideStates.dead)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    active,
    hideStates,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[critical-hull-overlay] ${failures.join('; ')}`);
  console.log(`[critical-hull-overlay] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
