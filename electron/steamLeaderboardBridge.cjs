const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_STEAM_LEADERBOARD_NAME = 'nova_swarm_global_score_v2';
const STEAM_LEADERBOARD_NAME = process.env.NOVA_SWARM_STEAM_LEADERBOARD_NAME || DEFAULT_STEAM_LEADERBOARD_NAME;
const INT32_MAX = 2147483647;
const MAX_STEAM_DOWNLOAD_ENTRIES = 100;
const CALLBACK_POLL_MS = 250;
const REQUEST_CURRENT_STATS_TIMEOUT_MS = 8000;
const USER_STATS_RECEIVED_CALLBACK_ID = 1101;
const LEADERBOARD_SCORE_UPLOADED_CALLBACK_ID = 1106;
const ERESULT_OK = 1;
const STEAM_BACKEND_REJECTED_UNKNOWN_REASON_MESSAGE = 'Steam accepted the UploadLeaderboardScore call and returned LeaderboardScoreUploaded_t, but m_bSuccess was 0. Details overflow is ruled out, and Steamworks settings appear client writable because Writer/Skriver is "-". Remaining likely causes are missing or failed RequestCurrentStats/UserStatsReceived_t readiness, non Steam client launch context, app/package/pre release entitlement, or Steam backend rejection.';

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

let koffiModule = undefined;
let leaderboardScoreUploadedStruct = null;
let userStatsReceivedStruct = null;

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
    process.execPath ? path.join(path.dirname(process.execPath), 'steam_appid.txt') : null,
    process.resourcesPath ? path.join(path.dirname(process.resourcesPath), 'steam_appid.txt') : null,
    path.join(rootDir, 'steam_appid.txt'),
    path.join(process.cwd(), 'steam_appid.txt')
  ].filter(Boolean);
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

function requireKoffi() {
  if (koffiModule !== undefined) return koffiModule;
  try {
    koffiModule = require('koffi');
  } catch {
    koffiModule = null;
  }
  return koffiModule;
}

function getLeaderboardScoreUploadedStruct(koffi) {
  if (leaderboardScoreUploadedStruct) return leaderboardScoreUploadedStruct;
  leaderboardScoreUploadedStruct = koffi.struct('NovaLeaderboardScoreUploaded_t', {
    m_bSuccess: 'uint8',
    m_hSteamLeaderboard: 'uint64',
    m_nScore: 'int32',
    m_bScoreChanged: 'uint8',
    m_nGlobalRankNew: 'int',
    m_nGlobalRankPrevious: 'int'
  });
  return leaderboardScoreUploadedStruct;
}

function getUserStatsReceivedStruct(koffi) {
  if (userStatsReceivedStruct) return userStatsReceivedStruct;
  userStatsReceivedStruct = koffi.struct('NovaUserStatsReceived_t', {
    m_nGameID: 'uint64',
    m_eResult: 'int',
    m_steamIDUser: 'uint64'
  });
  return userStatsReceivedStruct;
}

