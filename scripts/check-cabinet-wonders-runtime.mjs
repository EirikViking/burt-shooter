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
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.cabinetWonders?.pending?.kind === 'audio_prelude';
  }, null, { timeout: 5000 });
  const preludeState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const preludeProgressionHeld = await page.evaluate(() => (
    window.__game?.scenes?.play?.shouldHoldProgressionPresentation?.() === true
  ));
  await page.waitForFunction((id) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.cabinetWonders?.active?.id === id;
  }, variantId, { timeout: 5000 });
  await page.waitForTimeout(180);
  const activeState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const activeProgressionHeld = await page.evaluate(() => (
    window.__game?.scenes?.play?.shouldHoldProgressionPresentation?.() === true
  ));
  const screenshot = path.join(outputDir, `${variantId}-${viewport.width}x${viewport.height}${reducedMotion ? '-reduced' : ''}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.waitForTimeout(2200);
  const completedState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const completedProgressionHeld = await page.evaluate(() => (
    window.__game?.scenes?.play?.shouldHoldProgressionPresentation?.() === true
  ));
  await context.close();
  return {
    variantId,
    viewport,
    reducedMotion,
    synchronous,
    progressionHold: {
      prelude: preludeProgressionHeld,
      active: activeProgressionHeld,
      completed: completedProgressionHeld
    },
    prelude: preludeState.cabinetWonders,
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
  const allVariantIds = [
    'ghost_fleet_salute',
    'astral_leviathan_library',
    'celestial_crane_migration'
  ];
  const requestedVariantIds = new Set(
    String(process.env.CHECK_VARIANT_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const variantIds = requestedVariantIds.size
    ? allVariantIds.filter((variantId) => requestedVariantIds.has(variantId))
    : allVariantIds;
  if (variantIds.length === 0) throw new Error(`No Cabinet Wonder variants matched CHECK_VARIANT_IDS=${[...requestedVariantIds].join(',')}`);
  for (const [index, variantId] of variantIds.entries()) {
    report.scenarios.push(await runVariant(
      browser,
      variantId,
      index % 3 === 1 ? { width: 1920, height: 1080 } : { width: 1280, height: 720 },
      variantId === 'astral_leviathan_library'
    ));
  }

  for (const scenario of report.scenarios) {
    const active = scenario.active;
    const prelude = scenario.prelude;
    const completed = scenario.completed;
    if (
      !scenario.synchronous.shown
      || scenario.synchronous.second
      || scenario.synchronous.scoreDelta !== 0
      || scenario.synchronous.runMode !== 'unranked'
      || scenario.synchronous.runModeReason !== 'debug_cabinet_wonder'
      || scenario.synchronous.isDebugRun !== true
    ) {
      report.failures.push(`${scenario.variantId} force/one-per-sector/score-neutral mismatch: ${JSON.stringify(scenario.synchronous)}`);
    }
    if (
      prelude?.pending?.kind !== 'audio_prelude'
      || prelude?.pending?.preludeLeadMs !== 1500
      || prelude?.pending?.audioRevelationPlayed !== true
      || prelude?.active !== null
      || prelude?.shownCount !== 0
    ) {
      report.failures.push(`${scenario.variantId} sacred prelude mismatch: ${JSON.stringify(prelude)}`);
    }
    if (
      active?.availableVariants !== 60
      || active?.shownCount !== 1
      || active?.onePerRun !== false
      || active?.onePerSector !== true
      || active?.cadenceSectors !== 3
      || active?.scoreNeutral !== true
      || active?.gameplayNeutral !== true
      || active?.active?.id !== scenario.variantId
      || active?.active?.upperFieldSafe !== true
      || active?.active?.elementCount < 5
      || active?.active?.audioProfile !== 'wonder'
      || active?.active?.audioRevelationPlayed !== true
      || active?.active?.preludeLeadMs !== 1500
      || active?.active?.visualStartedAt - active?.active?.preludeStartedAt < 1400
      || active?.active?.visualStartedAt - active?.active?.preludeStartedAt > 3000
      || !Array.isArray(active?.active?.audioLayers)
      || !active.active.audioLayers.includes('elevenlabs_wonder_choir_prelude')
      || active?.active?.layer !== 'gameplay_background'
      || active?.active?.generatedArtReady !== true
      || active?.active?.visualLanguage !== 'cabinet_wonder_imagegen_v2'
      || active?.active?.proceduralAccentAlpha > 0.2
      || active?.overlayCount !== 1
      || active?.active?.reducedMotion !== scenario.reducedMotion
    ) {
      report.failures.push(`${scenario.variantId} active presentation mismatch: ${JSON.stringify(active)}`);
    }
    if (
      scenario.progressionHold?.prelude !== true
      || scenario.progressionHold?.active !== true
      || scenario.progressionHold?.completed !== false
    ) {
      report.failures.push(`${scenario.variantId} progression hold mismatch: ${JSON.stringify(scenario.progressionHold)}`);
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
