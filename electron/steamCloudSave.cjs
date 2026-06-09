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
const SUPPORTED_LANGUAGE_MODES = new Set(['system', 'en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']);
const MUSIC_PACKS = new Set(['classic', 'generated']);

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

function isMeaningfulSave(save = {}) {
  const hangar = save.hangarProgress || {};
  const discoveryItems = save.threatDiscovery?.items || {};
  const discoveryCount = Object.values(discoveryItems)
    .reduce((sum, bucket) => sum + (bucket && typeof bucket === 'object' ? Object.keys(bucket).length : 0), 0);
  return Boolean(
    (Array.isArray(save.localHighscores) && save.localHighscores.length > 0) ||
    (Array.isArray(save.achievements?.unlocked) && save.achievements.unlocked.length > 0) ||
    Number(hangar.pilotXp) > 0 ||
    Number(hangar.totalRuns) > 0 ||
    Number(hangar.totalCodexDiscoveries) > 0 ||
    (Array.isArray(hangar.unlockedShipIds) && hangar.unlockedShipIds.length > 1) ||
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
  const rankIndex = Math.max(0, Math.min(19, Math.floor(Number(entry.rankIndex ?? entry.rank_index) || 0)));
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

function sanitizeHangarProgress(progress = {}) {
  const raw = progress && typeof progress === 'object' ? progress : {};
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
    bestSector: Math.max(1, sanitizeNumber(raw.bestSector ?? raw.bestLevel, 1, { min: 1 })),
    bestLevel: Math.max(1, sanitizeNumber(raw.bestLevel ?? raw.bestSector, 1, { min: 1 })),
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
    discoveredThreatIds: sanitizeStringArray(raw.discoveredThreatIds),
    defeatedBossIds: sanitizeStringArray(raw.defeatedBossIds),
    runThemesSurvived: sanitizeStringArray(raw.runThemesSurvived),
    secretShipUnlockIds: sanitizeStringArray(raw.secretShipUnlockIds),
    creditsEasterEggFound: Boolean(raw.creditsEasterEggFound),
    unlockedShipIds: sanitizeStringArray(raw.unlockedShipIds),
    lastNewlyUnlockedShipIds: sanitizeStringArray(raw.lastNewlyUnlockedShipIds),
    newRanksThisRun: sanitizeStringArray(raw.newRanksThisRun, { maxItems: 32, maxLength: 12 })
      .map((value) => sanitizeNumber(value, 0, { min: 0, max: 20 })),
    rankAchievementsUnlocked: sanitizeStringArray(raw.rankAchievementsUnlocked),
    rankProgress: raw.rankProgress && typeof raw.rankProgress === 'object'
      ? sanitizeJsonValue(raw.rankProgress, 1)
      : null,
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

function sanitizeThreatDiscovery(discovery = {}) {
  const raw = discovery && typeof discovery === 'object' ? discovery : {};
  const rawItems = raw.items && typeof raw.items === 'object' ? raw.items : {};
  const items = {};
  for (const [category, bucket] of Object.entries(rawItems).slice(0, 24)) {
    const cleanCategory = String(category || '').slice(0, 80);
    if (!cleanCategory || !bucket || typeof bucket !== 'object') continue;
    items[cleanCategory] = Object.fromEntries(
      Object.entries(bucket)
        .slice(0, 500)
        .filter(([id]) => String(id || '').trim())
        .map(([id, item]) => [String(id).slice(0, 160), sanitizeThreatItem(item, { id, category: cleanCategory })])
    );
  }
  const discoveriesThisRun = Array.isArray(raw.discoveriesThisRun)
    ? raw.discoveriesThisRun.slice(-80).map((entry) => sanitizeJsonValue(entry, 2)).filter(Boolean)
    : [];
  return {
    version: Math.max(1, sanitizeNumber(raw.version, 1)),
    items,
    discoveriesThisRun,
    recentRunThemes: sanitizeStringArray(raw.recentRunThemes, { maxItems: 8 }),
    unreadIds: sanitizeStringArray(raw.unreadIds),
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
  if (audio.ctaVoiceEnabled !== undefined) next.ctaVoiceEnabled = Boolean(audio.ctaVoiceEnabled);
  if (audio.musicPack !== undefined) {
    const musicPack = String(audio.musicPack || '').trim();
    if (MUSIC_PACKS.has(musicPack)) next.musicPack = musicPack;
  }
  return next;
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
    audio: sanitizeAudioSettings(settings.audio || {})
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

function sanitizeRendererState(state = {}) {
  const selectedShipKey = typeof state.selectedShipKey === 'string' && state.selectedShipKey.trim()
    ? state.selectedShipKey.trim().slice(0, 160)
    : null;
  const shipUsage = sanitizeShipUsage(state.shipUsage || state.shipUsageByShip || {});
  return {
    language: sanitizeLanguageState(state.language || {
      preference: state.languagePreference,
      current: state.currentLanguage
    }),
    localHighscores: sanitizeScores(state.localHighscores),
    achievements: sanitizeAchievements(state.achievements || state.achievementMirror),
    selectedShipKey,
    progression: sanitizeUnlockProgress(state.progression || state.unlockProgress || {}),
    hangarProgress: sanitizeHangarProgress(state.hangarProgress || {}),
    threatDiscovery: sanitizeThreatDiscovery(state.threatDiscovery || {}),
    sectorStartChallengeRecords: sanitizeSectorStartChallengeRecords(
      state.sectorStartChallengeRecords || state.sectorStartRecords || {}
    ),
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
    shipUsage: rendererState.shipUsage,
    shipUsageTotal: rendererState.shipUsageTotal,
    settings: rendererState.settings
  };
}

function createSteamCloudSave(userDataPath, logger = console, options = {}) {
  const profile = normalizeProfileContext(options.profile || options.profileContext || {});
  const paths = getPaths(userDataPath, profile);

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

  function mergeRendererState(state = {}) {
    const current = readSave();
    const rendererState = sanitizeRendererState(state);
    const hasShipUsage = Object.hasOwn(state, 'shipUsage') || Object.hasOwn(state, 'shipUsageByShip');
    const shipUsage = hasShipUsage
      ? mergeShipUsage(current.shipUsage, rendererState.shipUsage)
      : current.shipUsage;
    return writeSave({
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
      progression: rendererState.progression,
      hangarProgress: Object.hasOwn(state, 'hangarProgress')
        ? rendererState.hangarProgress
        : current.hangarProgress,
      threatDiscovery: Object.hasOwn(state, 'threatDiscovery')
        ? rendererState.threatDiscovery
        : current.threatDiscovery,
      sectorStartChallengeRecords: Object.hasOwn(state, 'sectorStartChallengeRecords') || Object.hasOwn(state, 'sectorStartRecords')
        ? mergeSectorStartChallengeRecords(current.sectorStartChallengeRecords, rendererState.sectorStartChallengeRecords)
        : current.sectorStartChallengeRecords,
      shipUsage,
      shipUsageTotal: Math.max(
        current.shipUsageTotal || 0,
        hasShipUsage ? rendererState.shipUsageTotal : 0,
        sumShipUsage(shipUsage)
      ),
      settings: rendererState.settings
    });
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
      shipUsageShips: Object.keys(sanitizeShipUsage(save.shipUsage)).length,
      shipUsageTotal: Math.max(sanitizeNumber(save.shipUsageTotal, 0), sumShipUsage(save.shipUsage)),
      sectorStartChallengeCheckpoints: Object.keys(
        sanitizeSectorStartChallengeRecords(save.sectorStartChallengeRecords || save.sectorStartRecords || {}).byCheckpoint
      ).length,
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
  sanitizeThreatDiscovery
};
