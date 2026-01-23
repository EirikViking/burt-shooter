import * as PIXI from 'pixi.js';
import { AssetManifest } from '../assets/assetManifest.js';

const NUM_RANKS = 20;
const MAX_RANK_INDEX = 19;

class RankAssetsManager {
    constructor() {
        this.cache = new Map();
        this.inflight = new Map();
        this.failedIcons = new Set();
        this.warned = new Set();
    }

    clampIndex(idx) {
        const parsed = Number(idx);
        if (!Number.isFinite(parsed)) return 0;
        const clamped = Math.max(0, Math.min(MAX_RANK_INDEX, Math.floor(parsed)));
        return clamped;
    }

    rankAlias(idx) {
        return `rank_${idx.toString().padStart(2, '0')}`;
    }

    rankSrc(idx) {
        // Use AssetManifest for consistency with other asset loading
        return AssetManifest.sprites.ranks[idx];
    }

    isValidTexture(tex) {
        return !!(tex && tex.width > 0 && tex.height > 0);
    }

    shouldWarn() {
        if (typeof window === 'undefined') return false;
        return window.location?.search?.includes('debug=1');
    }

    noteFailure(alias, src, reason) {
        this.failedIcons.add(alias);
        if (!this.shouldWarn() || this.warned.has(alias)) return;
        const detail = reason ? ` (${reason})` : '';
        console.warn(`[RankAssets] Missing rank texture ${alias} -> ${src}${detail}`);
        this.warned.add(alias);
    }

    /**
     * Load rank texture using PIXI Assets
     */
    async loadRankTexture(idx) {
        const clamped = this.clampIndex(idx);
        const alias = this.rankAlias(clamped);
        const src = this.rankSrc(clamped);

        if (!src) {
            this.noteFailure(alias, src, 'manifest missing');
            return null;
        }

        // 1. Check cache or PIXI.Assets cache by alias
        const cached = this.cache.get(alias) || PIXI.Assets.get?.(alias);
        if (this.isValidTexture(cached)) {
            this.cache.set(alias, cached);
            return cached;
        }

        // 2. Check if we already failed for this
        if (this.failedIcons.has(alias)) return null;

        // 3. Dedupe inflight loads
        if (this.inflight.has(alias)) {
            return await this.inflight.get(alias);
        }

        // 4. Load using PIXI.Assets.load with alias to avoid cache mismatch
        const loadTask = (async () => {
            try {
                const texture = await PIXI.Assets.load({ alias, src });
                if (this.isValidTexture(texture)) {
                    this.cache.set(alias, texture);
                    return texture;
                }
                this.noteFailure(alias, src, 'invalid texture');
                return null;
            } catch (error) {
                this.noteFailure(alias, src, error?.message || 'load failed');
                return null;
            }
        })();

        this.inflight.set(alias, loadTask);
        const result = await loadTask;
        this.inflight.delete(alias);
        return result;
    }

    /**
     * Sync getter from our cache.
     */
    getRankTexture(idx) {
        const clamped = this.clampIndex(idx);
        const alias = this.rankAlias(clamped);
        const cached = this.cache.get(alias) || PIXI.Assets.get?.(alias);
        if (this.isValidTexture(cached)) {
            this.cache.set(alias, cached);
            return cached;
        }
        return null;
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
