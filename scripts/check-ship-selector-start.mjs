import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4342));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ship-selector-start-${timestamp()}`);

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

async function showShipSelect(page) {
  await page.evaluate(() => {
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 150000, bestRank: 19, bestLevel: 20 }));
    window.__game?.showShipSelect?.();
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'shipSelect' && state.shipSelect?.startButton?.width > 0;
  }, { timeout: 10000 });
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
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
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.showShipSelect), { timeout: 30000 });

  const beforeClick = await showShipSelect(page);
  const clickTarget = beforeClick.shipSelect.startButton;
  await page.mouse.click(clickTarget.x + clickTarget.width / 2, clickTarget.y + clickTarget.height / 2);
  await page.mouse.click(clickTarget.x + clickTarget.width / 2, clickTarget.y + clickTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', { timeout: 10000 });
  const afterClick = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const beforeKeyboard = await showShipSelect(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', { timeout: 10000 });
  const afterKeyboard = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'ship-selector-start.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: Boolean(
      beforeClick.shipSelect?.spriteKey &&
      afterClick.scene === 'play' &&
      afterClick.selectedShipSpriteKey === beforeClick.shipSelect.spriteKey &&
      beforeKeyboard.shipSelect?.spriteKey &&
      afterKeyboard.scene === 'play' &&
      afterKeyboard.selectedShipSpriteKey === beforeKeyboard.shipSelect.spriteKey &&
      afterKeyboard.score === 0 &&
      afterKeyboard.lives === 3 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    beforeClick: beforeClick.shipSelect,
    afterClick: {
      scene: afterClick.scene,
      selectedShipSpriteKey: afterClick.selectedShipSpriteKey,
      score: afterClick.score,
      lives: afterClick.lives
    },
    beforeKeyboard: beforeKeyboard.shipSelect,
    afterKeyboard: {
      scene: afterKeyboard.scene,
      selectedShipSpriteKey: afterKeyboard.selectedShipSpriteKey,
      score: afterKeyboard.score,
      lives: afterKeyboard.lives
    },
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[ship-selector-start] PASS click=${afterClick.selectedShipSpriteKey} keyboard=${afterKeyboard.selectedShipSpriteKey} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
