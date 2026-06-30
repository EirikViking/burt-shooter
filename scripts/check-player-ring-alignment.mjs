import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4574));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/player-ring-alignment-${timestamp()}`);
const shipDir = path.resolve('public/art/generated/nova-swarm/ships');
const viewports = [
  { width: 1600, height: 900, name: '1600x900' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 720, name: '1280x720' }
];
const representativeShipIndexes = [0, 5, 10, 20, 24];
const runtimeTolerancePx = 0.75;
const sourceTolerancePx = 0.75;

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

  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
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

function parsePngImage(buffer, file) {
  const signature = buffer.subarray(0, 8).toString('hex');
  assert.equal(signature, '89504e470d0a1a0a', `${file}: invalid PNG signature`);

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
      if (filter === 1) {
        value = (value + left) & 0xff;
      } else if (filter === 2) {
        value = (value + up) & 0xff;
      } else if (filter === 3) {
        value = (value + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : (pb <= pc ? up : upLeft);
        value = (value + predictor) & 0xff;
      } else if (filter !== 0) {
        throw new Error(`${file}: unsupported PNG row filter ${filter}`);
      }
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

function alphaCenterDelta(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.pixels[(y * image.width + x) * 4 + 3];
      if (alpha <= 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  assert.ok(maxX >= 0 && maxY >= 0, 'ship has no visible alpha');
  const visualCenterX = (minX + maxX) / 2;
  const visualCenterY = (minY + maxY) / 2;
  return {
    x: visualCenterX - (image.width - 1) / 2,
    y: visualCenterY - (image.height - 1) / 2,
    bounds: { minX, minY, maxX, maxY }
  };
}

function readShipSourceCenters() {
  return Array.from({ length: 25 }, (_, index) => {
    const file = `nova-player-ship-${String(index + 1).padStart(2, '0')}.png`;
    const fullPath = path.join(shipDir, file);
    const image = parsePngImage(readFileSync(fullPath), file);
    const centerDelta = alphaCenterDelta(image);
    assert.ok(
      Math.abs(centerDelta.x) <= sourceTolerancePx && Math.abs(centerDelta.y) <= sourceTolerancePx,
      `${file}: source alpha center drift ${JSON.stringify(centerDelta)} exceeds ${sourceTolerancePx}px`
    );
    return {
      index,
      shipKey: file,
      fullPath,
      width: image.width,
      height: image.height,
      centerDelta
    };
  });
}

function htmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function makeContactSheet(browser, screenshots) {
  const htmlPath = path.join(outputDir, 'player-ring-alignment-contact-sheet.html');
  const cells = screenshots.map((shot) => `
    <figure>
      <img src="${pathToFileURL(shot.path).href}" />
      <figcaption>${htmlEscape(shot.label)}</figcaption>
    </figure>`).join('\n');
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; background: #071019; color: #dffcff; font: 16px Arial, sans-serif; }
    main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 14px; }
    figure { margin: 0; border: 1px solid #2aa8c8; background: #02070c; padding: 8px; }
    img { width: 100%; display: block; }
    figcaption { padding-top: 8px; color: #9cfbff; font-weight: 700; }
  </style>
</head>
<body><main>${cells}</main></body>
</html>`;
  writeFileSync(htmlPath, html);
  const page = await browser.newPage({ viewport: { width: 1800, height: 1840 } });
  await page.goto(pathToFileURL(htmlPath).href);
  const pngPath = path.join(outputDir, 'player-ring-alignment-contact-sheet.png');
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath };
}

