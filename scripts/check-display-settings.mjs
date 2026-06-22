import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  applyDisplaySettings,
  getDisplayOptions,
  getDisplaySettings,
  resetDisplaySettings,
  saveDisplaySettings
} from '../src/config/DisplaySettings.js';
import {
  CONFIRM_EXIT_KEY,
  getMenuSettings,
  saveMenuSettings
} from '../src/config/MenuSettings.js';
import { translateTextForLocale } from '../src/i18n/index.js';

const require = createRequire(import.meta.url);
const {
  applyDisplaySettingsToWindow,
  getDisplayInfo,
  readDisplaySettings,
  sanitizeDisplaySettings,
  writeDisplaySettings
} = require('../electron/displaySettings.cjs');

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries);
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

function installBrowserGlobals(storage = new MemoryStorage()) {
  global.window = {
    localStorage: storage,
    innerWidth: 1440,
    innerHeight: 810,
    screen: { width: 2560, height: 1440 },
    __novaSteamCloudDiagnostics: { sync: async () => ({ ok: true }) }
  };
  global.document = {
    fullscreenElement: null,
    documentElement: {
      async requestFullscreen() {
        global.document.fullscreenElement = global.document.documentElement;
      }
    },
    async exitFullscreen() {
      global.document.fullscreenElement = null;
    }
  };
  return storage;
}

function checkRendererDefaultsAndPersistence() {
  const storage = installBrowserGlobals();
  assert.deepEqual(getDisplaySettings({ storage }), {
    mode: 'fullscreen',
    windowSize: { width: 1280, height: 720 },
    uiScale: 1
  });

  const savedMode = saveDisplaySettings({
    mode: 'windowed',
    windowSize: { width: 1600, height: 900 },
    uiScale: 1.5
  }, { storage });
  assert.deepEqual(savedMode, {
    mode: 'windowed',
    windowSize: { width: 1600, height: 900 },
    uiScale: 1.5
  });
  assert.deepEqual(getDisplaySettings({ storage }), savedMode);

  const reset = resetDisplaySettings({ storage });
  assert.equal(reset.mode, 'fullscreen');
  assert.deepEqual(reset.windowSize, { width: 1280, height: 720 });
  assert.equal(reset.uiScale, 1);

  assert.deepEqual(getMenuSettings({ storage }), { confirmExit: true });
  const savedMenu = saveMenuSettings({ confirmExit: false }, { storage });
  assert.deepEqual(savedMenu, { confirmExit: false });
  assert.equal(storage.getItem(CONFIRM_EXIT_KEY), '0');
  assert.deepEqual(getMenuSettings({ storage }), { confirmExit: false });
}

async function checkElectronBridgeApply() {
  const storage = installBrowserGlobals();
  let applied = null;
  global.window.__novaDisplay = {
    getInfo: async () => ({
      modes: [
        { id: 'fullscreen', supported: true },
        { id: 'windowed', supported: true },
        { id: 'borderless', supported: true }
      ],
      sizes: [
        { width: 2560, height: 1440, label: 'Native 2560 x 1440' },
        { width: 1600, height: 900, label: '1600 x 900' }
      ],
      display: { width: 2560, height: 1440 }
    }),
    applySettings: async (payload) => {
      applied = payload;
      return { ok: true, settings: payload };
    }
  };

  const options = await getDisplayOptions();
  assert.equal(options.sizes[0].width, 2560);
  const result = await applyDisplaySettings({
    mode: 'windowed',
    windowSize: { width: 1600, height: 900 },
    uiScale: 1.75
  }, { storage });
  assert.equal(result.ok, true);
  assert.deepEqual(applied, {
    mode: 'windowed',
    windowSize: { width: 1600, height: 900 },
    uiScale: 1.75
  });
  assert.equal(storage.getItem('nova_display_mode_v1'), 'windowed');
}

