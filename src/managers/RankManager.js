

export class RankManager {
    constructor() {
        this.thresholds = [];
        this.generateThresholds();
    }

    generateThresholds() {
        // Reproduce the pacing: Base 150, +15% per level, accumulating
        let currentRequirement = 150;
        let cumulativeScore = 0;

        for (let i = 0; i <= 77; i++) {
            this.thresholds.push(Math.floor(cumulativeScore));
            cumulativeScore += currentRequirement;
            currentRequirement *= 1.15;
        }
    }

    getRankFromScore(score) {
        // Binary search or simple loop - simple loop is fine for 78 items
        for (let i = this.thresholds.length - 1; i >= 0; i--) {
            if (score >= this.thresholds[i]) {
                return i;
            }
        }
        return 0;
    }

    getRankThreshold(rankIndex) {
        if (rankIndex >= this.thresholds.length) return Infinity;
        if (rankIndex < 0) return 0;
        return this.thresholds[rankIndex];
    }

    getNextRankThreshold(rankIndex) {
        if (rankIndex >= this.thresholds.length - 1) return this.thresholds[this.thresholds.length - 1]; // Cap
        return this.thresholds[rankIndex + 1];
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
