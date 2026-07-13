export const RUN_MODES = Object.freeze({
  MAYHEM: 'ranked',
  RANKED: 'ranked',
  MAYHEM_TACTICAL: 'ranked_tactical',
  RANKED_TACTICAL: 'ranked_tactical',
  SCOUT: 'scout',
  UNRANKED: 'unranked',
  SECTOR_START: 'sector_start'
});

export const SECTOR_START_CHECKPOINT_INTERVAL = 5;

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

export function normalizeRunMode(value) {
  const mode = String(value || '').trim();
  if (
    mode === RUN_MODES.MAYHEM_TACTICAL ||
    mode === RUN_MODES.SCOUT ||
    mode === RUN_MODES.UNRANKED ||
    mode === RUN_MODES.SECTOR_START
  ) return mode;
  return RUN_MODES.RANKED;
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
  return getRunModeProfile(mode).ranked === true && isDebugRun !== true;
}

export function canRunModeSubmitGlobalLeaderboard(mode, options = {}) {
  return isRankedRunMode(mode, options) && getRunModeProfile(mode).submitsGlobalLeaderboard === true;
}

export function canRunModeUnlockAchievements(mode, options = {}) {
  return isRankedRunMode(mode, options) && getRunModeProfile(mode).unlocksAchievements === true;
}

export function canRunModeUseTacticalDraft(mode) {
  return getRunModeProfile(mode).tacticalDraftEnabled === true;
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