function parseUserStatsReceivedBuffer(koffi, resultBuffer, resultStruct, expectedSteamId = null) {
  const size = Math.max(24, koffi.sizeof(resultStruct));
  const rawBytes = koffi.decode(resultBuffer, koffi.array('uint8', size));
  const buffer = Buffer.from(rawBytes);
  const expected = stringifySteamId(expectedSteamId);
  const candidates = [12, 16]
    .filter(offset => offset + 8 <= buffer.length)
    .map(offset => ({
      offset,
      value: buffer.readBigUInt64LE(offset).toString()
    }));
  const selected = (expected && candidates.find(candidate => candidate.value === expected)) ||
    candidates.find(candidate => /^7656119\d{10}$/.test(candidate.value)) ||
    candidates[0] ||
    { offset: null, value: null };
  return {
    m_nGameID: buffer.readBigUInt64LE(0).toString(),
    m_eResult: buffer.readInt32LE(8),
    m_steamIDUser: selected.value,
    m_steamIDUserOffset: selected.offset,
    m_steamIDUserCandidates: candidates
  };
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

function uint64BigInt(value) {
  const text = stringifySteamId(value);
  if (!text || !/^\d+$/.test(text)) return null;
  try {
    return BigInt(text);
  } catch {
    return null;
  }
}

function resolveLeaderboardName(leaderboardName) {
  const requested = String(leaderboardName || process.env.NOVA_SWARM_STEAM_LEADERBOARD_NAME || STEAM_LEADERBOARD_NAME || DEFAULT_STEAM_LEADERBOARD_NAME).trim();
  return requested || DEFAULT_STEAM_LEADERBOARD_NAME;
}

function publicFallbackName(steamId, index = 0) {
  const suffix = String(steamId || '').replace(/\D/g, '').slice(-4) || String(index + 1).padStart(2, '0');
  return `STEAM ${suffix}`.slice(0, 14);
}

function sanitizeDetails(details) {
  const values = parseDetailsValue(details);
  return values.slice(0, 64).map(clampInt32);
}

function parseHexDetailsString(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const compact = text.replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
  if (compact.length < 8 || compact.length % 8 !== 0) return [];
  const values = [];
  for (let index = 0; index + 8 <= compact.length && values.length < 64; index += 8) {
    const chunk = compact.slice(index, index + 8);
    const b0 = Number.parseInt(chunk.slice(0, 2), 16);
    const b1 = Number.parseInt(chunk.slice(2, 4), 16);
    const b2 = Number.parseInt(chunk.slice(4, 6), 16);
    const b3 = Number.parseInt(chunk.slice(6, 8), 16);
    if ([b0, b1, b2, b3].some(byte => !Number.isFinite(byte))) continue;
    values.push(b0 | (b1 << 8) | (b2 << 16) | (b3 << 24));
  }
  return values;
}

function parseDetailsValue(details) {
  if (details === null || details === undefined || details === '') return [];
  if (Array.isArray(details)) return details;
  if (ArrayBuffer.isView(details) && typeof details.length === 'number') return Array.from(details);
  if (typeof details === 'string') {
    const hexDetails = parseHexDetailsString(details);
    if (hexDetails.length) return hexDetails;
    return (details.match(/-?\d+/g) || []).map(Number);
  }
  if (typeof details === 'object' && Number.isFinite(Number(details.length))) {
    return Array.from({ length: Number(details.length) }, (_, index) => details[index]);
  }
  return [];
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

function readScoreLevel(entry = {}, metadata = {}, details = [], fallback = 1) {
  for (const value of [
    metadata.level,
    metadata.levelReached,
    entry.metadata?.level,
    entry.metadata?.levelReached,
    details[0]
  ]) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed));
  }
  for (const value of [entry.level, entry.levelReached]) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) continue;
    const level = Math.max(1, Math.floor(parsed));
    if (level === 1 && details.length === 0 && Math.max(1, Math.floor(Number(fallback) || 1)) > 1) continue;
    return level;
  }
  return Math.max(1, Math.floor(Number(fallback) || 1));
}

