import { NUM_RANKS, getRankTitle } from '../shared/RankPolicy.js';

export const GLOBAL_LEADERBOARD_ACHIEVEMENT_ID = 'ACH_GLOBAL_LEADERBOARD';
export const GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID = 'ACH_GLOBAL_NUMBER_ONE';

export const MILESTONE_ACHIEVEMENT_IDS = Object.freeze({
  SECTOR_FIVE: 'ACH_SECTOR_FIVE',
  FINAL_CLIMAX: 'ACH_FINAL_CLIMAX',
  ARCADE_CLEAR: 'ACH_ARCADE_CLEAR',
  TWO_LIVES_CLEAR: 'ACH_TWO_LIVES_CLEAR',
  SCORE_250K: 'ACH_SCORE_250K',
  NO_HIT_SECTOR: 'ACH_NO_HIT_SECTOR',
  BOSS_HUNTER_25: 'ACH_BOSS_HUNTER_25',
  SIGNAL_CARTOGRAPHER: 'ACH_SIGNAL_CARTOGRAPHER',
  HANGAR_TWELVE: 'ACH_HANGAR_TWELVE'
});

export function getRankAchievementId(rankIndex) {
  const normalized = Math.floor(Number(rankIndex));
  if (!Number.isFinite(normalized) || normalized <= 0 || normalized >= NUM_RANKS) return null;
  return `ACH_RANK_${String(normalized).padStart(2, '0')}`;
}

const rankAchievements = Array.from({ length: Math.max(0, NUM_RANKS - 1) }, (_, offset) => {
  const rankIndex = offset + 1;
  const title = getRankTitle(rankIndex);
  return {
    id: getRankAchievementId(rankIndex),
    name: `Rank Up: ${title}`,
    description: `Reach the ${title} rank.`,
    type: 'rank',
    rankIndex,
    hidden: false
  };
});

export const MILESTONE_ACHIEVEMENTS = Object.freeze([
  {
    id: MILESTONE_ACHIEVEMENT_IDS.SECTOR_FIVE,
    name: 'Past The Warmup',
    description: 'Reach Sector 5 in a ranked run.',
    type: 'milestone',
    metric: 'bestSector',
    target: 5,
    difficulty: 'medium',
    hidden: false
  },
  {
    id: MILESTONE_ACHIEVEMENT_IDS.FINAL_CLIMAX,
    name: 'Final Climax Signal',
    description: 'Reach the final climax sector.',
    type: 'milestone',
    metric: 'bestSector',
    target: 10,
    difficulty: 'hard',
    hidden: false
  },
  {
    id: MILESTONE_ACHIEVEMENT_IDS.ARCADE_CLEAR,
    name: 'Cabinet Survived',
    description: 'Clear the current arcade run.',
    type: 'milestone',
    metric: 'runClears',
    target: 1,
    difficulty: 'very_hard',
    hidden: false
  },
  {
    id: MILESTONE_ACHIEVEMENT_IDS.TWO_LIVES_CLEAR,
    name: 'Spare Hull Ceremony',
    description: 'Clear the run with at least 2 lives remaining.',
    type: 'milestone',
    metric: 'clearWithLivesRemaining',
    target: 2,
    difficulty: 'very_hard',
    hidden: false
  },
  {
    id: MILESTONE_ACHIEVEMENT_IDS.SCORE_250K,
    name: 'Quarter-Million Voltage',
    description: 'Score 250,000 points in a ranked run.',
    type: 'milestone',
    metric: 'bestScore',
    target: 250000,
    difficulty: 'hard',
    hidden: false
  },
  {
    id: MILESTONE_ACHIEVEMENT_IDS.NO_HIT_SECTOR,
    name: 'Clean Sector License',
    description: 'Complete any sector without taking a hit.',
    type: 'milestone',
    metric: 'noHitSectors',
    target: 1,
    difficulty: 'hard',
    hidden: false
  },
  {
    id: MILESTONE_ACHIEVEMENT_IDS.BOSS_HUNTER_25,
    name: 'Boss Debt Collector',
    description: 'Defeat 25 bosses across your career.',
    type: 'milestone',
    metric: 'totalBossesDefeated',
    target: 25,
    difficulty: 'hard',
    hidden: false
  },
  {
    id: MILESTONE_ACHIEVEMENT_IDS.SIGNAL_CARTOGRAPHER,
    name: 'Signal Cartographer',
    description: 'Discover 75 Threat Codex signals.',
    type: 'milestone',
    metric: 'totalCodexDiscoveries',
    target: 75,
    difficulty: 'hard',
    hidden: false
  },
  {
    id: MILESTONE_ACHIEVEMENT_IDS.HANGAR_TWELVE,
    name: 'Twelve-Hull Hangar',
    description: 'Unlock 12 playable ships.',
    type: 'milestone',
    metric: 'unlockedShipCount',
    target: 12,
    difficulty: 'hard',
    hidden: false
  }
].map((achievement) => Object.freeze(achievement)));

export const ACHIEVEMENTS = Object.freeze([
  ...rankAchievements,
  {
    id: GLOBAL_LEADERBOARD_ACHIEVEMENT_ID,
    name: 'Callsign On The Board',
    description: 'Qualify for the global leaderboard.',
    type: 'leaderboard',
    hidden: false
  },
  {
    id: GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID,
    name: 'Top Of The Swarm',
    description: 'Reach #1 on the global leaderboard.',
    type: 'leaderboard',
    hidden: false
  },
  ...MILESTONE_ACHIEVEMENTS
].map((achievement) => Object.freeze(achievement)));

const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export function getAchievementById(id) {
  return ACHIEVEMENTS_BY_ID.get(id) || null;
}

export function getAchievementIds() {
  return ACHIEVEMENTS.map((achievement) => achievement.id);
}

export function getMilestoneAchievements() {
  return [...MILESTONE_ACHIEVEMENTS];
}

export function isValidAchievementId(id) {
  return ACHIEVEMENTS_BY_ID.has(id);
}
