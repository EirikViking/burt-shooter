import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { THREAT_CODEX_CATEGORIES, getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(5220));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/codex-lore-layout');
const scenarios = [
  { locale: 'en', width: 1920, height: 1080, category: 'enemies', entryId: 'rare_chaos_visitor_11', label: 'en-long-chaos-name' },
  { locale: 'de', width: 1600, height: 900, category: 'augments', entryId: 'combo_anchor', label: 'de-augment' },
  { locale: 'es', width: 1600, height: 900, category: 'cabinetLogs', entryId: 'codex-discovery', label: 'es-cabinet-log' },
  { locale: 'ru', width: 1600, height: 900, category: 'bosses', entryId: 'nova_boss_03', label: 'ru-boss' },
  { locale: 'zh-CN', width: 1366, height: 768, category: 'powerups', entryId: 'nova_miracle', label: 'zh-powerup' },
  { locale: 'pt-BR', width: 1366, height: 768, category: 'sectors', entryId: 'sector_060', label: 'pt-sector' },
  { locale: 'ko', width: 1366, height: 768, category: 'pilotRanks', entryId: 'pilot_rank_39', label: 'ko-rank' },
  { locale: 'ja', width: 1366, height: 768, category: 'attackPatterns', entryId: 'telegraph_rail_lance', label: 'ja-pattern' }
];

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
  throw new Error(`No available port starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite did not become ready at ${baseUrl}`);
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
  const catalog = getThreatCodexCatalog({ locale: 'en' });
  const items = {};
  for (const [category, entries] of Object.entries(catalog)) {
    items[category] = Object.fromEntries(entries.map((entry) => [entry.id, {
      id: entry.id,
      category,
      name: entry.name,
      firstSeenAt: '2026-07-13T00:00:00.000Z',
      lastSeenAt: '2026-07-13T00:00:00.000Z',
      timesSeen: 3,
      timesDefeated: ['enemies', 'elites', 'bosses'].includes(category) ? 2 : 0,
      timesSurvived: category === 'runThemes' ? 1 : 0,
      timesKilledPlayer: 0,
      metadata: {}
    }]));
  }
  return {
    version: 1,
    items,
    discoveriesThisRun: [],
    recentRunThemes: [],
    unreadIds: [],
    updatedAt: '2026-07-13T00:00:00.000Z'
  };
}

async function openScenario(page, scenario, discoveryState) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(({ locale, discovery }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', locale);
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify(discovery));
  }, { locale: scenario.locale, discovery: discoveryState });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(({ locale }) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return Boolean(window.__game?.showThreatCodex) && state.language?.current === locale;
  }, { locale: scenario.locale }, { timeout: 30000 });
  await page.evaluate(() => window.__game.showThreatCodex());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'threatCodex', null, { timeout: 10000 });
  const categoryIndex = THREAT_CODEX_CATEGORIES.findIndex((entry) => entry.id === scenario.category);
  await page.evaluate(({ categoryIndex: nextCategory, entryId }) => {
    const scene = window.__game?.scenes?.threatCodex;
    scene.categoryIndex = nextCategory;
    const entries = scene.getEntriesForCategory?.() || [];
    scene.entryIndex = Math.max(0, entries.findIndex((entry) => entry.id === entryId));
    scene.refresh();
  }, { categoryIndex, entryId: scenario.entryId });
  await page.waitForTimeout(450);
}

async function inspectScenario(page) {
  return page.evaluate(() => {
    const scene = window.__game?.scenes?.threatCodex;
    const width = window.__game?.getWidth?.() || window.innerWidth;
    const height = window.__game?.getHeight?.() || window.innerHeight;
    const texts = [];
    const walk = (node) => {
      if (!node || node.visible === false || node.alpha === 0) return;
      if (typeof node.text === 'string' && node.text.trim() && typeof node.getBounds === 'function') {
        const bounds = node.getBounds();
        texts.push({
          text: node.text,
          x: bounds.x,
          y: bounds.y,
          right: bounds.x + bounds.width,
          bottom: bounds.y + bounds.height
        });
      }
      for (const child of node.children || []) walk(child);
    };
    walk(scene?.container);
    const selected = scene?.getSelectedEntry?.() || null;
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return {
      state: {
        scene: state.scene,
        language: state.language,
        threatCodexScreen: state.threatCodexScreen
      },
      selected: selected ? {
        id: selected.id,
        category: selected.category,
        name: selected.name,
        description: selected.description,
        tip: selected.tip
      } : null,
      debug: scene?.getDebugState?.() || null,
      outOfBounds: texts.filter((item) => item.x < -8 || item.y < -8 || item.right > width + 8 || item.bottom > height + 8),
      visibleTextCount: texts.length
    };
  });
}

async function makeContactSheet(browser, screenshots) {
  const htmlPath = path.join(outputDir, 'codex-lore-locales.html');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#02070c;color:#dffcff;font:16px Arial}main{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px}
    figure{margin:0;padding:8px;border:1px solid #37f5ff;background:#06101a}img{display:block;width:100%}figcaption{padding-top:7px;color:#ffe76a;font-weight:700}
  </style><main>${screenshots.map((shot) => `<figure><img src="${pathToFileURL(shot.path).href}"><figcaption>${shot.label}</figcaption></figure>`).join('')}</main>`;
  writeFileSync(htmlPath, html);
  const page = await browser.newPage({ viewport: { width: 1800, height: 1800 } });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  const imagePath = path.join(outputDir, 'codex-lore-locales.png');
  await page.screenshot({ path: imagePath, fullPage: true });
  await page.close();
  return imagePath;
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const discoveryState = seededDiscoveryState();
const reports = [];
const screenshots = [];
const consoleErrors = [];
const pageErrors = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`${scenario.label}: ${message.text()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(`${scenario.label}: ${error.message}`));
    await openScenario(page, scenario, discoveryState);
    const snapshot = await inspectScenario(page);
    const expected = getThreatCodexCatalog({ locale: scenario.locale })[scenario.category]
      .find((entry) => entry.id === scenario.entryId);
    const screenshotPath = path.join(outputDir, `${scenario.label}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push({ label: `${scenario.locale} · ${scenario.category} · ${scenario.entryId}`, path: screenshotPath });
    const ok = snapshot.state.scene === 'threatCodex'
      && snapshot.state.language?.current === scenario.locale
      && snapshot.selected?.id === scenario.entryId
      && snapshot.selected?.description === expected?.description
      && snapshot.selected?.tip === expected?.tip
      && snapshot.visibleTextCount > 20
      && snapshot.debug?.detailScroll?.height > 50
      && snapshot.outOfBounds.length === 0
      && !/\{[a-zA-Z0-9_]+\}/.test(`${snapshot.selected?.description} ${snapshot.selected?.tip}`);
    reports.push({ scenario, ok, screenshotPath, snapshot });
    await page.close();
  }
  const contactSheet = await makeContactSheet(browser, screenshots);
  const report = {
    ok: reports.every((item) => item.ok) && !consoleErrors.length && !pageErrors.length,
    baseUrl,
    contactSheet,
    reports,
    consoleErrors,
    pageErrors
  };
  writeFileSync(path.join(outputDir, 'codex-lore-layout-report.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[codex-lore-layout] PASS scenarios=${reports.length} contactSheet=${contactSheet}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
