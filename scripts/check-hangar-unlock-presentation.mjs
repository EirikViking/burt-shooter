import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4415));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/hangar-unlock-presentation-${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });

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
  if (fs.existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
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
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function seededHangarProgress() {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 9000,
    pilotRank: 3,
    highestPilotRank: 3,
    totalRuns: 2,
    bestScore: 42000,
    bestSector: 4,
    bestLevel: 4,
    totalBossesDefeated: 1,
    totalWavesCleared: 18,
    totalCodexDiscoveries: 4,
    noHitWaves: 1,
    unlockedShipIds: ['nova_ship_01', 'nova_ship_02'],
    lastNewlyUnlockedShipIds: ['nova_ship_02']
  };
}

async function renderState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const server = await startPreviewServer();
console.log(`[hangar-unlock-presentation] preview ready ${baseUrl}`);
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.showShipSelect, null, { timeout: 30000 });
  await page.evaluate((progress) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.removeItem('burt.shipUnlockProgress.v1');
    localStorage.removeItem('nova.threatDiscovery.v1');
  }, seededHangarProgress());
  await page.evaluate(async () => {
    await window.__game.showShipSelect();
  });
  try {
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'shipSelect' && state.shipSelect?.unlockPresentation?.visible === true;
    }, null, { timeout: 15000 });
  } catch (error) {
    const state = await renderState(page);
    const diagnostic = await page.evaluate(() => ({
      localHangarProgress: JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || 'null'),
      sceneProgress: window.__game?.currentScene?.unlockProgress || null,
      pending: window.__game?.currentScene?.pendingHangarUnlockShips?.map?.(ship => ({
        id: ship.id,
        baseId: ship.baseId,
        spriteKey: ship.spriteKey,
        name: ship.name
      })) || null
    }));
    throw new Error(`hangar unlock presentation did not appear: ${error.message}\n${JSON.stringify({
      unlockPresentation: state.shipSelect?.unlockPresentation || null,
      diagnostic
    }, null, 2)}`);
  }
  await page.waitForTimeout(950);

  const activeState = await renderState(page);
  const reveal = activeState.shipSelect?.unlockPresentation || {};
  assert(reveal.visible === true, 'hangar unlock presentation was not visible');
  assert(reveal.active === true, 'hangar unlock presentation was not active');
  assert(reveal.animated === true, 'hangar unlock presentation did not animate');
  assert(reveal.count === 1, `expected one pending unlock, got ${reveal.count}`);
  assert(reveal.selectedUnlockFocused === true, 'newly unlocked ship was not focused');
  assert(reveal.layout?.spriteCount >= 1, `expected at least one reveal sprite, got ${JSON.stringify(reveal.layout)}`);
  assert(reveal.bounds?.width > 800 && reveal.bounds?.height > 400, `presentation bounds too small: ${JSON.stringify(reveal.bounds)}`);
  assert(String(reveal.title || '').includes('NEW HULL'), `unexpected reveal title: ${reveal.title}`);
  await page.screenshot({ path: path.join(outputDir, '01-hangar-unlock-presentation.png'), fullPage: true });

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'shipSelect'
      && state.shipSelect?.unlockPresentation?.visible === false
      && state.shipSelect?.unlockPresentation?.acknowledged === true;
  }, null, { timeout: 10000 });
  const ack = await page.evaluate(() => JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}').lastNewlyUnlockedShipIds || []);
  assert(Array.isArray(ack) && ack.length === 0, `unlock presentation was not acknowledged: ${JSON.stringify(ack)}`);

  await page.evaluate(async () => {
    window.__game.showMenu();
    await window.__game.showShipSelect();
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'shipSelect';
  }, null, { timeout: 10000 });
  await page.waitForTimeout(600);
  const repeatState = await renderState(page);
  assert(repeatState.shipSelect?.unlockPresentation?.visible === false, 'acknowledged presentation replayed on second hangar entry');
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);
  await page.screenshot({ path: path.join(outputDir, '02-hangar-after-ack.png'), fullPage: true });
  console.log(`[hangar-unlock-presentation] PASS output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
