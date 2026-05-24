const ACHIEVEMENT_ID_PATTERN = /^ACH_[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

function normalizeAchievementId(id) {
  const value = String(id || '').trim();
  return ACHIEVEMENT_ID_PATTERN.test(value) ? value : null;
}

function jsonSafe(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, jsonSafe(entryValue)]));
  }
  return value;
}

class SteamAchievementsBridge {
  constructor(options = {}) {
    this.steamClientBridge = options.steamClientBridge;
    this.logger = options.logger || console;
    this.statusReason = 'not_initialized';
    this.lastDiagnostics = null;
  }

  getStatus(extra = {}) {
    const steamStatus = this.steamClientBridge?.getStatus?.() || null;
    const achievementManager = this.steamClientBridge?.steam?.achievements || null;
    return {
      available: Boolean(steamStatus?.available && achievementManager),
      reason: extra.reason || this.statusReason || steamStatus?.reason || 'unknown',
      appId: steamStatus?.appId || null,
      sdkPathConfigured: Boolean(steamStatus?.sdkPathConfigured),
      nativeModuleLoaded: Boolean(steamStatus?.nativeModuleLoaded),
      achievementManagerPresent: Boolean(achievementManager),
      leaderboardBridgeStatus: steamStatus,
      lastDiagnostics: this.lastDiagnostics
    };
  }

  async getAchievementManager() {
    if (!this.steamClientBridge) {
      this.statusReason = 'steam_client_bridge_missing';
      return null;
    }
    const initialized = await this.steamClientBridge.initialize();
    if (!initialized) {
      this.statusReason = this.steamClientBridge.getStatus?.().reason || 'steam_unavailable';
      return null;
    }
    if (typeof this.steamClientBridge.steam?.user?.isLoggedOn === 'function' && !this.steamClientBridge.steam.user.isLoggedOn()) {
      this.statusReason = 'steam_user_not_logged_on';
      return null;
    }
    const manager = this.steamClientBridge.steam?.achievements || null;
    if (!manager) {
      this.statusReason = 'achievement_manager_missing';
      return null;
    }
    this.statusReason = 'ready';
    return manager;
  }

  async requestCurrentStats() {
    const manager = await this.getAchievementManager();
    if (!manager) {
      return { ok: false, status: this.getStatus(), reason: this.statusReason };
    }
    try {
      const achievements = typeof manager.getAllAchievements === 'function'
        ? await manager.getAllAchievements()
        : [];
      return {
        ok: true,
        status: this.getStatus(),
        count: Array.isArray(achievements) ? achievements.length : null,
        unlocked: Array.isArray(achievements) ? achievements.filter(entry => entry?.unlocked).length : null
      };
    } catch (error) {
      this.statusReason = 'request_current_stats_failed';
      return {
        ok: false,
        status: this.getStatus(),
        reason: this.statusReason,
        error: error?.message || String(error)
      };
    }
  }

  async getAllAchievements() {
    const manager = await this.getAchievementManager();
    if (!manager || typeof manager.getAllAchievements !== 'function') return [];
    return manager.getAllAchievements();
  }

  async getUnlockedAchievements(payload = {}) {
    const requestedIds = new Set((Array.isArray(payload.ids) ? payload.ids : []).map(normalizeAchievementId).filter(Boolean));
    const achievements = await this.getAllAchievements();
    return achievements
      .filter(entry => entry?.unlocked)
      .map(entry => normalizeAchievementId(entry.apiName || entry.id || entry.name))
      .filter(id => id && (requestedIds.size === 0 || requestedIds.has(id)));
  }

