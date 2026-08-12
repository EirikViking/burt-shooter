const fs = require('node:fs');
const path = require('node:path');

const SAVE_VERSION = 2;
const CLOUD_SUBDIR = 'steam-cloud';
const PROFILE_SUBDIR = 'profiles';
const PROFILE_INDEX_FILE = 'profile-index.json';
const CLOUD_SAVE_FILE = 'nova-swarm-save.json';
const LEGACY_HIGHSCORE_FILE = 'local-highscores-v2.json';
const OLD_HIGHSCORE_FILE = 'local-highscores.json';
const LOCAL_OFFLINE_PROFILE_ID = 'local-offline';
const LEGACY_SHARED_PROFILE_ID = 'legacy-shared';
const MAX_THREAT_DISCOVERY_CATEGORIES = 48;
const MAX_THREAT_DISCOVERY_ITEMS_PER_CATEGORY = 5000;
const SUPPORTED_LANGUAGE_MODES = new Set(['system', 'en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']);
const MUSIC_PACKS = new Set(['classic', 'generated']);
const DISPLAY_MODES = new Set(['fullscreen', 'windowed', 'borderless']);
const SHIP_UNLOCK_LEGACY_REASON_KEYS = new Set([
  'shipUnlock.reason.legacy',
  'shipUnlock.reason.unknown'
]);
const PILOT_XP_THRESHOLDS = [
  0, 650, 1600, 3000, 5000, 7600, 10800, 14600, 19000, 24200,
  30400, 37800, 46600, 57000, 69400, 84200, 101800, 122800, 147800, 177500,
  225000, 285000, 360000, 450000, 555000, 675000, 815000, 975000, 1155000, 1360000,
  1590000, 1850000, 2140000, 2465000, 2830000, 3240000, 3700000, 4215000, 4790000, 5430000
];
const RUN_CONTRACTS_VERSION = 8;
const RUN_CONTRACT_ACTIVE_LIMIT = 3;
const RUN_CONTRACT_DEFINITIONS = Object.freeze([
  ['graze_10', 10, 'graze_count', 'grazes'],
  ['boss_breaker', 1, 'boss_intro', 'boss_defeated'],
  ['enemy_sweep_1000', 1000, 'enemy_kills', 'enemy_defeats'],
  ['support_hunter', 2, 'support_kills', 'boss_support_defeats'],
  ['phase_runner', 1, 'phase', 'phase_through_danger'],
  ['powerup_collector_10', 10, 'powerup_total', 'powerup_collected'],
  ['near_miss_streak', 5, 'near_miss', 'near_miss_streak'],
  ['shield_pickup', 1, 'shield_powerup', 'powerup_collected'],
  ['slow_mo_finisher', 1, 'slow_time', 'boss_slow_time_defeat'],
  ['sector_5_survivor', 1, 'no_life_sector', 'sector_no_life_loss'],
  ['blink_control', 1, 'blink', 'blink_drive_survive'],
  ['sector_3_signal', 1, 'sector_reach', 'sector_reached'],
  ['bomb_pickup', 1, 'bomb_powerup', 'powerup_collected'],
  ['enemy_sweep_2500', 2500, 'enemy_kills', 'enemy_defeats'],
  ['graze_50', 50, 'graze_count', 'grazes'],
  ['boss_hunter_10', 10, 'boss_kills', 'boss_defeats'],
  ['support_hunter_10', 10, 'support_kills', 'boss_support_defeats'],
  ['enemy_variety_50', 50, 'enemy_variety', 'unique_enemy_defeats'],
  ['pilot_rank_5', 5, 'pilot_rank', 'pilot_rank_reached'],
  ['sector_7_signal', 1, 'sector_reach', 'sector_reached'],
  ['slow_time_pickup', 1, 'slow_time_collect', 'powerup_collected'],
  ['phase_veteran_10', 10, 'phase', 'phase_uses'],
  ['powerup_collector_25', 25, 'powerup_total', 'powerup_collected'],
  ['chrono_anchor_pickup', 1, 'chrono_powerup', 'powerup_collected'],
  ['extra_life_found', 1, 'extra_life_powerup', 'powerup_collected'],
  ['near_miss_streak_10', 10, 'near_miss', 'near_miss_streak'],
  ['sector_10_signal', 1, 'sector_reach', 'sector_reached'],
  ['blink_veteran_3', 3, 'blink', 'powerup_collected'],
  ['shield_collector_5', 5, 'shield_powerup', 'powerup_collected'],
  ['bomb_collector_5', 5, 'bomb_powerup', 'powerup_collected'],
  ['enemy_sweep_10000', 10000, 'enemy_kills', 'enemy_defeats'],
  ['boss_hunter_25', 25, 'boss_kills', 'boss_defeats'],
  ['support_hunter_25', 25, 'support_kills', 'boss_support_defeats'],
  ['enemy_variety_75', 75, 'enemy_variety', 'unique_enemy_defeats'],
  ['graze_150', 150, 'graze_count', 'grazes'],
  ['point_defense_pickup', 1, 'point_defense_powerup', 'powerup_collected'],
  ['repair_pickup', 1, 'repair_powerup', 'powerup_collected'],
  ['shockwave_pickup', 1, 'shockwave_powerup', 'powerup_collected'],
  ['sector_15_signal', 1, 'sector_reach', 'sector_reached'],
  ['powerup_collector_50', 50, 'powerup_total', 'powerup_collected'],
  ['phase_master_25', 25, 'phase', 'phase_uses'],
  ['boss_hunter_50', 50, 'boss_kills', 'boss_defeats'],
  ['support_hunter_50', 50, 'support_kills', 'boss_support_defeats'],
  ['enemy_variety_100', 100, 'enemy_variety', 'unique_enemy_defeats'],
  ['pilot_rank_10', 10, 'pilot_rank', 'pilot_rank_reached'],
  ['ranked_launch_3', 3, 'run_starts', 'run_starts'],
  ['ranked_regular_10', 10, 'run_starts', 'run_starts'],
  ['enemy_sweep_25000', 25000, 'enemy_kills', 'enemy_defeats'],
  ['boss_hunter_100', 100, 'boss_kills', 'boss_defeats'],
  ['support_hunter_100', 100, 'support_kills', 'boss_support_defeats']
]);
const RUN_CONTRACT_IDS = RUN_CONTRACT_DEFINITIONS.map(([id]) => id);
const RUN_CONTRACT_BY_ID = new Map(RUN_CONTRACT_DEFINITIONS.map(([id, target, group, objective]) => [
  id,
  { id, target, group, objective }
]));

function nowIso() {
  return new Date().toISOString();
}

function sanitizeProfileToken(value, fallback = LOCAL_OFFLINE_PROFILE_ID) {
  const text = String(value || '').trim();
  const cleaned = text.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return (cleaned || fallback).slice(0, 80);
}

function normalizeProfileContext(profile = {}) {
  const raw = profile && typeof profile === 'object' ? profile : {};
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
      reason: raw.reason ? String(raw.reason).slice(0, 120) : null
    };
  }
  const id = sanitizeProfileToken(raw.id ?? raw.storageId ?? LOCAL_OFFLINE_PROFILE_ID, LOCAL_OFFLINE_PROFILE_ID);
  return {
    type: 'local',
    id,
    steamId: null,
    storageId: id,
    personaName: null,
    reason: raw.reason ? String(raw.reason).slice(0, 120) : null
  };
}

function createSaveProfile(profileContext = {}) {
  const profile = normalizeProfileContext(profileContext);
  return {
    type: profile.type,
    id: profile.id,
    steamId: profile.steamId,
    storageId: profile.storageId,
    personaName: profile.personaName || null
  };
}

function normalizeSaveProfile(rawProfile = {}, fallbackProfile = {}) {
  const raw = rawProfile && typeof rawProfile === 'object' ? rawProfile : {};
  if (raw.steamId || raw.steamID || (raw.type === 'steam' && raw.id)) {
    return createSaveProfile({
      type: 'steam',
      id: raw.steamId || raw.steamID || raw.id,
      steamId: raw.steamId || raw.steamID || raw.id,
      personaName: raw.personaName
    });
  }
  if (raw.storageId || raw.id || raw.type) {
    return createSaveProfile({
      type: raw.type || 'local',
      id: raw.id || raw.storageId || LOCAL_OFFLINE_PROFILE_ID,
      storageId: raw.storageId || raw.id || LOCAL_OFFLINE_PROFILE_ID
    });
  }
  return createSaveProfile(fallbackProfile);
}

function profileMatches(rawSave = {}, profileContext = {}) {
  const raw = rawSave && typeof rawSave === 'object' ? rawSave : {};
  if (!raw.profile || typeof raw.profile !== 'object') return false;
  const profile = normalizeProfileContext(profileContext);
  const saved = normalizeSaveProfile(raw.profile, {});
  if (profile.type === 'steam') {
    return Boolean(saved.steamId && saved.steamId === profile.steamId);
  }
  return saved.storageId === profile.storageId;
}

function hasExplicitProfile(rawSave = {}) {
  return Boolean(rawSave && typeof rawSave === 'object' && rawSave.profile && typeof rawSave.profile === 'object');
}

function getPaths(userDataPath, profileContext = {}) {
  const root = path.resolve(userDataPath);
  const cloudDir = path.join(root, CLOUD_SUBDIR);
  const profile = normalizeProfileContext(profileContext);
  const profileDir = path.join(cloudDir, PROFILE_SUBDIR, profile.storageId);
  return {
    userDataPath: root,
    cloudDir,
    profileDir,
    profileIndexPath: path.join(cloudDir, PROFILE_INDEX_FILE),
    cloudSavePath: path.join(profileDir, CLOUD_SAVE_FILE),
    legacyCloudSavePath: path.join(cloudDir, CLOUD_SAVE_FILE),
    legacySharedSavePath: path.join(cloudDir, PROFILE_SUBDIR, LEGACY_SHARED_PROFILE_ID, CLOUD_SAVE_FILE),
    legacyHighscorePath: path.join(root, LEGACY_HIGHSCORE_FILE),
    oldHighscorePath: path.join(root, OLD_HIGHSCORE_FILE),
    profile
  };
}

function readJsonFile(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2));
  fs.renameSync(tempPath, filePath);
}

async function readJsonFileAsync(filePath, fallback = null) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonAtomicAsync(filePath, payload) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.promises.writeFile(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.promises.rename(tempPath, filePath);
}

function comparableSaveText(save = {}) {
  const comparable = { ...(save && typeof save === 'object' ? save : {}) };
  delete comparable.updatedAt;
  return JSON.stringify(comparable);
}

function readProfileIndex(filePath) {
  const parsed = readJsonFile(filePath, {});
  const profiles = parsed?.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {};
  return {
    version: Math.max(1, Math.floor(Number(parsed?.version) || 1)),
    legacyClaimedBy: parsed?.legacyClaimedBy ? String(parsed.legacyClaimedBy).slice(0, 120) : null,
    profiles
  };
}

function writeProfileIndex(filePath, index) {
  writeJsonAtomic(filePath, {
    version: 1,
    legacyClaimedBy: index.legacyClaimedBy || null,
    profiles: index.profiles && typeof index.profiles === 'object' ? index.profiles : {},
    updatedAt: nowIso()
  });
}

function updateProfileIndex(paths, profile, patch = {}) {
  const index = readProfileIndex(paths.profileIndexPath);
  index.profiles[profile.storageId] = {
    type: profile.type,
    steamId: profile.steamId,
    storageId: profile.storageId,
    personaName: profile.personaName || null,
    savePath: paths.cloudSavePath,
    updatedAt: nowIso(),
    ...patch.profilePatch
  };
  if (patch.legacyClaimedBy) index.legacyClaimedBy = patch.legacyClaimedBy;
  writeProfileIndex(paths.profileIndexPath, index);
  return index;
}

