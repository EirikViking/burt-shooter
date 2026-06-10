import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4361));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ui-readability-${timestamp()}`);
const viewport = {
  width: Number(process.env.CHECK_WIDTH) || 3840,
  height: Number(process.env.CHECK_HEIGHT) || 2160
};

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
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
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
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  mkdirSync(outputDir, { recursive: true });
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.hud;
  }, null, { timeout: 30000 });

  const metrics = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const hud = play?.hud;
    play.introActive = false;
    play.introComplete = true;
    play.player?.applyPowerup?.('shield');
    hud?.update?.();
    return {
      viewport: {
        width: window.__game?.getWidth?.() || 0,
        height: window.__game?.getHeight?.() || 0
      },
      scoreFont: Number(hud?.scoreText?.style?.fontSize || 0),
      missionLabelFont: Number(hud?.missionLabel?.style?.fontSize || 0),
      missionTextFont: Number(hud?.missionText?.style?.fontSize || 0),
      locationFont: Number(hud?.locationText?.style?.fontSize || 0),
      rankFont: Number(hud?.rankText?.style?.fontSize || 0),
      activePowerupTitleFont: Number(hud?.activePowerupTitle?.style?.fontSize || 0),
      activePowerupRowFont: Number(hud?.activePowerupRows?.[0]?.label?.style?.fontSize || 0),
      activePowerupMetaFont: Number(hud?.activePowerupRows?.[0]?.meta?.style?.fontSize || 0),
      activePowerupVisible: Boolean(hud?.activePowerupGroup?.visible)
    };
  });

  const failures = [];
  if (metrics.scoreFont < 20) failures.push(`scoreFont ${metrics.scoreFont} < 20`);
  if (metrics.missionLabelFont < 12) failures.push(`missionLabelFont ${metrics.missionLabelFont} < 12`);
  if (metrics.missionTextFont < 17) failures.push(`missionTextFont ${metrics.missionTextFont} < 17`);
  if (metrics.locationFont < 16) failures.push(`locationFont ${metrics.locationFont} < 16`);
  if (metrics.rankFont < 15) failures.push(`rankFont ${metrics.rankFont} < 15`);
  if (!metrics.activePowerupVisible) failures.push('active powerup HUD did not become visible');
  if (metrics.activePowerupTitleFont < 12) failures.push(`activePowerupTitleFont ${metrics.activePowerupTitleFont} < 12`);
  if (metrics.activePowerupRowFont < 14) failures.push(`activePowerupRowFont ${metrics.activePowerupRowFont} < 14`);
  if (metrics.activePowerupMetaFont < 12) failures.push(`activePowerupMetaFont ${metrics.activePowerupMetaFont} < 12`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    viewport,
    metrics,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[ui-readability] ${failures.join('; ')}`);
  console.log(`[ui-readability] PASS ${viewport.width}x${viewport.height} mission=${metrics.missionTextFont} powerup=${metrics.activePowerupRowFont} report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
