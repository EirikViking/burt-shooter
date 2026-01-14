import {
    NUM_RANKS,
    MAX_RANK_INDEX,
    getRankFromScore,
    getThresholds,
    getRankThreshold,
    getNextRankThreshold
} from '../shared/RankPolicy.js';

export class RankManager {
    constructor() {
        this.thresholds = getThresholds();
    }

    getRankFromScore(score) {
        return getRankFromScore(score);
    }

    getRankThreshold(rankIndex) {
        return getRankThreshold(rankIndex);
    }

    getNextRankThreshold(rankIndex) {
        return getNextRankThreshold(rankIndex);
    }

    getRankString(rankIndex) {
        return `RANK ${rankIndex.toString().padStart(3, '0')}`;
    }

    getRankProgress(score, rankIndex) {
        const currentThresh = this.getRankThreshold(rankIndex);
        const nextThresh = this.getNextRankThreshold(rankIndex);

        if (nextThresh === currentThresh) return 1.0; // Max rank

        const spread = nextThresh - currentThresh;
        const currentInRank = score - currentThresh;

        return Math.max(0, Math.min(1, currentInRank / spread));
    }
}

export const rankManager = new RankManager();
