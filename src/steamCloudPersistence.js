import { readLeaderboardLevel } from './leaderboard/LeaderboardTypes.js';
import {
  SECTOR_START_CHALLENGE_RECORDS_KEY,
  isBetterSectorStartChallengeRecord,
  normalizeSectorStartChallengeRecord
} from './progression/SectorStartChallengeRecords.js';
import {
  DISPLAY_MODE_KEY,
  DISPLAY_WINDOW_SIZE_KEY,
  getDisplaySettings,
  normalizeDisplaySettings
} from './config/DisplaySettings.js';

export { DISPLAY_MODE_KEY, DISPLAY_WINDOW_SIZE_KEY };

export const CLOUD_LANGUAGE_KEY = 'novaSwarm.languagePreference.v1';
export const CLOUD_LOCAL_LEADERBOARD_KEY = 'novaSwarm.localLeaderboard.v2';
export const CLOUD_ACHIEVEMENT_KEY = 'nova_swarm_achievements_v1';
export const CLOUD_SELECTED_SHIP_KEY = 'burt.selectedShip.v1';
export const CLOUD_UNLOCK_PROGRESS_KEY = 'burt.shipUnlockProgress.v1';
export const CLOUD_HANGAR_PROGRESS_KEY = 'nova.hangarProgress.v1';
export const CLOUD_THREAT_DISCOVERY_KEY = 'nova.threatDiscovery.v1';
export const CLOUD_SHIP_USAGE_KEY = 'burt.shipUsage.v1';
export const CLOUD_SHIP_USAGE_TOTAL_KEY = 'burt.shipUsageTotal.v1';
export const CLOUD_SECTOR_START_CHALLENGE_RECORDS_KEY = SECTOR_START_CHALLENGE_RECORDS_KEY;

const SCREEN_SHAKE_KEY = 'burt_accessibility_screen_shake';
const PLAYER_FOCUS_KEY = 'burt_accessibility_player_focus';
const COLOR_ASSIST_KEY = 'nova_accessibility_color_assist';
const AUDIO_KEYS = Object.freeze({
  masterVolume: 'burt_volume_master',
  musicVolume: 'burt_volume_music',
  sfxVolume: 'burt_volume_sfx',
  voiceVolume: 'burt_volume_voice',
  musicEnabled: 'burt_music_enabled',
  voiceEnabled: 'burt_voice_enabled',
  bossVoiceEnabled: 'burt_boss_voice_enabled',
  ctaVoiceEnabled: 'burt_cta_voice_enabled',
  musicPack: 'burt_music_pack'
});
const SUPPORTED_LANGUAGE_MODES = new Set(['system', 'en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']);

function getDefaultStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readStorage(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage?.setItem?.(key, String(value));
    return true;
  } catch {
    return false;
  }
}

function removeStorage(storage, key) {
  try {
    storage?.removeItem?.(key);
    return true;
  } catch {
    return false;
  }
}

