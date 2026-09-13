export const SECTOR_START_CHALLENGE_RECORDS_KEY = 'novaSwarm.sectorStartChallengeRecords.v1';
export const SECTOR_START_CHALLENGE_RECORDS_VERSION = 1;

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function floor(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeIso(value, fallback = nowIso()) {
  const text = String(value || '').trim();
  return Number.isFinite(Date.parse(text)) ? text : fallback;
}

function readJson(key, fallback, targetStorage = storage()) {
  try {
    const raw = targetStorage?.getItem?.(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value, targetStorage = storage()) {
  try {
    targetStorage?.setItem?.(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[SectorStartChallengeRecords] Failed to write records:', error);
    return false;
  }
}

function normalizeShipText(value) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 120) : null;
}

export function normalizeSectorStartChallengeRecord(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const startSector = floor(raw.startSector ?? raw.sectorStartCheckpoint, 0);
  if (startSector < 1) return null;
  const highestSectorReached = Math.max(
    startSector,
    floor(raw.highestSectorReached ?? raw.sectorReached ?? raw.levelReached, startSector)
  );
  const finalSector = Math.max(
    startSector,
    floor(raw.finalSector ?? raw.sectorReached ?? raw.levelReached, highestSectorReached)
  );
  return {
    startSector,
    scoreEarned: floor(raw.scoreEarned ?? raw.score ?? raw.finalScore, 0),
    highestSectorReached,
    finalSector,
    shipId: normalizeShipText(raw.shipId),
    shipName: normalizeShipText(raw.shipName),
    selectedShipSpriteKey: normalizeShipText(raw.selectedShipSpriteKey ?? raw.shipKey),
    completedAt: normalizeIso(raw.completedAt ?? raw.timestamp),
    runElapsedSeconds: floor(raw.runElapsedSeconds, 0),
    bossesKilled: floor(raw.bossesKilled, 0),
    wavesCleared: floor(raw.wavesCleared, 0),
    runCleared: Boolean(raw.runCleared),
    source: 'sector_start_challenge'
  };
}

function normalizeRecordMap(rawRecords = {}) {
  const byCheckpoint = {};
  const candidates = Array.isArray(rawRecords)
    ? rawRecords
    : Object.values(rawRecords && typeof rawRecords === 'object' ? rawRecords : {});
  for (const candidate of candidates) {
    const record = normalizeSectorStartChallengeRecord(candidate);
    if (!record) continue;
    byCheckpoint[String(record.startSector)] = record;
  }
  return byCheckpoint;
}

export function readSectorStartChallengeRecords({ targetStorage = storage() } = {}) {
  const raw = readJson(SECTOR_START_CHALLENGE_RECORDS_KEY, {}, targetStorage);
  const byCheckpoint = normalizeRecordMap(raw.byCheckpoint ?? raw.records ?? raw);
  return {
    version: SECTOR_START_CHALLENGE_RECORDS_VERSION,
    updatedAt: normalizeIso(raw.updatedAt, nowIso()),
    byCheckpoint
  };
}

export function getSectorStartChallengeRecord(startSector, options = {}) {
  const sector = floor(startSector, 0);
  if (sector < 1) return null;
  const records = readSectorStartChallengeRecords(options);
  return records.byCheckpoint[String(sector)] || null;
}

export function isBetterSectorStartChallengeRecord(candidate, previous) {
  const next = normalizeSectorStartChallengeRecord(candidate);
  const current = normalizeSectorStartChallengeRecord(previous);
  if (!next) return false;
  if (!current) return true;
  if (next.scoreEarned !== current.scoreEarned) return next.scoreEarned > current.scoreEarned;
  if (next.highestSectorReached !== current.highestSectorReached) {
    return next.highestSectorReached > current.highestSectorReached;
  }
  if (next.finalSector !== current.finalSector) return next.finalSector > current.finalSector;
  return Date.parse(next.completedAt) > Date.parse(current.completedAt);
}

export function createSectorStartChallengeRecord(summary = {}, {
  shipId = null,
  shipName = null,
  selectedShipSpriteKey = null,
  completedAt = nowIso()
} = {}) {
  return normalizeSectorStartChallengeRecord({
    startSector: summary.sectorStartCheckpoint,
    scoreEarned: summary.score ?? summary.finalScore,
    highestSectorReached: summary.sectorReached ?? summary.levelReached,
    finalSector: summary.finalSector ?? summary.sectorReached ?? summary.levelReached,
    shipId,
    shipName,
    selectedShipSpriteKey,
    completedAt,
    runElapsedSeconds: summary.runElapsedSeconds,
    bossesKilled: summary.bossesKilled,
    wavesCleared: summary.wavesCleared,
    runCleared: summary.runCleared
  });
}

export function recordSectorStartChallengeRun(summary = {}, options = {}) {
  if (summary?.runMode !== 'sector_start') {
    return {
      attemptRecord: null,
      previousRecord: null,
      bestRecord: null,
      isNewBest: false,
      stored: false
    };
  }
  const attemptRecord = createSectorStartChallengeRecord(summary, options);
  if (!attemptRecord) {
    return {
      attemptRecord: null,
      previousRecord: null,
      bestRecord: null,
      isNewBest: false,
      stored: false
    };
  }

  const targetStorage = options.targetStorage ?? storage();
  const records = readSectorStartChallengeRecords({ targetStorage });
  const key = String(attemptRecord.startSector);
  const previousRecord = records.byCheckpoint[key] || null;
  const isNewBest = isBetterSectorStartChallengeRecord(attemptRecord, previousRecord);
  const bestRecord = isNewBest ? attemptRecord : previousRecord;
  if (!isNewBest) {
    return {
      attemptRecord,
      previousRecord,
      bestRecord,
      isNewBest: false,
      stored: false
    };
  }

  const next = {
    version: SECTOR_START_CHALLENGE_RECORDS_VERSION,
    updatedAt: nowIso(),
    byCheckpoint: {
      ...records.byCheckpoint,
      [key]: attemptRecord
    }
  };
  const stored = writeJson(SECTOR_START_CHALLENGE_RECORDS_KEY, next, targetStorage);
  return {
    attemptRecord,
    previousRecord,
    bestRecord: attemptRecord,
    isNewBest: true,
    stored
  };
}
