const fs = require('node:fs');
const path = require('node:path');

const STEAM_LEADERBOARD_NAME = 'nova_swarm_global_score';
const INT32_MAX = 2147483647;
const MAX_STEAM_DOWNLOAD_ENTRIES = 100;
const CALLBACK_POLL_MS = 250;

const FALLBACK_SORT_METHOD = {
  Ascending: 1,
  Descending: 2
};
const FALLBACK_DISPLAY_TYPE = {
  Numeric: 1,
  TimeSeconds: 2,
  TimeMilliseconds: 3
};
const FALLBACK_UPLOAD_METHOD = {
  KeepBest: 1,
  ForceUpdate: 2
};
const FALLBACK_DATA_REQUEST = {
  Global: 0,
  GlobalAroundUser: 1,
  Friends: 2,
  Users: 3
};

function integer(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function clampInt32(value) {
  return Math.max(0, Math.min(INT32_MAX, integer(value, 0)));
}

function readSteamAppId(rootDir) {
  const fromEnv = process.env.NOVA_SWARM_STEAM_APP_ID ||
    process.env.STEAM_APP_ID ||
    process.env.SteamAppId ||
    process.env.STEAMAPPID;
  if (fromEnv && /^\d+$/.test(String(fromEnv).trim())) return Number(fromEnv);

  const candidates = [
    path.join(rootDir, 'steam_appid.txt'),
    path.join(process.cwd(), 'steam_appid.txt')
  ];
  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8').trim();
      if (/^\d+$/.test(raw)) return Number(raw);
    } catch {
      // Missing local Steam app id files are expected in normal web/dev runs.
    }
  }
  return null;
}

function resolveSdkPath(rootDir) {
  const explicit = process.env.NOVA_SWARM_STEAMWORKS_SDK_PATH || process.env.STEAMWORKS_SDK_PATH;
  const candidates = [
    explicit,
    path.join(rootDir, 'steam_sdk', 'sdk'),
    path.join(rootDir, 'steam_sdk'),
    path.join(rootDir, 'steamworks_sdk'),
    path.join(rootDir, 'steamworks'),
    path.join(rootDir, 'release', 'desktop', 'win-unpacked', 'resources', 'steamworks_sdk'),
    process.resourcesPath ? path.join(process.resourcesPath, 'steamworks_sdk') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'steamworks_sdk') : null
  ].filter(Boolean);
  return candidates.find(candidate => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || explicit || null;
}

function requireNativeSteamworks() {
  try {
    return require('steamworks-ffi-node');
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') return null;
    throw error;
  }
}

function enumValue(nativeModule, enumName, key, fallback) {
  const value = nativeModule?.[enumName]?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function stringifySteamId(value) {
  if (value == null) return null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(Math.trunc(value)) : null;
  if (typeof value === 'object') {
    return stringifySteamId(value.steamId64 ?? value.steamID64 ?? value.steamId ?? value.id ?? value.accountId);
  }
  return null;
}

function publicFallbackName(steamId, index = 0) {
  const suffix = String(steamId || '').replace(/\D/g, '').slice(-4) || String(index + 1).padStart(2, '0');
  return `STEAM ${suffix}`.slice(0, 14);
}

function sanitizeDetails(details) {
  const values = Array.isArray(details) ? details : [];
  return values.slice(0, 64).map(clampInt32);
}

function detailsMetadata(details) {
  return {
    levelReached: details[0] ?? null,
    level: details[0] ?? null,
    shipId: details[1] ?? null,
    runTimeSeconds: details[2] ?? null,
    kills: details[3] ?? null,
    bossKills: details[4] ?? null,
    wavesCleared: details[5] ?? null
  };
}

function jsonSafe(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, jsonSafe(entryValue)]));
  }
  return value;
}

function asEntryArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.entries)) return value.entries;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

