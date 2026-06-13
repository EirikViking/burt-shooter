import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { THREAT_CODEX_CATEGORIES, getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(5200));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/codex-tab-count-layout-${timestamp()}`);
const viewports = [
  { width: 1600, height: 900, name: '1600x900' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 720, name: '1280x720' }
];
const seededDiscoveryTargets = {
  enemies: 20,
  attackPatterns: 16,
  waveTactics: 8,
  powerups: 5,
  sectors: 5,
  elites: 8,
  bosses: 8,
  runThemes: 5,
  cabinetLogs: 5
};
const catalogForExpectations = getThreatCodexCatalog();
const expectedCounts = Object.fromEntries(
  Object.entries(seededDiscoveryTargets)
    .filter(([category]) => Array.isArray(catalogForExpectations[category]))
    .map(([category, target]) => [
      category,
      `${Math.min(target, catalogForExpectations[category].length)}/${catalogForExpectations[category].length}`
    ])
);

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
    const target = Math.min(Number(seededDiscoveryTargets[category]) || 0, entries.length);
    const discoveredEntries = (entries || []).slice(Math.max(0, entries.length - target));
    items[category] = Object.fromEntries(discoveredEntries.map((entry) => [entry.id, {
      id: entry.id,
      category,
      name: entry.name,
      firstSeenAt: '2026-06-08T00:00:00.000Z',
      lastSeenAt: '2026-06-08T00:00:00.000Z',
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
    updatedAt: '2026-06-08T00:00:00.000Z'
  };
}

async function openCodex(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.showThreatCodex), null, { timeout: 30000 });
  await page.evaluate((seed) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify(seed));
  }, seededDiscoveryState());
  await page.evaluate(() => window.__game.showThreatCodex());
  await page.waitForFunction((categoryCount) => {
    const scene = window.__game?.scenes?.threatCodex;
    return window.__game?.currentSceneName === 'threatCodex' &&
      Array.isArray(scene?.lastCategoryTabsDebug) &&
      scene.lastCategoryTabsDebug.length === categoryCount;
  }, THREAT_CODEX_CATEGORIES.length, { timeout: 10000 });
  await page.waitForTimeout(300);
}

async function inspectTabs(page) {
  return page.evaluate(() => {
    const scene = window.__game?.scenes?.threatCodex;
    const category = scene?.getCategory?.()?.id || null;
    const entries = scene?.getEntriesForCategory?.(category) || [];
    return {
      scene: window.__game?.currentSceneName || null,
      category,
      completionCounts: scene?.completionCounts || null,
      firstEntries: entries.slice(0, 12).map((entry) => ({
        id: entry.id,
        name: entry.name || null,
        discovered: Boolean(scene?.isDiscovered?.(entry, category))
      })),
      tabs: (scene?.lastCategoryTabsDebug || []).map((item) => ({
        ...item,
        countToDividerGap: Number(item.countToDividerGap),
        labelToCountGap: Number(item.labelToCountGap)
      }))
    };
  });
}

function validateSnapshot(snapshot, viewportName) {
  assert.equal(snapshot.scene, 'threatCodex', `${viewportName}: Codex scene did not open`);
  assert.equal(snapshot.tabs.length, THREAT_CODEX_CATEGORIES.length, `${viewportName}: missing category tab debug entries`);
  const byId = new Map(snapshot.tabs.map((item) => [item.id, item]));
  for (const [id, expected] of Object.entries(expectedCounts)) {
    assert.equal(byId.get(id)?.count, expected, `${viewportName}: ${id} count should be ${expected}`);
  }
  for (const tab of snapshot.tabs) {
    assert.equal(tab.countInsideTab, true, `${viewportName}: ${tab.id} count escaped tab bounds`);
    assert.ok(tab.countToDividerGap >= 3, `${viewportName}: ${tab.id} count is too close to divider (${tab.countToDividerGap}px)`);
    assert.ok(tab.labelToCountGap >= 2, `${viewportName}: ${tab.id} label/count overlap (${tab.labelToCountGap}px)`);
  }
  const categoryTarget = Math.min(Number(seededDiscoveryTargets[snapshot.category]) || 0, catalogForExpectations[snapshot.category]?.length || 0);
  const firstExpectedDiscovered = Math.min(categoryTarget, snapshot.firstEntries.length);
  for (const entry of snapshot.firstEntries.slice(0, firstExpectedDiscovered)) {
    assert.equal(entry.discovered, true, `${viewportName}: discovered Codex item ${entry.id} should sort before locked signals`);
  }
  const firstLocked = snapshot.firstEntries[firstExpectedDiscovered];
  if (categoryTarget > 0 && firstLocked) {
    assert.equal(firstLocked.discovered, false, `${viewportName}: locked Codex item ${firstLocked.id} appeared before all discovered entries`);
  }
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;
const consoleEvents = [];

try {
  server = await startDevServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome()
  });
  const snapshots = [];
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleEvents.push({ type: message.type(), text: message.text().slice(0, 500), viewport: viewport.name });
      }
    });
    page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message, viewport: viewport.name }));
    await openCodex(page);
    const snapshot = await inspectTabs(page);
    validateSnapshot(snapshot, viewport.name);
    const screenshotPath = path.join(outputDir, `codex-tab-counts-${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    snapshots.push({ viewport, screenshotPath, snapshot });
    await page.close();
  }
  assert.equal(consoleEvents.length, 0, `browser console/page errors: ${JSON.stringify(consoleEvents)}`);
  const report = {
    ok: true,
    baseUrl,
    expectedCounts,
    snapshots,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'codex-tab-count-layout-report.json'), JSON.stringify(report, null, 2));
  console.log(`[codex-tab-count-layout] PASS outputDir=${outputDir}`);
} catch (error) {
  const report = {
    ok: false,
    baseUrl,
    expectedCounts,
    consoleEvents,
    error: error?.stack || error?.message || String(error)
  };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'codex-tab-count-layout-report.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
}
