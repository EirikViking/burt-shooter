import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4363));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/overrun-milestones-${timestamp()}`);
const viewports = [
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 }
];
const cases = [
  { sector: 10, eventKind: 'run_clear', variantId: 'clear_gate', title: 'RUN CLEAR! OVERRUN UNLOCKED', control: 'keyboard' },
  { sector: 20, eventKind: 'overrun_milestone', variantId: 'second_signal', title: 'OVERRUN 20: SECOND SIGNAL', control: 'pointer' },
  { sector: 30, eventKind: 'overrun_milestone', variantId: 'pattern_storm', title: 'OVERRUN 30: PATTERN STORM', control: 'gamepad' },
  { sector: 40, eventKind: 'overrun_milestone', variantId: 'deep_circuit', title: 'OVERRUN 40: DEEP CIRCUIT', control: 'keyboard' },
  { sector: 50, eventKind: 'overrun_milestone', variantId: 'last_cabinet_call', title: 'OVERRUN 50: LAST CABINET CALL', control: 'pointer' }
];

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

async function startTestServer() {
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
  throw new Error(`Vite test server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function readRuntimeSnapshot(page) {
  return page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const play = window.__game?.scenes?.play;
    return {
      state,
      internals: {
        gameTime: Number(play?.gameTime || 0),
        scoreBoostTimer: Number(play?.scoreBoostTimer || 0),
        waveTimer: Number(play?.enemyManager?.waveTimer || 0),
        waveBriefingTimer: Number(play?.enemyManager?.waveBriefingTimer || 0),
        pickups: Array.isArray(play?.powerupManager?.powerups) ? play.powerupManager.powerups.length : 0,
        counts: {
          enemies: Number(state?.counts?.enemies || 0),
          playerBullets: Number(state?.counts?.playerBullets || 0),
          enemyBullets: Number(state?.counts?.enemyBullets || 0)
        }
      }
    };
  });
}

function overlaps(a, b, padding = 3) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

function assertTextLayout(state, label, viewport, { requireBonus = false } = {}) {
  const interlude = state?.overrunInterlude;
  assert.equal(interlude?.active, true, `${label}: interlude is not active`);
  assert.equal(interlude?.cardVisible, true, `${label}: card is not visible`);
  assert.equal(interlude?.promptVisible, true, `${label}: prompt is not visible`);
  assert(interlude?.buttonBounds, `${label}: missing continue button bounds`);
  const textNodes = (interlude?.textNodes || [])
    .filter(node => node.visible !== false && node.bounds && node.bounds.width > 0 && node.bounds.height > 0 && String(node.text || '').trim());
  const expectedIds = [
    'ui_overrun_card_title',
    'ui_overrun_card_flavor',
    'ui_overrun_card_report',
    'ui_overrun_card_sector',
    'ui_overrun_card_warning',
    'ui_overrun_confirm_prompt'
  ];
  if (requireBonus) expectedIds.push('ui_overrun_card_bonus');
  for (const id of expectedIds) {
    assert(textNodes.some(node => node.id === id), `${label}: missing overrun text node ${id}`);
  }

  const failures = [];
  for (const node of textNodes) {
    if (node.bounds.x < -2 || node.bounds.y < -2 ||
      node.bounds.x + node.bounds.width > viewport.width + 2 ||
      node.bounds.y + node.bounds.height > viewport.height + 2) {
      failures.push(`${node.id} outside viewport`);
    }
  }
  for (let i = 0; i < textNodes.length; i += 1) {
    for (let j = i + 1; j < textNodes.length; j += 1) {
      if (overlaps(textNodes[i].bounds, textNodes[j].bounds)) {
        failures.push(`${textNodes[i].id} overlaps ${textNodes[j].id}`);
      }
    }
  }
  assert.equal(failures.length, 0, `${label}: ${failures.join('; ')}`);
}