async function checkBrowserFallback() {
  const storage = installBrowserGlobals();
  delete global.window.__novaDisplay;
  const fullscreen = await applyDisplaySettings({ mode: 'fullscreen', windowSize: { width: 1280, height: 720 } }, { storage });
  assert.equal(fullscreen.ok, true);
  assert.equal(global.document.fullscreenElement, global.document.documentElement);
  const windowed = await applyDisplaySettings({ mode: 'windowed', windowSize: { width: 1366, height: 768 } }, { storage });
  assert.equal(windowed.ok, true);
  assert.equal(global.document.fullscreenElement, null);
}

function checkElectronWindowApplication() {
  const calls = [];
  const fakeWindow = {
    fullScreen: false,
    bounds: { x: 100, y: 100, width: 1280, height: 720 },
    isDestroyed: () => false,
    isFullScreen() { return this.fullScreen; },
    setFullScreen(value) { this.fullScreen = Boolean(value); calls.push(['setFullScreen', Boolean(value)]); },
    setResizable(value) { calls.push(['setResizable', Boolean(value)]); },
    unmaximize() { calls.push(['unmaximize']); },
    setBounds(bounds) { this.bounds = bounds; calls.push(['setBounds', bounds]); },
    getBounds() { return this.bounds; }
  };
  const fakeScreen = {
    getDisplayNearestPoint: () => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      size: { width: 1920, height: 1080 },
      workAreaSize: { width: 1920, height: 1040 },
      scaleFactor: 1
    })
  };

  const full = applyDisplaySettingsToWindow(fakeWindow, fakeScreen, { mode: 'fullscreen' });
  assert.equal(full.ok, true);
  assert(calls.some((call) => call[0] === 'setFullScreen' && call[1] === true));
  const windowed = applyDisplaySettingsToWindow(fakeWindow, fakeScreen, { mode: 'windowed', windowSize: { width: 1600, height: 900 } });
  assert.equal(windowed.ok, true);
  assert.deepEqual(fakeWindow.bounds, { x: 160, y: 70, width: 1600, height: 900 });

  const info = getDisplayInfo(fakeScreen, fakeWindow, sanitizeDisplaySettings({ mode: 'windowed' }));
  assert(info.sizes.some((size) => size.width === 1920 && size.height === 1080));
  assert(info.modes.some((mode) => mode.id === 'borderless' && mode.supported));
}

function checkElectronPersistenceRoundTrip() {
  const userDataPath = mkdtempSync(path.join(tmpdir(), 'nova-display-settings-check-'));
  try {
    const saved = writeDisplaySettings(userDataPath, {
      mode: 'borderless',
      windowSize: { width: 1920, height: 1080 },
      uiScale: 2
    });
    assert.equal(saved.mode, 'borderless');
    assert.equal(saved.uiScale, 2);
    assert.deepEqual(readDisplaySettings(userDataPath), saved);
  } finally {
    rmSync(userDataPath, { recursive: true, force: true });
  }
}

function checkI18nText() {
  for (const locale of ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
    assert.notEqual(translateTextForLocale(locale, 'Display Mode'), 'Display Mode', `${locale} display mode translation missing`);
    assert.notEqual(translateTextForLocale(locale, 'Window Size'), 'Window Size', `${locale} window size translation missing`);
    assert.notEqual(translateTextForLocale(locale, 'UI Scale'), 'UI Scale', `${locale} UI scale translation missing`);
    assert.notEqual(translateTextForLocale(locale, 'Confirm Exit'), 'Confirm Exit', `${locale} confirm exit translation missing`);
    assert.notEqual(translateTextForLocale(locale, 'UI scale applied'), 'UI scale applied', `${locale} UI scale applied translation missing`);
    assert.notEqual(translateTextForLocale(locale, 'Safe display reset applied'), 'Safe display reset applied', `${locale} reset translation missing`);
  }
}

checkRendererDefaultsAndPersistence();
await checkElectronBridgeApply();
await checkBrowserFallback();
checkElectronWindowApplication();
checkElectronPersistenceRoundTrip();
checkI18nText();

console.log('[display-settings] PASS defaults, persistence, Electron apply, browser fallback, and i18n');
