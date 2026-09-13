import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findPort(4990);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/boss-clear-to-draft-audit-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const locales = ['en', 'de', 'zh-CN', 'ru', 'es', 'pt-BR', 'ko', 'ja'];

async function findPort(start) {
  for (let candidate = start; candidate < start + 30; candidate += 1) {
    const open = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (open) return candidate;
  }
  throw new Error('No boss-clear audit port available');
}

async function fetchable(url) {
  try { return (await fetch(url, { cache: 'no-store' })).ok; } catch { return false; }
}

async function startServer() {
  const vite = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(vite) ? process.execPath : 'npx.cmd';
  const args = existsSync(vite) ? [vite] : ['vite'];
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const started = Date.now();
  while (Date.now() - started < 30000) {
    if (await fetchable(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  server.kill();
  throw new Error('Boss-clear audit server did not start');
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function seed(page, scenario) {
  await page.goto(`${baseUrl}/?autostart=1&skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(({ locale, reducedMotion }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', locale);
    localStorage.setItem('nova_accessibility_reduced_motion', reducedMotion ? '1' : '0');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: 0 }));
  }, scenario);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  return page.evaluate((queuedNotice) => {
    const game = window.__game;
    const play = game.scenes.play;
    play.introActive = false;
    play.introComplete = true;
    play.setShipIntroAgencyState?.('complete', 'boss_clear_to_draft_audit');
    play.clearPendingEnemyStart?.();
    play.enemyManager?.clearEnemies?.();
    play.enemyManager.state = 'LEVEL_COMPLETE';
    play.enemyManager.phase = 'BOSS';
    play.enemyManager.spawning = false;
    play.enemyManager.bossDefeatedThisLevel = true;
    play.enemyManager.isLevelComplete = () => true;
    play.levelAdvancePending = false;
    play.levelAdvanceWarmupPromise = null;
    game.runMode = 'ranked_tactical';
    game.level = 10;
    game.lives = Math.max(3, Number(game.lives) || 0);
    if (queuedNotice) {
      play.enqueueToast('NO-HIT SECTOR +1500', {
        type: 'bonus', slot: 'top', priority: 4, duration: 1400
      });
    }
    return { startedAt: performance.now(), scoreBefore: game.score };
  }, scenario.queuedNotice === true);
}

async function state(page, startedAt) {
  return page.evaluate((start) => {
    const game = window.__game;
    const play = game.scenes.play;
    const draft = play.tacticalDraft;
    const card = draft?.cards?.[draft?.focusIndex ?? 0];
    const cardBounds = card?.getBounds?.();
    const toast = play.activeTopToast;
    const toastBounds = toast?.getBounds?.();
    return {
      ms: Math.round(performance.now() - start),
      levelAdvancePending: Boolean(play.levelAdvancePending),
      warmupPending: Boolean(play.levelAdvanceWarmupPromise),
      rankUpPresentationVisible: Boolean(play.activeRankUpPresentation?.parent),
      progressionPresentationHeld: Boolean(play.shouldHoldProgressionPresentation?.()),
      draftVisible: Boolean(draft?.active),
      cardsReady: Boolean(draft?.cards?.length === 3 && draft.offers?.length === 3),
      focusValid: Number.isInteger(draft?.focusIndex) && draft.focusIndex >= 0 && draft.focusIndex < (draft.cards?.length || 0),
      pointerReady: Boolean(draft?.active && card?.eventMode === 'static' && cardBounds?.width > 0 && cardBounds?.height > 0),
      inputArmed: Boolean(draft?.inputArmed),
      firstCardBounds: cardBounds ? {
        x: Math.round(cardBounds.x), y: Math.round(cardBounds.y),
        right: Math.round(cardBounds.x + cardBounds.width), bottom: Math.round(cardBounds.y + cardBounds.height)
      } : null,
      activeToastType: toast?.__toastMeta?.type || null,
      activeToastBounds: toastBounds ? {
        x: Math.round(toastBounds.x), y: Math.round(toastBounds.y),
        right: Math.round(toastBounds.x + toastBounds.width), bottom: Math.round(toastBounds.y + toastBounds.height)
      } : null,
      viewport: { width: game.getWidth(), height: game.getHeight() }
    };
  }, startedAt);
}

async function runScenario(browser, scenario) {
  const dir = path.join(outputDir, scenario.id);
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
    ...(scenario.recordVideo ? { recordVideo: { dir, size: { width: scenario.width, height: scenario.height } } } : {})
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const seeded = await seed(page, scenario);
  const timeline = [];
  let capturedMidpoint = false;
  let capturedVisible = false;
  let capturedReady = false;
  const until = Date.now() + 5500;
  while (Date.now() < until) {
    const sample = await state(page, seeded.startedAt);
    timeline.push(sample);
    if (!capturedMidpoint && sample.levelAdvancePending && sample.ms >= 750 && !sample.draftVisible) {
      capturedMidpoint = true;
    }
    if (!capturedVisible && sample.draftVisible) {
      capturedVisible = true;
    }
    if (!capturedReady && sample.inputArmed) {
      capturedReady = true;
    }
    await page.waitForTimeout(16);
  }
  const authoritative = timeline.find((entry) => entry.levelAdvancePending) || null;
  const visible = timeline.find((entry) => entry.draftVisible) || null;
  const pointerReady = timeline.find((entry) => entry.pointerReady) || null;
  const decisionReady = timeline.find((entry) => entry.inputArmed) || null;
  const invalidBounds = timeline.some((entry) => {
    const bounds = entry.firstCardBounds;
    if (!entry.draftVisible || !bounds) return false;
    return bounds.x < -4 || bounds.y < -4 || bounds.right > entry.viewport.width + 4 || bounds.bottom > entry.viewport.height + 4;
  });
  let unownedPostSequenceMs = 0;
  if (authoritative && visible) {
    const postSequenceStart = authoritative.ms + 1500;
    for (let index = 1; index < timeline.length; index += 1) {
      const previous = timeline[index - 1];
      const current = timeline[index];
      if (
        previous.ms >= postSequenceStart
        && previous.ms < visible.ms
        && !previous.rankUpPresentationVisible
        && !previous.progressionPresentationHeld
      ) {
        unownedPostSequenceMs += Math.max(0, current.ms - previous.ms);
      }
    }
  }
  await page.close();
  if (video) await video.saveAs(path.join(dir, `${scenario.id}.webm`));
  await context.close();
  return {
    scenario, authoritative, visible, pointerReady, decisionReady,
    clearToVisibleMs: visible && authoritative ? visible.ms - authoritative.ms : null,
    clearToDecisionReadyMs: decisionReady && authoritative ? decisionReady.ms - authoritative.ms : null,
    visibleToDecisionReadyMs: decisionReady && visible ? decisionReady.ms - visible.ms : null,
    unownedPostSequenceMs,
    invalidBounds, errors, timeline
  };
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: chromePath() });
const scenarios = [
  { id: 'en-1920-clean', locale: 'en', width: 1920, height: 1080, reducedMotion: false },
  { id: 'en-1280-queued-notice', locale: 'en', width: 1280, height: 720, reducedMotion: false, queuedNotice: true, recordVideo: true },
  { id: 'en-960-edge-controller', locale: 'en', width: 960, height: 640, reducedMotion: false, recordVideo: true },
  { id: 'en-960-reduced', locale: 'en', width: 960, height: 640, reducedMotion: true },
  ...locales.filter((locale) => locale !== 'en').map((locale) => ({
    id: `${locale.replaceAll(/[^a-z0-9]+/gi, '-')}-960`, locale, width: 960, height: 640, reducedMotion: false
  }))
];

try {
  const reports = [];
  for (const scenario of scenarios) reports.push(await runScenario(browser, scenario));
  const runtimeErrors = reports.flatMap((entry) => entry.errors.map((error) => `${entry.scenario.id}: ${error}`));
  assert.deepEqual(runtimeErrors, [], `Boss-clear audit runtime errors: ${runtimeErrors.join('; ')}`);
  assert.equal(reports.some((entry) => entry.invalidBounds), false, 'First Draft card escaped viewport');
  assert.equal(reports.some((entry) => !entry.decisionReady), false, 'First Draft never became decision-ready');
  const maxClearToReadyMs = Math.max(...reports.map((entry) => entry.clearToDecisionReadyMs));
  const maxVisibleToReadyMs = Math.max(...reports.map((entry) => entry.visibleToDecisionReadyMs));
  const maxUnownedPostSequenceMs = Math.max(...reports.map((entry) => entry.unownedPostSequenceMs));
  const report = {
    status: 'passed', outputDir,
    sourceTimeline: { sequenceDurationMs: 1500, draftMinimumReadGateMs: 280, assetPrewarmOverlapsSequence: true },
    maxClearToReadyMs, maxVisibleToReadyMs, maxUnownedPostSequenceMs,
    proceedGateTriggered: maxUnownedPostSequenceMs >= 1000 || maxVisibleToReadyMs >= 750,
    reports
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[boss-clear-to-draft-audit] PASS scenarios=${reports.length} proceed=${report.proceedGateTriggered} maxClearToReadyMs=${maxClearToReadyMs} maxVisibleToReadyMs=${maxVisibleToReadyMs} maxUnownedPostSequenceMs=${maxUnownedPostSequenceMs}`);
  console.log(`[boss-clear-to-draft-audit] report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  server.kill();
}