async function stageMilestone(page, testCase) {
  return page.evaluate(({ sector }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) throw new Error('Missing play scene for overrun milestone check');

    play.introActive = false;
    play.introComplete = true;
    play.debugInvincible = true;
    play.debugStartLevel = null;
    play.debugStartAtBoss = false;
    play.gameOverInterlude = null;
    play.gameOverSequenceStarted = false;
    play.isPaused = false;
    play.levelAdvancePending = false;
    play.postBossLevelIntroPending = false;
    play._lastStartedLevel = null;
    play.clearOverrunConfirmationHandlers?.();
    play.clearToastState?.();
    play.overrunClearEffects?.forEach((effect) => {
      effect.container?.parent?.removeChild(effect.container);
      effect.container?.destroy?.({ children: true });
    });
    play.overrunClearEffects = [];
    play.overrunMilestoneInterlude = null;
    play.overrunCelebratedMilestones = new Set();
    play.enemyManager?.clearEnemies?.();
    if (play.bulletManager) {
      for (const bullet of [...(play.bulletManager.playerBullets || []), ...(play.bulletManager.enemyBullets || [])]) {
        bullet.sprite?.parent?.removeChild?.(bullet.sprite);
      }
      play.bulletManager.playerBullets = [];
      play.bulletManager.enemyBullets = [];
      play.bulletManager.pendingEnemyBullets = [];
    }
    if (Array.isArray(play.powerupManager?.powerups)) {
      for (const powerup of play.powerupManager.powerups) powerup.sprite?.parent?.removeChild?.(powerup.sprite);
      play.powerupManager.powerups = [];
    }

    game.gameOverTransitionPending = false;
    game.level = sector;
    game.lives = 3;
    game.score = sector * 1000;
    game.rankIndex = Math.max(0, Math.floor(sector / 10) - 1);
    game.lastRankIndex = game.rankIndex;
    game.runCleared = sector > 10;
    game.runClearReason = sector > 10 ? 'target_sector_clear' : null;
    game.runClearLivesRemaining = sector > 10 ? game.lives : 0;
    game.currentScene = play;
    game.currentSceneName = 'play';

    play.gameTime = 42 + sector;
    play.scoreBoostTimer = 9876.5;
    play.scoreMultiplier = 2;
    game.scoreMultiplier = 2;
    if (play.player) {
      play.player.scoreMultiplier = 2;
      play.player.scoreBoostExpiresAt = Date.now() + 9876;
    }
    if (play.enemyManager) {
      play.enemyManager.waveTimer = 321;
      play.enemyManager.waveBriefingTimer = 654;
    }

    const first = play.maybeTriggerOverrunCelebration({
      sectorCleared: sector,
      bossCompletion: true,
      compactHud: game.getWidth() < 620
    });
    const beforeDuplicateCount = play.overrunClearEffects.length;
    const duplicate = play.maybeTriggerOverrunCelebration({
      sectorCleared: sector,
      bossCompletion: true,
      compactHud: game.getWidth() < 620
    });
    const afterDuplicateCount = play.overrunClearEffects.length;
    game.nextLevel();
    return {
      first,
      duplicate,
      beforeDuplicateCount,
      afterDuplicateCount,
      level: game.level,
      runCleared: game.runCleared,
      scoreBoostTimer: play.scoreBoostTimer,
      gameTime: play.gameTime,
      waveTimer: play.enemyManager?.waveTimer,
      waveBriefingTimer: play.enemyManager?.waveBriefingTimer,
      state: JSON.parse(window.render_game_to_text?.() || '{}')
    };
  }, { sector: testCase.sector });
}

async function confirmInterlude(page, control, state) {
  if (control === 'keyboard') {
    await page.keyboard.press('Enter');
    return;
  }
  if (control === 'pointer') {
    const bounds = state?.overrunInterlude?.buttonBounds || state?.overrunInterlude?.promptBounds;
    assert(bounds, 'pointer confirmation missing button bounds');
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    return;
  }
  if (control === 'gamepad') {
    await page.evaluate(() => {
      window.__burtGamepadOverride = {
        id: 'overrun-milestone-check-pad',
        index: 0,
        connected: true,
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: index === 0, value: index === 0 ? 1 : 0 }))
      };
    });
    return;
  }
  throw new Error(`Unknown confirmation control ${control}`);
}

async function releaseGamepad(page) {
  await page.evaluate(() => {
    window.__burtGamepadOverride = {
      id: 'overrun-milestone-check-pad',
      index: 0,
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
    };
  });
}

async function assertGuardChecks(page) {
  const guards = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) throw new Error('Missing play scene for guard checks');
    play.overrunCelebratedMilestones = new Set();
    game.level = 60;
    game.runCleared = true;
    const nonBoss = play.maybeTriggerOverrunCelebration({ sectorCleared: 60, bossCompletion: false });
    play.gameOverInterlude = { active: true };
    const gameOver = play.maybeTriggerOverrunCelebration({ sectorCleared: 60, bossCompletion: true });
    play.gameOverInterlude = null;
    game.gameOverTransitionPending = true;
    const transition = play.maybeTriggerOverrunCelebration({ sectorCleared: 60, bossCompletion: true });
    game.gameOverTransitionPending = false;
    return { nonBoss, gameOver, transition };
  });
  assert.equal(guards.nonBoss, false, 'non-boss milestone guard triggered');
  assert.equal(guards.gameOver, false, 'game-over interlude guard triggered');
  assert.equal(guards.transition, false, 'game-over transition guard triggered');
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;
const results = [];
const variantIds = new Set();
const titles = new Set();

