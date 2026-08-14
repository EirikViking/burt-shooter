import { RunPacingConfig } from '../config/RunPacingConfig.js';
import {
  ShipUnlockConfig,
  SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS,
  getShipUnlockDefinition
} from '../config/ShipUnlockConfig.js';
import {
  MAX_RANK_INDEX,
  addPilotXpExact,
  comparePilotXpExact,
  getAuthoredRankFromPilotXpExact,
  getCareerRankProgress,
  getPilotXpCompatibilityNumber,
  normalizePilotXpExact
} from '../shared/RankPolicy.js';
import { getRunModeNormalWaveScoreXpMultiplier, getRunModeProfile } from '../game/RunMode.js';
import { BUILD_ID } from '../buildInfo.js';
import { getRunContractRewardXpForRun, normalizeRunContractsState } from './RunContracts.js';
import {
  normalizeShipMasteryMap,
  recordShipMasteryRun,
  recordShipTourCompletion
} from './ShipMastery.js';
import { markPersistenceDirty } from '../persistence/PersistenceScheduler.js';
import {
  markMayhemPerformanceEvent,
  measureMayhemPerformanceScope
} from '../debug/MayhemPerformanceDiagnostics.js';

export const HANGAR_PROGRESS_KEY = 'nova.hangarProgress.v1';
export const LEGACY_UNLOCK_PROGRESS_KEY = 'burt.shipUnlockProgress.v1';
export const HANGAR_PROGRESS_VERSION = 1;
export const HANGAR_UNLOCK_TUNING_VERSION = 3;
export const CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID = 'nova_ship_30';
export const CREDITS_ASCENDANT_EASTER_EGG_CHANCE = 0.002;
export const CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS = 25;
export const SHIP_UNLOCK_HISTORY_REASON_KEYS = Object.freeze({
  available: 'shipUnlock.reason.available',
  requirements: 'shipUnlock.reason.requirements',
  secret: 'shipUnlock.reason.secret',
  legacy: 'shipUnlock.reason.legacy',
  unknown: 'shipUnlock.reason.unknown'
});

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

function clampText(value, maxLength = 160) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : '';
}

function nowIso() {
  return new Date().toISOString();
}

function interpolateSourceText(value, vars = {}) {
  let text = String(value ?? '');
  for (const [name, replacement] of Object.entries(vars || {})) text = text.replaceAll(`{${name}}`, String(replacement));
  return text;
}

function readJson(key, fallback = {}) {
  try {
    const raw = storage()?.getItem(key);
    return raw
      ? measureMayhemPerformanceScope(`persistence.json_parse.${key}`, () => JSON.parse(raw))
      : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    const serialized = measureMayhemPerformanceScope(
      `persistence.json_stringify.${key}`,
      () => JSON.stringify(value)
    );
    storage()?.setItem(key, serialized);
    markMayhemPerformanceEvent('persistence.hangar_write', { key, bytes: serialized.length });
  } catch (error) {
    console.warn('[HangarProgressState] Failed to write progress:', error);
  }
}

export function createDefaultHangarProgress() {
  return {
    version: HANGAR_PROGRESS_VERSION,
    unlockTuningVersion: HANGAR_UNLOCK_TUNING_VERSION,
    pilotXp: 0,
    pilotXpExact: '0',
    pilotRank: 0,
    highestPilotRank: 0,
    totalRuns: 0,
    bestScore: 0,
    bestSector: 1,
    bestLevel: 1,
    bestRank: 0,
    bestRunTimeSeconds: 0,
    survivedSeconds: 0,
    totalBossesDefeated: 0,
    totalWavesCleared: 0,
    totalCodexDiscoveries: 0,
    runClears: 0,
    noHitWaves: 0,
    noHitSectors: 0,
    clearWithLivesRemaining: 0,
    highestScoreMultiplier: 1,
    shipSpecificMilestones: {},
    discoveredThreatIds: [],
    defeatedBossIds: [],
    runThemesSurvived: [],
    secretShipUnlockIds: [],
    creditsEasterEggFound: false,
    creditsAscendantEasterEggAttempts: 0,
    creditsAscendantEasterEggFound: false,
    unlockedShipIds: ['nova_ship_01'],
    shipUnlockHistory: {},
    lastNewlyUnlockedShipIds: [],
    newRanksThisRun: [],
    rankAchievementsUnlocked: [],
    overrunUnlockCelebrationPending: false,
    overrunUnlockCelebrationSeen: false,
    runContracts: normalizeRunContractsState(),
    updatedAt: nowIso()
  };
}

export function readLegacyUnlockProgress() {
  const legacy = readJson(LEGACY_UNLOCK_PROGRESS_KEY, {});
  return {
    bestScore: floor(legacy.bestScore),
    bestRank: floor(legacy.bestRank),
    bestLevel: Math.max(1, floor(legacy.bestLevel, 1))
  };
}

function legacyUnlockedShipIds(bestLevel = 1) {
  return bestLevel > 0 ? ['nova_ship_01'] : [];
}

function legacyLevelToSector(bestLevel = 1) {
  const level = Math.max(1, floor(bestLevel, 1));
  return Math.max(1, Math.min(10, Math.ceil(level / 6)));
}

function knownShipIdSet() {
  return new Set(ShipUnlockConfig.map((entry) => entry.shipId));
}

function normalizeRequirementGroup(requirements = {}) {
  if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements)) return [];
  return Object.entries(requirements)
    .filter(([key]) => SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS.includes(key))
    .map(([key, target]) => [key, typeof target === 'string' ? String(target) : floor(target)])
    .filter(([, target]) => target !== '' && target !== null && target !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
}