function estimateLevelFromScore(score) {
  const normalizedScore = Math.max(0, integer(score, 0));
  if (normalizedScore <= 0) return 1;
  return Math.max(1, Math.min(99, Math.floor(normalizedScore / 5000) + 1));
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

function resolveUploadMethod(nativeModule, requestedMethod) {
  const forceUpdate = String(requestedMethod || '').toLowerCase() === 'force_update';
  const key = forceUpdate ? 'ForceUpdate' : 'KeepBest';
  const value = enumValue(nativeModule, 'LeaderboardUploadScoreMethod', key, FALLBACK_UPLOAD_METHOD[key]);
  return {
    requested: requestedMethod || 'keep_best',
    key,
    label: forceUpdate ? 'force_update' : 'keep_best',
    value
  };
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
    this.lastUploadDiagnostics = null;
    this.uploadInFlight = false;
  }

  getStatus() {
    return {
      available: Boolean(this.initialized),
      reason: this.statusReason,
      appId: this.appId || null,
      sdkPathConfigured: Boolean(this.sdkPath),
      nativeModuleLoaded: Boolean(this.steam),
      leaderboardName: resolveLeaderboardName()
    };
  }

  getLastUploadDiagnostics() {
    return this.lastUploadDiagnostics;
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

  async getCurrentGameLanguage() {
    if (!await this.initialize()) return null;
    try {
      const language = this.steam?.getCurrentGameLanguage?.() ||
        this.steam?.apps?.getCurrentGameLanguage?.() ||
        null;
      return typeof language === 'string' && language.trim() ? language.trim() : null;
    } catch {
      return null;
    }
  }

  async getLeaderboard(leaderboardName = STEAM_LEADERBOARD_NAME) {
    const safeName = resolveLeaderboardName(leaderboardName);
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
      const details = sanitizeDetails(
        entry.details ??
        entry.scoreDetails ??
        entry.m_pDetails ??
        entry.detailsHex ??
        entry.scoreDetailsHex ??
        entry.metadata?.details
      );
      const steamId = stringifySteamId(entry.steamId ?? entry.steamID ?? entry.m_steamIDUser);
      const metadata = detailsMetadata(details);
      const level = readScoreLevel(entry, metadata, details, estimateLevelFromScore(entry.score ?? entry.m_nScore));
      return {
        rank: integer(entry.globalRank ?? entry.rank ?? entry.m_nGlobalRank, index + 1),
        globalRank: integer(entry.globalRank ?? entry.rank ?? entry.m_nGlobalRank, index + 1),
        playerName: await this.nameForEntry(entry, index),
        score: clampInt32(entry.score ?? entry.m_nScore),
        details,
        metadata,
        level,
        levelReached: level,
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
    const result = await this.submitScoreDetailed(payload);
    if (!result.success) {
      const error = new Error(result.interpretedStatus || 'Steam leaderboard upload failed');
      error.steamUpload = result;
      throw error;
    }
    return result;
  }

  async submitScoreDetailed(payload = {}) {
    const leaderboardName = resolveLeaderboardName(payload.leaderboardName);
    const score = clampInt32(payload.score);
    const hasDetails = Object.prototype.hasOwnProperty.call(payload, 'details');
    const details = hasDetails ? sanitizeDetails(payload.details) : undefined;

    if (this.uploadInFlight) {
      return this.recordUploadResult(jsonSafe({
        success: false,
        accepted: false,
        interpretedStatus: 'upload_already_in_flight',
        nativeErrorMessage: 'Steam allows only one outstanding UploadLeaderboardScore call at a time. This submit was skipped before calling Steam.',
        leaderboardName,
        score,
        details: hasDetails ? details : [],
        requestCurrentStats: null,
        diagnostics: {
          leaderboardName,
          uploadSuppressed: true,
          uploadInFlight: true,
          steamUploadLimit: 'Steam allows only one outstanding leaderboard upload call at a time.'
        }
      }));
    }

    this.uploadInFlight = true;
    try {
      return await this.submitScoreDetailedGuarded({
        ...payload,
        leaderboardName,
        score,
        details,
        hasDetails
      });
    } finally {
      this.uploadInFlight = false;
    }
  }

  async submitScoreDetailedGuarded(payload = {}) {
    const leaderboardName = resolveLeaderboardName(payload.leaderboardName);
    const requestCurrentStats = await this.requestCurrentStats({ timeoutMs: REQUEST_CURRENT_STATS_TIMEOUT_MS });
    if (requestCurrentStats.available && requestCurrentStats.attempted && requestCurrentStats.returned === false) {
      return this.recordUploadResult(jsonSafe({
        success: false,
        accepted: false,
        interpretedStatus: 'request_current_stats_failed',
        nativeErrorMessage: requestCurrentStats.error || 'RequestCurrentStats/UserStatsReceived_t readiness failed before UploadLeaderboardScore.',
        leaderboardName,
        score: payload.score,
        details: payload.hasDetails ? payload.details : [],
        requestCurrentStats,
        diagnostics: {
          leaderboardName,
          requestCurrentStats,
          uploadSuppressed: true,
          uploadSuppressedReason: 'request_current_stats_failed'
        }
      }));
    }
    if (
      requestCurrentStats.available &&
      requestCurrentStats.attempted &&
      requestCurrentStats.callbackObserved === false &&
      requestCurrentStats.result?.bIOFailureCaptured === true
    ) {
      return this.recordUploadResult(jsonSafe({
        success: false,
        accepted: false,
        interpretedStatus: 'request_current_stats_timeout',
        nativeErrorMessage: requestCurrentStats.error || 'Timed out waiting for UserStatsReceived_t before UploadLeaderboardScore.',
        leaderboardName,
        score: payload.score,
        details: payload.hasDetails ? payload.details : [],
        requestCurrentStats,
        diagnostics: {
          leaderboardName,
          requestCurrentStats,
          uploadSuppressed: true,
          uploadSuppressedReason: 'request_current_stats_timeout'
        }
      }));
    }
    if (requestCurrentStats.available && requestCurrentStats.callbackObserved && requestCurrentStats.ok === false) {
      return this.recordUploadResult(jsonSafe({
        success: false,
        accepted: false,
        interpretedStatus: 'user_stats_received_not_ok',
        nativeErrorMessage: `UserStatsReceived_t returned m_eResult=${requestCurrentStats.result?.m_eResult ?? 'unknown'} before UploadLeaderboardScore.`,
        leaderboardName,
        score: payload.score,
        details: payload.hasDetails ? payload.details : [],
        requestCurrentStats,
        diagnostics: {
          leaderboardName,
          requestCurrentStats,
          uploadSuppressed: true,
          uploadSuppressedReason: 'user_stats_received_not_ok'
        }
      }));
    }

    const leaderboard = await this.getLeaderboard(leaderboardName);
    const nativeModule = this.loadNativeModule();
    const score = clampInt32(payload.score);
    const hasDetails = Boolean(payload.hasDetails);
    const details = hasDetails ? sanitizeDetails(payload.details) : undefined;
    const uploadMethod = resolveUploadMethod(nativeModule, payload.uploadMethod);
    const uploader = this.steam.leaderboards.uploadScore || this.steam.leaderboards.uploadLeaderboardScore;
    const nativeMethodName = this.steam.leaderboards.uploadScore ? 'uploadScore' : 'uploadLeaderboardScore';
    const diagnostics = {
      leaderboardName,
      leaderboardHandlePresent: Boolean(leaderboard?.handle),
      leaderboardHandle: stringifySteamId(leaderboard?.handle),
      nativeMethodName,
      uploadMethod,
      score,
      detailsMode: hasDetails ? (details.length ? 'array' : 'empty') : 'omitted',
      detailsCount: hasDetails ? details.length : 0,
      detailsSubmitted: hasDetails ? details : null,
      requestCurrentStats,
      callbackPollingActive: Boolean(this.callbackTimer),
      wrapperSignature: 'uploadScore(leaderboardHandle, score, uploadMethod, details?)',
      steamworksSignature: 'UploadLeaderboardScore(hSteamLeaderboard, eLeaderboardUploadScoreMethod, nScore, pScoreDetails, cScoreDetailsCount)',
      steamworksVisualSettings: {
        leaderboardName,
        sort: 'Descending / Synkende',
        display: 'Numeric / Numerisk',
        writer: '-',
        reader: '-',
        lobby: '-',
        source: 'User-confirmed Steamworks screenshot on 2026-05-25'
      }
    };
    if (typeof uploader !== 'function') {
      return this.recordUploadResult(jsonSafe({
        success: false,
        accepted: false,
        interpretedStatus: 'native_upload_method_unavailable',
        leaderboardName,
        score,
        details: hasDetails ? details : [],
        requestCurrentStats,
        diagnostics
      }));
    }

    let rawSdkUpload = null;
    try {
      rawSdkUpload = await this.uploadScoreViaRawSdk({
        leaderboard,
        score,
        uploadMethod,
        details,
        hasDetails
      });
    } catch (error) {
      rawSdkUpload = {
        available: false,
        reason: 'raw_sdk_exception',
        diagnostics: {
          errorMessage: error?.message || String(error)
        }
      };
      this.logger.warn?.('[SteamLeaderboardBridge] raw SDK upload diagnostics unavailable:', error?.message || error);
    }
    if (rawSdkUpload.available) {
      const rawResult = rawSdkUpload.rawResult;
      const accepted = Boolean(rawResult?.m_bSuccess);
      const scoreChanged = rawResult?.m_bScoreChanged == null ? null : rawResult.m_bScoreChanged === 1;
      let interpretedStatus = accepted ? 'accepted' : 'steam_callback_m_bSuccess_false';
      let nativeErrorMessage = accepted ? null : 'Steam returned LeaderboardScoreUploaded_t.m_bSuccess=0. With detailsCount <= 64, this usually points to Steamworks write policy/state rather than local metadata formatting.';
      const rejectedUnknownReason = !accepted &&
        diagnostics.leaderboardHandlePresent &&
        diagnostics.detailsCount <= 64 &&
        uploadMethod.value === FALLBACK_UPLOAD_METHOD.KeepBest &&
        rawSdkUpload.diagnostics?.callbackReturned;
      if (rejectedUnknownReason) {
        interpretedStatus = 'steam_backend_rejected_unknown_reason';
        nativeErrorMessage = STEAM_BACKEND_REJECTED_UNKNOWN_REASON_MESSAGE;
      }
      if (accepted && scoreChanged === false) interpretedStatus = 'accepted_keep_best_not_changed';
      return this.recordUploadResult(jsonSafe({
        success: accepted,
        accepted,
        interpretedStatus,
        nativeErrorMessage,
        leaderboardName,
        score,
        details: hasDetails ? details : [],
        rank: rawResult?.m_nGlobalRankNew ?? null,
        globalRank: rawResult?.m_nGlobalRankNew ?? null,
        previousRank: rawResult?.m_nGlobalRankPrevious ?? null,
        scoreChanged,
        requestCurrentStats,
        diagnostics: {
          ...diagnostics,
          nativeMethodName: 'SteamAPI_ISteamUserStats_UploadLeaderboardScore',
          selectedUploadPath: 'raw_sdk_diagnostic',
          uploadSignatureUsed: 'SteamAPI_ISteamUserStats_UploadLeaderboardScore(userStats, handle, method, score, detailsPtr, detailsCount)',
          rawSdkDiagnostics: rawSdkUpload.diagnostics
        },
        rawResult,
        response: rawResult
      }));
    }

    const uploadArgs = [
      leaderboard.handle,
      score,
      uploadMethod.value
    ];
    if (hasDetails) uploadArgs.push(details);
    const result = await uploader.call(this.steam.leaderboards, ...uploadArgs);
    const accepted = Boolean(result && result.success !== false);
    const scoreChanged = result?.scoreChanged ?? null;
    let interpretedStatus = 'accepted';
    let nativeErrorMessage = null;
    if (!result) {
      interpretedStatus = 'steam_rejected_or_wrapper_returned_null';
      nativeErrorMessage = 'steamworks-ffi-node returned null after UploadLeaderboardScore; its native callback reported the upload was not successful.';
    } else if (result.success === false) {
      interpretedStatus = 'wrapper_reported_success_false';
      nativeErrorMessage = result.error || result.message || 'steamworks-ffi-node returned success=false.';
    } else if (scoreChanged === false) {
      interpretedStatus = 'accepted_keep_best_not_changed';
    }
    return this.recordUploadResult(jsonSafe({
      success: accepted,
      accepted,
      interpretedStatus,
      nativeErrorMessage,
      leaderboardName,
      score,
      details: hasDetails ? details : [],
      rank: result?.globalRankNew ?? result?.globalRank ?? result?.rank ?? null,
      globalRank: result?.globalRankNew ?? result?.globalRank ?? result?.rank ?? null,
      previousRank: result?.globalRankPrevious ?? null,
      scoreChanged,
      requestCurrentStats,
      diagnostics: {
        ...diagnostics,
        selectedUploadPath: 'wrapper',
        rawSdkDiagnostics: rawSdkUpload?.diagnostics || null,
        rawSdkUnavailableReason: rawSdkUpload?.reason || null,
        uploadSignatureUsed: hasDetails
          ? `${nativeMethodName}(leaderboardHandle, score, uploadMethod, details)`
          : `${nativeMethodName}(leaderboardHandle, score, uploadMethod)`
      },
      rawResult: result || null,
      response: result || null
    }));
  }

  async requestCurrentStats(options = {}) {
    const startedAt = Date.now();
    const result = {
      attempted: false,
      available: false,
      returned: false,
      callbackObserved: false,
      ok: false,
      result: null,
      durationMs: 0,
      error: null
    };

    try {
      if (!await this.initialize()) {
        result.error = this.statusReason || 'steam_unavailable';
        return { ...result, durationMs: Date.now() - startedAt };
      }

      const manager = this.steam?.leaderboards;
      const libraryLoader = manager?.libraryLoader;
      const apiCore = manager?.apiCore;
      const userStatsInterface = apiCore?.getUserStatsInterface?.();
      const requestUserStats = libraryLoader?.SteamAPI_ISteamUserStats_RequestUserStats ||
        libraryLoader?.SteamAPI_ISteamUserStats_RequestCurrentStats;
      result.available = Boolean(libraryLoader && apiCore && userStatsInterface && typeof requestUserStats === 'function');
      result.result = {
        userStatsInterfacePresent: Boolean(userStatsInterface),
        requestCurrentStatsFlatExportAvailable: false,
        requestUserStatsAvailable: typeof requestUserStats === 'function',
        method: 'SteamAPI_ISteamUserStats_RequestUserStats(current user) used as observable UserStatsReceived_t gate',
        note: 'steamworks-ffi-node 0.10.3 does not expose a flat RequestCurrentStats bool call; RequestUserStats for the current user returns a SteamAPICall_t that can be observed as UserStatsReceived_t.'
      };
      if (!result.available) {
        result.error = 'user_stats_request_api_unavailable';
        return { ...result, durationMs: Date.now() - startedAt };
      }

      const steamId = uint64BigInt(this.getCurrentSteamId());
      result.result.steamId = steamId ? steamId.toString() : null;
      if (!steamId) {
        result.error = 'current_steam_id_unavailable';
        return { ...result, durationMs: Date.now() - startedAt };
      }

      result.attempted = true;
      const callHandle = requestUserStats(userStatsInterface, steamId);
      result.returned = !(callHandle === BigInt(0) || callHandle === 0 || callHandle == null);
      result.result.callHandle = stringifySteamId(callHandle);
      if (!result.returned) {
        result.error = 'request_user_stats_returned_invalid_call_handle';
        return { ...result, durationMs: Date.now() - startedAt };
      }

      const koffi = requireKoffi();
      if (!koffi) {
        result.error = 'koffi_unavailable_for_user_stats_received';
        result.ok = true;
        return { ...result, durationMs: Date.now() - startedAt };
      }

      const poll = await this.pollApiCallResultDetailed({
        callHandle,
        resultStruct: getUserStatsReceivedStruct(koffi),
        callbackId: USER_STATS_RECEIVED_CALLBACK_ID,
        expectedSteamId: steamId.toString(),
        timeoutMs: Math.max(1000, integer(options.timeoutMs, REQUEST_CURRENT_STATS_TIMEOUT_MS)),
        delayMs: 100
      });
      result.callbackObserved = Boolean(poll.callbackObserved);
      result.result = {
        ...result.result,
        callbackId: USER_STATS_RECEIVED_CALLBACK_ID,
        bIOFailureCaptured: poll.bIOFailureCaptured ?? false,
        bIOFailure: poll.bIOFailure ?? null,
        getApiCallResultSuccess: poll.getApiCallResultSuccess ?? null,
        callFailureReason: poll.failureReason ?? null,
        pollDurationMs: poll.durationMs,
        ...(poll.rawResult || {})
      };
      result.ok = Boolean(poll.callbackObserved && poll.rawResult?.m_eResult === ERESULT_OK && !poll.bIOFailure);
      if (!poll.callbackObserved) result.error = poll.error || poll.reason || 'user_stats_received_callback_not_observed';
      if (poll.callbackObserved && !result.ok) result.error = `user_stats_received_result_${poll.rawResult?.m_eResult ?? 'unknown'}`;
      result.durationMs = Date.now() - startedAt;
      return jsonSafe(result);
    } catch (error) {
      return jsonSafe({
        ...result,
        durationMs: Date.now() - startedAt,
        error: error?.message || String(error)
      });
    }
  }

  async pollApiCallResultDetailed({ callHandle, resultStruct, callbackId, expectedSteamId = null, timeoutMs = 8000, delayMs = 100 }) {
    const startedAt = Date.now();
    const manager = this.steam?.leaderboards;
    const libraryLoader = manager?.libraryLoader;
    const apiCore = manager?.apiCore;
    const koffi = requireKoffi();
    if (!koffi || !libraryLoader || !apiCore) {
      return {
        callbackObserved: false,
        rawResult: null,
        bIOFailureCaptured: false,
        durationMs: Date.now() - startedAt,
        reason: 'raw_polling_primitives_unavailable'
      };
    }
    const utilsInterface = apiCore.getUtilsInterface?.();
    const hasDetailedPolling =
      Boolean(utilsInterface) &&
      typeof libraryLoader.SteamAPI_ISteamUtils_IsAPICallCompleted === 'function' &&
      typeof libraryLoader.SteamAPI_ISteamUtils_GetAPICallResult === 'function';
    if (!hasDetailedPolling) {
      return {
        callbackObserved: false,
        rawResult: null,
        bIOFailureCaptured: false,
        durationMs: Date.now() - startedAt,
        reason: 'is_api_call_completed_or_get_api_call_result_unavailable'
      };
    }

    while (Date.now() - startedAt < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      try {
        apiCore.runCallbacks?.();
      } catch {
        try {
          this.steam?.runCallbacks?.();
        } catch {
          // Callback pumping is best effort during diagnostics.
        }
      }

      const failed = koffi.alloc('bool', 1);
      const completed = libraryLoader.SteamAPI_ISteamUtils_IsAPICallCompleted(utilsInterface, callHandle, failed);
      const completedFailure = Boolean(koffi.decode(failed, 'bool'));
      if (!completed) continue;

      const resultBuffer = koffi.alloc(resultStruct, 1);
      const failedResult = koffi.alloc('bool', 1);
      const getApiCallResultSuccess = libraryLoader.SteamAPI_ISteamUtils_GetAPICallResult(
        utilsInterface,
        callHandle,
        resultBuffer,
        koffi.sizeof(resultStruct),
        callbackId,
        failedResult
      );
      const bIOFailure = Boolean(koffi.decode(failedResult, 'bool'));
      const failureReason = (!getApiCallResultSuccess || bIOFailure || completedFailure) &&
        typeof libraryLoader.SteamAPI_ISteamUtils_GetAPICallFailureReason === 'function'
        ? libraryLoader.SteamAPI_ISteamUtils_GetAPICallFailureReason(utilsInterface, callHandle)
        : null;
      const rawResult = getApiCallResultSuccess && !bIOFailure
        ? (callbackId === USER_STATS_RECEIVED_CALLBACK_ID
            ? parseUserStatsReceivedBuffer(koffi, resultBuffer, resultStruct, expectedSteamId)
            : (manager?.callbackPoller?.decodeCallbackResult?.(callbackId, resultBuffer, resultStruct) || koffi.decode(resultBuffer, resultStruct)))
        : null;
      return {
        callbackObserved: Boolean(rawResult),
        rawResult: jsonSafe(rawResult),
        bIOFailureCaptured: true,
        bIOFailure,
        getApiCallResultSuccess: Boolean(getApiCallResultSuccess),
        completedFailure,
        failureReason,
        durationMs: Date.now() - startedAt
      };
    }

    return {
      callbackObserved: false,
      rawResult: null,
      bIOFailureCaptured: true,
      durationMs: Date.now() - startedAt,
      error: 'timeout_waiting_for_api_call_result'
    };
  }

  async uploadScoreViaRawSdk({ leaderboard, score, uploadMethod, details, hasDetails }) {
    const manager = this.steam?.leaderboards;
    const libraryLoader = manager?.libraryLoader;
    const apiCore = manager?.apiCore;
    const callbackPoller = manager?.callbackPoller;
    const diagnostics = {
      hasLibraryLoader: Boolean(libraryLoader),
      hasApiCore: Boolean(apiCore),
      hasCallbackPoller: Boolean(callbackPoller),
      hasNativeUploadFunction: typeof libraryLoader?.SteamAPI_ISteamUserStats_UploadLeaderboardScore === 'function'
    };

    if (!diagnostics.hasLibraryLoader || !diagnostics.hasApiCore || !diagnostics.hasCallbackPoller || !diagnostics.hasNativeUploadFunction) {
      return { available: false, reason: 'raw_sdk_internals_unavailable', diagnostics };
    }

    const koffi = requireKoffi();
    diagnostics.hasKoffi = Boolean(koffi);
    if (!koffi) return { available: false, reason: 'koffi_unavailable', diagnostics };

    const userStatsInterface = apiCore.getUserStatsInterface?.();
    diagnostics.userStatsInterfacePresent = Boolean(userStatsInterface);
    diagnostics.apiCoreInitialized = typeof apiCore.isInitialized === 'function' ? Boolean(apiCore.isInitialized()) : null;
    if (!userStatsInterface) return { available: false, reason: 'user_stats_interface_unavailable', diagnostics };

    const detailsArray = hasDetails && Array.isArray(details) ? details.slice(0, 64) : [];
    let detailsPtr = null;
    let detailsCount = 0;
    if (detailsArray.length > 0) {
      detailsPtr = koffi.alloc('int32', detailsArray.length);
      koffi.encode(detailsPtr, `int32[${detailsArray.length}]`, detailsArray);
      detailsCount = detailsArray.length;
    }
    diagnostics.detailsCount = detailsCount;
    diagnostics.detailsPointerPresent = Boolean(detailsPtr);

    const callHandle = libraryLoader.SteamAPI_ISteamUserStats_UploadLeaderboardScore(
      userStatsInterface,
      leaderboard.handle,
      uploadMethod.value,
      score,
      detailsPtr,
      detailsCount
    );
    diagnostics.callHandle = stringifySteamId(callHandle);
    if (callHandle === BigInt(0) || callHandle === 0) {
      return {
        available: true,
        rawResult: null,
        diagnostics: {
          ...diagnostics,
          callHandleInvalid: true
        }
      };
    }

    const detailedPoll = await this.pollApiCallResultDetailed({
      callHandle,
      resultStruct: getLeaderboardScoreUploadedStruct(koffi),
      callbackId: LEADERBOARD_SCORE_UPLOADED_CALLBACK_ID,
      timeoutMs: 8000,
      delayMs: 100
    });
    const result = detailedPoll.callbackObserved
      ? detailedPoll.rawResult
      : await callbackPoller.poll(
          callHandle,
          getLeaderboardScoreUploadedStruct(koffi),
          LEADERBOARD_SCORE_UPLOADED_CALLBACK_ID
        );
    return {
      available: true,
      rawResult: result || null,
      diagnostics: {
        ...diagnostics,
        callHandleInvalid: false,
        callbackId: LEADERBOARD_SCORE_UPLOADED_CALLBACK_ID,
        callbackReturned: Boolean(result),
        bIOFailureCaptured: Boolean(detailedPoll.bIOFailureCaptured),
        bIOFailure: detailedPoll.bIOFailure ?? null,
        getApiCallResultSuccess: detailedPoll.getApiCallResultSuccess ?? null,
        callFailureReason: detailedPoll.failureReason ?? null,
        detailedPollError: detailedPoll.error || detailedPoll.reason || null
      }
    };
  }

  recordUploadResult(result) {
    this.lastUploadDiagnostics = jsonSafe({
      ...result,
      recordedAt: new Date().toISOString(),
      bridgeStatus: this.getStatus()
    });
    if (!result?.success) {
      this.logger.warn?.('[SteamLeaderboardBridge] upload failed diagnostics:', this.lastUploadDiagnostics);
    }
    return result;
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
  DEFAULT_STEAM_LEADERBOARD_NAME,
  STEAM_LEADERBOARD_NAME,
  STEAM_BACKEND_REJECTED_UNKNOWN_REASON_MESSAGE,
  SteamLeaderboardBridge,
  createSteamLeaderboardBridge,
  sanitizeDetails,
  stringifySteamId
};
