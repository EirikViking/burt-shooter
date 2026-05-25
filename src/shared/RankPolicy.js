// Shared Rank Policy - Used by both frontend and backend.
// DO NOT MODIFY WITHOUT UPDATING BOTH DEPLOYMENTS.

export const NUM_RANKS = 20;
export const MAX_RANK_INDEX = 19;
export const START_LEVEL = 1;
export const END_LEVEL = 60;

const LEVEL_THRESHOLDS = [
    1,
    2,
    3,
    5,
    7,
    9,
    11,
    14,
    17,
    20,
    24,
    28,
    32,
    36,
    40,
    44,
    48,
    52,
    56,
    60
];

const PILOT_XP_THRESHOLDS = [
    0,
    250,
    700,
    1400,
    2400,
    3800,
    5600,
    7800,
    10400,
    13500,
    17200,
    21600,
    26800,
    33000,
    40500,
    49500,
    60500,
    74000,
    90500,
    110000
];

const RANK_TITLES = [
    "Cadet",
    "Button Warmer",
    "Pixel Pilot",
    "Formation Breaker",
    "Laser Wrangler",
    "Bonus Hunter",
    "Combo Courier",
    "Swarm Dodger",
    "Arcade Ace",
    "Quarter Captain",
    "Nebula Striker",
    "Boss Baiter",
    "Pattern Reader",
    "Cabinet Champion",
    "Wave Surgeon",
    "Starline Veteran",
    "High-Score Hero",
    "Swarm Nemesis",
    "Boss Rush Royalty",
    "Arcade Legend"
];

function sanitizeLevel(level) {
    if (typeof level !== 'number' || !Number.isFinite(level) || level < START_LEVEL) {
        return START_LEVEL;
    }
    return Math.floor(level);
}

function sanitizePilotXp(pilotXp) {
    if (typeof pilotXp !== 'number' || !Number.isFinite(pilotXp) || pilotXp < 0) {
        return 0;
    }
    return Math.floor(pilotXp);
}

export function getRankFromLevel(level) {
    const normalizedLevel = sanitizeLevel(level);

    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (normalizedLevel >= LEVEL_THRESHOLDS[i]) return i;
    }

    return 0;
}

export function getRankFromScore(_score) {
    return 0;
}

export function getRankFromPilotXp(pilotXp) {
    const normalizedXp = sanitizePilotXp(pilotXp);

    for (let i = PILOT_XP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (normalizedXp >= PILOT_XP_THRESHOLDS[i]) return i;
    }

    return 0;
}

export function getRankTitle(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return RANK_TITLES[0];
    }
    return RANK_TITLES[rankIndex];
}

export function getThresholds() {
    return [...LEVEL_THRESHOLDS];
}

export function getPilotXpThresholds() {
    return [...PILOT_XP_THRESHOLDS];
}

export function getRankThreshold(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return START_LEVEL;
    }
    return LEVEL_THRESHOLDS[rankIndex];
}

export function getRankLevelThreshold(rankIndex) {
    return getRankThreshold(rankIndex);
}

export function getPilotXpThreshold(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return PILOT_XP_THRESHOLDS[0];
    }
    return PILOT_XP_THRESHOLDS[rankIndex];
}

export function getNextRankThreshold(currentRankIndex) {
    if (currentRankIndex >= MAX_RANK_INDEX) {
        return LEVEL_THRESHOLDS[MAX_RANK_INDEX];
    }
    return LEVEL_THRESHOLDS[currentRankIndex + 1];
}

export function getNextRankLevelThreshold(currentRankIndex) {
    return getNextRankThreshold(currentRankIndex);
}

export function getNextPilotXpThreshold(currentRankIndex) {
    if (currentRankIndex >= MAX_RANK_INDEX) {
        return PILOT_XP_THRESHOLDS[MAX_RANK_INDEX];
    }
    return PILOT_XP_THRESHOLDS[currentRankIndex + 1];
}

export function getPilotRankProgress(pilotXp) {
    const normalizedXp = sanitizePilotXp(pilotXp);
    const rankIndex = getRankFromPilotXp(normalizedXp);
    const currentThreshold = getPilotXpThreshold(rankIndex);
    const nextThreshold = getNextPilotXpThreshold(rankIndex);

    if (nextThreshold === currentThreshold) {
        return {
            rankIndex,
            title: getRankTitle(rankIndex),
            pilotXp: normalizedXp,
            currentThreshold,
            nextThreshold,
            xpIntoRank: 0,
            xpToNextRank: 0,
            progress: 1
        };
    }

    const xpIntoRank = Math.max(0, normalizedXp - currentThreshold);
    const spread = Math.max(1, nextThreshold - currentThreshold);
    return {
        rankIndex,
        title: getRankTitle(rankIndex),
        pilotXp: normalizedXp,
        currentThreshold,
        nextThreshold,
        xpIntoRank,
        xpToNextRank: Math.max(0, nextThreshold - normalizedXp),
        progress: Math.max(0, Math.min(1, xpIntoRank / spread))
    };
}
