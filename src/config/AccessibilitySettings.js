const SCREEN_SHAKE_KEY = 'burt_accessibility_screen_shake';
const PLAYER_FOCUS_KEY = 'burt_accessibility_player_focus';
const PLAYER_HITBOX_KEY = 'nova_accessibility_player_hitbox';
const COLOR_ASSIST_KEY = 'nova_accessibility_color_assist';
const FLASH_INTENSITY_KEY = 'nova_accessibility_flash_intensity';
const REDUCED_MOTION_KEY = 'nova_accessibility_reduced_motion';

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

export function getReducedMotionEnabled() {
  try {
    const raw = localStorage.getItem(REDUCED_MOTION_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    // Fall through to the operating-system preference.
  }
  return prefersReducedMotion();
}

export function setReducedMotionEnabled(enabled) {
  const next = Boolean(enabled);
  try {
    localStorage.setItem(REDUCED_MOTION_KEY, next ? '1' : '0');
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch {
    // Storage can be unavailable in privacy modes; callers can still use the returned value.
  }
  return next;
}

export function getFlashIntensityScale() {
  try {
    const raw = localStorage.getItem(FLASH_INTENSITY_KEY);
    if (raw === null || raw === '') return getReducedMotionEnabled() ? 0.55 : 1;
    return clampUnit(raw, 1);
  } catch {
    return getReducedMotionEnabled() ? 0.55 : 1;
  }
}

export function setFlashIntensityScale(value) {
  const clamped = clampUnit(value, 1);
  try {
    localStorage.setItem(FLASH_INTENSITY_KEY, String(clamped));
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch {
    // Storage can be unavailable in privacy modes; callers can still use the returned value.
  }
  return clamped;
}

export function getDefaultScreenShakeScale() {
  return getReducedMotionEnabled() ? 0.45 : 1;
}

export function getDefaultPlayerFocusScale() {
  return getReducedMotionEnabled() ? 0.85 : 0.72;
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

export function getPlayerHitboxVisible() {
  try {
    return localStorage.getItem(PLAYER_HITBOX_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPlayerHitboxVisible(enabled) {
  const next = Boolean(enabled);
  try {
    localStorage.setItem(PLAYER_HITBOX_KEY, next ? '1' : '0');
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch {
    // Storage can be unavailable in privacy modes; callers can still use the returned value.
  }
  return next;
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
  const reducedMotion = getReducedMotionEnabled();
  return {
    screenShake: getScreenShakeScale(),
    playerFocus: getPlayerFocusScale(),
    playerHitbox: getPlayerHitboxVisible(),
    colorAssist: getColorAssistEnabled(),
    flashIntensity: getFlashIntensityScale(),
    reducedMotion,
    // Preserve the existing consumer contract while allowing an explicit,
    // persisted in-game override of the operating-system media preference.
    prefersReducedMotion: reducedMotion
  };
}