class SteamLeaderboardBridge {
  constructor(options = {}) {
    this.rootDir = options.rootDir || path.resolve(__dirname, '..');
    this.logger = options.logger || console;
    this.nativeModule = options.nativeModule;
    this.allowNativeLoad = options.allowNativeLoad !== false;
    this.appId = options.appId ?? readSteamAppId(this.rootDir);
    this.sdkPath = options.sdkPath ?? resolveSdkPath(this.rootDir);
    this.steam = null;
    this.initialized = false;
    this.initializing = null;
    this.disabled = process.env.NOVA_SWARM_DISABLE_STEAMWORKS === '1';
    this.statusReason = this.disabled ? 'disabled_by_env' : 'not_initialized';
    this.leaderboards = new Map();
    this.callbackTimer = null;
  }

  getStatus() {
    return {
      available: Boolean(this.initialized),
      reason: this.statusReason,
      appId: this.appId || null,
      sdkPathConfigured: Boolean(this.sdkPath),
      nativeModuleLoaded: Boolean(this.steam),
      leaderboardName: STEAM_LEADERBOARD_NAME
    };
  }

  loadNativeModule() {
    if (this.nativeModule !== undefined) return this.nativeModule;
    if (!this.allowNativeLoad) return null;
    this.nativeModule = requireNativeSteamworks();
    return this.nativeModule;
  }

