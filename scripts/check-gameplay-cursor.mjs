import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CURSOR_CHECK_HOST || '127.0.0.1';
const port = process.env.CURSOR_CHECK_URL ? null : (Number(process.env.CURSOR_CHECK_PORT) || await findAvailablePort(4557));
const baseUrl = process.env.CURSOR_CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CURSOR_CHECK_OUTPUT_DIR || `test-results/gameplay-cursor-${timestamp()}`);

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
  throw new Error(`No available cursor check port found starting at ${startPort}`);
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
  if (!existsSync(path.resolve('dist', 'index.html'))) {
    throw new Error('dist/index.html is missing. Run npm run build:current before npm run check:gameplay-cursor.');
  }

  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
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

async function readCursorState(page) {
  return page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const canvas = document.querySelector('#game-container canvas, canvas');
    const container = document.getElementById('game-container');
    const cursorFor = (node) => node ? getComputedStyle(node).cursor : null;
    const styleFor = (node) => {
      if (!node) return null;
      const styles = getComputedStyle(node);
      return {
        cursor: styles.cursor,
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        borderTopWidth: styles.borderTopWidth,
        borderTopColor: styles.borderTopColor
      };
    };
    return {
      scene: state.scene,
      isPaused: Boolean(state.isPaused),
      overlays: state.overlays || {},
      cursor: state.cursor || null,
      dom: {
        htmlClass: document.documentElement.className,
        bodyClass: document.body.className,
        htmlCursor: cursorFor(document.documentElement),
        bodyCursor: cursorFor(document.body),
        containerCursor: cursorFor(container),
        canvasCursor: cursorFor(canvas),
        canvasStyle: styleFor(canvas)
      }
    };
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertCursorHidden(state, label) {
  assert(state.cursor?.hidden === true, `${label}: gameplay cursor helper is not hidden`);
  assert(state.cursor?.shouldHide === true, `${label}: helper did not mark gameplay as hideable`);
  assert(state.dom.canvasCursor === 'none', `${label}: canvas cursor is ${state.dom.canvasCursor || 'missing'}, expected none`);
  assert(state.dom.canvasStyle?.outlineStyle === 'none' || state.dom.canvasStyle?.outlineWidth === '0px', `${label}: focused canvas outline is visible (${JSON.stringify(state.dom.canvasStyle)})`);
  assert(state.dom.canvasStyle?.borderTopWidth === '0px', `${label}: canvas border is visible (${JSON.stringify(state.dom.canvasStyle)})`);
}

function assertCursorVisible(state, label) {
  assert(state.cursor?.hidden === false, `${label}: gameplay cursor helper is still hidden`);
  assert(state.dom.canvasCursor !== 'none', `${label}: canvas cursor is still none`);
}

async function waitForCursorState(page, predicate, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await readCursorState(page);
    if (predicate(latest)) return latest;
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify(latest)}`);
}

async function screenshot(page, name) {
  const target = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

mkdirSync(outputDir, { recursive: true });

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  states: {},
  screenshots: {}
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body?.dataset?.menuReady === '1' && window.__game?.currentSceneName === 'menu', null, { timeout: 20000 });

  report.states.menuInitial = await waitForCursorState(page, state => state.scene === 'menu' && state.cursor?.hidden === false, 'initial menu cursor');
  assertCursorVisible(report.states.menuInitial, 'initial menu');
  report.screenshots.menuInitial = await screenshot(page, '01-menu-cursor-visible');

  await page.evaluate(async () => {
    if (typeof window.__game?.startGame === 'function') {
      await window.__game.startGame(window.__game.selectedShipSpriteKey);
    }
  });
  report.states.gameplay = await waitForCursorState(page, state => state.scene === 'play' && state.cursor?.hidden === true, 'gameplay cursor');
  assertCursorHidden(report.states.gameplay, 'gameplay');
  report.screenshots.gameplay = await screenshot(page, '02-gameplay-cursor-hidden');

  await page.evaluate(() => {
    window.__game?.scenes?.play?.setPaused?.(true);
  });
  report.states.pause = await waitForCursorState(page, state => state.scene === 'play' && state.overlays?.pause && state.cursor?.hidden === false, 'pause cursor');
  assertCursorVisible(report.states.pause, 'pause');
  report.screenshots.pause = await screenshot(page, '03-pause-cursor-visible');

  await page.evaluate(() => {
    window.__game?.scenes?.play?.setPaused?.(false);
    window.__game?.switchScene?.('menu');
  });
  report.states.menuReturned = await waitForCursorState(page, state => state.scene === 'menu' && state.cursor?.hidden === false, 'returned menu cursor');
  assertCursorVisible(report.states.menuReturned, 'returned menu');
  report.screenshots.menuReturned = await screenshot(page, '04-menu-returned-cursor-visible');

  report.status = 'passed';
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[cursor-check] passed ${outputDir}`);
} catch (error) {
  report.status = 'failed';
  report.error = error?.stack || error?.message || String(error);
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
  if (server) server.kill();
}
