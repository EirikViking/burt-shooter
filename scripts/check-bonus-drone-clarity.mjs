import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4471));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/bonus-drone-clarity-${timestamp()}`);

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
  throw new Error(`No available bonus drone clarity port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.spawnAmbientBonusDrone, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) return { ok: false, reason: 'missing play scene' };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    for (const drone of play.ambientBonusDrones || []) {
      drone.active = false;
      drone.sprite?.parent?.removeChild?.(drone.sprite);
    }
    play.ambientBonusDrones = [];

    const place = (type, x, y, vx, vy) => {
      play.spawnAmbientBonusDrone(type);
      const drone = play.ambientBonusDrones[play.ambientBonusDrones.length - 1];
      drone.x = x;
      drone.y = y;
      drone.vx = vx;
      drone.vy = vy;
      drone.update(1, 2);
      return {
        type: drone.type,
        active: drone.active,
        debug: { ...(drone.sprite?._debugBonusClarity || {}) },
        edgeDebug: { ...(drone.edgeMarker?.__debugBonusEdgeMarker || {}) },
        children: (drone.sprite?.children || []).map((child) => child.label || child.constructor?.name || 'node')
      };
    };

    const hazard = place('HAZARD', game.getWidth() * 0.38, game.getHeight() * 0.42, 2.4, 1.7);
    const powerup = place('POWERUP', game.getWidth() * 0.62, game.getHeight() * 0.42, -1.2, 0.8);
    const offscreen = place('POWERUP', game.getWidth() * 0.78, -42, -1.1, 0.8);
    return { ok: true, hazard, powerup, offscreen, count: play.ambientBonusDrones.length };
  });

  await page.waitForTimeout(240);
  const screenshot = path.join(outputDir, 'bonus-drone-clarity.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (state.count !== 3) failures.push(`expected three drones, saw ${state.count}`);
  if (state.hazard?.debug?.intent !== 'shoot') failures.push(`hazard intent mismatch: ${JSON.stringify(state.hazard)}`);
  if (state.powerup?.debug?.intent !== 'collect') failures.push(`powerup intent mismatch: ${JSON.stringify(state.powerup)}`);
  if (!state.hazard?.debug?.halo || !state.hazard?.debug?.glyph || !state.hazard?.debug?.trail) failures.push(`hazard clarity missing: ${JSON.stringify(state.hazard)}`);
  if (!state.powerup?.debug?.halo || !state.powerup?.debug?.glyph || !state.powerup?.debug?.trail) failures.push(`powerup clarity missing: ${JSON.stringify(state.powerup)}`);
  if (state.hazard?.debug?.edgeMarker || state.powerup?.debug?.edgeMarker) failures.push(`onscreen drones should not show edge markers: ${JSON.stringify({ hazard: state.hazard, powerup: state.powerup })}`);
  if (!state.offscreen?.debug?.edgeMarker || state.offscreen?.edgeDebug?.reason !== 'offscreen_edge') failures.push(`offscreen bonus drone edge marker missing: ${JSON.stringify(state.offscreen)}`);
  if ((state.offscreen?.edgeDebug?.edgeArrowCount || 0) < 1) failures.push(`offscreen bonus drone edge arrow missing: ${JSON.stringify(state.offscreen?.edgeDebug)}`);
  if ((state.offscreen?.edgeDebug?.anchor?.y || 999) > 100) failures.push(`offscreen bonus drone marker should clamp near top edge: ${JSON.stringify(state.offscreen?.edgeDebug)}`);
  if ((state.hazard?.debug?.trailAlpha || 0) <= 0.1) failures.push(`hazard trail alpha too low: ${state.hazard?.debug?.trailAlpha}`);
  if ((state.powerup?.debug?.trailAlpha || 0) <= 0.1) failures.push(`powerup trail alpha too low: ${state.powerup?.debug?.trailAlpha}`);
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
  assert(report.ok, `[bonus-drone-clarity] ${failures.join('; ')}`);
  console.log(`[bonus-drone-clarity] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
