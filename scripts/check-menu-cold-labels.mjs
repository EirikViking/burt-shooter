import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4564));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-cold-labels-${timestamp()}`);
const viewports = [
  { width: 1600, height: 900, name: '1600x900' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 720, name: '1280x720' }
];

const expectedLabels = {
  startBtn: 'MAYHEM RUN',
  highscoreBtn: 'SHIP HANGAR',
  storyBtn: 'LEADERBOARD',
  threatCodexBtn: 'THREAT CODEX',
  achievementsBtn: 'ACHIEVEMENTS',
  settingsBtn: 'SETTINGS',
  exitBtn: 'EXIT GAME',
  musicBtn: 'MUSIC: ON'
};
const menuButtonKeys = Object.keys(expectedLabels).filter((key) => key !== 'musicBtn');
const coldFontDelayMs = Number(process.env.CHECK_MENU_COLD_FONT_DELAY_MS || 2200);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (signature !== '89504e470d0a1a0a') throw new Error(`${file}: invalid PNG signature`);

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

  if (bitDepth !== 8) throw new Error(`${file}: expected 8-bit PNG, got ${bitDepth}`);
  if (colorType !== 2 && colorType !== 6) throw new Error(`${file}: expected RGB/RGBA PNG color type 2/6, got ${colorType}`);

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

function looksLikeLabelPixel(r, g, b, a) {
  if (a < 220) return false;
  const bright = Math.max(r, g, b);
  const textCyan = g >= 145 && b >= 150 && r >= 70;
  const textWhite = r >= 190 && g >= 190 && b >= 190;
  const textGold = r >= 190 && g >= 130 && b >= 50 && b <= 180;
  return bright >= 150 && (textCyan || textWhite || textGold);
}

function labelInkBounds(image, bounds) {
  if (!bounds) return null;
  const left = Math.max(0, Math.floor(bounds.x) - 2);
  const top = Math.max(0, Math.floor(bounds.y) - 2);
  const right = Math.min(image.width, Math.ceil(bounds.right) + 2);
  const bottom = Math.min(image.height, Math.ceil(bounds.bottom) + 2);
  let minX = right;
  let minY = bottom;
  let maxX = left - 1;
  let maxY = top - 1;
  let count = 0;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * image.width + x) * 4;
      if (!looksLikeLabelPixel(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2], image.pixels[offset + 3])) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      count += 1;
    }
  }

  if (count === 0) return { count: 0, width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 };
  return {
    count,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    left: minX - left,
    right: maxX - left,
    top: minY - top,
    bottom: maxY - top
  };
}

async function waitForMenuScene(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
}

async function waitForMenuAlpha(page, minAlpha = 0.98, timeout = 12000) {
  await page.waitForFunction(({ keys, minAlpha: requiredAlpha }) => {
    const scene = window.__game?.scenes?.menu;
    return keys.every((key) => {
      const button = scene?.[key];
      return button && button.alpha >= requiredAlpha && button._label?.text;
    });
  }, { keys: menuButtonKeys, minAlpha }, { timeout, polling: 16 });
}

async function waitForColdFirstVisibleMenu(page) {
  await waitForMenuScene(page);
  await waitForMenuAlpha(page, 0.58, 15000);
  await page.waitForTimeout(32);
}

async function waitForSettledMenu(page) {
  await waitForMenuAlpha(page, 0.98, 15000);
  await page.waitForTimeout(250);
}

async function inspectMenu(page) {
  return page.evaluate((expected) => {
    const scene = window.__game?.scenes?.menu;
    const toBounds = (displayObject) => {
      if (!displayObject?.getBounds) return null;
      const box = displayObject.getBounds();
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        right: Math.round(box.x + box.width),
        bottom: Math.round(box.y + box.height)
      };
    };
    const buttons = Object.fromEntries(Object.keys(expected).map((key) => {
      const button = scene?.[key];
      const label = button?._label;
      const labelBounds = toBounds(label);
      const buttonBounds = toBounds(button);
      return [key, {
        expected: expected[key],
        text: label?.text || null,
        alpha: Number(button?.alpha ?? 0),
        labelWidth: Number(label?.width || 0),
        buttonWidth: Number(button?._btnWidth || 0),
        labelScaleX: Number(label?.scale?.x || 0),
        labelFontFamily: String(label?.style?.fontFamily || ''),
        labelFontSize: Number(label?.style?.fontSize || 0),
        buttonBounds,
        labelBounds
      }];
    }));
    return {
      scene: window.__game?.currentSceneName || null,
      buildId: JSON.parse(window.render_game_to_text?.() || '{}')?.buildId || null,
      fontsStatus: document.fonts?.status || 'unavailable',
      focusedOption: scene?.menuOptions?.[scene.focusedMenuIndex]?.id || null,
      buttons
    };
  }, expectedLabels);
}

function findFailures(snapshot, { minAlpha = 0.98, state = 'menu' } = {}) {
  const failures = [];
  if (snapshot.scene !== 'menu') failures.push(`expected menu scene, got ${snapshot.scene || 'missing'}`);
  for (const [key, button] of Object.entries(snapshot.buttons || {})) {
    if (button.text !== button.expected) {
      failures.push(`${state} ${key} label expected "${button.expected}", got "${button.text || 'missing'}"`);
    }
    if (/HIGHSCORES?/i.test(button.text || '')) {
      failures.push(`${state} ${key} still renders old highscore wording: "${button.text}"`);
    }
    if (button.alpha < minAlpha) failures.push(`${state} ${key} alpha ${button.alpha.toFixed(2)} below ${minAlpha}`);
    if (!button.buttonBounds || !button.labelBounds) failures.push(`${state} ${key} missing bounds`);
    if (button.buttonWidth > 0 && button.labelWidth > button.buttonWidth - 28) {
      failures.push(`${state} ${key} label may clip: labelWidth=${Math.round(button.labelWidth)} buttonWidth=${Math.round(button.buttonWidth)}`);
    }
    if (button.labelScaleX <= 0 || button.labelScaleX > 1.01) {
      failures.push(`${state} ${key} has unexpected label scale ${button.labelScaleX}`);
    }
  }
  const codex = snapshot.buttons?.threatCodexBtn;
  if (codex?.text !== 'THREAT CODEX') failures.push(`${state} Threat Codex label is not complete before hover`);
  return failures;
}

function findRenderedLabelFailures(stateName, screenshotPath, referenceScreenshotPath, snapshot, referenceSnapshot, { compareCounts = true } = {}) {
  const failures = [];
  const image = parsePngImage(readFileSync(screenshotPath), path.basename(screenshotPath));
  const referenceImage = parsePngImage(readFileSync(referenceScreenshotPath), path.basename(referenceScreenshotPath));

  for (const key of Object.keys(expectedLabels)) {
    const current = snapshot.buttons?.[key];
    const reference = referenceSnapshot.buttons?.[key];
    if (!current?.labelBounds || !reference?.labelBounds) continue;
    const currentInk = labelInkBounds(image, current.labelBounds);
    const referenceInk = labelInkBounds(referenceImage, reference.labelBounds);
    if (!currentInk || !referenceInk) {
      failures.push(`${stateName} ${key} could not read rendered label pixels`);
      continue;
    }
    if (referenceInk.count < 24) {
      failures.push(`${stateName} ${key} reference label pixel probe found too little rendered text`);
      continue;
    }
    if (compareCounts && currentInk.count < 24) {
      failures.push(`${stateName} ${key} rendered label found too little text ink: current=${currentInk.count}`);
    }
    if (current.buttonBounds) {
      const globalRight = current.labelBounds.x + currentInk.right;
      const safeRight = current.buttonBounds.x + current.buttonBounds.width - 18;
      if (globalRight > safeRight) {
        failures.push(`${stateName} ${key} rendered label reaches unsafe right edge: labelRight=${Math.round(globalRight)} safeRight=${Math.round(safeRight)}`);
      }
    }
  }

  return failures;
}

async function forceMenuLabelRefresh(page) {
  await page.evaluate(() => {
    const scene = window.__game?.scenes?.menu;
    if (!scene) return;
    scene.refreshMenuText?.();
    scene.layoutMenu?.();
  });
  await page.waitForTimeout(120);
}

async function installColdFontDelay(context) {
  if (!coldFontDelayMs || coldFontDelayMs < 1) return;
  await context.route('**/fonts/*.ttf', async (route) => {
    await sleep(coldFontDelayMs);
    await route.continue();
  });
}

async function takeMenuShot(page, viewport, state, screenshots, { includeInContactSheet = true } = {}) {
  const snapshot = await inspectMenu(page);
  const screenshotPath = path.join(outputDir, `menu-${state}-${viewport.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  if (includeInContactSheet) screenshots.push({ label: `${viewport.name} ${state}`, path: screenshotPath });
  return {
    state,
    snapshot,
    screenshotPath
  };
}