  async getAchievement(id) {
    const achievementId = normalizeAchievementId(id);
    if (!achievementId) return { ok: false, ignored: true, reason: 'invalid_achievement_id' };
    const manager = await this.getAchievementManager();
    if (!manager) return { ok: false, achievementId, reason: this.statusReason, status: this.getStatus() };
    try {
      let achievement = null;
      if (typeof manager.getAchievementByName === 'function') {
        achievement = await manager.getAchievementByName(achievementId);
      }
      if (!achievement && typeof manager.isAchievementUnlocked === 'function') {
        const unlocked = await manager.isAchievementUnlocked(achievementId);
        achievement = { apiName: achievementId, unlocked };
      }
      return {
        ok: true,
        achievementId,
        achievement: jsonSafe(achievement || { apiName: achievementId, unlocked: false }),
        unlocked: Boolean(achievement?.unlocked)
      };
    } catch (error) {
      return { ok: false, achievementId, reason: 'get_achievement_failed', error: error?.message || String(error) };
    }
  }

  async unlockAchievement(id) {
    const achievementId = normalizeAchievementId(id);
    if (!achievementId) return { ok: false, ignored: true, reason: 'invalid_achievement_id' };
    const manager = await this.getAchievementManager();
    if (!manager) return { ok: false, achievementId, reason: this.statusReason, status: this.getStatus() };
    try {
      const alreadyUnlocked = typeof manager.isAchievementUnlocked === 'function'
        ? Boolean(await manager.isAchievementUnlocked(achievementId))
        : false;
      if (alreadyUnlocked) {
        const result = {
          ok: true,
          achievementId,
          unlocked: true,
          alreadyUnlocked: true,
          stored: false,
          status: this.getStatus()
        };
        this.lastDiagnostics = { ...result, recordedAt: new Date().toISOString() };
        return result;
      }
      if (typeof manager.unlockAchievement !== 'function') {
        return { ok: false, achievementId, reason: 'unlock_method_missing', status: this.getStatus() };
      }
      const success = Boolean(await manager.unlockAchievement(achievementId));
      const result = {
        ok: success,
        achievementId,
        unlocked: success,
        alreadyUnlocked: false,
        stored: success,
        nativeMethodName: 'SetAchievement+StoreStats',
        status: this.getStatus()
      };
      this.lastDiagnostics = { ...result, recordedAt: new Date().toISOString() };
      if (!success) this.logger.warn?.('[SteamAchievementsBridge] unlock failed:', result);
      return result;
    } catch (error) {
      const result = {
        ok: false,
        achievementId,
        reason: 'unlock_failed',
        error: error?.message || String(error),
        status: this.getStatus()
      };
      this.lastDiagnostics = { ...result, recordedAt: new Date().toISOString() };
      this.logger.warn?.('[SteamAchievementsBridge] unlock exception:', result);
      return result;
    }
  }

  async syncUnlockedAchievements(payload = {}) {
    const ids = [...new Set((Array.isArray(payload.ids) ? payload.ids : []).map(normalizeAchievementId).filter(Boolean))];
    const manager = await this.getAchievementManager();
    if (!manager) {
      return { ok: false, reason: this.statusReason, synced: [], failed: ids, steamUnlockedIds: [], status: this.getStatus() };
    }
    const steamUnlockedIds = await this.getUnlockedAchievements().catch(() => []);
    const steamUnlocked = new Set(steamUnlockedIds);
    const synced = [];
    const skipped = [];
    const failed = [];
    for (const id of ids) {
      if (steamUnlocked.has(id)) {
        skipped.push(id);
        continue;
      }
      const result = await this.unlockAchievement(id);
      if (result.ok) synced.push(id);
      else failed.push(id);
    }
    const mergedSteamUnlockedIds = [...new Set([
      ...steamUnlockedIds,
      ...(await this.getUnlockedAchievements().catch(() => []))
    ])];
    const result = {
      ok: failed.length === 0,
      requested: ids,
      synced,
      skipped,
      failed,
      steamUnlockedIds: mergedSteamUnlockedIds,
      status: this.getStatus()
    };
    this.lastDiagnostics = { ...result, recordedAt: new Date().toISOString() };
    return result;
  }
}

function createSteamAchievementsBridge(options = {}) {
  return new SteamAchievementsBridge(options);
}

module.exports = {
  SteamAchievementsBridge,
  createSteamAchievementsBridge,
  normalizeAchievementId
};