async function renderShipCase(browser, viewport, shipSource) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.switchScene), null, { timeout: 30000 });
  await page.evaluate((shipKey) => {
    localStorage.setItem('burt_accessibility_player_focus', '1');
    localStorage.setItem('nova_accessibility_player_hitbox', '1');
    window.__game.selectedShipSpriteKey = shipKey;
    window.__game.level = 1;
    window.__game.lives = 3;
    window.__game.switchScene('play');
  }, shipSource.shipKey);
  await page.waitForFunction((shipKey) => {
    const play = window.__game?.scenes?.play;
    const player = play?.player;
    return window.__game?.currentSceneName === 'play' &&
      player?.selectedShipSpriteKey === shipKey &&
      player?.shipSprite?.texture &&
      Number(player.shipSprite.texture.width || 0) > 1 &&
      Number(player.shipSprite.texture.height || 0) > 1;
  }, shipSource.shipKey, { timeout: 30000 });
  await page.waitForTimeout(250);

  const alignment = await page.evaluate((centerDelta) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    play.introActive = false;
    play.introComplete = true;
    play.shipIntro = null;
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.68;
    player.idleTimer = 0;
    player.tilt = 0;
    player.invulnerable = false;
    player.isDodging = false;
    player.sprite.x = player.x;
    player.sprite.y = player.y;
    player.sprite.alpha = 1;
    player.sprite.visible = true;
    player.sprite.scale.set(1);
    if (player.shipSprite) {
      player.shipSprite.rotation = 0;
      player.shipSprite.alpha = 1;
    }
    player.updateFocusRing(1 / 60);
    player.updateHitboxReticle?.(1 / 60);
    const ship = player.shipSprite;
    const focusRing = player.focusRing;
    const scaleX = Number(ship?.scale?.x || 1);
    const scaleY = Number(ship?.scale?.y || 1);
    const visualDelta = {
      x: Number(ship?.x || 0) + centerDelta.x * scaleX,
      y: Number(ship?.y || 0) + centerDelta.y * scaleY
    };
    const ringGlobal = focusRing?.getGlobalPosition ? focusRing.getGlobalPosition() : { x: player.sprite.x, y: player.sprite.y };
    const shipGlobal = ship?.getGlobalPosition ? ship.getGlobalPosition() : { x: player.sprite.x + Number(ship?.x || 0), y: player.sprite.y + Number(ship?.y || 0) };
    return {
      scene: game?.currentSceneName || null,
      shipKey: player.selectedShipSpriteKey,
      textureIndex: player.selectedShipTextureIndex,
      player: { x: player.x, y: player.y },
      ringVisible: Boolean(focusRing?.visible),
      hitboxReticle: player.getHitboxReticleDebugState?.() || null,
      ringGlobal: { x: Number(ringGlobal.x || 0), y: Number(ringGlobal.y || 0) },
      shipGlobal: { x: Number(shipGlobal.x || 0), y: Number(shipGlobal.y || 0) },
      shipLocal: {
        x: Number(ship?.x || 0),
        y: Number(ship?.y || 0),
        scaleX,
        scaleY,
        rotation: Number(ship?.rotation || 0)
      },
      visualDelta,
      distance: Math.hypot(visualDelta.x, visualDelta.y)
    };
  }, shipSource.centerDelta);

  const failures = [
    alignment.scene !== 'play' ? `expected play scene, got ${alignment.scene || 'missing'}` : null,
    alignment.shipKey !== shipSource.shipKey ? `expected ${shipSource.shipKey}, got ${alignment.shipKey || 'missing'}` : null,
    !alignment.ringVisible ? 'focus ring was not visible' : null,
    !alignment.hitboxReticle?.visible ? 'hitbox reticle was not visible with accessibility toggle enabled' : null,
    Math.abs((alignment.hitboxReticle?.radius || 0) - 11) > 6 ? `hitbox reticle radius looks off: ${alignment.hitboxReticle?.radius}` : null,
    Math.abs(alignment.visualDelta.x) > runtimeTolerancePx || Math.abs(alignment.visualDelta.y) > runtimeTolerancePx
      ? `visual center drift ${JSON.stringify(alignment.visualDelta)} exceeds ${runtimeTolerancePx}px`
      : null,
    ...consoleErrors.map((error) => `console error: ${error}`),
    ...pageErrors.map((error) => `page error: ${error}`)
  ].filter(Boolean);
  const screenshotPath = path.join(outputDir, `player-ring-${viewport.name}-${shipSource.shipKey.replace('.png', '')}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.close();

  return {
    viewport,
    shipKey: shipSource.shipKey,
    alignment,
    screenshotPath,
    ok: failures.length === 0,
    failures
  };
}

mkdirSync(outputDir, { recursive: true });
const sourceCenters = readShipSourceCenters();
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const runtimeResults = [];
  for (const viewport of viewports) {
    for (const index of representativeShipIndexes) {
      runtimeResults.push(await renderShipCase(browser, viewport, sourceCenters[index]));
    }
  }
  const contactSheet = await makeContactSheet(
    browser,
    runtimeResults.map((result) => ({
      label: `${result.viewport.name} ${result.shipKey} drift=${result.alignment.distance.toFixed(2)}px`,
      path: result.screenshotPath
    }))
  );
  const report = {
    ok: runtimeResults.every((result) => result.ok),
    baseUrl,
    outputDir,
    sourceTolerancePx,
    runtimeTolerancePx,
    sourceCenters,
    runtimeResults,
    contactSheet
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[player-ring-alignment] PASS contactSheet=${path.relative(process.cwd(), contactSheet.pngPath).replaceAll(path.sep, '/')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
