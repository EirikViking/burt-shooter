const SCREEN_SHAKE_KEY = 'burt_accessibility_screen_shake';

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

export function getScreenShakeScale() {
  try {
    const raw = localStorage.getItem(SCREEN_SHAKE_KEY);
    if (raw === null || raw === '') return getDefaultScreenShakeScale();
    return clampUnit(raw, getDefaultScreenShakeScale());
  } catch {
    return getDefaultScreenShakeScale();
  }
}

export function setScreenShakeScale(value) {
  const clamped = clampUnit(value, getDefaultScreenShakeScale());
  try {
    localStorage.setItem(SCREEN_SHAKE_KEY, String(clamped));
  } catch {
    // Storage can be unavailable in privacy modes; the current value still applies to callers.
  }
  return clamped;
}

export function getAccessibilitySettings() {
  return {
    screenShake: getScreenShakeScale(),
    prefersReducedMotion: prefersReducedMotion()
  };
}
