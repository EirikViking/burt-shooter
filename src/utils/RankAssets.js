import * as PIXI from 'pixi.js';

const NUM_RANKS = 20;
const MAX_RANK_INDEX = 19;

class RankAssetsManager {
    constructor() {
        this.basePath = '/sprites/ranks/PNG/Default size/Gold';
        this.inflight = new Map();
        this.failedIcons = new Set();
    }

    rankSrc(idx) {
        const pad3 = String(idx).padStart(3, '0');
        return `${this.basePath}/rank${pad3}.png`;
    }

    rankAlias(idx) {
        return `rank_${String(idx).padStart(2, '0')}`;
    }

    /**
     * Deterministic async loading using Pixi Assets aliases.
     * Dedupes concurrent loads and caches failures.
     */
    async loadRankTexture(idx) {
        // Clamp 0 to 19
        if (idx < 0) idx = 0;
        if (idx > MAX_RANK_INDEX) idx = MAX_RANK_INDEX;

        const alias = this.rankAlias(idx);

        // 1. Check if already loaded in Pixi Assets
        try {
            const existing = PIXI.Assets.get(alias);
            if (existing) return existing;
        } catch (e) {
            // Not in cache, proceed
        }

        // 2. Check if we already failed for this icon
        if (this.failedIcons.has(alias)) return null;

        // 3. Dedupe inflight loads
        if (this.inflight.has(alias)) {
            await this.inflight.get(alias);
            try {
                return PIXI.Assets.get(alias);
            } catch (e) {
                return null;
            }
        }

        // 4. Trigger load
        const src = encodeURI(this.rankSrc(idx));
        const loadTask = PIXI.Assets.load({ alias, src });
        this.inflight.set(alias, loadTask);

        try {
            await loadTask;
            this.inflight.delete(alias);
            return PIXI.Assets.get(alias);
        } catch (error) {
            // One warning per icon failure
            console.warn(`[RankAssets] Failed to load ${alias}:`, error.message);
            this.failedIcons.add(alias);
            this.inflight.delete(alias);
            return null;
        }
    }

    /**
     * Sync getter from Assets cache.
     */
    getRankTexture(idx) {
        if (idx < 0) idx = 0;
        if (idx > MAX_RANK_INDEX) idx = MAX_RANK_INDEX;
        const alias = this.rankAlias(idx);
        try {
            return PIXI.Assets.get(alias);
        } catch (e) {
            return null;
        }
    }

    getRankTextureFallback() {
        return null; // Prompt says "If texture is null, skip creating rank sprite"
    }

    // Compat helper for any existing preload logic
    async preloadAll() {
        const tasks = [];
        for (let i = 0; i < NUM_RANKS; i++) {
            tasks.push(this.loadRankTexture(i));
        }
        return Promise.all(tasks);
    }
}

export const RankAssets = new RankAssetsManager();
