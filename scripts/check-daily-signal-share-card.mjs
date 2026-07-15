import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  DAILY_SIGNAL_CARD_HEIGHT,
  DAILY_SIGNAL_CARD_WIDTH,
  createDailySignalCardCopy,
  createDailySignalCardModel,
  formatDailySignalCardFlightLog,
  getDailySignalCardFilename
} from '../src/ui/DailySignalCard.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4890));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/daily-signal-share-card-${timestamp()}`);

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
  throw new Error(`No available Daily Signal share-card port found from ${startPort}.`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
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
  const command = existsSync(viteEntry) ? process.execPath : process.platform === 'win32' ? 'npx.cmd' : 'npx';
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
  throw new Error(`Daily Signal share-card server did not start at ${baseUrl}.`);
}

function interpolate(source, vars = {}) {
  let value = String(source || '');
  Object.entries(vars).forEach(([key, replacement]) => { value = value.replaceAll(`{${key}}`, String(replacement)); });
  return value;
}

function createFixtureReport(overrides = {}) {
  return {
    version: 12,
    localOnly: true,
    createdAt: '2026-07-15T12:34:56.000Z',
    summary: {
      runMode: 'daily_signal',
      shipId: 'nova-player-ship-03.png',
      shipName: 'Koiro Vey',
      score: 987654,
      sectorReached: 10,
      runtimeSeconds: 321,
      runtimeLabel: '5:21',
      runCleared: true,
      dailySignal: {
        dailyKey: '2026-07-15',
        rulesVersion: 1,
        rulesHash: 'DCS1-ABCDEF1234567890PRIVATE',
        templateId: 'reinforcement_siege',
        templateLabel: 'REINFORCEMENT SIEGE',
        loanerShipKey: 'nova-player-ship-03.png',
        loanerShipName: 'Koiro Vey',
        finishSector: 10,
        attemptId: 'must-never-leave-the-run-report',
        valid: true,
        newAttemptBest: false,
        newClearBest: true,
        recordStored: true,
        recordSaveFailed: false,
        attemptCount: 3,
        flightLog: {
          days: 7,
          clears: 3,
          attemptedDays: 5,
          attempts: 8,
          statuses: ['cleared', 'attempted', 'cleared', 'unopened', 'attempted', 'unopened', 'cleared']
        }
      },
      ...overrides
    },
    sections: []
  };
}

function checkPureContract() {
  const fixture = createFixtureReport();
  const model = createDailySignalCardModel(fixture);
  assert.ok(model, 'Daily report should create a share-card model.');
  assert.equal(model.version, 1);
  assert.equal(model.score, 987654);
  assert.equal(model.runtimeSeconds, 321);
  assert.equal(model.rulesFingerprint, 'DCS1-ABCDEF12', 'Only a compact rules fingerprint may leave the report.');
  assert.equal(formatDailySignalCardFlightLog(model.flightLog.statuses), '◆  ◇  ◆  ·  ◇  ·  ◆');
  assert.equal(getDailySignalCardFilename(model), 'nova-swarm-daily-signal-2026-07-15-cleared-00987654.png');

  const serialized = JSON.stringify(model);
  for (const forbidden of ['attemptId', 'must-never-leave', 'PRIVATE', 'steamId', 'persona', 'createdAt']) {
    assert.equal(serialized.includes(forbidden), false, `Sanitized card model leaked ${forbidden}.`);
  }
  const copy = createDailySignalCardCopy(model, interpolate);
  assert.match(copy.caption, /Nova Swarm Daily Signal/);
  assert.match(copy.caption, /987,654/);
  assert.match(copy.caption, /Local signal, no public rank/);
  assert.match(copy.disclosure, /NO PUBLIC RANK/);

  const changedTimestamp = createFixtureReport();
  changedTimestamp.createdAt = '2099-01-01T00:00:00.000Z';
  assert.deepEqual(createDailySignalCardModel(changedTimestamp), model, 'Card payload must not depend on report generation time.');
  assert.equal(createDailySignalCardModel({ summary: { runMode: 'ranked' } }), null);
  assert.equal(createDailySignalCardModel(null), null);

  const unsafeFilename = getDailySignalCardFilename({ ...model, dailyKey: '../../bad day' });
  assert.equal(unsafeFilename.includes('..'), false);
  assert.equal(unsafeFilename.includes('/'), false);

  const source = readFileSync(path.resolve('src/ui/DailySignalCard.js'), 'utf8');
  assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|submitScore|uploadScore)\b/i,
    'Share-card renderer must remain local-only.');

  const preload = readFileSync(path.resolve('electron/preload.cjs'), 'utf8');
  const main = readFileSync(path.resolve('electron/main.cjs'), 'utf8');
  assert.match(preload, /saveSignalCard:/);
  assert.match(preload, /copyText:/);
  assert.match(main, /MAX_SIGNAL_CARD_BYTES/);
  assert.match(main, /invalid_png_signature/);
  assert.match(main, /showSaveDialog/);
  assert.match(main, /sanitizeSignalCardFilename/);
  assert.doesNotMatch(preload, /\b(fs|dialog|clipboard|shell|child_process)\b/,
    'Renderer preload must not expose native filesystem or shell objects.');
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForScene(page, scene) {
  await page.waitForFunction((expected) => JSON.parse(window.render_game_to_text?.() || '{}').scene === expected, scene, { timeout: 20000 });
  return readState(page);
}

