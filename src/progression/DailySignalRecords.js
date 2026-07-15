import { canonicalRulesHash, getUtcDailyKey } from '../config/DailyCabinetSignal.js';

export const DAILY_SIGNAL_RECORDS_KEY = 'novaSwarm.dailySignalRecords.v1';
export const DAILY_SIGNAL_RECORDS_VERSION = 2;
export const DAILY_SIGNAL_RECORD_RETENTION_DAYS = 45;
export const DAILY_SIGNAL_FLIGHT_LOG_DAYS = 7;

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

function deriveOverallRecords(bestAttempts = {}, bestClears = {}) {
  const keys = new Set([...Object.keys(bestAttempts), ...Object.keys(bestClears)]);
  return Object.fromEntries([...keys].map((key) => [key, bestClears[key] || bestAttempts[key]]).filter(([, record]) => record));
}

function normalizeAttemptCounts(rawCounts = {}, fallbackRecords = {}) {
  const counts = {};
  if (rawCounts && typeof rawCounts === 'object' && !Array.isArray(rawCounts)) {
    for (const [key, raw] of Object.entries(rawCounts)) {
      const count = floor(raw?.count ?? raw, 0);
      if (!key || count <= 0) continue;
      counts[key] = {
        count,
        updatedAt: normalizeIso(raw?.updatedAt, fallbackRecords[key]?.completedAt || nowIso())
      };
    }
  }
  for (const [key, record] of Object.entries(fallbackRecords)) {
    if (!counts[key]) counts[key] = { count: 1, updatedAt: record.completedAt };
  }
  return counts;
}

export function readDailySignalRecords({ targetStorage = storage() } = {}) {
  const raw = readJson(DAILY_SIGNAL_RECORDS_KEY, {}, targetStorage);
  const legacyRecords = normalizeRecords(raw.records ?? raw.byDay ?? raw);
  const legacyAttempts = Object.fromEntries(Object.entries(legacyRecords).filter(([, record]) => !record.runCleared));
  const legacyClears = Object.fromEntries(Object.entries(legacyRecords).filter(([, record]) => record.runCleared));
  const bestAttempts = normalizeRecords(raw.bestAttempts ?? legacyAttempts);
  const bestClears = normalizeRecords(raw.bestClears ?? legacyClears);
  const records = deriveOverallRecords(bestAttempts, bestClears);
  return {
    version: DAILY_SIGNAL_RECORDS_VERSION,
    updatedAt: normalizeIso(raw.updatedAt, nowIso()),
    records,
    bestAttempts,
    bestClears,
    attemptCounts: normalizeAttemptCounts(raw.attemptCounts, records)
  };
}

export function getDailySignalBest(contract = {}, options = {}) {
  const key = getDailySignalRecordKey(contract.dailyKey, contract.rulesHash);
  if (!key) return null;
  return readDailySignalRecords(options).records[key] || null;
}

export function getDailySignalBestAttempt(contract = {}, options = {}) {
  const key = getDailySignalRecordKey(contract.dailyKey, contract.rulesHash);
  if (!key) return null;
  return readDailySignalRecords(options).bestAttempts[key] || null;
}

export function getDailySignalBestClear(contract = {}, options = {}) {
  const key = getDailySignalRecordKey(contract.dailyKey, contract.rulesHash);
  if (!key) return null;
  return readDailySignalRecords(options).bestClears[key] || null;
}

export function getDailySignalAttemptCount(contract = {}, options = {}) {
  const key = getDailySignalRecordKey(contract.dailyKey, contract.rulesHash);
  if (!key) return 0;
  return floor(readDailySignalRecords(options).attemptCounts[key]?.count, 0);
}

