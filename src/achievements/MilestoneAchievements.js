import { MILESTONE_ACHIEVEMENT_IDS, getMilestoneAchievements } from './AchievementCatalog.js';

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function unlockedShipCount(progress = {}) {
  return Array.isArray(progress.unlockedShipIds) ? progress.unlockedShipIds.length : 0;
}

function getMetricValue(achievement, summary = {}, progress = {}) {
  switch (achievement.id) {
    case MILESTONE_ACHIEVEMENT_IDS.SECTOR_FIVE:
    case MILESTONE_ACHIEVEMENT_IDS.FINAL_CLIMAX:
      return Math.max(
        finiteNumber(summary.sectorReached),
        finiteNumber(summary.levelReached),
        finiteNumber(progress.bestSector),
        finiteNumber(progress.bestLevel)
      );
    case MILESTONE_ACHIEVEMENT_IDS.ARCADE_CLEAR:
      return Math.max(finiteNumber(progress.runClears), summary.runCleared ? 1 : 0);
    case MILESTONE_ACHIEVEMENT_IDS.TWO_LIVES_CLEAR:
      return Math.max(
        finiteNumber(progress.clearWithLivesRemaining),
        summary.runCleared ? finiteNumber(summary.clearLivesRemaining ?? summary.livesRemaining) : 0
      );
    case MILESTONE_ACHIEVEMENT_IDS.SCORE_250K:
      return Math.max(finiteNumber(summary.score), finiteNumber(summary.finalScore), finiteNumber(progress.bestScore));
    case MILESTONE_ACHIEVEMENT_IDS.NO_HIT_SECTOR:
      return Math.max(finiteNumber(summary.noHitSectors), finiteNumber(progress.noHitSectors));
    case MILESTONE_ACHIEVEMENT_IDS.BOSS_HUNTER_25:
      return Math.max(finiteNumber(progress.totalBossesDefeated), finiteNumber(summary.bossesKilled));
    case MILESTONE_ACHIEVEMENT_IDS.SIGNAL_CARTOGRAPHER:
      return Math.max(finiteNumber(progress.totalCodexDiscoveries), finiteNumber(summary.totalCodexDiscoveries));
    case MILESTONE_ACHIEVEMENT_IDS.HANGAR_TWELVE:
      return unlockedShipCount(progress);
    default:
      return finiteNumber(progress[achievement.metric], finiteNumber(summary[achievement.metric]));
  }
}

export function getMilestoneAchievementUnlocks({ summary = {}, progress = {} } = {}) {
  return getMilestoneAchievements()
    .map((achievement) => {
      const value = getMetricValue(achievement, summary, progress);
      return {
        achievement,
        value,
        target: finiteNumber(achievement.target, 1),
        metric: achievement.metric
      };
    })
    .filter((entry) => entry.value >= entry.target);
}
