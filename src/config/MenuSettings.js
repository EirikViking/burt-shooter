export const CONFIRM_EXIT_KEY = 'nova_confirm_exit_v1';

export const DEFAULT_MENU_SETTINGS = Object.freeze({
  confirmExit: true
});

function getStorage(storage = null) {
  try {
    return storage || (typeof window !== 'undefined' ? window.localStorage : null);
  } catch {
    return null;
  }
}

export function normalizeConfirmExit(value) {
  if (value === false || value === 'false' || value === '0' || value === 0 || value === 'off') return false;
  if (value === true || value === 'true' || value === '1' || value === 1 || value === 'on') return true;
  return DEFAULT_MENU_SETTINGS.confirmExit;
}

export function getMenuSettings({ storage = null } = {}) {
  const localStorageRef = getStorage(storage);
  try {
    const stored = localStorageRef?.getItem?.(CONFIRM_EXIT_KEY);
    return {
      confirmExit: stored == null ? DEFAULT_MENU_SETTINGS.confirmExit : normalizeConfirmExit(stored)
    };
  } catch {
    return { ...DEFAULT_MENU_SETTINGS };
  }
}

export function saveMenuSettings(settings = {}, { storage = null, syncCloud = true } = {}) {
  const clean = {
    confirmExit: normalizeConfirmExit(settings.confirmExit)
  };
  const localStorageRef = getStorage(storage);
  try {
    localStorageRef?.setItem?.(CONFIRM_EXIT_KEY, clean.confirmExit ? '1' : '0');
    if (syncCloud && typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
  } catch {
    // Settings remain available to the caller even if storage is unavailable.
  }
  return clean;
}
