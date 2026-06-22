import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4405);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-exit-focus-safety-${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  if (fs.existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
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
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function clickBounds(page, bounds, label = 'bounds') {
  assert(bounds?.width > 0 && bounds?.height > 0, `cannot click ${label}: ${JSON.stringify(bounds)}`);
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

async function setGamepad(page, { buttons = [], axes = [0, 0], connected = true } = {}) {
  await page.evaluate(({ buttons: pressedButtons, axes: nextAxes, connected: nextConnected }) => {
    window.__burtGamepadOverride = {
      id: 'menu-exit-focus-safety-pad',
      index: 0,
      connected: nextConnected,
      axes: nextAxes,
      buttons: Array.from({ length: 17 }, (_, index) => {
        const pressed = pressedButtons.includes(index);
        return { pressed, value: pressed ? 1 : 0 };
      })
    };
  }, { buttons, axes, connected });
}

async function tapGamepadButton(page, buttonIndex) {
  await setGamepad(page, { buttons: [buttonIndex] });
  await page.waitForTimeout(140);
  await setGamepad(page);
  await page.waitForTimeout(160);
}

async function waitForState(page, predicate, label, timeout = 20000) {
  await page.waitForFunction((predicateSource) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return Function('state', `return (${predicateSource})(state);`)(state);
  }, predicate.toString(), { timeout });
  return readState(page);
}

function assertSourceGuards() {
  const main = fs.readFileSync('electron/main.cjs', 'utf8');
  const preload = fs.readFileSync('electron/preload.cjs', 'utf8');
  const game = fs.readFileSync('src/game/Game.js', 'utf8');
  const highscore = fs.readFileSync('src/scenes/HighscoreScene.js', 'utf8');
  const play = fs.readFileSync('src/scenes/PlayScene.js', 'utf8');
  const settingsOverlay = fs.readFileSync('src/ui/SettingsOverlay.js', 'utf8');
  const menuSettings = fs.readFileSync('src/config/MenuSettings.js', 'utf8');
  assert(!main.includes('dialog.showMessageBox'), 'Electron exit bridge must quit without a native confirmation dialog');
  assert(main.includes('nova-app:window-blur'), 'Electron main must send native window blur to renderer');
  assert(main.includes('browser-window-blur'), 'Electron app blur must also notify the renderer');
  assert(preload.includes('nova-app-window-blur'), 'Preload must dispatch native window blur event');
  assert(game.includes('menuExitGuardUntil') && game.includes('isMenuExitGuardActive'), 'Game must guard menu exit after scene transitions');
  assert(highscore.includes('returnToMenu(') && highscore.includes('armMenuExitGuard'), 'Leaderboard Back must use guarded return-to-menu flow');
  assert(play.includes('native_window_blur'), 'PlayScene must auto-pause on native window blur');
  assert(play.includes('focus_out'), 'PlayScene must auto-pause on renderer focusout');
  assert(settingsOverlay.includes('Confirm Exit') && settingsOverlay.includes('saveMenuSettings'), 'Settings overlay must expose the Confirm Exit toggle');
  assert(menuSettings.includes('CONFIRM_EXIT_KEY') && menuSettings.includes('DEFAULT_MENU_SETTINGS'), 'Confirm Exit must have a persisted default-on settings module');
}

async function runMenuExitChecks(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__novaExitRequests = [];
    Object.defineProperty(window, '__novaApp', {
      configurable: true,
      value: {
        exitGame: async (payload) => {
          window.__novaExitRequests.push(payload || {});
          return { ok: false, canceled: true };
        }
      }
    });
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForState(page, (state) => state.scene === 'menu', 'menu ready');

  let state = await readState(page);
  await clickBounds(page, state.menu?.items?.exitButton, 'top-right Exit Game');
  const afterTopRightExit = await waitForState(page, (next) =>
    next.scene === 'menu' &&
    next.menu?.quitConfirmation?.open === true &&
    next.menu?.quitConfirmation?.defaultFocusIsCancel === true,
  'top-right Exit opens quit confirmation');
  assert(afterTopRightExit.menu.quitConfirmation.focusedLabel === 'CANCEL', `top-right Exit should default modal focus to Cancel: ${JSON.stringify(afterTopRightExit.menu.quitConfirmation)}`);
  assert((await page.evaluate(() => window.__novaExitRequests?.length || 0)) === 0, 'top-right Exit should not request exit before confirmation');

  await page.keyboard.press('Enter');
  await waitForState(page, (next) => next.scene === 'menu' && next.menu?.quitConfirmation?.open === false, 'default-focused Cancel closes quit confirmation after top-right Exit');
  assert((await page.evaluate(() => window.__novaExitRequests?.length || 0)) === 0, 'Cancel should not request exit');

  await page.keyboard.press('Escape');
  await waitForState(page, (next) =>
    next.scene === 'menu' &&
    next.menu?.quitConfirmation?.open === true &&
    next.menu?.quitConfirmation?.defaultFocusIsCancel === true,
  'Esc still opens quit confirmation after top-right Exit then Cancel');
  await page.keyboard.press('Escape');
  await waitForState(page, (next) => next.scene === 'menu' && next.menu?.quitConfirmation?.open === false, 'Esc closes recovered quit confirmation');

  state = await readState(page);
  await clickBounds(page, state.menu?.items?.exitButton, 'top-right Exit Game second pass');
  await waitForState(page, (next) => next.scene === 'menu' && next.menu?.quitConfirmation?.open === true, 'top-right Exit opens quit confirmation second pass');
  await page.keyboard.press('Escape');
  await waitForState(page, (next) => next.scene === 'menu' && next.menu?.quitConfirmation?.open === false, 'Esc closes top-right Exit modal');
  await page.keyboard.press('Escape');
  await waitForState(page, (next) => next.scene === 'menu' && next.menu?.quitConfirmation?.open === true, 'Esc reopens after top-right Exit then Esc close');
  await tapGamepadButton(page, 1);
  await waitForState(page, (next) => next.scene === 'menu' && next.menu?.quitConfirmation?.open === false, 'controller B closes quit confirmation');
  await page.evaluate(() => { window.__burtGamepadOverride = null; });

  state = await readState(page);
  await clickBounds(page, state.menu?.items?.helpButton, 'How To Play after quit cancel');
  await waitForState(page, (next) => next.scene === 'menu' && next.overlays?.howToPlay && Boolean(next.howToPlayOverlay), 'other menu buttons still work after quit modal cancel');
  await page.keyboard.press('Escape');
  await waitForState(page, (next) => next.scene === 'menu' && !next.overlays?.howToPlay, 'How To Play closes before continuing quit tests');

  await page.keyboard.press('Escape');
  const afterMenuEsc = await waitForState(page, (state) =>
    state.scene === 'menu' &&
    state.menu?.quitConfirmation?.open === true &&
    state.menu?.quitConfirmation?.defaultFocusIsCancel === true,
  'menu quit confirmation after escape');
  const firstExitRequests = await page.evaluate(() => window.__novaExitRequests?.length || 0);
  assert(firstExitRequests === 0, `menu ESC should open confirmation before requesting exit (${firstExitRequests} request(s))`);
  assert(afterMenuEsc.menu.quitConfirmation.focusedLabel === 'CANCEL', `quit confirmation should default to Cancel: ${JSON.stringify(afterMenuEsc.menu.quitConfirmation)}`);

  await page.keyboard.press('Escape');
  await waitForState(page, (state) => state.scene === 'menu' && state.menu?.quitConfirmation?.open === false, 'menu quit confirmation closed by escape');
  const afterCancelRequests = await page.evaluate(() => window.__novaExitRequests?.length || 0);
  assert(afterCancelRequests === 0, `closing quit confirmation should not request exit (${afterCancelRequests} request(s))`);

  await page.keyboard.press('Escape');
  await waitForState(page, (state) => state.scene === 'menu' && state.menu?.quitConfirmation?.open === true, 'menu quit confirmation reopened');
  await page.keyboard.press('ArrowRight');
  await waitForState(page, (state) => state.menu?.quitConfirmation?.focusedLabel === 'EXIT GAME', 'quit confirmation exit focused');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__novaExitRequests?.length === 1, null, { timeout: 10000 });
  const firstExitPayload = await page.evaluate(() => window.__novaExitRequests[0]);
  assert(!firstExitPayload.message && !firstExitPayload.title, `confirmed menu exit should not pass native dialog copy: ${JSON.stringify(firstExitPayload)}`);
  await waitForState(page, (state) => state.scene === 'menu', 'menu after confirmed browser exit fallback');

  await page.evaluate(() => {
    window.__novaExitRequests = [];
    window.localStorage?.setItem?.('nova_confirm_exit_v1', '0');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  const instantMenu = await waitForState(page, (state) =>
    state.scene === 'menu' &&
    state.menu?.quitConfirmation?.confirmExit === false,
  'Confirm Exit Off persisted after reload');
  assert(instantMenu.menu.quitConfirmation.open === false, 'Confirm Exit Off should not start with a stale modal open');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__novaExitRequests?.length === 1, null, { timeout: 10000 });
  const instantEscState = await readState(page);
  assert(instantEscState.menu?.quitConfirmation?.open === false, `Confirm Exit Off Esc should not open modal: ${JSON.stringify(instantEscState.menu?.quitConfirmation)}`);
  const instantEscPayload = await page.evaluate(() => window.__novaExitRequests[0]);
  assert(!instantEscPayload.message && !instantEscPayload.title, `instant Esc exit should not pass native dialog copy: ${JSON.stringify(instantEscPayload)}`);

  await page.evaluate(() => { window.__novaExitRequests = []; });
  state = await readState(page);
  await clickBounds(page, state.menu?.items?.exitButton, 'top-right Exit Game with Confirm Exit Off');
  await page.waitForFunction(() => window.__novaExitRequests?.length === 1, null, { timeout: 10000 });
  const instantClickState = await readState(page);
  assert(instantClickState.menu?.quitConfirmation?.open === false, 'Confirm Exit Off top-right Exit should not open modal');

  await page.evaluate(() => {
    window.__novaExitRequests = [];
    window.localStorage?.setItem?.('nova_confirm_exit_v1', '1');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForState(page, (state) =>
    state.scene === 'menu' &&
    state.menu?.quitConfirmation?.confirmExit === true,
  'Confirm Exit On restored after reload');

  await page.evaluate(() => { window.__novaExitRequests = []; });
  await page.evaluate(() => {
    window.__game?.showHighscores?.();
  });
  await waitForState(
    page,
    (state) => state.scene === 'highscore' && Boolean(state.highscore?.focusedControl),
    'highscore controls ready'
  );
  await page.keyboard.press('Escape');
  await waitForState(page, (state) => state.scene === 'menu', 'menu after highscore escape');
  await page.waitForTimeout(300);
  const leakedExitRequests = await page.evaluate(() => window.__novaExitRequests?.length || 0);
  assert(leakedExitRequests === 0, `leaderboard Escape leaked into menu exit (${leakedExitRequests} exit request(s))`);

  await page.screenshot({ path: path.join(outputDir, 'menu-after-leaderboard-escape.png'), fullPage: true });
  await page.evaluate(() => { window.__novaExitRequests = []; });

  await page.evaluate(() => {
    window.__game?.showHighscores?.();
  });
  await waitForState(
    page,
    (state) => state.scene === 'highscore' && Boolean(state.highscore?.focusedControl),
    'highscore controls ready for pointer back'
  );
  await page.evaluate(() => {
    const scene = window.__game?.scenes?.highscore;
    scene?.setLeaderboardView?.('sector');
    scene?.setLeaderboardView?.('global');
  });
  const backBounds = await page.evaluate(() => {
    const bounds = window.__game?.scenes?.highscore?.backBtn?.getBounds?.();
    return bounds
      ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      : null;
  });
  assert(backBounds && backBounds.width > 0 && backBounds.height > 0, `leaderboard Back bounds unavailable: ${JSON.stringify(backBounds)}`);
  await page.mouse.click(backBounds.x + backBounds.width / 2, backBounds.y + backBounds.height / 2);
  await waitForState(page, (state) => state.scene === 'menu', 'menu after highscore pointer back');
  await page.waitForTimeout(120);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const guardedExitRequests = await page.evaluate(() => window.__novaExitRequests?.length || 0);
  assert(guardedExitRequests === 0, `leaderboard pointer Back carried into menu exit (${guardedExitRequests} exit request(s))`);
  const afterGuardedEscape = await readState(page);
  if (afterGuardedEscape.menu?.quitConfirmation?.open) {
    assert(afterGuardedEscape.menu.quitConfirmation.defaultFocusIsCancel, `leaderboard pointer Back should only open a cancel-focused quit modal: ${JSON.stringify(afterGuardedEscape.menu.quitConfirmation)}`);
    await page.keyboard.press('Escape');
    await waitForState(page, (state) => state.scene === 'menu' && state.menu?.quitConfirmation?.open === false, 'guarded quit confirmation closed');
  }

  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  const guardedReleaseModal = await waitForState(page, (state) =>
    state.scene === 'menu' &&
    state.menu?.quitConfirmation?.open === true &&
    state.menu?.quitConfirmation?.defaultFocusIsCancel === true,
  'menu quit confirmation after guard release');
  const guardedReleaseRequests = await page.evaluate(() => window.__novaExitRequests?.length || 0);
  assert(guardedReleaseRequests === 0, `menu exit should recover after guard by opening confirmation first (${guardedReleaseRequests} request(s))`);

  await page.screenshot({ path: path.join(outputDir, 'menu-after-leaderboard-pointer-back.png'), fullPage: true });
  assert(pageErrors.length === 0, `menu page errors: ${pageErrors.join('; ')}`);
  await page.close();
  return { firstExitPayload, leakedExitRequests, guardedExitRequests, guardedReleaseModal };
}

async function runFocusPauseCheck(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage?.setItem?.('nova_confirm_exit_v1', '0');
    window.__novaExitRequests = [];
    Object.defineProperty(window, '__novaApp', {
      configurable: true,
      value: {
        exitGame: async (payload) => {
          window.__novaExitRequests.push(payload || {});
          return { ok: false, canceled: true };
        }
      }
    });
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForState(page, (state) => state.scene === 'play' && !state.isPaused, 'active gameplay');
  await page.keyboard.press('Escape');
  const gameplayEscapePause = await waitForState(page, (state) => state.scene === 'play' && state.isPaused && state.overlays?.pause, 'gameplay Escape still pauses with Confirm Exit Off');
  const gameplayEscapeExitRequests = await page.evaluate(() => window.__novaExitRequests?.length || 0);
  assert(gameplayEscapeExitRequests === 0, `gameplay Escape must not request immediate desktop exit when Confirm Exit is Off (${gameplayEscapeExitRequests} request(s))`);
  assert(gameplayEscapePause.isPaused === true, 'gameplay Escape should pause before focus checks');
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play?.setPaused?.(false);
  });
  await waitForState(page, (state) => state.scene === 'play' && !state.isPaused && !state.overlays?.pause, 'gameplay resumed after Escape pause');
  await page.evaluate(() => window.dispatchEvent(new Event('nova-app-window-blur')));
  const paused = await waitForState(page, (state) => state.scene === 'play' && state.isPaused && state.overlays?.pause, 'native blur pause');
  await page.screenshot({ path: path.join(outputDir, 'native-blur-pause.png'), fullPage: true });
  assert(paused.isPaused === true && paused.overlays?.pause === true, `native blur did not pause gameplay: ${JSON.stringify(paused)}`);

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    play?.setPaused?.(false);
    if (game) {
      game.score = 70540;
      game.level = 11;
    }
  });
  await waitForState(page, (state) => state.scene === 'play' && !state.isPaused && !state.overlays?.pause, 'gameplay resumed after first pause');
  await page.evaluate(() => window.dispatchEvent(new Event('nova-app-window-blur')));
  const refreshedPause = await waitForState(page, (state) =>
    state.scene === 'play' &&
    state.isPaused &&
    state.overlays?.pause &&
    state.pauseOverlay?.score === '70,540' &&
    state.pauseOverlay?.sector === '11',
  'pause stats refreshed after reopening');
  assert(refreshedPause.pauseOverlay?.score === '70,540', `pause score did not refresh: ${JSON.stringify(refreshedPause.pauseOverlay)}`);
  assert(refreshedPause.pauseOverlay?.sector === '11', `pause sector did not refresh: ${JSON.stringify(refreshedPause.pauseOverlay)}`);
  assert(pageErrors.length === 0, `focus page errors: ${pageErrors.join('; ')}`);
  await page.close();
  return {
    scene: paused.scene,
    paused: paused.isPaused,
    overlay: paused.overlays?.pause,
    refreshedStats: refreshedPause.pauseOverlay
  };
}

assertSourceGuards();
const server = await startDevServer();
console.log(`[menu-exit-focus-safety] dev ready ${baseUrl}`);
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const report = {
    status: 'passed',
    baseUrl,
    outputDir,
    menuExit: await runMenuExitChecks(browser),
    focusPause: await runFocusPauseCheck(browser)
  };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[menu-exit-focus-safety] PASS ${JSON.stringify(report)}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
