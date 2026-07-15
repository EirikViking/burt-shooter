import { canonicalRulesHash } from '../config/DailyCabinetSignal.js';

export const DAILY_SIGNAL_RECORDS_KEY = 'novaSwarm.dailySignalRecords.v1';
export const DAILY_SIGNAL_RECORDS_VERSION = 1;
export const DAILY_SIGNAL_RECORD_RETENTION_DAYS = 45;

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
    if (typeof targetStorage?.setItem !== 'function') return false;
    targetStorage.setItem(key, JSON.stringify(value));
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
    return true;
  } catch (error) {
    console.warn('[DailySignalRecords] Failed to write records:', error);
    return false;
  }
}

function normalizeText(value, maxLength = 160) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

export function getDailySignalRecordKey(dailyKey, rulesHash) {
  const day = String(dailyKey || '').trim();
  const hash = String(rulesHash || '').trim();
  return day && hash ? `${day}:${hash}` : '';
}

export function normalizeDailySignalRecord(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const dailyKey = String(raw.dailyKey || '').trim();
  const rulesHash = String(raw.rulesHash || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dailyKey) || !rulesHash) return null;
  const score = floor(raw.score ?? raw.finalScore, 0);
  const sectorReached = Math.max(1, floor(raw.sectorReached ?? raw.levelReached, 1));
  return {
    dailyKey,
    rulesHash,
    rulesVersion: Math.max(1, floor(raw.rulesVersion, 1)),
    score,
    sectorReached,
    levelReached: Math.max(1, floor(raw.levelReached ?? raw.sectorReached, sectorReached)),
    finishSector: Math.max(1, floor(raw.finishSector, 10)),
    runCleared: Boolean(raw.runCleared),
    attemptId: normalizeText(raw.attemptId),
    seed: normalizeText(raw.seed),
    templateId: normalizeText(raw.templateId),
    templateLabel: normalizeText(raw.templateLabel),
    loanerShipKey: normalizeText(raw.loanerShipKey ?? raw.selectedShipSpriteKey),
    loanerShipName: normalizeText(raw.loanerShipName ?? raw.shipName),
    completedAt: normalizeIso(raw.completedAt ?? raw.timestamp),
    runElapsedSeconds: floor(raw.runElapsedSeconds, 0),
    bossesKilled: floor(raw.bossesKilled, 0),
    wavesCleared: floor(raw.wavesCleared, 0),
    source: 'daily_signal_local_best'
  };
}

function normalizeRecords(rawRecords = {}) {
  const records = {};
  const candidates = Array.isArray(rawRecords)
    ? rawRecords
    : Object.values(rawRecords && typeof rawRecords === 'object' ? rawRecords : {});
  for (const candidate of candidates) {
    const record = normalizeDailySignalRecord(candidate);
    if (!record) continue;
    records[getDailySignalRecordKey(record.dailyKey, record.rulesHash)] = record;
  }
  return records;
}

export function readDailySignalRecords({ targetStorage = storage() } = {}) {
  const raw = readJson(DAILY_SIGNAL_RECORDS_KEY, {}, targetStorage);
  return {
    version: DAILY_SIGNAL_RECORDS_VERSION,
    updatedAt: normalizeIso(raw.updatedAt, nowIso()),
    records: normalizeRecords(raw.records ?? raw.byDay ?? raw)
  };
}

export function getDailySignalBest(contract = {}, options = {}) {
  const key = getDailySignalRecordKey(contract.dailyKey, contract.rulesHash);
  if (!key) return null;
  return readDailySignalRecords(options).records[key] || null;
}

export function isBetterDailySignalRecord(candidate, previous) {
  const next = normalizeDailySignalRecord(candidate);
  const current = normalizeDailySignalRecord(previous);
  if (!next) return false;
  if (!current) return true;
  if (next.runCleared !== current.runCleared) return next.runCleared;
  if (next.score !== current.score) return next.score > current.score;
  if (next.sectorReached !== current.sectorReached) return next.sectorReached > current.sectorReached;
  if (next.runElapsedSeconds !== current.runElapsedSeconds && next.runCleared && current.runCleared) {
    return next.runElapsedSeconds < current.runElapsedSeconds;
  }
  return false;
}

export function createDailySignalRecord(summary = {}, {
  contract = summary.dailySignalContract,
  attemptId = summary.dailySignalAttemptId,
  completedAt = nowIso()
} = {}) {
  if (!contract || contract.rulesHash !== canonicalRulesHash(contract)) return null;
  return normalizeDailySignalRecord({
    dailyKey: contract.dailyKey,
    rulesHash: contract.rulesHash,
    rulesVersion: contract.rulesVersion,
    score: summary.score ?? summary.finalScore,
    sectorReached: summary.sectorReached ?? summary.levelReached,
    levelReached: summary.levelReached ?? summary.sectorReached,
    finishSector: contract.finishSector,
    runCleared: summary.runCleared,
    attemptId,
    seed: contract.seed,
    templateId: contract.templateId,
    templateLabel: contract.templateLabel,
    loanerShipKey: contract.loanerShipKey,
    loanerShipName: contract.loanerShipName,
    completedAt,
    runElapsedSeconds: summary.runElapsedSeconds,
    bossesKilled: summary.bossesKilled,
    wavesCleared: summary.wavesCleared
  });
}

function pruneRecords(records = {}, referenceTime = Date.now()) {
  const cutoff = referenceTime - DAILY_SIGNAL_RECORD_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Object.fromEntries(Object.entries(records).filter(([, record]) => {
    const completedAt = Date.parse(record?.completedAt || '');
    return Number.isFinite(completedAt) && completedAt >= cutoff;
  }));
}

export function recordDailySignalRun(summary = {}, options = {}) {
  if (summary?.runMode !== 'daily_signal') {
    return { attemptRecord: null, previousRecord: null, bestRecord: null, isNewBest: false, stored: false, saveFailed: false };
  }
  const attemptRecord = createDailySignalRecord(summary, options);
  const targetStorage = options.targetStorage ?? storage();
  const contract = options.contract || summary.dailySignalContract || {};
  const previousRecord = getDailySignalBest(contract, { targetStorage });
  if (summary.dailySignalContractValid !== true || summary.dailySignalInvalidReason) {
    return { attemptRecord, previousRecord, bestRecord: previousRecord, isNewBest: false, stored: false, saveFailed: false };
  }
  if (!attemptRecord) {
    return { attemptRecord: null, previousRecord, bestRecord: previousRecord, isNewBest: false, stored: false, saveFailed: false };
  }
  const isNewBest = isBetterDailySignalRecord(attemptRecord, previousRecord);
  if (!isNewBest) {
    return { attemptRecord, previousRecord, bestRecord: previousRecord, isNewBest: false, stored: false, saveFailed: false };
  }
  const current = readDailySignalRecords({ targetStorage });
  const key = getDailySignalRecordKey(attemptRecord.dailyKey, attemptRecord.rulesHash);
  const nextRecords = pruneRecords({ ...current.records, [key]: attemptRecord });
  const stored = writeJson(DAILY_SIGNAL_RECORDS_KEY, {
    version: DAILY_SIGNAL_RECORDS_VERSION,
    updatedAt: nowIso(),
    records: nextRecords
  }, targetStorage);
  if (!stored) {
    return {
      attemptRecord,
      previousRecord,
      bestRecord: previousRecord,
      isNewBest: false,
      stored: false,
      saveFailed: true
    };
  }
  return {
    attemptRecord,
    previousRecord,
    bestRecord: attemptRecord,
    isNewBest: true,
    stored,
    saveFailed: false
  };
}
