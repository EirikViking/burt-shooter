import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4347));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/controller-only-flow-${timestamp()}`);
const viewport = {
  width: Number(process.env.CHECK_WIDTH) || 1366,
  height: Number(process.env.CHECK_HEIGHT) || 768
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    next.searchParams.set(key, value);
  }
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

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
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

function codexState(state) {
  return state?.threatCodex || state?.threatCodexScreen || null;
}

function achievementsScreen(state) {
  return state?.achievementsScreen || null;
}

async function waitForState(page, predicate, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await readState(page);
    if (predicate(latest)) return latest;
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify({
    scene: latest?.scene,
    overlays: latest?.overlays,
    menu: latest?.menu?.focusedOption,
    settingsFocus: latest?.settingsOverlay?.focus,
    shipSelect: latest?.shipSelect,
    gameOver: latest?.gameOver && {
      state: latest.gameOver.state,
      inputDevice: latest.gameOver.inputDevice,
      nameInput: latest.gameOver.nameInput
    },
    highscore: latest?.highscore
  })}`);
}

async function setGamepad(page, { buttons = [], axes = [0, 0], connected = true } = {}) {
  await page.evaluate(({ buttons: pressedButtons, axes: nextAxes, connected: nextConnected }) => {
    const buttonState = Array.from({ length: 17 }, (_, index) => {
      const pressed = pressedButtons.includes(index);
      return { pressed, value: pressed ? 1 : 0 };
    });
    window.__burtGamepadOverride = {
      id: 'controller-flow-test-pad',
      index: 0,
      connected: nextConnected,
      axes: nextAxes,
      buttons: buttonState
    };
  }, { buttons, axes, connected });
}

async function tapButton(page, button, holdMs = 120) {
  await setGamepad(page, { buttons: [button] });
  await page.waitForTimeout(holdMs);
  await setGamepad(page);
  await page.waitForTimeout(120);
}

async function screenshot(page, name) {
  const target = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function steerMenuTo(page, optionId) {
  const fallbackOrder = ['launch', 'sectorStart', 'hangar', 'highscores', 'threatCodex', 'achievements', 'settings', 'exit', 'howToPlay', 'music'];
  for (let i = 0; i < 12; i += 1) {
    const state = await readState(page);
    if (state.menu?.focusedOption === optionId) return state;
    const order = Array.isArray(state.menu?.optionOrder) && state.menu.optionOrder.length
      ? state.menu.optionOrder
      : fallbackOrder;
    const currentIndex = order.indexOf(state.menu?.focusedOption);
    const targetIndex = order.indexOf(optionId);
    if (currentIndex >= 0 && targetIndex >= 0) {
      const downSteps = (targetIndex - currentIndex + order.length) % order.length;
      const upSteps = (currentIndex - targetIndex + order.length) % order.length;
      await tapButton(page, upSteps < downSteps ? 12 : 13);
    } else {
      await tapButton(page, 13);
    }
  }
  throw new Error(`Menu focus did not reach ${optionId}`);
}

async function steerSettingsFocusTo(page, focusId, { maxSteps = 28, directionButton = 13 } = {}) {
  for (let i = 0; i < maxSteps; i += 1) {
    const state = await readState(page);
    if (state.settingsOverlay?.focus === focusId) return state;
    await tapButton(page, directionButton);
  }
  return waitForState(page, (state) => state.settingsOverlay?.focus === focusId, `${focusId} settings focus`);
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport });
const pageErrors = [];
const consoleErrors = [];
const checkpoints = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

function checkpoint(label, state, extra = {}) {
  checkpoints.push({
    label,
    scene: state?.scene || null,
    overlays: state?.overlays || null,
    menuFocus: state?.menu?.focusedOption || null,
    settingsFocus: state?.settingsOverlay?.focus || null,
    shipSelect: state?.shipSelect ? {
      selectedIndex: state.shipSelect.selectedIndex,
      spriteKey: state.shipSelect.spriteKey,
      mainMenuButtonFocused: state.shipSelect.mainMenuButtonFocused,
      hangarMenuVisible: Boolean(state.shipSelect.hangarMenu?.visible)
    } : null,
    gameOver: state?.gameOver ? {
      state: state.gameOver.state,
      inputDevice: state.gameOver.inputDevice,
      nameInput: state.gameOver.nameInput,
      runbackReason: state.gameOver.runbackReason
    } : null,
    highscore: state?.highscore ? {
      activeLeaderboard: state.highscore.activeLeaderboard,
      focusedControl: state.highscore.focusedControl,
      rowCount: state.highscore.rows?.length || 0
    } : null,
    ...extra
  });
}

