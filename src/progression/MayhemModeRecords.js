import { RUN_MODES, normalizeRunMode } from '../game/RunMode.js';

export const MAYHEM_MODE_RECORDS_KEY = 'novaSwarm.mayhemModeRecords.v1';

function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function normalizeScore(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function readMayhemModeRecords({ legacyPureBest = 0 } = {}) {
  let parsed = null;
  try {
    parsed = JSON.parse(safeStorage()?.getItem(MAYHEM_MODE_RECORDS_KEY) || 'null');
  } catch {
    parsed = null;
  }
  return {
    version: 1,
    pure: normalizeScore(parsed?.pure ?? legacyPureBest),
    tactical: normalizeScore(parsed?.tactical),
    updatedAt: parsed?.updatedAt || null
  };
}

export function getMayhemModeBestScore(runMode, options = {}) {
  const records = readMayhemModeRecords(options);
  return normalizeRunMode(runMode) === RUN_MODES.MAYHEM_TACTICAL
    ? records.tactical
    : records.pure;
}

export function recordMayhemModeScore(runMode, score, options = {}) {
  const mode = normalizeRunMode(runMode);
  if (mode !== RUN_MODES.RANKED && mode !== RUN_MODES.MAYHEM_TACTICAL) return readMayhemModeRecords(options);
  const current = readMayhemModeRecords(options);
  const key = mode === RUN_MODES.MAYHEM_TACTICAL ? 'tactical' : 'pure';
  const next = {
    ...current,
    [key]: Math.max(current[key], normalizeScore(score)),
    updatedAt: new Date().toISOString()
  };
  try {
    safeStorage()?.setItem(MAYHEM_MODE_RECORDS_KEY, JSON.stringify(next));
    globalThis?.window?.__novaSteamCloudDiagnostics?.sync?.()?.catch?.(() => {});
  } catch {
    // Personal-best presentation must never block a run result.
  }
  return next;
}