function hasMeaningfulRunContracts(raw = {}) {
  const state = raw?.hangarProgress?.runContracts || raw?.runContracts || {};
  if (!state || typeof state !== 'object') return false;
  return Boolean(
    (Array.isArray(state.completedIds) && state.completedIds.length > 0) ||
    (state.completed && typeof state.completed === 'object' && Object.keys(state.completed).length > 0) ||
    (state.progress && typeof state.progress === 'object' && Object.keys(state.progress).length > 0) ||
    state.completionNoticeSeen === true ||
    state.completedNoticeSeen === true ||
    state.allCompleteSeen === true
  );
}

function isMeaningfulSave(save = {}) {
  const hangar = save.hangarProgress || {};
  const discoveryItems = save.threatDiscovery?.items || {};
  const scoutBestScore = sanitizeScoutRunRecords(save.scoutRunRecords || save.scoutBest || save.scoutRunBest).best?.score || 0;
  const discoveryCount = Object.values(discoveryItems)
    .reduce((sum, bucket) => sum + (bucket && typeof bucket === 'object' ? Object.keys(bucket).length : 0), 0);
  return Boolean(
    (Array.isArray(save.localHighscores) && save.localHighscores.length > 0) ||
    (Array.isArray(save.achievements?.unlocked) && save.achievements.unlocked.length > 0) ||
    Number(hangar.pilotXp) > 0 ||
    Number(hangar.totalRuns) > 0 ||
    Number(hangar.totalCodexDiscoveries) > 0 ||
    (Array.isArray(hangar.unlockedShipIds) && hangar.unlockedShipIds.length > 1) ||
    hasMeaningfulRunContracts(save) ||
    scoutBestScore > 0 ||
    discoveryCount > 0 ||
    Object.keys(sanitizeSectorStartChallengeRecords(save.sectorStartChallengeRecords || save.sectorStartRecords || {}).byCheckpoint).length > 0 ||
    Object.keys(sanitizeShipUsage(save.shipUsage || save.shipUsageByShip || {})).length > 0 ||
    Number(save.shipUsageTotal) > 0
  );
}

function preserveLegacyCloudSave(paths, logger = console, reason = 'profile_mismatch') {
  try {
    if (!fs.existsSync(paths.legacyCloudSavePath)) return null;
    fs.mkdirSync(path.dirname(paths.legacySharedSavePath), { recursive: true });
    if (!fs.existsSync(paths.legacySharedSavePath)) {
      fs.copyFileSync(paths.legacyCloudSavePath, paths.legacySharedSavePath);
    }
    const stampedPath = `${paths.legacySharedSavePath}.preserved-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
    fs.copyFileSync(paths.legacyCloudSavePath, stampedPath);
    logger.warn?.(`[SteamCloudSave] Preserved shared legacy save before ${reason}: ${stampedPath}`);
    return stampedPath;
  } catch (error) {
    logger.warn?.(`[SteamCloudSave] Failed to preserve shared legacy save: ${error?.message || error}`);
    return null;
  }
}

async function preserveLegacyCloudSaveAsync(paths, logger = console, reason = 'profile_mismatch') {
  try {
    await fs.promises.access(paths.legacyCloudSavePath);
    await fs.promises.mkdir(path.dirname(paths.legacySharedSavePath), { recursive: true });
    try {
      await fs.promises.access(paths.legacySharedSavePath);
    } catch {
      await fs.promises.copyFile(paths.legacyCloudSavePath, paths.legacySharedSavePath);
    }
    const stampedPath = `${paths.legacySharedSavePath}.preserved-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
    await fs.promises.copyFile(paths.legacyCloudSavePath, stampedPath);
    logger.warn?.(`[SteamCloudSave] Preserved shared legacy save before ${reason}: ${stampedPath}`);
    return stampedPath;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      logger.warn?.(`[SteamCloudSave] Failed to preserve shared legacy save: ${error?.message || error}`);
    }
    return null;
  }
}

