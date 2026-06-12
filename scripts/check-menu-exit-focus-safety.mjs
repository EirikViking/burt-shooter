import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4405);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-exit-focus-safety-${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  if (fs.existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
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
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForState(page, predicate, label, timeout = 20000) {
  await page.waitForFunction((predicateSource) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return Function('state', `return (${predicateSource})(state);`)(state);
  }, predicate.toString(), { timeout });
  return readState(page);
}

function assertSourceGuards() {
  const main = fs.readFileSync('electron/main.cjs', 'utf8');
  const preload = fs.readFileSync('electron/preload.cjs', 'utf8');
  const play = fs.readFileSync('src/scenes/PlayScene.js', 'utf8');
  assert(main.includes('dialog.showMessageBox'), 'Electron exit bridge must show a confirmation dialog');
  assert(main.includes('nova-app:window-blur'), 'Electron main must send native window blur to renderer');
  assert(preload.includes('nova-app-window-blur'), 'Preload must dispatch native window blur event');
  assert(play.includes('native_window_blur'), 'PlayScene must auto-pause on native window blur');
}

async function runMenuExitChecks(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__novaExitRequests = [];
    Object.defineProperty(window, '__novaApp', {
      configurable: true,
      value: {
        exitGame: async (payload) => {
          window.__novaExitRequests.push(payload || {});
          return { ok: false, canceled: true };
        }
      }
    });
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForState(page, (state) => state.scene === 'menu', 'menu ready');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__novaExitRequests?.length === 1, null, { timeout: 10000 });
  const firstExitPayload = await page.evaluate(() => window.__novaExitRequests[0]);
  assert(/close Nova Swarm/i.test(firstExitPayload.message || ''), `menu ESC did not request close confirmation: ${JSON.stringify(firstExitPayload)}`);
  const afterMenuEsc = await readState(page);
  assert(afterMenuEsc.scene === 'menu', `menu ESC changed scene unexpectedly: ${afterMenuEsc.scene}`);

  await page.evaluate(() => { window.__novaExitRequests = []; });
  await page.evaluate(() => {
    window.__game?.showHighscores?.();
  });
  await waitForState(
    page,
    (state) => state.scene === 'highscore' && Boolean(state.highscore?.focusedControl),
    'highscore controls ready'
  );
  await page.keyboard.press('Escape');
  await waitForState(page, (state) => state.scene === 'menu', 'menu after highscore escape');
  await page.waitForTimeout(300);
  const leakedExitRequests = await page.evaluate(() => window.__novaExitRequests?.length || 0);
  assert(leakedExitRequests === 0, `leaderboard Escape leaked into menu exit (${leakedExitRequests} exit request(s))`);

  await page.screenshot({ path: path.join(outputDir, 'menu-after-leaderboard-escape.png'), fullPage: true });
  assert(pageErrors.length === 0, `menu page errors: ${pageErrors.join('; ')}`);
  await page.close();
  return { firstExitPayload, leakedExitRequests };
}

async function runFocusPauseCheck(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForState(page, (state) => state.scene === 'play' && !state.isPaused, 'active gameplay');
  await page.evaluate(() => window.dispatchEvent(new Event('nova-app-window-blur')));
  const paused = await waitForState(page, (state) => state.scene === 'play' && state.isPaused && state.overlays?.pause, 'native blur pause');
  await page.screenshot({ path: path.join(outputDir, 'native-blur-pause.png'), fullPage: true });
  assert(paused.isPaused === true && paused.overlays?.pause === true, `native blur did not pause gameplay: ${JSON.stringify(paused)}`);
  assert(pageErrors.length === 0, `focus page errors: ${pageErrors.join('; ')}`);
  await page.close();
  return {
    scene: paused.scene,
    paused: paused.isPaused,
    overlay: paused.overlays?.pause
  };
}

assertSourceGuards();
const server = await startDevServer();
console.log(`[menu-exit-focus-safety] dev ready ${baseUrl}`);
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const report = {
    status: 'passed',
    baseUrl,
    outputDir,
    menuExit: await runMenuExitChecks(browser),
    focusPause: await runFocusPauseCheck(browser)
  };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[menu-exit-focus-safety] PASS ${JSON.stringify(report)}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
