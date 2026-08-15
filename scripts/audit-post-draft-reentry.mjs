import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(4970);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/post-draft-reentry-audit-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const locales = ['en', 'de', 'zh-CN', 'ru', 'es', 'pt-BR', 'ko', 'ja'];

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
  throw new Error('No post-Draft audit port available');
}

async function canFetch(url) {
  try { return (await fetch(url, { cache: 'no-store' })).ok; } catch { return false; }
}

async function startServer() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : 'npx.cmd';
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  server.kill();
  throw new Error('Post-Draft audit server did not start');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readTimelineState(page, startedAt) {
  return page.evaluate((auditStartedAt) => {
    const game = window.__game;
    const play = game.scenes.play;
    const toast = play.activeTopToast;
    const toastMeta = toast?.__toastMeta || null;
    const toastBounds = toast?.getBounds?.();
    const queuedDraftToast = (play.topToastQueue || []).some((entry) => entry?.options?.type === 'tactical_draft');
    const enemies = (play.enemyManager?.enemies || []).filter((enemy) => enemy?.active !== false);
    const bullets = (play.bulletManager?.enemyBullets || []).filter((bullet) => bullet?.active !== false);
    const draftToastVisible = toastMeta?.type === 'tactical_draft' && toast?.visible !== false;
    const hostileState = ['WAVE_ACTIVE', 'BOSS_ACTIVE'].includes(play.enemyManager?.state);
    const hostileActionable = hostileState && (enemies.length > 0 || bullets.length > 0);
    return {
      ms: Math.round(performance.now() - auditStartedAt),
      draftActive: Boolean(play.tacticalDraft?.active),
      draftConfirmed: Boolean(play.tacticalDraft?.confirmedId),
      introActive: Boolean(play.introActive),
      shipIntroAgencyState: play.shipIntroAgencyState || null,
      playerAgency: Boolean(
        !play.tacticalDraft?.active
        && !play.isPaused
        && !play.introActive
        && !play.isShipIntroAgencyBlocked?.()
        && (game.lives || 0) > 0
      ),
      gameplayClockAdvancing: Boolean(play.isGameplayClockAdvancing?.()),
      pendingEnemyStart: Boolean(play.pendingEnemyStartTimeout),
      enemyState: play.enemyManager?.state || null,
      activeEnemies: enemies.length,
      hostileBullets: bullets.length,
      hostileActionable,
      draftToastVisible,
      draftToastQueued: queuedDraftToast,
      toastType: toastMeta?.type || null,
      toastText: String(toastMeta?.text || toast?.__debugText || '').trim(),
      toastBounds: toastBounds ? {
        x: Math.round(toastBounds.x),
        y: Math.round(toastBounds.y),
        right: Math.round(toastBounds.x + toastBounds.width),
        bottom: Math.round(toastBounds.y + toastBounds.height)
      } : null,
      viewport: { width: game.getWidth(), height: game.getHeight() }
    };
  }, startedAt);
}

