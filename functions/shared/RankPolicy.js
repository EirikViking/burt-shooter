// Shared Rank Policy - Used by both frontend and backend.
// DO NOT MODIFY WITHOUT UPDATING BOTH DEPLOYMENTS.

export const NUM_RANKS = 20;
export const MAX_RANK_INDEX = 19;
export const START_SCORE = 10000;
export const END_SCORE = 500000;

function generateThresholds() {
    const thresholds = new Array(NUM_RANKS);

    thresholds[0] = 0;
    thresholds[1] = 10000;
    thresholds[2] = 25000;
    thresholds[3] = 50000;
    thresholds[4] = 75000;
    thresholds[5] = 100000;
    thresholds[6] = 150000;

    const startScore = 150000;
    const endScore = 500000;
    const numSteps = MAX_RANK_INDEX - 6;

    for (let i = 7; i <= MAX_RANK_INDEX; i++) {
        const step = i - 6;
        const raw = startScore + (step * (endScore - startScore) / numSteps);
        thresholds[i] = Math.round(raw);
    }

    for (let i = 1; i < NUM_RANKS; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
            thresholds[i] = thresholds[i - 1] + 1;
        }
    }

    return thresholds;
}

const THRESHOLDS = generateThresholds();

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

export function getRankFromScore(score) {
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
        return 0;
    }

    for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
        if (score >= THRESHOLDS[i]) return i;
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
    return [...THRESHOLDS];
}

export function getRankThreshold(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return 0;
    }
    return THRESHOLDS[rankIndex];
}

export function getNextRankThreshold(currentRankIndex) {
    if (currentRankIndex >= MAX_RANK_INDEX) {
        return THRESHOLDS[MAX_RANK_INDEX];
    }
    return THRESHOLDS[currentRankIndex + 1];
}
