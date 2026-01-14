import { NUM_RANKS, MAX_RANK_INDEX } from '../shared/RankPolicy.js';
import * as PIXI from 'pixi.js';

class RankAssetsManager {
    constructor() {
        this.basePath = '/sprites/ranks/PNG/Default size/Gold';
        this.textures = []; // Array of 20 textures (0-19)
        this.loadingPromise = null;
    }

    async preloadAll() {
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            const manifests = [];
            for (let i = 0; i < NUM_RANKS; i++) {
                const num = i.toString().padStart(3, '0');
                const alias = `rank${num}`;
                const src = `${this.basePath}/${alias}.png`;
                manifests.push({ alias, src });
            }

            // Load in bundles of 10 to avoid overwhelming network if not http2
            // Actually PIXI handles this well usually.
            const textures = [];

            // We can bundle correct?
            // Let's just do Promise.all. 20 small pngs is fine.
            // But let's verify existence.

            console.log(`[RankAssets] Starting preload of ${NUM_RANKS} rank icons...`);

            // We will load them simply
            await PIXI.Assets.load(manifests);

            // Populate local array
            for (let i = 0; i < NUM_RANKS; i++) {
                const num = i.toString().padStart(3, '0');
                const alias = `rank${num}`;
                this.textures[i] = PIXI.Assets.get(alias);
            }

            console.log('[RankAssets] Loaded all ranks.');
            return this.textures;
        })();

        return this.loadingPromise;
    }

    getRankTexture(index) {
        if (index < 0) index = 0;
        if (index > MAX_RANK_INDEX) index = MAX_RANK_INDEX;

        // Try getting from cache if valid
        if (this.textures[index]) return this.textures[index];

        // Fallback: try getting directly from PIXI cache by alias
        const num = index.toString().padStart(3, '0');
        const alias = `rank${num}`;

        try {
            const cached = PIXI.Assets.get(alias);
            if (cached) return cached;
        } catch (e) {
            // Assets.get failed, use Texture.from
        }

        // Final fallback: Texture.from with direct path
        const path = `${this.basePath}/rank${num}.png`;
        return PIXI.Texture.from(path);
    }
}

export const RankAssets = new RankAssetsManager();
