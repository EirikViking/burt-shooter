export const CONFIRM_EXIT_KEY = 'nova_confirm_exit_v1';
export const SHOW_PILOT_ORDERS_KEY = 'nova_show_pilot_orders_v1';

export const DEFAULT_MENU_SETTINGS = Object.freeze({
  confirmExit: true,
  showPilotOrders: true
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

export function normalizeShowPilotOrders(value, fallback = DEFAULT_MENU_SETTINGS.showPilotOrders) {
  if (value === false || value === 'false' || value === '0' || value === 0 || value === 'off') return false;
  if (value === true || value === 'true' || value === '1' || value === 1 || value === 'on') return true;
  return Boolean(fallback);
}

export function getMenuSettings({ storage = null, defaultShowPilotOrders = DEFAULT_MENU_SETTINGS.showPilotOrders } = {}) {
  const localStorageRef = getStorage(storage);
  try {
    const storedConfirmExit = localStorageRef?.getItem?.(CONFIRM_EXIT_KEY);
    const storedShowPilotOrders = localStorageRef?.getItem?.(SHOW_PILOT_ORDERS_KEY);
    return {
      confirmExit: storedConfirmExit == null ? DEFAULT_MENU_SETTINGS.confirmExit : normalizeConfirmExit(storedConfirmExit),
      showPilotOrders: storedShowPilotOrders == null
        ? normalizeShowPilotOrders(defaultShowPilotOrders)
        : normalizeShowPilotOrders(storedShowPilotOrders, defaultShowPilotOrders),
      showPilotOrdersStored: storedShowPilotOrders != null
    };
  } catch {
    return { ...DEFAULT_MENU_SETTINGS, showPilotOrdersStored: false };
  }
}

export function saveMenuSettings(settings = {}, { storage = null, syncCloud = true, defaultShowPilotOrders = DEFAULT_MENU_SETTINGS.showPilotOrders } = {}) {
  const current = getMenuSettings({ storage, defaultShowPilotOrders });
  const clean = {
    confirmExit: settings.confirmExit === undefined ? current.confirmExit : normalizeConfirmExit(settings.confirmExit),
    showPilotOrders: settings.showPilotOrders === undefined
      ? current.showPilotOrders
      : normalizeShowPilotOrders(settings.showPilotOrders, defaultShowPilotOrders),
    showPilotOrdersStored: settings.showPilotOrders === undefined ? current.showPilotOrdersStored : true
  };
  const localStorageRef = getStorage(storage);
  try {
    if (settings.confirmExit !== undefined) localStorageRef?.setItem?.(CONFIRM_EXIT_KEY, clean.confirmExit ? '1' : '0');
    if (settings.showPilotOrders !== undefined) localStorageRef?.setItem?.(SHOW_PILOT_ORDERS_KEY, clean.showPilotOrders ? '1' : '0');
    if (syncCloud && typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
  } catch {
    // Settings remain available to the caller even if storage is unavailable.
  }
  return clean;
}
