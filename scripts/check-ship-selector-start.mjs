import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4342));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ship-selector-start-${timestamp()}`);

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

async function showShipSelect(page) {
  await page.evaluate(async () => {
    const matureProgress = { bestScore: 150000, bestRank: 19, bestLevel: 60, bestSector: 60, pilotRank: 19 };
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify(matureProgress));
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(matureProgress));
    await window.__game?.showShipSelect?.();
  });
  try {
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'shipSelect'
        && state.shipSelect?.backButton?.width > 0
        && state.shipSelect?.startButton?.width > 0;
    }, null, { timeout: 12000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      game: JSON.parse(window.render_game_to_text?.() || '{}'),
      href: window.location.href,
      gameScene: window.__game?.currentSceneName || null
    }));
    throw new Error(`Ship selector failed readiness: ${JSON.stringify(state)}`, { cause: error });
  }
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.showShipSelect), { timeout: 30000 });

  const beforeMenuButton = await showShipSelect(page);
  mkdirSync(outputDir, { recursive: true });
  const hangarToursScreenshot = path.join(outputDir, 'hangar-tours.png');
  await page.screenshot({ path: hangarToursScreenshot, fullPage: true });
  const menuTarget = beforeMenuButton.shipSelect.backButton;
  await page.mouse.move(menuTarget.x + menuTarget.width / 2, menuTarget.y + menuTarget.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(120);
  const afterOrphanRelease = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  await page.mouse.click(menuTarget.x + menuTarget.width / 2, menuTarget.y + menuTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.hangarMenu?.visible === true, { timeout: 10000 });
  const afterMenuButton = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const exitTarget = afterMenuButton.shipSelect.hangarMenu.buttons.exitGame;
  await page.mouse.click(exitTarget.x + exitTarget.width / 2, exitTarget.y + exitTarget.height / 2);
  await page.waitForTimeout(350);
  const afterExitFallback = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const resumeTarget = afterExitFallback.shipSelect.hangarMenu.buttons.resume;
  await page.mouse.click(resumeTarget.x + resumeTarget.width / 2, resumeTarget.y + resumeTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.hangarMenu?.visible === false, { timeout: 10000 });
  const afterResume = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const beforeKeyboardMenu = await showShipSelect(page);
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.hangarMenu?.mainMenuFocused === true, { timeout: 10000 });
  const afterTabFocus = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.hangarMenu?.visible === true, { timeout: 10000 });
  const afterKeyboardMenu = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.hangarMenu?.visible === false, { timeout: 10000 });
  const afterKeyboardResume = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const beforeEscapeMenu = await showShipSelect(page);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.hangarMenu?.visible === true, { timeout: 10000 });
  const afterEscapeMenu = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const mainMenuTarget = afterEscapeMenu.shipSelect.hangarMenu.buttons.mainMenu;
  await page.mouse.click(mainMenuTarget.x + mainMenuTarget.width / 2, mainMenuTarget.y + mainMenuTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', { timeout: 10000 });
  const afterMainMenu = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const beforeClick = await showShipSelect(page);
  const clickTarget = beforeClick.shipSelect.startButton;
  await page.mouse.click(clickTarget.x + clickTarget.width / 2, clickTarget.y + clickTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.launchModeChoice?.visible === true, { timeout: 10000 });
  const mouseModeChoice = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const modeChoiceScreenshot = path.join(outputDir, 'hangar-launch-mode-choice.png');
  await page.screenshot({ path: modeChoiceScreenshot, fullPage: true });
  const pureTarget = mouseModeChoice.shipSelect.launchModeChoice.modes.ranked.bounds;
  await page.mouse.click(pureTarget.x + pureTarget.width / 2, pureTarget.y + pureTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', { timeout: 10000 });
  const afterClick = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const beforeKeyboard = await showShipSelect(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.launchModeChoice?.visible === true, { timeout: 10000 });
  const keyboardModeChoice = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', { timeout: 10000 });
  const afterKeyboard = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const detailsShipKey = beforeKeyboard.shipSelect.spriteKey;
  await page.evaluate(async (spriteKey) => {
    await window.__game?.showShipDetails?.(spriteKey);
  }, detailsShipKey);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'shipDetails', { timeout: 10000 });
  const beforeDetailsStart = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  await page.evaluate(() => window.__game?.currentScene?.startGame?.());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipDetails?.launchModeChoice?.visible === true, { timeout: 10000 });
  const detailsModeChoice = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', { timeout: 10000 });
  const afterDetailsStart = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));

  const additionalModes = [
    'daily_signal',
    'scout',
    'sector_start',
    'overrun_tactical',
    'overrun_pure'
  ];
  const additionalLaunches = {};
  for (const mode of additionalModes) {
    const before = await showShipSelect(page);
    const start = before.shipSelect.startButton;
    await page.mouse.click(start.x + start.width / 2, start.y + start.height / 2);
    await page.waitForFunction((targetMode) => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.shipSelect?.launchModeChoice?.modes?.[targetMode]?.enabled === true;
    }, mode, { timeout: 10000 });
    const choice = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
    const target = choice.shipSelect.launchModeChoice.modes[mode];
    await page.mouse.click(target.bounds.x + target.bounds.width / 2, target.bounds.y + target.bounds.height / 2);
    await page.waitForFunction((targetMode) => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && state.runMode === targetMode;
    }, mode, { timeout: 15000 });
    const launched = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
    additionalLaunches[mode] = {
      selectedShipBefore: before.shipSelect.spriteKey,
      launchChoice: target,
      runMode: launched.runMode,
      selectedShipSpriteKey: launched.selectedShipSpriteKey,
      scoutAnomalyId: launched.scoutAnomaly?.id || null,
      sectorStartCheckpoint: launched.sectorStartChallenge?.checkpoint || null
    };
  }

  const screenshot = path.join(outputDir, 'ship-selector-start.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: Boolean(
      beforeMenuButton.shipSelect?.backButton?.width > 0 &&
      afterOrphanRelease.shipSelect?.hangarMenu?.visible === false &&
      afterMenuButton.scene === 'shipSelect' &&
      afterMenuButton.shipSelect?.hangarMenu?.visible === true &&
      afterExitFallback.shipSelect?.hangarMenu?.visible === true &&
      !/DESKTOP BUILD/.test(afterExitFallback.shipSelect?.hangarMenu?.notice || '') &&
      afterResume.scene === 'shipSelect' &&
      afterResume.shipSelect?.hangarMenu?.visible === false &&
      beforeKeyboardMenu.shipSelect?.backButton?.width > 0 &&
      afterTabFocus.shipSelect?.hangarMenu?.mainMenuFocused === true &&
      afterKeyboardMenu.shipSelect?.hangarMenu?.visible === true &&
      afterKeyboardResume.scene === 'shipSelect' &&
      afterKeyboardResume.shipSelect?.hangarMenu?.visible === false &&
      beforeEscapeMenu.shipSelect?.backButton?.width > 0 &&
      afterEscapeMenu.scene === 'shipSelect' &&
      afterEscapeMenu.shipSelect?.hangarMenu?.visible === true &&
      afterMainMenu.scene === 'menu' &&
      beforeClick.shipSelect?.spriteKey &&
      mouseModeChoice.shipSelect?.launchModeChoice?.focusedMode === 'ranked_tactical' &&
      Object.keys(mouseModeChoice.shipSelect?.launchModeChoice?.modes || {}).length === 7 &&
      Object.values(mouseModeChoice.shipSelect?.launchModeChoice?.modes || {}).every((entry) => entry?.bounds?.width > 0) &&
      mouseModeChoice.shipSelect?.launchModeChoice?.modes?.ranked?.bounds?.width > 0 &&
      afterClick.scene === 'play' &&
      afterClick.selectedShipSpriteKey === beforeClick.shipSelect.spriteKey &&
      afterClick.runMode === 'ranked' &&
      beforeKeyboard.shipSelect?.spriteKey &&
      keyboardModeChoice.shipSelect?.launchModeChoice?.focusedMode === 'ranked_tactical' &&
      afterKeyboard.scene === 'play' &&
      afterKeyboard.selectedShipSpriteKey === beforeKeyboard.shipSelect.spriteKey &&
      afterKeyboard.runMode === 'ranked_tactical' &&
      afterKeyboard.score === 0 &&
      afterKeyboard.lives === 3 &&
      beforeDetailsStart.scene === 'shipDetails' &&
      beforeDetailsStart.shipDetails?.spriteKey === detailsShipKey &&
      detailsModeChoice.shipDetails?.launchModeChoice?.focusedMode === 'ranked_tactical' &&
      afterDetailsStart.scene === 'play' &&
      afterDetailsStart.selectedShipSpriteKey === detailsShipKey &&
      afterDetailsStart.runMode === 'ranked' &&
      additionalLaunches.daily_signal?.selectedShipSpriteKey === additionalLaunches.daily_signal?.launchChoice?.launchShipKey &&
      additionalLaunches.scout?.selectedShipSpriteKey === additionalLaunches.scout?.selectedShipBefore &&
      additionalLaunches.scout?.scoutAnomalyId === additionalLaunches.scout?.launchChoice?.scoutAnomalyId &&
      additionalLaunches.sector_start?.selectedShipSpriteKey === additionalLaunches.sector_start?.selectedShipBefore &&
      additionalLaunches.sector_start?.sectorStartCheckpoint === additionalLaunches.sector_start?.launchChoice?.startSector &&
      additionalLaunches.overrun_tactical?.selectedShipSpriteKey === additionalLaunches.overrun_tactical?.selectedShipBefore &&
      additionalLaunches.overrun_pure?.selectedShipSpriteKey === additionalLaunches.overrun_pure?.selectedShipBefore &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    beforeMenuButton: beforeMenuButton.shipSelect,
    afterOrphanRelease: afterOrphanRelease.shipSelect?.hangarMenu,
    afterMenuButton: afterMenuButton.shipSelect,
    afterExitFallback: afterExitFallback.shipSelect?.hangarMenu,
    afterResume: afterResume.shipSelect?.hangarMenu,
    beforeKeyboardMenu: beforeKeyboardMenu.shipSelect,
    afterTabFocus: afterTabFocus.shipSelect?.hangarMenu,
    afterKeyboardMenu: afterKeyboardMenu.shipSelect?.hangarMenu,
    afterKeyboardResume: afterKeyboardResume.shipSelect?.hangarMenu,
    beforeEscapeMenu: beforeEscapeMenu.shipSelect,
    afterEscapeMenu: afterEscapeMenu.shipSelect?.hangarMenu,
    afterMainMenu: {
      scene: afterMainMenu.scene
    },
    beforeClick: beforeClick.shipSelect,
    mouseModeChoice: mouseModeChoice.shipSelect?.launchModeChoice,
    keyboardModeChoice: keyboardModeChoice.shipSelect?.launchModeChoice,
    afterClick: {
      scene: afterClick.scene,
      selectedShipSpriteKey: afterClick.selectedShipSpriteKey,
      runMode: afterClick.runMode,
      score: afterClick.score,
      lives: afterClick.lives
    },
    beforeKeyboard: beforeKeyboard.shipSelect,
    afterKeyboard: {
      scene: afterKeyboard.scene,
      selectedShipSpriteKey: afterKeyboard.selectedShipSpriteKey,
      runMode: afterKeyboard.runMode,
      score: afterKeyboard.score,
      lives: afterKeyboard.lives
    },
    beforeDetailsStart: beforeDetailsStart.shipDetails,
    detailsModeChoice: detailsModeChoice.shipDetails?.launchModeChoice,
    additionalLaunches,
    afterDetailsStart: {
      scene: afterDetailsStart.scene,
      selectedShipSpriteKey: afterDetailsStart.selectedShipSpriteKey,
      runMode: afterDetailsStart.runMode,
      score: afterDetailsStart.score,
      lives: afterDetailsStart.lives
    },
    pageErrors,
    consoleErrors,
    screenshot,
    modeChoiceScreenshot,
    hangarToursScreenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[ship-selector-start] PASS modeChoice=${mouseModeChoice.shipSelect.launchModeChoice.focusedMode} mouse=${afterClick.selectedShipSpriteKey}:${afterClick.runMode} keyboard=${afterKeyboard.selectedShipSpriteKey}:${afterKeyboard.runMode} details=${afterDetailsStart.selectedShipSpriteKey}:${afterDetailsStart.runMode} screenshot=${modeChoiceScreenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
