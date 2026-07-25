export const RUN_MODES = Object.freeze({
  MAYHEM: 'ranked',
  RANKED: 'ranked',
  MAYHEM_TACTICAL: 'ranked_tactical',
  RANKED_TACTICAL: 'ranked_tactical',
  DAILY_SIGNAL: 'daily_signal',
  SCOUT: 'scout',
  UNRANKED: 'unranked',
  SECTOR_START: 'sector_start',
  OVERRUN_PURE: 'overrun_pure',
  OVERRUN_TACTICAL: 'overrun_tactical'
});

export const SECTOR_START_CHECKPOINT_INTERVAL = 5;
export const OVERRUN_START_SECTOR = 51;
export const OVERRUN_UNLOCK_SECTOR = 30;
export const OVERRUN_WEB_PREVIEW_PARAM = 'overrunPreview';
export const OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS = Object.freeze([
  'damage_up',
  'rapid_fire',
  'blink_drive',
  'focus_lens',
  'double_shot'
]);

const DEFAULT_MULTIPLIERS = Object.freeze({
  fireChanceMult: 1,
  projectileSpeedMult: 1,
  enemySpeedMult: 1,
  eliteChanceMult: 1,
  specialThreatMult: 1,
  sustainMult: 1,
  scoreMult: 1,
  contentRarityMult: 1
});

export const MAYHEM_NORMAL_WAVE_SCORE_XP_MULTIPLIER = 1.2;

