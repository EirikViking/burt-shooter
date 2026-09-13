export const SCOUT_RUN_RECORDS_KEY = 'novaSwarm.scoutRunRecords.v1';
export const SCOUT_RUN_RECORDS_VERSION = 1;

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
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
    return true;
  } catch (error) {
    console.warn('[ScoutRunRecords] Failed to write records:', error);
    return false;
  }
}

function normalizeShipText(value) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 120) : null;
}

export function normalizeScoutRunRecord(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const score = floor(raw.score ?? raw.finalScore, 0);
  if (score <= 0) return null;
  const sectorReached = Math.max(1, floor(raw.sectorReached ?? raw.levelReached, 1));
  return {
    score,
    sectorReached,
    levelReached: Math.max(1, floor(raw.levelReached ?? raw.sectorReached, sectorReached)),
    shipId: normalizeShipText(raw.shipId),
    shipName: normalizeShipText(raw.shipName),
    selectedShipSpriteKey: normalizeShipText(raw.selectedShipSpriteKey ?? raw.shipKey),
    completedAt: normalizeIso(raw.completedAt ?? raw.timestamp),
    runElapsedSeconds: floor(raw.runElapsedSeconds, 0),
    bossesKilled: floor(raw.bossesKilled, 0),
    wavesCleared: floor(raw.wavesCleared, 0),
    runCleared: Boolean(raw.runCleared),
    scoutAnomalyId: normalizeShipText(raw.scoutAnomalyId),
    scoutAnomalyName: normalizeShipText(raw.scoutAnomalyName),
    scoutAnomalyRuleSummary: normalizeShipText(raw.scoutAnomalyRuleSummary),
    source: 'scout_local_best'
  };
}

export function readScoutRunRecords({ targetStorage = storage() } = {}) {
  const raw = readJson(SCOUT_RUN_RECORDS_KEY, {}, targetStorage);
  return {
    version: SCOUT_RUN_RECORDS_VERSION,
    updatedAt: normalizeIso(raw.updatedAt, nowIso()),
    best: normalizeScoutRunRecord(raw.best ?? raw.personalBest ?? raw) || null
  };
}

export function getScoutRunBest(options = {}) {
  return readScoutRunRecords(options).best;
}

export function compareScoutRunRecords(candidate, previous) {
  const next = normalizeScoutRunRecord(candidate);
  const current = normalizeScoutRunRecord(previous);
  if (!next) return -1;
  if (!current) return 1;
  if (next.score !== current.score) return next.score > current.score ? 1 : -1;
  if (next.sectorReached !== current.sectorReached) return next.sectorReached > current.sectorReached ? 1 : -1;
  if (next.levelReached !== current.levelReached) return next.levelReached > current.levelReached ? 1 : -1;

  // Exact score/depth ties are a tie. Wall-clock completion time is not a
  // gameplay result and must not make an identical local best flip-flop.
  return 0;
}

export function isBetterScoutRunRecord(candidate, previous) {
  return compareScoutRunRecords(candidate, previous) > 0;
}

export function createScoutRunRecord(summary = {}, {
  shipId = null,
  shipName = null,
  selectedShipSpriteKey = null,
  completedAt = nowIso()
} = {}) {
  return normalizeScoutRunRecord({
    score: summary.score ?? summary.finalScore,
    sectorReached: summary.sectorReached,
    levelReached: summary.levelReached,
    shipId,
    shipName,
    selectedShipSpriteKey,
    completedAt,
    runElapsedSeconds: summary.runElapsedSeconds,
    bossesKilled: summary.bossesKilled,
    wavesCleared: summary.wavesCleared,
    runCleared: summary.runCleared,
    scoutAnomalyId: summary.scoutAnomalyId,
    scoutAnomalyName: summary.scoutAnomalyName,
    scoutAnomalyRuleSummary: summary.scoutAnomalyRuleSummary
  });
}

export function recordScoutRun(summary = {}, options = {}) {
  if (summary?.runMode !== 'scout') {
    return {
      attemptRecord: null,
      previousRecord: null,
      bestRecord: null,
      isNewBest: false,
      stored: false
    };
  }
  const attemptRecord = createScoutRunRecord(summary, options);
  if (!attemptRecord) {
    return {
      attemptRecord: null,
      previousRecord: getScoutRunBest(options),
      bestRecord: getScoutRunBest(options),
      isNewBest: false,
      stored: false
    };
  }

  const targetStorage = options.targetStorage ?? storage();
  const records = readScoutRunRecords({ targetStorage });
  const previousRecord = records.best || null;
  const isNewBest = isBetterScoutRunRecord(attemptRecord, previousRecord);
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
    version: SCOUT_RUN_RECORDS_VERSION,
    updatedAt: nowIso(),
    best: attemptRecord
  };
  const stored = writeJson(SCOUT_RUN_RECORDS_KEY, next, targetStorage);
  return {
    attemptRecord,
    previousRecord,
    bestRecord: attemptRecord,
    isNewBest: true,
    stored
  };
}
