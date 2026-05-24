import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.HANGAR_CAPTURE_HOST || '127.0.0.1';
const port = process.env.HANGAR_CAPTURE_URL ? null : (Number(process.env.HANGAR_CAPTURE_PORT) || await findAvailablePort(4477));
const baseUrl = process.env.HANGAR_CAPTURE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.HANGAR_CAPTURE_OUTPUT_DIR || 'release/steam-trailer/hangar');
const viewport = { width: 1920, height: 1080 };
const canvasOutputName = 'nova-swarm-hangar-ship-select-canvas-60fps.webm';

const consoleEvents = [];
const pageErrors = [];
const badResponses = [];

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, String(value));
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
  throw new Error(`No available hangar capture port found starting at ${startPort}`);
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
    throw new Error('dist/index.html is missing. Run npm run build before capturing trailer footage.');
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
  while (Date.now() - start < 20000) {
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

function observePage(page) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 900) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({ status: response.status(), url: response.url(), method: response.request().method() });
    }
  });
}

async function collectState(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(window.render_game_to_text?.() || '{}');
    } catch {
      return null;
    }
  });
}

async function startCanvasRecording(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas?.captureStream) throw new Error('Canvas captureStream is not available');
    const stream = canvas.captureStream(60);
    const preferred = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ].find((mime) => window.MediaRecorder?.isTypeSupported?.(mime));
    if (!preferred) throw new Error('No supported MediaRecorder webm codec found');
    const recorder = new MediaRecorder(stream, {
      mimeType: preferred,
      videoBitsPerSecond: 24_000_000
    });
    window.__steamHangarCanvasChunks = [];
    window.__steamHangarCanvasRecorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) window.__steamHangarCanvasChunks.push(event.data);
    };
    recorder.start(250);
    return { mimeType: preferred };
  });
}

async function stopCanvasRecording(page, targetPath) {
  const base64 = await page.evaluate(async () => {
    const recorder = window.__steamHangarCanvasRecorder;
    if (!recorder) throw new Error('Canvas recorder was not started');
    if (recorder.state !== 'inactive') {
      await new Promise((resolve) => {
        recorder.addEventListener('stop', resolve, { once: true });
        recorder.stop();
      });
    }
    const blob = new Blob(window.__steamHangarCanvasChunks || [], { type: recorder.mimeType || 'video/webm' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  });
  writeFileSync(targetPath, Buffer.from(base64, 'base64'));
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox']
});
const context = await browser.newContext({ viewport });
await context.addInitScript(() => {
  localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
    bestScore: 250000,
    bestRank: 20,
    bestLevel: 60
  }));
});
const page = await context.newPage();
observePage(page);

let beforeState = null;
let afterState = null;
let canvasRecorder = null;

try {
  await page.goto(withQuery(baseUrl, { steamTrailerCapture: 'hangar' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.showShipSelect, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await window.__game.showShipSelect();
  });
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'shipSelect';
    } catch {
      return false;
    }
  }, null, { timeout: 30000 });
  await page.waitForTimeout(900);
  beforeState = await collectState(page);
  await page.screenshot({ path: path.join(outputDir, 'hangar-ship-select-frame.png'), fullPage: true });
  canvasRecorder = await startCanvasRecording(page);
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(650);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(650);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(650);
  await stopCanvasRecording(page, path.join(outputDir, canvasOutputName));
  afterState = await collectState(page);
} finally {
  await context.close();
  await browser.close();
  if (server) server.kill();
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  viewport,
  source: 'Built from live Nova Swarm runtime via visible ship select/hangar scene.',
  canvasCapture: canvasOutputName,
  canvasRecorder,
  beforeState,
  afterState,
  consoleEvents,
  pageErrors,
  badResponses
};
writeFileSync(path.join(outputDir, 'hangar-capture-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (pageErrors.length || badResponses.length) {
  console.error(JSON.stringify({ pageErrors, badResponses }, null, 2));
  process.exit(1);
}
