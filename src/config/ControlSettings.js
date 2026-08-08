export const CONTROL_SETTINGS_KEY = 'nova.controls.v1';
export const CONTROL_SETTINGS_CHANGED_EVENT = 'nova-controls-changed';

export const DEFAULT_CONTROL_SETTINGS = Object.freeze({
  fireInput: 'hold',
  mouseSteering: false
});

export function normalizeControlSettings(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    fireInput: raw.fireInput === 'toggle' ? 'toggle' : 'hold',
    mouseSteering: raw.mouseSteering === true
  };
}

export function getControlSettings({ storage = globalThis?.localStorage } = {}) {
  try {
    const raw = storage?.getItem?.(CONTROL_SETTINGS_KEY);
    return normalizeControlSettings(raw ? JSON.parse(raw) : DEFAULT_CONTROL_SETTINGS);
  } catch {
    return { ...DEFAULT_CONTROL_SETTINGS };
  }
}

export function saveControlSettings(value = {}, {
  storage = globalThis?.localStorage,
  dispatch = true
} = {}) {
  const settings = normalizeControlSettings(value);
  try {
    storage?.setItem?.(CONTROL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Keep the in-session setting usable when storage is unavailable.
  }
  if (dispatch && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONTROL_SETTINGS_CHANGED_EVENT, { detail: settings }));
  }
  return settings;
}
