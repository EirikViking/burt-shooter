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
  migrateLegacyHighSectorPrototypeSettings({ storage });
  return { ...DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS };
}

export function saveHighSectorPrototypeSettings(value = {}, {
  storage = null,
  dispatch = true
} = {}) {
  void value;
  migrateLegacyHighSectorPrototypeSettings({ storage });
  const settings = { ...DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS };
  if (dispatch && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HIGH_SECTOR_PROTOTYPE_CHANGED_EVENT, { detail: settings }));
  }
  return settings;
}

export function migrateLegacyHighSectorPrototypeSettings({ storage = null } = {}) {
  const target = getStorage(storage);
  if (!target) return { removed: false, legacy: null };
  try {
    const raw = target.getItem?.(HIGH_SECTOR_PROTOTYPE_SETTINGS_KEY);
    if (raw == null) return { removed: false, legacy: null };
    let legacy = null;
    try {
      legacy = normalizeHighSectorPrototypeSettings(JSON.parse(raw));
    } catch {
      legacy = { ...DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS };
    }
    target.removeItem?.(HIGH_SECTOR_PROTOTYPE_SETTINGS_KEY);
    return { removed: true, legacy };
  } catch {
    return { removed: false, legacy: null };
  }
}
