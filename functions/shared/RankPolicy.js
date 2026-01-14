// Shared Rank Policy - Used by both frontend and backend
// DO NOT MODIFY WITHOUT UPDATING BOTH DEPLOYMENTS

export const NUM_RANKS = 20;
export const MAX_RANK_INDEX = 19;
export const START_SCORE = 5000;
export const END_SCORE = 1000000;

// Generate geometric progression thresholds
function generateThresholds() {
    const thresholds = new Array(NUM_RANKS);

    // Anchor points
    thresholds[0] = 0;
    thresholds[1] = START_SCORE;
    thresholds[MAX_RANK_INDEX] = END_SCORE;

    // Geometric ratio between START_SCORE and END_SCORE over 18 steps
    const ratio = Math.pow(END_SCORE / START_SCORE, 1 / 18);

    // Generate intermediate thresholds
    for (let i = 2; i < MAX_RANK_INDEX; i++) {
        const raw = START_SCORE * Math.pow(ratio, i - 1);
        thresholds[i] = Math.floor(raw);

        // Force strictly increasing
        if (thresholds[i] <= thresholds[i - 1]) {
            thresholds[i] = thresholds[i - 1] + 1;
        }
    }

    // Force final anchor
    thresholds[MAX_RANK_INDEX] = END_SCORE;

    return thresholds;
}

// Singleton thresholds array
const THRESHOLDS = generateThresholds();

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
