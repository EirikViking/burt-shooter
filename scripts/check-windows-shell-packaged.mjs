import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { _electron as electron } from 'playwright';

const executablePath = path.resolve(process.env.NOVA_SWARM_PACKAGED_EXE || 'release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(process.env.NOVA_WINDOWS_SHELL_OUTPUT_DIR || `test-results/windows-shell-${stamp()}`);
const profile = path.join(outputDir, 'profile');
const report = { executablePath, outputDir, modes: {}, focusCycles: [], screenshots: {} };

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function cursorState(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game-container canvas, canvas');
    return {
      scene: window.__game?.currentSceneName || null,
      helper: JSON.parse(window.render_game_to_text?.() || '{}').cursor || null,
      canvas: canvas ? getComputedStyle(canvas).cursor : null,
      html: getComputedStyle(document.documentElement).cursor,
      body: getComputedStyle(document.body).cursor
    };
  });
}

async function nativeState(app) {
  return app.evaluate(({ BrowserWindow, Menu, screen }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const bounds = window.getBounds();
    const display = screen.getDisplayMatching(bounds);
    return {
      bounds,
      displayBounds: display.bounds,
      displayId: String(display.id),
      scaleFactor: display.scaleFactor,
      fullScreen: window.isFullScreen(),
      focused: window.isFocused(),
      menuRemoved: Menu.getApplicationMenu() === null,
      menuBarVisible: window.isMenuBarVisible?.() ?? false,
      alwaysOnTop: window.isAlwaysOnTop?.() ?? false
    };
  });
}

async function applyMode(page, mode, windowSize = { width: 1280, height: 720 }) {
  const result = await page.evaluate(async ({ mode, windowSize }) => {
    localStorage.setItem('nova_display_mode_v1', mode);
    localStorage.setItem('nova_display_window_size_v1', JSON.stringify(windowSize));
    localStorage.setItem('nova_ui_scale_v1', '1');
    const native = await window.__novaDisplay.applySettings({ mode, windowSize, uiScale: 1 });
    await window.__novaSteamCloudDiagnostics?.sync?.();
    return native;
  }, { mode, windowSize });
  assert.equal(result.ok, true, `${mode} apply failed: ${JSON.stringify(result)}`);
  await page.waitForTimeout(700);
  return result;
}

if (!existsSync(executablePath)) throw new Error(`Packaged executable is missing: ${executablePath}`);
mkdirSync(profile, { recursive: true });

const app = await electron.launch({
  executablePath,
  args: ['--nova-fresh-profile', '--windowed'],
  cwd: path.dirname(executablePath),
  env: {
    ...process.env,
    NOVA_SWARM_USER_DATA_DIR: profile,
    NOVA_SWARM_FRESH_PROFILE: '1',
    NOVA_SWARM_WINDOWED: '1',
    NOVA_SWARM_DISABLE_STEAMWORKS: '1'
  },
  timeout: 120000
});