function normalizeReasonParams(params = {}) {
  const raw = params && typeof params === 'object' && !Array.isArray(params) ? params : {};
  const out = {};
  if (Array.isArray(raw.requirements)) {
    out.requirements = raw.requirements
      .map((entry) => {
        if (Array.isArray(entry)) return [clampText(entry[0], 80), typeof entry[1] === 'string' ? clampText(entry[1], 120) : floor(entry[1])];
        if (entry && typeof entry === 'object') return [clampText(entry.key, 80), typeof entry.target === 'string' ? clampText(entry.target, 120) : floor(entry.target)];
        return null;
      })
      .filter((entry) => entry && SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS.includes(entry[0]));
  }
  for (const key of ['sector', 'score', 'bossCount', 'count', 'rank', 'seconds', 'runMode', 'source']) {
    if (raw[key] == null) continue;
    out[key] = typeof raw[key] === 'string' ? clampText(raw[key], 120) : floor(raw[key]);
  }
  return out;
}

function normalizeShipUnlockHistoryEntry(entry = {}) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const reasonKey = clampText(entry.reasonKey, 120) || SHIP_UNLOCK_HISTORY_REASON_KEYS.unknown;
  return {
    unlockedAt: clampText(entry.unlockedAt, 80) || nowIso(),
    reasonKey,
    reasonParams: normalizeReasonParams(entry.reasonParams),
    source: clampText(entry.source, 80) || 'unknown',
    sector: entry.sector == null ? null : floor(entry.sector),
    score: entry.score == null ? null : floor(entry.score),
    bossCount: entry.bossCount == null ? null : floor(entry.bossCount),
    runMode: entry.runMode == null ? null : clampText(entry.runMode, 80),
    buildVersion: clampText(entry.buildVersion, 80) || null
  };
}

export function normalizeShipUnlockHistory(history = {}) {
  if (!history || typeof history !== 'object' || Array.isArray(history)) return {};
  const validIds = knownShipIdSet();
  const normalized = {};
  for (const [shipId, entry] of Object.entries(history)) {
    const id = clampText(shipId, 80);
    if (!id || !validIds.has(id)) continue;
    const normalizedEntry = normalizeShipUnlockHistoryEntry(entry);
    if (normalizedEntry) normalized[id] = normalizedEntry;
  }
  return normalized;
}

function createHistoryEntry(shipId, {
  reasonKey = SHIP_UNLOCK_HISTORY_REASON_KEYS.unknown,
  requirements = [],
  source = 'unknown',
  context = {}
} = {}) {
  const requirementList = Array.isArray(requirements)
    ? requirements
    : normalizeRequirementGroup(requirements);
  return normalizeShipUnlockHistoryEntry({
    unlockedAt: clampText(context.unlockedAt, 80) || nowIso(),
    reasonKey,
    reasonParams: requirementList.length ? { requirements: requirementList } : {},
    source,
    sector: context.sector ?? context.sectorReached ?? context.bestSector ?? null,
    score: context.score ?? context.bestScore ?? null,
    bossCount: context.bossCount ?? context.bossesKilled ?? context.totalBossesDefeated ?? null,
    runMode: context.runMode ?? null,
    buildVersion: context.buildVersion ?? BUILD_ID ?? null
  });
}

function createLegacyShipUnlockHistoryEntry(source = 'legacy') {
  return createHistoryEntry(null, {
    reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.legacy,
    source,
    context: { buildVersion: BUILD_ID }
  });
}

function createAvailableShipUnlockHistoryEntry() {
  return createHistoryEntry(null, {
    reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.available,
    source: 'starter',
    context: { buildVersion: BUILD_ID }
  });
}

function requirementGroupsForShip(shipId) {
  const definition = getShipUnlockDefinition(shipId);
  if (!definition) return [];
  return [
    definition.requirements || {},
    ...(Array.isArray(definition.requirementsAny) ? definition.requirementsAny : [])
  ]
    .map(normalizeRequirementGroup)
    .filter((group) => group.length > 0);
}

function groupToRequirementObject(group = []) {
  return Object.fromEntries(group);
}

function selectUnlockRequirementGroup(shipId, previousProgress, nextProgress) {
  const groups = requirementGroupsForShip(shipId);
  if (!groups.length) return [];
  const newlyMet = groups.find((group) => {
    const requirements = groupToRequirementObject(group);
    return requirementsMet(nextProgress, requirements) && !requirementsMet(previousProgress, requirements);
  });
  if (newlyMet) return newlyMet;
  return groups.find((group) => requirementsMet(nextProgress, groupToRequirementObject(group))) || groups[0];
}

function shouldReplaceHistoryEntry(entry) {
  if (!entry) return true;
  return [
    SHIP_UNLOCK_HISTORY_REASON_KEYS.legacy,
    SHIP_UNLOCK_HISTORY_REASON_KEYS.unknown
  ].includes(entry.reasonKey);
}

function fillMissingShipUnlockHistory(progress, source = 'migration') {
  const history = normalizeShipUnlockHistory(progress.shipUnlockHistory);
  const unlockedIds = Array.isArray(progress.unlockedShipIds) ? progress.unlockedShipIds.map(String) : [];
  for (const shipId of unlockedIds) {
    if (history[shipId]) continue;
    history[shipId] = shipId === 'nova_ship_01'
      ? createAvailableShipUnlockHistoryEntry()
      : createLegacyShipUnlockHistoryEntry(source);
  }
  return history;
}

