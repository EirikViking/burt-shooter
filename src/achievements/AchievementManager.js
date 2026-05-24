import {
  ACHIEVEMENTS,
  getAchievementById,
  getAchievementIds,
  isValidAchievementId
} from './AchievementCatalog.js';
import { createSteamAchievementSync } from './SteamAchievementSync.js';

export const ACHIEVEMENT_STORAGE_KEY = 'nova_swarm_achievements_v1';

function getDefaultStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readStoredIds(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(ACHIEVEMENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed) ? parsed : parsed?.unlocked;
    return Array.isArray(ids) ? ids.filter(isValidAchievementId) : [];
  } catch {
    return [];
  }
}

function compactPayload(payload = {}) {
  const allowed = [
    'source',
    'rankIndex',
    'rankTitle',
    'level',
    'score',
    'runMode',
    'globalProvider',
    'placement',
    'numberOne'
  ];
  return Object.fromEntries(
    allowed
      .filter((key) => payload[key] !== undefined)
      .map((key) => [key, payload[key]])
  );
}

export class AchievementManager {
  constructor(options = {}) {
    this.storage = options.storage ?? getDefaultStorage();
    this.getRunState = typeof options.getRunState === 'function' ? options.getRunState : null;
    this.onUnlock = typeof options.onUnlock === 'function' ? options.onUnlock : null;
    this.steamSync = options.steamSync === false
      ? null
      : options.steamSync || createSteamAchievementSync({ storage: this.storage });
    this.unlockedIds = new Set(readStoredIds(this.storage));
    this.lastUnlocked = null;
    this.lastSteamSync = null;
  }

  configure(options = {}) {
    if (typeof options.getRunState === 'function') this.getRunState = options.getRunState;
    if (typeof options.onUnlock === 'function') this.onUnlock = options.onUnlock;
  }

  canUnlockFromCurrentRun(payload = {}) {
    if (payload.ignoreRunGate === true) return true;

    if (payload.runMode === 'unranked' || payload.isDebugRun === true) {
      return false;
    }

    let runState = null;
    try {
      runState = this.getRunState?.() || null;
    } catch {
      runState = null;
    }

    if (runState?.runMode === 'unranked' || runState?.isDebugRun === true) {
      return false;
    }

    return true;
  }

  persist() {
    if (!this.storage) return;
    try {
      this.storage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify({
        version: 1,
        unlocked: this.getUnlocked(),
        updatedAt: new Date().toISOString()
      }));
      if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
    } catch {
      // Achievement persistence is best effort and must never affect gameplay.
    }
  }

  unlock(id, payload = {}) {
    try {
      if (!isValidAchievementId(id)) return null;
      if (!this.canUnlockFromCurrentRun(payload)) return null;
      if (this.unlockedIds.has(id)) return null;

      this.unlockedIds.add(id);
      this.persist();

      const achievement = getAchievementById(id);
      this.lastUnlocked = {
        id,
        achievement,
        unlockedAt: new Date().toISOString(),
        payload: compactPayload(payload)
      };

      try {
        this.onUnlock?.(this.lastUnlocked);
      } catch {
        // UI notification hooks are optional; never let them break gameplay.
      }

      this.steamSync?.unlock?.(id)?.catch?.(() => {});

      return this.lastUnlocked;
    } catch {
      return null;
    }
  }

  isUnlocked(id) {
    return isValidAchievementId(id) && this.unlockedIds.has(id);
  }

  getUnlocked() {
    return getAchievementIds().filter((id) => this.unlockedIds.has(id));
  }

  getDebugState() {
    const unlocked = this.getUnlocked();
    return {
      unlocked,
      lastUnlocked: this.lastUnlocked,
      steam: this.steamSync?.getDebugState?.() || null,
      lastSteamSync: this.lastSteamSync,
      count: unlocked.length,
      total: ACHIEVEMENTS.length
    };
  }

  importUnlocked(ids = [], options = {}) {
    const added = [];
    for (const id of ids) {
      if (!isValidAchievementId(id) || this.unlockedIds.has(id)) continue;
      this.unlockedIds.add(id);
      added.push(id);
    }
    if (!added.length) return [];
    this.persist();
    this.lastSteamSync = {
      direction: 'steam_to_local',
      added,
      source: options.source || 'steam',
      suppressToast: options.suppressToast !== false,
      syncedAt: new Date().toISOString()
    };
    return added;
  }

  async syncWithSteam() {
    if (!this.steamSync?.syncWithLocal) return null;
    try {
      const result = await this.steamSync.syncWithLocal(this);
      this.lastSteamSync = {
        direction: 'bidirectional',
        result,
        syncedAt: new Date().toISOString()
      };
      return result;
    } catch (error) {
      this.lastSteamSync = {
        direction: 'bidirectional',
        ok: false,
        error: error?.message || String(error),
        syncedAt: new Date().toISOString()
      };
      return null;
    }
  }

  resetForDebugOnly() {
    try {
      this.unlockedIds.clear();
      this.lastUnlocked = null;
      this.persist();
      return true;
    } catch {
      return false;
    }
  }
}
