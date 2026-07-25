export const PROFILE_SCOPED_STORAGE_KEYS = Object.freeze([
  'nova.hangarProgress.v1',
  'nova.threatDiscovery.v1',
  'novaSwarm.sectorStartChallengeRecords.v1',
  'novaSwarm.scoutRunRecords.v1',
  'novaSwarm.overrunRunRecords.v1',
  'novaSwarm.dailySignalRecords.v1',
  'nova_swarm_achievements_v1',
  'novaSwarm.localLeaderboard.v2',
  'novaSwarm.pendingSteamLeaderboardSubmits.v1',
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
const LEGACY_UNSCOPED_CLAIM_KEY = `${STORAGE_PREFIX}legacyUnscopedClaim.v1`;
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

function getPatchableStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function rawGetItem(storage, key) {
  try {
    const getter = originals?.getItem || storage?.getItem;
    return getter ? getter.call(storage, key) : null;
  } catch {
    return null;
  }
}

function rawSetItem(storage, key, value) {
  try {
    const setter = originals?.setItem || storage?.setItem;
    if (!setter) return false;
    setter.call(storage, key, value);
    return true;
  } catch {
    return false;
  }
}

function readClaim(storage) {
  try {
    const raw = rawGetItem(storage, LEGACY_UNSCOPED_CLAIM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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

export function migrateLegacyUnscopedProfileStorage(context = activeContext) {
  const storage = getPatchableStorage();
  const profile = normalizeProfileStorageContext(context);
  const summary = {
    profile: { ...profile },
    claimKey: LEGACY_UNSCOPED_CLAIM_KEY,
    claimedBy: null,
    skipped: false,
    reason: null,
    copiedKeys: []
  };
  if (!storage) {
    summary.skipped = true;
    summary.reason = 'storage_unavailable';
    return summary;
  }

  const claim = readClaim(storage);
  if (claim?.storageId && claim.storageId !== profile.storageId) {
    summary.claimedBy = claim.storageId;
    summary.skipped = true;
    summary.reason = 'legacy_unscoped_already_claimed';
    return summary;
  }

  for (const rawKey of PROFILE_SCOPED_STORAGE_KEYS) {
    const scopedKey = getProfileScopedStorageKey(rawKey, profile);
    const scopedValue = rawGetItem(storage, scopedKey);
    if (scopedValue !== null && scopedValue !== undefined && scopedValue !== '') continue;
    const legacyValue = rawGetItem(storage, rawKey);
    if (legacyValue === null || legacyValue === undefined || legacyValue === '') continue;
    if (rawSetItem(storage, scopedKey, legacyValue)) summary.copiedKeys.push(rawKey);
  }

  if (summary.copiedKeys.length > 0) {
    rawSetItem(storage, LEGACY_UNSCOPED_CLAIM_KEY, JSON.stringify({
      version: 1,
      storageId: profile.storageId,
      type: profile.type,
      claimedAt: new Date().toISOString(),
      copiedKeys: summary.copiedKeys
    }));
    summary.claimedBy = profile.storageId;
  } else {
    summary.reason = 'no_unscoped_values_to_import';
  }
  return summary;
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
  const legacyMigration = migrateLegacyUnscopedProfileStorage(activeContext);
  installStoragePatch();
  return {
    ...activeContext,
    scopedKeys: [...PROFILE_SCOPED_STORAGE_KEYS],
    legacyMigration
  };
}

export function getActiveProfileStorageContext() {
  return {
    ...activeContext,
    scopedKeys: [...PROFILE_SCOPED_STORAGE_KEYS],
    installed
  };
}
