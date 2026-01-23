import * as PIXI from 'pixi.js';
import { AssetManifest } from '../assets/assetManifest.js';

const NUM_RANKS = 20;
const MAX_RANK_INDEX = 19;

class RankAssetsManager {
    constructor() {
        this.cache = new Map();
        this.inflight = new Map();
        this.failedIcons = new Set();
    }

    rankSrc(idx) {
        // Use AssetManifest for consistency with other asset loading
        return AssetManifest.sprites.ranks[idx];
    }

    /**
     * Load rank texture using PIXI Assets
     */
    async loadRankTexture(idx) {
        // Clamp 0 to 19
        if (idx < 0) idx = 0;
        if (idx > MAX_RANK_INDEX) idx = MAX_RANK_INDEX;

        const src = this.rankSrc(idx);

        // 1. Check if already in our cache
        if (this.cache.has(src)) {
            return this.cache.get(src);
        }

        // 2. Check if we already failed for this
        if (this.failedIcons.has(src)) return null;

        // 3. Dedupe inflight loads
        if (this.inflight.has(src)) {
            return await this.inflight.get(src);
        }

        // 4. Load using PIXI.Assets.load with simple URL
        const loadTask = (async () => {
            try {
                const texture = await PIXI.Assets.load(src);
                this.cache.set(src, texture);
                return texture;
            } catch (error) {
                console.warn(`[RankAssets] Failed to load ${src}:`, error.message);
                this.failedIcons.add(src);
                return null;
            }
        })();

        this.inflight.set(src, loadTask);
        const result = await loadTask;
        this.inflight.delete(src);
        return result;
    }

    /**
     * Sync getter from our cache.
     */
    getRankTexture(idx) {
        if (idx < 0) idx = 0;
        if (idx > MAX_RANK_INDEX) idx = MAX_RANK_INDEX;
        const src = this.rankSrc(idx);
        return this.cache.get(src) || null;
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