export function normalizeHangarProgress(raw = {}) {
  const defaults = createDefaultHangarProgress();
  const legacy = readLegacyUnlockProgress();
  const previousTuningVersion = floor(raw.unlockTuningVersion);
  const rawPilotXpExact = normalizePilotXpExact(raw.pilotXpExact ?? raw.pilotXp);
  const pilotXpExact = previousTuningVersion > 0 && previousTuningVersion < 2
    ? (BigInt(rawPilotXpExact) / 4n).toString()
    : rawPilotXpExact;
  const pilotXp = getPilotXpCompatibilityNumber(pilotXpExact);
  const pilotRank = getAuthoredRankFromPilotXpExact(pilotXpExact);
  const legacySector = legacyLevelToSector(legacy.bestLevel);
  const reachedSector = Math.max(
    1,
    floor(raw.bestLevel ?? raw.bestSector ?? legacySector, legacySector),
    floor(raw.bestSector ?? raw.bestLevel ?? legacySector, legacySector)
  );
  const bestLevel = reachedSector;
  const bestSector = reachedSector;
  const shouldCarrySavedUnlockIds = previousTuningVersion >= HANGAR_UNLOCK_TUNING_VERSION;
  const unlocked = new Set([
    ...defaults.unlockedShipIds,
    ...legacyUnlockedShipIds(legacy.bestLevel),
    ...(shouldCarrySavedUnlockIds && Array.isArray(raw.unlockedShipIds) ? raw.unlockedShipIds.map(String) : [])
  ]);
  const normalized = {
    ...defaults,
    ...raw,
    unlockTuningVersion: HANGAR_UNLOCK_TUNING_VERSION,
    pilotXp,
    pilotXpExact,
    pilotRank,
    highestPilotRank: Math.min(MAX_RANK_INDEX, Math.max(pilotRank, floor(raw.highestPilotRank))),
    totalRuns: floor(raw.totalRuns),
    bestScore: Math.max(floor(raw.bestScore), legacy.bestScore),
    bestSector,
    bestLevel,
    bestRank: Math.min(MAX_RANK_INDEX, Math.max(floor(raw.bestRank), legacy.bestRank, pilotRank)),
    bestRunTimeSeconds: floor(raw.bestRunTimeSeconds),
    survivedSeconds: floor(raw.survivedSeconds),
    totalBossesDefeated: floor(raw.totalBossesDefeated),
    totalWavesCleared: floor(raw.totalWavesCleared),
    totalCodexDiscoveries: floor(raw.totalCodexDiscoveries),
    runClears: floor(raw.runClears),
    noHitWaves: floor(raw.noHitWaves),
    noHitSectors: floor(raw.noHitSectors),
    clearWithLivesRemaining: floor(raw.clearWithLivesRemaining),
    highestScoreMultiplier: Math.max(1, Number(raw.highestScoreMultiplier) || 1),
    shipSpecificMilestones: normalizeShipMasteryMap(raw.shipSpecificMilestones),
    discoveredThreatIds: Array.isArray(raw.discoveredThreatIds) ? [...new Set(raw.discoveredThreatIds.map(String))] : [],
    defeatedBossIds: Array.isArray(raw.defeatedBossIds) ? [...new Set(raw.defeatedBossIds.map(String))] : [],
    runThemesSurvived: Array.isArray(raw.runThemesSurvived) ? [...new Set(raw.runThemesSurvived.map(String))] : [],
    secretShipUnlockIds: Array.isArray(raw.secretShipUnlockIds) ? [...new Set(raw.secretShipUnlockIds.map(String))] : [],
    creditsEasterEggFound: Boolean(raw.creditsEasterEggFound),
    creditsAscendantEasterEggAttempts: Math.min(CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS, floor(raw.creditsAscendantEasterEggAttempts)),
    creditsAscendantEasterEggFound: Boolean(raw.creditsAscendantEasterEggFound),
    unlockedShipIds: [...unlocked],
    shipUnlockHistory: normalizeShipUnlockHistory(raw.shipUnlockHistory),
    lastNewlyUnlockedShipIds: Array.isArray(raw.lastNewlyUnlockedShipIds) ? raw.lastNewlyUnlockedShipIds.map(String) : [],
    newRanksThisRun: Array.isArray(raw.newRanksThisRun)
      ? raw.newRanksThisRun.map(Number).filter((rank) => Number.isFinite(rank) && rank >= 0 && rank <= MAX_RANK_INDEX)
      : [],
    rankAchievementsUnlocked: Array.isArray(raw.rankAchievementsUnlocked) ? raw.rankAchievementsUnlocked.map(String) : [],
    overrunUnlockCelebrationPending: Boolean(raw.overrunUnlockCelebrationPending)
      && !Boolean(raw.overrunUnlockCelebrationSeen),
    overrunUnlockCelebrationSeen: Boolean(raw.overrunUnlockCelebrationSeen),
    runContracts: normalizeRunContractsState(raw.runContracts),
    updatedAt: raw.updatedAt || nowIso()
  };
  normalized.unlockedShipIds = recalculateUnlockedShipIds(normalized);
  normalized.shipUnlockHistory = fillMissingShipUnlockHistory(normalized);
  return normalized;
}

export function readHangarProgressState() {
  return measureMayhemPerformanceScope('persistence.readHangarProgress', () => {
    markMayhemPerformanceEvent('persistence.hangar_read', { key: HANGAR_PROGRESS_KEY });
    return normalizeHangarProgress(readJson(HANGAR_PROGRESS_KEY, {}));
  });
}

export function writeHangarProgressState(progress) {
  const normalized = normalizeHangarProgress({
    ...progress,
    updatedAt: nowIso()
  });
  writeJson(HANGAR_PROGRESS_KEY, normalized);
  writeJson(LEGACY_UNLOCK_PROGRESS_KEY, {
    bestScore: normalized.bestScore,
    bestRank: normalized.bestRank,
    bestLevel: normalized.bestLevel
  });
  markPersistenceDirty('hangarProgress');
  return normalized;
}

