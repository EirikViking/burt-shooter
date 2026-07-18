import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4548));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/cabinet-wonders-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available Cabinet Wonder port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Vite preview did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function runVariant(browser, variantId, viewport, reducedMotion = false) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference'
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.introComplete === true, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.firstRunOnboardingComplete === true, null, { timeout: 90000 });
  const synchronous = await page.evaluate((id) => {
    const game = window.__game;
    const play = game.scenes.play;
    const scoreBefore = game.score;
    const shown = play.maybeShowCabinetWonder({
      debugForce: true,
      forceVariantId: id,
      sector: 4,
      waveNumber: 3,
      hasUpcomingWave: true
    });
    const scoreAfter = game.score;
    const second = play.maybeShowCabinetWonder({
      debugForce: true,
      forceVariantId: 'aurora_crown',
      sector: 4,
      waveNumber: 3,
      hasUpcomingWave: true
    });
    return {
      shown,
      second,
      scoreDelta: scoreAfter - scoreBefore,
      runMode: game.runMode,
      runModeReason: game.runModeReason,
      isDebugRun: game.isDebugRun
    };
  }, variantId);
  await page.waitForTimeout(420);
  const activeState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const screenshot = path.join(outputDir, `${variantId}-${viewport.width}x${viewport.height}${reducedMotion ? '-reduced' : ''}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.waitForTimeout(1900);
  const completedState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  await context.close();
  return {
    variantId,
    viewport,
    reducedMotion,
    synchronous,
    active: activeState.cabinetWonders,
    completed: completedState.cabinetWonders,
    screenshot,
    pageErrors,
    consoleErrors
  };
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const report = { ok: false, baseUrl, outputDir, scenarios: [], failures: [] };
try {
  report.scenarios.push(await runVariant(browser, 'ghost_fleet_salute', { width: 1280, height: 720 }));
  report.scenarios.push(await runVariant(browser, 'starwhale_constellation', { width: 1920, height: 1080 }));
  report.scenarios.push(await runVariant(browser, 'aurora_crown', { width: 1280, height: 720 }, true));

  for (const scenario of report.scenarios) {
    const active = scenario.active;
    const completed = scenario.completed;
    if (
      !scenario.synchronous.shown
      || scenario.synchronous.second
      || scenario.synchronous.scoreDelta !== 0
      || scenario.synchronous.runMode !== 'unranked'
      || scenario.synchronous.runModeReason !== 'debug_cabinet_wonder'
      || scenario.synchronous.isDebugRun !== true
    ) {
      report.failures.push(`${scenario.variantId} force/one-per-run/score-neutral mismatch: ${JSON.stringify(scenario.synchronous)}`);
    }
    if (
      active?.availableVariants !== 3
      || active?.shownCount !== 1
      || active?.onePerRun !== true
      || active?.scoreNeutral !== true
      || active?.gameplayNeutral !== true
      || active?.active?.id !== scenario.variantId
      || active?.active?.upperFieldSafe !== true
      || active?.active?.elementCount < 5
      || active?.active?.audioProfile !== 'wonder'
      || active?.active?.layer !== 'gameplay_background'
      || active?.overlayCount !== 1
      || active?.active?.reducedMotion !== scenario.reducedMotion
    ) {
      report.failures.push(`${scenario.variantId} active presentation mismatch: ${JSON.stringify(active)}`);
    }
    if (completed?.active !== null || completed?.overlayCount !== 0 || completed?.shownCount !== 1 || completed?.last?.completed !== true) {
      report.failures.push(`${scenario.variantId} cleanup mismatch: ${JSON.stringify(completed)}`);
    }
    if (scenario.pageErrors.length || scenario.consoleErrors.length) {
      report.failures.push(`${scenario.variantId} browser errors: ${[...scenario.pageErrors, ...scenario.consoleErrors].join('; ')}`);
    }
  }

  report.ok = report.failures.length === 0;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) throw new Error(`[cabinet-wonders-runtime] ${report.failures.join('; ')}`);
  console.log(`[cabinet-wonders-runtime] PASS output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
