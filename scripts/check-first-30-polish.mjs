import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4390));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/first-30-polish-${timestamp()}`);

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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForMenu(page) {
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 15000 });
}

async function waitForPlayReady(page) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && state.player?.active === true && state.wave?.state && state.wave.state !== 'IDLE';
  }, null, { timeout: 20000 });
}

async function testMenuKey(browser, key, screenshotName) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForMenu(page);
  await page.keyboard.press(key);
  await waitForPlayReady(page);
  const state = await readState(page);
  const screenshot = path.join(outputDir, screenshotName);
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.close();
  return { key, state, pageErrors, consoleErrors, screenshot };
}

async function testFirstRunPickup(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlayReady(page);
  await page.waitForFunction(() => (
    (window.__game?.scenes?.play?.enemyManager?.enemies || []).filter((enemy) => enemy?.active).length >= 3
  ), null, { timeout: 12000 });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const targets = (play?.enemyManager?.enemies || []).filter((enemy) => enemy?.active).slice(0, 2);
    for (const enemy of targets) {
      play.onEnemyKilled(enemy);
      enemy.active = false;
      enemy.destroy?.();
    }
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return (play?.powerupManager?.powerups || []).some((powerup) => powerup?.active && powerup.type === 'rapid_fire');
  }, null, { timeout: 5000 });
  const state = await readState(page);
  const powerups = await page.evaluate(() => (window.__game?.scenes?.play?.powerupManager?.powerups || [])
    .filter((powerup) => powerup?.active)
    .map((powerup) => ({ type: powerup.type, x: Math.round(powerup.x), y: Math.round(powerup.y) })));
  const screenshot = path.join(outputDir, 'first-run-pickup.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.close();
  return { state, powerups, pageErrors, consoleErrors, screenshot };
}

async function testDodgeAlpha(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlayReady(page);
  const alpha = await page.evaluate(async () => {
    const player = window.__game?.scenes?.play?.player;
    if (!player?.startDodge) throw new Error('Missing player dodge hook');
    player.dodgeCooldown = 0;
    player.startDodge();
    window.__game?.scenes?.play?.update?.(1);
    await new Promise((resolve) => setTimeout(resolve, 80));
    return {
      isDodging: Boolean(player.isDodging),
      invulnerable: Boolean(player.invulnerable),
      alpha: player.sprite?.alpha ?? null
    };
  });
  const screenshot = path.join(outputDir, 'dodge-alpha.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.close();
  return { alpha, pageErrors, consoleErrors, screenshot };
}

async function testBossComboContinuity(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlayReady(page);
  const result = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const enemyManager = play?.enemyManager;
    if (!play || !enemyManager) throw new Error('Missing play scene for boss combo continuity check');
    play.comboCount = 12;
    play.comboMultiplier = 2;
    play.comboTimerMs = 900;
    enemyManager.state = 'BOSS_GATE';
    play.updateComboTimers(30);
    const gateTimerMs = play.comboTimerMs;
    enemyManager.state = 'BOSS_ACTIVE';
    play.comboTimerMs = 120;
    const bossHitRefreshed = play.refreshComboFromBossPressure({ kind: 'boss', active: true });
    const bossHitTimerMs = play.comboTimerMs;
    const normalHitRefreshed = play.refreshComboFromBossPressure({ kind: 'enemy', active: true });
    return {
      gateTimerMs,
      bossHitRefreshed,
      bossHitTimerMs,
      normalHitRefreshed,
      openingSector1: enemyManager.getOpeningMomentumTuning(1),
      openingSector4: enemyManager.getOpeningMomentumTuning(4)
    };
  });
  await page.close();
  return { result, pageErrors, consoleErrors };
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  mkdirSync(outputDir, { recursive: true });
  const enterStart = await testMenuKey(browser, 'Enter', 'menu-enter-start.png');
  const spaceStart = await testMenuKey(browser, 'Space', 'menu-space-start.png');
  const pickup = await testFirstRunPickup(browser);
  const dodge = await testDodgeAlpha(browser);
  const bossCombo = await testBossComboContinuity(browser);
  const allErrors = [
    ...enterStart.pageErrors,
    ...enterStart.consoleErrors,
    ...spaceStart.pageErrors,
    ...spaceStart.consoleErrors,
    ...pickup.pageErrors,
    ...pickup.consoleErrors,
    ...dodge.pageErrors,
    ...dodge.consoleErrors,
    ...bossCombo.pageErrors,
    ...bossCombo.consoleErrors
  ];
  const report = {
    ok: Boolean(
      enterStart.state.scene === 'play' &&
      spaceStart.state.scene === 'play' &&
      pickup.powerups.some((powerup) => powerup.type === 'rapid_fire' && powerup.y >= 260) &&
      dodge.alpha.isDodging === true &&
      dodge.alpha.alpha !== null &&
      dodge.alpha.alpha < 0.65 &&
      bossCombo.result.gateTimerMs === 900 &&
      bossCombo.result.bossHitRefreshed === true &&
      bossCombo.result.bossHitTimerMs === 1400 &&
      bossCombo.result.normalHitRefreshed === false &&
      bossCombo.result.openingSector1.enabled === true &&
      bossCombo.result.openingSector4.enabled === false &&
      allErrors.length === 0
    ),
    baseUrl,
    enterStart: {
      scene: enterStart.state.scene,
      wave: enterStart.state.wave,
      screenshot: enterStart.screenshot
    },
    spaceStart: {
      scene: spaceStart.state.scene,
      wave: spaceStart.state.wave,
      screenshot: spaceStart.screenshot
    },
    pickup: {
      powerups: pickup.powerups,
      toast: pickup.state.toast,
      screenshot: pickup.screenshot
    },
    dodge: {
      alpha: dodge.alpha,
      screenshot: dodge.screenshot
    },
    bossCombo: bossCombo.result,
    errors: allErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  assert(report.ok, `first-30 polish check failed: ${JSON.stringify(report, null, 2)}`);
  console.log(`[first-30-polish] PASS output=${outputDir}`);
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'failure-report.json'), JSON.stringify({
    ok: false,
    baseUrl,
    error: error.message
  }, null, 2));
  console.error(`[first-30-polish] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