async function seedEnglishProfile(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), { timeout: 30000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      version: 1,
      unlockTuningVersion: 3,
      pilotXp: 1800,
      pilotRank: 4,
      highestPilotRank: 4,
      totalRuns: 6,
      bestScore: 64000,
      bestSector: 25,
      bestLevel: 25,
      bestRank: 4,
      unlockedShipIds: ['nova_ship_01'],
      updatedAt: '2026-07-15T00:00:00.000Z'
    }));
    localStorage.setItem('nova_swarm_achievements_v1', JSON.stringify({ version: 1, unlocked: [], updatedAt: '2026-07-15T00:00:00.000Z' }));
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), { timeout: 30000 });
  await waitForScene(page, 'menu');
}

async function forceDailyClearResult(page) {
  await page.evaluate(async () => {
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    const menu = window.__game?.scenes?.menu;
    const started = await menu?.startDailySignalRun?.();
    if (started === false) throw new Error('Daily Signal did not start.');
  });
  await waitForScene(page, 'play');
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    game.score = 987654;
    if (game.scoreBreakdown) game.scoreBreakdown.baseScore = 987654;
    game.level = 10;
    game.lives = 2;
    if (play) {
      play.gameTime = 321;
      play.totalKills = 142;
      play.bossKills = 10;
      play.wavesCleared = 30;
    }
    game.markRunClear('daily_signal_finish');
    game.gameOver({ fromInterlude: true });
  });
  await waitForScene(page, 'gameOver');
  await page.evaluate(() => {
    const scene = window.__game?.scenes?.gameOver;
    scene?.enterRunbackStage?.('daily_signal_share_card_check');
    scene?.refreshPrimaryCta?.();
    scene?.layoutScreen?.();
    scene?.openRunReport?.();
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.gameOver?.runReportOverlay?.dailySignalShare?.available === true;
  }, null, { timeout: 10000 });
}

function rectRight(rect) {
  return Number(rect?.x) + Number(rect?.width);
}

function rectBottom(rect) {
  return Number(rect?.y) + Number(rect?.height);
}

function assertContained(panel, child, label) {
  assert.ok(panel && child, `${label} bounds missing.`);
  assert.ok(Number(child.x) >= Number(panel.x) - 1, `${label} escaped left.`);
  assert.ok(Number(child.y) >= Number(panel.y) - 1, `${label} escaped top.`);
  assert.ok(rectRight(child) <= rectRight(panel) + 1, `${label} escaped right.`);
  assert.ok(rectBottom(child) <= rectBottom(panel) + 1, `${label} escaped bottom.`);
}

function readPngDimensions(filename) {
  const bytes = readFileSync(filename);
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length };
}

mkdirSync(outputDir, { recursive: true });
checkPureContract();

const chrome = findChrome();
assert.ok(chrome, 'Installed Chrome is required for Daily Signal share-card visual QA.');
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chrome,
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  screenshots: [],
  png: null,
  controller: null,
  locales: {}
};

