export const DISPLAY_MODE_KEY = 'nova_display_mode_v1';
export const DISPLAY_WINDOW_SIZE_KEY = 'nova_display_window_size_v1';

export const DISPLAY_MODES = Object.freeze([
  { id: 'fullscreen', label: 'Fullscreen' },
  { id: 'windowed', label: 'Windowed' },
  { id: 'borderless', label: 'Borderless' }
]);

export const DEFAULT_DISPLAY_SETTINGS = Object.freeze({
  mode: 'fullscreen',
  windowSize: Object.freeze({ width: 1280, height: 720 })
});

export const DEFAULT_WINDOW_SIZE_OPTIONS = Object.freeze([
  { width: 1280, height: 720, label: '1280 x 720' },
  { width: 1366, height: 768, label: '1366 x 768' },
  { width: 1600, height: 900, label: '1600 x 900' },
  { width: 1920, height: 1080, label: '1920 x 1080' }
]);

function getStorage(storage = null) {
  try {
    return storage || (typeof window !== 'undefined' ? window.localStorage : null);
  } catch {
    return null;
  }
}

function clampSize(value, fallback) {
  const raw = value && typeof value === 'object' ? value : {};
  const width = Math.max(960, Math.min(7680, Math.floor(Number(raw.width) || fallback.width)));
  const height = Math.max(540, Math.min(4320, Math.floor(Number(raw.height) || fallback.height)));
  return { width, height };
}

export function normalizeDisplaySettings(settings = {}) {
  const mode = DISPLAY_MODES.some((entry) => entry.id === settings?.mode)
    ? settings.mode
    : DEFAULT_DISPLAY_SETTINGS.mode;
  return {
    mode,
    windowSize: clampSize(settings?.windowSize || settings?.resolution || settings?.size, DEFAULT_DISPLAY_SETTINGS.windowSize)
  };
}

export function getDisplaySettings({ storage = null } = {}) {
  const localStorageRef = getStorage(storage);
  let mode = DEFAULT_DISPLAY_SETTINGS.mode;
  let windowSize = DEFAULT_DISPLAY_SETTINGS.windowSize;
  try {
    const storedMode = localStorageRef?.getItem?.(DISPLAY_MODE_KEY);
    if (DISPLAY_MODES.some((entry) => entry.id === storedMode)) mode = storedMode;
    const parsedSize = JSON.parse(localStorageRef?.getItem?.(DISPLAY_WINDOW_SIZE_KEY) || 'null');
    windowSize = clampSize(parsedSize, DEFAULT_DISPLAY_SETTINGS.windowSize);
  } catch {
    windowSize = DEFAULT_DISPLAY_SETTINGS.windowSize;
  }
  return normalizeDisplaySettings({ mode, windowSize });
}

export function saveDisplaySettings(settings, { storage = null, syncCloud = true } = {}) {
  const clean = normalizeDisplaySettings(settings);
  const localStorageRef = getStorage(storage);
  try {
    localStorageRef?.setItem?.(DISPLAY_MODE_KEY, clean.mode);
    localStorageRef?.setItem?.(DISPLAY_WINDOW_SIZE_KEY, JSON.stringify(clean.windowSize));
    if (syncCloud && typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
  } catch {
    // The settings still apply for the current session when storage is unavailable.
  }
  return clean;
}

export function resetDisplaySettings({ storage = null } = {}) {
  const clean = normalizeDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
  const localStorageRef = getStorage(storage);
  try {
    localStorageRef?.setItem?.(DISPLAY_MODE_KEY, clean.mode);
    localStorageRef?.setItem?.(DISPLAY_WINDOW_SIZE_KEY, JSON.stringify(clean.windowSize));
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
  } catch {
    // Storage may be unavailable; caller still receives the safe default.
  }
  return clean;
}

export function getBrowserDisplayInfo() {
  const screenRef = typeof window !== 'undefined' ? window.screen : null;
  const nativeWidth = Math.max(960, Math.floor(Number(screenRef?.width) || DEFAULT_DISPLAY_SETTINGS.windowSize.width));
  const nativeHeight = Math.max(540, Math.floor(Number(screenRef?.height) || DEFAULT_DISPLAY_SETTINGS.windowSize.height));
  const currentWidth = typeof window !== 'undefined' ? Math.max(960, Math.floor(Number(window.innerWidth) || nativeWidth)) : nativeWidth;
  const currentHeight = typeof window !== 'undefined' ? Math.max(540, Math.floor(Number(window.innerHeight) || nativeHeight)) : nativeHeight;
  return {
    modes: DISPLAY_MODES.map((entry) => ({ id: entry.id, supported: entry.id !== 'borderless' })),
    sizes: dedupeWindowSizes([
      { width: nativeWidth, height: nativeHeight, label: `Native ${nativeWidth} x ${nativeHeight}` },
      { width: currentWidth, height: currentHeight, label: `Current ${currentWidth} x ${currentHeight}` },
      ...DEFAULT_WINDOW_SIZE_OPTIONS
    ]),
    display: {
      width: nativeWidth,
      height: nativeHeight
    }
  };
}

export function dedupeWindowSizes(sizes = []) {
  const seen = new Set();
  const result = [];
  for (const size of sizes) {
    const clean = clampSize(size, DEFAULT_DISPLAY_SETTINGS.windowSize);
    const key = `${clean.width}x${clean.height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...clean,
      label: size.label || `${clean.width} x ${clean.height}`
    });
  }
  return result;
}

export async function getDisplayOptions() {
  const bridge = typeof window !== 'undefined' ? window.__novaDisplay : null;
  const nativeInfo = await bridge?.getInfo?.().catch?.(() => null);
  if (nativeInfo?.sizes?.length) {
    return {
      modes: Array.isArray(nativeInfo.modes) ? nativeInfo.modes : DISPLAY_MODES,
      sizes: dedupeWindowSizes(nativeInfo.sizes),
      display: nativeInfo.display || null
    };
  }
  return getBrowserDisplayInfo();
}

export async function applyDisplaySettings(settings, { storage = null } = {}) {
  const clean = saveDisplaySettings(settings, { storage });
  const bridge = typeof window !== 'undefined' ? window.__novaDisplay : null;
  if (bridge?.applySettings) {
    return bridge.applySettings(clean).catch((error) => ({
      ok: false,
      reason: 'electron_apply_failed',
      error: error?.message || String(error),
      settings: clean
    }));
  }
  try {
    if (clean.mode === 'fullscreen') {
      await document.documentElement?.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    }
    return { ok: true, reason: 'browser_fallback', settings: clean };
  } catch (error) {
    return {
      ok: false,
      reason: 'browser_fallback_unavailable',
      error: error?.message || String(error),
      settings: clean
    };
  }
}
