import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4496));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/score-popup-readability-${timestamp()}`);

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
  throw new Error(`No available score popup readability port found starting at ${startPort}`);
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.scorePopupManager, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.scorePopupManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing score popup manager' };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    manager.cleanup();

    const centerX = game.getWidth() * 0.52;
    const centerY = game.getHeight() * 0.42;
    manager.addScorePopup(centerX, centerY, 60, { comboEligible: false });
    manager.addScorePopup(centerX + 3, centerY + 2, 640, { comboEligible: false, type: 'score' });
    manager.addScorePopup(centerX + 5, centerY + 3, 180, {
      comboEligible: false,
      color: 0xff66ff,
      accent: 0xffffff,
      prefix: 'NEAR MISS x5',
      type: 'nearMiss',
      fontSize: 21,
      maxLifetime: 1050
    });
    manager.addScorePopup(centerX + 7, centerY + 5, 40, { comboEligible: true });
    manager.addScorePopup(centerX + 9, centerY + 6, 40, { comboEligible: true });
    manager.addScorePopup(centerX + 11, centerY + 7, 40, { comboEligible: true });
    manager.update(2);

    return {
      ok: true,
      popups: manager.popups.map((popup, index) => ({
        index,
        text: popup.sprite?.text || popup.sprite?.__novaScorePopupText || '',
        type: popup.sprite?.__novaScorePopupType || popup.type,
        active: popup.active,
        x: Math.round(popup.x || 0),
        y: Math.round(popup.y || 0),
        bounds: (() => {
          const b = popup.sprite?.getBounds?.();
          return b ? {
            x: Math.round(b.x),
            y: Math.round(b.y),
            width: Math.round(b.width),
            height: Math.round(b.height)
          } : null;
        })(),
        debug: popup.sprite?.__debugScorePopup || null,
        childLabels: (popup.sprite?.children || []).map((child) => child.label || child.constructor?.name || 'node')
      })),
      comboCount: manager.comboCount
    };
  });

  await page.waitForTimeout(160);
  const screenshot = path.join(outputDir, 'score-popup-readability.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if ((state.popups || []).length < 6) failures.push(`expected 6 popups, saw ${state.popups?.length || 0}`);
  for (const popup of state.popups || []) {
    if (!popup.active) failures.push(`popup inactive too early: ${JSON.stringify(popup)}`);
    if (popup.debug?.major) {
      if (!popup.debug?.framed) failures.push(`major popup missing framed debug: ${JSON.stringify(popup)}`);
      if (!popup.childLabels?.includes?.('scorePopupBackplate')) failures.push(`major popup missing backplate: ${JSON.stringify(popup.childLabels)}`);
      if (!popup.childLabels?.includes?.('scorePopupTicks')) failures.push(`major popup missing ticks: ${JSON.stringify(popup.childLabels)}`);
      if ((popup.debug?.frameWidth || 0) < 50 || (popup.debug?.frameHeight || 0) < 20) failures.push(`major popup frame too small: ${JSON.stringify(popup.debug)}`);
    } else {
      if (popup.debug?.framed) failures.push(`routine popup should be lightweight: ${JSON.stringify(popup)}`);
      if (popup.childLabels?.includes?.('scorePopupBackplate')) failures.push(`routine popup should not have a backplate: ${JSON.stringify(popup.childLabels)}`);
      if (popup.childLabels?.includes?.('scorePopupTicks')) failures.push(`routine popup should not have signal ticks: ${JSON.stringify(popup.childLabels)}`);
    }
  }
  const major = (state.popups || []).filter((popup) => popup.debug?.major);
  if (major.length < 2) failures.push(`expected at least two major/near-miss/combo popups: ${JSON.stringify(state.popups)}`);
  const majorScore = (state.popups || []).find((popup) => popup.debug?.major && !popup.debug?.combo && !popup.debug?.nearMiss);
  if ((majorScore?.debug?.majorValueBarCount || 0) < 3) failures.push(`major score popup missing value bars: ${JSON.stringify(majorScore)}`);
  const nearMiss = (state.popups || []).find((popup) => popup.debug?.nearMiss);
  if (!nearMiss) failures.push(`near-miss popup did not keep type styling: ${JSON.stringify(state.popups)}`);
  const combo = (state.popups || []).find((popup) => popup.debug?.combo);
  if (!combo) failures.push(`combo popup did not keep combo styling: ${JSON.stringify(state.popups)}`);
  if (state.comboCount !== 3) failures.push(`focused combo probe should stop at count 3, saw ${state.comboCount}`);
  if ((state.popups || []).filter((popup) => popup.debug?.combo).length !== 1) failures.push(`only the combo milestone should use a combo frame: ${JSON.stringify(state.popups)}`);
  if ((combo?.debug?.comboSignalPipCount || 0) < 3) failures.push(`combo popup missing signal pips: ${JSON.stringify(combo)}`);
  const clustered = (state.popups || []).filter((popup) => (popup.debug?.clusterIndex || 0) > 0);
  if (clustered.length < 3) failures.push(`cluster de-overlap did not engage enough: ${JSON.stringify(state.popups)}`);
  const uniquePositions = new Set((state.popups || []).map((popup) => `${popup.x},${popup.y}`));
  if (uniquePositions.size < 4) failures.push(`clustered popups collapsed into too few positions: ${JSON.stringify(state.popups)}`);
  for (let i = 0; i < (state.popups || []).length; i += 1) {
    for (let j = i + 1; j < (state.popups || []).length; j += 1) {
      const a = state.popups[i];
      const b = state.popups[j];
      if (boundsOverlap(a.bounds, b.bounds, 2)) {
        failures.push(`popup bounds overlap: ${JSON.stringify({ a, b })}`);
      }
    }
  }
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
  assert(report.ok, `[score-popup-readability] ${failures.join('; ')}`);
  console.log(`[score-popup-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}

function boundsOverlap(a, b, margin = 0) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  );
}