export function acknowledgeHangarUnlockPresentation() {
  const previous = readHangarProgressState();
  if (!previous.lastNewlyUnlockedShipIds?.length) return previous;
  return writeHangarProgressState({
    ...previous,
    lastNewlyUnlockedShipIds: []
  });
}

function valueForRequirement(progress, key) {
  if (key === 'codexDiscoveries') return progress.totalCodexDiscoveries;
  if (key === 'specificThreatDiscovered') return progress.discoveredThreatIds;
  if (key === 'specificBossDefeated') return progress.defeatedBossIds;
  if (key === 'specificRunThemeSurvived') return progress.runThemesSurvived;
  return progress[key];
}

function requirementMet(progress, key, target) {
  if (!SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS.includes(key)) return false;
  const value = valueForRequirement(progress, key);
  if (Array.isArray(value)) {
    if (typeof target === 'string') return value.includes(target);
    return value.length >= floor(target);
  }
  return Number(value) >= Number(target);
}

export function requirementsMet(progress, requirements = {}) {
  return Object.entries(requirements).every(([key, target]) => requirementMet(progress, key, target));
}

export function shipUnlockMet(shipId, progress = readHangarProgressState()) {
  const definition = getShipUnlockDefinition(shipId);
  const id = String(shipId || '').trim();
  if (id && Array.isArray(progress?.unlockedShipIds) && progress.unlockedShipIds.map(String).includes(id)) return true;
  if (id && Array.isArray(progress?.secretShipUnlockIds) && progress.secretShipUnlockIds.map(String).includes(id)) return true;
  if (!definition) return false;
  const requirements = definition.requirements || {};
  const hasAllRequirements = Object.keys(requirements).length > 0;
  const hasAnyRequirements = Array.isArray(definition.requirementsAny) && definition.requirementsAny.length > 0;
  if (!hasAllRequirements && !hasAnyRequirements) return true;
  if (hasAllRequirements && requirementsMet(progress, requirements)) return true;
  return Array.isArray(definition.requirementsAny) &&
    definition.requirementsAny.some((requirements) => requirementsMet(progress, requirements));
}

export function recalculateUnlockedShipIds(progress = readHangarProgressState()) {
  const normalized = { ...progress };
  const unlocked = new Set(['nova_ship_01']);
  if (Array.isArray(normalized.unlockedShipIds)) {
    for (const shipId of normalized.unlockedShipIds) unlocked.add(String(shipId));
  }
  for (const entry of ShipUnlockConfig) {
    if (shipUnlockMet(entry.shipId, normalized)) unlocked.add(entry.shipId);
  }
  if (Array.isArray(normalized.secretShipUnlockIds)) {
    for (const shipId of normalized.secretShipUnlockIds) unlocked.add(String(shipId));
  }
  return ShipUnlockConfig
    .map((entry) => entry.shipId)
    .filter((shipId) => unlocked.has(shipId));
}

