const SCREEN_SHAKE_KEY = 'burt_accessibility_screen_shake';
const PLAYER_FOCUS_KEY = 'burt_accessibility_player_focus';
const COLOR_ASSIST_KEY = 'nova_accessibility_color_assist';

function clampUnit(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function getDefaultScreenShakeScale() {
  return prefersReducedMotion() ? 0.45 : 1;
}

export function getDefaultPlayerFocusScale() {
  return prefersReducedMotion() ? 0.85 : 0.72;
}

export function getScreenShakeScale() {
  try {
    const raw = localStorage.getItem(SCREEN_SHAKE_KEY);
    if (raw === null || raw === '') return getDefaultScreenShakeScale();
    return clampUnit(raw, getDefaultScreenShakeScale());
  } catch {
    return getDefaultScreenShakeScale();
  }
}

export function getPlayerFocusScale() {
  try {
    const raw = localStorage.getItem(PLAYER_FOCUS_KEY);
    if (raw === null || raw === '') return getDefaultPlayerFocusScale();
    return clampUnit(raw, getDefaultPlayerFocusScale());
  } catch {
    return getDefaultPlayerFocusScale();
  }
}

export function setScreenShakeScale(value) {
  const clamped = clampUnit(value, getDefaultScreenShakeScale());
  try {
    localStorage.setItem(SCREEN_SHAKE_KEY, String(clamped));
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch {
    // Storage can be unavailable in privacy modes; the current value still applies to callers.
  }
  return clamped;
}

export function setPlayerFocusScale(value) {
  const clamped = clampUnit(value, getDefaultPlayerFocusScale());
  try {
    localStorage.setItem(PLAYER_FOCUS_KEY, String(clamped));
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch {
    // Storage can be unavailable in privacy modes; the current value still applies to callers.
  }
  return clamped;
}

export function getColorAssistEnabled() {
  try {
    return localStorage.getItem(COLOR_ASSIST_KEY) === '1';
  } catch {
    return false;
  }
}

export function setColorAssistEnabled(enabled) {
  const next = Boolean(enabled);
  try {
    localStorage.setItem(COLOR_ASSIST_KEY, next ? '1' : '0');
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch {
    // Storage can be unavailable in privacy modes; callers can still use the returned value.
  }
  return next;
}

export function getAccessibilitySettings() {
  return {
    screenShake: getScreenShakeScale(),
    playerFocus: getPlayerFocusScale(),
    colorAssist: getColorAssistEnabled(),
    prefersReducedMotion: prefersReducedMotion()
  };
}
