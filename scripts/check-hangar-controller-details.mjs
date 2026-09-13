import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4357));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/hangar-controller-details-${timestamp()}`);
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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
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
    menu: latest?.menu?.focusedOption,
    shipSelect: latest?.shipSelect,
    shipDetails: latest?.shipDetails
  })}`);
}

async function setGamepad(page, { buttons = [], axes = [0, 0], connected = true } = {}) {
  await page.evaluate(({ buttons: pressedButtons, axes: nextAxes, connected: nextConnected }) => {
    const buttonState = Array.from({ length: 17 }, (_, index) => {
      const pressed = pressedButtons.includes(index);
      return { pressed, value: pressed ? 1 : 0 };
    });
    window.__burtGamepadOverride = {
      id: 'hangar-controller-details-test-pad',
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
  await page.waitForTimeout(140);
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
  const order = ['launch', 'hangar', 'highscores', 'threatCodex', 'achievements', 'settings', 'exit', 'music'];
  for (let i = 0; i < 8; i += 1) {
    const state = await readState(page);
    if (state.menu?.focusedOption === optionId) return state;
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

const server = await startDevServer();
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
    menuFocus: state?.menu?.focusedOption || null,
    shipSelect: state?.shipSelect ? {
      selectedIndex: state.shipSelect.selectedIndex,
      spriteKey: state.shipSelect.spriteKey,
      controllerFocus: state.shipSelect.controllerFocus,
      focusedActionButtonId: state.shipSelect.focusedActionButtonId,
      mainMenuButtonFocused: state.shipSelect.mainMenuButtonFocused
    } : null,
    shipDetails: state?.shipDetails ? {
      spriteKey: state.shipDetails.spriteKey,
      focusedButtonId: state.shipDetails.focusedButtonId,
      unlockProvenanceText: state.shipDetails.unlockProvenanceText || null
    } : null,
    ...extra
  });
}

try {
  mkdirSync(outputDir, { recursive: true });
  await page.addInitScript(() => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      unlockedShipIds: ['nova_ship_01', 'nova_ship_02'],
      shipUnlockHistory: {}
    }));
    localStorage.removeItem('burt.shipUnlockProgress.v1');
    localStorage.removeItem('nova.controllerPilotName.v1');
    window.__burtGamepadOverride = {
      id: 'hangar-controller-details-test-pad',
      index: 0,
      connected: true,
      axes: [0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
    };
  });

  await page.goto(withQuery(baseUrl, { skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  const menuInitial = await waitForState(page, (state) => state.scene === 'menu' && state.menu?.focusedOption === 'launchTactical', 'menu Tactical focus', 30000);
  checkpoint('menu-initial', menuInitial);
  await page.evaluate(() => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      unlockedShipIds: ['nova_ship_01', 'nova_ship_02'],
      shipUnlockHistory: {}
    }));
  });

  await steerMenuTo(page, 'hangar');
  await tapButton(page, 0);
  const hangar = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.spriteKey &&
    state.shipSelect?.controllerFocus === 'ship',
  'ship select opened with ship focus');
  checkpoint('ship-select-open', hangar, { screenshot: await screenshot(page, '01-ship-select-open') });

  await page.evaluate(() => window.__game?.currentScene?.navigateTo?.(0));
  const starterFocused = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.selectedIndex === 0 &&
    state.shipSelect?.controllerFocus === 'ship',
  'test setup focused starter ship');
  await page.waitForTimeout(650);
  const initialIndex = starterFocused.shipSelect.selectedIndex;
  await tapButton(page, 15);
  const movedRight = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.selectedIndex !== initialIndex &&
    state.shipSelect?.controllerFocus === 'ship',
  'controller moved to another ship');
  checkpoint('ship-card-moved-right', movedRight);

  await tapButton(page, 13);
  const detailsFocused = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.controllerFocus === 'details' &&
    state.shipSelect?.focusedActionButtonId === 'details' &&
    state.shipSelect?.detailsButton,
  'controller focused visible Details action');
  checkpoint('details-action-focused', detailsFocused, { screenshot: await screenshot(page, '02-details-action-focused') });

  const detailsSprite = detailsFocused.shipSelect.spriteKey;
  await tapButton(page, 0);
  const detailsOpen = await waitForState(page, (state) =>
    state.scene === 'shipDetails' &&
    state.shipDetails?.spriteKey === detailsSprite &&
    /^Unlocked: |^Unlock: /.test(String(state.shipDetails?.unlockProvenanceText || '')),
  'controller A opened Details for focused ship');
  checkpoint('ship-details-opened-by-a', detailsOpen, { screenshot: await screenshot(page, '03-ship-details-opened') });

  await tapButton(page, 1);
  const detailsClosed = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.spriteKey === detailsSprite &&
    state.shipSelect?.controllerFocus === 'ship',
  'controller B closed Details back to predictable ship focus');
  checkpoint('ship-details-closed-by-b', detailsClosed, { screenshot: await screenshot(page, '04-details-closed') });

  await tapButton(page, 15);
  const movedAfterClose = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.selectedIndex !== detailsClosed.shipSelect.selectedIndex &&
    state.shipSelect?.controllerFocus === 'ship',
  'controller moved ships after closing Details');
  checkpoint('ship-card-moved-after-close', movedAfterClose);

  await page.waitForTimeout(500);
  await tapButton(page, 14);
  await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    Number(state.shipSelect?.selectedIndex) < Number(movedAfterClose.shipSelect.selectedIndex) &&
    state.shipSelect?.controllerFocus === 'ship',
  'controller moved back toward unlocked ship');
  for (let step = 0; step < 24; step += 1) {
    const state = await readState(page);
    if (state.scene === 'shipSelect' && state.shipSelect?.selectedIndex === 0) break;
    await page.waitForTimeout(120);
    await tapButton(page, 14);
  }
  const unlockedLaunchTarget = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.selectedIndex === 0 &&
    state.shipSelect?.unlocked === true &&
    state.shipSelect?.controllerFocus === 'ship',
  'controller returned to unlocked ship for equip/start');
  checkpoint('unlocked-ship-focused-for-start', unlockedLaunchTarget);

  await tapButton(page, 13);
  await waitForState(page, (state) => state.shipSelect?.focusedActionButtonId === 'details', 'Details focused again after close');
  await tapButton(page, 15);
  const startFocused = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.controllerFocus === 'start' &&
    state.shipSelect?.focusedActionButtonId === 'start' &&
    state.shipSelect?.startButton,
  'controller cycled action focus to Start');
  checkpoint('start-action-focused', startFocused);

  await tapButton(page, 15);
  const randomFocused = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.controllerFocus === 'random' &&
    state.shipSelect?.focusedActionButtonId === 'random' &&
    state.shipSelect?.randomButton,
  'controller cycled action focus to Random');
  checkpoint('random-action-focused', randomFocused);

  await tapButton(page, 14);
  const startRefocused = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.controllerFocus === 'start' &&
    state.shipSelect?.focusedActionButtonId === 'start',
  'controller cycled action focus back to Start');
  checkpoint('start-action-refocused', startRefocused);

  await tapButton(page, 0);
  const launchModeChoice = await waitForState(page, (state) =>
    state.scene === 'shipSelect' &&
    state.shipSelect?.launchModeChoice?.visible === true &&
    state.shipSelect?.launchModeChoice?.focusedMode === 'ranked_tactical',
  'controller opened Hangar launch mode choice');
  checkpoint('launch-mode-choice-opened', launchModeChoice, { screenshot: await screenshot(page, '05-launch-mode-choice') });
  await tapButton(page, 0);
  const playStarted = await waitForState(page, (state) => state.scene === 'play' && state.player, 'controller equipped/launched selected ship', 30000);
  checkpoint('play-started-from-start-action', playStarted, { screenshot: await screenshot(page, '06-play-started') });

  const report = {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    viewport,
    proof: {
      oldBugWouldFailAt: 'D-pad Down from ship focus must focus Details; A on Details must open ShipDetails instead of launching or leaving Hangar.',
      openedDetailsSprite: detailsSprite,
      closedBackFocus: detailsClosed.shipSelect.controllerFocus,
      launchedFromFocusedAction: startRefocused.shipSelect.focusedActionButtonId,
      launchModeChoice: launchModeChoice.shipSelect.launchModeChoice.focusedMode
    },
    checkpoints,
    pageErrors,
    consoleErrors,
    outputDir
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[hangar-controller-details] PASS output=${outputDir}`);
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
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(failure, null, 2)}\n`, 'utf8');
  await screenshot(page, 'failure').catch(() => null);
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
