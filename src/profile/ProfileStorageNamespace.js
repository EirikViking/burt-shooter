export const PROFILE_SCOPED_STORAGE_KEYS = Object.freeze([
  'nova.hangarProgress.v1',
  'nova.threatDiscovery.v1',
  'novaSwarm.sectorStartChallengeRecords.v1',
  'nova_swarm_achievements_v1',
  'novaSwarm.localLeaderboard.v2',
  'burt.shipUnlockProgress.v1',
  'burt.selectedShip.v1',
  'burt.shipUsage.v1',
  'burt.shipUsageTotal.v1',
  'burt_season_xp',
  'burt_season_unlocks',
  'bs_ship_rotation_index'
]);

const PROFILE_KEY_SET = new Set(PROFILE_SCOPED_STORAGE_KEYS);
const STORAGE_PREFIX = 'nova.profile.';
const DEFAULT_CONTEXT = Object.freeze({
  type: 'local',
  id: 'local-offline',
  steamId: null,
  storageId: 'local-offline',
  personaName: null,
  reason: 'default'
});

let activeContext = DEFAULT_CONTEXT;
let installed = false;
let originals = null;

function sanitizeStorageId(value) {
  const text = String(value || '').trim();
  const cleaned = text.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return (cleaned || DEFAULT_CONTEXT.storageId).slice(0, 80);
}

export function normalizeProfileStorageContext(context = {}) {
  const raw = context && typeof context === 'object' ? context : {};
  const steamId = String(raw.steamId ?? raw.steamID ?? raw.id ?? '')
    .replace(/\D/g, '')
    .slice(0, 32);
  if (steamId) {
    return {
      type: 'steam',
      id: steamId,
      steamId,
      storageId: `steam-${steamId}`,
      personaName: raw.personaName ? String(raw.personaName).slice(0, 64) : null,
      reason: raw.reason ? String(raw.reason).slice(0, 120) : 'steam_identity_ready'
    };
  }
  const storageId = sanitizeStorageId(raw.storageId ?? raw.id ?? DEFAULT_CONTEXT.storageId);
  return {
    type: 'local',
    id: storageId,
    steamId: null,
    storageId,
    personaName: null,
    reason: raw.reason ? String(raw.reason).slice(0, 120) : 'local_profile'
  };
}

export function shouldScopeStorageKey(key) {
  return PROFILE_KEY_SET.has(String(key || ''));
}

export function getProfileScopedStorageKey(key, context = activeContext) {
  const rawKey = String(key || '');
  if (!shouldScopeStorageKey(rawKey)) return rawKey;
  const profile = normalizeProfileStorageContext(context);
  return `${STORAGE_PREFIX}${profile.storageId}.${rawKey}`;
}

function shouldPatchStorage(storage, key) {
  try {
    return typeof window !== 'undefined' &&
      storage === window.localStorage &&
      shouldScopeStorageKey(key);
  } catch {
    return false;
  }
}

function installStoragePatch() {
  if (installed) return;
  if (typeof Storage === 'undefined' || !Storage.prototype) return;
  originals = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem
  };
  Storage.prototype.getItem = function getProfileScopedItem(key) {
    const scoped = shouldPatchStorage(this, key) ? getProfileScopedStorageKey(key) : key;
    return originals.getItem.call(this, scoped);
  };
  Storage.prototype.setItem = function setProfileScopedItem(key, value) {
    const scoped = shouldPatchStorage(this, key) ? getProfileScopedStorageKey(key) : key;
    return originals.setItem.call(this, scoped, value);
  };
  Storage.prototype.removeItem = function removeProfileScopedItem(key) {
    const scoped = shouldPatchStorage(this, key) ? getProfileScopedStorageKey(key) : key;
    return originals.removeItem.call(this, scoped);
  };
  installed = true;
}

export function installProfileStorageNamespace(context = {}) {
  activeContext = normalizeProfileStorageContext(context);
  installStoragePatch();
  return {
    ...activeContext,
    scopedKeys: [...PROFILE_SCOPED_STORAGE_KEYS]
  };
}

export function getActiveProfileStorageContext() {
  return {
    ...activeContext,
    scopedKeys: [...PROFILE_SCOPED_STORAGE_KEYS],
    installed
  };
}
