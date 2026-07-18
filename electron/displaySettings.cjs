const fs = require('node:fs');
const path = require('node:path');

const DISPLAY_SETTINGS_FILE = 'display-settings.json';
const DISPLAY_MODE_FULLSCREEN = 'fullscreen';
const DISPLAY_MODE_WINDOWED = 'windowed';
const DISPLAY_MODE_BORDERLESS = 'borderless';
const SUPPORTED_DISPLAY_MODES = new Set([
  DISPLAY_MODE_FULLSCREEN,
  DISPLAY_MODE_WINDOWED,
  DISPLAY_MODE_BORDERLESS
]);
const DEFAULT_WINDOW_SIZE = Object.freeze({ width: 1280, height: 720 });
const MIN_WINDOW_SIZE = Object.freeze({ width: 960, height: 540 });
const MAX_WINDOW_SIZE = Object.freeze({ width: 7680, height: 4320 });
const SUPPORTED_UI_SCALES = Object.freeze([1, 1.25, 1.5, 1.75, 2]);
const COMMON_WINDOW_SIZES = Object.freeze([
  { width: 1280, height: 720, label: '1280 x 720' },
  { width: 1366, height: 768, label: '1366 x 768' },
  { width: 1600, height: 900, label: '1600 x 900' },
  { width: 1920, height: 1080, label: '1920 x 1080' }
]);

function clampInteger(value, fallback, min, max) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function sanitizeWindowSize(value = {}, fallback = DEFAULT_WINDOW_SIZE) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    width: clampInteger(raw.width, fallback.width, MIN_WINDOW_SIZE.width, MAX_WINDOW_SIZE.width),
    height: clampInteger(raw.height, fallback.height, MIN_WINDOW_SIZE.height, MAX_WINDOW_SIZE.height)
  };
}

function sanitizeDisplaySettings(settings = {}, options = {}) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const defaultMode = SUPPORTED_DISPLAY_MODES.has(options.defaultMode) ? options.defaultMode : DISPLAY_MODE_FULLSCREEN;
  const mode = SUPPORTED_DISPLAY_MODES.has(raw.mode) ? raw.mode : defaultMode;
  const uiScale = SUPPORTED_UI_SCALES.includes(Number(raw.uiScale)) ? Number(raw.uiScale) : 1;
  return {
    mode,
    windowSize: sanitizeWindowSize(raw.windowSize || raw.resolution || raw.size, DEFAULT_WINDOW_SIZE),
    uiScale
  };
}

function getSettingsPath(userDataPath) {
  return path.join(userDataPath, DISPLAY_SETTINGS_FILE);
}

function readDisplaySettings(userDataPath, options = {}) {
  try {
    const filePath = getSettingsPath(userDataPath);
    if (!fs.existsSync(filePath)) return sanitizeDisplaySettings({}, options);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return sanitizeDisplaySettings(parsed, options);
  } catch {
    return sanitizeDisplaySettings({}, options);
  }
}

function writeDisplaySettings(userDataPath, settings, options = {}) {
  const clean = sanitizeDisplaySettings(settings, options);
  const filePath = getSettingsPath(userDataPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(clean, null, 2));
  fs.renameSync(tempPath, filePath);
  return clean;
}

function getDisplayBounds(screenModule, window) {
  const fallback = {
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    size: { width: 1920, height: 1080 },
    workAreaSize: { width: 1920, height: 1040 },
    scaleFactor: 1
  };
  try {
    const bounds = window?.getBounds?.();
    if (bounds && screenModule?.getDisplayNearestPoint) {
      return screenModule.getDisplayNearestPoint({
        x: bounds.x + Math.floor(bounds.width / 2),
        y: bounds.y + Math.floor(bounds.height / 2)
      }) || fallback;
    }
    return screenModule?.getPrimaryDisplay?.() || fallback;
  } catch {
    return fallback;
  }
}