  async initialize() {
    if (this.initialized) return true;
    if (this.initializing) return this.initializing;
    this.initializing = this.tryInitialize();
    try {
      return await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  async tryInitialize() {
    if (this.disabled) {
      this.statusReason = 'disabled_by_env';
      return false;
    }
    if (!this.appId) {
      this.statusReason = 'steam_app_id_missing';
      return false;
    }

    let nativeModule = null;
    try {
      nativeModule = this.loadNativeModule();
    } catch (error) {
      this.statusReason = `native_load_failed: ${error?.message || error}`;
      return false;
    }

    if (!nativeModule) {
      this.statusReason = 'steamworks-ffi-node_not_installed';
      return false;
    }

    const sdkClass = nativeModule.SteamworksSDK || nativeModule.default || nativeModule;
    if (!sdkClass?.getInstance) {
      this.statusReason = 'steamworks_sdk_getInstance_missing';
      return false;
    }

    try {
      this.steam = sdkClass.getInstance();
      if (this.sdkPath && typeof this.steam.setSdkPath === 'function') {
        this.steam.setSdkPath(this.sdkPath);
      }
      if (process.env.NOVA_SWARM_STEAMWORKS_DEBUG === '1' && typeof this.steam.setDebug === 'function') {
        this.steam.setDebug(true);
      }
      const initOptions = this.appId ? { appId: this.appId } : {};
      const didInit = this.steam.init(initOptions);
      if (!didInit) {
        this.statusReason = this.appId ? 'steam_init_returned_false' : 'steam_app_id_missing_or_init_failed';
        return false;
      }
      if (!this.steam.leaderboards) {
        this.statusReason = 'leaderboard_manager_missing';
        this.initialized = false;
        return false;
      }
      this.initialized = true;
      this.statusReason = 'ready';
      this.startCallbackPolling();
      return true;
    } catch (error) {
      this.statusReason = `steam_init_failed: ${error?.message || error}`;
      this.initialized = false;
      return false;
    }
  }

  startCallbackPolling() {
    if (this.callbackTimer || typeof this.steam?.runCallbacks !== 'function') return;
    this.callbackTimer = setInterval(() => {
      try {
        this.steam.runCallbacks();
      } catch (error) {
        this.logger.warn?.('[SteamLeaderboardBridge] runCallbacks failed:', error?.message || error);
      }
    }, CALLBACK_POLL_MS);
    this.callbackTimer.unref?.();
  }

  async isAvailable() {
    if (!await this.initialize()) return false;
    if (typeof this.steam?.user?.isLoggedOn === 'function' && !this.steam.user.isLoggedOn()) {
      this.statusReason = 'steam_user_not_logged_on';
      return false;
    }
    try {
      const name = await this.getPersonaName();
      return Boolean(name);
    } catch {
      this.statusReason = 'persona_unavailable';
      return false;
    }
  }

  async getPersonaName() {
    if (!await this.initialize()) return 'STEAM PILOT';
    try {
      const name = this.steam.friends?.getPersonaName?.() ||
        this.steam.localplayer?.getName?.() ||
        'STEAM PILOT';
      return String(name || 'STEAM PILOT').slice(0, 64);
    } catch {
      return 'STEAM PILOT';
    }
  }

  getCurrentSteamId() {
    try {
      return stringifySteamId(
        this.steam?.getStatus?.()?.steamId ??
        this.steam?.localplayer?.getSteamId?.()
      );
    } catch {
      return null;
    }
  }

  async getLeaderboard(leaderboardName = STEAM_LEADERBOARD_NAME) {
    const safeName = String(leaderboardName || STEAM_LEADERBOARD_NAME);
    if (this.leaderboards.has(safeName)) return this.leaderboards.get(safeName);
    if (!await this.initialize()) throw new Error(this.statusReason || 'Steam unavailable');

    const manager = this.steam.leaderboards;
    let leaderboard = null;
    if (typeof manager.findLeaderboard === 'function') {
      leaderboard = await manager.findLeaderboard(safeName);
    }
    if (!leaderboard && process.env.NOVA_SWARM_STEAM_FIND_OR_CREATE === '1' && typeof manager.findOrCreateLeaderboard === 'function') {
      const nativeModule = this.loadNativeModule();
      leaderboard = await manager.findOrCreateLeaderboard(
        safeName,
        enumValue(nativeModule, 'LeaderboardSortMethod', 'Descending', FALLBACK_SORT_METHOD.Descending),
        enumValue(nativeModule, 'LeaderboardDisplayType', 'Numeric', FALLBACK_DISPLAY_TYPE.Numeric)
      );
    }
    if (!leaderboard?.handle) {
      throw new Error(`Steam leaderboard not found: ${safeName}`);
    }
    this.leaderboards.set(safeName, leaderboard);
    return leaderboard;
  }

  async nameForEntry(entry, index) {
    const explicit = entry.playerName || entry.personaName || entry.name || entry.displayName || entry.steamName;
    if (explicit) return String(explicit).slice(0, 64);
    const steamId = stringifySteamId(entry.steamId ?? entry.steamID ?? entry.m_steamIDUser);
    const currentId = this.getCurrentSteamId();
    if (steamId && currentId && steamId === currentId) return this.getPersonaName();
    try {
      const friendName = steamId ? this.steam.friends?.getFriendPersonaName?.(steamId) : null;
      if (friendName) return String(friendName).slice(0, 64);
    } catch {
      // Non-friend global rows may only expose Steam IDs.
    }
    return publicFallbackName(steamId, index);
  }

  async normalizeEntries(entries = []) {
    const currentId = this.getCurrentSteamId();
    return Promise.all((Array.isArray(entries) ? entries : []).map(async (entry, index) => {
      const details = sanitizeDetails(entry.details ?? entry.scoreDetails ?? entry.m_pDetails);
      const steamId = stringifySteamId(entry.steamId ?? entry.steamID ?? entry.m_steamIDUser);
      const metadata = detailsMetadata(details);
      return {
        rank: integer(entry.globalRank ?? entry.rank ?? entry.m_nGlobalRank, index + 1),
        globalRank: integer(entry.globalRank ?? entry.rank ?? entry.m_nGlobalRank, index + 1),
        playerName: await this.nameForEntry(entry, index),
        score: clampInt32(entry.score ?? entry.m_nScore),
        details,
        metadata,
        level: metadata.levelReached || 1,
        levelReached: metadata.levelReached || 1,
        shipId: metadata.shipId,
        runTimeSeconds: metadata.runTimeSeconds,
        kills: metadata.kills,
        bossKills: metadata.bossKills,
        wavesCleared: metadata.wavesCleared,
        steamId,
        isCurrentPlayer: Boolean(steamId && currentId && steamId === currentId),
        ugcHandle: stringifySteamId(entry.ugcHandle ?? entry.m_hUGC) || null,
        source: 'steam'
      };
    }));
  }

  async getTopScores(options = {}) {
    const leaderboard = await this.getLeaderboard(options.leaderboardName);
    const nativeModule = this.loadNativeModule();
    const limit = Math.max(1, Math.min(MAX_STEAM_DOWNLOAD_ENTRIES, integer(options.limit, 20)));
    const start = Math.max(1, integer(options.start, 1));
    const end = Math.max(start, Math.min(MAX_STEAM_DOWNLOAD_ENTRIES, integer(options.end, start + limit - 1)));
    const raw = await this.steam.leaderboards.downloadLeaderboardEntries(
      leaderboard.handle,
      enumValue(nativeModule, 'LeaderboardDataRequest', 'Global', FALLBACK_DATA_REQUEST.Global),
      start,
      end
    );
    return this.normalizeEntries(asEntryArray(raw));
  }

  async getFriendsScores(options = {}) {
    const leaderboard = await this.getLeaderboard(options.leaderboardName);
    const nativeModule = this.loadNativeModule();
    const raw = await this.steam.leaderboards.downloadLeaderboardEntries(
      leaderboard.handle,
      enumValue(nativeModule, 'LeaderboardDataRequest', 'Friends', FALLBACK_DATA_REQUEST.Friends),
      0,
      0
    );
    const entries = await this.normalizeEntries(asEntryArray(raw));
    return entries.map(entry => ({ ...entry, source: 'steam-friends' }));
  }

  async submitScore(payload = {}) {
    const leaderboard = await this.getLeaderboard(payload.leaderboardName);
    const nativeModule = this.loadNativeModule();
    const score = clampInt32(payload.score);
    const details = sanitizeDetails(payload.details);
    const uploadMethod = String(payload.uploadMethod || '').toLowerCase() === 'force_update'
      ? enumValue(nativeModule, 'LeaderboardUploadScoreMethod', 'ForceUpdate', FALLBACK_UPLOAD_METHOD.ForceUpdate)
      : enumValue(nativeModule, 'LeaderboardUploadScoreMethod', 'KeepBest', FALLBACK_UPLOAD_METHOD.KeepBest);

    const uploader = this.steam.leaderboards.uploadScore || this.steam.leaderboards.uploadLeaderboardScore;
    if (typeof uploader !== 'function') {
      throw new Error('Steam leaderboard upload method unavailable');
    }
    const result = await uploader.call(
      this.steam.leaderboards,
      leaderboard.handle,
      score,
      uploadMethod,
      details
    );
    if (!result || result.success === false) {
      throw new Error('Steam leaderboard upload failed');
    }
    return jsonSafe({
      success: true,
      leaderboardName: payload.leaderboardName || STEAM_LEADERBOARD_NAME,
      score,
      details,
      rank: result.globalRankNew ?? result.globalRank ?? result.rank ?? null,
      globalRank: result.globalRankNew ?? result.globalRank ?? result.rank ?? null,
      previousRank: result.globalRankPrevious ?? null,
      scoreChanged: Boolean(result.scoreChanged ?? true),
      response: result
    });
  }

  shutdown() {
    if (this.callbackTimer) {
      clearInterval(this.callbackTimer);
      this.callbackTimer = null;
    }
    try {
      this.steam?.shutdown?.();
    } catch {
      // Shutdown is best effort during app quit.
    }
    this.initialized = false;
    this.statusReason = this.statusReason === 'ready' ? 'shutdown' : this.statusReason;
  }
}

function createSteamLeaderboardBridge(options = {}) {
  return new SteamLeaderboardBridge(options);
}

module.exports = {
  STEAM_LEADERBOARD_NAME,
  SteamLeaderboardBridge,
  createSteamLeaderboardBridge,
  sanitizeDetails,
  stringifySteamId
};