export function updateHangarProgress(partial = {}, { preserveLastUnlocks = true, unlockContext = {} } = {}) {
  return measureMayhemPerformanceScope('persistence.updateHangarProgress', () => {
    const previous = readHangarProgressState();
    const merged = normalizeHangarProgress({
      ...previous,
      ...partial,
      pilotXpExact: partial.pilotXpExact !== undefined
        ? normalizePilotXpExact(partial.pilotXpExact, previous.pilotXpExact)
        : (partial.pilotXp !== undefined ? normalizePilotXpExact(partial.pilotXp) : previous.pilotXpExact),
      totalRuns: Math.max(previous.totalRuns, floor(partial.totalRuns, previous.totalRuns)),
      bestScore: Math.max(previous.bestScore, floor(partial.bestScore, previous.bestScore)),
      bestSector: Math.max(previous.bestSector, floor(partial.bestSector, previous.bestSector)),
      bestLevel: Math.max(previous.bestLevel, floor(partial.bestLevel, previous.bestLevel)),
      bestRank: Math.max(previous.bestRank, floor(partial.bestRank, previous.bestRank)),
      bestRunTimeSeconds: Math.max(previous.bestRunTimeSeconds, floor(partial.bestRunTimeSeconds, previous.bestRunTimeSeconds)),
      survivedSeconds: Math.max(previous.survivedSeconds, floor(partial.survivedSeconds, previous.survivedSeconds)),
      totalBossesDefeated: Math.max(previous.totalBossesDefeated, floor(partial.totalBossesDefeated, previous.totalBossesDefeated)),
      totalWavesCleared: Math.max(previous.totalWavesCleared, floor(partial.totalWavesCleared, previous.totalWavesCleared)),
      totalCodexDiscoveries: Math.max(previous.totalCodexDiscoveries, floor(partial.totalCodexDiscoveries, previous.totalCodexDiscoveries)),
      runClears: Math.max(previous.runClears, floor(partial.runClears, previous.runClears)),
      noHitWaves: Math.max(previous.noHitWaves, floor(partial.noHitWaves, previous.noHitWaves)),
      noHitSectors: Math.max(previous.noHitSectors, floor(partial.noHitSectors, previous.noHitSectors)),
      clearWithLivesRemaining: Math.max(previous.clearWithLivesRemaining, floor(partial.clearWithLivesRemaining, previous.clearWithLivesRemaining)),
      highestScoreMultiplier: Math.max(previous.highestScoreMultiplier, Number(partial.highestScoreMultiplier) || previous.highestScoreMultiplier || 1),
      discoveredThreatIds: [...new Set([...previous.discoveredThreatIds, ...(Array.isArray(partial.discoveredThreatIds) ? partial.discoveredThreatIds : [])])],
      defeatedBossIds: [...new Set([...previous.defeatedBossIds, ...(Array.isArray(partial.defeatedBossIds) ? partial.defeatedBossIds : [])])],
      runThemesSurvived: [...new Set([...previous.runThemesSurvived, ...(Array.isArray(partial.runThemesSurvived) ? partial.runThemesSurvived : [])])],
      secretShipUnlockIds: [...new Set([...previous.secretShipUnlockIds, ...(Array.isArray(partial.secretShipUnlockIds) ? partial.secretShipUnlockIds : [])])],
      creditsEasterEggFound: Boolean(previous.creditsEasterEggFound || partial.creditsEasterEggFound),
      creditsAscendantEasterEggAttempts: Math.min(
        CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS,
        Math.max(
          previous.creditsAscendantEasterEggAttempts || 0,
          floor(partial.creditsAscendantEasterEggAttempts, previous.creditsAscendantEasterEggAttempts || 0)
        )
      ),
      creditsAscendantEasterEggFound: Boolean(previous.creditsAscendantEasterEggFound || partial.creditsAscendantEasterEggFound),
      shipUnlockHistory: {
        ...previous.shipUnlockHistory,
        ...normalizeShipUnlockHistory(partial.shipUnlockHistory)
      },
      lastNewlyUnlockedShipIds: preserveLastUnlocks ? previous.lastNewlyUnlockedShipIds : []
    });
    merged.pilotRank = getAuthoredRankFromPilotXpExact(merged.pilotXpExact);
    merged.highestPilotRank = Math.max(previous.highestPilotRank, merged.pilotRank);
    merged.bestRank = Math.max(merged.bestRank, merged.highestPilotRank);
    const before = new Set(previous.unlockedShipIds);
    merged.unlockedShipIds = recalculateUnlockedShipIds(merged);
    const newlyUnlockedShipIds = merged.unlockedShipIds.filter((shipId) => !before.has(shipId));
    merged.lastNewlyUnlockedShipIds = preserveLastUnlocks
      ? [...new Set([...(previous.lastNewlyUnlockedShipIds || []), ...newlyUnlockedShipIds])]
        .filter((shipId) => merged.unlockedShipIds.includes(shipId))
      : newlyUnlockedShipIds;
    merged.shipUnlockHistory = fillMissingShipUnlockHistory(merged);
    for (const shipId of merged.lastNewlyUnlockedShipIds) {
      if (!shouldReplaceHistoryEntry(merged.shipUnlockHistory[shipId])) continue;
      const requirements = selectUnlockRequirementGroup(shipId, previous, merged);
      merged.shipUnlockHistory[shipId] = createHistoryEntry(shipId, {
        reasonKey: requirements.length
          ? SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements
          : (shipId === 'nova_ship_01' ? SHIP_UNLOCK_HISTORY_REASON_KEYS.available : SHIP_UNLOCK_HISTORY_REASON_KEYS.unknown),
        requirements,
        source: clampText(unlockContext.source || unlockContext.runMode || 'run_progression', 80),
        context: unlockContext
      });
    }
    return writeHangarProgressState(merged);
  });
}

function writeSecretShipUnlock(previous, shipId, { source = 'secret', extraProgress = {} } = {}) {
  const id = String(shipId || '').trim();
  if (!id) {
    return {
      previous,
      next: previous,
      unlocked: false,
      alreadyUnlocked: false,
      shipId: id,
      source
    };
  }

  const alreadyUnlocked = previous.unlockedShipIds.includes(id);
  const nextHistory = {
    ...previous.shipUnlockHistory
  };
  if (!alreadyUnlocked || shouldReplaceHistoryEntry(nextHistory[id])) {
    nextHistory[id] = createHistoryEntry(id, {
      reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.secret,
      source,
      context: { source, buildVersion: BUILD_ID }
    });
  }

  const next = writeHangarProgressState({
    ...previous,
    ...extraProgress,
    secretShipUnlockIds: [...new Set([...(previous.secretShipUnlockIds || []), id])],
    creditsEasterEggFound: Boolean(previous.creditsEasterEggFound || extraProgress.creditsEasterEggFound || source === 'credits_easter_egg'),
    creditsAscendantEasterEggAttempts: Math.min(
      CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS,
      Math.max(
        floor(previous.creditsAscendantEasterEggAttempts),
        floor(extraProgress.creditsAscendantEasterEggAttempts, previous.creditsAscendantEasterEggAttempts)
      )
    ),
    creditsAscendantEasterEggFound: Boolean(
      previous.creditsAscendantEasterEggFound ||
      extraProgress.creditsAscendantEasterEggFound ||
      source === 'credits_ascendant_easter_egg'
    ),
    shipUnlockHistory: nextHistory,
    lastNewlyUnlockedShipIds: alreadyUnlocked ? previous.lastNewlyUnlockedShipIds : [id]
  });

  return {
    previous,
    next,
    unlocked: !alreadyUnlocked && next.unlockedShipIds.includes(id),
    alreadyUnlocked,
    shipId: id,
    source
  };
}

export function grantSecretShipUnlock(shipId, { source = 'secret' } = {}) {
  return writeSecretShipUnlock(readHangarProgressState(), shipId, { source });
}