function dedupeSizes(sizes) {
  const seen = new Set();
  const result = [];
  for (const size of sizes) {
    const clean = sanitizeWindowSize(size, DEFAULT_WINDOW_SIZE);
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

function getDisplayInfo(screenModule, window, persistedSettings = {}) {
  const display = getDisplayBounds(screenModule, window);
  const currentBounds = window?.getBounds?.() || null;
  const nativeWidth = Math.max(MIN_WINDOW_SIZE.width, Math.floor(display?.size?.width || display?.bounds?.width || DEFAULT_WINDOW_SIZE.width));
  const nativeHeight = Math.max(MIN_WINDOW_SIZE.height, Math.floor(display?.size?.height || display?.bounds?.height || DEFAULT_WINDOW_SIZE.height));
  const currentWidth = currentBounds?.width || persistedSettings?.windowSize?.width || DEFAULT_WINDOW_SIZE.width;
  const currentHeight = currentBounds?.height || persistedSettings?.windowSize?.height || DEFAULT_WINDOW_SIZE.height;
  return {
    modes: [
      { id: DISPLAY_MODE_FULLSCREEN, supported: true },
      { id: DISPLAY_MODE_WINDOWED, supported: true },
      {
        id: DISPLAY_MODE_BORDERLESS,
        supported: true,
        note: 'Uses a borderless-sized desktop window when possible; fullscreen remains the safe fallback.'
      }
    ],
    sizes: dedupeSizes([
      { width: nativeWidth, height: nativeHeight, label: `Native ${nativeWidth} x ${nativeHeight}` },
      { width: currentWidth, height: currentHeight, label: `Current ${currentWidth} x ${currentHeight}` },
      ...COMMON_WINDOW_SIZES
    ]),
    display: {
      width: nativeWidth,
      height: nativeHeight,
      workAreaWidth: Math.floor(display?.workAreaSize?.width || display?.workArea?.width || nativeWidth),
      workAreaHeight: Math.floor(display?.workAreaSize?.height || display?.workArea?.height || nativeHeight),
      scaleFactor: Number(display?.scaleFactor || 1)
    }
  };
}

function centerBounds(display, size) {
  const area = display?.workArea || display?.bounds || { x: 0, y: 0, width: size.width, height: size.height };
  const width = Math.min(size.width, Math.max(MIN_WINDOW_SIZE.width, area.width));
  const height = Math.min(size.height, Math.max(MIN_WINDOW_SIZE.height, area.height));
  return {
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    width,
    height
  };
}

function applyDisplaySettingsToWindow(window, screenModule, settings = {}) {
  if (!window || window.isDestroyed?.()) {
    return { ok: false, reason: 'window_unavailable', settings: sanitizeDisplaySettings(settings) };
  }
  const clean = sanitizeDisplaySettings(settings);
  const display = getDisplayBounds(screenModule, window);

  if (clean.mode === DISPLAY_MODE_FULLSCREEN) {
    window.setResizable?.(true);
    if (!window.isFullScreen?.()) window.setFullScreen?.(true);
    return { ok: true, settings: clean, applied: { mode: clean.mode } };
  }

  if (window.isFullScreen?.()) window.setFullScreen?.(false);
  window.unmaximize?.();
  window.setResizable?.(clean.mode !== DISPLAY_MODE_BORDERLESS);
  const bounds = clean.mode === DISPLAY_MODE_BORDERLESS
    ? (display?.bounds || centerBounds(display, clean.windowSize))
    : centerBounds(display, clean.windowSize);
  window.setBounds?.(bounds, true);
  return {
    ok: true,
    settings: clean,
    applied: {
      mode: clean.mode,
      bounds,
      trueBorderlessRequiresRestart: clean.mode === DISPLAY_MODE_BORDERLESS && window.isFullScreen?.() === false
    }
  };
}

module.exports = {
  DISPLAY_SETTINGS_FILE,
  DISPLAY_MODE_FULLSCREEN,
  DISPLAY_MODE_WINDOWED,
  DISPLAY_MODE_BORDERLESS,
  DEFAULT_WINDOW_SIZE,
  COMMON_WINDOW_SIZES,
  sanitizeDisplaySettings,
  sanitizeWindowSize,
  readDisplaySettings,
  writeDisplaySettings,
  getDisplayInfo,
  applyDisplaySettingsToWindow
};