export function isBetterDailySignalRecord(candidate, previous) {
  const next = normalizeDailySignalRecord(candidate);
  const current = normalizeDailySignalRecord(previous);
  if (!next) return false;
  if (!current) return true;
  if (next.runCleared !== current.runCleared) return next.runCleared;
  if (next.runCleared) {
    if (next.score !== current.score) return next.score > current.score;
    if (next.runElapsedSeconds !== current.runElapsedSeconds) return next.runElapsedSeconds < current.runElapsedSeconds;
    return false;
  }
  if (next.sectorReached !== current.sectorReached) return next.sectorReached > current.sectorReached;
  if (next.score !== current.score) return next.score > current.score;
  if (next.runElapsedSeconds !== current.runElapsedSeconds) return next.runElapsedSeconds > current.runElapsedSeconds;
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

function pruneAttemptCounts(counts = {}, retainedKeys = new Set()) {
  return Object.fromEntries(Object.entries(counts).filter(([key]) => retainedKeys.has(key)));
}

function createRecordResult(overrides = {}) {
  return {
    attemptRecord: null,
    previousRecord: null,
    bestRecord: null,
    previousBestAttempt: null,
    previousBestClear: null,
    bestAttempt: null,
    bestClear: null,
    attemptCount: 0,
    isNewBest: false,
    isNewAttemptBest: false,
    isNewClearBest: false,
    stored: false,
    saveFailed: false,
    ...overrides
  };
}

export function recordDailySignalRun(summary = {}, options = {}) {
  if (summary?.runMode !== 'daily_signal') {
    return createRecordResult();
  }
  const attemptRecord = createDailySignalRecord(summary, options);
  const targetStorage = options.targetStorage ?? storage();
  const contract = options.contract || summary.dailySignalContract || {};
  const key = getDailySignalRecordKey(contract.dailyKey, contract.rulesHash);
  const current = readDailySignalRecords({ targetStorage });
  const previousBestAttempt = key ? current.bestAttempts[key] || null : null;
  const previousBestClear = key ? current.bestClears[key] || null : null;
  const previousRecord = previousBestClear || previousBestAttempt;
  if (summary.dailySignalContractValid !== true || summary.dailySignalInvalidReason) {
    return createRecordResult({
      attemptRecord,
      previousRecord,
      bestRecord: previousRecord,
      previousBestAttempt,
      previousBestClear,
      bestAttempt: previousBestAttempt,
      bestClear: previousBestClear,
      attemptCount: floor(current.attemptCounts[key]?.count, 0)
    });
  }
  if (!attemptRecord || !key) {
    return createRecordResult({
      previousRecord,
      bestRecord: previousRecord,
      previousBestAttempt,
      previousBestClear,
      bestAttempt: previousBestAttempt,
      bestClear: previousBestClear,
      attemptCount: floor(current.attemptCounts[key]?.count, 0)
    });
  }
  const isNewClearBest = attemptRecord.runCleared && isBetterDailySignalRecord(attemptRecord, previousBestClear);
  const isNewAttemptBest = !attemptRecord.runCleared && isBetterDailySignalRecord(attemptRecord, previousBestAttempt);
  const nextBestAttempts = pruneRecords({
    ...current.bestAttempts,
    ...(isNewAttemptBest ? { [key]: attemptRecord } : {})
  });
  const nextBestClears = pruneRecords({
    ...current.bestClears,
    ...(isNewClearBest ? { [key]: attemptRecord } : {})
  });
  const retainedKeys = new Set([...Object.keys(nextBestAttempts), ...Object.keys(nextBestClears)]);
  const nextAttemptCount = floor(current.attemptCounts[key]?.count, 0) + 1;
  const nextAttemptCounts = pruneAttemptCounts({
    ...current.attemptCounts,
    [key]: { count: nextAttemptCount, updatedAt: nowIso() }
  }, retainedKeys);
  const nextRecords = deriveOverallRecords(nextBestAttempts, nextBestClears);
  const stored = writeJson(DAILY_SIGNAL_RECORDS_KEY, {
    version: DAILY_SIGNAL_RECORDS_VERSION,
    updatedAt: nowIso(),
    records: nextRecords,
    bestAttempts: nextBestAttempts,
    bestClears: nextBestClears,
    attemptCounts: nextAttemptCounts
  }, targetStorage);
  if (!stored) {
    return createRecordResult({
      attemptRecord,
      previousRecord,
      bestRecord: previousRecord,
      previousBestAttempt,
      previousBestClear,
      bestAttempt: previousBestAttempt,
      bestClear: previousBestClear,
      attemptCount: floor(current.attemptCounts[key]?.count, 0),
      isNewBest: false,
      saveFailed: true
    });
  }
  const bestAttempt = nextBestAttempts[key] || null;
  const bestClear = nextBestClears[key] || null;
  return createRecordResult({
    attemptRecord,
    previousRecord,
    bestRecord: bestClear || bestAttempt,
    previousBestAttempt,
    previousBestClear,
    bestAttempt,
    bestClear,
    attemptCount: nextAttemptCount,
    isNewBest: isNewAttemptBest || isNewClearBest,
    isNewAttemptBest,
    isNewClearBest,
    stored,
    saveFailed: false
  });
}

function normalizeLogDate(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function selectBestByDay(records = {}) {
  const byDay = new Map();
  for (const record of Object.values(records)) {
    if (!record?.dailyKey) continue;
    const current = byDay.get(record.dailyKey) || null;
    if (!current || isBetterDailySignalRecord(record, current)) byDay.set(record.dailyKey, record);
  }
  return byDay;
}

export function getDailySignalFlightLog({
  now = new Date(),
  days = DAILY_SIGNAL_FLIGHT_LOG_DAYS,
  targetStorage = storage()
} = {}) {
  const dayCount = Math.max(1, Math.min(31, floor(days, DAILY_SIGNAL_FLIGHT_LOG_DAYS)));
  const endKey = getUtcDailyKey(normalizeLogDate(now));
  const endMs = Date.parse(`${endKey}T00:00:00.000Z`);
  const state = readDailySignalRecords({ targetStorage });
  const clearsByDay = selectBestByDay(state.bestClears);
  const attemptsByDay = selectBestByDay(state.bestAttempts);
  const countByDay = new Map();
  for (const [key, value] of Object.entries(state.attemptCounts)) {
    const dailyKey = key.slice(0, 10);
    countByDay.set(dailyKey, (countByDay.get(dailyKey) || 0) + floor(value?.count, 0));
  }
  const entries = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const dailyKey = new Date(endMs - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const bestClear = clearsByDay.get(dailyKey) || null;
    const bestAttempt = attemptsByDay.get(dailyKey) || null;
    entries.push({
      dailyKey,
      status: bestClear ? 'cleared' : bestAttempt ? 'attempted' : 'unopened',
      bestClear,
      bestAttempt,
      attemptCount: countByDay.get(dailyKey) || 0,
      isToday: dailyKey === endKey
    });
  }
  const clears = entries.filter((entry) => entry.status === 'cleared').length;
  const attemptedDays = entries.filter((entry) => entry.status !== 'unopened').length;
  const attempts = entries.reduce((sum, entry) => sum + entry.attemptCount, 0);
  const archiveClears = new Set([...clearsByDay.keys()]).size;
  let streak = 0;
  let atRisk = false;
  let streakIndex = entries.length - 1;
  if (entries[streakIndex]?.status !== 'cleared' && entries[streakIndex - 1]?.status === 'cleared') {
    atRisk = true;
    streakIndex -= 1;
  }
  while (streakIndex >= 0 && entries[streakIndex]?.status === 'cleared') {
    streak += 1;
    streakIndex -= 1;
  }
  return {
    days: dayCount,
    endKey,
    entries,
    clears,
    attemptedDays,
    attempts,
    archiveClears,
    streak,
    atRisk
  };
}

export function formatDailySignalFlightLogSymbols(flightLog = {}) {
  return (Array.isArray(flightLog.entries) ? flightLog.entries : []).map((entry) => {
    if (entry?.status === 'cleared') return '◆';
    if (entry?.status === 'attempted') return '◇';
    return '·';
  }).join(' ');
}