async function hoverMenuButtons(page, snapshot) {
  for (const key of menuButtonKeys) {
    const bounds = snapshot.buttons?.[key]?.buttonBounds;
    if (!bounds) continue;
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.waitForTimeout(55);
  }
}

async function pressVirtualControllerDown(page) {
  await page.evaluate(() => {
    window.__burtGamepadOverride = {
      id: 'virtual-menu-label-check',
      connected: true,
      axes: [0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
    };
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    window.__burtGamepadOverride.buttons = Array.from({ length: 17 }, (_, index) => ({
      pressed: index === 13,
      value: index === 13 ? 1 : 0
    }));
  });
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    window.__burtGamepadOverride.buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  });
  await page.waitForTimeout(120);
}

function htmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function makeContactSheet(browser, screenshots) {
  const htmlPath = path.join(outputDir, 'menu-cold-labels-contact-sheet.html');
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
    body { margin: 0; background: #071019; color: #dffcff; font: 18px Arial, sans-serif; }
    main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 18px; }
    figure { margin: 0; border: 1px solid #2aa8c8; background: #02070c; padding: 8px; }
    img { width: 100%; display: block; }
    figcaption { padding-top: 8px; color: #9cfbff; font-weight: 700; }
  </style>
</head>
<body><main>${cells}</main></body>
</html>`;
  writeFileSync(htmlPath, html);
  const page = await browser.newPage({ viewport: { width: 1800, height: 740 } });
  await page.goto(pathToFileURL(htmlPath).href);
  const pngPath = path.join(outputDir, 'menu-cold-labels-contact-sheet.png');
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath };
}

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required', '--disk-cache-size=0', '--media-cache-size=0']
});

try {
  mkdirSync(outputDir, { recursive: true });
  const screenshots = [];
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    await installColdFontDelay(context);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await waitForColdFirstVisibleMenu(page);
    const firstVisible = await takeMenuShot(page, viewport, 'cold-first-visible', screenshots);
    await page.waitForTimeout(1800);
    const noInput = await takeMenuShot(page, viewport, 'cold-no-input-2s', screenshots);

    await hoverMenuButtons(page, noInput.snapshot);
    const hover = await takeMenuShot(page, viewport, 'after-hover', screenshots);

    await page.mouse.move(1, 1);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(160);
    const keyboard = await takeMenuShot(page, viewport, 'after-keyboard', screenshots);

    await pressVirtualControllerDown(page);
    const controller = await takeMenuShot(page, viewport, 'after-controller', screenshots);

    await page.mouse.move(1, 1);
    await forceMenuLabelRefresh(page);
    const reference = await takeMenuShot(page, viewport, 'reference-refreshed', screenshots, { includeInContactSheet: false });

    await page.close();
    await context.unroute('**/fonts/*.ttf').catch(() => {});
    const warmPage = await context.newPage();
    await waitForMenuScene(warmPage);
    await waitForSettledMenu(warmPage);
    const warm = await takeMenuShot(warmPage, viewport, 'warm-relaunch', screenshots);

    const stateResults = [firstVisible, noInput, hover, keyboard, controller, warm];
    const failures = [
      ...findFailures(firstVisible.snapshot, { minAlpha: 0.55, state: 'cold-first-visible' }),
      ...[noInput, hover, keyboard, controller, warm].flatMap((result) => findFailures(result.snapshot, { state: result.state })),
      ...stateResults.flatMap((result) => findRenderedLabelFailures(
        result.state,
        result.screenshotPath,
        reference.screenshotPath,
        result.snapshot,
        reference.snapshot,
        { compareCounts: result.state !== 'cold-first-visible' }
      )),
      ...consoleErrors.map((error) => `console error: ${error}`),
      ...pageErrors.map((error) => `page error: ${error}`)
    ];
    results.push({
      viewport,
      states: Object.fromEntries(stateResults.map((result) => [result.state, result])),
      reference,
      failures,
      ok: failures.length === 0
    });
    await warmPage.close();
    await context.close();
  }

  const contactSheet = await makeContactSheet(browser, screenshots);
  const report = {
    ok: results.every((result) => result.ok),
    baseUrl,
    outputDir,
    results,
    contactSheet
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[menu-cold-labels] PASS contactSheet=${path.relative(process.cwd(), contactSheet.pngPath).replaceAll(path.sep, '/')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
