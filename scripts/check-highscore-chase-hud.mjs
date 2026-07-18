import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4476));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/highscore-chase-hud-${timestamp()}`);
const supportedLanguages = ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja'];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
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
  throw new Error(`No available highscore chase HUD port found starting at ${startPort}`);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

async function setChase(score, target) {
  return page.evaluate(({ score, target }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    if (!game || !play || !hud) return { ok: false, reason: 'missing game/play/hud' };
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    game.score = score;
    game.highscoreChase = {
      targetScore: target,
      runMode: 'ranked',
      source: 'test_personal_best',
      syncingTarget: false,
      checkpoint: null,
      surpassed: score > target,
      milestones: new Set(),
      lastTauntAtMs: 0,
      tauntIndex: 0
    };
    hud.highscoreChaseDisplayKey = '';
    hud.highscoreChaseRenderKey = '';
    hud.updateHighscoreChase();
    return {
      ok: true,
      debug: hud.highscoreChaseGroup?._debugChase || null,
      text: {
        title: hud.highscoreChaseTitle?.text || '',
        target: hud.highscoreChaseTarget?.text || '',
        gap: hud.highscoreChaseGap?.text || ''
      }
    };
  }, { score, target });
}

async function setRivalChase(score, target = 1000) {
  return page.evaluate(({ score, target }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    if (!game || !play || !hud) return { ok: false, reason: 'missing game/play/hud' };
    const entries = Array.from({ length: 40 }, (_, index) => ({
      rank: index + 1,
      score: 5100 - index * 100,
      name: `ORBIT ACE ${index + 1}`,
      isCurrentPlayer: false,
      source: 'steam-test'
    }));
    game.runMode = 'ranked';
    game.score = score;
    game.highscoreChase = {
      targetScore: target,
      runMode: 'ranked',
      goalMode: 'score',
      source: 'test_personal_best',
      syncingTarget: false,
      surpassed: score > target,
      milestones: new Set()
    };
    game.globalLeaderboardTargets = entries;
    hud.globalRivalFlash = null;
    hud.globalRivalFlashUntil = 0;
    hud.highscoreChaseDisplayKey = '';
    hud.highscoreChaseRenderKey = '';
    hud.updateHighscoreChase();
    const gameOver = game.scenes?.gameOver;
    if (gameOver) {
      gameOver.isRankedRun = true;
      gameOver.finalScore = score;
      gameOver.cachedHighscores = entries;
    }
    const chaseBounds = hud.highscoreChaseGroup?.getBounds?.();
    const scoreBounds = hud.scoreText?.getBounds?.();
    const overlapsScore = Boolean(chaseBounds && scoreBounds && !(
      chaseBounds.x + chaseBounds.width <= scoreBounds.x
      || scoreBounds.x + scoreBounds.width <= chaseBounds.x
      || chaseBounds.y + chaseBounds.height <= scoreBounds.y
      || scoreBounds.y + scoreBounds.height <= chaseBounds.y
    ));
    return {
      ok: true,
      debug: hud.highscoreChaseGroup?._debugChase || null,
      text: {
        title: hud.highscoreChaseTitle?.text || '',
        target: hud.highscoreChaseTarget?.text || '',
        gap: hud.highscoreChaseGap?.text || ''
      },
      bounds: chaseBounds ? {
        x: Math.round(chaseBounds.x),
        y: Math.round(chaseBounds.y),
        width: Math.round(chaseBounds.width),
        height: Math.round(chaseBounds.height)
      } : null,
      overlapsScore,
      sameExistingPanel: hud.highscoreChaseGroup?.parent === hud.hudContainer,
      gameOverGoal: gameOver?.getGlobalRivalNextGoalText?.() || ''
    };
  }, { score, target });
}

async function triggerRivalFlash() {
  return page.evaluate(() => {
    const game = window.__game;
    const hud = game?.scenes?.play?.hud;
    if (!game || !hud) return { ok: false, reason: 'missing game/hud' };
    const nextProjection = game.getGlobalRivalChaseState?.() || null;
    hud.showGlobalRivalPass?.({
      passedTarget: {
        targetKind: 'board_gate',
        targetName: 'ORBIT ACE 40',
        targetRank: 40,
        targetEntryScore: 1200
      },
      nextProjection
    });
    hud.highscoreChaseRenderKey = '';
    hud.updateHighscoreChase();
    return {
      ok: true,
      debug: hud.highscoreChaseGroup?._debugChase || null,
      text: {
        title: hud.highscoreChaseTitle?.text || '',
        target: hud.highscoreChaseTarget?.text || '',
        gap: hud.highscoreChaseGap?.text || ''
      }
    };
  });
}

async function setLanguage(language) {
  await page.evaluate(async (nextLanguage) => {
    await window.__novaI18n?.setLanguagePreference?.(nextLanguage);
  }, language);
  await page.waitForTimeout(120);
}

try {
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.hud?.updateHighscoreChase, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const near = await setChase(930, 1000);
  await page.waitForTimeout(160);
  const nearScreenshot = path.join(outputDir, 'highscore-chase-near.png');
  await page.screenshot({ path: nearScreenshot, fullPage: true });

  const surpassed = await setChase(1120, 1000);
  await page.waitForTimeout(160);
  const surpassedScreenshot = path.join(outputDir, 'highscore-chase-surpassed.png');
  await page.screenshot({ path: surpassedScreenshot, fullPage: true });

  const boardGate = await setRivalChase(1120);
  await page.waitForTimeout(160);
  const boardGateScreenshot = path.join(outputDir, 'rival-ladder-board-gate.png');
  await page.screenshot({ path: boardGateScreenshot, fullPage: true });

  const nextRival = await setRivalChase(1250);
  await page.waitForTimeout(160);
  const nextRivalScreenshot = path.join(outputDir, 'rival-ladder-next-rival.png');
  await page.screenshot({ path: nextRivalScreenshot, fullPage: true });

  const rivalPassFlash = await triggerRivalFlash();
  await page.waitForTimeout(120);
  const rivalPassFlashScreenshot = path.join(outputDir, 'rival-ladder-gate-breached.png');
  await page.screenshot({ path: rivalPassFlashScreenshot, fullPage: true });

  const projectedNumberOne = await setRivalChase(5200);
  await page.waitForTimeout(160);
  const projectedNumberOneScreenshot = path.join(outputDir, 'rival-ladder-projected-number-one.png');
  await page.screenshot({ path: projectedNumberOneScreenshot, fullPage: true });

  const localizedRivals = {};
  for (const language of supportedLanguages) {
    await setLanguage(language);
    const state = await setRivalChase(1250);
    await page.waitForTimeout(80);
    const screenshot = path.join(outputDir, `rival-ladder-next-rival-${language}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    localizedRivals[language] = { ...state, screenshot };
  }
  await setLanguage('en');

  const failures = [];
  if (!near.ok) failures.push(near.reason || 'near state setup failed');
  if (!surpassed.ok) failures.push(surpassed.reason || 'surpassed state setup failed');
  if (!near.debug?.nearTarget) failures.push(`near-target state did not activate: ${JSON.stringify(near.debug)}`);
  if (near.debug?.surpassed) failures.push(`near-target state incorrectly surpassed: ${JSON.stringify(near.debug)}`);
  if ((near.debug?.tickCount || 0) !== 4) failures.push(`near-target marker count mismatch: ${JSON.stringify(near.debug)}`);
  if (!Number.isFinite(near.debug?.glintX)) failures.push(`near-target glint missing: ${JSON.stringify(near.debug)}`);
  if ((near.debug?.targetChevronCount || 0) < 3) failures.push(`near-target chevrons missing: ${JSON.stringify(near.debug)}`);
  if (!surpassed.debug?.surpassed) failures.push(`surpassed state did not activate: ${JSON.stringify(surpassed.debug)}`);
  if (surpassed.debug?.nearTarget) failures.push(`surpassed state should not be near-only: ${JSON.stringify(surpassed.debug)}`);
  if ((surpassed.debug?.tickCount || 0) !== 4) failures.push(`surpassed marker count mismatch: ${JSON.stringify(surpassed.debug)}`);
  if ((surpassed.debug?.victoryBurstCount || 0) < 6) failures.push(`surpassed victory burst missing: ${JSON.stringify(surpassed.debug)}`);
  if (!/OLD SCORE|HUMILIATED/i.test(surpassed.text?.gap || '')) failures.push(`surpassed text mismatch: ${JSON.stringify(surpassed.text)}`);
  if (boardGate.debug?.targetKind !== 'board_gate') failures.push(`board gate projection mismatch: ${JSON.stringify(boardGate)}`);
  if (!/TOP 40 GATE/i.test(boardGate.text?.title || '') || !/ORBIT ACE 40/i.test(boardGate.text?.target || '')) {
    failures.push(`board gate text mismatch: ${JSON.stringify(boardGate.text)}`);
  }
  if (!/TOP 40 GATE: #40 ORBIT ACE 40.*81 MORE/i.test(boardGate.gameOverGoal || '')) {
    failures.push(`board gate Game Over goal mismatch: ${boardGate.gameOverGoal}`);
  }
  if (nextRival.debug?.targetKind !== 'next_rival' || nextRival.debug?.targetRank !== 39 || nextRival.debug?.scoreToPass !== 51) {
    failures.push(`next rival projection mismatch: ${JSON.stringify(nextRival)}`);
  }
  if (!/RIVAL TARGET #39/i.test(nextRival.text?.title || '') || !/ORBIT ACE 39/i.test(nextRival.text?.target || '') || !/51 TO PASS/i.test(nextRival.text?.gap || '')) {
    failures.push(`next rival text mismatch: ${JSON.stringify(nextRival.text)}`);
  }
  if (!/NEXT RIVAL #39: ORBIT ACE 39.*51 MORE/i.test(nextRival.gameOverGoal || '')) {
    failures.push(`next rival Game Over goal mismatch: ${nextRival.gameOverGoal}`);
  }
  if (!rivalPassFlash.debug?.rivalFlashActive || !/TOP 40 BREACHED/i.test(rivalPassFlash.text?.title || '') || !/ORBIT ACE 40/i.test(rivalPassFlash.text?.target || '')) {
    failures.push(`rival pass flash mismatch: ${JSON.stringify(rivalPassFlash)}`);
  }
  if (!projectedNumberOne.debug?.projectedNumberOne || projectedNumberOne.debug?.targetKind !== 'number_one') {
    failures.push(`projected number-one state mismatch: ${JSON.stringify(projectedNumberOne)}`);
  }
  if (!/PROJECTED #1/i.test(projectedNumberOne.text?.title || '') || !/SUBMIT TO CONFIRM/i.test(projectedNumberOne.text?.gap || '')) {
    failures.push(`projected number-one text mismatch: ${JSON.stringify(projectedNumberOne.text)}`);
  }
  for (const [label, state] of Object.entries({ boardGate, nextRival, projectedNumberOne })) {
    if (!state.sameExistingPanel) failures.push(`${label} created or moved outside the existing chase panel`);
    if (state.overlapsScore) failures.push(`${label} overlaps the permanent score readout`);
    const bounds = state.bounds;
    if (!bounds || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > 1280 || bounds.y + bounds.height > 720) {
      failures.push(`${label} bounds escape the viewport: ${JSON.stringify(bounds)}`);
    }
  }
  for (const [language, state] of Object.entries(localizedRivals)) {
    const combinedText = `${state.text?.title || ''} ${state.text?.target || ''} ${state.text?.gap || ''}`;
    if (!state.ok || state.debug?.targetKind !== 'next_rival') failures.push(`${language} rival state failed: ${JSON.stringify(state)}`);
    if (!/ORBIT ACE 39/.test(state.text?.target || '') || !/51/.test(state.text?.gap || '')) failures.push(`${language} rival identity/gap missing: ${combinedText}`);
    if (/[{}]/.test(combinedText)) failures.push(`${language} rival text contains an unresolved placeholder: ${combinedText}`);
    if (state.overlapsScore) failures.push(`${language} rival card overlaps score`);
    const bounds = state.bounds;
    if (!bounds || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > 1280 || bounds.y + bounds.height > 720) {
      failures.push(`${language} rival bounds escape the viewport: ${JSON.stringify(bounds)}`);
    }
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshots: {
      near: nearScreenshot,
      surpassed: surpassedScreenshot,
      boardGate: boardGateScreenshot,
      nextRival: nextRivalScreenshot,
      rivalPassFlash: rivalPassFlashScreenshot,
      projectedNumberOne: projectedNumberOneScreenshot
    },
    near,
    surpassed,
    boardGate,
    nextRival,
    rivalPassFlash,
    projectedNumberOne,
    localizedRivals,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[highscore-chase-hud] ${failures.join('; ')}`);
  console.log(`[highscore-chase-hud] PASS near=${nearScreenshot} rival=${nextRivalScreenshot} projectedNumberOne=${projectedNumberOneScreenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
