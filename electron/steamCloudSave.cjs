const fs = require('node:fs');
const path = require('node:path');

const SAVE_VERSION = 1;
const CLOUD_SUBDIR = 'steam-cloud';
const CLOUD_SAVE_FILE = 'nova-swarm-save.json';
const LEGACY_HIGHSCORE_FILE = 'local-highscores-v2.json';
const OLD_HIGHSCORE_FILE = 'local-highscores.json';

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

function sanitizeScoreEntry(entry = {}, fallbackIndex = 0) {
  const score = Math.max(0, Math.floor(Number(entry.score) || 0));
  const level = Math.max(1, Math.floor(Number(entry.level) || 1));
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

function sanitizeSettings(settings = {}) {
  const clampUnit = (value, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(1, number));
  };
  return {
    screenShake: clampUnit(settings.screenShake, 1),
    playerFocus: clampUnit(settings.playerFocus, 0.72),
    colorAssist: Boolean(settings.colorAssist)
  };
}

function sanitizeRendererState(state = {}) {
  const selectedShipKey = typeof state.selectedShipKey === 'string' && state.selectedShipKey.trim()
    ? state.selectedShipKey.trim().slice(0, 160)
    : null;
  return {
    selectedShipKey,
    progression: sanitizeUnlockProgress(state.progression || state.unlockProgress || {}),
    settings: sanitizeSettings(state.settings || {})
  };
}

function createEmptySave() {
  return {
    version: SAVE_VERSION,
    updatedAt: nowIso(),
    localHighscores: [],
    selectedShipKey: null,
    progression: sanitizeUnlockProgress(),
    settings: sanitizeSettings()
  };
}

function normalizeSave(rawSave = {}, localHighscores = null) {
  const rendererState = sanitizeRendererState(rawSave);
  return {
    version: SAVE_VERSION,
    updatedAt: String(rawSave.updatedAt || nowIso()),
    localHighscores: sanitizeScores(localHighscores ?? rawSave.localHighscores),
    selectedShipKey: rendererState.selectedShipKey,
    progression: rendererState.progression,
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
      selectedShipKey: rendererState.selectedShipKey || current.selectedShipKey || null,
      progression: rendererState.progression,
      settings: rendererState.settings
    });
  }

  function getDiagnostics() {
    return {
      ok: true,
      userDataPath: paths.userDataPath,
      cloudDir: paths.cloudDir,
      cloudSavePath: paths.cloudSavePath,
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
  sanitizeRendererState
};
