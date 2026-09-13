import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { getRunModeNarrationSpec } from '../src/config/RunModeNarration.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4390));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-voice-overlap-${timestamp()}`);

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
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await page.addInitScript(() => {
  window.__fakeAudioPlayLog = [];
  window.__fakeAudioInstances = [];
  class FakeAudio {
    constructor(src = '') {
      this.src = src;
      this.currentTime = 0;
      this.volume = 1;
      this.loop = false;
      this.preload = '';
      this.paused = true;
      this.readyState = 4;
      this._listeners = new Map();
      window.__fakeAudioInstances.push(this);
    }

    addEventListener(type, listener) {
      const listeners = this._listeners.get(type) || [];
      listeners.push(listener);
      this._listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
      const listeners = this._listeners.get(type) || [];
      this._listeners.set(type, listeners.filter((entry) => entry !== listener));
    }

    play() {
      this.paused = false;
      window.__fakeAudioPlayLog.push(this.src);
      return Promise.resolve();
    }

    pause() {
      this.paused = true;
    }

    _emit(type) {
      for (const listener of [...(this._listeners.get(type) || [])]) listener.call(this);
    }

    finish() {
      this.paused = true;
      this._emit('ended');
    }

    load() {}
  }

  window.Audio = FakeAudio;
});

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', { timeout: 30000 });

  const runModeCards = [
    ['tacticalStartBtn', 'launchTactical'],
    ['startBtn', 'launch'],
    ['dailySignalBtn', 'dailySignal'],
    ['scoutRunBtn', 'scout'],
    ['sectorStartBtn', 'sectorStart'],
    ['overrunStartBtn', 'overrun']
  ];
  const finishVoices = async () => page.evaluate(() => {
    for (const audio of window.__fakeAudioInstances || []) {
      if (!audio.loop && !audio.paused) audio.finish?.();
    }
  });
  const pointOut = async (buttonKey) => page.evaluate((key) => {
    window.__game?.currentScene?.[key]?.emit?.('pointerout');
  }, buttonKey);
  const readPlayCount = async () => page.evaluate(() => (
    window.__fakeAudioPlayLog?.filter((src) => (
      String(src).includes('/audio/voice/menu-boss-barks/boss_menu_bark_mode_')
    )).length || 0
  ));
  const captureNarration = async (buttonKey, expectedMenuId, label, variantId = null) => {
    const resolvedVariantId = expectedMenuId === 'overrun' ? (variantId || 'locked') : null;
    const narration = getRunModeNarrationSpec(
      expectedMenuId,
      resolvedVariantId === 'tactical' ? null : resolvedVariantId
    );
    const state = await readState(page);
    return {
      label,
      buttonKey,
      expectedMenuId,
      focusedOption: state.menu?.focusedOption || null,
      inputDevice: state.menu?.inputDevice || null,
      expectedEvent: narration?.event || null,
      expectedText: narration?.transcriptSource || null,
      activeEvent: state.audio?.activeVoiceGroups?.boss_menu_bark?.eventName || null,
      activeVoiceCount: state.audio?.activeVoiceCount || 0,
      dispatch: state.menu?.modeNarration?.lastDispatch || null,
      playCount: await readPlayCount()
    };
  };
  const hoverCard = async (buttonKey, expectedMenuId, label, { finish = true, variantId = null } = {}) => {
    await page.evaluate((key) => {
      window.__game?.currentScene?.[key]?.emit?.('pointerover');
    }, buttonKey);
    await page.waitForTimeout(460);
    const result = await captureNarration(buttonKey, expectedMenuId, label, variantId);
    await pointOut(buttonKey);
    if (finish) await finishVoices();
    await page.waitForTimeout(60);
    return result;
  };
  const runHoverSequence = async (cards, label) => {
    const startPlayCount = await readPlayCount();
    const entries = [];
    for (const [buttonKey, expectedMenuId] of cards) {
      entries.push(await hoverCard(buttonKey, expectedMenuId, label));
    }
    return {
      label,
      startPlayCount,
      endPlayCount: await readPlayCount(),
      entries
    };
  };
  const isCorrectNarration = (entry) => (
    entry.focusedOption === entry.expectedMenuId &&
    entry.activeEvent === entry.expectedEvent &&
    entry.activeVoiceCount === 1 &&
    entry.dispatch?.menuId === entry.expectedMenuId &&
    entry.dispatch?.narrationId === entry.expectedEvent &&
    entry.dispatch?.sourceTranscript === entry.expectedText &&
    entry.dispatch?.played === true
  );

  const forwardSequence = await runHoverSequence(runModeCards, 'forward');
  // Reverse begins on the same card that ended the forward pass, so explicitly
  // clear the documented same-card cooldown before proving re-entry.
  await page.waitForTimeout(3300);
  const reverseSequence = await runHoverSequence([...runModeCards].reverse(), 'reverse');
  const randomCards = [
    runModeCards[2],
    runModeCards[0],
    runModeCards[4],
    runModeCards[1],
    runModeCards[3],
    runModeCards[5]
  ];
  const randomSequence = await runHoverSequence(randomCards, 'random');

  const replacementStartPlayCount = await readPlayCount();
  const replacementFirst = await hoverCard(...runModeCards[0], 'active-replacement-first', { finish: false });
  const replacementSecond = await hoverCard(...runModeCards[2], 'active-replacement-second', { finish: false });
  const activeReplacement = {
    startPlayCount: replacementStartPlayCount,
    endPlayCount: await readPlayCount(),
    first: replacementFirst,
    second: replacementSecond
  };
  await finishVoices();

  const scrubStartPlayCount = await readPlayCount();
  for (let index = 0; index < runModeCards.length; index += 1) {
    const [buttonKey] = runModeCards[index];
    if (index > 0) await pointOut(runModeCards[index - 1][0]);
    await page.evaluate((key) => {
      window.__game?.currentScene?.[key]?.emit?.('pointerover');
    }, buttonKey);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(460);
  const quickScrub = {
    startPlayCount: scrubStartPlayCount,
    endPlayCount: await readPlayCount(),
    final: await captureNarration(...runModeCards[5], 'quick-scrub-final')
  };
  await pointOut(runModeCards[5][0]);
  await finishVoices();

  await page.evaluate(() => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      version: 1,
      bestSector: 30,
      bestLevel: 30,
      totalRuns: 8
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', { timeout: 30000 });
  const unlockedTacticalNarration = await hoverCard(
    'overrunStartBtn',
    'overrun',
    'overrun-unlocked-tactical',
    { variantId: 'tactical' }
  );
  await page.evaluate(() => {
    window.__game.currentScene.overrunRunMode = 'overrun_pure';
  });
  const unlockedPureNarration = await hoverCard(
    'overrunStartBtn',
    'overrun',
    'overrun-unlocked-pure',
    { variantId: 'pure' }
  );

  const reentryStartPlayCount = await readPlayCount();
  const reentryFirst = await hoverCard(...runModeCards[1], 'same-card-first');
  await page.waitForTimeout(3300);
  const reentrySecond = await hoverCard(...runModeCards[1], 'same-card-second', { finish: false });
  const sameCardReentry = {
    startPlayCount: reentryStartPlayCount,
    endPlayCount: await readPlayCount(),
    first: reentryFirst,
    second: reentrySecond
  };

  const movementStartPlayCount = await readPlayCount();
  await page.evaluate((key) => {
    const target = window.__game?.currentScene?.[key];
    target?.emit?.('pointermove', { global: { x: 196, y: 366 } });
    target?.emit?.('pointermove', { global: { x: 214, y: 374 } });
    target?.emit?.('pointermove', { global: { x: 232, y: 382 } });
  }, runModeCards[1][0]);
  await page.waitForTimeout(500);
  const withinCardMovement = {
    startPlayCount: movementStartPlayCount,
    endPlayCount: await readPlayCount(),
    state: await captureNarration(...runModeCards[1], 'within-card-movement')
  };
  await finishVoices();

  await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    scene?.setMenuFocusByButton?.(scene?.dailySignalBtn);
    scene?.setInputDevice?.('keyboard');
  });
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(460);
  const keyboardNavigation = await captureNarration(...runModeCards[3], 'keyboard-arrow-down');
  await finishVoices();

  await page.evaluate(() => {
    window.__burtGamepadOverride = {
      id: 'menu-narration-test-pad',
      index: 0,
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
    };
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.__burtGamepadOverride.buttons[13] = { pressed: true, value: 1 };
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.__burtGamepadOverride.buttons[13] = { pressed: false, value: 0 };
  });
  await page.waitForTimeout(460);
  const controllerNavigation = await captureNarration(...runModeCards[4], 'controller-dpad-down');
  await finishVoices();

  await page.evaluate(() => {
    window.__burtGamepadOverride = null;
  });
  const mouseSwitchFirst = await hoverCard(...runModeCards[3], 'mouse-before-controller', { finish: false });
  await page.evaluate(() => {
    window.__burtGamepadOverride = {
      id: 'menu-narration-test-pad',
      index: 0,
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
    };
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.__burtGamepadOverride.buttons[13] = { pressed: true, value: 1 };
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.__burtGamepadOverride.buttons[13] = { pressed: false, value: 0 };
  });
  await page.waitForTimeout(460);
  const mouseSwitchSecond = await captureNarration(...runModeCards[4], 'controller-after-mouse');
  const mouseToControllerSwitch = {
    first: mouseSwitchFirst,
    second: mouseSwitchSecond
  };
  await finishVoices();
  await page.evaluate(() => {
    window.__burtGamepadOverride = null;
  });

  const before = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    scene.playBossMenuBark('launch', {
      target: scene.startBtn,
      intent: 'focus',
      immediate: true
    });
    return JSON.parse(window.render_game_to_text?.() || '{}');
  });

  const afterClick = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    scene.playBossMenuBark('launch', {
      target: scene.startBtn,
      intent: 'activate',
      force: true
    });
    return JSON.parse(window.render_game_to_text?.() || '{}');
  });

  const afterPendingClick = await page.evaluate(async () => {
    const scene = window.__game?.currentScene;
    scene.playBossMenuBark('settings', {
      target: scene.settingsBtn,
      intent: 'focus'
    });
    const pendingBeforeClick = Boolean(scene.pendingBossMenuBarkTimer);
    scene.playBossMenuBark('settings', {
      target: scene.settingsBtn,
      intent: 'activate',
      force: true
    });
    await new Promise((resolve) => setTimeout(resolve, 520));
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return {
      state,
      pendingBeforeClick,
      pendingAfterDelay: Boolean(scene.pendingBossMenuBarkTimer)
    };
  });

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'menu-voice-overlap.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const launchHandoffBefore = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    scene.playBossMenuBark('launchTactical', {
      target: scene.tacticalStartBtn,
      intent: 'activate',
      immediate: true,
      force: true
    });
    const instances = window.__fakeAudioInstances || [];
    const activeMenuVoiceIndex = instances.findIndex((audio) => (
      !audio.paused && String(audio.src || '').includes('/audio/voice/menu-boss-barks/')
    ));
    return {
      state: JSON.parse(window.render_game_to_text?.() || '{}'),
      activeMenuVoiceIndex
    };
  });
  const started = await page.evaluate(() => window.__game?.startGame?.(undefined, {
    runMode: 'ranked_tactical',
    inputDevice: 'keyboard',
    countShipUsage: false
  }));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 30000 });
  await page.waitForTimeout(650);
  const launchHandoffAfter = await page.evaluate((activeMenuVoiceIndex) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const instances = window.__fakeAudioInstances || [];
    return {
      state,
      menuVoicePaused: activeMenuVoiceIndex >= 0 ? instances[activeMenuVoiceIndex]?.paused === true : false,
      activeMenuAudioCount: instances.filter((audio) => (
        !audio.paused && String(audio.src || '').includes('/audio/voice/menu-boss-barks/')
      )).length
    };
  }, launchHandoffBefore.activeMenuVoiceIndex);
  const launchHandoffScreenshot = path.join(outputDir, 'menu-to-gameplay-voice-handoff.png');
  await page.screenshot({ path: launchHandoffScreenshot, fullPage: true });

  const beforeAudio = before.audio || {};
  const afterClickAudio = afterClick.audio || {};
  const pendingAudio = afterPendingClick.state?.audio || {};
  const report = {
    ok: Boolean(
      [forwardSequence, reverseSequence, randomSequence].every((sequence) => (
        sequence.entries.length === runModeCards.length &&
        sequence.endPlayCount - sequence.startPlayCount === runModeCards.length &&
        sequence.entries.every(isCorrectNarration)
      )) &&
      activeReplacement.endPlayCount - activeReplacement.startPlayCount === 2 &&
      isCorrectNarration(activeReplacement.first) &&
      isCorrectNarration(activeReplacement.second) &&
      activeReplacement.second.activeEvent === getRunModeNarrationSpec('dailySignal')?.event &&
      quickScrub.endPlayCount - quickScrub.startPlayCount === 1 &&
      isCorrectNarration(quickScrub.final) &&
      isCorrectNarration(unlockedTacticalNarration) &&
      unlockedTacticalNarration.expectedEvent === getRunModeNarrationSpec('overrun')?.event &&
      isCorrectNarration(unlockedPureNarration) &&
      unlockedPureNarration.expectedEvent === getRunModeNarrationSpec('overrun', 'pure')?.event &&
      sameCardReentry.endPlayCount - sameCardReentry.startPlayCount === 2 &&
      isCorrectNarration(sameCardReentry.first) &&
      isCorrectNarration(sameCardReentry.second) &&
      withinCardMovement.endPlayCount === withinCardMovement.startPlayCount &&
      isCorrectNarration(withinCardMovement.state) &&
      keyboardNavigation.inputDevice === 'keyboard' &&
      isCorrectNarration(keyboardNavigation) &&
      controllerNavigation.inputDevice === 'controller' &&
      isCorrectNarration(controllerNavigation) &&
      mouseToControllerSwitch.first.inputDevice === 'keyboard' &&
      isCorrectNarration(mouseToControllerSwitch.first) &&
      mouseToControllerSwitch.second.inputDevice === 'controller' &&
      isCorrectNarration(mouseToControllerSwitch.second) &&
      beforeAudio.activeVoiceCount === 1 &&
      beforeAudio.activeVoiceGroups?.boss_menu_bark?.eventName === getRunModeNarrationSpec('launch')?.event &&
      afterClickAudio.activeVoiceCount === 1 &&
      afterClickAudio.activeVoiceGroups?.boss_menu_bark?.eventName === getRunModeNarrationSpec('launch')?.event &&
      afterPendingClick.pendingBeforeClick === true &&
      afterPendingClick.pendingAfterDelay === false &&
      pendingAudio.activeVoiceCount === 1 &&
      pendingAudio.activeVoiceGroups?.boss_menu_bark?.eventName === 'boss_menu_bark_settings' &&
      started === true &&
      launchHandoffBefore.activeMenuVoiceIndex >= 0 &&
      launchHandoffBefore.state?.audio?.activeVoiceGroups?.boss_menu_bark?.eventName === getRunModeNarrationSpec('launchTactical')?.event &&
      launchHandoffAfter.state?.scene === 'play' &&
      launchHandoffAfter.menuVoicePaused === true &&
      launchHandoffAfter.activeMenuAudioCount === 0 &&
      !launchHandoffAfter.state?.audio?.activeVoiceGroups?.boss_menu_bark &&
      (launchHandoffAfter.state?.audio?.activeVoiceCount || 0) <= 1 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    forwardSequence,
    reverseSequence,
    randomSequence,
    activeReplacement,
    quickScrub,
    unlockedTacticalNarration,
    unlockedPureNarration,
    sameCardReentry,
    withinCardMovement,
    keyboardNavigation,
    controllerNavigation,
    mouseToControllerSwitch,
    beforeAudio,
    afterClickAudio,
    afterPendingClick,
    launchHandoff: {
      before: launchHandoffBefore,
      after: launchHandoffAfter,
      screenshot: launchHandoffScreenshot
    },
    pageErrors,
    consoleErrors,
    fakeAudioPlayCount: await page.evaluate(() => window.__fakeAudioPlayLog?.length || 0),
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[menu-voice-overlap] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