function readJsonStorage(storage, key, fallback) {
  try {
    const raw = readStorage(storage, key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function clampUnit(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function normalizeLanguagePreference(value) {
  if (SUPPORTED_LANGUAGE_MODES.has(value)) return value;
  return 'system';
}

function normalizeScoreEntry(entry = {}, fallbackIndex = 0) {
  if (!entry || typeof entry !== 'object') return null;
  const score = Math.max(0, Math.floor(Number(entry.score) || 0));
  const level = readLeaderboardLevel(entry, 1);
  const rawRankIndex = Number(entry.rankIndex ?? entry.rank_index);
  const rankIndex = Math.max(0, Math.min(39, Number.isFinite(rawRankIndex) ? Math.floor(rawRankIndex) : 0));
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
    timestamp: String(entry.timestamp || entry.created_at || new Date(0).toISOString()),
    source: entry.source || 'local',
    seed: Boolean(entry.seed)
  };
}

function normalizeScores(scores) {
  if (!Array.isArray(scores)) return [];
  return scores
    .map((entry, index) => normalizeScoreEntry(entry, index))
    .filter(Boolean)
    .filter((entry) => !entry.seed)
    .sort((a, b) => {
      const scoreDelta = (b.score || 0) - (a.score || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
    })
    .slice(0, 100);
}

function scoreKey(entry) {
  return entry.submissionId || [
    entry.name,
    entry.score,
    entry.level,
    entry.rankIndex,
    entry.timestamp,
    entry.shipId || ''
  ].join('|');
}

function mergeScores(localScores, cloudScores) {
  const merged = new Map();
  for (const entry of [...normalizeScores(localScores), ...normalizeScores(cloudScores)]) {
    merged.set(scoreKey(entry), entry);
  }
  return normalizeScores([...merged.values()]);
}

function normalizeProgression(progress = {}) {
  return {
    bestScore: Math.max(0, Math.floor(Number(progress.bestScore) || 0)),
    bestRank: Math.max(0, Math.floor(Number(progress.bestRank) || 0)),
    bestLevel: Math.max(1, Math.floor(Number(progress.bestLevel) || 1))
  };
}

function mergeProgression(localProgress, cloudProgress) {
  const local = normalizeProgression(localProgress);
  const cloud = normalizeProgression(cloudProgress);
  return {
    bestScore: Math.max(local.bestScore, cloud.bestScore),
    bestRank: Math.max(local.bestRank, cloud.bestRank),
    bestLevel: Math.max(local.bestLevel, cloud.bestLevel)
  };
}

function mergeNumberMax(local, cloud, key, fallback = 0) {
  return Math.max(
    fallback,
    Math.floor(Number(local?.[key]) || fallback),
    Math.floor(Number(cloud?.[key]) || fallback)
  );
}

function mergeArrayUnique(local, cloud, key) {
  return [...new Set([
    ...(Array.isArray(local?.[key]) ? local[key] : []),
    ...(Array.isArray(cloud?.[key]) ? cloud[key] : [])
  ].map(String).filter(Boolean))];
}

function normalizeUsageMap(rawUsage = {}) {
  if (!rawUsage || typeof rawUsage !== 'object' || Array.isArray(rawUsage)) return {};
  const usage = {};
  for (const [rawKey, rawValue] of Object.entries(rawUsage)) {
    const key = String(rawKey || '').trim().slice(0, 160);
    const value = Math.max(0, Math.floor(Number(rawValue) || 0));
    if (!key || value <= 0) continue;
    usage[key] = Math.max(usage[key] || 0, value);
  }
  return usage;
}

function sumUsageMap(usage = {}) {
  return Object.values(normalizeUsageMap(usage))
    .reduce((total, value) => total + value, 0);
}

function mergeShipUsage(localUsage = {}, cloudUsage = {}) {
  const local = normalizeUsageMap(localUsage);
  const cloud = normalizeUsageMap(cloudUsage);
  const keys = [...new Set([...Object.keys(local), ...Object.keys(cloud)])];
  return Object.fromEntries(keys
    .map((key) => [key, Math.max(local[key] || 0, cloud[key] || 0)])
    .filter(([, value]) => value > 0));
}

function mergeHangarProgress(localProgress = {}, cloudProgress = {}) {
  const local = localProgress && typeof localProgress === 'object' ? localProgress : {};
  const cloud = cloudProgress && typeof cloudProgress === 'object' ? cloudProgress : {};
  return {
    ...local,
    ...cloud,
    pilotXp: mergeNumberMax(local, cloud, 'pilotXp'),
    pilotRank: mergeNumberMax(local, cloud, 'pilotRank'),
    highestPilotRank: mergeNumberMax(local, cloud, 'highestPilotRank'),
    totalRuns: mergeNumberMax(local, cloud, 'totalRuns'),
    bestScore: mergeNumberMax(local, cloud, 'bestScore'),
    bestSector: mergeNumberMax(local, cloud, 'bestSector', 1),
    bestLevel: mergeNumberMax(local, cloud, 'bestLevel', 1),
    bestRank: mergeNumberMax(local, cloud, 'bestRank'),
    bestRunTimeSeconds: mergeNumberMax(local, cloud, 'bestRunTimeSeconds'),
    survivedSeconds: mergeNumberMax(local, cloud, 'survivedSeconds'),
    totalBossesDefeated: mergeNumberMax(local, cloud, 'totalBossesDefeated'),
    totalWavesCleared: mergeNumberMax(local, cloud, 'totalWavesCleared'),
    totalCodexDiscoveries: mergeNumberMax(local, cloud, 'totalCodexDiscoveries'),
    runClears: mergeNumberMax(local, cloud, 'runClears'),
    noHitWaves: mergeNumberMax(local, cloud, 'noHitWaves'),
    noHitSectors: mergeNumberMax(local, cloud, 'noHitSectors'),
    clearWithLivesRemaining: mergeNumberMax(local, cloud, 'clearWithLivesRemaining'),
    highestScoreMultiplier: Math.max(Number(local.highestScoreMultiplier) || 1, Number(cloud.highestScoreMultiplier) || 1),
    discoveredThreatIds: mergeArrayUnique(local, cloud, 'discoveredThreatIds'),
    defeatedBossIds: mergeArrayUnique(local, cloud, 'defeatedBossIds'),
    runThemesSurvived: mergeArrayUnique(local, cloud, 'runThemesSurvived'),
    unlockedShipIds: mergeArrayUnique(local, cloud, 'unlockedShipIds'),
    lastNewlyUnlockedShipIds: Array.isArray(local.lastNewlyUnlockedShipIds) ? local.lastNewlyUnlockedShipIds : []
  };
}

function mergeThreatDiscovery(localState = {}, cloudState = {}) {
  const local = localState && typeof localState === 'object' ? localState : {};
  const cloud = cloudState && typeof cloudState === 'object' ? cloudState : {};
  const categories = [...new Set([
    ...Object.keys(local.items || {}),
    ...Object.keys(cloud.items || {})
  ])];
  const items = {};
  for (const category of categories) {
    items[category] = {
      ...(local.items?.[category] || {}),
      ...(cloud.items?.[category] || {})
    };
  }
  return {
    ...local,
    ...cloud,
    items,
    discoveriesThisRun: Array.isArray(local.discoveriesThisRun) ? local.discoveriesThisRun : [],
    recentRunThemes: [...new Set([
      ...(Array.isArray(local.recentRunThemes) ? local.recentRunThemes : []),
      ...(Array.isArray(cloud.recentRunThemes) ? cloud.recentRunThemes : [])
    ])].slice(-8),
    unreadIds: [...new Set([
      ...(Array.isArray(local.unreadIds) ? local.unreadIds : []),
      ...(Array.isArray(cloud.unreadIds) ? cloud.unreadIds : [])
    ])]
  };
}

function normalizeSectorStartChallengeRecordsPayload(rawRecords = {}) {
  const raw = rawRecords && typeof rawRecords === 'object' ? rawRecords : {};
  const candidates = Array.isArray(raw)
    ? raw
    : Object.values(raw.byCheckpoint ?? raw.records ?? raw);
  const byCheckpoint = {};
  for (const candidate of candidates) {
    const record = normalizeSectorStartChallengeRecord(candidate);
    if (!record) continue;
    byCheckpoint[String(record.startSector)] = record;
  }
  return {
    version: Math.max(1, Math.floor(Number(raw.version) || 1)),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    byCheckpoint
  };
}

function mergeSectorStartChallengeRecords(localRecords = {}, cloudRecords = {}) {
  const local = normalizeSectorStartChallengeRecordsPayload(localRecords);
  const cloud = normalizeSectorStartChallengeRecordsPayload(cloudRecords);
  const byCheckpoint = { ...local.byCheckpoint };
  for (const [checkpoint, record] of Object.entries(cloud.byCheckpoint)) {
    if (isBetterSectorStartChallengeRecord(record, byCheckpoint[checkpoint])) {
      byCheckpoint[checkpoint] = record;
    }
  }
  return {
    version: Math.max(local.version, cloud.version, 1),
    updatedAt: cloud.updatedAt || local.updatedAt || new Date().toISOString(),
    byCheckpoint
  };
}

function normalizeAchievementPayload(raw = {}) {
  const ids = Array.isArray(raw) ? raw : raw?.unlocked;
  const unlocked = Array.isArray(ids)
    ? [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))]
    : [];
  return {
    version: Math.max(1, Math.floor(Number(raw?.version) || 1)),
    unlocked,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : null
  };
}

function collectAudioSettings(storage) {
  const has = (key) => readStorage(storage, key) !== null;
  const audio = {};
  if (has(AUDIO_KEYS.masterVolume)) audio.masterVolume = clampUnit(readStorage(storage, AUDIO_KEYS.masterVolume), 0.3);
  if (has(AUDIO_KEYS.musicVolume)) audio.musicVolume = clampUnit(readStorage(storage, AUDIO_KEYS.musicVolume), 0.2);
  if (has(AUDIO_KEYS.sfxVolume)) audio.sfxVolume = clampUnit(readStorage(storage, AUDIO_KEYS.sfxVolume), 0.4);
  if (has(AUDIO_KEYS.voiceVolume)) audio.voiceVolume = clampUnit(readStorage(storage, AUDIO_KEYS.voiceVolume), 0.45);
  if (has(AUDIO_KEYS.musicEnabled)) audio.musicEnabled = readStorage(storage, AUDIO_KEYS.musicEnabled) !== 'false';
  if (has(AUDIO_KEYS.voiceEnabled)) audio.voiceEnabled = readStorage(storage, AUDIO_KEYS.voiceEnabled) !== 'false';
  if (has(AUDIO_KEYS.bossVoiceEnabled)) audio.bossVoiceEnabled = readStorage(storage, AUDIO_KEYS.bossVoiceEnabled) !== 'false';
  if (has(AUDIO_KEYS.ctaVoiceEnabled)) audio.ctaVoiceEnabled = readStorage(storage, AUDIO_KEYS.ctaVoiceEnabled) !== 'false';
  if (has(AUDIO_KEYS.musicPack)) audio.musicPack = String(readStorage(storage, AUDIO_KEYS.musicPack) || '').slice(0, 64);
  return audio;
}

function restoreAudioSettings(storage, audio = {}) {
  if (!audio || typeof audio !== 'object') return 0;
  let changed = 0;
  for (const key of ['masterVolume', 'musicVolume', 'sfxVolume', 'voiceVolume']) {
    if (audio[key] !== undefined && writeStorage(storage, AUDIO_KEYS[key], clampUnit(audio[key], 1))) changed += 1;
  }
  for (const key of ['musicEnabled', 'voiceEnabled', 'bossVoiceEnabled', 'ctaVoiceEnabled']) {
    if (audio[key] !== undefined && writeStorage(storage, AUDIO_KEYS[key], Boolean(audio[key]))) changed += 1;
  }
  if (audio.musicPack !== undefined && writeStorage(storage, AUDIO_KEYS.musicPack, String(audio.musicPack).slice(0, 64))) {
    changed += 1;
  }
  return changed;
}

export function collectSteamCloudPersistenceState({
  storage = getDefaultStorage(),
  game = typeof window !== 'undefined' ? window.__game : null,
  getShipUnlockProgress = null,
  getAccessibilitySettings = null,
  getLanguagePreferenceMode = null,
  getCurrentLanguage = null
} = {}) {
  const selectedShipKey = readStorage(storage, CLOUD_SELECTED_SHIP_KEY) || game?.selectedShipSpriteKey || null;
  const achievementPayload = normalizeAchievementPayload(readJsonStorage(storage, CLOUD_ACHIEVEMENT_KEY, {}));
  const settings = typeof getAccessibilitySettings === 'function'
    ? getAccessibilitySettings()
    : {
      screenShake: clampUnit(readStorage(storage, SCREEN_SHAKE_KEY), 1),
      playerFocus: clampUnit(readStorage(storage, PLAYER_FOCUS_KEY), 0.72),
      colorAssist: readStorage(storage, COLOR_ASSIST_KEY) === '1'
    };

  return {
    language: {
      preference: normalizeLanguagePreference(
        typeof getLanguagePreferenceMode === 'function'
          ? getLanguagePreferenceMode()
          : readStorage(storage, CLOUD_LANGUAGE_KEY)
      ),
      current: typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : null
    },
    localHighscores: normalizeScores(readJsonStorage(storage, CLOUD_LOCAL_LEADERBOARD_KEY, [])),
    achievements: achievementPayload,
    selectedShipKey,
    progression: typeof getShipUnlockProgress === 'function'
      ? normalizeProgression(getShipUnlockProgress())
      : normalizeProgression(readJsonStorage(storage, CLOUD_UNLOCK_PROGRESS_KEY, {})),
    hangarProgress: typeof getShipUnlockProgress === 'function'
      ? getShipUnlockProgress()
      : readJsonStorage(storage, CLOUD_HANGAR_PROGRESS_KEY, {}),
    threatDiscovery: readJsonStorage(storage, CLOUD_THREAT_DISCOVERY_KEY, {}),
    sectorStartChallengeRecords: normalizeSectorStartChallengeRecordsPayload(
      readJsonStorage(storage, CLOUD_SECTOR_START_CHALLENGE_RECORDS_KEY, {})
    ),
    shipUsage: normalizeUsageMap(readJsonStorage(storage, CLOUD_SHIP_USAGE_KEY, {})),
    shipUsageTotal: Math.max(
      Math.floor(Number(readStorage(storage, CLOUD_SHIP_USAGE_TOTAL_KEY)) || 0),
      sumUsageMap(readJsonStorage(storage, CLOUD_SHIP_USAGE_KEY, {}))
    ),
    settings: {
      screenShake: clampUnit(settings.screenShake, 1),
      playerFocus: clampUnit(settings.playerFocus, 0.72),
      colorAssist: Boolean(settings.colorAssist),
      audio: collectAudioSettings(storage),
      display: getDisplaySettings({ storage })
    }
  };
}

export function restoreSteamCloudPersistenceToStorage(save, {
  storage = getDefaultStorage()
} = {}) {
  const summary = {
    restored: false,
    language: null,
    localHighscores: 0,
    achievements: 0,
    selectedShipKey: null,
    progression: null,
    shipUsage: 0,
    shipUsageTotal: 0,
    sectorStartChallengeRecords: 0,
    settings: 0
  };
  if (!storage || !save || typeof save !== 'object') return summary;

  const languagePreference = normalizeLanguagePreference(save.language?.preference ?? save.languagePreference);
  summary.language = languagePreference;
  if (languagePreference === 'system') {
    summary.restored = removeStorage(storage, CLOUD_LANGUAGE_KEY) || summary.restored;
  } else {
    summary.restored = writeStorage(storage, CLOUD_LANGUAGE_KEY, languagePreference) || summary.restored;
  }

  const cloudScores = normalizeScores(save.localHighscores);
  if (cloudScores.length > 0) {
    const mergedScores = mergeScores(readJsonStorage(storage, CLOUD_LOCAL_LEADERBOARD_KEY, []), cloudScores);
    summary.localHighscores = mergedScores.length;
    summary.restored = writeStorage(storage, CLOUD_LOCAL_LEADERBOARD_KEY, JSON.stringify(mergedScores)) || summary.restored;
  }

  const cloudAchievements = normalizeAchievementPayload(save.achievements || save.achievementMirror);
  if (cloudAchievements.unlocked.length > 0) {
    const localAchievements = normalizeAchievementPayload(readJsonStorage(storage, CLOUD_ACHIEVEMENT_KEY, {}));
    const unlocked = [...new Set([...localAchievements.unlocked, ...cloudAchievements.unlocked])];
    const payload = {
      version: Math.max(localAchievements.version, cloudAchievements.version, 1),
      unlocked,
      updatedAt: cloudAchievements.updatedAt || localAchievements.updatedAt || new Date().toISOString()
    };
    summary.achievements = unlocked.length;
    summary.restored = writeStorage(storage, CLOUD_ACHIEVEMENT_KEY, JSON.stringify(payload)) || summary.restored;
  }

  if (typeof save.selectedShipKey === 'string' && save.selectedShipKey.trim()) {
    summary.selectedShipKey = save.selectedShipKey.trim();
    summary.restored = writeStorage(storage, CLOUD_SELECTED_SHIP_KEY, summary.selectedShipKey) || summary.restored;
  }

  if (save.progression || save.unlockProgress) {
    const mergedProgression = mergeProgression(
      readJsonStorage(storage, CLOUD_UNLOCK_PROGRESS_KEY, {}),
      save.progression || save.unlockProgress
    );
    summary.progression = mergedProgression;
    summary.restored = writeStorage(storage, CLOUD_UNLOCK_PROGRESS_KEY, JSON.stringify(mergedProgression)) || summary.restored;
  }

  if (save.hangarProgress) {
    const mergedHangar = mergeHangarProgress(
      readJsonStorage(storage, CLOUD_HANGAR_PROGRESS_KEY, {}),
      save.hangarProgress
    );
    summary.hangarProgress = mergedHangar;
    summary.restored = writeStorage(storage, CLOUD_HANGAR_PROGRESS_KEY, JSON.stringify(mergedHangar)) || summary.restored;
    summary.restored = writeStorage(storage, CLOUD_UNLOCK_PROGRESS_KEY, JSON.stringify({
      bestScore: mergedHangar.bestScore,
      bestRank: mergedHangar.bestRank,
      bestLevel: mergedHangar.bestLevel
    })) || summary.restored;
  }

  if (save.threatDiscovery) {
    const mergedDiscovery = mergeThreatDiscovery(
      readJsonStorage(storage, CLOUD_THREAT_DISCOVERY_KEY, {}),
      save.threatDiscovery
    );
    summary.threatDiscovery = true;
    summary.restored = writeStorage(storage, CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify(mergedDiscovery)) || summary.restored;
  }

  if (save.shipUsage || save.shipUsageByShip) {
    const mergedUsage = mergeShipUsage(
      readJsonStorage(storage, CLOUD_SHIP_USAGE_KEY, {}),
      save.shipUsage || save.shipUsageByShip
    );
    const total = Math.max(
      Math.floor(Number(readStorage(storage, CLOUD_SHIP_USAGE_TOTAL_KEY)) || 0),
      Math.floor(Number(save.shipUsageTotal) || 0),
      sumUsageMap(mergedUsage)
    );
    summary.shipUsage = Object.keys(mergedUsage).length;
    summary.shipUsageTotal = total;
    summary.restored = writeStorage(storage, CLOUD_SHIP_USAGE_KEY, JSON.stringify(mergedUsage)) || summary.restored;
    summary.restored = writeStorage(storage, CLOUD_SHIP_USAGE_TOTAL_KEY, String(total)) || summary.restored;
  }

  if (save.sectorStartChallengeRecords || save.sectorStartRecords) {
    const mergedRecords = mergeSectorStartChallengeRecords(
      readJsonStorage(storage, CLOUD_SECTOR_START_CHALLENGE_RECORDS_KEY, {}),
      save.sectorStartChallengeRecords || save.sectorStartRecords
    );
    summary.sectorStartChallengeRecords = Object.keys(mergedRecords.byCheckpoint).length;
    summary.restored = writeStorage(
      storage,
      CLOUD_SECTOR_START_CHALLENGE_RECORDS_KEY,
      JSON.stringify(mergedRecords)
    ) || summary.restored;
  }

  const settings = save.settings || {};
  if (settings.screenShake !== undefined && writeStorage(storage, SCREEN_SHAKE_KEY, clampUnit(settings.screenShake, 1))) {
    summary.settings += 1;
    summary.restored = true;
  }
  if (settings.playerFocus !== undefined && writeStorage(storage, PLAYER_FOCUS_KEY, clampUnit(settings.playerFocus, 0.72))) {
    summary.settings += 1;
    summary.restored = true;
  }
  if (settings.colorAssist !== undefined && writeStorage(storage, COLOR_ASSIST_KEY, Boolean(settings.colorAssist) ? '1' : '0')) {
    summary.settings += 1;
    summary.restored = true;
  }
  summary.settings += restoreAudioSettings(storage, settings.audio || save.audioSettings);
  if (settings.display !== undefined) {
    const display = normalizeDisplaySettings(settings.display);
    const wroteMode = writeStorage(storage, DISPLAY_MODE_KEY, display.mode);
    const wroteSize = writeStorage(storage, DISPLAY_WINDOW_SIZE_KEY, JSON.stringify(display.windowSize));
    if (wroteMode || wroteSize) {
      summary.settings += 1;
      summary.restored = true;
    }
  }
  if (summary.settings > 0) summary.restored = true;

  return summary;
}

export function summarizeSteamCloudPersistence(save = {}) {
  const achievements = normalizeAchievementPayload(save.achievements || save.achievementMirror);
  return {
    updatedAt: save?.updatedAt || null,
    languagePreference: normalizeLanguagePreference(save?.language?.preference ?? save?.languagePreference),
    currentLanguage: save?.language?.current || null,
    localHighscoresCount: normalizeScores(save?.localHighscores).length,
    achievementMirrorCount: achievements.unlocked.length,
    selectedShipKey: save?.selectedShipKey || null,
    progression: normalizeProgression(save?.progression || save?.unlockProgress || {}),
    hangarPilotXp: Math.max(0, Math.floor(Number(save?.hangarProgress?.pilotXp) || 0)),
    shipUsageShips: Object.keys(normalizeUsageMap(save?.shipUsage || save?.shipUsageByShip || {})).length,
    shipUsageTotal: Math.max(Math.floor(Number(save?.shipUsageTotal) || 0), sumUsageMap(save?.shipUsage || save?.shipUsageByShip || {})),
    threatDiscoveryCategories: Object.keys(save?.threatDiscovery?.items || {}).length,
    sectorStartChallengeCheckpoints: Object.keys(
      normalizeSectorStartChallengeRecordsPayload(save?.sectorStartChallengeRecords || save?.sectorStartRecords || {}).byCheckpoint
    ).length
  };
}
