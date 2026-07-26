import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4523));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/wave-clear-effect-${timestamp()}`);

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
  throw new Error(`No available wave-clear effect port found starting at ${startPort}`);
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
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => window.__game?.scenes?.play?.showWaveBonusEffect, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) return { ok: false, reason: 'missing play scene' };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    play.clearToastState?.();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);

    play.showWaveBonusEffect(1500, 'WAVE CLEARED!', {
      compact: true,
      subtitle: 'NEXT WAVE 2/5',
      sfxKey: 'nova_wave_clear_sweep'
    });

    const effect = play.uiContainer?.children?.find?.((child) => child?.label === 'ui_wave_bonus_effect');
    const labels = (effect?.children || []).map((child) => child?.label || child?.constructor?.name || 'node');
    const flourish = effect?.children?.find?.((child) => child?.label === 'waveClearAuthoredFlourish');
    return {
      ok: true,
      effectCount: play.uiContainer?.children?.filter?.((child) => child?.label === 'ui_wave_bonus_effect')?.length || 0,
      labels,
      debug: effect?._debugWaveClearEffect || null,
      effectAlpha: Number(effect?.alpha || 0),
      flourishAlpha: Number(flourish?.alpha || 0),
      screen: { width: game.getWidth(), height: game.getHeight() }
    };
  });

  await page.waitForTimeout(300);
  const screenshot = path.join(outputDir, 'wave-clear-effect.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if ((state.effectCount || 0) !== 1) failures.push(`expected one wave clear effect, saw ${state.effectCount}`);
  if (!state.labels?.includes?.('waveClearAuthoredFlourish')) failures.push(`wave clear authored flourish missing: ${JSON.stringify(state.labels)}`);
  if (state.debug?.authoredFlourishCount !== 1 || state.debug?.authoredFlourishReady !== true) failures.push(`wave clear authored flourish not ready: ${JSON.stringify(state.debug)}`);
  if (state.debug?.visualLanguage !== 'authored_victory_flourish_v3') failures.push(`wave clear visual language mismatch: ${JSON.stringify(state.debug)}`);
  if (state.debug?.primitiveOrnamentCount !== 0) failures.push(`wave clear retained primitive ornament: ${JSON.stringify(state.debug)}`);
  if ((state.debug?.ringCount || 0) !== 0) failures.push(`wave clear retained target rings: ${JSON.stringify(state.debug)}`);
  if ((state.debug?.glintCount || 0) !== 0) failures.push(`wave clear retained star glints: ${JSON.stringify(state.debug)}`);
  if ((state.debug?.accentRailCount || 0) !== 0) failures.push(`wave clear retained accent rails: ${JSON.stringify(state.debug)}`);
  if (!state.debug?.subtitle) failures.push(`wave clear subtitle flag missing: ${JSON.stringify(state.debug)}`);
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
  assert(report.ok, `[wave-clear-effect] ${failures.join('; ')}`);
  console.log(`[wave-clear-effect] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
