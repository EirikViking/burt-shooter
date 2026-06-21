import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4388));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/mayhem-performance-diagnostics-${timestamp()}`);

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
  for (let candidate = startPort; candidate < startPort + 50; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available performance diagnostics check port found starting at ${startPort}`);
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
  throw new Error(`Vite dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function startMayhem(page) {
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.evaluate(async () => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      version: 1,
      pilotRank: 6,
      pilotXp: 42100,
      bestScore: 65432,
      bestRank: 6,
      bestLevel: 9,
      bestSector: 9,
      totalRuns: 8,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_02'],
      updatedAt: new Date().toISOString()
    }));
    await window.__game.startGame(undefined, { runMode: 'ranked' });
  });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.hud, null, { timeout: 30000 });
}

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const reports = {};

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/highscores', async (route) => {
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' });
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await startMayhem(page);
  await page.waitForFunction(() => window.__novaMayhemPerformanceDiagnostics?.getReport?.()?.sampleCount > 20, null, { timeout: 12000 });
  const initialReport = await page.evaluate(() => window.__novaMayhemPerformanceDiagnostics.getReport());
  const sectionLabels = initialReport.topSections.map((section) => section.label);
  for (const required of [
    'frame_start',
    'player',
    'bullets',
    'enemies',
    'hud',
    'starfield',
    'collisions',
    'collision.player_bullets_enemies',
    'collision.enemy_bullets_player',
    'collision.side_effects.total',
    'collision.side_effects.score_popups',
    'collision.side_effects.particles',
    'collision.side_effects.audio',
    'collision.side_effects.powerups'
  ]) {
    assert.ok(sectionLabels.includes(required), `diagnostics should record ${required}`);
  }
  assert.equal(initialReport.enabled, true, 'diagnostics should be auto-enabled in this private diagnostic build');
  assert.equal(initialReport.options.showOverlay, false, 'diagnostic overlay should stay hidden by default while auto logging');
  assert.ok(initialReport.frame.maxMs >= 0, 'diagnostics should report max frame timing');
  assert.ok(initialReport.lastCounts.sector >= 1, 'diagnostics should report sector count');
  assert.ok(initialReport.lastCounts.runMode === 'ranked', 'diagnostics should report Mayhem run mode');
  assert.ok(initialReport.lastCounts.collision, 'diagnostics should attach collision counters to frame counts');
  const overlayCount = await page.locator('[data-nova-mayhem-performance-diagnostics="true"]').count();
  assert.equal(overlayCount, 0, 'diagnostic overlay should not be created until requested');

  const toggledReport = await page.evaluate(async () => {
    window.__novaMayhemPerformanceDiagnostics.setOptions({
      hideHighscoreChase: true,
      hudLite: true,
      noParticles: true,
      noStarfield: true,
      noScorePopups: true
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      report: window.__novaMayhemPerformanceDiagnostics.getReport(),
      highscoreVisible: window.__game?.scenes?.play?.hud?.highscoreChaseGroup?.visible ?? null,
      storage: JSON.parse(localStorage.getItem('novaSwarm.mayhemPerformanceDiagnostics.v1') || '{}')
    };
  });
  assert.equal(toggledReport.report.options.hideHighscoreChase, true, 'hideHighscoreChase toggle should apply');
  assert.equal(toggledReport.report.options.hudLite, true, 'hudLite toggle should apply');
  assert.equal(toggledReport.report.options.noParticles, true, 'noParticles toggle should apply');
  assert.equal(toggledReport.report.options.noHitAudio, false, 'noHitAudio should remain off unless requested');
  assert.equal(toggledReport.report.options.noCollisionSideEffects, false, 'collision side effects should remain on by default');
  assert.equal(toggledReport.report.options.rawCollisionOnly, false, 'raw collision-only mode should remain off by default');
  assert.equal(toggledReport.highscoreVisible, false, 'high-score chase widget should be hidden by diagnostic toggle');
  assert.equal(toggledReport.storage.hudLite, true, 'diagnostic toggles should persist to localStorage');

  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('F8');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  const overlayByHotkey = await page.evaluate(() => window.__novaMayhemPerformanceDiagnostics.getReport().options.showOverlay);
  assert.equal(overlayByHotkey, true, 'Ctrl+Shift+F8 should reveal diagnostics overlay without stopping logging');
  const manualWrite = await page.evaluate(async () => {
    window.__novaPerformanceDiagnostics = {
      writeReport: async (payload) => ({
        ok: true,
        latestPath: 'mock/userData/performance-diagnostics/run-collision-diagnostics-latest.json',
        sessionPath: `mock/userData/performance-diagnostics/run-collision-diagnostics-${payload.sessionId}.json`
      })
    };
    const result = await window.__novaMayhemPerformanceDiagnostics.writeReport('automated_check');
    const stored = JSON.parse(localStorage.getItem('novaSwarm.mayhemPerformanceDiagnostics.latestReport.v1') || '{}');
    return { result, stored };
  });
  assert.equal(manualWrite.result.ok, true, 'manual diagnostic write should use native writer bridge when available');
  assert.match(manualWrite.result.latestPath, /run-collision-diagnostics-latest\.json$/, 'diagnostic latest path should be stable');
  assert.equal(manualWrite.stored.reason, 'automated_check', 'diagnostic report should also be cached in localStorage');
  assert.ok(manualWrite.stored.lastCounts?.collision, 'written diagnostic report should include collision counters');
  assert.ok(Array.isArray(manualWrite.stored.worstSlowFrames), 'written report should include latched slow-frame records');
  reports.enabledRun = { initialReport, toggledReport, overlayByHotkey, manualWrite };
  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('; ')}`);
  await page.close();

  const isolatedPage = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const isolatedErrors = [];
  isolatedPage.on('pageerror', (error) => isolatedErrors.push(error.message));
  await isolatedPage.route('**/api/highscores', async (route) => {
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' });
  });
  await isolatedPage.goto(`${baseUrl}?novaPerfDiag=1&novaDiagNoLeaderboardTargets=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await startMayhem(isolatedPage);
  await wait(500);
  const isolatedReport = await isolatedPage.evaluate(() => ({
    options: window.__novaMayhemPerformanceDiagnostics?.getOptions?.(),
    highscorePromise: Boolean(window.__game?.highscoreChaseTargetPromise),
    globalPromise: Boolean(window.__game?.globalLeaderboardTargetPromise),
    globalTargets: window.__game?.globalLeaderboardTargets
  }));
  assert.equal(isolatedReport.options.noLeaderboardTargets, true, 'noLeaderboardTargets diagnostic option should apply before run launch');
  assert.equal(isolatedReport.highscorePromise, false, 'diagnostic noLeaderboardTargets should skip high-score target priming');
  assert.equal(isolatedReport.globalPromise, false, 'diagnostic noLeaderboardTargets should skip global leaderboard target priming');
  assert.equal(isolatedReport.globalTargets, null, 'diagnostic noLeaderboardTargets should leave global targets unprimed');
  reports.noLeaderboardTargets = isolatedReport;
  assert.equal(isolatedErrors.length, 0, `isolated page errors: ${isolatedErrors.join('; ')}`);
  await isolatedPage.close();

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: true, baseUrl, reports }, null, 2)}\n`);
  console.log(`[mayhem-performance-diagnostics] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: false, baseUrl, error: error.message, reports }, null, 2)}\n`);
  console.error(`[mayhem-performance-diagnostics] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
