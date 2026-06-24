import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4422));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/hangar-profile-repair-notice-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

async function startServer() {
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
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function repairedProfile() {
  return {
    version: 1,
    unlockTuningVersion: 3,
    integrityRepairVersion: 1,
    integrityRepairReason: 'legacy_codex_rescue_inflation',
    pilotXp: 8000,
    pilotRank: 3,
    highestPilotRank: 3,
    totalRuns: 12,
    bestScore: 168666,
    bestSector: 31,
    bestLevel: 31,
    totalBossesDefeated: 19,
    totalWavesCleared: 123,
    totalCodexDiscoveries: 124,
    unlockedShipIds: ['nova_ship_01', 'nova_ship_02', 'nova_ship_03']
  };
}

function normalProfile() {
  return {
    ...repairedProfile(),
    integrityRepairVersion: undefined,
    integrityRepairReason: undefined,
    totalCodexDiscoveries: 12,
    unlockedShipIds: ['nova_ship_01', 'nova_ship_02']
  };
}

async function openHangarWithProfile(page, progress) {
  await page.evaluate((nextProgress) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(nextProgress));
    localStorage.removeItem('burt.shipUnlockProgress.v1');
    localStorage.removeItem('nova.threatDiscovery.v1');
  }, progress);
  await page.evaluate(async () => {
    await window.__game?.showShipSelect?.();
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'shipSelect', null, { timeout: 10000 });
  await page.waitForTimeout(350);
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const server = await startServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const pageErrors = [];
const consoleErrors = [];

try {
  mkdirSync(outputDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}?skipIntro=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.showShipSelect), null, { timeout: 30000 });
  await page.evaluate(async () => {
    await window.__novaI18n?.setLanguagePreference?.('en');
  });

  const repairedState = await openHangarWithProfile(page, repairedProfile());
  const repairedStats = String(repairedState.shipSelect?.careerSignal?.stats || '');
  assert(repairedStats.includes('PROFILE REPAIRED'), `missing repaired profile line: ${repairedStats}`);
  assert(repairedStats.includes('RUN EVIDENCE VERIFIED'), `missing run evidence line: ${repairedStats}`);
  assert(!repairedStats.includes('LOCAL PROFILE'), `repaired profile should not show generic footer: ${repairedStats}`);
  const repairedScreenshot = path.join(outputDir, 'hangar-profile-repair-notice.png');
  await page.screenshot({ path: repairedScreenshot, fullPage: true });

  const normalState = await openHangarWithProfile(page, normalProfile());
  const normalStats = String(normalState.shipSelect?.careerSignal?.stats || '');
  assert(normalStats.includes('LOCAL PROFILE'), `normal profile should retain generic footer: ${normalStats}`);
  assert(!normalStats.includes('PROFILE REPAIRED'), `normal profile should not show repair footer: ${normalStats}`);

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join('; ')}`);

  const report = {
    repairedStats,
    normalStats,
    repairedScreenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[hangar-profile-repair-notice] PASS output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
