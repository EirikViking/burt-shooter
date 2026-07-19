import {
  LEGEND_COMPOUND_SCORE_GATE,
  MILESTONE_ACHIEVEMENT_IDS,
  getMilestoneAchievements
} from './AchievementCatalog.js';

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function unlockedShipCount(progress = {}) {
  return Array.isArray(progress.unlockedShipIds) ? progress.unlockedShipIds.length : 0;
}

function uniqueCount(...lists) {
  const ids = new Set();
  lists.flat().forEach((value) => {
    if (value != null && String(value).trim()) ids.add(String(value));
  });
  return ids.size;
}

function getMetricValueByName(metric, summary = {}, progress = {}) {
  switch (metric) {
    case 'score':
      return Math.max(finiteNumber(summary.score), finiteNumber(summary.finalScore));
    case 'bestScore':
      return Math.max(finiteNumber(summary.score), finiteNumber(summary.finalScore), finiteNumber(progress.bestScore));
    case 'sectorReached':
    case 'bestSector':
      return Math.max(
        finiteNumber(summary.sectorReached),
        finiteNumber(summary.levelReached),
        finiteNumber(progress.bestSector),
        finiteNumber(progress.bestLevel)
      );
    case 'runCleared':
      return summary.runCleared ? 1 : 0;
    case 'runClears':
      return Math.max(finiteNumber(progress.runClears), summary.runCleared ? 1 : 0);
    case 'clearLivesRemaining':
    case 'clearWithLivesRemaining':
      return Math.max(
        finiteNumber(progress.clearWithLivesRemaining),
        summary.runCleared ? finiteNumber(summary.clearLivesRemaining ?? summary.livesRemaining) : 0
      );
    case 'clearLifeLosses':
      return summary.runCleared
        ? finiteNumber(summary.clearLifeLosses ?? summary.lifeLosses)
        : finiteNumber(summary.lifeLosses);
    case 'noRepairReceiptsLifeLosses':
      return finiteNumber(summary.noRepairReceiptsLifeLosses ?? summary.lifeLosses);
    case 'bossesKilled':
      return finiteNumber(summary.bossesKilled);
    case 'totalBossesDefeated':
      return Math.max(finiteNumber(progress.totalBossesDefeated), finiteNumber(summary.bossesKilled));
    case 'wavesCleared':
      return finiteNumber(summary.wavesCleared);
    case 'totalWavesCleared':
      return Math.max(finiteNumber(progress.totalWavesCleared), finiteNumber(summary.wavesCleared));
    case 'totalKills':
      return finiteNumber(summary.totalKills);
    case 'runNoHitWaves':
      return finiteNumber(summary.noHitWaves);
    case 'runNoHitSectors':
      return finiteNumber(summary.noHitSectors);
    case 'noHitWaves':
      return Math.max(finiteNumber(summary.noHitWaves), finiteNumber(progress.noHitWaves));
    case 'noHitSectors':
      return Math.max(finiteNumber(summary.noHitSectors), finiteNumber(progress.noHitSectors));
    case 'bestComboCount':
      return finiteNumber(summary.bestComboCount);
    case 'bestDangerDodgeStreak':
      return finiteNumber(summary.bestDangerDodgeStreak);
    case 'grazeBreaks':
      return finiteNumber(summary.grazeBreaks);
    case 'lifeLosses':
      return finiteNumber(summary.lifeLosses);
    case 'powerupsCollected':
      return finiteNumber(summary.powerupsCollected);
    case 'codexDiscoveries':
      return finiteNumber(summary.codexDiscoveries);
    case 'totalCodexDiscoveries':
      return Math.max(finiteNumber(progress.totalCodexDiscoveries), finiteNumber(summary.totalCodexDiscoveries));
    case 'unlockedShipCount':
      return unlockedShipCount(progress);
    case 'uniqueBossesDefeated':
      return uniqueCount(progress.defeatedBossIds || [], summary.defeatedBossIds || []);
    case 'uniqueRunThemesSurvived':
      return uniqueCount(progress.runThemesSurvived || [], summary.runTheme ? [summary.runTheme] : []);
    case 'highestScoreMultiplier':
      return Math.max(finiteNumber(summary.highestScoreMultiplier, 1), finiteNumber(progress.highestScoreMultiplier, 1));
    default:
      return finiteNumber(progress[metric], finiteNumber(summary[metric]));
  }
}

function getMetricValue(achievement, summary = {}, progress = {}) {
  switch (achievement.id) {
    case MILESTONE_ACHIEVEMENT_IDS.SECTOR_FIVE:
    case MILESTONE_ACHIEVEMENT_IDS.FINAL_CLIMAX:
      return getMetricValueByName('bestSector', summary, progress);
    case MILESTONE_ACHIEVEMENT_IDS.ARCADE_CLEAR:
      return getMetricValueByName('runClears', summary, progress);
    case MILESTONE_ACHIEVEMENT_IDS.TWO_LIVES_CLEAR:
      return getMetricValueByName('clearLivesRemaining', summary, progress);
    case MILESTONE_ACHIEVEMENT_IDS.SCORE_250K:
      return getMetricValueByName('bestScore', summary, progress);
    case MILESTONE_ACHIEVEMENT_IDS.NO_HIT_SECTOR:
      return getMetricValueByName('noHitSectors', summary, progress);
    case MILESTONE_ACHIEVEMENT_IDS.BOSS_HUNTER_25:
      return getMetricValueByName('totalBossesDefeated', summary, progress);
    case MILESTONE_ACHIEVEMENT_IDS.SIGNAL_CARTOGRAPHER:
      return getMetricValueByName('totalCodexDiscoveries', summary, progress);
    case MILESTONE_ACHIEVEMENT_IDS.HANGAR_TWELVE:
      return getMetricValueByName('unlockedShipCount', summary, progress);
    default:
      return getMetricValueByName(achievement.metric, summary, progress);
  }
}

function getRequirementEntries(achievement, summary = {}, progress = {}) {
  const requirements = Array.isArray(achievement.requirements) && achievement.requirements.length
    ? achievement.requirements
    : [{ metric: achievement.metric, target: achievement.target }];
  return requirements.map((requirement) => ({
    metric: requirement.metric,
    comparator: requirement.comparator || '>=',
    value: getMetricValueByName(requirement.metric, summary, progress),
    target: finiteNumber(requirement.target, 1)
  }));
}

function requirementMet(requirement) {
  if (requirement.comparator === '<=') return requirement.value <= requirement.target;
  return requirement.value >= requirement.target;
}

export function captureNoRepairReceiptsLifeLosses({
  capturedLifeLosses = null,
  runCleared = false,
  score = 0,
  lifeLosses = 0
} = {}) {
  if (capturedLifeLosses != null) return Math.max(0, finiteNumber(capturedLifeLosses));
  if (!runCleared || finiteNumber(score) < LEGEND_COMPOUND_SCORE_GATE) return null;
  return Math.max(0, finiteNumber(lifeLosses));
}

export function getMilestoneAchievementUnlocks({ summary = {}, progress = {} } = {}) {
  return getMilestoneAchievements()
    .map((achievement) => {
      const value = getMetricValue(achievement, summary, progress);
      const requirements = getRequirementEntries(achievement, summary, progress);
      return {
        achievement,
        value,
        target: finiteNumber(achievement.target, 1),
        metric: achievement.metric,
        requirements
      };
    })
    .filter((entry) => entry.requirements.every(requirementMet));
}
