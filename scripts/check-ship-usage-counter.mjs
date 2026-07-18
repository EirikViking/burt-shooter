import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4621));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ship-usage-counter-${timestamp()}`);

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
  throw new Error(`No available ship usage check port found starting at ${startPort}`);
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
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function waitForScene(page, sceneName) {
  await page.waitForFunction((expected) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === expected;
  }, sceneName, { timeout: 12000 });
}

async function collectVisibleTexts(page) {
  return page.evaluate(() => {
    const out = [];
    const walk = (node) => {
      if (!node) return;
      if (typeof node.text === 'string' && node.visible !== false) out.push(node.text);
      for (const child of node.children || []) walk(child);
    };
    walk(window.__game?.currentScene?.container);
    return out;
  });
}

async function getUsageLine(page, spriteKey) {
  await page.evaluate(async (key) => {
    await window.__game.showShipDetails(key);
  }, spriteKey);
  await waitForScene(page, 'shipDetails');
  const texts = await collectVisibleTexts(page);
  const usageLine = texts.find((text) => /YOUR LAUNCHES/.test(text)) || null;
  assert.ok(usageLine, `Ship details usage line not found for ${spriteKey}. Texts: ${texts.join(' | ')}`);
  return usageLine;
}

async function showShipSelect(page, spriteKey) {
  await page.evaluate(async (key) => {
    window.__game.shipSelectReturnSpriteKey = key;
    await window.__game.showShipSelect();
  }, spriteKey);
  await waitForScene(page, 'shipSelect');
  await page.waitForFunction((key) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.shipSelect?.spriteKey === key;
  }, spriteKey, { timeout: 12000 });
  return page.evaluate(() => JSON.parse(window.render_game_to_text()).shipSelect);
}

mkdirSync(outputDir, { recursive: true });

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir
};

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.showShipDetails && window.__game?.startGame), { timeout: 30000 });

  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 999999, bestRank: 19, bestLevel: 60 }));
    Object.defineProperty(window, '__novaSteamCloudDiagnostics', {
      configurable: true,
      value: Object.freeze({
        sync: async () => {
          window.__shipUsageCloudSyncCount = (window.__shipUsageCloudSyncCount || 0) + 1;
          return { ok: true };
        }
      })
    });
  });

  await page.evaluate(() => {
    localStorage.setItem('burt.shipUsage.v1', JSON.stringify({ 'row2_ship_1.png': 3 }));
    localStorage.setItem('burt.shipUsageTotal.v1', '3');
  });
  const legacyBeforeLaunch = await getUsageLine(page, 'nova-player-ship-01.png');
  assert.match(legacyBeforeLaunch, /YOUR LAUNCHES:\s*3\s*\/\/\s*LOCAL PROFILE/);

  const cloudSyncBeforeLaunch = await page.evaluate(() => window.__shipUsageCloudSyncCount || 0);
  await page.evaluate(async () => {
    await window.__game.startGame('nova-player-ship-01.png');
  });
  await waitForScene(page, 'play');

  const afterLaunchUsage = await page.evaluate(() => JSON.parse(localStorage.getItem('burt.shipUsage.v1') || '{}'));
  assert.equal(afterLaunchUsage.nova_ship_01, 4);
  assert.equal(afterLaunchUsage['row2_ship_1.png'], 3);

  const cloudSyncAfterLaunch = await page.evaluate(() => window.__shipUsageCloudSyncCount || 0);
  assert.ok(
    cloudSyncAfterLaunch > cloudSyncBeforeLaunch,
    `Expected launch to request Steam Cloud sync; before=${cloudSyncBeforeLaunch} after=${cloudSyncAfterLaunch}`
  );

  const starterAfterLaunch = await getUsageLine(page, 'nova-player-ship-01.png');
  assert.match(starterAfterLaunch, /YOUR LAUNCHES:\s*4\s*\/\/\s*LOCAL PROFILE/);

  await page.evaluate(() => {
    localStorage.setItem('burt.shipUsage.v1', JSON.stringify({ nova_ship_24: 7 }));
    localStorage.setItem('burt.shipUsageTotal.v1', '7');
  });
  const canonicalDetailsLine = await getUsageLine(page, 'nova-player-ship-24.png');
  assert.match(canonicalDetailsLine, /YOUR LAUNCHES:\s*7\s*\/\/\s*LOCAL PROFILE/);

  const firstFlightShip = 'nova-player-ship-02.png';
  await page.evaluate(() => {
    localStorage.setItem('burt.shipUsage.v1', JSON.stringify({
      nova_ship_01: 4,
      'row2_ship_1.png': 3,
      nova_ship_24: 7
    }));
    localStorage.setItem('burt.shipUsageTotal.v1', '11');
  });

  const firstFlightInitial = await showShipSelect(page, firstFlightShip);
  await page.waitForTimeout(650);
  assert.equal(firstFlightInitial.usageCount, 0);
  assert.equal(firstFlightInitial.firstFlight?.eligible, true);
  assert.equal(firstFlightInitial.firstFlight?.badgeVisible, true);
  assert.equal(firstFlightInitial.firstFlight?.badgeText, 'FIRST FLIGHT');
  assert.ok(firstFlightInitial.firstFlight?.badgeBounds?.width > 80);

  const firstFlightBeforeReference = path.join(outputDir, 'ship-first-flight-before-reference.png');
  const firstFlightVisualState = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    const card = scene?.shipCards?.[scene.selectedIndex];
    const state = {
      badgeVisible: Boolean(card?.firstFlightBadge?.visible),
      selectionText: scene?.selectionInfoText?.text || '',
      unlockText: scene?.rightIntel?.unlock?.text || ''
    };
    if (card?.firstFlightBadge) card.firstFlightBadge.visible = false;
    if (scene?.selectionInfoText) {
      scene.selectionInfoText.text = state.selectionText.replace(/\|\s*FIRST FLIGHT\s*$/, '|  READY');
    }
    if (scene?.rightIntel?.unlock) {
      const [, ...historyLines] = state.unlockText.split('\n');
      scene.rightIntel.unlock.text = ['STATUS: READY FOR LAUNCH', ...historyLines].join('\n');
    }
    return state;
  });
  await page.waitForTimeout(420);
  await page.screenshot({ path: firstFlightBeforeReference, fullPage: true });
  await page.evaluate((state) => {
    const scene = window.__game?.currentScene;
    const card = scene?.shipCards?.[scene.selectedIndex];
    if (card?.firstFlightBadge) card.firstFlightBadge.visible = state.badgeVisible;
    if (scene?.selectionInfoText) scene.selectionInfoText.text = state.selectionText;
    if (scene?.rightIntel?.unlock) scene.rightIntel.unlock.text = state.unlockText;
  }, firstFlightVisualState);
  await page.waitForTimeout(420);

  const firstFlightScreenshot = path.join(outputDir, 'ship-first-flight-badge.png');
  await page.screenshot({ path: firstFlightScreenshot, fullPage: true });

  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  const firstFlightAfterFocusCycle = JSON.parse(await page.evaluate(() => window.render_game_to_text())).shipSelect;
  assert.equal(firstFlightAfterFocusCycle.usageCount, 0);
  assert.equal(firstFlightAfterFocusCycle.firstFlight?.badgeVisible, true);

  const firstFlightDetailsLine = await getUsageLine(page, firstFlightShip);
  assert.match(firstFlightDetailsLine, /YOUR LAUNCHES:\s*0\s*\/\/\s*LOCAL PROFILE/);
  const firstFlightAfterDetails = await showShipSelect(page, firstFlightShip);
  assert.equal(firstFlightAfterDetails.usageCount, 0);
  assert.equal(firstFlightAfterDetails.firstFlight?.badgeVisible, true);

  const invalidLaunch = await page.evaluate(async (key) => {
    const before = JSON.parse(localStorage.getItem('burt.shipUsage.v1') || '{}');
    const started = await window.__game.startGame(key, {
      runMode: 'daily_signal',
      dailySignalContract: { dailyKey: 'invalid' }
    });
    const after = JSON.parse(localStorage.getItem('burt.shipUsage.v1') || '{}');
    return { started, before, after };
  }, firstFlightShip);
  assert.equal(invalidLaunch.started, false);
  assert.deepEqual(invalidLaunch.after, invalidLaunch.before);

  const suppressedLaunch = await page.evaluate(async (key) => {
    const started = await window.__game.startGame(key, {
      runMode: 'scout',
      countShipUsage: false
    });
    return {
      started,
      usage: JSON.parse(localStorage.getItem('burt.shipUsage.v1') || '{}')
    };
  }, firstFlightShip);
  assert.equal(suppressedLaunch.started, true);
  await waitForScene(page, 'play');
  assert.equal(suppressedLaunch.usage.nova_ship_02 || 0, 0);

  const firstFlightAfterSuppressedLaunch = await showShipSelect(page, firstFlightShip);
  assert.equal(firstFlightAfterSuppressedLaunch.usageCount, 0);
  assert.equal(firstFlightAfterSuppressedLaunch.firstFlight?.badgeVisible, true);

  const scoutLaunch = await page.evaluate(async (key) => {
    const started = await window.__game.startGame(key, { runMode: 'scout' });
    return {
      started,
      usage: JSON.parse(localStorage.getItem('burt.shipUsage.v1') || '{}')
    };
  }, firstFlightShip);
  assert.equal(scoutLaunch.started, true);
  await waitForScene(page, 'play');
  assert.equal(scoutLaunch.usage.nova_ship_02, 1);

  const firstFlightAfterRealLaunch = await showShipSelect(page, firstFlightShip);
  assert.equal(firstFlightAfterRealLaunch.usageCount, 1);
  assert.equal(firstFlightAfterRealLaunch.firstFlight?.eligible, false);
  assert.equal(firstFlightAfterRealLaunch.firstFlight?.badgeVisible, false);

  const detailsScreenshot = path.join(outputDir, 'ship-usage-details.png');
  await getUsageLine(page, 'nova-player-ship-24.png');
  await page.screenshot({ path: detailsScreenshot, fullPage: true });

  report.status = 'passed';
  report.legacyBeforeLaunch = legacyBeforeLaunch;
  report.starterAfterLaunch = starterAfterLaunch;
  report.canonicalDetailsLine = canonicalDetailsLine;
  report.afterLaunchUsage = afterLaunchUsage;
  report.cloudSyncBeforeLaunch = cloudSyncBeforeLaunch;
  report.cloudSyncAfterLaunch = cloudSyncAfterLaunch;
  report.firstFlight = {
    ship: firstFlightShip,
    initial: firstFlightInitial,
    afterFocusCycle: firstFlightAfterFocusCycle,
    detailsLine: firstFlightDetailsLine,
    afterDetails: firstFlightAfterDetails,
    invalidLaunch,
    suppressedLaunch,
    afterSuppressedLaunch: firstFlightAfterSuppressedLaunch,
    scoutLaunch,
    afterRealLaunch: firstFlightAfterRealLaunch,
    beforeReferenceScreenshot: firstFlightBeforeReference,
    screenshot: firstFlightScreenshot
  };
  report.pageErrors = pageErrors;
  report.consoleErrors = consoleErrors;
  report.screenshot = detailsScreenshot;

  assert.equal(pageErrors.length, 0);
  assert.equal(consoleErrors.length, 0);

  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[ship-usage-counter] PASS legacy="${legacyBeforeLaunch}" launched="${starterAfterLaunch}" firstFlight=0->1 scout=true suppressed=true cloudSyncDelta=${cloudSyncAfterLaunch - cloudSyncBeforeLaunch} screenshot=${firstFlightScreenshot}`);
} catch (error) {
  report.status = 'failed';
  report.error = error?.stack || error?.message || String(error);
  report.pageErrors = pageErrors;
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  await page.close({ runBeforeUnload: false }).catch(() => {});
  await browser.close();
  if (server) server.kill();
}