export const RUN_MODE_PROFILES = Object.freeze({
  [RUN_MODES.RANKED]: Object.freeze({
    id: RUN_MODES.RANKED,
    menuId: 'mayhem',
    label: 'MAYHEM PURE',
    shortLabel: 'Mayhem Pure',
    subLabel: 'Ranked · No tactical upgrades',
    resultLabel: 'MAYHEM PURE',
    oneMoreLabel: 'ONE MORE PURE RUN',
    ranked: true,
    tacticalDraftEnabled: false,
    submitsGlobalLeaderboard: true,
    submitsLocalLeaderboard: true,
    unlocksAchievements: true,
    unlocksRankedCheckpoints: true,
    updatesCareerProgress: true,
    difficultyProfileId: 'accepted_harder_ranked',
    normalWaveDifficultyLevelOffsetDelta: 0,
    bossDifficultyMult: 1,
    bossAttackDangerMult: 1,
    normalWaveAggressionMult: 1,
    normalWaveScoreXpMult: MAYHEM_NORMAL_WAVE_SCORE_XP_MULTIPLIER,
    pressureMultipliers: DEFAULT_MULTIPLIERS
  }),
  [RUN_MODES.MAYHEM_TACTICAL]: Object.freeze({
    id: RUN_MODES.MAYHEM_TACTICAL,
    menuId: 'mayhemTactical',
    label: 'MAYHEM TACTICAL',
    shortLabel: 'Mayhem Tactical',
    subLabel: 'Ranked · Tactical upgrades',
    resultLabel: 'MAYHEM TACTICAL',
    oneMoreLabel: 'ONE MORE TACTICAL RUN',
    ranked: true,
    tacticalDraftEnabled: true,
    submitsGlobalLeaderboard: true,
    submitsLocalLeaderboard: true,
    unlocksAchievements: true,
    unlocksRankedCheckpoints: true,
    updatesCareerProgress: true,
    difficultyProfileId: 'accepted_harder_ranked',
    normalWaveDifficultyLevelOffsetDelta: 0,
    bossDifficultyMult: 1,
    bossAttackDangerMult: 1,
    normalWaveAggressionMult: 1,
    normalWaveScoreXpMult: MAYHEM_NORMAL_WAVE_SCORE_XP_MULTIPLIER,
    pressureMultipliers: DEFAULT_MULTIPLIERS
  }),
  [RUN_MODES.DAILY_SIGNAL]: Object.freeze({
    id: RUN_MODES.DAILY_SIGNAL,
    menuId: 'dailySignal',
    label: 'DAILY CABINET SIGNAL',
    shortLabel: 'Daily Signal',
    subLabel: 'Local daily challenge · Shared UTC rules',
    resultLabel: 'DAILY CABINET SIGNAL',
    oneMoreLabel: 'RETRY TODAY\'S SIGNAL',
    ranked: false,
    tacticalDraftEnabled: true,
    mayhemReinforcementsEnabled: true,
    submitsGlobalLeaderboard: false,
    submitsLocalLeaderboard: false,
    submitsDailyLeaderboard: false,
    unlocksAchievements: false,
    unlocksRankedCheckpoints: false,
    updatesCareerProgress: false,
    difficultyProfileId: 'accepted_harder_ranked',
    normalWaveDifficultyLevelOffsetDelta: 0,
    bossDifficultyMult: 1,
    bossAttackDangerMult: 1,
    normalWaveAggressionMult: 1,
    normalWaveScoreXpMult: 1,
    pressureMultipliers: DEFAULT_MULTIPLIERS
  }),
  [RUN_MODES.SCOUT]: Object.freeze({
    id: RUN_MODES.SCOUT,
    menuId: 'scout',
    label: 'SCOUT RUN',
    shortLabel: 'Scout Run',
    subLabel: 'Unranked · Lower pressure · No achievements',
    resultLabel: 'SCOUT RUN',
    oneMoreLabel: 'ONE MORE SCOUT RUN',
    ranked: false,
    tacticalDraftEnabled: true,
    submitsGlobalLeaderboard: false,
    submitsLocalLeaderboard: false,
    unlocksAchievements: false,
    unlocksRankedCheckpoints: false,
    updatesCareerProgress: false,
    difficultyProfileId: 'scout_lower_pressure_v1',
    normalWaveDifficultyLevelOffsetDelta: -3,
    bossDifficultyMult: 0.75,
    bossAttackDangerMult: 0.85,
    normalWaveAggressionMult: 1,
    normalWaveScoreXpMult: 1,
    pressureMultipliers: Object.freeze({
      fireChanceMult: 0.72,
      projectileSpeedMult: 0.82,
      enemySpeedMult: 0.88,
      eliteChanceMult: 0.62,
      specialThreatMult: 0.58,
      sustainMult: 1.18,
      scoreMult: 1,
      contentRarityMult: 0.8
    })
  }),
  [RUN_MODES.SECTOR_START]: Object.freeze({
    id: RUN_MODES.SECTOR_START,
    menuId: 'sectorRun',
    label: 'SECTOR RUN',
    shortLabel: 'Sector Run',
    subLabel: 'Checkpoint starts · No achievements',
    resultLabel: 'SECTOR RUN',
    oneMoreLabel: 'ONE MORE SECTOR RUN',
    ranked: false,
    tacticalDraftEnabled: true,
    submitsGlobalLeaderboard: false,
    submitsLocalLeaderboard: false,
    unlocksAchievements: false,
    unlocksRankedCheckpoints: false,
    updatesCareerProgress: false,
    difficultyProfileId: 'sector_checkpoint_practice_v1',
    normalWaveDifficultyLevelOffsetDelta: 2,
    bossDifficultyMult: 1,
    bossAttackDangerMult: 1,
    normalWaveAggressionMult: 1,
    normalWaveScoreXpMult: 1,
    pressureMultipliers: DEFAULT_MULTIPLIERS
  }),
  [RUN_MODES.OVERRUN_PURE]: Object.freeze({
    id: RUN_MODES.OVERRUN_PURE,
    menuId: 'overrun',
    label: 'OVERRUN PURE',
    shortLabel: 'Overrun Pure',
    subLabel: 'Sector 51 · Career active · No leaderboard',
    resultLabel: 'OVERRUN PURE',
    oneMoreLabel: 'ONE MORE OVERRUN',
    ranked: false,
    tacticalDraftEnabled: false,
    mayhemReinforcementsEnabled: true,
    routineReinforcementsEnabled: true,
    submitsGlobalLeaderboard: false,
    submitsLocalLeaderboard: false,
    unlocksAchievements: false,
    unlocksRankedCheckpoints: false,
    updatesCareerProgress: true,
    updatesCompetitiveCareerBests: false,
    careerXpMultiplier: 0.85,
    difficultyProfileId: 'overrun_sector_51_v1',
    normalWaveDifficultyLevelOffsetDelta: 0,
    bossDifficultyMult: 1,
    bossAttackDangerMult: 1,
    normalWaveAggressionMult: 1.12,
    normalWaveScoreXpMult: 1,
    pressureMultipliers: DEFAULT_MULTIPLIERS
  }),
  [RUN_MODES.OVERRUN_TACTICAL]: Object.freeze({
    id: RUN_MODES.OVERRUN_TACTICAL,
    menuId: 'overrun',
    label: 'OVERRUN TACTICAL',
    shortLabel: 'Overrun Tactical',
    subLabel: 'Sector 51 · Fixed baseline · Career active',
    resultLabel: 'OVERRUN TACTICAL',
    oneMoreLabel: 'ONE MORE OVERRUN',
    ranked: false,
    tacticalDraftEnabled: true,
    mayhemReinforcementsEnabled: true,
    routineReinforcementsEnabled: true,
    submitsGlobalLeaderboard: false,
    submitsLocalLeaderboard: false,
    unlocksAchievements: false,
    unlocksRankedCheckpoints: false,
    updatesCareerProgress: true,
    updatesCompetitiveCareerBests: false,
    careerXpMultiplier: 0.85,
    tacticalBaselineAugmentIds: OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS,
    difficultyProfileId: 'overrun_sector_51_v1',
    normalWaveDifficultyLevelOffsetDelta: 0,
    bossDifficultyMult: 1,
    bossAttackDangerMult: 1,
    normalWaveAggressionMult: 1.12,
    normalWaveScoreXpMult: 1,
    pressureMultipliers: DEFAULT_MULTIPLIERS
  }),
  [RUN_MODES.UNRANKED]: Object.freeze({
    id: RUN_MODES.UNRANKED,
    menuId: 'debugPractice',
    label: 'PRACTICE RUN',
    shortLabel: 'Practice Run',
    subLabel: 'Unranked · No leaderboard',
    resultLabel: 'PRACTICE RUN',
    oneMoreLabel: 'ONE MORE PRACTICE RUN',
    ranked: false,
    tacticalDraftEnabled: true,
    submitsGlobalLeaderboard: false,
    submitsLocalLeaderboard: false,
    unlocksAchievements: false,
    unlocksRankedCheckpoints: false,
    updatesCareerProgress: false,
    difficultyProfileId: 'debug_unranked',
    normalWaveDifficultyLevelOffsetDelta: 2,
    bossDifficultyMult: 1,
    bossAttackDangerMult: 1,
    normalWaveAggressionMult: 1,
    normalWaveScoreXpMult: 1,
    pressureMultipliers: DEFAULT_MULTIPLIERS
  })
});

