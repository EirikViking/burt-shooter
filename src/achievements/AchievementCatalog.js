import { NUM_RANKS, getRankTitle } from '../shared/RankPolicy.js';

export const GLOBAL_LEADERBOARD_ACHIEVEMENT_ID = 'ACH_GLOBAL_LEADERBOARD';
export const GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID = 'ACH_GLOBAL_NUMBER_ONE';
export const EARLY_PILOT_ACHIEVEMENT_ID = 'ACH_EARLY_PILOT';
export const LEGEND_SCORE_GATE = 100000;

export const MILESTONE_ACHIEVEMENT_IDS = Object.freeze({
  EARLY_PILOT: EARLY_PILOT_ACHIEVEMENT_ID,
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

export const LEGEND_ACHIEVEMENT_IDS = Object.freeze({
  SIX_FIGURE_SIGNAL: 'ACH_SIX_FIGURE_SIGNAL',
  NEON_TAX_BRACKET: 'ACH_NEON_TAX_BRACKET',
  CABINET_JACKPOT: 'ACH_CABINET_JACKPOT',
  MILLION_POINT_MUTINY: 'ACH_MILLION_POINT_MUTINY',
  SECTOR_STORMRIDER: 'ACH_SECTOR_STORMRIDER',
  OVERRUN_CARTOGRAPHER: 'ACH_OVERRUN_CARTOGRAPHER',
  BOSS_PAROLE_DENIED: 'ACH_BOSS_PAROLE_DENIED',
  FIVE_BOSS_FEVER: 'ACH_FIVE_BOSS_FEVER',
  CLEAN_ROOM_RIOT: 'ACH_CLEAN_ROOM_RIOT',
  PERFECT_PRESSURE: 'ACH_PERFECT_PRESSURE',
  FIFTY_HIT_STATIC: 'ACH_FIFTY_HIT_STATIC',
  DANGER_DANCE_CERTIFICATE: 'ACH_DANGER_DANCE_CERTIFICATE',
  GRAZE_BREAKER_DELUXE: 'ACH_GRAZE_BREAKER_DELUXE',
  NO_REPAIR_RECEIPTS: 'ACH_NO_REPAIR_RECEIPTS',
  FULL_HULL_FIREWORKS: 'ACH_FULL_HULL_FIREWORKS',
  SWARM_TAXONOMIST: 'ACH_SWARM_TAXONOMIST',
  BLACK_BOX_ARCHIVIST: 'ACH_BLACK_BOX_ARCHIVIST',
  HANGAR_AFTERPARTY: 'ACH_HANGAR_AFTERPARTY',
  BOSS_ROSTER_STAMPED: 'ACH_BOSS_ROSTER_STAMPED',
  THEME_PARK_PANIC: 'ACH_THEME_PARK_PANIC'
});

function scoreGated(requirements = []) {
  return Object.freeze([
    { metric: 'score', target: LEGEND_SCORE_GATE },
    ...requirements
  ].map((requirement) => Object.freeze(requirement)));
}

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
    id: MILESTONE_ACHIEVEMENT_IDS.EARLY_PILOT,
    name: 'Early Pilot',
    description: 'Play one ranked run during the early pilot window.',
    type: 'milestone',
    metric: 'totalRuns',
    target: 1,
    difficulty: 'medium',
    hidden: false
  },
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

export const LEGEND_ACHIEVEMENTS = Object.freeze([
  {
    id: LEGEND_ACHIEVEMENT_IDS.SIX_FIGURE_SIGNAL,
    name: 'Six-Figure Signal',
    description: 'Score 100,000 points in a ranked run.',
    type: 'milestone',
    metric: 'score',
    target: 100000,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated(),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.NEON_TAX_BRACKET,
    name: 'Neon Tax Bracket',
    description: 'Score 150,000 points in a ranked run.',
    type: 'milestone',
    metric: 'score',
    target: 150000,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'score', target: 150000 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.CABINET_JACKPOT,
    name: 'Cabinet Jackpot',
    description: 'Score 500,000 points in a ranked run.',
    type: 'milestone',
    metric: 'score',
    target: 500000,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'score', target: 500000 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.MILLION_POINT_MUTINY,
    name: 'Million-Point Mutiny',
    description: 'Score 1,000,000 points in a ranked run.',
    type: 'milestone',
    metric: 'score',
    target: 1000000,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'score', target: 1000000 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.SECTOR_STORMRIDER,
    name: 'Sector Stormrider',
    description: 'Reach Sector 12 with at least 100,000 points.',
    type: 'milestone',
    metric: 'sectorReached',
    target: 12,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'sectorReached', target: 12 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.OVERRUN_CARTOGRAPHER,
    name: 'Overrun Cartographer',
    description: 'Reach Sector 20 with at least 100,000 points.',
    type: 'milestone',
    metric: 'sectorReached',
    target: 20,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'sectorReached', target: 20 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.BOSS_PAROLE_DENIED,
    name: 'Boss Parole Denied',
    description: 'Defeat 3 bosses in one 100,000-point ranked run.',
    type: 'milestone',
    metric: 'bossesKilled',
    target: 3,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'bossesKilled', target: 3 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.FIVE_BOSS_FEVER,
    name: 'Five-Boss Fever',
    description: 'Defeat 5 bosses in one 100,000-point ranked run.',
    type: 'milestone',
    metric: 'bossesKilled',
    target: 5,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'bossesKilled', target: 5 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.CLEAN_ROOM_RIOT,
    name: 'Clean Room Riot',
    description: 'Clear 3 no-hit sectors in one 100,000-point ranked run.',
    type: 'milestone',
    metric: 'runNoHitSectors',
    target: 3,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'runNoHitSectors', target: 3 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.PERFECT_PRESSURE,
    name: 'Perfect Pressure',
    description: 'Clear 8 no-hit waves in one 100,000-point ranked run.',
    type: 'milestone',
    metric: 'runNoHitWaves',
    target: 8,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'runNoHitWaves', target: 8 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.FIFTY_HIT_STATIC,
    name: 'Fifty-Hit Static',
    description: 'Reach a 50-hit combo in a 100,000-point ranked run.',
    type: 'milestone',
    metric: 'bestComboCount',
    target: 50,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'bestComboCount', target: 50 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.DANGER_DANCE_CERTIFICATE,
    name: 'Danger Dance Certificate',
    description: 'Chain 6 danger dodges in a 100,000-point ranked run.',
    type: 'milestone',
    metric: 'bestDangerDodgeStreak',
    target: 6,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'bestDangerDodgeStreak', target: 6 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.GRAZE_BREAKER_DELUXE,
    name: 'Graze Breaker Deluxe',
    description: 'Trigger 3 Graze Breaks in a 100,000-point ranked run.',
    type: 'milestone',
    metric: 'grazeBreaks',
    target: 3,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'grazeBreaks', target: 3 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.NO_REPAIR_RECEIPTS,
    name: 'No Repair Receipts',
    description: 'Finish a 100,000-point ranked run without losing a life.',
    type: 'milestone',
    metric: 'lifeLosses',
    target: 0,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'lifeLosses', target: 0, comparator: '<=' }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.FULL_HULL_FIREWORKS,
    name: 'Full-Hull Fireworks',
    description: 'Clear a run with 3 lives remaining and at least 100,000 points.',
    type: 'milestone',
    metric: 'clearLivesRemaining',
    target: 3,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([
      { metric: 'runCleared', target: 1 },
      { metric: 'clearLivesRemaining', target: 3 }
    ]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.SWARM_TAXONOMIST,
    name: 'Swarm Taxonomist',
    description: 'Discover 100 Threat Codex signals, then finish a 100,000-point run.',
    type: 'milestone',
    metric: 'totalCodexDiscoveries',
    target: 100,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'totalCodexDiscoveries', target: 100 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.BLACK_BOX_ARCHIVIST,
    name: 'Black Box Archivist',
    description: 'Earn 6 new Codex discoveries in one 100,000-point ranked run.',
    type: 'milestone',
    metric: 'codexDiscoveries',
    target: 6,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'codexDiscoveries', target: 6 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.HANGAR_AFTERPARTY,
    name: 'Hangar Afterparty',
    description: 'Unlock 15 playable ships, then finish a 100,000-point run.',
    type: 'milestone',
    metric: 'unlockedShipCount',
    target: 15,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'unlockedShipCount', target: 15 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.BOSS_ROSTER_STAMPED,
    name: 'Boss Roster Stamped',
    description: 'Defeat 8 unique boss signals across your career, then finish a 100,000-point run.',
    type: 'milestone',
    metric: 'uniqueBossesDefeated',
    target: 8,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'uniqueBossesDefeated', target: 8 }]),
    difficulty: 'legendary',
    hidden: false
  },
  {
    id: LEGEND_ACHIEVEMENT_IDS.THEME_PARK_PANIC,
    name: 'Theme Park Panic',
    description: 'Survive 6 different run themes, then finish a 100,000-point run.',
    type: 'milestone',
    metric: 'uniqueRunThemesSurvived',
    target: 6,
    minimumScore: LEGEND_SCORE_GATE,
    requirements: scoreGated([{ metric: 'uniqueRunThemesSurvived', target: 6 }]),
    difficulty: 'legendary',
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
  ...MILESTONE_ACHIEVEMENTS,
  ...LEGEND_ACHIEVEMENTS
].map((achievement) => Object.freeze(achievement)));

const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export function getAchievementById(id) {
  return ACHIEVEMENTS_BY_ID.get(id) || null;
}

export function getAchievementIds() {
  return ACHIEVEMENTS.map((achievement) => achievement.id);
}

export function getMilestoneAchievements() {
  return [...MILESTONE_ACHIEVEMENTS, ...LEGEND_ACHIEVEMENTS];
}

export function isValidAchievementId(id) {
  return ACHIEVEMENTS_BY_ID.has(id);
}
