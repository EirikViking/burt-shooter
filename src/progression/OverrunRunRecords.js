import { RUN_MODES, isOverrunRunMode } from '../game/RunMode.js';

export const OVERRUN_RUN_RECORDS_KEY = 'novaSwarm.overrunRunRecords.v1';
export const OVERRUN_RUN_RECORDS_VERSION = 1;

const OVERRUN_MODES = Object.freeze([
  RUN_MODES.OVERRUN_PURE,
  RUN_MODES.OVERRUN_TACTICAL
]);

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

function normalizeText(value) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 120) : null;
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
    console.warn('[OverrunRunRecords] Failed to write records:', error);
    return false;
  }
}

export function normalizeOverrunRunRecord(raw = {}, fallbackMode = null) {
  if (!raw || typeof raw !== 'object') return null;
  const runMode = isOverrunRunMode(raw.runMode) ? raw.runMode : fallbackMode;
  if (!isOverrunRunMode(runMode)) return null;
  const score = floor(raw.score ?? raw.finalScore, 0);
  if (score <= 0) return null;
  const sectorReached = Math.max(1, floor(raw.sectorReached ?? raw.levelReached, 1));
  return {
    score,
    sectorReached,
    levelReached: Math.max(1, floor(raw.levelReached ?? raw.sectorReached, sectorReached)),
    runMode,
    shipId: normalizeText(raw.shipId),
    shipName: normalizeText(raw.shipName),
    selectedShipSpriteKey: normalizeText(raw.selectedShipSpriteKey ?? raw.shipKey),
    completedAt: normalizeIso(raw.completedAt ?? raw.timestamp),
    runElapsedSeconds: floor(raw.runElapsedSeconds, 0),
    bossesKilled: floor(raw.bossesKilled, 0),
    wavesCleared: floor(raw.wavesCleared, 0),
    source: 'overrun_personal_best'
  };
}

export function normalizeOverrunRunRecords(raw = {}) {
  const byMode = raw?.byMode && typeof raw.byMode === 'object' ? raw.byMode : raw;
  const normalized = {};
  for (const mode of OVERRUN_MODES) {
    const record = normalizeOverrunRunRecord(byMode?.[mode], mode);
    if (record) normalized[mode] = record;
  }
  return {
    version: OVERRUN_RUN_RECORDS_VERSION,
    updatedAt: normalizeIso(raw?.updatedAt, nowIso()),
    byMode: normalized
  };
}

export function readOverrunRunRecords({ targetStorage = storage() } = {}) {
  return normalizeOverrunRunRecords(readJson(OVERRUN_RUN_RECORDS_KEY, {}, targetStorage));
}

export function getOverrunRunBest(runMode, options = {}) {
  if (!isOverrunRunMode(runMode)) return null;
  return readOverrunRunRecords(options).byMode[runMode] || null;
}

export function isBetterOverrunRunRecord(candidate, previous) {
  const next = normalizeOverrunRunRecord(candidate, candidate?.runMode);
  const current = normalizeOverrunRunRecord(previous, previous?.runMode);
  if (!next) return false;
  if (!current) return true;
  if (next.score !== current.score) return next.score > current.score;
  if (next.sectorReached !== current.sectorReached) return next.sectorReached > current.sectorReached;
  if (next.levelReached !== current.levelReached) return next.levelReached > current.levelReached;
  return Date.parse(next.completedAt) > Date.parse(current.completedAt);
}

export function mergeOverrunRunRecords(localRecords = {}, cloudRecords = {}) {
  const local = normalizeOverrunRunRecords(localRecords);
  const cloud = normalizeOverrunRunRecords(cloudRecords);
  const byMode = {};
  for (const mode of OVERRUN_MODES) {
    const localRecord = local.byMode[mode] || null;
    const cloudRecord = cloud.byMode[mode] || null;
    const best = isBetterOverrunRunRecord(cloudRecord, localRecord) ? cloudRecord : localRecord;
    if (best) byMode[mode] = best;
  }
  return {
    version: OVERRUN_RUN_RECORDS_VERSION,
    updatedAt: Date.parse(cloud.updatedAt) > Date.parse(local.updatedAt) ? cloud.updatedAt : local.updatedAt,
    byMode
  };
}

export function recordOverrunRun(summary = {}, {
  shipId = null,
  shipName = null,
  selectedShipSpriteKey = null,
  completedAt = nowIso(),
  targetStorage = storage()
} = {}) {
  const runMode = summary?.runMode;
  const previousRecord = getOverrunRunBest(runMode, { targetStorage });
  if (!isOverrunRunMode(runMode)) {
    return { attemptRecord: null, previousRecord: null, bestRecord: null, isNewBest: false, stored: false };
  }
  const attemptRecord = normalizeOverrunRunRecord({
    ...summary,
    runMode,
    shipId,
    shipName,
    selectedShipSpriteKey,
    completedAt
  }, runMode);
  if (!attemptRecord) {
    return { attemptRecord: null, previousRecord, bestRecord: previousRecord, isNewBest: false, stored: false };
  }
  const isNewBest = isBetterOverrunRunRecord(attemptRecord, previousRecord);
  if (!isNewBest) {
    return { attemptRecord, previousRecord, bestRecord: previousRecord, isNewBest: false, stored: false };
  }
  const records = readOverrunRunRecords({ targetStorage });
  const next = {
    version: OVERRUN_RUN_RECORDS_VERSION,
    updatedAt: nowIso(),
    byMode: { ...records.byMode, [runMode]: attemptRecord }
  };
  const stored = writeJson(OVERRUN_RUN_RECORDS_KEY, next, targetStorage);
  return { attemptRecord, previousRecord, bestRecord: attemptRecord, isNewBest: true, stored };
}
