const fs = require('node:fs');
const path = require('node:path');

const SAVE_VERSION = 2;
const CLOUD_SUBDIR = 'steam-cloud';
const CLOUD_SAVE_FILE = 'nova-swarm-save.json';
const LEGACY_HIGHSCORE_FILE = 'local-highscores-v2.json';
const OLD_HIGHSCORE_FILE = 'local-highscores.json';
const SUPPORTED_LANGUAGE_MODES = new Set(['system', 'en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']);
const MUSIC_PACKS = new Set(['classic', 'generated']);

function nowIso() {
  return new Date().toISOString();
}

function getPaths(userDataPath) {
  const root = path.resolve(userDataPath);
  const cloudDir = path.join(root, CLOUD_SUBDIR);
  return {
    userDataPath: root,
    cloudDir,
    cloudSavePath: path.join(cloudDir, CLOUD_SAVE_FILE),
    legacyHighscorePath: path.join(root, LEGACY_HIGHSCORE_FILE),
    oldHighscorePath: path.join(root, OLD_HIGHSCORE_FILE)
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

function readScoreLevel(entry = {}, fallback = 1) {
  const details = Array.isArray(entry.details)
    ? entry.details
    : Array.isArray(entry.scoreDetails)
      ? entry.scoreDetails
      : Array.isArray(entry.m_pDetails)
        ? entry.m_pDetails
        : Array.isArray(entry.metadata?.details)
          ? entry.metadata.details
          : [];
  for (const value of [
    entry.level,
    entry.levelReached,
    entry.metadata?.level,
    entry.metadata?.levelReached,
    entry.detailsMetadata?.level,
    entry.detailsMetadata?.levelReached,
    details[0]
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

function sanitizeRendererState(state = {}) {
  const selectedShipKey = typeof state.selectedShipKey === 'string' && state.selectedShipKey.trim()
    ? state.selectedShipKey.trim().slice(0, 160)
    : null;
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
    settings: sanitizeSettings(state.settings || {})
  };
}

function createEmptySave() {
  return {
    version: SAVE_VERSION,
    updatedAt: nowIso(),
    language: sanitizeLanguageState(),
    localHighscores: [],
    achievements: sanitizeAchievements(),
    selectedShipKey: null,
    progression: sanitizeUnlockProgress(),
    hangarProgress: sanitizeHangarProgress(),
    threatDiscovery: sanitizeThreatDiscovery(),
    settings: sanitizeSettings()
  };
}

function normalizeSave(rawSave = {}, localHighscores = null) {
  const rendererState = sanitizeRendererState(rawSave);
  return {
    version: SAVE_VERSION,
    updatedAt: String(rawSave.updatedAt || nowIso()),
    language: rendererState.language,
    localHighscores: sanitizeScores(localHighscores ?? rawSave.localHighscores),
    achievements: rendererState.achievements,
    selectedShipKey: rendererState.selectedShipKey,
    progression: rendererState.progression,
    hangarProgress: rendererState.hangarProgress,
    threatDiscovery: rendererState.threatDiscovery,
    settings: rendererState.settings
  };
}

function createSteamCloudSave(userDataPath, logger = console) {
  const paths = getPaths(userDataPath);

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
    return normalizeSave(parsed || createEmptySave());
  }

  function writeSave(nextSave) {
    const normalized = normalizeSave({
      ...nextSave,
      updatedAt: nowIso()
    });
    writeJsonAtomic(paths.cloudSavePath, normalized);
    return normalized;
  }

  function ensureInitialized() {
    const legacyHighscores = readLegacyHighscores();
    const existing = fs.existsSync(paths.cloudSavePath) ? readSave() : createEmptySave();
    const next = normalizeSave(existing, legacyHighscores.length ? legacyHighscores : existing.localHighscores);
    next.updatedAt = nowIso();
    writeJsonAtomic(paths.cloudSavePath, next);
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
      settings: rendererState.settings
    });
  }

  function getPersistenceSummary() {
    const save = readSave();
    return {
      cloudSavePath: paths.cloudSavePath,
      languagePreference: save.language?.preference || 'system',
      currentLanguage: save.language?.current || null,
      localHighscoresCount: save.localHighscores.length,
      achievementMirrorCount: save.achievements.unlocked.length,
      selectedShipKey: save.selectedShipKey,
      progression: save.progression,
      hangarPilotXp: Math.max(0, Math.floor(Number(save.hangarProgress?.pilotXp) || 0)),
      hangarUnlockedShips: Array.isArray(save.hangarProgress?.unlockedShipIds) ? save.hangarProgress.unlockedShipIds.length : 0,
      threatDiscoveryCategories: Object.keys(save.threatDiscovery?.items || {}).length,
      threatDiscoveryUnread: Array.isArray(save.threatDiscovery?.unreadIds) ? save.threatDiscovery.unreadIds.length : 0,
      updatedAt: save.updatedAt
    };
  }

  function getDiagnostics() {
    return {
      ok: true,
      userDataPath: paths.userDataPath,
      cloudDir: paths.cloudDir,
      cloudSavePath: paths.cloudSavePath,
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
  CLOUD_SAVE_FILE,
  LEGACY_HIGHSCORE_FILE,
  OLD_HIGHSCORE_FILE,
  createSteamCloudSave,
  getPaths,
  sanitizeScores,
  sanitizeAchievements,
  sanitizeRendererState,
  sanitizeHangarProgress,
  sanitizeThreatDiscovery
};