const RUN_MODE_ALIASES = Object.freeze({
  ranked: RUN_MODES.RANKED,
  mayhem: RUN_MODES.RANKED,
  pure: RUN_MODES.RANKED,
  mayhem_pure: RUN_MODES.RANKED,
  ranked_pure: RUN_MODES.RANKED,
  ranked_tactical: RUN_MODES.MAYHEM_TACTICAL,
  tactical: RUN_MODES.MAYHEM_TACTICAL,
  mayhem_tactical: RUN_MODES.MAYHEM_TACTICAL,
  tactical_mayhem: RUN_MODES.MAYHEM_TACTICAL,
  daily_signal: RUN_MODES.DAILY_SIGNAL,
  daily: RUN_MODES.DAILY_SIGNAL,
  daily_challenge: RUN_MODES.DAILY_SIGNAL,
  daily_cabinet_signal: RUN_MODES.DAILY_SIGNAL,
  scout: RUN_MODES.SCOUT,
  scout_run: RUN_MODES.SCOUT,
  unranked: RUN_MODES.UNRANKED,
  practice: RUN_MODES.UNRANKED,
  practice_run: RUN_MODES.UNRANKED,
  debug: RUN_MODES.UNRANKED,
  debug_practice: RUN_MODES.UNRANKED,
  sector_start: RUN_MODES.SECTOR_START,
  sector_run: RUN_MODES.SECTOR_START,
  sector_continue: RUN_MODES.SECTOR_START,
  overrun: RUN_MODES.OVERRUN_TACTICAL,
  overrun_start: RUN_MODES.OVERRUN_TACTICAL,
  overrun_tactical: RUN_MODES.OVERRUN_TACTICAL,
  overrun_pure: RUN_MODES.OVERRUN_PURE
});

function normalizeRunModeToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function parseRunMode(value) {
  const token = normalizeRunModeToken(value);
  return token ? RUN_MODE_ALIASES[token] || null : null;
}

export function normalizeRunMode(value) {
  return parseRunMode(value) || RUN_MODES.RANKED;
}

export function getRunModeReportIdentity(value) {
  const rawValue = String(value ?? '').trim();
  const id = parseRunMode(rawValue);
  if (id) {
    return {
      id,
      rawValue: rawValue || id,
      label: RUN_MODE_PROFILES[id]?.shortLabel || id,
      compatibility: normalizeRunModeToken(rawValue) === id ? 'canonical' : 'legacy_alias'
    };
  }
  if (!rawValue) {
    return {
      id: null,
      rawValue: null,
      label: 'Legacy Ranked Run',
      compatibility: 'missing_legacy_mode'
    };
  }
  return {
    id: null,
    rawValue,
    label: 'Unknown Run Mode',
    compatibility: 'unknown_mode'
  };
}

export function getRunModeProfile(mode) {
  return RUN_MODE_PROFILES[normalizeRunMode(mode)] || RUN_MODE_PROFILES[RUN_MODES.RANKED];
}

export function getRunModeNormalWaveScoreXpMultiplier(mode) {
  const profile = getRunModeProfile(mode);
  if (profile.ranked !== true) return 1;
  const value = Number(profile.normalWaveScoreXpMult);
  return Number.isFinite(value) ? Math.max(0.1, value) : 1;
}

export function isRankedRunMode(mode, { isDebugRun = false } = {}) {
  const canonicalMode = parseRunMode(mode);
  return canonicalMode !== null
    && RUN_MODE_PROFILES[canonicalMode]?.ranked === true
    && isDebugRun !== true;
}

export function canRunModeSubmitGlobalLeaderboard(mode, options = {}) {
  const canonicalMode = parseRunMode(mode);
  return canonicalMode !== null
    && isRankedRunMode(canonicalMode, options)
    && RUN_MODE_PROFILES[canonicalMode]?.submitsGlobalLeaderboard === true;
}

export function canRunModeUnlockAchievements(mode, options = {}) {
  const canonicalMode = parseRunMode(mode);
  return canonicalMode !== null
    && isRankedRunMode(canonicalMode, options)
    && RUN_MODE_PROFILES[canonicalMode]?.unlocksAchievements === true;
}

export function canRunModeUseTacticalDraft(mode) {
  return getRunModeProfile(mode).tacticalDraftEnabled === true;
}

export function canRunModeUseMayhemReinforcements(mode) {
  const profile = getRunModeProfile(mode);
  return profile.ranked === true || profile.mayhemReinforcementsEnabled === true;
}

export function canRunModeUpdateCareerProgress(mode, { isDebugRun = false } = {}) {
  const canonicalMode = parseRunMode(mode);
  return canonicalMode !== null
    && isDebugRun !== true
    && RUN_MODE_PROFILES[canonicalMode]?.updatesCareerProgress === true;
}

export function canRunModeUpdateCompetitiveCareerBests(mode, options = {}) {
  const canonicalMode = parseRunMode(mode);
  return canonicalMode !== null
    && canRunModeUpdateCareerProgress(canonicalMode, options)
    && RUN_MODE_PROFILES[canonicalMode]?.updatesCompetitiveCareerBests !== false;
}

