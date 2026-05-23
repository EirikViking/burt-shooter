import { NUM_RANKS, getRankTitle } from '../shared/RankPolicy.js';

export const GLOBAL_LEADERBOARD_ACHIEVEMENT_ID = 'ACH_GLOBAL_LEADERBOARD';
export const GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID = 'ACH_GLOBAL_NUMBER_ONE';

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
  }
].map((achievement) => Object.freeze(achievement)));

const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export function getAchievementById(id) {
  return ACHIEVEMENTS_BY_ID.get(id) || null;
}

export function getAchievementIds() {
  return ACHIEVEMENTS.map((achievement) => achievement.id);
}

export function isValidAchievementId(id) {
  return ACHIEVEMENTS_BY_ID.has(id);
}
