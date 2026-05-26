import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4352));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/career-intel-layout-${timestamp()}`);
const viewports = [
  { width: 1366, height: 768, name: 'desktop' },
  { width: 775, height: 510, name: 'compact' }
];

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

function normalizeBounds(bounds) {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
  return {
    ...bounds,
    right: bounds.x + bounds.width,
    bottom: bounds.y + bounds.height
  };
}

function contains(outer, inner, pad = 0) {
  if (!outer || !inner) return false;
  return (
    inner.x >= outer.x - pad &&
    inner.y >= outer.y - pad &&
    inner.right <= outer.right + pad &&
    inner.bottom <= outer.bottom + pad
  );
}

function intersects(a, b, pad = 0) {
  if (!a || !b) return false;
  return !(
    a.right <= b.x + pad ||
    b.right <= a.x + pad ||
    a.bottom <= b.y + pad ||
    b.bottom <= a.y + pad
  );
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function openCareerIntel(page) {
  await page.evaluate(() => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      version: 1,
      unlockTuningVersion: 2,
      pilotXp: 23842,
      totalRuns: 42,
      bestScore: 126210,
      bestSector: 7,
      bestLevel: 38,
      totalBossesDefeated: 19,
      totalWavesCleared: 168,
      totalCodexDiscoveries: 30,
      noHitWaves: 44,
      unlockedShipIds: ['nova_ship_01']
    }));
    window.__game?.showShipSelect?.();
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'shipSelect', null, { timeout: 10000 });
  await page.evaluate(() => window.__game?.currentScene?.openCareerInfoOverlay?.('layout-check'));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.careerInfo?.visible === true, null, { timeout: 10000 });
  await page.waitForTimeout(500);
  return readState(page);
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const pageErrors = [];
const consoleErrors = [];

try {
  mkdirSync(outputDir, { recursive: true });
  const reports = [];
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__game?.showShipSelect), null, { timeout: 30000 });

    const state = await openCareerIntel(page);
    const career = state.shipSelect?.careerInfo || {};
    const panel = normalizeBounds(career.panel);
    const namedBounds = [
      ['title', career.title],
      ['rankGauge', career.rankGauge],
      ['valueChip', career.valueChip],
      ['body', career.body],
      ['flowBar', career.flowBar],
      ['snapshot', career.snapshot],
      ['backButton', career.backButton],
      ...(career.stats || []).map((bounds, index) => [`stat${index}`, bounds]),
      ...(career.cards || []).map((bounds, index) => [`card${index}`, bounds])
    ].map(([key, bounds]) => [key, normalizeBounds(bounds)]).filter(([, bounds]) => bounds);
    const containmentFailures = namedBounds
      .filter(([, bounds]) => !contains(panel, bounds, 8))
      .map(([key]) => `${key} outside career panel`);
    const snapshotBounds = normalizeBounds(career.snapshot);
    const backButtonBounds = normalizeBounds(career.backButton);
    const overlapFailures = [
      intersects(normalizeBounds(career.rankGauge), normalizeBounds(career.body), 4) ? 'rank gauge overlaps body' : null,
      intersects(normalizeBounds(career.flowBar), backButtonBounds, 4) ? 'flow bar overlaps back button' : null,
      intersects(snapshotBounds, backButtonBounds, 4) ? 'snapshot overlaps back button' : null,
      ...(career.cards || []).map((card, index) => (
        intersects(normalizeBounds(card), backButtonBounds, 4)
          ? `card${index} overlaps back button`
          : null
      )),
      ...(career.cards || []).map((card, index) => (
        intersects(normalizeBounds(card), snapshotBounds, 4)
          ? `card${index} overlaps snapshot`
          : null
      )),
      ...(career.stats || []).map((stat, index) => (
        intersects(normalizeBounds(stat), backButtonBounds, 4)
          ? `stat${index} overlaps back button`
          : null
      )),
      ...(career.stats || []).map((stat, index) => (
        intersects(normalizeBounds(stat), snapshotBounds, 4)
          ? `stat${index} overlaps snapshot`
          : null
      ))
    ].filter(Boolean);

    const screenshot = path.join(outputDir, `career-intel-${viewport.name}-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    reports.push({
      viewport,
      panel,
      career,
      containmentFailures,
      overlapFailures,
      screenshot,
      ok: Boolean(
        panel &&
        career.visible === true &&
        namedBounds.length >= 10 &&
        containmentFailures.length === 0 &&
        overlapFailures.length === 0
      )
    });
    await page.close();
  }

  const report = {
    ok: reports.every((item) => item.ok) && pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    reports,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[career-intel-layout] PASS outputDir=${outputDir}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
