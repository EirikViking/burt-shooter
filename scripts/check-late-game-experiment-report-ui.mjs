import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4874));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/late-game-experiment-report-ui-${timestamp()}`);
const locales = String(process.env.CHECK_LOCALES || 'en,de,es,ru,zh-CN,pt-BR,ko,ja')
  .split(',')
  .map((locale) => locale.trim())
  .filter(Boolean);
const rasterProofRegions = {
  experimentVersion: { left: 285, top: 170, width: 225, height: 65 },
  hazardPeak: { left: 825, top: 535, width: 220, height: 55 },
  significantStalls: { left: 1080, top: 535, width: 220, height: 55 }
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 30; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
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
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Vite did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function collectRasterProof(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
  const proof = {};
  for (const [name, region] of Object.entries(rasterProofRegions)) {
    const { data } = await sharp(imageBuffer)
      .extract(region)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let brightPixels = 0;
    for (let index = 0; index < data.length; index += 3) {
      if (data[index] + data[index + 1] + data[index + 2] > 500) brightPixels += 1;
    }
    assert.ok(brightPixels >= 40, `${name} must be visibly rasterized`);
    proof[name] = { brightPixels };
  }
  return proof;
}

async function runLocale(browser, locale) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript((language) => {
    localStorage.setItem('novaSwarm.languagePreference.v1', language);
  }, locale);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate(async () => {
    await document.fonts?.ready;
    if (document.fonts?.load) {
      await Promise.all([
        document.fonts.load('900 56px Orbitron'),
        document.fonts.load('700 18px Rajdhani')
      ]);
    }
  });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 90000 });

  const launch = await page.evaluate(async () => {
    const game = window.__game;
    const adapter = game.getLeaderboardAdapter();
    window.__experimentLeaderboardRefreshes = 0;
    adapter.refreshAvailability = async () => {
      window.__experimentLeaderboardRefreshes += 1;
      throw new Error('experiment_result_must_not_refresh_leaderboard');
    };
    window.__novaApp = {
      copyText: async ({ text }) => {
        window.__copiedExperimentSummary = text;
        return { ok: true, copied: true };
      }
    };
    return game.startGame('nova-player-ship-01.png', {
      countShipUsage: false,
      lateGameExperiment: {
        acknowledged: true,
        scenario: 'standard',
        ruleset: 'tactical',
        fixtureId: 'tactical_saturation_bounded',
        startSector: 75,
        lifeStock: 'three_lives',
        phasePulseAvailable: true
      }
    });
  });
  assert.equal(launch, true, `${locale} experiment must launch`);
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.lateGameExperiment?.active === true, null, { timeout: 30000 });

  await page.evaluate(() => {
    const game = window.__game;
    Object.assign(game.lateGameExperiment.metrics, {
      sectorsCompleted: 6,
      deaths: 1,
      damageTaken: 340,
      pierceHits: 37,
      effectivePenetrationHits: 19,
      chainLightningOrigins: 12,
      pulseActivations: 4,
      pulseClears: 9,
      tractorPulls: 3,
      tractorBreaks: 2,
      tractorBreakTimeMs: 520,
      tractorRecoveryMs: 14400,
      projectilePeak: 196,
      hazardPeak: 0.42,
      significantStalls: 0,
      waveSegments: [{ sector: 75 }, { sector: 76 }, { sector: 77 }]
    });
    game.level = 81;
    game.completeRun('late_game_experiment_retired', {
      levelReached: 81,
      sectorReached: 81,
      lifeLosses: 1,
      experimentRetired: true
    });
  });

  await page.waitForFunction(() => {
    const game = window.__game;
    const scene = game?.scenes?.gameOver;
    return game?.currentSceneName === 'gameOver'
      && scene?.runReportOpen === true
      && scene?.runReportOverlayDebug?.visible === true;
  }, null, { timeout: 30000 });

  const proof = await page.evaluate(async () => {
    const game = window.__game;
    const scene = game.scenes.gameOver;
    const beforeCopy = scene.getRunReportOverlayDebugState();
    const copyResult = await scene.copyLateGameExperimentSummary();
    const afterCopy = scene.getRunReportOverlayDebugState();
    return {
      locale: window.__novaI18n?.getCurrentLanguage?.() || null,
      report: game.lastRunReport,
      runPolicy: { ...game.runPolicy },
      leaderboardRefreshes: window.__experimentLeaderboardRefreshes,
      beforeCopy,
      afterCopy,
      copyResult,
      copiedText: window.__copiedExperimentSummary || '',
      state: scene.state,
      title: scene.title?.text || null,
      score: scene.scoreText?.text || null,
      pageText: JSON.parse(window.render_game_to_text())
    };
  });

  assert.equal(proof.locale, locale);
  assert.equal(proof.report.kind, 'late_game_pressure_experiment');
  assert.equal(proof.report.localOnly, true);
  assert.equal(proof.runPolicy.allowPersistentRewards, false);
  assert.equal(proof.runPolicy.allowAchievements, false);
  assert.equal(proof.runPolicy.allowCodexProgress, false);
  assert.equal(proof.runPolicy.allowLeaderboardSubmission, false);
  assert.equal(proof.runPolicy.allowCloudProgressSync, false);
  assert.equal(proof.leaderboardRefreshes, 0);
  assert.equal(proof.beforeCopy.visible, true);
  assert.deepEqual(proof.beforeCopy.sectionIds, [
    'experimentSetup',
    'experimentFixture',
    'experimentOutcome',
    'experimentSafety'
  ]);
  assert.ok(proof.beforeCopy.experimentFeedbackBounds?.height > 0);
  assert.ok(proof.beforeCopy.lateGameExperiment?.copyButtonBounds?.width > 0);
  assert.equal(proof.copyResult?.ok, true);
  assert.equal(proof.afterCopy.lateGameExperiment?.lastAction?.ok, true);
  assert.match(proof.copiedText, /late-game-pressure-2026-08-10-a/);
  assert.match(proof.copiedText, /37 \/ 12/);
  assert.equal(proof.pageText?.gameOver?.runReportOverlay?.open, true);
  assert.deepEqual(pageErrors, []);

  const screenshotName = `report-${locale.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  await page.waitForTimeout(320);
  const extractedScreenshot = await page.evaluate(async () => {
    const app = window.__app;
    const pending = [app?.stage].filter(Boolean);
    while (pending.length > 0) {
      const displayObject = pending.pop();
      if (typeof displayObject?.updateText === 'function') displayObject.updateText(true);
      if (Array.isArray(displayObject?.children)) pending.push(...displayObject.children);
    }
    await app?.renderer?.prepare?.upload?.(app.stage);
    for (let frame = 0; frame < 3; frame += 1) {
      app?.renderer?.render?.(app.stage);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    app?.ticker?.stop?.();
    app?.renderer?.render?.(app.stage);
    await app?.renderer?.encoder?.commandFinished;
    return app?.renderer?.extract?.base64?.({
      target: app.stage,
      frame: app.screen,
      format: 'png'
    });
  });
  assert.match(extractedScreenshot || '', /^data:image\/png;base64,/);
  const screenshotBuffer = Buffer.from(
    extractedScreenshot.slice(extractedScreenshot.indexOf(',') + 1),
    'base64'
  );
  const rasterProof = await collectRasterProof(screenshotBuffer);
  writeFileSync(path.join(outputDir, screenshotName), screenshotBuffer);
  await page.close();
  return { ...proof, pageErrors, consoleErrors, screenshotName, rasterProof };
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const executablePath = findChrome();
assert.ok(executablePath, 'Installed Chrome or Edge is required');
let browser = null;

try {
  const results = [];
  for (const locale of locales) {
    console.log(`[late-game-experiment-report-ui] ${locale}`);
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader']
    });
    try {
      results.push(await runLocale(browser, locale));
    } finally {
      await browser.close().catch(() => {});
      browser = null;
    }
  }
  const report = {
    status: 'passed',
    generatedAt: new Date().toISOString(),
    executablePath,
    locales,
    results
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[late-game-experiment-report-ui] PASS ${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser?.close().catch(() => {});
  if (server) server.kill();
}