function backupCorruptSave(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return null;
  } catch {
    const backupPath = `${filePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
    try {
      fs.copyFileSync(filePath, backupPath);
      return backupPath;
    } catch {
      return null;
    }
  }
}

function parseHexDetailsString(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const compact = text.replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
  if (compact.length < 8 || compact.length % 8 !== 0) return [];
  const details = [];
  for (let index = 0; index + 8 <= compact.length && details.length < 64; index += 8) {
    const chunk = compact.slice(index, index + 8);
    const b0 = Number.parseInt(chunk.slice(0, 2), 16);
    const b1 = Number.parseInt(chunk.slice(2, 4), 16);
    const b2 = Number.parseInt(chunk.slice(4, 6), 16);
    const b3 = Number.parseInt(chunk.slice(6, 8), 16);
    if ([b0, b1, b2, b3].some(byte => !Number.isFinite(byte))) continue;
    details.push(b0 | (b1 << 8) | (b2 << 16) | (b3 << 24));
  }
  return details;
}

function parseScoreDetails(value) {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value;
  if (ArrayBuffer.isView(value) && typeof value.length === 'number') return Array.from(value);
  if (typeof value === 'string') {
    const hexDetails = parseHexDetailsString(value);
    if (hexDetails.length) return hexDetails;
    return (value.match(/-?\d+/g) || []).map(Number);
  }
  if (typeof value === 'object' && Number.isFinite(Number(value.length))) {
    return Array.from({ length: Number(value.length) }, (_, index) => value[index]);
  }
  return [];
}

function readScoreLevel(entry = {}, fallback = 1) {
  const details = parseScoreDetails(
    entry.details ??
    entry.scoreDetails ??
    entry.m_pDetails ??
    entry.detailsHex ??
    entry.scoreDetailsHex ??
    entry.metadata?.details
  );
  for (const value of [
    entry.metadata?.level,
    entry.metadata?.levelReached,
    entry.detailsMetadata?.level,
    entry.detailsMetadata?.levelReached,
    details[0],
    entry.level,
    entry.levelReached
  ]) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed));
  }
  return Math.max(1, Math.floor(Number(fallback) || 1));
}

function sanitizeScoreEntry(entry = {}, fallbackIndex = 0) {
  const score = Math.max(0, Math.floor(Number(entry.score) || 0));
  const level = readScoreLevel(entry, 1);
  const rankIndex = Math.max(0, Math.min(39, Math.floor(Number(entry.rankIndex ?? entry.rank_index) || 0)));
  const name = String(entry.name || `PILOT${String(fallbackIndex).slice(-2).padStart(2, '0')}`)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, 14) || 'PILOT';
  return {
    name,
    score,
    level,
    rankIndex,
    rank_index: rankIndex,
    shipId: entry.shipId ?? entry.ship_id ?? null,
    shipName: entry.shipName ?? entry.ship_name ?? null,
    runTimeSeconds: entry.runTimeSeconds ?? entry.runtimeSeconds ?? null,
    kills: entry.kills ?? null,
    bossKills: entry.bossKills ?? null,
    wavesCleared: entry.wavesCleared ?? null,
    submissionId: entry.submissionId || null,
    timestamp: String(entry.timestamp || entry.created_at || nowIso()),
    source: entry.source || 'local',
    seed: Boolean(entry.seed),
    local: true
  };
}

function sanitizeScores(rawScores) {
  if (!Array.isArray(rawScores)) return [];
  return rawScores
    .map((entry, index) => sanitizeScoreEntry(entry, index))
    .sort((a, b) => {
      const scoreDelta = (b.score || 0) - (a.score || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
    })
    .slice(0, 100);
}

function sanitizeUnlockProgress(progress = {}) {
  return {
    bestScore: Math.max(0, Math.floor(Number(progress.bestScore) || 0)),
    bestRank: Math.max(0, Math.floor(Number(progress.bestRank) || 0)),
    bestLevel: Math.max(1, Math.floor(Number(progress.bestLevel) || 1))
  };
}

function sanitizeStringArray(values, { maxItems = 500, maxLength = 180 } = {}) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((value) => value.slice(0, maxLength)))]
    .slice(0, maxItems);
}

function mergeStringArray(localValues = [], rendererValues = [], options = {}) {
  return sanitizeStringArray([
    ...(Array.isArray(localValues) ? localValues : []),
    ...(Array.isArray(rendererValues) ? rendererValues : [])
  ], options);
}

function sanitizeOptionalString(value, maxLength = 160) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function sanitizeNumber(value, fallback = 0, { min = 0, max = 2147483647 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function sanitizeJsonValue(value, depth = 2) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.slice(0, 300);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    if (depth <= 0) return [];
    return value.slice(0, 80).map((entry) => sanitizeJsonValue(entry, depth - 1));
  }
  if (typeof value === 'object') {
    if (depth <= 0) return {};
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 80)
        .map(([key, entry]) => [String(key).slice(0, 120), sanitizeJsonValue(entry, depth - 1)])
    );
  }
  return null;
}

function sanitizeShipUnlockHistoryEntry(entry = {}) {
  const raw = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
  const params = raw.reasonParams && typeof raw.reasonParams === 'object' && !Array.isArray(raw.reasonParams)
    ? sanitizeJsonValue(raw.reasonParams, 3)
    : {};
  return {
    unlockedAt: raw.unlockedAt ? String(raw.unlockedAt).slice(0, 80) : nowIso(),
    reasonKey: String(raw.reasonKey || 'shipUnlock.reason.unknown').slice(0, 120),
    reasonParams: params && typeof params === 'object' ? params : {},
    source: String(raw.source || 'unknown').slice(0, 80),
    sector: raw.sector == null ? null : sanitizeNumber(raw.sector, 0),
    score: raw.score == null ? null : sanitizeNumber(raw.score, 0),
    bossCount: raw.bossCount == null ? null : sanitizeNumber(raw.bossCount, 0),
    runMode: raw.runMode == null ? null : String(raw.runMode).slice(0, 80),
    buildVersion: raw.buildVersion == null ? null : String(raw.buildVersion).slice(0, 80)
  };
}

function sanitizeShipUnlockHistory(history = {}) {
  const raw = history && typeof history === 'object' && !Array.isArray(history) ? history : {};
  return Object.fromEntries(Object.entries(raw)
    .slice(0, 80)
    .map(([shipId, entry]) => [String(shipId).slice(0, 80), sanitizeShipUnlockHistoryEntry(entry)])
    .filter(([shipId]) => shipId));
}

function chooseShipUnlockHistoryEntry(localEntry = null, rendererEntry = null) {
  const localSpecific = localEntry && !SHIP_UNLOCK_LEGACY_REASON_KEYS.has(localEntry.reasonKey);
  const rendererSpecific = rendererEntry && !SHIP_UNLOCK_LEGACY_REASON_KEYS.has(rendererEntry.reasonKey);
  if (localSpecific && !rendererSpecific) return localEntry;
  if (rendererSpecific && !localSpecific) return rendererEntry;
  if (localEntry && rendererEntry) {
    const localTime = Date.parse(localEntry.unlockedAt || '') || Number.POSITIVE_INFINITY;
    const rendererTime = Date.parse(rendererEntry.unlockedAt || '') || Number.POSITIVE_INFINITY;
    return localTime <= rendererTime ? localEntry : rendererEntry;
  }
  return localEntry || rendererEntry || null;
}

function mergeShipUnlockHistory(localHistory = {}, rendererHistory = {}) {
  const local = sanitizeShipUnlockHistory(localHistory);
  const renderer = sanitizeShipUnlockHistory(rendererHistory);
  const ids = [...new Set([...Object.keys(local), ...Object.keys(renderer)])];
  return Object.fromEntries(ids
    .map((shipId) => [shipId, chooseShipUnlockHistoryEntry(local[shipId], renderer[shipId])])
    .filter(([, entry]) => entry));
}

function runContractDefinition(id) {
  return RUN_CONTRACT_BY_ID.get(String(id || '')) || null;
}

function uniqueRunContractIds(values = []) {
  const ids = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = String(value || '').trim().slice(0, 80);
    if (!runContractDefinition(id) || ids.includes(id)) continue;
    ids.push(id);
  }
  return ids;
}

function uniqueContractTextIds(values = [], { maxItems = 160, maxLength = 120 } = {}) {
  const ids = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = String(value || '').trim().slice(0, maxLength);
    if (!id || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= maxItems) break;
  }
  return ids;
}

function normalizeRunContractCompletion(entry = {}, id = '') {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const contractId = String(entry.id || id || '').trim().slice(0, 80);
  if (!runContractDefinition(contractId)) return null;
  const count = sanitizeNumber(entry.count, 1, { min: 1 });
  return {
    id: contractId,
    count,
    completedAt: String(entry.completedAt || entry.lastCompletedAt || nowIso()).slice(0, 80),
    lastRunMode: String(entry.lastRunMode || 'ranked').slice(0, 40),
    lastSector: Math.max(1, sanitizeNumber(entry.lastSector, 1, { min: 1 })),
    buildVersion: entry.buildVersion ? String(entry.buildVersion).slice(0, 80) : null
  };
}

function normalizeRunContractProgress(entry = {}, id = '') {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const contractId = String(entry.id || id || '').trim().slice(0, 80);
  const contract = runContractDefinition(contractId);
  if (!contract) return null;
  const progress = Math.min(contract.target || 1, sanitizeNumber(entry.progress, 0, { min: 0 }));
  const result = {
    id: contractId,
    progress,
    target: contract.target || 1,
    updatedAt: String(entry.updatedAt || nowIso()).slice(0, 80),
    lastRunMode: String(entry.lastRunMode || 'ranked').slice(0, 40),
    lastSector: Math.max(1, sanitizeNumber(entry.lastSector, 1, { min: 1 }))
  };
  if (contract.objective === 'unique_enemy_defeats') {
    result.uniqueIds = uniqueContractTextIds(entry.uniqueIds, {
      maxItems: contract.target || 100,
      maxLength: 120
    });
    result.progress = Math.min(contract.target || 1, Math.max(progress, result.uniqueIds.length));
  }
  return result;
}

function selectRunContractActiveIds(activeIds = [], completed = {}, { rotateCompleted = false } = {}) {
  const completedSet = new Set(Object.keys(completed || {}));
  const selected = [];
  const groups = new Set();
  const trySelect = (id, { skipCompleted = false } = {}) => {
    if (selected.length >= RUN_CONTRACT_ACTIVE_LIMIT) return;
    const contract = runContractDefinition(id);
    if (!contract || selected.includes(contract.id)) return;
    if (skipCompleted && completedSet.has(contract.id)) return;
    if (groups.has(contract.group)) return;
    selected.push(contract.id);
    groups.add(contract.group);
  };
  for (const id of uniqueRunContractIds(activeIds)) trySelect(id, { skipCompleted: rotateCompleted });
  for (const id of RUN_CONTRACT_IDS) trySelect(id, { skipCompleted: true });
  if (selected.length || completedSet.size < RUN_CONTRACT_IDS.length) return selected;
  return uniqueRunContractIds(activeIds)
    .filter((id, index, ids) => ids.findIndex((candidate) => runContractDefinition(candidate)?.group === runContractDefinition(id)?.group) === index)
    .slice(0, RUN_CONTRACT_ACTIVE_LIMIT);
}

function orderedRunContractCompletedIds(completed = {}, extraIds = []) {
  const ids = new Set([
    ...Object.keys(completed || {}),
    ...uniqueRunContractIds(extraIds)
  ]);
  return RUN_CONTRACT_IDS.filter((id) => ids.has(id));
}

function latestRunContractIso(...values) {
  let best = '';
  let bestTime = 0;
  for (const value of values.flat()) {
    const text = String(value || '').trim().slice(0, 80);
    const time = Date.parse(text || '');
    if (Number.isFinite(time) && time > bestTime) {
      best = text;
      bestTime = time;
    }
  }
  return best;
}

function getAllRunContractsCompletedAt(completed = {}) {
  if (!RUN_CONTRACT_IDS.every((id) => completed[id])) return null;
  return latestRunContractIso(RUN_CONTRACT_IDS.map((id) => completed[id]?.completedAt)) || nowIso();
}

function sanitizeRunContractsState(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const completed = {};
  for (const [id, entry] of Object.entries(source.completed || {})) {
    const normalized = normalizeRunContractCompletion(entry, id);
    if (normalized) completed[normalized.id] = normalized;
  }
  const completedIds = orderedRunContractCompletedIds(completed, source.completedIds);
  const activeIds = selectRunContractActiveIds(source.activeIds, completed, { rotateCompleted: false });
  const progress = {};
  const active = new Set(activeIds);
  for (const [id, entry] of Object.entries(source.progress || {})) {
    if (!active.has(id) || completed[id]) continue;
    const normalized = normalizeRunContractProgress(entry, id);
    if (normalized) progress[normalized.id] = normalized;
  }
  const allCompletedAt = getAllRunContractsCompletedAt(completed);
  const completionNoticeSeen = Boolean(allCompletedAt && (
    source.completionNoticeSeen ||
    source.completedNoticeSeen ||
    source.allCompleteSeen
  ));
  return {
    version: RUN_CONTRACTS_VERSION,
    activeIds,
    completedIds,
    completed,
    progress,
    allCompletedAt,
    completionNoticeSeen,
    completionNoticeSeenAt: completionNoticeSeen
      ? (latestRunContractIso(source.completionNoticeSeenAt, source.completedNoticeSeenAt, source.allCompleteSeenAt) || allCompletedAt || nowIso())
      : null,
    updatedAt: String(source.updatedAt || nowIso()).slice(0, 80)
  };
}

function mergeRunContractProgressEntry(localEntry = null, rendererEntry = null, id = '') {
  const local = normalizeRunContractProgress(localEntry, id);
  const renderer = normalizeRunContractProgress(rendererEntry, id);
  if (!local) return renderer;
  if (!renderer) return local;
  const contract = runContractDefinition(id || local.id || renderer.id);
  if (contract?.objective === 'unique_enemy_defeats') {
    const uniqueIds = uniqueContractTextIds([...(renderer.uniqueIds || []), ...(local.uniqueIds || [])], {
      maxItems: contract.target || 100,
      maxLength: 120
    });
    return normalizeRunContractProgress({
      ...renderer,
      ...local,
      uniqueIds,
      progress: Math.max(local.progress, renderer.progress, uniqueIds.length),
      updatedAt: latestRunContractIso(local.updatedAt, renderer.updatedAt) || local.updatedAt || renderer.updatedAt
    }, contract.id);
  }
  if (local.progress > renderer.progress) return local;
  if (renderer.progress > local.progress) return renderer;
  const localTime = Date.parse(local.updatedAt || '') || 0;
  const rendererTime = Date.parse(renderer.updatedAt || '') || 0;
  return rendererTime > localTime ? renderer : local;
}

function mergeRunContractProgress(localProgress = {}, rendererProgress = {}) {
  const ids = new Set([
    ...Object.keys(localProgress || {}),
    ...Object.keys(rendererProgress || {})
  ]);
  const progress = {};
  for (const id of RUN_CONTRACT_IDS) {
    if (!ids.has(id)) continue;
    const merged = mergeRunContractProgressEntry(localProgress?.[id], rendererProgress?.[id], id);
    if (merged) progress[merged.id] = merged;
  }
  return progress;
}

function mergeRunContractsState(localState = {}, rendererState = {}) {
  const local = sanitizeRunContractsState(localState);
  const renderer = sanitizeRunContractsState(rendererState);
  const completed = { ...local.completed };
  for (const [id, rendererEntry] of Object.entries(renderer.completed)) {
    const localEntry = completed[id];
    if (!localEntry || rendererEntry.count > localEntry.count) {
      completed[id] = rendererEntry;
    } else if (rendererEntry.count === localEntry.count) {
      const localTime = Date.parse(localEntry.completedAt || '') || 0;
      const rendererTime = Date.parse(rendererEntry.completedAt || '') || 0;
      if (rendererTime > localTime) completed[id] = rendererEntry;
    }
  }
  return sanitizeRunContractsState({
    activeIds: renderer.activeIds?.length ? renderer.activeIds : local.activeIds,
    completed,
    completedIds: orderedRunContractCompletedIds(completed),
    progress: mergeRunContractProgress(local.progress, renderer.progress),
    completionNoticeSeen: Boolean(local.completionNoticeSeen || renderer.completionNoticeSeen),
    allCompletedAt: latestRunContractIso(local.allCompletedAt, renderer.allCompletedAt),
    completionNoticeSeenAt: latestRunContractIso(local.completionNoticeSeenAt, renderer.completionNoticeSeenAt),
    updatedAt: local.updatedAt || renderer.updatedAt || nowIso()
  });
}

function sanitizeHangarProgress(progress = {}) {
  const raw = progress && typeof progress === 'object' ? progress : {};
  const reachedSector = Math.max(
    1,
    sanitizeNumber(raw.bestSector ?? raw.bestLevel, 1, { min: 1 }),
    sanitizeNumber(raw.bestLevel ?? raw.bestSector, 1, { min: 1 })
  );
  const shipSpecificMilestones = raw.shipSpecificMilestones && typeof raw.shipSpecificMilestones === 'object'
    ? sanitizeJsonValue(raw.shipSpecificMilestones, 2)
    : {};
  return {
    version: Math.max(1, sanitizeNumber(raw.version, 1)),
    unlockTuningVersion: sanitizeNumber(raw.unlockTuningVersion, 0),
    pilotXp: sanitizeNumber(raw.pilotXp, 0),
    pilotRank: sanitizeNumber(raw.pilotRank, 0, { min: 0, max: 20 }),
    highestPilotRank: sanitizeNumber(raw.highestPilotRank, 0, { min: 0, max: 20 }),
    totalRuns: sanitizeNumber(raw.totalRuns, 0),
    bestScore: sanitizeNumber(raw.bestScore, 0),
    bestSector: reachedSector,
    bestLevel: reachedSector,
    bestRank: sanitizeNumber(raw.bestRank, 0, { min: 0, max: 20 }),
    bestRunTimeSeconds: sanitizeNumber(raw.bestRunTimeSeconds, 0),
    survivedSeconds: sanitizeNumber(raw.survivedSeconds, 0),
    totalBossesDefeated: sanitizeNumber(raw.totalBossesDefeated, 0),
    totalWavesCleared: sanitizeNumber(raw.totalWavesCleared, 0),
    totalCodexDiscoveries: sanitizeNumber(raw.totalCodexDiscoveries, 0),
    runClears: sanitizeNumber(raw.runClears, 0),
    noHitWaves: sanitizeNumber(raw.noHitWaves, 0),
    noHitSectors: sanitizeNumber(raw.noHitSectors, 0),
    clearWithLivesRemaining: sanitizeNumber(raw.clearWithLivesRemaining, 0),
    highestScoreMultiplier: Math.max(1, Number(raw.highestScoreMultiplier) || 1),
    shipSpecificMilestones,
    discoveredThreatIds: sanitizeStringArray(raw.discoveredThreatIds, { maxItems: 5000 }),
    defeatedBossIds: sanitizeStringArray(raw.defeatedBossIds),
    runThemesSurvived: sanitizeStringArray(raw.runThemesSurvived),
    secretShipUnlockIds: sanitizeStringArray(raw.secretShipUnlockIds),
    creditsEasterEggFound: Boolean(raw.creditsEasterEggFound),
    unlockedShipIds: sanitizeStringArray(raw.unlockedShipIds),
    shipUnlockHistory: sanitizeShipUnlockHistory(raw.shipUnlockHistory),
    lastNewlyUnlockedShipIds: sanitizeStringArray(raw.lastNewlyUnlockedShipIds),
    newRanksThisRun: sanitizeStringArray(raw.newRanksThisRun, { maxItems: 32, maxLength: 12 })
      .map((value) => sanitizeNumber(value, 0, { min: 0, max: 20 })),
    rankAchievementsUnlocked: sanitizeStringArray(raw.rankAchievementsUnlocked),
    overrunUnlockCelebrationPending: Boolean(raw.overrunUnlockCelebrationPending)
      && !Boolean(raw.overrunUnlockCelebrationSeen),
    overrunUnlockCelebrationSeen: Boolean(raw.overrunUnlockCelebrationSeen),
    rankProgress: raw.rankProgress && typeof raw.rankProgress === 'object'
      ? sanitizeJsonValue(raw.rankProgress, 1)
      : null,
    runContracts: sanitizeRunContractsState(raw.runContracts),
    updatedAt: raw.updatedAt ? String(raw.updatedAt).slice(0, 80) : nowIso()
  };
}

function sanitizeThreatItem(item = {}, fallback = {}) {
  const raw = item && typeof item === 'object' ? item : {};
  return {
    id: String(raw.id || fallback.id || '').slice(0, 160),
    category: String(raw.category || fallback.category || '').slice(0, 80),
    name: String(raw.name || fallback.name || raw.id || fallback.id || 'Unknown Signal').slice(0, 180),
    firstSeenAt: raw.firstSeenAt ? String(raw.firstSeenAt).slice(0, 80) : nowIso(),
    lastSeenAt: raw.lastSeenAt ? String(raw.lastSeenAt).slice(0, 80) : nowIso(),
    timesSeen: sanitizeNumber(raw.timesSeen, 0),
    timesDefeated: sanitizeNumber(raw.timesDefeated, 0),
    timesSurvived: sanitizeNumber(raw.timesSurvived, 0),
    timesKilledPlayer: sanitizeNumber(raw.timesKilledPlayer, 0),
    bestClearTimeAgainst: raw.bestClearTimeAgainst == null ? null : Number(raw.bestClearTimeAgainst) || null,
    highestScoreDuringEncounter: sanitizeNumber(raw.highestScoreDuringEncounter, 0),
    metadata: raw.metadata && typeof raw.metadata === 'object' ? sanitizeJsonValue(raw.metadata, 2) : {}
  };
}

function getCanonicalCodexDiscoveryIds(items = {}) {
  const ids = [];
  for (const [category, bucket] of Object.entries(items || {})) {
    if (!bucket || typeof bucket !== 'object') continue;
    for (const id of Object.keys(bucket)) {
      if (id) ids.push(`${String(category || '')}:${String(id || '')}`);
    }
  }
  return [...new Set(ids)].sort();
}

function hashCodexDiscoveryIds(ids = []) {
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (const id of ids) {
    const text = String(id || '');
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      hashA = Math.imul(hashA ^ code, 0x01000193) >>> 0;
      hashB = (Math.imul(hashB ^ code, 0x85ebca6b) + 0xc2b2ae35) >>> 0;
    }
    hashA = Math.imul(hashA ^ 31, 0x01000193) >>> 0;
    hashB = (Math.imul(hashB ^ 31, 0x85ebca6b) + 0xc2b2ae35) >>> 0;
  }
  return `${hashA.toString(36).padStart(7, '0')}${hashB.toString(36).padStart(7, '0')}`;
}

function getCodexDiscoverySignature(items = {}) {
  const ids = getCanonicalCodexDiscoveryIds(items);
  return {
    signature: `v1:${ids.length}:${hashCodexDiscoveryIds(ids)}`,
    count: ids.length
  };
}

function sanitizeCodexViewMarker(raw = {}) {
  const signature = String(raw?.lastViewedCodexDiscoverySignature || '').trim().slice(0, 120);
  if (!signature) return null;
  return {
    lastViewedCodexDiscoverySignature: signature,
    lastViewedCodexDiscoveryCount: sanitizeNumber(raw?.lastViewedCodexDiscoveryCount, 0),
    lastViewedCodexAt: raw?.lastViewedCodexAt ? String(raw.lastViewedCodexAt).slice(0, 80) : null
  };
}

function pickLatestCodexViewMarker(localState = {}, rendererState = {}) {
  const candidates = [sanitizeCodexViewMarker(localState), sanitizeCodexViewMarker(rendererState)].filter(Boolean);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => {
    const aTime = Date.parse(a.lastViewedCodexAt || '') || 0;
    const bTime = Date.parse(b.lastViewedCodexAt || '') || 0;
    return bTime - aTime;
  })[0];
}

function sanitizeThreatDiscovery(discovery = {}) {
  const raw = discovery && typeof discovery === 'object' ? discovery : {};
  const rawItems = raw.items && typeof raw.items === 'object' ? raw.items : {};
  const items = {};
  for (const [category, bucket] of Object.entries(rawItems).slice(0, MAX_THREAT_DISCOVERY_CATEGORIES)) {
    const cleanCategory = String(category || '').slice(0, 80);
    if (!cleanCategory || !bucket || typeof bucket !== 'object') continue;
    items[cleanCategory] = Object.fromEntries(
      Object.entries(bucket)
        .slice(0, MAX_THREAT_DISCOVERY_ITEMS_PER_CATEGORY)
        .filter(([id]) => String(id || '').trim())
        .map(([id, item]) => [String(id).slice(0, 160), sanitizeThreatItem(item, { id, category: cleanCategory })])
    );
  }
  const discoveriesThisRun = Array.isArray(raw.discoveriesThisRun)
    ? raw.discoveriesThisRun.slice(-80).map((entry) => sanitizeJsonValue(entry, 2)).filter(Boolean)
    : [];
  const discoveredUnreadIds = new Set();
  for (const [category, bucket] of Object.entries(items)) {
    for (const id of Object.keys(bucket || {})) discoveredUnreadIds.add(`${category}:${id}`);
  }
  const viewedMarker = sanitizeCodexViewMarker(raw);
  const currentSignature = getCodexDiscoverySignature(items);
  return {
    version: Math.max(1, sanitizeNumber(raw.version, 1)),
    items,
    discoveriesThisRun,
    recentRunThemes: sanitizeStringArray(raw.recentRunThemes, { maxItems: 8 }),
    ...(viewedMarker || {}),
    ...(viewedMarker?.lastViewedCodexDiscoverySignature === currentSignature.signature
      ? { lastViewedCodexDiscoveryCount: currentSignature.count }
      : {}),
    unreadIds: viewedMarker?.lastViewedCodexDiscoverySignature === currentSignature.signature
      ? []
      : sanitizeStringArray(raw.unreadIds).filter((id) => discoveredUnreadIds.has(id)),
    updatedAt: raw.updatedAt ? String(raw.updatedAt).slice(0, 80) : nowIso()
  };
}

function sanitizeLanguageState(language = {}) {
  const preference = SUPPORTED_LANGUAGE_MODES.has(language.preference) ? language.preference : 'system';
  const current = SUPPORTED_LANGUAGE_MODES.has(language.current) && language.current !== 'system'
    ? language.current
    : null;
  return { preference, current };
}

function sanitizeAchievements(raw = {}) {
  const ids = Array.isArray(raw) ? raw : raw?.unlocked;
  const unlocked = Array.isArray(ids)
    ? [...new Set(ids
      .map((id) => String(id || '').trim())
      .filter(Boolean)
      .map((id) => id.slice(0, 120)))]
    : [];
  return {
    version: Math.max(1, Math.floor(Number(raw?.version) || 1)),
    unlocked,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : null
  };
}

function sanitizeAudioSettings(audio = {}) {
  const clampUnit = (value, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(1, number));
  };
  const next = {};
  if (audio.masterVolume !== undefined) next.masterVolume = clampUnit(audio.masterVolume, 0.3);
  if (audio.musicVolume !== undefined) next.musicVolume = clampUnit(audio.musicVolume, 0.2);
  if (audio.sfxVolume !== undefined) next.sfxVolume = clampUnit(audio.sfxVolume, 0.4);
  if (audio.voiceVolume !== undefined) next.voiceVolume = clampUnit(audio.voiceVolume, 0.45);
  if (audio.musicEnabled !== undefined) next.musicEnabled = Boolean(audio.musicEnabled);
  if (audio.voiceEnabled !== undefined) next.voiceEnabled = Boolean(audio.voiceEnabled);
  if (audio.bossVoiceEnabled !== undefined) next.bossVoiceEnabled = Boolean(audio.bossVoiceEnabled);
  if (audio.ctaVoiceEnabled !== undefined) next.ctaVoiceEnabled = Boolean(audio.ctaVoiceEnabled);
  if (audio.musicPack !== undefined) {
    const musicPack = String(audio.musicPack || '').trim();
    if (MUSIC_PACKS.has(musicPack)) next.musicPack = musicPack;
  }
  return next;
}

function mergeUnlockProgress(localProgress = {}, rendererProgress = {}) {
  const local = sanitizeUnlockProgress(localProgress);
  const renderer = sanitizeUnlockProgress(rendererProgress);
  return {
    bestScore: Math.max(local.bestScore, renderer.bestScore),
    bestRank: Math.max(local.bestRank, renderer.bestRank),
    bestLevel: Math.max(local.bestLevel, renderer.bestLevel, 1)
  };
}

function mergeHangarProgress(localProgress = {}, rendererProgress = {}) {
  const local = sanitizeHangarProgress(localProgress);
  const renderer = sanitizeHangarProgress(rendererProgress);
  const shipIds = new Set([
    ...Object.keys(local.shipSpecificMilestones || {}),
    ...Object.keys(renderer.shipSpecificMilestones || {})
  ]);
  const shipSpecificMilestones = Object.fromEntries([...shipIds].map((shipId) => {
    const localRecord = local.shipSpecificMilestones?.[shipId] || {};
    const rendererRecord = renderer.shipSpecificMilestones?.[shipId] || {};
    const localTime = Date.parse(localRecord.lastRunAt || '') || 0;
    const rendererTime = Date.parse(rendererRecord.lastRunAt || '') || 0;
    return [shipId, {
      ...(localTime >= rendererTime ? rendererRecord : localRecord),
      ...(localTime >= rendererTime ? localRecord : rendererRecord),
      runs: Math.max(sanitizeNumber(localRecord.runs), sanitizeNumber(rendererRecord.runs)),
      clears: Math.max(sanitizeNumber(localRecord.clears), sanitizeNumber(rendererRecord.clears)),
      overrunClears: Math.max(
        sanitizeNumber(localRecord.overrunClears),
        sanitizeNumber(rendererRecord.overrunClears)
      ),
      bestSector: Math.max(sanitizeNumber(localRecord.bestSector), sanitizeNumber(rendererRecord.bestSector)),
      bestScore: Math.max(sanitizeNumber(localRecord.bestScore), sanitizeNumber(rendererRecord.bestScore)),
      bestCombo: Math.max(sanitizeNumber(localRecord.bestCombo), sanitizeNumber(rendererRecord.bestCombo)),
      bestBosses: Math.max(sanitizeNumber(localRecord.bestBosses), sanitizeNumber(rendererRecord.bestBosses)),
      totalBosses: Math.max(sanitizeNumber(localRecord.totalBosses), sanitizeNumber(rendererRecord.totalBosses)),
      totalDamage: Math.max(Number(localRecord.totalDamage) || 0, Number(rendererRecord.totalDamage) || 0),
      lastRunAt: localTime >= rendererTime ? (localRecord.lastRunAt || null) : (rendererRecord.lastRunAt || null)
    }];
  }));
  return sanitizeHangarProgress({
    ...local,
    ...renderer,
    pilotXp: Math.max(local.pilotXp, renderer.pilotXp),
    pilotRank: Math.max(local.pilotRank, renderer.pilotRank),
    highestPilotRank: Math.max(local.highestPilotRank, renderer.highestPilotRank),
    totalRuns: Math.max(local.totalRuns, renderer.totalRuns),
    bestScore: Math.max(local.bestScore, renderer.bestScore),
    bestSector: Math.max(local.bestSector, renderer.bestSector, renderer.bestLevel),
    bestLevel: Math.max(local.bestLevel, local.bestSector, renderer.bestLevel, renderer.bestSector),
    bestRank: Math.max(local.bestRank, renderer.bestRank),
    bestRunTimeSeconds: Math.max(local.bestRunTimeSeconds, renderer.bestRunTimeSeconds),
    survivedSeconds: Math.max(local.survivedSeconds, renderer.survivedSeconds),
    totalBossesDefeated: Math.max(local.totalBossesDefeated, renderer.totalBossesDefeated),
    totalWavesCleared: Math.max(local.totalWavesCleared, renderer.totalWavesCleared),
    totalCodexDiscoveries: Math.max(local.totalCodexDiscoveries, renderer.totalCodexDiscoveries),
    runClears: Math.max(local.runClears, renderer.runClears),
    noHitWaves: Math.max(local.noHitWaves, renderer.noHitWaves),
    noHitSectors: Math.max(local.noHitSectors, renderer.noHitSectors),
    clearWithLivesRemaining: Math.max(local.clearWithLivesRemaining, renderer.clearWithLivesRemaining),
    highestScoreMultiplier: Math.max(local.highestScoreMultiplier, renderer.highestScoreMultiplier, 1),
    shipSpecificMilestones,
    discoveredThreatIds: mergeStringArray(local.discoveredThreatIds, renderer.discoveredThreatIds, { maxItems: 5000 }),
    defeatedBossIds: mergeStringArray(local.defeatedBossIds, renderer.defeatedBossIds),
    runThemesSurvived: mergeStringArray(local.runThemesSurvived, renderer.runThemesSurvived),
    secretShipUnlockIds: mergeStringArray(local.secretShipUnlockIds, renderer.secretShipUnlockIds),
    creditsEasterEggFound: Boolean(local.creditsEasterEggFound || renderer.creditsEasterEggFound),
    unlockedShipIds: mergeStringArray(local.unlockedShipIds, renderer.unlockedShipIds),
    shipUnlockHistory: mergeShipUnlockHistory(local.shipUnlockHistory, renderer.shipUnlockHistory),
    lastNewlyUnlockedShipIds: Array.isArray(local.lastNewlyUnlockedShipIds) ? local.lastNewlyUnlockedShipIds : [],
    newRanksThisRun: Array.isArray(local.newRanksThisRun) ? local.newRanksThisRun : [],
    rankAchievementsUnlocked: mergeStringArray(local.rankAchievementsUnlocked, renderer.rankAchievementsUnlocked),
    rankProgress: renderer.rankProgress || local.rankProgress || null,
    runContracts: mergeRunContractsState(local.runContracts, renderer.runContracts),
    overrunUnlockCelebrationSeen: Boolean(
      local.overrunUnlockCelebrationSeen || renderer.overrunUnlockCelebrationSeen
    ),
    overrunUnlockCelebrationPending: Boolean(
      (local.overrunUnlockCelebrationPending || renderer.overrunUnlockCelebrationPending)
      && !(local.overrunUnlockCelebrationSeen || renderer.overrunUnlockCelebrationSeen)
    ),
    updatedAt: renderer.updatedAt || local.updatedAt || nowIso()
  });
}

function sanitizeDisplaySettings(display = {}) {
  const raw = display && typeof display === 'object' ? display : {};
  const mode = DISPLAY_MODES.has(raw.mode) ? raw.mode : 'fullscreen';
  const size = raw.windowSize || raw.resolution || raw.size || {};
  const width = sanitizeNumber(size.width, 1280, { min: 960, max: 7680 });
  const height = sanitizeNumber(size.height, 720, { min: 540, max: 4320 });
  const uiScale = [1, 1.25, 1.5, 1.75, 2].includes(Number(raw.uiScale))
    ? Number(raw.uiScale)
    : 1;
  return {
    mode,
    windowSize: { width, height },
    uiScale
  };
}

function sanitizeMenuSettings(menu = {}) {
  const raw = menu && typeof menu === 'object' ? menu : {};
  const value = raw.confirmExit;
  const confirmExit = value === false || value === 'false' || value === '0' || value === 0 || value === 'off'
    ? false
    : true;
  const pilotOrdersValue = raw.showPilotOrders;
  const showPilotOrders = pilotOrdersValue === false || pilotOrdersValue === 'false' || pilotOrdersValue === '0' || pilotOrdersValue === 0 || pilotOrdersValue === 'off'
    ? false
    : true;
  return { confirmExit, showPilotOrders };
}

function sanitizeControlSettings(controls = {}) {
  const raw = controls && typeof controls === 'object' ? controls : {};
  return {
    fireInput: raw.fireInput === 'toggle' ? 'toggle' : 'hold',
    mouseSteering: raw.mouseSteering === true
  };
}

function sanitizeSettings(settings = {}) {
  const clampUnit = (value, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(1, number));
  };
  return {
    screenShake: clampUnit(settings.screenShake, 1),
    playerFocus: clampUnit(settings.playerFocus, 0.72),
    colorAssist: Boolean(settings.colorAssist),
    audio: sanitizeAudioSettings(settings.audio || {}),
    display: sanitizeDisplaySettings(settings.display || {}),
    menu: sanitizeMenuSettings(settings.menu || {}),
    controls: sanitizeControlSettings(settings.controls || {})
  };
}

function sanitizeShipUsage(rawUsage = {}) {
  if (!rawUsage || typeof rawUsage !== 'object' || Array.isArray(rawUsage)) return {};
  const usage = {};
  for (const [rawKey, rawValue] of Object.entries(rawUsage).slice(0, 500)) {
    const key = String(rawKey || '').trim().slice(0, 160);
    const value = sanitizeNumber(rawValue, 0);
    if (!key || value <= 0) continue;
    usage[key] = Math.max(usage[key] || 0, value);
  }
  return usage;
}

function sumShipUsage(usage = {}) {
  return Object.values(sanitizeShipUsage(usage))
    .reduce((total, value) => total + value, 0);
}

function sanitizeSectorStartChallengeRecord(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const startSector = sanitizeNumber(raw.startSector ?? raw.sectorStartCheckpoint, 0, { min: 1 });
  if (startSector < 1) return null;
  const highestSectorReached = Math.max(
    startSector,
    sanitizeNumber(raw.highestSectorReached ?? raw.sectorReached ?? raw.levelReached, startSector, { min: startSector })
  );
  const finalSector = Math.max(
    startSector,
    sanitizeNumber(raw.finalSector ?? raw.sectorReached ?? raw.levelReached, highestSectorReached, { min: startSector })
  );
  const textOrNull = (value) => {
    const text = String(value || '').trim();
    return text ? text.slice(0, 120) : null;
  };
  const completedAt = raw.completedAt || raw.timestamp;
  return {
    startSector,
    scoreEarned: sanitizeNumber(raw.scoreEarned ?? raw.score ?? raw.finalScore, 0),
    highestSectorReached,
    finalSector,
    shipId: textOrNull(raw.shipId),
    shipName: textOrNull(raw.shipName),
    selectedShipSpriteKey: textOrNull(raw.selectedShipSpriteKey ?? raw.shipKey),
    completedAt: completedAt ? String(completedAt).slice(0, 80) : nowIso(),
    runElapsedSeconds: sanitizeNumber(raw.runElapsedSeconds, 0),
    bossesKilled: sanitizeNumber(raw.bossesKilled, 0),
    wavesCleared: sanitizeNumber(raw.wavesCleared, 0),
    runCleared: Boolean(raw.runCleared),
    source: 'sector_start_challenge'
  };
}

function sanitizeSectorStartChallengeRecords(rawRecords = {}) {
  const raw = rawRecords && typeof rawRecords === 'object' ? rawRecords : {};
  const candidates = Array.isArray(raw)
    ? raw
    : Object.values(raw.byCheckpoint ?? raw.records ?? raw);
  const byCheckpoint = {};
  for (const candidate of candidates) {
    const record = sanitizeSectorStartChallengeRecord(candidate);
    if (!record) continue;
    byCheckpoint[String(record.startSector)] = record;
  }
  return {
    version: Math.max(1, sanitizeNumber(raw.version, 1)),
    updatedAt: raw.updatedAt ? String(raw.updatedAt).slice(0, 80) : null,
    byCheckpoint
  };
}

function sanitizeScoutRunRecord(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const score = sanitizeNumber(raw.score ?? raw.finalScore, 0);
  if (score <= 0) return null;
  const sectorReached = Math.max(1, sanitizeNumber(raw.sectorReached ?? raw.levelReached, 1));
  const completedAt = String(raw.completedAt || raw.timestamp || nowIso());
  return {
    score,
    sectorReached,
    levelReached: Math.max(1, sanitizeNumber(raw.levelReached ?? raw.sectorReached, sectorReached)),
    shipId: sanitizeOptionalString(raw.shipId, 120),
    shipName: sanitizeOptionalString(raw.shipName, 120),
    selectedShipSpriteKey: sanitizeOptionalString(raw.selectedShipSpriteKey ?? raw.shipKey, 120),
    completedAt,
    runElapsedSeconds: sanitizeNumber(raw.runElapsedSeconds, 0),
    bossesKilled: sanitizeNumber(raw.bossesKilled, 0),
    wavesCleared: sanitizeNumber(raw.wavesCleared, 0),
    runCleared: Boolean(raw.runCleared),
    source: 'scout_local_best'
  };
}

function sanitizeScoutRunRecords(rawRecords = {}) {
  const raw = rawRecords && typeof rawRecords === 'object' ? rawRecords : {};
  return {
    version: Math.max(1, sanitizeNumber(raw.version, 1)),
    updatedAt: String(raw.updatedAt || nowIso()),
    best: sanitizeScoutRunRecord(raw.best ?? raw.personalBest ?? raw)
  };
}

function isBetterScoutRunRecord(candidate, previous) {
  const next = sanitizeScoutRunRecord(candidate);
  const current = sanitizeScoutRunRecord(previous);
  if (!next) return false;
  if (!current) return true;
  if (next.score !== current.score) return next.score > current.score;
  if (next.sectorReached !== current.sectorReached) return next.sectorReached > current.sectorReached;
  if (next.levelReached !== current.levelReached) return next.levelReached > current.levelReached;
  return Date.parse(next.completedAt) > Date.parse(current.completedAt);
}

function mergeScoutRunRecords(localRecords = {}, rendererRecords = {}) {
  const local = sanitizeScoutRunRecords(localRecords);
  const renderer = sanitizeScoutRunRecords(rendererRecords);
  const best = isBetterScoutRunRecord(renderer.best, local.best) ? renderer.best : local.best;
  return {
    version: Math.max(local.version, renderer.version, 1),
    updatedAt: renderer.updatedAt || local.updatedAt || nowIso(),
    best: best || null
  };
}

const OVERRUN_RUN_MODES = Object.freeze(['overrun_pure', 'overrun_tactical']);

function sanitizeOverrunRunRecord(raw = {}, fallbackMode = null) {
  if (!raw || typeof raw !== 'object') return null;
  const runMode = OVERRUN_RUN_MODES.includes(raw.runMode) ? raw.runMode : fallbackMode;
  if (!OVERRUN_RUN_MODES.includes(runMode)) return null;
  const score = sanitizeNumber(raw.score ?? raw.finalScore, 0);
  if (score <= 0) return null;
  const sectorReached = Math.max(1, sanitizeNumber(raw.sectorReached ?? raw.levelReached, 1));
  return {
    score,
    sectorReached,
    levelReached: Math.max(1, sanitizeNumber(raw.levelReached ?? raw.sectorReached, sectorReached)),
    runMode,
    shipId: sanitizeOptionalString(raw.shipId, 120),
    shipName: sanitizeOptionalString(raw.shipName, 120),
    selectedShipSpriteKey: sanitizeOptionalString(raw.selectedShipSpriteKey ?? raw.shipKey, 120),
    completedAt: String(raw.completedAt || raw.timestamp || nowIso()),
    runElapsedSeconds: sanitizeNumber(raw.runElapsedSeconds, 0),
    bossesKilled: sanitizeNumber(raw.bossesKilled, 0),
    wavesCleared: sanitizeNumber(raw.wavesCleared, 0),
    source: 'overrun_personal_best'
  };
}

function sanitizeOverrunRunRecords(rawRecords = {}) {
  const raw = rawRecords && typeof rawRecords === 'object' ? rawRecords : {};
  const source = raw.byMode && typeof raw.byMode === 'object' ? raw.byMode : raw;
  const byMode = {};
  for (const mode of OVERRUN_RUN_MODES) {
    const record = sanitizeOverrunRunRecord(source[mode], mode);
    if (record) byMode[mode] = record;
  }
  return {
    version: Math.max(1, sanitizeNumber(raw.version, 1)),
    updatedAt: String(raw.updatedAt || nowIso()),
    byMode
  };
}

function isBetterOverrunRunRecord(candidate, previous) {
  const next = sanitizeOverrunRunRecord(candidate, candidate?.runMode);
  const current = sanitizeOverrunRunRecord(previous, previous?.runMode);
  if (!next) return false;
  if (!current) return true;
  if (next.score !== current.score) return next.score > current.score;
  if (next.sectorReached !== current.sectorReached) return next.sectorReached > current.sectorReached;
  if (next.levelReached !== current.levelReached) return next.levelReached > current.levelReached;
  return Date.parse(next.completedAt) > Date.parse(current.completedAt);
}

function mergeOverrunRunRecords(localRecords = {}, rendererRecords = {}) {
  const local = sanitizeOverrunRunRecords(localRecords);
  const renderer = sanitizeOverrunRunRecords(rendererRecords);
  const byMode = {};
  for (const mode of OVERRUN_RUN_MODES) {
    const best = isBetterOverrunRunRecord(renderer.byMode[mode], local.byMode[mode])
      ? renderer.byMode[mode]
      : local.byMode[mode];
    if (best) byMode[mode] = best;
  }
  return {
    version: Math.max(local.version, renderer.version, 1),
    updatedAt: renderer.updatedAt || local.updatedAt || nowIso(),
    byMode
  };
}

function isBetterSectorStartChallengeRecord(candidate, previous) {
  const next = sanitizeSectorStartChallengeRecord(candidate);
  const current = sanitizeSectorStartChallengeRecord(previous);
  if (!next) return false;
  if (!current) return true;
  if (next.scoreEarned !== current.scoreEarned) return next.scoreEarned > current.scoreEarned;
  if (next.highestSectorReached !== current.highestSectorReached) {
    return next.highestSectorReached > current.highestSectorReached;
  }
  if (next.finalSector !== current.finalSector) return next.finalSector > current.finalSector;
  return Date.parse(next.completedAt) > Date.parse(current.completedAt);
}

function mergeSectorStartChallengeRecords(localRecords = {}, rendererRecords = {}) {
  const local = sanitizeSectorStartChallengeRecords(localRecords);
  const renderer = sanitizeSectorStartChallengeRecords(rendererRecords);
  const byCheckpoint = { ...local.byCheckpoint };
  for (const [checkpoint, record] of Object.entries(renderer.byCheckpoint)) {
    if (isBetterSectorStartChallengeRecord(record, byCheckpoint[checkpoint])) {
      byCheckpoint[checkpoint] = record;
    }
  }
  return {
    version: Math.max(local.version, renderer.version, 1),
    updatedAt: renderer.updatedAt || local.updatedAt || nowIso(),
    byCheckpoint
  };
}

function mergeShipUsage(localUsage = {}, rendererUsage = {}) {
  const local = sanitizeShipUsage(localUsage);
  const renderer = sanitizeShipUsage(rendererUsage);
  const keys = [...new Set([...Object.keys(local), ...Object.keys(renderer)])];
  return Object.fromEntries(keys
    .map((key) => [key, Math.max(local[key] || 0, renderer[key] || 0)])
    .filter(([, value]) => value > 0));
}

function mergeThreatItem(localItem = {}, rendererItem = {}, fallback = {}) {
  const local = localItem && typeof localItem === 'object' ? localItem : {};
  const renderer = rendererItem && typeof rendererItem === 'object' ? rendererItem : {};
  return sanitizeThreatItem({
    ...local,
    ...renderer,
    id: renderer.id || local.id || fallback.id,
    category: renderer.category || local.category || fallback.category,
    name: renderer.name || local.name || fallback.name || renderer.id || local.id || fallback.id,
    firstSeenAt: local.firstSeenAt || renderer.firstSeenAt,
    lastSeenAt: renderer.lastSeenAt || local.lastSeenAt,
    timesSeen: Math.max(sanitizeNumber(local.timesSeen, 0), sanitizeNumber(renderer.timesSeen, 0)),
    timesDefeated: Math.max(sanitizeNumber(local.timesDefeated, 0), sanitizeNumber(renderer.timesDefeated, 0)),
    timesSurvived: Math.max(sanitizeNumber(local.timesSurvived, 0), sanitizeNumber(renderer.timesSurvived, 0)),
    timesKilledPlayer: Math.max(sanitizeNumber(local.timesKilledPlayer, 0), sanitizeNumber(renderer.timesKilledPlayer, 0)),
    bestClearTimeAgainst: Number.isFinite(Number(local.bestClearTimeAgainst)) && Number.isFinite(Number(renderer.bestClearTimeAgainst))
      ? Math.min(Number(local.bestClearTimeAgainst), Number(renderer.bestClearTimeAgainst))
      : (Number.isFinite(Number(local.bestClearTimeAgainst)) ? Number(local.bestClearTimeAgainst) : (Number.isFinite(Number(renderer.bestClearTimeAgainst)) ? Number(renderer.bestClearTimeAgainst) : null)),
    highestScoreDuringEncounter: Math.max(
      sanitizeNumber(local.highestScoreDuringEncounter, 0),
      sanitizeNumber(renderer.highestScoreDuringEncounter, 0)
    ),
    metadata: {
      ...(local.metadata && typeof local.metadata === 'object' ? local.metadata : {}),
      ...(renderer.metadata && typeof renderer.metadata === 'object' ? renderer.metadata : {})
    }
  }, fallback);
}

function mergeThreatDiscovery(localDiscovery = {}, rendererDiscovery = {}) {
  const local = sanitizeThreatDiscovery(localDiscovery);
  const renderer = sanitizeThreatDiscovery(rendererDiscovery);
  const categories = [...new Set([
    ...Object.keys(local.items || {}),
    ...Object.keys(renderer.items || {})
  ])];
  const items = {};
  for (const category of categories) {
    const localBucket = local.items?.[category] && typeof local.items[category] === 'object' ? local.items[category] : {};
    const rendererBucket = renderer.items?.[category] && typeof renderer.items[category] === 'object' ? renderer.items[category] : {};
    items[category] = {};
    for (const id of [...new Set([...Object.keys(localBucket), ...Object.keys(rendererBucket)])]) {
      items[category][id] = mergeThreatItem(localBucket[id], rendererBucket[id], { id, category });
    }
  }
  const viewedMarker = pickLatestCodexViewMarker(local, renderer);
  const currentSignature = getCodexDiscoverySignature(items);
  const unreadIds = viewedMarker?.lastViewedCodexDiscoverySignature === currentSignature.signature
    ? []
    : [...new Set([
      ...(Array.isArray(local.unreadIds) ? local.unreadIds : []),
      ...(Array.isArray(renderer.unreadIds) ? renderer.unreadIds : [])
    ])];
  return sanitizeThreatDiscovery({
    ...local,
    ...renderer,
    items,
    discoveriesThisRun: Array.isArray(renderer.discoveriesThisRun) ? renderer.discoveriesThisRun : local.discoveriesThisRun,
    recentRunThemes: [...new Set([
      ...(Array.isArray(local.recentRunThemes) ? local.recentRunThemes : []),
      ...(Array.isArray(renderer.recentRunThemes) ? renderer.recentRunThemes : [])
    ])].slice(-8),
    ...(viewedMarker || {}),
    ...(viewedMarker?.lastViewedCodexDiscoverySignature === currentSignature.signature
      ? { lastViewedCodexDiscoveryCount: currentSignature.count }
      : {}),
    unreadIds
  });
}

function countThreatDiscoveryItems(discovery = {}) {
  const items = discovery?.items && typeof discovery.items === 'object' ? discovery.items : {};
  return Object.values(items)
    .reduce((sum, bucket) => sum + (bucket && typeof bucket === 'object' ? Object.keys(bucket).length : 0), 0);
}

function getThreatDiscoveryIds(discovery = {}) {
  const items = discovery?.items && typeof discovery.items === 'object' ? discovery.items : {};
  return Object.values(items)
    .flatMap((bucket) => (bucket && typeof bucket === 'object' ? Object.keys(bucket) : []))
    .map(String)
    .filter(Boolean);
}

function getHighestDiscoveredSector(discovery = {}) {
  const sectors = discovery?.items?.sectors && typeof discovery.items.sectors === 'object' ? discovery.items.sectors : {};
  return Object.keys(sectors)
    .map((id) => Number(String(id).match(/^sector_(\d{3,})$/)?.[1] || 0))
    .filter(Number.isFinite)
    .reduce((max, sector) => Math.max(max, Math.floor(sector)), 0);
}

function getHighestDiscoveredPilotRank(discovery = {}) {
  const ranks = discovery?.items?.pilotRanks && typeof discovery.items.pilotRanks === 'object' ? discovery.items.pilotRanks : {};
  return Object.keys(ranks)
    .map((id) => Number(String(id).match(/^pilot_rank_(\d{2,})$/)?.[1] ?? -1))
    .filter(Number.isFinite)
    .reduce((max, rank) => Math.max(max, Math.floor(rank)), -1);
}

function bestScoreFromScores(scores = []) {
  return sanitizeScores(scores)
    .reduce((max, entry) => Math.max(max, sanitizeNumber(entry.score, 0)), 0);
}

function shipIdFromAny(value) {
  const text = String(value || '').trim();
  if (/^nova_ship_\d{2}$/i.test(text)) return text.toLowerCase();
  const match = text.match(/nova-player-ship-(\d{1,2})/i);
  return match ? `nova_ship_${String(Number(match[1])).padStart(2, '0')}` : null;
}

function collectEvidencedShipIds({
  selectedShipKey = null,
  localHighscores = [],
  sectorStartChallengeRecords = {},
  scoutRunRecords = {},
  shipUsage = {}
} = {}) {
  const ids = new Set();
  const add = (value) => {
    const id = shipIdFromAny(value);
    if (id) ids.add(id);
  };
  add(selectedShipKey);
  for (const entry of sanitizeScores(localHighscores)) {
    add(entry.shipId);
    add(entry.selectedShipSpriteKey);
    add(entry.shipKey);
  }
  for (const record of Object.values(sanitizeSectorStartChallengeRecords(sectorStartChallengeRecords).byCheckpoint || {})) {
    add(record.shipId);
    add(record.selectedShipSpriteKey);
  }
  const scoutBest = sanitizeScoutRunRecords(scoutRunRecords).best;
  if (scoutBest) {
    add(scoutBest.shipId);
    add(scoutBest.selectedShipSpriteKey);
  }
  for (const key of Object.keys(sanitizeShipUsage(shipUsage))) add(key);
  return [...ids];
}

function shouldApplyCodexHangarRescue(progress = {}, discovery = {}) {
  const base = sanitizeHangarProgress(progress);
  const discoveryCount = countThreatDiscoveryItems(discovery);
  const highestSector = getHighestDiscoveredSector(discovery);
  const highestRank = getHighestDiscoveredPilotRank(discovery);
  if (discoveryCount < 50 || highestSector < 10 || highestRank < 4) return false;
  const rankFloorXp = highestRank >= 0 ? pilotXpThreshold(highestRank) : 0;
  return base.totalCodexDiscoveries <= Math.max(5, Math.floor(discoveryCount * 0.1)) &&
    base.bestSector < Math.max(5, Math.floor(highestSector * 0.5)) &&
    base.pilotXp <= Math.floor(rankFloorXp * 0.25);
}

function pilotXpThreshold(rankIndex) {
  const rank = sanitizeNumber(rankIndex, 0, { min: 0, max: PILOT_XP_THRESHOLDS.length - 1 });
  return PILOT_XP_THRESHOLDS[rank] || 0;
}

function repairHangarProgressFromPersistence(progress = {}, {
  threatDiscovery = {},
  localHighscores = [],
  progression = {},
  selectedShipKey = null,
  sectorStartChallengeRecords = {},
  scoutRunRecords = {},
  shipUsage = {}
} = {}) {
  const base = sanitizeHangarProgress(progress);
  if (!shouldApplyCodexHangarRescue(base, threatDiscovery)) return base;
  const discoveryCount = countThreatDiscoveryItems(threatDiscovery);
  const discoveredIds = getThreatDiscoveryIds(threatDiscovery);
  const highestSector = getHighestDiscoveredSector(threatDiscovery);
  const highestRank = getHighestDiscoveredPilotRank(threatDiscovery);
  const bestLevel = Math.max(
    base.bestLevel,
    base.bestSector,
    sanitizeNumber(progression?.bestLevel, 1, { min: 1 }),
    highestSector || 1
  );
  const bestRank = Math.max(
    base.bestRank,
    sanitizeNumber(progression?.bestRank, 0),
    highestRank
  );
  const evidencedShipIds = collectEvidencedShipIds({
    selectedShipKey,
    localHighscores,
    sectorStartChallengeRecords,
    scoutRunRecords,
    shipUsage
  });
  return mergeHangarProgress(base, {
    pilotXp: Math.max(base.pilotXp, highestRank >= 0 ? pilotXpThreshold(highestRank) : 0),
    pilotRank: Math.max(base.pilotRank, highestRank),
    highestPilotRank: Math.max(base.highestPilotRank, highestRank),
    bestScore: Math.max(base.bestScore, sanitizeNumber(progression?.bestScore, 0), bestScoreFromScores(localHighscores)),
    bestSector: bestLevel,
    bestLevel,
    bestRank,
    totalCodexDiscoveries: Math.max(base.totalCodexDiscoveries, discoveryCount),
    discoveredThreatIds: discoveredIds,
    unlockedShipIds: evidencedShipIds,
    secretShipUnlockIds: evidencedShipIds
  });
}

function sanitizeRendererState(state = {}) {
  const selectedShipKey = typeof state.selectedShipKey === 'string' && state.selectedShipKey.trim()
    ? state.selectedShipKey.trim().slice(0, 160)
    : null;
  const shipUsage = sanitizeShipUsage(state.shipUsage || state.shipUsageByShip || {});
  const localHighscores = sanitizeScores(state.localHighscores);
  const progression = sanitizeUnlockProgress(state.progression || state.unlockProgress || {});
  const threatDiscovery = sanitizeThreatDiscovery(state.threatDiscovery || {});
  const sectorStartChallengeRecords = sanitizeSectorStartChallengeRecords(
    state.sectorStartChallengeRecords || state.sectorStartRecords || {}
  );
  const scoutRunRecords = sanitizeScoutRunRecords(state.scoutRunRecords || state.scoutBest || state.scoutRunBest || {});
  const overrunRunRecords = sanitizeOverrunRunRecords(state.overrunRunRecords || {});
  const hangarProgress = repairHangarProgressFromPersistence(
    sanitizeHangarProgress(state.hangarProgress || {}),
    {
      threatDiscovery,
      localHighscores,
      progression,
      selectedShipKey,
      sectorStartChallengeRecords,
      scoutRunRecords,
      shipUsage
    }
  );
  return {
    language: sanitizeLanguageState(state.language || {
      preference: state.languagePreference,
      current: state.currentLanguage
    }),
    localHighscores,
    achievements: sanitizeAchievements(state.achievements || state.achievementMirror),
    selectedShipKey,
    progression: mergeUnlockProgress(progression, {
      bestScore: hangarProgress.bestScore,
      bestRank: hangarProgress.bestRank,
      bestLevel: Math.max(hangarProgress.bestLevel, hangarProgress.bestSector)
    }),
    hangarProgress,
    threatDiscovery,
    sectorStartChallengeRecords,
    scoutRunRecords,
    overrunRunRecords,
    shipUsage,
    shipUsageTotal: Math.max(sanitizeNumber(state.shipUsageTotal, 0), sumShipUsage(shipUsage)),
    settings: sanitizeSettings(state.settings || {})
  };
}

function createEmptySave(profileContext = {}) {
  return {
    version: SAVE_VERSION,
    profile: createSaveProfile(profileContext),
    updatedAt: nowIso(),
    language: sanitizeLanguageState(),
    localHighscores: [],
    achievements: sanitizeAchievements(),
    selectedShipKey: null,
    progression: sanitizeUnlockProgress(),
    hangarProgress: sanitizeHangarProgress(),
    threatDiscovery: sanitizeThreatDiscovery(),
    sectorStartChallengeRecords: sanitizeSectorStartChallengeRecords(),
    scoutRunRecords: sanitizeScoutRunRecords(),
    overrunRunRecords: sanitizeOverrunRunRecords(),
    shipUsage: sanitizeShipUsage(),
    shipUsageTotal: 0,
    settings: sanitizeSettings()
  };
}

function normalizeSave(rawSave = {}, localHighscores = null, profileContext = {}) {
  const rendererState = sanitizeRendererState(rawSave);
  return {
    version: SAVE_VERSION,
    profile: normalizeSaveProfile(rawSave.profile, profileContext),
    updatedAt: String(rawSave.updatedAt || nowIso()),
    language: rendererState.language,
    localHighscores: sanitizeScores(localHighscores ?? rawSave.localHighscores),
    achievements: rendererState.achievements,
    selectedShipKey: rendererState.selectedShipKey,
    progression: rendererState.progression,
    hangarProgress: rendererState.hangarProgress,
    threatDiscovery: rendererState.threatDiscovery,
    sectorStartChallengeRecords: rendererState.sectorStartChallengeRecords,
    scoutRunRecords: rendererState.scoutRunRecords,
    overrunRunRecords: rendererState.overrunRunRecords,
    shipUsage: rendererState.shipUsage,
    shipUsageTotal: rendererState.shipUsageTotal,
    settings: rendererState.settings
  };
}

function createSteamCloudSave(userDataPath, logger = console, options = {}) {
  const profile = normalizeProfileContext(options.profile || options.profileContext || {});
  const paths = getPaths(userDataPath, profile);
  let asyncMergeQueue = Promise.resolve();
  const ioDiagnostics = {
    asyncReads: 0,
    asyncWrites: 0,
    skippedUnchangedWrites: 0,
    queuedMerges: 0,
    activeMerges: 0,
    maxConcurrentMerges: 0,
    lastReadMs: 0,
    lastWriteMs: 0,
    lastWriteSkipped: false
  };

  function readLegacyHighscores() {
    const current = sanitizeScores(readJsonFile(paths.legacyHighscorePath, []));
    if (current.length) return current;
    return sanitizeScores(readJsonFile(paths.oldHighscorePath, []));
  }

  function readSave() {
    const backupPath = backupCorruptSave(paths.cloudSavePath);
    if (backupPath) {
      logger.warn?.(`[SteamCloudSave] Corrupt cloud save backed up to ${backupPath}`);
    }
    const parsed = readJsonFile(paths.cloudSavePath, null);
    if (parsed) return normalizeSave(parsed, null, profile);

    const legacyParsed = readJsonFile(paths.legacyCloudSavePath, null);
    if (legacyParsed) {
      const index = readProfileIndex(paths.profileIndexPath);
      const knownProfileCount = Object.keys(index.profiles || {}).length;
      const unclaimedSharedLegacy = !hasExplicitProfile(legacyParsed) &&
        !index.legacyClaimedBy &&
        knownProfileCount === 0;
      const mayClaimLegacy = profile.type === 'steam' && unclaimedSharedLegacy;
      const mayUseLocalLegacy = profile.type === 'local' && !hasExplicitProfile(legacyParsed);
      if (profileMatches(legacyParsed, profile) || mayClaimLegacy || mayUseLocalLegacy) {
        const imported = normalizeSave({
          ...legacyParsed,
          profile: createSaveProfile(profile)
        }, null, profile);
        writeJsonAtomic(paths.cloudSavePath, imported);
        updateProfileIndex(paths, profile, {
          legacyClaimedBy: mayClaimLegacy ? profile.storageId : null,
          profilePatch: {
            importedFromLegacy: true,
            importedAt: nowIso()
          }
        });
        return imported;
      }
    }

    return normalizeSave(createEmptySave(profile), null, profile);
  }

  function shouldMirrorLegacy(normalized) {
    if (profile.type !== 'steam') return false;
    const legacyParsed = readJsonFile(paths.legacyCloudSavePath, null);
    if (!legacyParsed) return true;
    if (profileMatches(legacyParsed, profile)) return true;
    return isMeaningfulSave(normalized);
  }

  function writeSave(nextSave) {
    const normalized = normalizeSave({
      ...nextSave,
      profile: createSaveProfile(profile),
      updatedAt: nowIso()
    }, null, profile);
    const existingRaw = readJsonFile(paths.cloudSavePath, null);
    if (existingRaw) {
      const existing = normalizeSave(existingRaw, null, profile);
      if (comparableSaveText(existing) === comparableSaveText(normalized)) {
        ioDiagnostics.skippedUnchangedWrites += 1;
        ioDiagnostics.lastWriteSkipped = true;
        return existing;
      }
    }
    ioDiagnostics.lastWriteSkipped = false;
    writeJsonAtomic(paths.cloudSavePath, normalized);
    updateProfileIndex(paths, profile);
    if (shouldMirrorLegacy(normalized)) {
      const legacyParsed = readJsonFile(paths.legacyCloudSavePath, null);
      if (legacyParsed && !profileMatches(legacyParsed, profile)) {
        preserveLegacyCloudSave(paths, logger, `mirroring ${profile.storageId}`);
      }
      writeJsonAtomic(paths.legacyCloudSavePath, normalized);
    }
    return normalized;
  }

  function ensureInitialized() {
    const legacyHighscores = profile.type === 'local' ? readLegacyHighscores() : [];
    const existing = readSave();
    const next = normalizeSave(existing, legacyHighscores.length ? legacyHighscores : existing.localHighscores, profile);
    next.updatedAt = nowIso();
    writeSave(next);
    if (!fs.existsSync(paths.legacyHighscorePath) && next.localHighscores.length) {
      writeJsonAtomic(paths.legacyHighscorePath, next.localHighscores);
    }
    return next;
  }

  function mirrorLocalHighscores(scores) {
    const current = readSave();
    return writeSave({
      ...current,
      localHighscores: sanitizeScores(scores)
    });
  }

  function buildMergedRendererState(current, state = {}) {
    const rendererState = sanitizeRendererState(state);
    const hasShipUsage = Object.hasOwn(state, 'shipUsage') || Object.hasOwn(state, 'shipUsageByShip');
    const shipUsage = hasShipUsage
      ? mergeShipUsage(current.shipUsage, rendererState.shipUsage)
      : current.shipUsage;
    return {
      ...current,
      language: Object.hasOwn(state, 'language') || Object.hasOwn(state, 'languagePreference')
        ? rendererState.language
        : current.language,
      localHighscores: Object.hasOwn(state, 'localHighscores')
        ? rendererState.localHighscores
        : current.localHighscores,
      achievements: Object.hasOwn(state, 'achievements') || Object.hasOwn(state, 'achievementMirror')
        ? rendererState.achievements
        : current.achievements,
      selectedShipKey: rendererState.selectedShipKey || current.selectedShipKey || null,
      progression: mergeUnlockProgress(current.progression, rendererState.progression),
      hangarProgress: Object.hasOwn(state, 'hangarProgress') || Object.hasOwn(state, 'threatDiscovery') || Object.hasOwn(state, 'localHighscores')
        ? repairHangarProgressFromPersistence(
          mergeHangarProgress(current.hangarProgress, rendererState.hangarProgress),
          {
            threatDiscovery: Object.hasOwn(state, 'threatDiscovery')
              ? mergeThreatDiscovery(current.threatDiscovery, rendererState.threatDiscovery)
              : current.threatDiscovery,
            localHighscores: Object.hasOwn(state, 'localHighscores') ? rendererState.localHighscores : current.localHighscores,
            progression: mergeUnlockProgress(current.progression, rendererState.progression),
            selectedShipKey: rendererState.selectedShipKey || current.selectedShipKey,
            sectorStartChallengeRecords: Object.hasOwn(state, 'sectorStartChallengeRecords') || Object.hasOwn(state, 'sectorStartRecords')
              ? mergeSectorStartChallengeRecords(current.sectorStartChallengeRecords, rendererState.sectorStartChallengeRecords)
              : current.sectorStartChallengeRecords,
            scoutRunRecords: Object.hasOwn(state, 'scoutRunRecords') || Object.hasOwn(state, 'scoutBest') || Object.hasOwn(state, 'scoutRunBest')
              ? mergeScoutRunRecords(current.scoutRunRecords, rendererState.scoutRunRecords)
              : current.scoutRunRecords,
            shipUsage
          }
        )
        : current.hangarProgress,
      threatDiscovery: Object.hasOwn(state, 'threatDiscovery')
        ? mergeThreatDiscovery(current.threatDiscovery, rendererState.threatDiscovery)
        : current.threatDiscovery,
      sectorStartChallengeRecords: Object.hasOwn(state, 'sectorStartChallengeRecords') || Object.hasOwn(state, 'sectorStartRecords')
        ? mergeSectorStartChallengeRecords(current.sectorStartChallengeRecords, rendererState.sectorStartChallengeRecords)
        : current.sectorStartChallengeRecords,
      scoutRunRecords: Object.hasOwn(state, 'scoutRunRecords') || Object.hasOwn(state, 'scoutBest') || Object.hasOwn(state, 'scoutRunBest')
        ? mergeScoutRunRecords(current.scoutRunRecords, rendererState.scoutRunRecords)
        : current.scoutRunRecords,
      overrunRunRecords: Object.hasOwn(state, 'overrunRunRecords')
        ? mergeOverrunRunRecords(current.overrunRunRecords, rendererState.overrunRunRecords)
        : current.overrunRunRecords,
      shipUsage,
      shipUsageTotal: Math.max(
        current.shipUsageTotal || 0,
        hasShipUsage ? rendererState.shipUsageTotal : 0,
        sumShipUsage(shipUsage)
      ),
      settings: rendererState.settings
    };
  }

  function mergeRendererState(state = {}) {
    return writeSave(buildMergedRendererState(readSave(), state));
  }

  async function readSaveForMergeAsync() {
    const startedAt = performance.now();
    const parsed = await readJsonFileAsync(paths.cloudSavePath, null);
    ioDiagnostics.asyncReads += 1;
    ioDiagnostics.lastReadMs = performance.now() - startedAt;
    if (parsed) return normalizeSave(parsed, null, profile);
    return readSave();
  }

  async function writeSaveAsync(nextSave, currentSave = null) {
    const normalized = normalizeSave({
      ...nextSave,
      profile: createSaveProfile(profile),
      updatedAt: nowIso()
    }, null, profile);
    const current = currentSave || await readSaveForMergeAsync();
    if (comparableSaveText(current) === comparableSaveText(normalized)) {
      ioDiagnostics.skippedUnchangedWrites += 1;
      ioDiagnostics.lastWriteSkipped = true;
      ioDiagnostics.lastWriteMs = 0;
      return {
        ...current,
        _persistenceIo: {
          writeSkipped: true,
          fileReads: 1,
          readMs: ioDiagnostics.lastReadMs,
          fileWrites: 0,
          writeMs: 0,
          queuedMerges: ioDiagnostics.queuedMerges
        }
      };
    }

    const startedAt = performance.now();
    let fileWrites = 0;
    await writeJsonAtomicAsync(paths.cloudSavePath, normalized);
    fileWrites += 1;
    // The profile index is identity metadata created during initialization;
    // renderer merges only update save data and must not rewrite that index.
    if (profile.type === 'steam') {
      const legacyParsed = await readJsonFileAsync(paths.legacyCloudSavePath, null);
      const shouldMirror = !legacyParsed || profileMatches(legacyParsed, profile) || isMeaningfulSave(normalized);
      if (shouldMirror) {
        if (legacyParsed && !profileMatches(legacyParsed, profile)) {
          await preserveLegacyCloudSaveAsync(paths, logger, `mirroring ${profile.storageId}`);
        }
        await writeJsonAtomicAsync(paths.legacyCloudSavePath, normalized);
        fileWrites += 1;
      }
    }
    ioDiagnostics.asyncWrites += fileWrites;
    ioDiagnostics.lastWriteMs = performance.now() - startedAt;
    ioDiagnostics.lastWriteSkipped = false;
    return {
      ...normalized,
      _persistenceIo: {
        writeSkipped: false,
        fileReads: 1,
        readMs: ioDiagnostics.lastReadMs,
        fileWrites,
        writeMs: ioDiagnostics.lastWriteMs,
        queuedMerges: ioDiagnostics.queuedMerges
      }
    };
  }

  function mergeRendererStateAsync(state = {}) {
    ioDiagnostics.queuedMerges += 1;
    const operation = asyncMergeQueue.then(async () => {
      ioDiagnostics.activeMerges += 1;
      ioDiagnostics.maxConcurrentMerges = Math.max(ioDiagnostics.maxConcurrentMerges, ioDiagnostics.activeMerges);
      try {
        const current = await readSaveForMergeAsync();
        return await writeSaveAsync(buildMergedRendererState(current, state), current);
      } finally {
        ioDiagnostics.activeMerges = Math.max(0, ioDiagnostics.activeMerges - 1);
      }
    });
    asyncMergeQueue = operation.catch(() => null);
    return operation;
  }

  function getPersistenceSummary() {
    const save = readSave();
    return {
      profile: save.profile,
      cloudSavePath: paths.cloudSavePath,
      legacyCloudSavePath: paths.legacyCloudSavePath,
      legacySharedSavePath: paths.legacySharedSavePath,
      languagePreference: save.language?.preference || 'system',
      currentLanguage: save.language?.current || null,
      localHighscoresCount: save.localHighscores.length,
      achievementMirrorCount: save.achievements.unlocked.length,
      selectedShipKey: save.selectedShipKey,
      progression: save.progression,
      hangarPilotXp: Math.max(0, Math.floor(Number(save.hangarProgress?.pilotXp) || 0)),
      hangarUnlockedShips: Array.isArray(save.hangarProgress?.unlockedShipIds) ? save.hangarProgress.unlockedShipIds.length : 0,
      pilotOrdersCompleted: Object.keys(sanitizeRunContractsState(save.hangarProgress?.runContracts).completed).length,
      shipUsageShips: Object.keys(sanitizeShipUsage(save.shipUsage)).length,
      shipUsageTotal: Math.max(sanitizeNumber(save.shipUsageTotal, 0), sumShipUsage(save.shipUsage)),
      sectorStartChallengeCheckpoints: Object.keys(
        sanitizeSectorStartChallengeRecords(save.sectorStartChallengeRecords || save.sectorStartRecords || {}).byCheckpoint
      ).length,
      scoutRunBestScore: sanitizeScoutRunRecords(save.scoutRunRecords || save.scoutBest || save.scoutRunBest).best?.score || 0,
      overrunRunBestScores: Object.fromEntries(
        Object.entries(sanitizeOverrunRunRecords(save.overrunRunRecords).byMode)
          .map(([mode, record]) => [mode, record.score])
      ),
      threatDiscoveryCategories: Object.keys(save.threatDiscovery?.items || {}).length,
      threatDiscoveryUnread: Array.isArray(save.threatDiscovery?.unreadIds) ? save.threatDiscovery.unreadIds.length : 0,
      updatedAt: save.updatedAt
    };
  }

  function getDiagnostics() {
    return {
      ok: true,
      profile,
      userDataPath: paths.userDataPath,
      cloudDir: paths.cloudDir,
      profileDir: paths.profileDir,
      cloudSavePath: paths.cloudSavePath,
      legacyCloudSavePath: paths.legacyCloudSavePath,
      legacySharedSavePath: paths.legacySharedSavePath,
      io: { ...ioDiagnostics },
      persistenceSummary: getPersistenceSummary(),
      steamworksAutoCloud: {
        byteQuota: 1048576,
        fileCount: 20,
        root: 'WinAppDataRoaming',
        subdirectory: path.join(path.basename(paths.userDataPath), CLOUD_SUBDIR).replace(/\\/g, '/'),
        pattern: CLOUD_SAVE_FILE,
        recursive: false,
        dynamicCloudSync: false
      }
    };
  }

  return {
    paths,
    profile,
    ensureInitialized,
    readSave,
    writeSave,
    mirrorLocalHighscores,
    mergeRendererState,
    mergeRendererStateAsync,
    getPersistenceSummary,
    getDiagnostics
  };
}

module.exports = {
  SAVE_VERSION,
  CLOUD_SUBDIR,
  PROFILE_SUBDIR,
  PROFILE_INDEX_FILE,
  CLOUD_SAVE_FILE,
  LEGACY_HIGHSCORE_FILE,
  OLD_HIGHSCORE_FILE,
  createSteamCloudSave,
  getPaths,
  normalizeProfileContext,
  sanitizeScores,
  sanitizeAchievements,
  sanitizeRendererState,
  sanitizeHangarProgress,
  sanitizeThreatDiscovery,
  mergeHangarProgress,
  repairHangarProgressFromPersistence
};