export function rollCreditsAscendantEasterEgg({ random = Math.random } = {}) {
  const previous = readHangarProgressState();
  const attempts = Math.min(
    CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS,
    floor(previous.creditsAscendantEasterEggAttempts)
  );
  const alreadyUnlocked = previous.unlockedShipIds.includes(CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID);
  const exhausted = attempts >= CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS;

  if (previous.creditsAscendantEasterEggFound || exhausted || alreadyUnlocked) {
    return {
      previous,
      next: previous,
      attempted: false,
      roll: null,
      success: false,
      unlocked: false,
      alreadyUnlocked,
      exhausted,
      shipId: CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID,
      chance: CREDITS_ASCENDANT_EASTER_EGG_CHANCE,
      attempts,
      attemptsRemaining: Math.max(0, CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS - attempts),
      source: 'credits_ascendant_easter_egg'
    };
  }

  const rawRoll = Number(typeof random === 'function' ? random() : Math.random());
  const roll = Math.max(0, Math.min(0.999999, Number.isFinite(rawRoll) ? rawRoll : Math.random()));
  const nextAttempts = Math.min(CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS, attempts + 1);
  const success = roll < CREDITS_ASCENDANT_EASTER_EGG_CHANCE;

  if (!success) {
    const next = writeHangarProgressState({
      ...previous,
      creditsAscendantEasterEggAttempts: nextAttempts
    });
    return {
      previous,
      next,
      attempted: true,
      roll,
      success: false,
      unlocked: false,
      alreadyUnlocked: false,
      exhausted: nextAttempts >= CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS,
      shipId: CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID,
      chance: CREDITS_ASCENDANT_EASTER_EGG_CHANCE,
      attempts: nextAttempts,
      attemptsRemaining: Math.max(0, CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS - nextAttempts),
      source: 'credits_ascendant_easter_egg'
    };
  }

  const result = writeSecretShipUnlock(previous, CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID, {
    source: 'credits_ascendant_easter_egg',
    extraProgress: {
      creditsAscendantEasterEggAttempts: nextAttempts,
      creditsAscendantEasterEggFound: true
    }
  });

  return {
    ...result,
    attempted: true,
    roll,
    success: true,
    exhausted: false,
    chance: CREDITS_ASCENDANT_EASTER_EGG_CHANCE,
    attempts: nextAttempts,
    attemptsRemaining: Math.max(0, CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS - nextAttempts)
  };
}

export function calculatePilotXpForRun(summary = {}) {
  const xp = RunPacingConfig.pilotXp;
  const runModeProfile = getRunModeProfile(summary.runMode);
  const careerXpMultiplier = Math.max(0, Number(runModeProfile.careerXpMultiplier) || 1);
  const normalWaveXpMult = getRunModeNormalWaveScoreXpMultiplier(summary.runMode);
  const scoreXp = Math.floor((Number(summary.score) || 0) / Math.max(1, xp.scoreDivisor));
  const startSector = Math.max(1, floor(summary.startSector ?? summary.sectorStartPlaySector, 1));
  const sectorsCleared = Math.max(0, floor(summary.sectorReached, startSector) - startSector);
  const sectorXp = sectorsCleared * xp.sectorReachedBase;
  const waveXp = floor(summary.wavesCleared) * xp.waveClear * normalWaveXpMult;
  const bossXp = floor(summary.bossesKilled) * xp.bossDefeat;
  const discoveryXp = floor(summary.codexDiscoveries) * xp.codexDiscovery;
  const themeXp = floor(summary.runThemeDiscoveries) * xp.runThemeDiscovery;
  const noHitWaveXp = floor(summary.noHitWaves) * xp.noHitWave * normalWaveXpMult;
  const noHitSectorXp = floor(summary.noHitSectors) * xp.noHitSector;
  const clearXp = summary.runCleared ? xp.runClear : 0;
  const clearLivesRemaining = floor(summary.clearLivesRemaining ?? summary.livesRemaining);
  const livesXp = summary.runCleared ? clearLivesRemaining * xp.clearWithLivesRemaining : 0;
  const pilotOrderXp = getRunContractRewardXpForRun(summary.runContracts);
  const enduranceStart = Math.max(0, floor(xp.enduranceBonusStartSectors, 50));
  const enduranceFull = Math.max(enduranceStart + 1, floor(xp.enduranceBonusFullSectors, 120));
  const enduranceProgress = Math.max(0, Math.min(1,
    (sectorsCleared - enduranceStart) / (enduranceFull - enduranceStart)));
  const enduranceMultiplier = 1 + enduranceProgress
    * Math.max(0, (Number(xp.enduranceMaxMultiplier) || 1) - 1);
  return Math.max(0, Math.floor(
    (scoreXp + sectorXp + waveXp + bossXp + discoveryXp + themeXp + noHitWaveXp + noHitSectorXp + clearXp + livesXp + pilotOrderXp)
    * careerXpMultiplier
    * enduranceMultiplier
  ));
}

export function previewRunProgression(summary = {}, baseProgress = readHangarProgressState()) {
  const previous = normalizeHangarProgress(baseProgress);
  const xpGained = calculatePilotXpForRun(summary);
  const nextXpExact = addPilotXpExact(previous.pilotXpExact, xpGained);
  const nextXp = getPilotXpCompatibilityNumber(nextXpExact);
  const nextRank = getAuthoredRankFromPilotXpExact(nextXpExact);
  const newRanksThisRun = [];
  for (let rank = previous.pilotRank + 1; rank <= nextRank; rank += 1) {
    newRanksThisRun.push(rank);
  }
  const next = normalizeHangarProgress({
    ...previous,
    pilotXp: nextXp,
    pilotXpExact: nextXpExact,
    pilotRank: nextRank,
    highestPilotRank: Math.max(previous.highestPilotRank, nextRank),
    bestRank: Math.max(previous.bestRank, nextRank),
    newRanksThisRun
  });
  next.newRanksThisRun = newRanksThisRun;
  next.rankProgress = getCareerRankProgress(next.pilotXpExact);
  const previousCareerRank = getCareerRankProgress(previous.pilotXpExact).displayRankExact;
  const nextCareerRank = next.rankProgress.displayRankExact;
  return {
    previous,
    next,
    xpGained,
    newRanksThisRun,
    careerRankBefore: previousCareerRank,
    careerRankAfter: nextCareerRank,
    careerRankIncreased: comparePilotXpExact(nextCareerRank, previousCareerRank) > 0,
    newlyUnlockedShipIds: [],
    rankProgress: next.rankProgress
  };
}

