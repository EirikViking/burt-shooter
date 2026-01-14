import { NUM_RANKS, MAX_RANK_INDEX } from '../shared/RankPolicy.js';
import * as PIXI from 'pixi.js';

class RankAssetsManager {
    constructor() {
        this.basePath = '/sprites/ranks/PNG/Default size/Gold';
        this.textures = []; // Array of 20 textures (0-19)
        this.loadingPromise = null;
        this.textureCache = new Map(); // Cache for loaded textures by URL
    }

    /**
     * Get the properly encoded URL for a rank sprite
     * @param {number} rankIndex - Rank index (0-19)
     * @returns {string} Encoded URL
     */
    getRankSpriteUrl(rankIndex) {
        // Clamp to valid range
        if (rankIndex < 0) rankIndex = 0;
        if (rankIndex > MAX_RANK_INDEX) rankIndex = MAX_RANK_INDEX;

        // Format as 3 digits
        const pad3 = rankIndex.toString().padStart(3, '0');

        // Build raw path with spaces
        const raw = `${this.basePath}/rank${pad3}.png`;

        // Encode the full path to handle spaces safely
        return encodeURI(raw);
    }

    /**
     * Async loader with caching - ensures texture is loaded before use
     * @param {number} rankIndex - Rank index (0-19)
     * @returns {Promise<PIXI.Texture>} Loaded texture
     */
    async loadRankTexture(rankIndex) {
        const url = this.getRankSpriteUrl(rankIndex);

        // Return cached texture if available
        if (this.textureCache.has(url)) {
            return this.textureCache.get(url);
        }

        try {
            // Load the texture using PIXI.Assets
            const alias = `rank${rankIndex.toString().padStart(3, '0')}`;
            await PIXI.Assets.load({ alias, src: url });

            // Get the loaded texture
            const texture = PIXI.Assets.get(alias);

            // Validate texture
            if (!texture || !texture.valid) {
                throw new Error(`Failed to load valid texture for ${url}`);
            }

            // Cache and return
            this.textureCache.set(url, texture);
            return texture;
        } catch (error) {
            console.error(`[RankAssets] Failed to load rank ${rankIndex} from ${url}:`, error);
            throw error;
        }
    }

    /**
     * Sync fallback that never returns undefined
     * @returns {PIXI.Texture} Fallback texture
     */
    getRankTextureFallback() {
        return PIXI.Texture.WHITE;
    }

    // Legacy preloadAll method - kept for compatibility
    async preloadAll() {
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            console.log(`[RankAssets] Preloading ${NUM_RANKS} rank icons...`);

            const loadPromises = [];
            for (let i = 0; i < NUM_RANKS; i++) {
                loadPromises.push(
                    this.loadRankTexture(i).catch(err => {
                        console.error(`[RankAssets] Preload failed for rank ${i}:`, err);
                        return this.getRankTextureFallback();
                    })
                );
            }

            this.textures = await Promise.all(loadPromises);
            console.log('[RankAssets] Preload complete');
            return this.textures;
        })();

        return this.loadingPromise;
    }
}

export const RankAssets = new RankAssetsManager();

// Export helper for CLI verification
export function getRankSpriteUrl(rankIndex) {
    return RankAssets.getRankSpriteUrl(rankIndex);
}
