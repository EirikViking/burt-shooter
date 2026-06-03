import {
    NUM_RANKS,
    MAX_RANK_INDEX,
    getRankFromLevel,
    getRankFromScore,
    getRankFromPilotXp,
    getRankTitle,
    getThresholds,
    getPilotXpThresholds,
    getRankThreshold,
    getNextRankThreshold,
    getPilotXpThreshold,
    getNextPilotXpThreshold,
    getPilotRankProgress
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

    getRankFromPilotXp(pilotXp) {
        return getRankFromPilotXp(pilotXp);
    }

    getRankThreshold(rankIndex) {
        return getRankThreshold(rankIndex);
    }

    getPilotXpThreshold(rankIndex) {
        return getPilotXpThreshold(rankIndex);
    }

    getNextRankThreshold(rankIndex) {
        return getNextRankThreshold(rankIndex);
    }

    getNextPilotXpThreshold(rankIndex) {
        return getNextPilotXpThreshold(rankIndex);
    }

    getRankString(rankIndex) {
        const normalized = Math.max(0, Math.floor(Number(rankIndex) || 0));
        const displayRank = Math.min(MAX_RANK_INDEX + 1, normalized + 1);
        return `RANK ${String(displayRank).padStart(3, '0')}`;
    }

    getRankProgress(level, rankIndex) {
        const currentThresh = this.getRankThreshold(rankIndex);
        const nextThresh = this.getNextRankThreshold(rankIndex);

        if (nextThresh === currentThresh) return 1.0; // Max rank

        const spread = nextThresh - currentThresh;
        const currentInRank = level - currentThresh;

        return Math.max(0, Math.min(1, currentInRank / spread));
    }

    getPilotXpThresholds() {
        return getPilotXpThresholds();
    }

    getPilotRankProgress(pilotXp) {
        return getPilotRankProgress(pilotXp);
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
