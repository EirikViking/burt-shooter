// Shared Rank Policy - Used by both frontend and backend
// DO NOT MODIFY WITHOUT UPDATING BOTH DEPLOYMENTS

export const NUM_RANKS = 20;
export const MAX_RANK_INDEX = 19;
export const START_SCORE = 10000; // TASK 3: First rank threshold
export const END_SCORE = 500000; // TASK 3: Final rank threshold

// TASK 3: New rank thresholds with specific early progression
// Rank 1: 10000, Rank 2: 25000, Rank 3: 50000, Rank 4: 75000, Rank 5: 100000, Rank 6: 150000
// Then gradual progression to final rank at 500000
function generateThresholds() {
    const thresholds = new Array(NUM_RANKS);

    // Explicit early ranks
    thresholds[0] = 0;
    thresholds[1] = 10000;
    thresholds[2] = 25000;
    thresholds[3] = 50000;
    thresholds[4] = 75000;
    thresholds[5] = 100000;
    thresholds[6] = 150000;

    // Gradual progression from rank 7 to rank 19 (500000)
    // Linear interpolation from 150000 to 500000 over 13 ranks
    const startScore = 150000;
    const endScore = 500000;
    const numSteps = MAX_RANK_INDEX - 6; // 13 steps from rank 7 to 19

    for (let i = 7; i <= MAX_RANK_INDEX; i++) {
        const step = i - 6;
        const raw = startScore + (step * (endScore - startScore) / numSteps);
        thresholds[i] = Math.round(raw);
    }

    // Force strictly increasing
    for (let i = 1; i < NUM_RANKS; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
            thresholds[i] = thresholds[i - 1] + 1;
        }
    }

    return thresholds;
}

// Singleton thresholds array
const THRESHOLDS = generateThresholds();

// Rank title i18n keys (frontend should translate)
const RANK_TITLE_KEYS = [
    'rank.title.0',
    'rank.title.1',
    'rank.title.2',
    'rank.title.3',
    'rank.title.4',
    'rank.title.5',
    'rank.title.6',
    'rank.title.7',
    'rank.title.8',
    'rank.title.9',
    'rank.title.10',
    'rank.title.11',
    'rank.title.12',
    'rank.title.13',
    'rank.title.14',
    'rank.title.15',
    'rank.title.16',
    'rank.title.17',
    'rank.title.18',
    'rank.title.19'
];

/**
 * Get rank index from score
 * @param {number} score - Player score
 * @returns {number} Rank index (0-19)
 */
export function getRankFromScore(score) {
    // Guard: Ensure score is a valid number
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
        return 0;
    }

    // Find highest rank threshold that score meets or exceeds
    for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
        if (score >= THRESHOLDS[i]) {
            return i;
        }
    }

    return 0;
}

/**
 * Get rank title for a rank index
 * @param {number} rankIndex - Rank index (0-19)
 * @returns {string} Rank title
 */
export function getRankTitle(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return RANK_TITLE_KEYS[0];
    }
    return RANK_TITLE_KEYS[rankIndex];
}

/**
 * Get all rank thresholds
 * @returns {number[]} Array of 20 thresholds
 */
export function getThresholds() {
    return [...THRESHOLDS]; // Return copy to prevent mutation
}

/**
 * Get threshold for a specific rank
 * @param {number} rankIndex - Rank index (0-19)
 * @returns {number} Score threshold for that rank
 */
export function getRankThreshold(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return 0;
    }
    return THRESHOLDS[rankIndex];
}

/**
 * Get next rank threshold
 * @param {number} currentRankIndex - Current rank index
 * @returns {number} Score needed for next rank
 */
export function getNextRankThreshold(currentRankIndex) {
    if (currentRankIndex >= MAX_RANK_INDEX) {
        return THRESHOLDS[MAX_RANK_INDEX]; // Already at max
    }
    return THRESHOLDS[currentRankIndex + 1];
}
