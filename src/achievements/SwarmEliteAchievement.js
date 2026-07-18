import { SWARM_ELITE_SCORE_GATE } from './AchievementCatalog.js';
import {
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  parseRunMode
} from '../game/RunMode.js';

function wholeScore(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function isAcceptedLeaderboardSubmission(result = {}, provider = null) {
  const normalizedProvider = String(provider || result.globalProvider || '').trim().toLowerCase();
  if (normalizedProvider === 'steam') {
    return (
      result.steamStatus === 'submitted'
      || result.globalStatus === 'submitted'
      || result.globalStatus === 'steam_best_unchanged'
    )
      && result.steamPendingQueued !== true
      && !result.steamError;
  }
  if (normalizedProvider === 'cloud') {
    return result.globalStatus === 'submitted'
      && !result.globalError;
  }
  return false;
}

export function evaluateSwarmEliteEligibility({
  score = 0,
  runMode = null,
  isDebugRun = false,
  allowAchievements = true,
  eligibleRun = true,
  submissionAccepted = false,
  historicalAccepted = false,
  historicalAcceptedScore = 0,
  queued = false,
  rejected = false
} = {}) {
  const canonicalRunMode = parseRunMode(runMode);
  if (!canonicalRunMode) {
    return { eligible: false, reason: 'unknown_run_mode', acceptedScore: 0, runMode: null };
  }
  if (
    allowAchievements === false
    || eligibleRun === false
    || !canRunModeUnlockAchievements(canonicalRunMode, { isDebugRun })
    || !canRunModeSubmitGlobalLeaderboard(canonicalRunMode, { isDebugRun })
  ) {
    return { eligible: false, reason: 'ineligible_run', acceptedScore: 0, runMode: canonicalRunMode };
  }
  if (queued || rejected) {
    return {
      eligible: false,
      reason: queued ? 'awaiting_submission_acceptance' : 'submission_rejected',
      acceptedScore: 0,
      runMode: canonicalRunMode
    };
  }

  const submittedScore = submissionAccepted ? wholeScore(score) : 0;
  const trustedHistoricalScore = historicalAccepted ? wholeScore(historicalAcceptedScore) : 0;
  const acceptedScore = Math.max(submittedScore, trustedHistoricalScore);
  if (!submissionAccepted && !historicalAccepted) {
    return { eligible: false, reason: 'submission_not_accepted', acceptedScore: 0, runMode: canonicalRunMode };
  }
  if (acceptedScore < SWARM_ELITE_SCORE_GATE) {
    return { eligible: false, reason: 'score_below_gate', acceptedScore, runMode: canonicalRunMode };
  }

  return {
    eligible: true,
    reason: null,
    acceptedScore,
    runMode: canonicalRunMode,
    scoreSource: trustedHistoricalScore > submittedScore ? 'historical_accepted_score' : 'accepted_submission'
  };
}
