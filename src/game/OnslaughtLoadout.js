import { ONSLAUGHT_START_POOL, validOnslaughtStartAugments } from '../../electron/onslaughtContract.cjs';
import { getTacticalDraftMeta } from '../config/TacticalDraft.js';
import { getShipMetadata } from '../config/ShipMetadata.js';
import { getProfileScopedStorageKey } from '../profile/ProfileStorageNamespace.js';

const STORAGE_KEY = 'novaSwarm.onslaughtLoadouts.v2';
export const DEFAULT_ONSLAUGHT_LOADOUT = Object.freeze(['damage_up', 'blink_drive', 'shield']);
export const ONSLAUGHT_LOADOUT_PRESETS = Object.freeze([
  Object.freeze({ id: 'balanced', name: 'Balanced', augmentIds: DEFAULT_ONSLAUGHT_LOADOUT }),
  Object.freeze({ id: 'firepower', name: 'Firepower', augmentIds: Object.freeze(['damage_up', 'rapid_fire', 'double_shot']) }),
  Object.freeze({ id: 'survival', name: 'Survival', augmentIds: Object.freeze(['shield', 'impact_foam', 'drones']) })
]);

export function getOnslaughtLoadoutShipId(spriteKey) {
  const ship = getShipMetadata(spriteKey);
  return ship?.baseId || ship?.id || null;
}

export function getOnslaughtStartingAugments() {
  return ONSLAUGHT_START_POOL.map(id => getTacticalDraftMeta(id)).filter(Boolean);
}

export function getSavedOnslaughtLoadout(spriteKey, storage = null) {
  const shipId = getOnslaughtLoadoutShipId(spriteKey);
  if (!shipId) return [...DEFAULT_ONSLAUGHT_LOADOUT];
  try {
    const saved = JSON.parse((storage || globalThis.localStorage)?.getItem(getProfileScopedStorageKey(STORAGE_KEY)) || 'null');
    const ids = saved?.byShip?.[shipId];
    return validOnslaughtStartAugments(ids) ? [...ids] : [...DEFAULT_ONSLAUGHT_LOADOUT];
  } catch {
    return [...DEFAULT_ONSLAUGHT_LOADOUT];
  }
}

export function saveOnslaughtLoadout(spriteKey, ids, storage = null) {
  const shipId = getOnslaughtLoadoutShipId(spriteKey);
  if (!shipId || !validOnslaughtStartAugments(ids)) return false;
  try {
    const key = getProfileScopedStorageKey(STORAGE_KEY);
    const target = storage || globalThis.localStorage;
    const saved = JSON.parse(target?.getItem(key) || 'null');
    target?.setItem(key, JSON.stringify({ version: 2, byShip: { ...(saved?.byShip || {}), [shipId]: [...ids] } }));
    return true;
  } catch {
    return false;
  }
}