async function prepare(page, scenario) {
  await page.goto(`${baseUrl}/?autostart=1&skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(({ locale, reducedMotion }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', locale);
    localStorage.setItem('nova_accessibility_reduced_motion', reducedMotion ? '1' : '0');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: 0 }));
  }, scenario);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    play.introActive = false;
    play.introComplete = true;
    play.setShipIntroAgencyState?.('complete', 'post_draft_audit');
    play.clearPendingEnemyStart?.();
    play.enemyManager?.clearEnemies?.();
    play.enemyManager.state = 'LEVEL_COMPLETE';
    game.runMode = 'ranked_tactical';
    game.level = 10;
    game.lives = Math.max(3, Number(game.lives) || 0);
    const opened = play.openTacticalDraft({
      sectorCleared: 10,
      onComplete: () => {
        play.postBossLevelIntroPending = true;
        game.nextLevel();
      }
    });
    if (!opened) throw new Error('Post-Draft audit could not open Draft');
    play.tacticalDraft.inputArmed = true;
  });
  await page.waitForFunction(() => window.__game?.scenes?.play?.tacticalDraft?.active === true, null, { timeout: 10000 });
}

async function runScenario(browser, scenario) {
  const scenarioDir = path.join(outputDir, scenario.id);
  mkdirSync(scenarioDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
    ...(scenario.recordVideo ? { recordVideo: { dir: scenarioDir, size: { width: scenario.width, height: scenario.height } } } : {})
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await prepare(page, scenario);
  const startedAt = await page.evaluate(() => performance.now());
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    if (!play.confirmTacticalDraft(play.tacticalDraft.focusIndex, 'pointer')) throw new Error('Draft commit rejected');
  });
  await page.screenshot({ path: path.join(scenarioDir, '01-commit-accepted.png') });

  const timeline = [];
  let capturedAgency = false;
  let capturedOverlap = false;
  let capturedClear = false;
  const sampleUntil = Date.now() + 4300;
  while (Date.now() < sampleUntil) {
    const state = await readTimelineState(page, startedAt);
    timeline.push(state);
    if (!capturedAgency && state.playerAgency) {
      await page.screenshot({ path: path.join(scenarioDir, '02-first-player-agency.png') });
      capturedAgency = true;
    }
    if (!capturedOverlap && state.draftToastVisible && state.hostileActionable) {
      await page.screenshot({ path: path.join(scenarioDir, '03-actionable-overlap.png') });
      capturedOverlap = true;
    }
    if (!capturedClear && timeline.some((entry) => entry.draftToastVisible || entry.draftToastQueued)
      && !state.draftToastVisible && !state.draftToastQueued) {
      await page.screenshot({ path: path.join(scenarioDir, '04-confirmation-clear.png') });
      capturedClear = true;
    }
    await page.waitForTimeout(16);
  }

  const firstAgency = timeline.find((entry) => entry.playerAgency) || null;
  const firstHostile = timeline.find((entry) => entry.hostileActionable) || null;
  const firstToast = timeline.find((entry) => entry.draftToastVisible) || null;
  const lastToast = [...timeline].reverse().find((entry) => entry.draftToastVisible) || null;
  let overlapMs = 0;
  for (let index = 1; index < timeline.length; index += 1) {
    if (timeline[index - 1].draftToastVisible && timeline[index - 1].hostileActionable) {
      overlapMs += Math.max(0, timeline[index].ms - timeline[index - 1].ms);
    }
  }
  const toastOutOfBounds = timeline.filter((entry) => entry.draftToastVisible && entry.toastBounds).some((entry) => (
    entry.toastBounds.x < -4
    || entry.toastBounds.y < -4
    || entry.toastBounds.right > entry.viewport.width + 4
    || entry.toastBounds.bottom > entry.viewport.height + 4
  ));
  await page.close();
  if (video) await video.saveAs(path.join(scenarioDir, `${scenario.id}.webm`));
  await context.close();
  return {
    scenario,
    firstAgency,
    firstHostile,
    firstToast,
    lastToast,
    overlapMs,
    toastOutOfBounds,
    capturedAgency,
    capturedOverlap,
    capturedClear,
    errors,
    timeline
  };
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: findChrome() });
const scenarios = [
  { id: 'en-1920x1080', locale: 'en', width: 1920, height: 1080, reducedMotion: false },
  { id: 'en-1280x720', locale: 'en', width: 1280, height: 720, reducedMotion: false, recordVideo: true },
  { id: 'en-960x640', locale: 'en', width: 960, height: 640, reducedMotion: false, recordVideo: true },
  { id: 'en-960x640-reduced', locale: 'en', width: 960, height: 640, reducedMotion: true },
  ...locales.filter((locale) => locale !== 'en').map((locale) => ({
    id: `${locale.replaceAll(/[^a-z0-9]+/gi, '-')}-960x640`,
    locale,
    width: 960,
    height: 640,
    reducedMotion: false
  }))
];

try {
  const reports = [];
  for (const scenario of scenarios) reports.push(await runScenario(browser, scenario));
  const runtimeErrors = reports.flatMap((entry) => entry.errors.map((error) => `${entry.scenario.id}: ${error}`));
  assert.deepEqual(runtimeErrors, [], `Post-Draft audit runtime errors: ${runtimeErrors.join('; ')}`);
  assert.equal(reports.some((entry) => entry.toastOutOfBounds), false, 'Post-Draft confirmation escaped the viewport');
  const report = {
    status: 'passed',
    outputDir,
    proceedGateTriggered: reports.some((entry) => entry.overlapMs >= 500),
    maxActionableOverlapMs: Math.max(...reports.map((entry) => entry.overlapMs)),
    reports
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[post-draft-reentry-audit] PASS scenarios=${reports.length} proceed=${report.proceedGateTriggered} maxOverlapMs=${report.maxActionableOverlapMs}`);
  console.log(`[post-draft-reentry-audit] report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  server.kill();
}