try {
  mkdirSync(outputDir, { recursive: true });
  await page.addInitScript(() => {
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 150000, bestRank: 19, bestLevel: 60 }));
    localStorage.removeItem('nova.controllerPilotName.v1');
    window.__burtGamepadOverride = {
      id: 'controller-flow-test-pad',
      index: 0,
      connected: true,
      axes: [0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
    };
  });

  await page.goto(withQuery(baseUrl, { skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  const menuInitial = await waitForState(page, (state) => state.scene === 'menu' && state.menu?.focusedOption === 'launch', 'menu launch focus', 30000);
  checkpoint('menu-initial', menuInitial, { screenshot: await screenshot(page, '01-menu-initial') });

  await steerMenuTo(page, 'settings');
  await tapButton(page, 0);
  const settingsOpen = await waitForState(page, (state) => state.overlays?.settings && state.settingsOverlay?.focus, 'settings opened from menu');
  checkpoint('menu-settings-open', settingsOpen, { screenshot: await screenshot(page, '02-menu-settings-open') });

  const masterBefore = settingsOpen.audio?.masterVolume;
  const languageFocused = await steerSettingsFocusTo(page, 'language');
  checkpoint('menu-settings-language-focus', languageFocused);
  await tapButton(page, 13);
  const masterFocused = await waitForState(page, (state) => state.settingsOverlay?.focus === 'slider_master', 'master slider focus');
  await tapButton(page, 14);
  const masterAfter = await waitForState(page, (state) => state.settingsOverlay?.focus === 'slider_master', 'master slider after adjustment');
  checkpoint('menu-settings-slider-adjusted', masterAfter, {
    masterBefore,
    masterAfter: masterAfter.audio?.masterVolume
  });
  assert(masterAfter.audio?.masterVolume !== masterBefore, 'Controller did not adjust the master volume slider');
  const creditsFocused = await steerSettingsFocusTo(page, 'footer_credits');
  checkpoint('menu-settings-credits-focused', creditsFocused);
  await tapButton(page, 0);
  const creditsOpen = await waitForState(page, (state) => state.overlays?.credits && state.settingsOverlay?.credits, 'credits opened from settings by controller');
  checkpoint('menu-settings-credits-open', creditsOpen, { screenshot: await screenshot(page, '03-menu-settings-credits-open') });
  await tapButton(page, 12);
  await tapButton(page, 0);
  await tapButton(page, 0);
  await tapButton(page, 0);
  const creditsCoin = await waitForState(page, (state) => state.settingsOverlay?.credits?.easterEgg?.clicks >= 3, 'credits coin controller activation');
  checkpoint('menu-settings-credits-coin', creditsCoin);
  await tapButton(page, 1);
  await waitForState(page, (state) => state.overlays?.settings && !state.overlays?.credits, 'credits closed with controller');
  await tapButton(page, 1);
  await waitForState(page, (state) => state.scene === 'menu' && !state.overlays?.settings, 'settings closed with controller');

  await steerMenuTo(page, 'threatCodex');
  await tapButton(page, 0);
  const codexOpen = await waitForState(page, (state) => state.scene === 'threatCodex' && codexState(state)?.selectedEntryId, 'threat codex opened by controller');
  checkpoint('threat-codex-open', codexOpen, { screenshot: await screenshot(page, '04-threat-codex-open') });
  await tapButton(page, 15);
  await tapButton(page, 13);
  const codexMoved = await waitForState(page, (state) =>
    state.scene === 'threatCodex' &&
    (codexState(state)?.category !== codexState(codexOpen)?.category ||
      codexState(state)?.selectedEntryId !== codexState(codexOpen)?.selectedEntryId),
  'threat codex controller navigation');
  checkpoint('threat-codex-navigation', codexMoved);
  await tapButton(page, 1);
  await waitForState(page, (state) => state.scene === 'menu' && state.menu?.focusedOption, 'threat codex returned to menu');

  await steerMenuTo(page, 'achievements');
  await tapButton(page, 0);
  const achievementsOpen = await waitForState(page, (state) => state.scene === 'achievements' && achievementsScreen(state)?.focusedId, 'achievements opened by controller');
  checkpoint('achievements-open', achievementsOpen, { screenshot: await screenshot(page, '05-achievements-open') });
  await tapButton(page, 13);
  const achievementsMoved = await waitForState(page, (state) =>
    state.scene === 'achievements' && achievementsScreen(state)?.focusedId !== achievementsScreen(achievementsOpen)?.focusedId,
  'achievements controller navigation');
  checkpoint('achievements-navigation', achievementsMoved);
  await tapButton(page, 1);
  await waitForState(page, (state) => state.scene === 'menu' && state.menu?.focusedOption, 'achievements returned to menu');

  const hangarFocused = await steerMenuTo(page, 'hangar');
  checkpoint('menu-hangar-focused', hangarFocused);
  await tapButton(page, 0);
  const hangar = await waitForState(page, (state) => state.scene === 'shipSelect' && state.shipSelect?.spriteKey, 'ship select opened');
  checkpoint('ship-select-open', hangar, { screenshot: await screenshot(page, '06-ship-select-open') });
  if (hangar.shipSelect?.unlockPresentation?.visible) {
    await tapButton(page, 9);
    await waitForState(page, (state) =>
      state.scene === 'shipSelect' && state.shipSelect?.unlockPresentation?.visible === false,
    'hangar unlock presentation dismissed by controller Start');
  }
  await tapButton(page, 9);
  const hangarMenu = await waitForState(page, (state) => state.shipSelect?.hangarMenu?.visible, 'hangar menu opened by controller Start');
  checkpoint('ship-select-hangar-menu-open', hangarMenu, { screenshot: await screenshot(page, '07-ship-select-hangar-menu-open') });
  await tapButton(page, 13);
  await tapButton(page, 12);
  await tapButton(page, 1);
  await waitForState(page, (state) => state.scene === 'shipSelect' && !state.shipSelect?.hangarMenu?.visible, 'hangar menu closed by controller B');
  const firstShipIndex = hangar.shipSelect.selectedIndex;
  await tapButton(page, 15);
  const afterRight = await waitForState(page, (state) => state.shipSelect?.selectedIndex !== firstShipIndex, 'ship select right navigation');
  await page.waitForTimeout(500);
  await tapButton(page, 14);
  const afterLeft = await waitForState(page, (state) => state.shipSelect?.selectedIndex === firstShipIndex, 'ship select left navigation');
  checkpoint('ship-select-navigation', afterLeft, {
    firstShipIndex,
    afterRightIndex: afterRight.shipSelect?.selectedIndex,
    afterLeftIndex: afterLeft.shipSelect?.selectedIndex
  });
  await tapButton(page, 2);
  const details = await waitForState(page, (state) => state.scene === 'shipDetails', 'ship details opened by controller X');
  checkpoint('ship-details-open', details, { screenshot: await screenshot(page, '08-ship-details-open') });
  await tapButton(page, 1);
  await waitForState(page, (state) => state.scene === 'shipSelect', 'ship details closed by controller B');
  await tapButton(page, 0);
  const playStarted = await waitForState(page, (state) => state.scene === 'play' && state.player, 'gameplay launched by controller', 30000);
  checkpoint('gameplay-launched', playStarted, { screenshot: await screenshot(page, '09-gameplay-launched') });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (play) {
      play.introActive = false;
      play.introComplete = true;
    }
    if (game) game.lives = Math.max(game.lives || 0, 3);
    if (player) {
      player.invulnerable = true;
      player.invulnerableTime = 45000;
      player.x = game.getWidth() / 2;
      player.y = game.getHeight() * 0.78;
    }
  });
  const gameplayBefore = await readState(page);
  await setGamepad(page, { axes: [0.85, 0], buttons: [0] });
  await page.waitForTimeout(650);
  const gameplayAfter = await readState(page);
  await setGamepad(page);
  checkpoint('gameplay-move-fire', gameplayAfter, {
    beforeX: gameplayBefore.player?.x,
    afterX: gameplayAfter.player?.x,
    gamepad: gameplayAfter.input?.gamepad,
    screenshot: await screenshot(page, '10-gameplay-move-fire')
  });
  assert(gameplayAfter.input?.gamepad?.connected, 'Gameplay did not report connected controller');
  assert(gameplayAfter.input?.gamepad?.buttons?.firing, 'Gameplay did not report controller firing');
  assert(Math.abs((gameplayAfter.player?.x || 0) - (gameplayBefore.player?.x || 0)) > 2, 'Controller did not move the player');

  await tapButton(page, 9);
  const paused = await waitForState(page, (state) => state.overlays?.pause && state.isPaused, 'pause opened by controller Start');
  checkpoint('pause-open', paused, { screenshot: await screenshot(page, '11-pause-open') });
  await tapButton(page, 13);
  await tapButton(page, 0);
  const pauseSettings = await waitForState(page, (state) => state.overlays?.pause && state.overlays?.settings && state.settingsOverlay?.focus, 'pause settings opened by controller');
  const pauseMasterBefore = pauseSettings.audio?.masterVolume;
  const pauseLanguageFocused = await steerSettingsFocusTo(page, 'language');
  checkpoint('pause-settings-language-focus', pauseLanguageFocused);
  await tapButton(page, 13);
  await tapButton(page, 15);
  const pauseMasterAfter = await waitForState(page, (state) => state.overlays?.settings && state.settingsOverlay?.focus === 'slider_master', 'pause settings slider adjusted');
  checkpoint('pause-settings-slider-adjusted', pauseMasterAfter, {
    pauseMasterBefore,
    pauseMasterAfter: pauseMasterAfter.audio?.masterVolume
  });
  assert(pauseMasterAfter.audio?.masterVolume !== pauseMasterBefore, 'Controller did not adjust pause settings slider');
  await tapButton(page, 1);
  await waitForState(page, (state) => state.overlays?.pause && !state.overlays?.settings, 'pause settings closed with controller');
  await tapButton(page, 1);
  const resumed = await waitForState(page, (state) => state.scene === 'play' && !state.isPaused && !state.overlays?.pause, 'game resumed by controller B');
  checkpoint('pause-resumed', resumed);
  await setGamepad(page, { connected: false });
  const disconnectPaused = await waitForState(page, (state) => state.overlays?.pause && state.isPaused, 'controller disconnect auto-paused gameplay');
  checkpoint('controller-disconnect-paused', disconnectPaused, { screenshot: await screenshot(page, '12-controller-disconnect-paused') });
  await setGamepad(page);
  await tapButton(page, 1);
  await waitForState(page, (state) => state.scene === 'play' && !state.isPaused && !state.overlays?.pause, 'game resumed after controller reconnect');

  await page.evaluate(() => {
    const game = window.__game;
    if (!game) return;
    game.score = 12000;
    game.level = 4;
    game.rankIndex = Math.max(game.rankIndex || 0, 2);
    game.lives = 0;
    game.gameOver();
  });
  const gameOverPrompt = await waitForState(page, (state) => state.scene === 'gameOver', 'game over opened', 10000);
  checkpoint('game-over-open', gameOverPrompt, { screenshot: await screenshot(page, '13-game-over-open') });
  let inputState = await readState(page);
  if (inputState.gameOver?.state !== 'input') {
    await tapButton(page, 0);
  }
  inputState = await waitForState(page, (state) =>
    state.scene === 'gameOver' &&
    state.gameOver?.state === 'input' &&
    state.gameOver?.inputDevice === 'controller' &&
    /^[A-Z0-9]{3}$/.test(state.gameOver?.nameInput || ''),
  'controller initials entry');
  checkpoint('game-over-controller-name-entry', inputState, { screenshot: await screenshot(page, '14-controller-name-entry') });
  await tapButton(page, 13);
  await tapButton(page, 15);
  await tapButton(page, 12);
  const editedName = await readState(page);
  assert(/^[A-Z0-9]{3}$/.test(editedName.gameOver?.nameInput || ''), 'Controller initials picker produced an invalid name');
  await page.evaluate(() => {
    const scene = window.__game?.scenes?.gameOver;
    if (!scene) return;
    scene.globalQualified = false;
    scene.globalStatus = 'offline';
    scene.globalQualificationPromise = Promise.resolve();
    scene.leaderboardAdapter.availability.cloud = false;
    scene.leaderboardAdapter.refreshed = true;
    scene.updateCanEnterName?.();
    scene.updateLeaderboardStatusText?.();
    scene.refreshPrimaryCta?.();
  });
  await tapButton(page, 0);
  const submittedHold = await waitForState(page, (state) =>
    state.scene === 'gameOver' &&
    state.gameOver?.state === 'submitted_hold' &&
    state.gameOver?.submittedHoldReady,
  'score submitted hold from controller initials', 15000);
  checkpoint('game-over-score-submitted-hold', submittedHold, {
    savedName: submittedHold.gameOver?.lastLeaderboardResult?.name,
    screenshot: await screenshot(page, '15-score-submitted')
  });
  assert(submittedHold.gameOver?.lastLeaderboardResult?.name, 'Controller name entry did not save a leaderboard name');

  await tapButton(page, 0);
  const submitted = await waitForState(page, (state) => state.scene === 'gameOver' && state.gameOver?.state === 'runback', 'submitted score continued to runback by controller A', 10000);
  checkpoint('game-over-runback-after-continue', submitted, {
    screenshot: await screenshot(page, '16-runback-after-continue')
  });

  await tapButton(page, 3);
  const highscore = await waitForState(page, (state) => state.scene === 'highscore' && state.highscore?.focusedControl, 'highscores opened by controller Y');
  checkpoint('highscores-open', highscore, { screenshot: await screenshot(page, '17-highscores-open') });
  await tapButton(page, 1);
  const backToMenu = await waitForState(page, (state) => state.scene === 'menu' && state.menu?.focusedOption, 'highscores returned to menu by controller B');
  checkpoint('return-menu', backToMenu, { screenshot: await screenshot(page, '18-return-menu') });

  const report = {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    viewport,
    checkpoints,
    pageErrors,
    consoleErrors,
    outputDir
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[controller-only-flow] PASS output=${outputDir}`);
  }
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  const state = await readState(page).catch(() => null);
  const failure = {
    ok: false,
    error: error.message,
    stack: error.stack,
    checkpoints,
    state,
    pageErrors,
    consoleErrors,
    outputDir
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(failure, null, 2));
  await screenshot(page, 'failure').catch(() => null);
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
