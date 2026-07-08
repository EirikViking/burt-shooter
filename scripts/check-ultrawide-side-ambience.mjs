#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4472));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ultrawide-side-ambience-${timestamp()}`);

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
  throw new Error(`No available ultrawide ambience port found starting at ${startPort}`);
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
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 3440, height: 1440 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.ultrawideAmbienceDebug, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    play?.applyGameplayViewportTransform?.();
    const GraphicsCtor = play?.stragglerBeaconLayer?.constructor || play?.bossHazardLayer?.constructor || null;
    if (play?.gameContainer && GraphicsCtor) {
      const leftProbe = new GraphicsCtor();
      leftProbe.label = 'ultrawideMaskLeakProbeLeft';
      leftProbe.rect(-140, 280, 92, 92);
      leftProbe.fill({ color: 0xff00ff, alpha: 1 });
      const rightProbe = new GraphicsCtor();
      rightProbe.label = 'ultrawideMaskLeakProbeRight';
      rightProbe.rect(1968, 420, 92, 92);
      rightProbe.fill({ color: 0xffec8a, alpha: 1 });
      play.gameContainer.addChild(leftProbe);
      play.gameContainer.addChild(rightProbe);
      play.ultrawideMaskLeakProbes = [leftProbe, rightProbe];
    }
    const firstStar = play?.ultrawideAmbience?.stars?.find((star) => star?.visible);
    return {
      ok: Boolean(game && play),
      debug: play?.ultrawideAmbienceDebug || null,
      gameplay: {
        width: game?.getGameplayWidth?.(),
        height: game?.getGameplayHeight?.(),
        facadeWidth: play?.gameplayGame?.getWidth?.(),
        facadeHeight: play?.gameplayGame?.getHeight?.(),
        bulletWidth: play?.bulletManager?.screenWidth,
        bulletHeight: play?.bulletManager?.screenHeight
      },
      mask: {
        active: play?.gameContainer?.mask === play?.gameplayViewportMask,
        renderable: play?.gameplayViewportMask?.renderable,
        eventMode: play?.gameplayViewportMask?.eventMode
      },
      leakProbeScreens: {
        left: game?.gameplayToScreen?.(-94, 326) || null,
        right: game?.gameplayToScreen?.(2014, 466) || null
      },
      firstStar: firstStar ? { x: firstStar.x, y: firstStar.y, alpha: firstStar.alpha } : null
    };
  });

  await page.evaluate(() => window.advanceTime?.(1200));
  await page.waitForTimeout(100);

  const after = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const firstStar = play?.ultrawideAmbience?.stars?.find((star) => star?.visible);
    return {
      debug: play?.ultrawideAmbienceDebug || null,
      firstStar: firstStar ? { x: firstStar.x, y: firstStar.y, alpha: firstStar.alpha } : null
    };
  });

  const screenshot = path.join(outputDir, 'ultrawide-side-ambience.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const debug = after.debug || before.debug || {};
  const starMoved = Boolean(
    before.firstStar &&
    after.firstStar &&
    Math.abs(after.firstStar.y - before.firstStar.y) > 0.5
  );
  const report = {
    ok: Boolean(
      before.ok &&
      debug.visible &&
      debug.decorativeOnly &&
      debug.eventMode === 'none' &&
      debug.decorativeEventMode === 'none' &&
      debug.gameContainerMasked &&
      debug.leftGutterWidth === 440 &&
      debug.rightGutterWidth === 440 &&
      debug.activeRect?.width === 2560 &&
      debug.activeRect?.height === 1440 &&
      debug.starCount >= 80 &&
      debug.gutterStarCount === debug.starCount &&
      debug.combatFrameVisible &&
      before.gameplay.width === 1920 &&
      before.gameplay.height === 1080 &&
      before.gameplay.facadeWidth === 1920 &&
      before.gameplay.facadeHeight === 1080 &&
      before.gameplay.bulletWidth === 1920 &&
      before.gameplay.bulletHeight === 1080 &&
      before.mask.active &&
      before.mask.renderable === false &&
      before.mask.eventMode === 'none' &&
      before.leakProbeScreens?.left?.x < debug.activeRect?.x &&
      before.leakProbeScreens?.right?.x > debug.activeRect?.x + debug.activeRect?.width &&
      starMoved &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    screenshot,
    before,
    after,
    starMoved,
    pageErrors,
    consoleErrors
  };

  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[ultrawide-side-ambience] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