export function applyRunProgression(summary = {}, {
  updateCompetitiveBests = true,
  completedAt = new Date().toISOString()
} = {}) {
  const previous = readHangarProgressState();
  const xpGained = calculatePilotXpForRun(summary);
  const nextXpExact = addPilotXpExact(previous.pilotXpExact, xpGained);
  const nextXp = getPilotXpCompatibilityNumber(nextXpExact);
  const nextRank = getAuthoredRankFromPilotXpExact(nextXpExact);
  const shipMastery = updateCompetitiveBests
    ? recordShipMasteryRun(previous.shipSpecificMilestones, summary, { completedAt })
    : { milestones: previous.shipSpecificMilestones };
  const shipTour = recordShipTourCompletion(shipMastery.milestones, summary, { completedAt });
  const shipOverrun = {
    milestones: shipTour.milestones,
    recorded: shipTour.recorded === true && shipTour.source === 'overrun',
    current: shipTour.current || shipMastery.current || null
  };
  const newRanksThisRun = [];
  for (let rank = previous.pilotRank + 1; rank <= nextRank; rank += 1) {
    newRanksThisRun.push(rank);
  }
  const next = updateHangarProgress({
    pilotXp: nextXp,
    pilotXpExact: nextXpExact,
    pilotRank: nextRank,
    highestPilotRank: Math.max(previous.highestPilotRank, nextRank),
    totalRuns: previous.totalRuns + 1,
    bestScore: updateCompetitiveBests ? floor(summary.score) : previous.bestScore,
    bestSector: updateCompetitiveBests
      ? Math.max(floor(summary.sectorReached, 1), floor(summary.levelReached, 1))
      : previous.bestSector,
    bestLevel: updateCompetitiveBests
      ? Math.max(floor(summary.sectorReached, 1), floor(summary.levelReached, 1))
      : previous.bestLevel,
    bestRunTimeSeconds: updateCompetitiveBests ? floor(summary.runElapsedSeconds) : previous.bestRunTimeSeconds,
    survivedSeconds: floor(summary.runElapsedSeconds),
    totalBossesDefeated: previous.totalBossesDefeated + floor(summary.bossesKilled),
    totalWavesCleared: previous.totalWavesCleared + floor(summary.wavesCleared),
    totalCodexDiscoveries: floor(summary.totalCodexDiscoveries, previous.totalCodexDiscoveries),
    runClears: previous.runClears + (updateCompetitiveBests && summary.runCleared ? 1 : 0),
    noHitWaves: previous.noHitWaves + floor(summary.noHitWaves),
    noHitSectors: previous.noHitSectors + floor(summary.noHitSectors),
    clearWithLivesRemaining: updateCompetitiveBests && summary.runCleared
      ? Math.max(previous.clearWithLivesRemaining, floor(summary.clearLivesRemaining ?? summary.livesRemaining))
      : previous.clearWithLivesRemaining,
    highestScoreMultiplier: updateCompetitiveBests
      ? Math.max(previous.highestScoreMultiplier, Number(summary.highestScoreMultiplier) || 1)
      : previous.highestScoreMultiplier,
    discoveredThreatIds: Array.isArray(summary.discoveredThreatIds) ? summary.discoveredThreatIds : [],
    defeatedBossIds: Array.isArray(summary.defeatedBossIds) ? summary.defeatedBossIds : [],
    runThemesSurvived: summary.runTheme ? [summary.runTheme] : [],
    shipSpecificMilestones: shipTour.milestones,
    newRanksThisRun
  }, {
    preserveLastUnlocks: false,
    unlockContext: {
      source: summary.runMode || 'mayhem',
      runMode: summary.runMode || null,
      sector: updateCompetitiveBests
        ? Math.max(floor(summary.sectorReached, 1), floor(summary.levelReached, 1))
        : previous.bestSector,
      score: updateCompetitiveBests ? floor(summary.score) : previous.bestScore,
      bossCount: previous.totalBossesDefeated + floor(summary.bossesKilled),
      bossesKilled: floor(summary.bossesKilled),
      buildVersion: BUILD_ID
    }
  });
  next.newRanksThisRun = newRanksThisRun;
  next.rankProgress = getCareerRankProgress(next.pilotXpExact);
  const previousCareerRank = getCareerRankProgress(previous.pilotXpExact).displayRankExact;
  const nextCareerRank = next.rankProgress.displayRankExact;
  if (
    updateCompetitiveBests
    && previous.bestSector < 30
    && next.bestSector >= 30
    && !previous.overrunUnlockCelebrationSeen
  ) {
    next.overrunUnlockCelebrationPending = true;
  }
  writeHangarProgressState(next);
  return {
    previous,
    next,
    xpGained,
    newRanksThisRun,
    careerRankBefore: previousCareerRank,
    careerRankAfter: nextCareerRank,
    careerRankIncreased: comparePilotXpExact(nextCareerRank, previousCareerRank) > 0,
    newlyUnlockedShipIds: next.lastNewlyUnlockedShipIds,
    rankProgress: next.rankProgress,
    shipMastery,
    shipOverrun,
    shipTour
  };
}