export function isOverrunRunMode(mode) {
  const canonicalMode = parseRunMode(mode);
  return canonicalMode === RUN_MODES.OVERRUN_PURE || canonicalMode === RUN_MODES.OVERRUN_TACTICAL;
}

function floorSector(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.floor(number)) : fallback;
}

export function getHighestReachedSector(progress = {}) {
  if (typeof progress === 'number') return floorSector(progress, 1);
  return Math.max(
    1,
    floorSector(progress.bestSector, 1),
    floorSector(progress.bestLevel, 1),
    floorSector(progress.sectorReached, 1),
    floorSector(progress.levelReached, 1)
  );
}

export function getSectorStartCheckpoints(progressOrHighest = {}, {
  interval = SECTOR_START_CHECKPOINT_INTERVAL
} = {}) {
  const highest = getHighestReachedSector(progressOrHighest);
  const step = Math.max(1, Math.floor(Number(interval) || SECTOR_START_CHECKPOINT_INTERVAL));
  const checkpoints = [];
  for (let sector = step; sector <= highest; sector += step) {
    if (isSectorStartCheckpointUnlocked(sector, progressOrHighest)) checkpoints.push(sector);
  }
  return checkpoints;
}

export function resolveSectorStartCheckpoint(requestedSector, progressOrHighest = {}) {
  const checkpoints = getSectorStartCheckpoints(progressOrHighest);
  if (!checkpoints.length) return null;
  if (requestedSector == null) return checkpoints[checkpoints.length - 1];
  const requested = floorSector(requestedSector, 0);
  return checkpoints.includes(requested) ? requested : null;
}

export function getSectorStartPlaySector(checkpointSector) {
  const checkpoint = floorSector(checkpointSector, 0);
  if (checkpoint < 1) return null;
  return checkpoint % 10 === 0 ? checkpoint + 1 : checkpoint;
}

export function isSectorStartCheckpointUnlocked(checkpointSector, progressOrHighest = {}) {
  const checkpoint = floorSector(checkpointSector, 0);
  if (checkpoint < 1) return false;
  if (checkpoint % SECTOR_START_CHECKPOINT_INTERVAL !== 0) return false;
  const highest = getHighestReachedSector(progressOrHighest);
  const requiredSector = getSectorStartPlaySector(checkpoint);
  return requiredSector !== null && highest >= requiredSector;
}

export function getSectorStartState(progress = {}, requestedSector = null) {
  const highestReachedSector = getHighestReachedSector(progress);
  const checkpoints = getSectorStartCheckpoints(progress);
  const selectedCheckpoint = resolveSectorStartCheckpoint(requestedSector, progress);
  return {
    available: checkpoints.length > 0,
    highestReachedSector,
    checkpoints,
    selectedCheckpoint
  };
}

export function isOverrunWebPreviewAccessEnabled({
  location = globalThis.location,
  desktop = globalThis.window?.__NOVA_SWARM_DESKTOP__ === true
} = {}) {
  let params;
  try {
    params = new URLSearchParams(location?.search || '');
  } catch {
    return false;
  }
  const desktopRuntime = desktop === true || params.get('desktop') === '1';
  return !desktopRuntime && params.get(OVERRUN_WEB_PREVIEW_PARAM) === '1';
}

export function getOverrunStartState(progress = {}, options = {}) {
  const highestReachedSector = getHighestReachedSector(progress);
  const progressionUnlocked = highestReachedSector >= OVERRUN_UNLOCK_SECTOR;
  const previewAccess = !progressionUnlocked && (
    options.previewAccess === true
    || (options.previewAccess == null && isOverrunWebPreviewAccessEnabled(options))
  );
  return {
    available: progressionUnlocked || previewAccess,
    progressionUnlocked,
    previewAccess,
    highestReachedSector,
    requiredSector: OVERRUN_UNLOCK_SECTOR,
    startSector: OVERRUN_START_SECTOR
  };
}
