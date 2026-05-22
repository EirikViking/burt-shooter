import {
    NUM_RANKS,
    MAX_RANK_INDEX,
    getRankFromLevel,
    getRankFromScore,
    getRankTitle,
    getThresholds,
    getRankThreshold,
    getNextRankThreshold
} from '../shared/RankPolicy.js';
import { RankAssets } from '../utils/RankAssets.js';

export class RankManager {
    constructor() {
        this.thresholds = getThresholds();
    }

    getRankFromScore(score) {
        return getRankFromScore(score);
    }

    getRankFromLevel(level) {
        return getRankFromLevel(level);
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

    getRankProgress(level, rankIndex) {
        const currentThresh = this.getRankThreshold(rankIndex);
        const nextThresh = this.getNextRankThreshold(rankIndex);

        if (nextThresh === currentThresh) return 1.0; // Max rank

        const spread = nextThresh - currentThresh;
        const currentInRank = level - currentThresh;

        return Math.max(0, Math.min(1, currentInRank / spread));
    }

    // TASK 2: Get rank title
    getRankTitle(rankIndex) {
        return getRankTitle(rankIndex);
    }

    // TASK 4: Get rank texture for display
    getRankTexture(rankIndex) {
        return RankAssets.getRankTexture(rankIndex);
    }
}

export const rankManager = new RankManager();