export function getShipUnlockProgressDetails(shipId, progress = readHangarProgressState()) {
  const definition = getShipUnlockDefinition(shipId);
  if (!definition) return { complete: false, label: 'Unknown unlock requirement', requirements: [] };
  const groups = [
    definition.requirements || {},
    ...(Array.isArray(definition.requirementsAny) ? definition.requirementsAny : [])
  ].filter((group) => Object.keys(group).length > 0);
  const requirements = groups.flatMap((group) => Object.entries(group).map(([key, target]) => {
    const value = valueForRequirement(progress, key);
    const current = Array.isArray(value) ? value.length : Number(value) || 0;
    return {
      key,
      current,
      target,
      complete: requirementMet(progress, key, target)
    };
  }));
  return {
    shipId,
    label: definition.label,
    complete: shipUnlockMet(shipId, progress),
    requirements
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function formatShipUnlockRequirementPhrase([key, target] = [], { translate = interpolateSourceText } = {}) {
  const count = typeof target === 'string' ? target : floor(target);
  switch (key) {
    case 'bestSector':
      return translate('Reached Sector {sector}', { sector: count });
    case 'bestScore':
      return translate('Scored {score} points in one run', { score: formatNumber(count) });
    case 'totalBossesDefeated':
      return translate('Defeated {count} bosses', { count });
    case 'totalWavesCleared':
      return translate('Cleared {count} waves', { count });
    case 'totalRuns':
      return translate('Finished {count} runs', { count });
    case 'pilotRank':
      return translate('Reached Pilot Rank {rank}', { rank: count });
    case 'runClears':
      return translate('Cleared the arcade run {count} times', { count });
    case 'codexDiscoveries':
      return translate('Discovered {count} Threat Codex entries', { count });
    case 'noHitWaves':
      return translate('Completed {count} no-hit waves', { count });
    case 'noHitSectors':
      return translate('Completed {count} no-hit sectors', { count });
    case 'survivedSeconds':
      return count >= 60 && count % 60 === 0
        ? translate('Survived {minutes} minutes', { minutes: Math.floor(count / 60) })
        : translate('Survived {seconds} seconds', { seconds: count });
    case 'specificThreatDiscovered':
      return typeof target === 'string'
        ? translate('Discovered a specific Threat Codex entry')
        : translate('Discovered {count} specific threats', { count });
    case 'specificBossDefeated':
      return typeof target === 'string'
        ? translate('Defeated a specific boss')
        : translate('Defeated {count} boss types', { count });
    case 'specificRunThemeSurvived':
      return translate('Survived encounters from {count} run themes', { count });
    case 'clearWithLivesRemaining':
      return translate('Cleared with {count} lives remaining', { count });
    case 'highestScoreMultiplier':
      return translate('Reached a x{count} score multiplier', { count });
    default:
      return translate('Met an unlock milestone');
  }
}

export function formatShipUnlockHistoryReason(entry = null, shipId = '', { translate = interpolateSourceText } = {}) {
  const normalized = normalizeShipUnlockHistoryEntry(entry);
  if (!normalized) return translate('Unknown unlock source');
  if (normalized.reasonKey === SHIP_UNLOCK_HISTORY_REASON_KEYS.available) return translate('Starting hull');
  if (normalized.reasonKey === SHIP_UNLOCK_HISTORY_REASON_KEYS.legacy) return translate('Before tracking was added');
  if (normalized.reasonKey === SHIP_UNLOCK_HISTORY_REASON_KEYS.secret) return translate('Secret discovery');
  const requirements = Array.isArray(normalized.reasonParams?.requirements)
    ? normalized.reasonParams.requirements
    : [];
  if (requirements.length) {
    const phrases = requirements.map((requirement) => formatShipUnlockRequirementPhrase(requirement, { translate }));
    return phrases.join(` ${translate('and')} `);
  }
  const definition = getShipUnlockDefinition(shipId);
  if (definition?.label) return translate(definition.label);
  return translate('Unknown unlock source');
}

export function getShipUnlockHistoryEntry(shipId, progress = readHangarProgressState()) {
  const id = clampText(shipId, 80);
  return id ? normalizeShipUnlockHistory(progress.shipUnlockHistory)?.[id] || null : null;
}

export function getShipUnlockHistoryLine(shipId, progress = readHangarProgressState(), { translate = interpolateSourceText } = {}) {
  const reason = formatShipUnlockHistoryReason(getShipUnlockHistoryEntry(shipId, progress), shipId, { translate });
  return translate('Unlocked: {reason}', { reason });
}

export function getShipUnlockRequirementLine(shipId, { translate = interpolateSourceText } = {}) {
  const definition = getShipUnlockDefinition(shipId);
  return translate('Unlock: {requirement}', {
    requirement: translate(definition?.label || 'Unknown unlock requirement')
  });
}

export function getHangarProgressSummary(progress = readHangarProgressState()) {
  return {
    pilotXp: progress.pilotXp,
    pilotXpExact: progress.pilotXpExact,
    pilotRank: progress.pilotRank,
    highestPilotRank: progress.highestPilotRank,
    totalRuns: progress.totalRuns,
    bestScore: progress.bestScore,
    bestSector: progress.bestSector,
    bestLevel: progress.bestLevel,
    totalBossesDefeated: progress.totalBossesDefeated,
    totalWavesCleared: progress.totalWavesCleared,
    totalCodexDiscoveries: progress.totalCodexDiscoveries,
    runClears: progress.runClears,
    secretShipUnlockIds: progress.secretShipUnlockIds.slice(),
    creditsEasterEggFound: Boolean(progress.creditsEasterEggFound),
    creditsAscendantEasterEggAttempts: progress.creditsAscendantEasterEggAttempts,
    creditsAscendantEasterEggFound: Boolean(progress.creditsAscendantEasterEggFound),
    unlockedShipIds: progress.unlockedShipIds.slice(),
    shipUnlockHistory: { ...progress.shipUnlockHistory },
    newlyUnlockedShipIds: progress.lastNewlyUnlockedShipIds.slice(),
    rankProgress: getCareerRankProgress(progress.pilotXpExact ?? progress.pilotXp ?? 0)
  };
}
