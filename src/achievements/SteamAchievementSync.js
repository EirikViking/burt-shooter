import { getAchievementIds, isValidAchievementId } from './AchievementCatalog.js';

const QUEUE_KEY = 'nova_swarm_steam_achievement_queue_v1';

function getDefaultStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function safeWindow() {
  try {
    return typeof window !== 'undefined' ? window : null;
  } catch {
    return null;
  }
}

function readQueue(storage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isValidAchievementId) : [];
  } catch {
    return [];
  }
}

function writeQueue(storage, ids) {
  if (!storage) return;
  try {
    const unique = [...new Set((ids || []).filter(isValidAchievementId))];
    if (unique.length) storage.setItem(QUEUE_KEY, JSON.stringify(unique));
    else storage.removeItem(QUEUE_KEY);
  } catch {
    // Queue persistence is best effort; local achievements remain authoritative.
  }
}

function resolveBridge(win = safeWindow()) {
  return win?.__novaSteamBridge?.achievements ||
    win?.__novaSteamAchievements ||
    null;
}

export class SteamAchievementSync {
  constructor(options = {}) {
    this.storage = options.storage ?? getDefaultStorage();
    this.bridge = options.bridge ?? null;
    this.getBridge = typeof options.getBridge === 'function' ? options.getBridge : () => this.bridge || resolveBridge();
    this.validIds = new Set(options.validIds || getAchievementIds());
    this.queue = new Set(readQueue(this.storage).filter((id) => this.validIds.has(id)));
    this.inFlight = new Set();
    this.lastResult = null;
  }

  persistQueue() {
    writeQueue(this.storage, [...this.queue]);
  }

  queueUnlock(id) {
    if (!this.validIds.has(id)) return false;
    this.queue.add(id);
    this.persistQueue();
    return true;
  }

  async callBridge(method, payload) {
    const bridge = this.getBridge();
    const fn = bridge?.[method];
    if (typeof fn !== 'function') {
      return { ok: false, reason: 'steam_achievements_bridge_missing' };
    }
    try {
      return await fn.call(bridge, payload);
    } catch (error) {
      return { ok: false, reason: 'steam_achievements_bridge_error', error: error?.message || String(error) };
    }
  }

  async getStatus() {
    const result = await this.callBridge('getStatus');
    return {
      ...result,
      queued: [...this.queue],
      queueCount: this.queue.size
    };
  }

  async unlock(id) {
    if (!this.validIds.has(id)) return { ok: false, ignored: true, reason: 'invalid_achievement_id' };
    if (this.inFlight.has(id)) return { ok: true, queued: this.queue.has(id), reason: 'unlock_already_in_flight' };
    this.inFlight.add(id);
    try {
      const result = await this.callBridge('unlockAchievement', id);
      this.lastResult = { type: 'unlock', id, result, recordedAt: new Date().toISOString() };
      if (result?.ok) {
        this.queue.delete(id);
        this.persistQueue();
      } else {
        this.queueUnlock(id);
      }
      return result;
    } finally {
      this.inFlight.delete(id);
    }
  }

  async retryQueued() {
    const ids = [...this.queue];
    if (ids.length === 0) return { ok: true, requested: [], synced: [], failed: [] };
    const result = await this.callBridge('syncUnlockedAchievements', { ids });
    this.lastResult = { type: 'retryQueued', result, recordedAt: new Date().toISOString() };
    if (result?.ok || Array.isArray(result?.synced) || Array.isArray(result?.skipped)) {
      for (const id of [...(result.synced || []), ...(result.skipped || [])]) this.queue.delete(id);
      this.persistQueue();
    }
    return result;
  }

  async syncWithLocal(manager) {
    const localIds = typeof manager?.getUnlocked === 'function' ? manager.getUnlocked() : [];
    const requested = [...new Set([...localIds, ...this.queue])].filter((id) => this.validIds.has(id));
    const result = await this.callBridge('syncUnlockedAchievements', { ids: requested });
    this.lastResult = { type: 'syncWithLocal', result, recordedAt: new Date().toISOString() };
    if (result?.ok || Array.isArray(result?.synced) || Array.isArray(result?.skipped)) {
      for (const id of [...(result.synced || []), ...(result.skipped || [])]) this.queue.delete(id);
      this.persistQueue();
    } else {
      requested.forEach((id) => this.queueUnlock(id));
    }
    const steamUnlockedIds = (result?.steamUnlockedIds || []).filter((id) => this.validIds.has(id));
    if (steamUnlockedIds.length && typeof manager?.importUnlocked === 'function') {
      manager.importUnlocked(steamUnlockedIds, { source: 'steam', suppressToast: true });
    }
    return result;
  }

  getDebugState() {
    return {
      queued: [...this.queue],
      queueCount: this.queue.size,
      inFlight: [...this.inFlight],
      lastResult: this.lastResult
    };
  }
}

export function createSteamAchievementSync(options = {}) {
  return new SteamAchievementSync(options);
}
