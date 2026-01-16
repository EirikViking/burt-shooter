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

// TASK 2: Rank titles - lore-friendly, Stokmarknes/Melbu/beer/Kurt/Eirik vibe
const RANK_TITLES = [
    "Rekrutt",              // 0 - Recruit
    "Ølkjempe",             // 1 - Beer Warrior
    "Rølpemester",          // 2 - Burp Master
    "Melbu Veteran",        // 3 - Melbu Veteran
    "Stokmarknes Helt",     // 4 - Stokmarknes Hero
    "Kurt's Lærling",       // 5 - Kurt's Apprentice
    "Eirik's Venn",         // 6 - Eirik's Friend
    "Brusmeister",          // 7 - Soda Master
    "Grisejeger",           // 8 - Pig Hunter
    "Mongo Slakter",        // 9 - Mongo Slayer
    "Vesterålen Legende",   // 10 - Vesterålen Legend
    "Øl Admiral",           // 11 - Beer Admiral
    "Rølp General",         // 12 - Burp General
    "Kurt's Høyre Hånd",    // 13 - Kurt's Right Hand
    "Eirik's Champion",     // 14 - Eirik's Champion
    "Nordland Mester",      // 15 - Nordland Master
    "Lofoten Erobrer",      // 16 - Lofoten Conqueror
    "Øl Gud",               // 17 - Beer God
    "Vesterålen Konge",     // 18 - Vesterålen King
    "Galaga Legende"        // 19 - Galaga Legend
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
        return RANK_TITLES[0];
    }
    return RANK_TITLES[rankIndex];
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
