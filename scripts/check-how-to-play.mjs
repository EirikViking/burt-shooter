import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4355));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/how-to-play-${timestamp()}`);

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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForState(page, predicate, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await readState(page);
    if (predicate(latest)) return latest;
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify({
    scene: latest?.scene,
    overlays: latest?.overlays,
    menu: latest?.menu?.focusedOption,
    howToPlay: latest?.howToPlayOverlay
  })}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertOverlayLayout(state, label) {
  const overlay = state.howToPlayOverlay;
  const layout = overlay?.layout;
  assert(overlay?.cardCount >= 7, `${label} missing help cards`);
  assert(layout?.cards?.length === overlay.cardCount, `${label} card layout count mismatch`);
  assert(!layout.layoutWarnings?.length, `${label} layout warnings: ${(layout.layoutWarnings || []).join('; ')}`);
  assert(layout.panel?.width > 500 && layout.panel?.height > 420, `${label} panel too small`);
  assert(layout.footer?.y > Math.max(...layout.cards.map((card) => card.y + card.height)), `${label} footer overlaps card grid`);
  assert(layout.button?.y >= layout.footer?.y, `${label} back button escaped footer rail`);
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  mkdirSync(outputDir, { recursive: true });

  await page.goto(withQuery(baseUrl, { skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  const menu = await waitForState(page, (state) => state.scene === 'menu' && state.menu?.focusedOption, 'menu ready');
  assert(menu.menu?.optionOrder?.includes('howToPlay'), 'Main menu controller order does not include How To Play');
  assert(menu.menu?.items?.helpButton?.width > 80, 'How To Play menu button is missing or too small');

  await page.evaluate(() => window.__game?.currentScene?.openHowToPlayOverlay?.());
  const menuHelp = await waitForState(page, (state) => state.overlays?.howToPlay && state.howToPlayOverlay?.rows?.length >= 7, 'menu help overlay');
  assertOverlayLayout(menuHelp, 'menu help overlay');
  await page.screenshot({ path: path.join(outputDir, 'menu-how-to-play.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await waitForState(page, (state) => state.scene === 'menu' && !state.overlays?.howToPlay, 'menu help closed');

  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForState(page, (state) => state.scene === 'play' && state.lives > 0, 'play ready');
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play?.setPaused?.(true);
    play?.openHowToPlayOverlay?.();
  });
  const pauseHelp = await waitForState(page, (state) => state.scene === 'play' && state.isPaused && state.overlays?.pause && state.overlays?.howToPlay, 'pause help overlay');
  assertOverlayLayout(pauseHelp, 'pause help overlay');
  await page.screenshot({ path: path.join(outputDir, 'pause-how-to-play.png'), fullPage: true });

  const report = {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    menuFocus: menu.menu?.focusedOption,
    menuOrder: menu.menu?.optionOrder,
    menuRows: menuHelp.howToPlayOverlay?.rows,
    pauseRows: pauseHelp.howToPlayOverlay?.rows,
    menuLayout: menuHelp.howToPlayOverlay?.layout,
    pauseLayout: pauseHelp.howToPlayOverlay?.layout,
    screenshots: {
      menu: path.join(outputDir, 'menu-how-to-play.png'),
      pause: path.join(outputDir, 'pause-how-to-play.png')
    },
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `Help overlay diagnostics failed: ${JSON.stringify(report)}`);
  console.log(`[how-to-play] PASS menu+pause rows=${report.menuRows?.length || 0} report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