try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu' && document.body?.dataset?.menuReady === '1', null, { timeout: 120000 });

  for (const mode of ['windowed', 'fullscreen', 'borderless']) {
    await applyMode(page, mode);
    await page.keyboard.press('Alt');
    const state = await nativeState(app);
    report.modes[mode] = state;
    assert.equal(state.menuRemoved, true, `${mode}: native application menu remains installed`);
    assert.equal(state.menuBarVisible, false, `${mode}: Alt exposed the native menu bar`);
    assert.equal(state.alwaysOnTop, false, `${mode}: window must not be always-on-top`);
    if (mode === 'windowed') {
      assert.equal(state.fullScreen, false, 'windowed mode remained fullscreen');
    } else {
      assert.equal(state.fullScreen, true, `${mode}: native fullscreen was not active`);
      assert.deepEqual(state.bounds, state.displayBounds, `${mode}: window does not cover the selected monitor bounds`);
    }
    const screenshotPath = path.join(outputDir, `${mode}.png`);
    await page.screenshot({ path: screenshotPath });
    report.screenshots[mode] = screenshotPath;
  }

  await applyMode(page, 'windowed');
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const bounds = window.getBounds();
    window.setBounds({ x: bounds.x + 37, y: bounds.y + 29, width: 1280, height: 720 });
  });
  const positioned = await nativeState(app);
  await applyMode(page, 'borderless');
  await applyMode(page, 'windowed');
  const restored = await nativeState(app);
  assert.deepEqual(restored.bounds, positioned.bounds, 'windowed bounds were not restored after borderless mode');
  report.windowedRoundTrip = { positioned, restored };

  await page.evaluate(async () => window.__game.startGame(window.__game.selectedShipSpriteKey));
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play', null, { timeout: 120000 });
  const gameplayInitial = await cursorState(page);
  assert.equal(gameplayInitial.helper?.hidden, true, 'gameplay cursor helper is not hidden before focus cycle');
  assert.equal(gameplayInitial.canvas, 'none', 'gameplay cursor is visible before focus cycle');

  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('nova-app:window-blur'));
    await page.waitForTimeout(200);
    const pausedState = await cursorState(page);
    assert.equal(pausedState.helper?.hidden, false, `focus cycle ${cycle}: interruption pause should keep the menu cursor visible`);
    assert.notEqual(pausedState.canvas, 'none', `focus cycle ${cycle}: interruption pause cursor is hidden`);
    await page.evaluate(() => {
      window.__game.scenes.play.setPaused(false);
      document.documentElement.classList.remove('gameplay-cursor-hidden');
      document.body.classList.remove('gameplay-cursor-hidden');
    });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('nova-app:window-focus'));
    await page.waitForTimeout(200);
    const resumedState = await cursorState(page);
    assert.equal(resumedState.helper?.hidden, true, `focus cycle ${cycle}: gameplay cursor policy was not restored after resume`);
    assert.equal(resumedState.canvas, 'none', `focus cycle ${cycle}: canvas cursor remained visible after resume`);
    report.focusCycles.push({ paused: pausedState, resumed: resumedState });
  }

  await page.evaluate(() => window.__game.scenes.play.setPaused(true));
  await page.waitForTimeout(200);
  const paused = await cursorState(page);
  assert.equal(paused.helper?.hidden, false, 'pause menu cursor should remain visible');
  assert.notEqual(paused.canvas, 'none', 'pause menu canvas cursor should remain visible');
  report.cursor = { gameplayInitial, paused };
  report.preRelaunchStorage = await page.evaluate(() => ({
    mode: localStorage.getItem('nova_display_mode_v1'),
    windowSize: localStorage.getItem('nova_display_window_size_v1'),
    uiScale: localStorage.getItem('nova_ui_scale_v1')
  }));
  await page.waitForTimeout(1500);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error?.stack || error?.message || String(error);
  throw error;
} finally {
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await app.close();
}

const relaunchedApp = await electron.launch({
  executablePath,
  args: ['--nova-fresh-profile'],
  cwd: path.dirname(executablePath),
  env: {
    ...process.env,
    NOVA_SWARM_USER_DATA_DIR: profile,
    NOVA_SWARM_FRESH_PROFILE: '1',
    NOVA_SWARM_DISABLE_STEAMWORKS: '1'
  },
  timeout: 120000
});

try {
  const relaunchedPage = await relaunchedApp.firstWindow();
  await relaunchedPage.waitForFunction(() => window.__game?.currentSceneName === 'menu' && document.body?.dataset?.menuReady === '1', null, { timeout: 120000 });
  await relaunchedPage.waitForTimeout(500);
  const relaunched = await nativeState(relaunchedApp);
  report.relaunchStorage = await relaunchedPage.evaluate(() => ({
    mode: localStorage.getItem('nova_display_mode_v1'),
    windowSize: localStorage.getItem('nova_display_window_size_v1'),
    uiScale: localStorage.getItem('nova_ui_scale_v1')
  }));
  assert.equal(relaunched.fullScreen, false, 'relaunch did not preserve windowed mode');
  assert.deepEqual(relaunched.bounds, report.windowedRoundTrip.restored.bounds, 'relaunch did not preserve the restored windowed bounds');
  assert.equal(relaunched.menuRemoved, true, 'relaunch restored the native application menu');
  assert.equal(relaunched.alwaysOnTop, false, 'relaunch enabled always-on-top');
  report.relaunch = relaunched;
  console.log(`[windows-shell-packaged] PASS report=${path.join(outputDir, 'report.json')}`);
} finally {
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await relaunchedApp.close();
}