try {
  await seedEnglishProfile(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => {
    const menu = window.__game?.scenes?.menu;
    const index = menu?.menuOptions?.findIndex((option) => option?.id === 'dailySignal');
    if (index >= 0) menu.setMenuFocus?.(index);
    menu?.layoutMenu?.();
  });
  await page.waitForTimeout(150);
  const menuState = await readState(page);
  assert.equal(menuState.menu?.launchDeck?.featuredDailySignal?.label, 'DAILY CHALLENGE');
  assert.match(menuState.menu?.launchDeck?.featuredDailySignal?.sublabel || '', /GOAL S10|CLEARED/i);
  assert.match(menuState.menu?.missionBriefing?.title || '', /DAILY CHALLENGE/);
  assert.match(menuState.menu?.missionBriefing?.body || '', /TODAY'S GOAL \/\/ CLEAR SECTOR 10/);
  assert.match(menuState.menu?.missionBriefing?.body || '', /Replay after a clear to beat your best clear score/i);
  assert.match(menuState.menu?.missionBriefing?.body || '', /NO PUBLIC LEADERBOARD YET/);
  await page.screenshot({ path: path.join(outputDir, 'daily-challenge-menu-1920x1080.png'), fullPage: false });
  report.screenshots.push('daily-challenge-menu-1920x1080.png');
  await page.setViewportSize({ width: 1366, height: 768 });
  await forceDailyClearResult(page);

  const initial = await readState(page);
  assert.equal(initial.gameOver?.primaryCta?.label, "RETRY TODAY'S SIGNAL", 'Retry must remain the dominant Daily result action.');
  assert.equal(initial.gameOver?.runReportCta?.label, 'FLIGHT REPORT');
  assert.equal(initial.gameOver?.runReportCta?.hint, 'VIEW + SAVE SHARE CARD');
  assert.equal(initial.gameOver?.runReportOverlay?.dailySignalShare?.model?.score, 987654);
  assert.equal(initial.gameOver?.runReportOverlay?.dailySignalShare?.model?.runCleared, true);
  assert.equal(initial.gameOver?.runReportOverlay?.dailySignalShare?.model?.sectorReached, 10,
    'A cleared Daily card must show the contract finish sector, not the prewarmed next sector.');
  assert.equal(initial.runReport?.sectorReached, 10,
    'A cleared Daily Flight Report must show the contract finish sector, not the prewarmed next sector.');
  assert.match(initial.gameOver?.runReportOverlay?.text || '', /Sector:\s*10/i);
  assert.equal(JSON.stringify(initial.gameOver?.runReportOverlay?.dailySignalShare?.model).includes('attemptId'), false);
  assert.match(initial.gameOver?.runReportOverlay?.dailySignalShare?.status || '', /NO PUBLIC RANK/);

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 960, height: 540 }
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      const scene = window.__game?.scenes?.gameOver;
      scene?.layoutScreen?.();
    });
    await page.waitForTimeout(250);
    const state = await readState(page);
    const overlay = state.gameOver?.runReportOverlay;
    const panel = { x: overlay.x, y: overlay.y, width: overlay.width, height: overlay.height };
    assert.ok(overlay?.visible, `${viewport.width}x${viewport.height} Flight Report should stay open.`);
    assertContained(panel, overlay.dailySignalShare.saveButtonBounds, 'Save Signal Card button');
    assertContained(panel, overlay.dailySignalShare.copyButtonBounds, 'Copy Caption button');
    assertContained(panel, overlay.closeButtonBounds, 'Close button');
    const screenshotName = `daily-flight-report-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: false });
    report.screenshots.push(screenshotName);
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => window.__game?.scenes?.gameOver?.layoutScreen?.());
  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.keyboard.press('KeyS');
  const download = await downloadPromise;
  const cardPath = path.join(outputDir, 'daily-signal-card-cleared.png');
  await download.saveAs(cardPath);
  await page.waitForFunction(() => /DOWNLOAD STARTED/i.test(JSON.parse(window.render_game_to_text?.() || '{}').gameOver?.runReportOverlay?.dailySignalShare?.status || ''), null, { timeout: 10000 });
  report.png = { file: path.basename(cardPath), ...readPngDimensions(cardPath) };
  assert.equal(report.png.width, DAILY_SIGNAL_CARD_WIDTH);
  assert.equal(report.png.height, DAILY_SIGNAL_CARD_HEIGHT);
  assert.ok(report.png.bytes > 100000, 'Rendered share card should contain real art, not an empty canvas.');

  await page.evaluate(() => {
    window.__novaApp = Object.freeze({
      copyText: async ({ text }) => {
        window.__dailyShareCopiedCaption = text;
        return { ok: true, copied: true };
      }
    });
  });
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => Boolean(window.__dailyShareCopiedCaption), null, { timeout: 5000 });
  const copiedCaption = await page.evaluate(() => window.__dailyShareCopiedCaption);
  assert.match(copiedCaption, /987,654/);
  assert.match(copiedCaption, /no public rank/i);

  await page.evaluate(() => {
    window.__dailyShareBridgeCalls = [];
    window.__novaApp = Object.freeze({
      saveSignalCard: async (payload) => {
        window.__dailyShareBridgeCalls.push({ action: 'save', filename: payload.filename, dataUrlLength: payload.dataUrl.length, png: payload.dataUrl.startsWith('data:image/png;base64,') });
        return { ok: true, saved: true, filename: payload.filename };
      },
      copyText: async (payload) => {
        window.__dailyShareBridgeCalls.push({ action: 'copy', text: payload.text });
        return { ok: true, copied: true };
      }
    });
    window.__game?.scenes?.gameOver?.handleGamepadNavigation?.({ pressed: { x: true } });
  });
  await page.waitForFunction(() => window.__dailyShareBridgeCalls?.some((entry) => entry.action === 'save'), null, { timeout: 10000 });
  await page.evaluate(() => window.__game?.scenes?.gameOver?.handleGamepadNavigation?.({ pressed: { y: true } }));
  await page.waitForFunction(() => window.__dailyShareBridgeCalls?.some((entry) => entry.action === 'copy'), null, { timeout: 5000 });
  report.controller = await page.evaluate(() => window.__dailyShareBridgeCalls);
  const gamepadSave = report.controller.find((entry) => entry.action === 'save');
  assert.equal(gamepadSave.png, true);
  assert.ok(gamepadSave.dataUrlLength > 100000);

  for (const locale of ['en', 'de', 'es', 'pt-BR', 'ru', 'zh-CN', 'ko', 'ja']) {
    await page.evaluate(async (language) => {
      await window.__novaI18n?.setLanguagePreference?.(language);
      const scene = window.__game?.scenes?.gameOver;
      scene?.layoutScreen?.();
    }, locale);
    await page.waitForTimeout(100);
    const state = await readState(page);
    const share = state.gameOver?.runReportOverlay?.dailySignalShare;
    assert.ok(share?.saveButtonLabel?.trim(), `${locale} save label missing.`);
    assert.ok(share?.copyButtonLabel?.trim(), `${locale} copy label missing.`);
    assert.ok(share?.status?.trim(), `${locale} local-only status missing.`);
    report.locales[locale] = {
      cta: state.gameOver?.runReportCta?.label,
      hint: state.gameOver?.runReportCta?.hint,
      save: share.saveButtonLabel,
      copy: share.copyButtonLabel,
      status: share.status
    };
  }

  await page.evaluate(async () => {
    await window.__novaI18n?.setLanguagePreference?.('ja');
    window.__game?.scenes?.gameOver?.layoutScreen?.();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(outputDir, 'daily-flight-report-ja-960x540.png'), fullPage: false });
  report.screenshots.push('daily-flight-report-ja-960x540.png');

  assert.deepEqual(pageErrors, [], `Daily share-card page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `Daily share-card console errors: ${consoleErrors.join(' | ')}`);
  report.pageErrors = pageErrors;
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[daily-signal-share-card] PASS model, browser download, Electron bridge mock, keyboard/controller, 8 locales, visuals (${outputDir})`);
} finally {
  await browser.close();
  if (server) server.kill();
}
