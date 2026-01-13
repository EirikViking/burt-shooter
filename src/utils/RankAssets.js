import * as PIXI from 'pixi.js';

class RankAssetsManager {
    constructor() {
        this.basePath = '/sprites/ranks/PNG/Default size/Gold';
        this.textures = []; // Array of 78 textures or null
        this.loadingPromise = null;
    }

    async preloadAll() {
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            const manifests = [];
            for (let i = 0; i <= 77; i++) {
                const num = i.toString().padStart(3, '0');
                const alias = `rank${num}`;
                const src = `${this.basePath}/${alias}.png`;
                manifests.push({ alias, src });
            }

            // Load in bundles of 10 to avoid overwhelming network if not http2
            // Actually PIXI handles this well usually.
            const textures = [];

            // We can bundle correct?
            // Let's just do Promise.all. 78 small pngs is fine.
            // But let's verify existence.

            console.log('[RankAssets] Starting preload of 78 rank icons...');

            // We will load them simply
            await PIXI.Assets.load(manifests);

            // Populate local array
            for (let i = 0; i <= 77; i++) {
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
        if (index > 77) index = 77;
        // Try getting from cache if valid
        if (this.textures[index]) return this.textures[index];

        // Fallback: try getting directly from PIXI cache by alias
        const num = index.toString().padStart(3, '0');
        const alias = `rank${num}`;
        return PIXI.Assets.get(alias);
    }
}

export const RankAssets = new RankAssetsManager();
