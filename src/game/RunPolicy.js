import {
  RUN_MODES,
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  canRunModeUpdateCareerProgress,
  canRunModeUpdateCompetitiveCareerBests,
  getRunModeProfile,
  isRankedRunMode,
  normalizeRunMode
} from './RunMode.js';

const PROTOTYPE_DISABLED_PERMISSIONS = Object.freeze({
  allowLeaderboardSubmission: false,
  allowGlobalLeaderboardSubmission: false,
  allowLocalLeaderboardSubmission: false,
  allowAchievements: false,
  allowCareerProgress: false,
  allowCheckpointUnlocks: false,
  allowPersonalBests: false,
  allowHangarProgress: false,
  allowCodexProgress: false,
  allowShipUnlocks: false,
  allowPersistentRewards: false,
  allowCloudProgressSync: false
});

export function createRunPolicy({
  runMode = RUN_MODES.RANKED,
  isDebugRun = false,
  prototype = false
} = {}) {
  const mode = normalizeRunMode(runMode);
  const profile = getRunModeProfile(mode);
  const prototypeRun = prototype === true;
  if (prototypeRun) {
    return Object.freeze({
      runMode: mode,
      isDebugRun: Boolean(isDebugRun),
      prototype: true,
      ranked: false,
      ...PROTOTYPE_DISABLED_PERMISSIONS
    });
  }

  const ranked = isRankedRunMode(mode, { isDebugRun });
  const allowGlobalLeaderboardSubmission = canRunModeSubmitGlobalLeaderboard(mode, { isDebugRun });
  const allowLocalLeaderboardSubmission = ranked && profile.submitsLocalLeaderboard === true;
  const allowCareerProgress = canRunModeUpdateCareerProgress(mode, { isDebugRun });
  const allowPersonalBests = canRunModeUpdateCompetitiveCareerBests(mode, { isDebugRun });
  const allowAchievements = canRunModeUnlockAchievements(mode, { isDebugRun });
  // Preserve the established Codex eligibility for every non-prototype mode:
  // ranked, Career-active Overrun, Scout, and Daily Signal runs.
  const allowCodexProgress = ranked
    || allowCareerProgress
    || mode === RUN_MODES.SCOUT
    || mode === RUN_MODES.DAILY_SIGNAL;

  return Object.freeze({
    runMode: mode,
    isDebugRun: Boolean(isDebugRun),
    prototype: false,
    ranked,
    allowLeaderboardSubmission: allowGlobalLeaderboardSubmission || allowLocalLeaderboardSubmission,
    allowGlobalLeaderboardSubmission,
    allowLocalLeaderboardSubmission,
    allowAchievements,
    allowCareerProgress,
    allowCheckpointUnlocks: ranked && profile.unlocksRankedCheckpoints === true,
    allowPersonalBests,
    allowHangarProgress: allowCareerProgress,
    allowCodexProgress,
    allowShipUnlocks: allowCareerProgress,
    allowPersistentRewards: true,
    allowCloudProgressSync: true
  });
}

export function isPrototypeRunPolicy(policy) {
  return policy?.prototype === true && Object.keys(PROTOTYPE_DISABLED_PERMISSIONS)
    .every((permission) => policy[permission] === false);
}

export function getPrototypeDisabledRunPermissions() {
  return { ...PROTOTYPE_DISABLED_PERMISSIONS };
}