try {
  server = await startTestServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: viewports[0] });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 700));
  });

  await page.goto(`${baseUrl}/?autostart=1&debugBossToken=NOVA_DEBUG_2026`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.enemyManager && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  for (const testCase of cases) {
    for (const viewport of viewports) {
      await releaseGamepad(page);
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);

      const staged = await stageMilestone(page, testCase);
      assert.equal(staged.first, true, `sector ${testCase.sector}: first trigger failed`);
      assert.equal(staged.duplicate, false, `sector ${testCase.sector}: duplicate trigger returned true`);
      assert.equal(staged.beforeDuplicateCount, staged.afterDuplicateCount, `sector ${testCase.sector}: duplicate added another effect`);
      assert.equal(staged.level, testCase.sector + 1, `sector ${testCase.sector}: nextLevel did not advance`);
      assert.equal(staged.runCleared, true, `sector ${testCase.sector}: run clear flag missing after milestone`);
      assert.equal(staged.state.overrunInterlude?.active, true, `sector ${testCase.sector}: interlude missing after trigger`);
      assert.equal(staged.state.overrunInterlude?.eventKind, testCase.eventKind, `sector ${testCase.sector}: wrong event kind`);
      assert.equal(staged.state.overrunInterlude?.milestoneSector, testCase.sector, `sector ${testCase.sector}: wrong milestone sector`);
      assert.equal(staged.state.overrunInterlude?.variantId, testCase.variantId, `sector ${testCase.sector}: wrong variant`);

      await page.waitForFunction(() => {
        const state = JSON.parse(window.render_game_to_text?.() || '{}');
        return state.overrunInterlude?.active === true &&
          state.overrunInterlude?.cardVisible === true &&
          state.overrunInterlude?.promptVisible === true;
      }, null, { timeout: 3000 });
      await page.waitForTimeout(1450);

      const held = await readRuntimeSnapshot(page);
      const label = `sector ${testCase.sector} ${viewport.width}x${viewport.height}`;
      assert.equal(held.state.level, testCase.sector + 1, `${label}: level changed while held`);
      assert.equal(held.state.overrunInterlude?.readyForConfirm, true, `${label}: confirm was not ready after hold`);
      assert.equal(held.state.overrunInterlude?.eventKind, testCase.eventKind, `${label}: held event kind drifted`);
      assert.equal(held.state.overrunInterlude?.variantId, testCase.variantId, `${label}: held variant drifted`);
      assert.equal(held.internals.gameTime, staged.gameTime, `${label}: gameplay time advanced while held`);
      assert.equal(held.internals.scoreBoostTimer, staged.scoreBoostTimer, `${label}: score boost timer advanced while held`);
      assert.equal(held.internals.waveTimer, staged.waveTimer, `${label}: wave timer advanced while held`);
      assert.equal(held.internals.waveBriefingTimer, staged.waveBriefingTimer, `${label}: wave briefing timer advanced while held`);
      assert.deepEqual(held.internals.counts, {
        enemies: Number(staged.state?.counts?.enemies || 0),
        playerBullets: Number(staged.state?.counts?.playerBullets || 0),
        enemyBullets: Number(staged.state?.counts?.enemyBullets || 0)
      }, `${label}: gameplay counts advanced while held`);
      assert.equal(held.internals.pickups, 0, `${label}: pickups advanced or appeared while held`);
      assertTextLayout(held.state, label, viewport, { requireBonus: testCase.sector === 10 });
      const titleNode = held.state.overrunInterlude.textNodes.find(node => node.id === 'ui_overrun_card_title');
      assert.equal(titleNode?.text, testCase.title, `${label}: wrong title text`);
      assert.match(held.state.overrunInterlude?.promptText || '', /.+/, `${label}: empty continue prompt`);
      variantIds.add(held.state.overrunInterlude.variantId);
      titles.add(titleNode.text);

      const screenshot = path.join(outputDir, `sector-${testCase.sector}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });

      await confirmInterlude(page, testCase.control, held.state);
      await page.waitForFunction((control) => {
        const state = JSON.parse(window.render_game_to_text?.() || '{}');
        return state.overrunInterlude?.confirmed === true &&
          state.overrunInterlude?.confirmedBy === control;
      }, testCase.control === 'pointer' ? 'pointer' : testCase.control, { timeout: 2500 });
      if (testCase.control === 'gamepad') await releaseGamepad(page);
      const confirmed = await readState(page);
      await page.waitForFunction((nextSector) => {
        const state = JSON.parse(window.render_game_to_text?.() || '{}');
        return state.scene === 'play' &&
          state.level === nextSector &&
          state.overrunInterlude?.active === false;
      }, testCase.sector + 1, { timeout: 4000 });
      const resumed = await readState(page);
      assert.equal(resumed.level, testCase.sector + 1, `${label}: resumed at wrong sector`);
      assert.equal(resumed.overrunInterlude?.active, false, `${label}: interlude did not clear after confirm`);
      assert.equal(resumed.gameOverInterlude?.active, false, `${label}: game-over interlude overlapped`);
      assert.equal(resumed.scene, 'play', `${label}: scene changed away from play`);

      results.push({
        sector: testCase.sector,
        viewport,
        eventKind: testCase.eventKind,
        variantId: testCase.variantId,
        control: testCase.control,
        title: titleNode.text,
        prompt: held.state.overrunInterlude.promptText,
        confirmedBy: confirmed.overrunInterlude?.confirmedBy,
        screenshot
      });
    }
  }

  assert.equal(variantIds.size, cases.length, 'curated milestones did not expose unique variants');
  assert.equal(titles.size, cases.length, 'curated milestones did not expose unique titles');
  await assertGuardChecks(page);

  const report = {
    status: 'passed',
    baseUrl,
    cases: results,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length > 0) throw new Error(`Console errors: ${consoleErrors.join('; ')}`);
  console.log(`[overrun-milestones] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[overrun-milestones] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
