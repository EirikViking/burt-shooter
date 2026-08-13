import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4738));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/daily-menu-visuals-${timestamp()}`
);
const cases = Object.freeze([
  Object.freeze({
    name: 'below-minimum-diagnostic-760x640-0-of-7',
    width: 760,
    height: 640,
    clears: 0,
    uiScale: 1,
    support: 'diagnostic_below_declared_960px_minimum'
  }),
  Object.freeze({ name: 'compact-supported-960x640-0-of-7', width: 960, height: 640, clears: 0, uiScale: 1 }),
  Object.freeze({ name: 'hd-1280x720-1-of-7', width: 1280, height: 720, clears: 1, uiScale: 1 }),
  Object.freeze({ name: 'fullhd-1920x1080-6-of-7', width: 1920, height: 1080, clears: 6, uiScale: 1 }),
  Object.freeze({ name: 'fullhd-1920x1080-7-of-7', width: 1920, height: 1080, clears: 7, uiScale: 1 }),
  Object.freeze({ name: '4k-3840x2160-200pct-7-of-7', width: 3840, height: 2160, clears: 7, uiScale: 2 })
]);
const forbiddenPrimaryPattern = /[\u25c6\u25c7\ufffd]|WEEK:\s*(?:[.\u00b7\u2022\u25c6\u25c7]\s*){3,}/u;

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
  throw new Error(`No available Daily visual check port found starting at ${startPort}`);
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
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

function withQuery() {
  const url = new URL(baseUrl);
  url.searchParams.set('skipIntro', '1');
  url.searchParams.set('offlineLeaderboard', '1');
  return url.toString();
}

function assertInside(inner, outer, label) {
  assert.ok(inner?.width > 0 && inner?.height > 0, `${label}: missing bounds`);
  assert.ok(inner.x >= outer.x - 3, `${label}: left clipped`);
  assert.ok(inner.y >= outer.y - 3, `${label}: top clipped`);
  assert.ok(inner.right <= outer.right + 3, `${label}: right clipped`);
  assert.ok(inner.bottom <= outer.bottom + 4, `${label}: bottom clipped`);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  cases: [],
  pageErrors: [],
  consoleErrors: []
};

try {
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: { width: testCase.width, height: testCase.height } });
    page.on('pageerror', (error) => report.pageErrors.push(`${testCase.name}: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') report.consoleErrors.push(`${testCase.name}: ${message.text()}`);
    });
    await page.addInitScript(({ uiScale }) => {
      localStorage.clear();
      localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
      localStorage.setItem('nova_ui_scale_v1', String(uiScale));
      localStorage.setItem('nova_display_mode_v1', 'windowed');
    }, { uiScale: testCase.uiScale });
    await page.goto(withQuery(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.body?.dataset?.menuReady === '1', null, { timeout: 30000 });
    await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
    await page.waitForFunction(() => {
      const scene = window.__game?.currentScene;
      return (scene?.dailySignalBtn?.alpha || 0) > 0.95 &&
        (scene?.runModePanel?.alpha || 0) > 0.95;
    }, null, { timeout: 10000 });
    await page.evaluate(({ clears }) => {
      const scene = window.__game?.currentScene;
      if (!scene?.dailySignalBtn) throw new Error('Daily mode card unavailable');
      const current = scene.dailySignalFlightLog || {};
      scene.dailySignalFlightLog = {
        ...current,
        clears,
        attempts: Math.max(Number(current.attempts) || 0, clears),
        attemptedDays: Math.max(Number(current.attemptedDays) || 0, clears)
      };
      scene.dailySignalRefreshAt = Number.MAX_SAFE_INTEGER;
      scene.setMenuFocusByButton(scene.dailySignalBtn);
      scene.layoutMenu({ forceLabelGpuRefresh: true });
    }, { clears: testCase.clears });
    await page.waitForTimeout(350);
    const state = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
    const briefing = state.menu?.missionBriefing;
    const linePattern = new RegExp(`WEEKLY CLEARS:\\s*${testCase.clears}\\s*\\/\\s*7`);
    assert.equal(state.scene, 'menu', `${testCase.name}: menu scene`);
    assert.equal(briefing?.mode, 'dailySignal', `${testCase.name}: Daily briefing focused`);
    const briefingState = await page.evaluate(() => window.__game?.currentScene?.getRunModeBriefing?.() || null);
    assert.match(briefingState?.menuBody || '', linePattern, `${testCase.name}: explicit weekly clear value`);
    assert.doesNotMatch(briefing?.body || '', forbiddenPrimaryPattern, `${testCase.name}: no symbolic Daily row`);
    assert.doesNotMatch(briefing?.body || '', /undefined|null/i, `${testCase.name}: no stale interpolation`);
    assert.equal(state.display?.uiScale, testCase.uiScale, `${testCase.name}: UI scale`);
    assertInside(
      briefing?.bodyBounds,
      briefing?.panelBounds,
      `${testCase.name}: Daily briefing body`
    );
    const dailyBounds = state.menu?.launchDeck?.cards?.daily?.bounds;
    assertInside(
      dailyBounds,
      { x: 0, y: 0, right: testCase.width, bottom: testCase.height },
      `${testCase.name}: Daily mode card`
    );
    const screenshot = path.join(outputDir, `${testCase.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    report.cases.push({
      ...testCase,
      screenshot,
      displayedBody: briefing.body,
      weeklyClearLine: String(briefingState?.menuBody || '').split('\n').find((line) => linePattern.test(line)) || null,
      briefingBounds: briefing.panelBounds,
      bodyBounds: briefing.bodyBounds,
      dailyCardBounds: dailyBounds
    });
    await page.close();
  }
  assert.deepEqual(report.pageErrors, [], `Page errors: ${report.pageErrors.join('; ')}`);
  assert.deepEqual(report.consoleErrors, [], `Console errors: ${report.consoleErrors.join('; ')}`);
  report.ok = true;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[daily-menu-visuals] PASS cases=${report.cases.length} report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  report.ok = false;
  report.error = error?.stack || String(error);
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.error(`[daily-menu-visuals] FAIL report=${path.join(outputDir, 'report.json')}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
