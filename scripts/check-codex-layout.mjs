import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { THREAT_CODEX_CATEGORIES, getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(5176));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/codex-revamp-20260606/layout');
const viewports = [
  { width: 1600, height: 900, name: '1600x900' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 720, name: '1280x720' }
];
const categoryShots = ['enemies', 'powerups', 'sectors'];

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

function seededDiscoveryState() {
  const catalog = getThreatCodexCatalog();
  const items = {};
  for (const [category, entries] of Object.entries(catalog)) {
    if (category === 'powerups' || category === 'sectors') continue;
    items[category] = Object.fromEntries((entries || []).map((entry) => [entry.id, {
      id: entry.id,
      category,
      name: entry.name,
      firstSeenAt: '2026-06-06T00:00:00.000Z',
      lastSeenAt: '2026-06-06T00:00:00.000Z',
      timesSeen: 3,
      timesDefeated: ['enemies', 'elites', 'bosses'].includes(category) ? 2 : 0,
      timesSurvived: category === 'runThemes' ? 1 : 0,
      timesKilledPlayer: 0,
      bestClearTimeAgainst: null,
      highestScoreDuringEncounter: 1000,
      metadata: {}
    }]));
  }
  return {
    version: 1,
    items,
    discoveriesThisRun: [],
    recentRunThemes: [],
    unreadIds: [],
    updatedAt: '2026-06-06T00:00:00.000Z'
  };
}

async function openCodex(page) {
  const state = seededDiscoveryState();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((seed) => {
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify(seed));
  }, state);
  await page.waitForFunction(() => Boolean(window.__game?.showThreatCodex), null, { timeout: 30000 });
  await page.evaluate(() => window.__game.showThreatCodex());
  await page.waitForFunction(() => window.__game?.currentSceneName === 'threatCodex', null, { timeout: 10000 });
  await page.waitForTimeout(550);
}

async function selectCategory(page, categoryId) {
  const index = THREAT_CODEX_CATEGORIES.findIndex((category) => category.id === categoryId);
  if (index < 0) throw new Error(`Unknown Codex category ${categoryId}`);
  await page.evaluate((categoryIndex) => {
    const scene = window.__game?.scenes?.threatCodex;
    if (!scene) return;
    scene.categoryIndex = categoryIndex;
    scene.entryIndex = 0;
    scene.refresh();
  }, index);
  await page.waitForTimeout(450);
}

async function inspectBounds(page) {
  return page.evaluate(() => {
    const scene = window.__game?.scenes?.threatCodex;
    const width = window.__game?.getWidth?.() || window.innerWidth;
    const height = window.__game?.getHeight?.() || window.innerHeight;
    const texts = [];
    const walk = (node) => {
      if (!node || node.visible === false || node.alpha === 0) return;
      const hasText = typeof node.text === 'string' && node.text.trim().length > 0;
      if (hasText && typeof node.getBounds === 'function') {
        const b = node.getBounds();
        if (Number.isFinite(b.x) && Number.isFinite(b.y) && b.width > 0 && b.height > 0) {
          texts.push({
            text: node.text,
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            right: b.x + b.width,
            bottom: b.y + b.height
          });
        }
      }
      for (const child of node.children || []) walk(child);
    };
    walk(scene?.container);
    const outOfBounds = texts.filter((item) => (
      item.x < -8 ||
      item.y < -8 ||
      item.right > width + 8 ||
      item.bottom > height + 8
    ));
    return {
      width,
      height,
      scene: window.__game?.currentSceneName,
      category: scene?.getCategory?.()?.id,
      entryCount: scene?.getEntriesForCategory?.()?.length || 0,
      entryScroll: scene?.lastEntryListDebug || null,
      textCount: texts.length,
      outOfBounds
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
  const htmlPath = path.join(outputDir, 'codex-after-contact-sheet.html');
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
  const page = await browser.newPage({ viewport: { width: 1800, height: 1700 } });
  await page.goto(pathToFileURL(htmlPath).href);
  const pngPath = path.join(outputDir, 'codex-after-contact-sheet.png');
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath };
}

const server = await startDevServer();
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
  const screenshots = [];
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await openCodex(page);
    for (const categoryId of categoryShots) {
      await selectCategory(page, categoryId);
      const snapshot = await inspectBounds(page);
      const screenshotPath = path.join(outputDir, `codex-after-${viewport.name}-${categoryId}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const label = `${viewport.name} ${categoryId}`;
      screenshots.push({ label, path: screenshotPath });
      reports.push({
        viewport,
        categoryId,
        screenshotPath,
        snapshot,
        ok: snapshot.scene === 'threatCodex' &&
          snapshot.category === categoryId &&
          snapshot.entryCount > 0 &&
          snapshot.textCount > 20 &&
          snapshot.outOfBounds.length === 0
      });
    }
    await page.close();
  }
  const contactSheet = await makeContactSheet(browser, screenshots);
  const report = {
    ok: reports.every((item) => item.ok) && pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    reports,
    contactSheet,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'codex-layout-report.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[codex-layout] PASS outputDir=${outputDir}`);
    console.log(`[codex-layout] contactSheet=${contactSheet.pngPath}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
