import { RunPacingConfig } from '../config/RunPacingConfig.js';
import {
  ShipUnlockConfig,
  SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS,
  getShipUnlockDefinition
} from '../config/ShipUnlockConfig.js';
import {
  MAX_RANK_INDEX,
  getPilotRankProgress,
  getRankFromPilotXp
} from '../shared/RankPolicy.js';

export const HANGAR_PROGRESS_KEY = 'nova.hangarProgress.v1';
export const LEGACY_UNLOCK_PROGRESS_KEY = 'burt.shipUnlockProgress.v1';
export const HANGAR_PROGRESS_VERSION = 1;
export const HANGAR_UNLOCK_TUNING_VERSION = 3;

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

function readJson(key, fallback = {}) {
  try {
    const raw = storage()?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    storage()?.setItem(key, JSON.stringify(value));
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
  } catch (error) {
    console.warn('[HangarProgressState] Failed to write progress:', error);
  }
}

export function createDefaultHangarProgress() {
  return {
    version: HANGAR_PROGRESS_VERSION,
    unlockTuningVersion: HANGAR_UNLOCK_TUNING_VERSION,
    pilotXp: 0,
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
    unlockedShipIds: ['nova_ship_01'],
    lastNewlyUnlockedShipIds: [],
    newRanksThisRun: [],
    rankAchievementsUnlocked: [],
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

export function normalizeHangarProgress(raw = {}) {
  const defaults = createDefaultHangarProgress();
  const legacy = readLegacyUnlockProgress();
  const previousTuningVersion = floor(raw.unlockTuningVersion);
  const rawPilotXp = floor(raw.pilotXp);
  const pilotXp = previousTuningVersion > 0 && previousTuningVersion < 2
    ? Math.floor(rawPilotXp * 0.25)
    : rawPilotXp;
  const pilotRank = Math.min(MAX_RANK_INDEX, getRankFromPilotXp(pilotXp));
  const legacySector = legacyLevelToSector(legacy.bestLevel);
  const reachedSector = Math.max(
    1,
    floor(raw.bestLevel ?? raw.bestSector ?? legacySector, legacySector),
    floor(raw.bestSector ?? raw.bestLevel ?? legacySector, legacySector)
  );
  const bestLevel = reachedSector;
  const bestSector = reachedSector;
  const unlocked = new Set([
    ...defaults.unlockedShipIds,
    ...legacyUnlockedShipIds(legacy.bestLevel)
  ]);
  const normalized = {
    ...defaults,
    ...raw,
    unlockTuningVersion: HANGAR_UNLOCK_TUNING_VERSION,
    pilotXp,
    pilotRank,
    highestPilotRank: Math.max(pilotRank, floor(raw.highestPilotRank)),
    totalRuns: floor(raw.totalRuns),
    bestScore: Math.max(floor(raw.bestScore), legacy.bestScore),
    bestSector,
    bestLevel,
    bestRank: Math.max(floor(raw.bestRank), legacy.bestRank, pilotRank),
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
    shipSpecificMilestones: raw.shipSpecificMilestones && typeof raw.shipSpecificMilestones === 'object' ? { ...raw.shipSpecificMilestones } : {},
    discoveredThreatIds: Array.isArray(raw.discoveredThreatIds) ? [...new Set(raw.discoveredThreatIds.map(String))] : [],
    defeatedBossIds: Array.isArray(raw.defeatedBossIds) ? [...new Set(raw.defeatedBossIds.map(String))] : [],
    runThemesSurvived: Array.isArray(raw.runThemesSurvived) ? [...new Set(raw.runThemesSurvived.map(String))] : [],
    secretShipUnlockIds: Array.isArray(raw.secretShipUnlockIds) ? [...new Set(raw.secretShipUnlockIds.map(String))] : [],
    creditsEasterEggFound: Boolean(raw.creditsEasterEggFound),
    unlockedShipIds: [...unlocked],
    lastNewlyUnlockedShipIds: Array.isArray(raw.lastNewlyUnlockedShipIds) ? raw.lastNewlyUnlockedShipIds.map(String) : [],
    newRanksThisRun: Array.isArray(raw.newRanksThisRun) ? raw.newRanksThisRun.map(Number).filter(Number.isFinite) : [],
    rankAchievementsUnlocked: Array.isArray(raw.rankAchievementsUnlocked) ? raw.rankAchievementsUnlocked.map(String) : [],
    updatedAt: raw.updatedAt || nowIso()
  };
  normalized.unlockedShipIds = recalculateUnlockedShipIds(normalized);
  return normalized;
}

export function readHangarProgressState() {
  return normalizeHangarProgress(readJson(HANGAR_PROGRESS_KEY, {}));
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

export function updateHangarProgress(partial = {}, { preserveLastUnlocks = true } = {}) {
  const previous = readHangarProgressState();
  const merged = normalizeHangarProgress({
    ...previous,
    ...partial,
    pilotXp: partial.pilotXp !== undefined ? floor(partial.pilotXp) : previous.pilotXp,
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
    lastNewlyUnlockedShipIds: preserveLastUnlocks ? previous.lastNewlyUnlockedShipIds : []
  });
  merged.pilotRank = getRankFromPilotXp(merged.pilotXp);
  merged.highestPilotRank = Math.max(previous.highestPilotRank, merged.pilotRank);
  merged.bestRank = Math.max(merged.bestRank, merged.highestPilotRank);
  const before = new Set(previous.unlockedShipIds);
  merged.unlockedShipIds = recalculateUnlockedShipIds(merged);
  merged.lastNewlyUnlockedShipIds = merged.unlockedShipIds.filter((shipId) => !before.has(shipId));
  return writeHangarProgressState(merged);
}

export function grantSecretShipUnlock(shipId, { source = 'secret' } = {}) {
  const previous = readHangarProgressState();
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
  const next = writeHangarProgressState({
    ...previous,
    secretShipUnlockIds: [...new Set([...(previous.secretShipUnlockIds || []), id])],
    creditsEasterEggFound: source === 'credits_easter_egg' ? true : previous.creditsEasterEggFound,
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

export function calculatePilotXpForRun(summary = {}) {
  const xp = RunPacingConfig.pilotXp;
  const scoreXp = Math.floor((Number(summary.score) || 0) / Math.max(1, xp.scoreDivisor));
  const sectorXp = Math.max(0, floor(summary.sectorReached, 1) - 1) * xp.sectorReachedBase;
  const waveXp = floor(summary.wavesCleared) * xp.waveClear;
  const bossXp = floor(summary.bossesKilled) * xp.bossDefeat;
  const discoveryXp = floor(summary.codexDiscoveries) * xp.codexDiscovery;
  const themeXp = floor(summary.runThemeDiscoveries) * xp.runThemeDiscovery;
  const noHitWaveXp = floor(summary.noHitWaves) * xp.noHitWave;
  const noHitSectorXp = floor(summary.noHitSectors) * xp.noHitSector;
  const clearXp = summary.runCleared ? xp.runClear : 0;
  const clearLivesRemaining = floor(summary.clearLivesRemaining ?? summary.livesRemaining);
  const livesXp = summary.runCleared ? clearLivesRemaining * xp.clearWithLivesRemaining : 0;
  return Math.max(0, Math.floor(scoreXp + sectorXp + waveXp + bossXp + discoveryXp + themeXp + noHitWaveXp + noHitSectorXp + clearXp + livesXp));
}

export function previewRunProgression(summary = {}, baseProgress = readHangarProgressState()) {
  const previous = normalizeHangarProgress(baseProgress);
  const xpGained = calculatePilotXpForRun(summary);
  const nextXp = previous.pilotXp + xpGained;
  const nextRank = getRankFromPilotXp(nextXp);
  const newRanksThisRun = [];
  for (let rank = previous.pilotRank + 1; rank <= nextRank; rank += 1) {
    newRanksThisRun.push(rank);
  }
  const next = normalizeHangarProgress({
    ...previous,
    pilotXp: nextXp,
    pilotRank: nextRank,
    highestPilotRank: Math.max(previous.highestPilotRank, nextRank),
    bestRank: Math.max(previous.bestRank, nextRank),
    newRanksThisRun
  });
  next.newRanksThisRun = newRanksThisRun;
  next.rankProgress = getPilotRankProgress(next.pilotXp);
  return {
    previous,
    next,
    xpGained,
    newRanksThisRun,
    newlyUnlockedShipIds: [],
    rankProgress: next.rankProgress
  };
}

export function applyRunProgression(summary = {}) {
  const previous = readHangarProgressState();
  const xpGained = calculatePilotXpForRun(summary);
  const nextXp = previous.pilotXp + xpGained;
  const nextRank = getRankFromPilotXp(nextXp);
  const newRanksThisRun = [];
  for (let rank = previous.pilotRank + 1; rank <= nextRank; rank += 1) {
    newRanksThisRun.push(rank);
  }
  const next = updateHangarProgress({
    pilotXp: nextXp,
    pilotRank: nextRank,
    highestPilotRank: Math.max(previous.highestPilotRank, nextRank),
    totalRuns: previous.totalRuns + 1,
    bestScore: floor(summary.score),
    bestSector: Math.max(floor(summary.sectorReached, 1), floor(summary.levelReached, 1)),
    bestLevel: Math.max(floor(summary.sectorReached, 1), floor(summary.levelReached, 1)),
    bestRunTimeSeconds: floor(summary.runElapsedSeconds),
    survivedSeconds: floor(summary.runElapsedSeconds),
    totalBossesDefeated: previous.totalBossesDefeated + floor(summary.bossesKilled),
    totalWavesCleared: previous.totalWavesCleared + floor(summary.wavesCleared),
    totalCodexDiscoveries: floor(summary.totalCodexDiscoveries, previous.totalCodexDiscoveries),
    runClears: previous.runClears + (summary.runCleared ? 1 : 0),
    noHitWaves: previous.noHitWaves + floor(summary.noHitWaves),
    noHitSectors: previous.noHitSectors + floor(summary.noHitSectors),
    clearWithLivesRemaining: summary.runCleared ? Math.max(previous.clearWithLivesRemaining, floor(summary.clearLivesRemaining ?? summary.livesRemaining)) : previous.clearWithLivesRemaining,
    highestScoreMultiplier: Math.max(previous.highestScoreMultiplier, Number(summary.highestScoreMultiplier) || 1),
    discoveredThreatIds: Array.isArray(summary.discoveredThreatIds) ? summary.discoveredThreatIds : [],
    defeatedBossIds: Array.isArray(summary.defeatedBossIds) ? summary.defeatedBossIds : [],
    runThemesSurvived: summary.runTheme ? [summary.runTheme] : [],
    newRanksThisRun
  }, { preserveLastUnlocks: false });
  next.newRanksThisRun = newRanksThisRun;
  next.rankProgress = getPilotRankProgress(next.pilotXp);
  writeHangarProgressState(next);
  return {
    previous,
    next,
    xpGained,
    newRanksThisRun,
    newlyUnlockedShipIds: next.lastNewlyUnlockedShipIds,
    rankProgress: next.rankProgress
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

export function getHangarProgressSummary(progress = readHangarProgressState()) {
  return {
    pilotXp: progress.pilotXp,
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
    unlockedShipIds: progress.unlockedShipIds.slice(),
    newlyUnlockedShipIds: progress.lastNewlyUnlockedShipIds.slice(),
    rankProgress: getPilotRankProgress(progress.pilotXp)
  };
}
