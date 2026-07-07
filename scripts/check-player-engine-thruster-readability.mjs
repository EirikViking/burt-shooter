import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4497));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/player-engine-thruster-readability-${timestamp()}`);

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
  throw new Error(`No available player engine check port found starting at ${startPort}`);
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
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function paethPredictor(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function parsePngImage(file) {
  const buffer = readFileSync(file);
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file}: invalid PNG signature`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  assert.equal(bitDepth, 8, `${file}: expected 8-bit PNG, got ${bitDepth}`);
  assert.ok(colorType === 2 || colorType === 6, `${file}: expected RGB/RGBA PNG color type 2/6, got ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const sourceBytesPerPixel = colorType === 6 ? 4 : 3;
  const sourceStride = width * sourceBytesPerPixel;
  const pixels = Buffer.alloc(width * height * 4);
  let rawOffset = 0;
  let pixelOffset = 0;
  let prevRow = Buffer.alloc(sourceStride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = Buffer.from(raw.subarray(rawOffset, rawOffset + sourceStride));
    rawOffset += sourceStride;

    for (let x = 0; x < sourceStride; x += 1) {
      const left = x >= sourceBytesPerPixel ? row[x - sourceBytesPerPixel] : 0;
      const up = prevRow[x] || 0;
      const upLeft = x >= sourceBytesPerPixel ? prevRow[x - sourceBytesPerPixel] || 0 : 0;
      let value = row[x];
      if (filter === 1) value = (value + left) & 0xff;
      else if (filter === 2) value = (value + up) & 0xff;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) value = (value + paethPredictor(left, up, upLeft)) & 0xff;
      row[x] = value;
    }

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * sourceBytesPerPixel;
      pixels[pixelOffset] = row[sourceIndex];
      pixels[pixelOffset + 1] = row[sourceIndex + 1];
      pixels[pixelOffset + 2] = row[sourceIndex + 2];
      pixels[pixelOffset + 3] = colorType === 6 ? row[sourceIndex + 3] : 255;
      pixelOffset += 4;
    }
    prevRow = row;
  }

  return { width, height, pixels };
}

function analyzeVisibleProofPixels(file) {
  const image = parsePngImage(file);
  let energeticPixels = 0;
  let cyanOrangeThrusterPixels = 0;
  for (let offset = 0; offset < image.pixels.length; offset += 4) {
    const r = image.pixels[offset];
    const g = image.pixels[offset + 1];
    const b = image.pixels[offset + 2];
    const a = image.pixels[offset + 3];
    if (a < 20) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (r + g + b > 170 && max - min > 18) energeticPixels += 1;
    if ((g > 100 && b > 120 && r < 120) || (r > 150 && g > 80 && b < 90)) cyanOrangeThrusterPixels += 1;
  }
  return {
    width: image.width,
    height: image.height,
    energeticPixels,
    cyanOrangeThrusterPixels
  };
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
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) return { ok: false, reason: 'missing play/player' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'ENGINE_THRUSTER_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }

    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.68;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
      player.sprite.alpha = 1;
    }
    player.ensureShipOverlays?.();
    player.engineVfxIntensity = 0;
    player.updateEngineVfx(0, 0, 1 / 60);
    const idleDebug = player.engineVfxLayer?.__debugEngineVfx || null;

    for (let i = 0; i < 10; i += 1) {
      player.updateEngineVfx(0.9, -0.45, 1 / 30);
    }
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
      player.sprite.alpha = 1;
      player.sprite.visible = true;
      player.sprite.renderable = true;
    }
    if (player.shipSprite) {
      player.shipSprite.visible = true;
      player.shipSprite.renderable = true;
    }
    const activeDebug = player.engineVfxLayer?.__debugEngineVfx || null;
    const shipTextureReady = Boolean(player.shipSprite?.texture && player.shipSprite.texture.width > 0 && player.shipSprite.texture.height > 0);
    const global = player.sprite?.getGlobalPosition ? player.sprite.getGlobalPosition() : { x: player.sprite?.x || player.x, y: player.sprite?.y || player.y };
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect?.() || { left: 0, top: 0, width: window.innerWidth || 1280, height: window.innerHeight || 720 };
    const pageWidth = Math.max(window.innerWidth || 1280, document.documentElement?.scrollWidth || 0, rect.left + rect.width);
    const pageHeight = Math.max(window.innerHeight || 720, document.documentElement?.scrollHeight || 0, rect.top + rect.height);
    const scaleX = rect.width / Math.max(1, game.getWidth());
    const scaleY = rect.height / Math.max(1, game.getHeight());
    const screenX = rect.left + (global?.x || player.x) * scaleX;
    const screenY = rect.top + (global?.y || player.y) * scaleY;
    const clipWidth = 320;
    const clipHeight = 320;
    const clip = {
      x: Math.max(0, Math.min(pageWidth - clipWidth, Math.round(screenX - clipWidth / 2))),
      y: Math.max(0, Math.min(pageHeight - clipHeight, Math.round(screenY - clipHeight * 0.58))),
      width: clipWidth,
      height: clipHeight
    };
    return {
      ok: true,
      idleDebug,
      activeDebug,
      layerVisible: Boolean(player.engineVfxLayer?.visible),
      shipTextureReady,
      shipSize: {
        width: Math.round(player.shipSprite?.width || 0),
        height: Math.round(player.shipSprite?.height || 0)
      },
      clip,
      playerGlobal: { x: Math.round(global?.x || player.x), y: Math.round(global?.y || player.y) },
      screen: { x: Math.round(screenX), y: Math.round(screenY), scaleX: Number(scaleX.toFixed(3)), scaleY: Number(scaleY.toFixed(3)) }
    };
  });

  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, 'player-engine-thruster-readability.png');
  await page.screenshot({ path: screenshot, clip: state.clip });
  const proofPixels = analyzeVisibleProofPixels(screenshot);

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (state.idleDebug?.visible !== false) failures.push(`idle engine cue should hide: ${JSON.stringify(state.idleDebug)}`);
  if (!state.layerVisible || !state.activeDebug?.visible) failures.push(`moving engine cue missing: ${JSON.stringify(state.activeDebug)}`);
  if ((state.activeDebug?.intensity || 0) < 0.55) failures.push(`engine intensity too low: ${JSON.stringify(state.activeDebug)}`);
  if (state.activeDebug?.plumeCount !== 3) failures.push(`expected 3 engine plumes: ${JSON.stringify(state.activeDebug)}`);
  if (state.activeDebug?.sideJets !== true) failures.push(`lean side jet missing: ${JSON.stringify(state.activeDebug)}`);
  if ((state.activeDebug?.sideFeatherCount || 0) < 3) failures.push(`strafe feather trails missing: ${JSON.stringify(state.activeDebug)}`);
  if (state.shipSize.width < 28 || state.shipSize.height < 28) failures.push(`player ship art missing/small: ${JSON.stringify(state.shipSize)}`);
  if (proofPixels.energeticPixels < 900) failures.push(`screenshot proof is too sparse/blank: ${JSON.stringify(proofPixels)}`);
  if (proofPixels.cyanOrangeThrusterPixels < 80) failures.push(`thruster proof pixels missing: ${JSON.stringify(proofPixels)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    clip: state.clip,
    proofPixels,
    state,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[player-engine-thruster-readability] ${failures.join('; ')}`);
  console.log(`[player-engine-thruster-readability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
