export const HIGH_SECTOR_PROTOTYPE_SETTINGS_KEY = 'nova.highSectorPrototype.v1';
export const HIGH_SECTOR_PROTOTYPE_CHANGED_EVENT = 'nova-high-sector-prototype-changed';
export const HIGH_SECTOR_PROTOTYPE_QUICK_START_SECTOR = 75;
export const HIGH_SECTOR_PROTOTYPE_AWARD_SUPPRESSION_REASON = 'high_sector_prototype_no_awards';

export const HIGH_SECTOR_PROTOTYPE_SUPPRESSED_AWARDS = Object.freeze([
  'rankings',
  'achievements',
  'codexDiscoveries',
  'unlocks',
  'careerProgress',
  'checkpoints',
  'personalBests',
  'pilotOrders',
  'shipUsage',
  'seasonProgress'
]);

export const DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS = Object.freeze({
  enabled: false,
  quickStart: false
});

function getStorage(storage = null) {
  try {
    return storage || (typeof window !== 'undefined' ? window.localStorage : null);
  } catch {
    return null;
  }
}

export function normalizeHighSectorPrototypeSettings(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  const quickStart = raw.quickStart === true;
  return {
    enabled: raw.enabled === true || quickStart,
    quickStart
  };
}

export function getHighSectorPrototypeSettings({ storage = null } = {}) {
  try {
    const raw = getStorage(storage)?.getItem?.(HIGH_SECTOR_PROTOTYPE_SETTINGS_KEY);
    return normalizeHighSectorPrototypeSettings(raw ? JSON.parse(raw) : DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS);
  } catch {
    return { ...DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS };
  }
}

export function saveHighSectorPrototypeSettings(value = {}, {
  storage = null,
  dispatch = true
} = {}) {
  const current = getHighSectorPrototypeSettings({ storage });
  const merged = {
    enabled: value.enabled === undefined ? current.enabled : value.enabled === true,
    quickStart: value.quickStart === undefined ? current.quickStart : value.quickStart === true
  };
  if (value.enabled === false) merged.quickStart = false;
  const settings = normalizeHighSectorPrototypeSettings(merged);
  try {
    getStorage(storage)?.setItem?.(HIGH_SECTOR_PROTOTYPE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // The current screen can still use the normalized result when storage is unavailable.
  }
  if (dispatch && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HIGH_SECTOR_PROTOTYPE_CHANGED_EVENT, { detail: settings }));
  }
  return settings;
}
