import { getAchievementById, getRankAchievementId } from './AchievementCatalog.js';
import { RUN_MODES } from '../game/RunMode.js';

const earned = (value) => Math.max(0, Number(value) || 0);

// The catalog owns mode eligibility. This adapter only proves that a qualifying
// post-launch event happened in the current Tactical run; lifetime totals by
// themselves cannot award a prepared-start achievement.
export function isOnslaughtTacticalMilestoneEligible(entry, summary = {}) {
  const achievement = getAchievementById(entry?.achievement?.id);
  if (!achievement?.completeModes.includes(RUN_MODES.OVERRUN_TACTICAL)
    || summary.runMode !== RUN_MODES.OVERRUN_TACTICAL || summary.isDebugRun === true
    || Number(summary.startSector) !== 51 || !summary.runId) return false;
  if (!(entry.requirements || []).every(requirement =>
    requirement.comparator === '<=' ? requirement.value <= requirement.target : requirement.value >= requirement.target)) return false;
  if (earned(summary.score) < earned(achievement.minimumScore)) return false;
  switch (achievement.metric) {
    case 'totalRuns': return true;
    case 'bestScore':
    case 'score': return earned(summary.score) >= earned(achievement.target);
    case 'totalBossesDefeated': return earned(summary.bossesKilled) > 0;
    case 'totalCodexDiscoveries': return earned(summary.codexDiscoveries) > 0;
    case 'unlockedShipCount': return (summary.newlyUnlockedShips || []).length > 0;
    case 'noHitSectors':
    case 'runNoHitSectors': return earned(summary.noHitSectors) >= earned(achievement.target);
    case 'runNoHitWaves': return earned(summary.noHitWaves) >= earned(achievement.target);
    default:
      return earned(summary[achievement.metric]) >= earned(achievement.target);
  }
}

export function isOnslaughtTacticalRankEligible(rankIndex, summary = {}) {
  const achievement = getAchievementById(getRankAchievementId(rankIndex));
  return achievement?.completeModes.includes(RUN_MODES.OVERRUN_TACTICAL)
    && summary.runMode === RUN_MODES.OVERRUN_TACTICAL
    && summary.isDebugRun !== true
    && (summary.newRanksThisRun || []).includes(rankIndex);
}
