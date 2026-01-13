import * as PIXI from 'pixi.js';

class BeerAssetManager {
    constructor() {
        this.alias = 'beervan';
        this.url = '/beervan.png';
        this._texture = null;
        this._loadPromise = null;
    }

    // Idempotent load method
    async ensureLoaded() {
        // Return existing texture if valid
        if (this._texture) return this._texture;

        // Return existing promise if loading in progress
        if (this._loadPromise) return this._loadPromise;

        // Start loading
        console.log('[BeerAsset] Starting load...');
        this._loadPromise = (async () => {
            try {
                const texture = await PIXI.Assets.load({
                    alias: this.alias,
                    src: this.url
                });

                if (!texture) throw new Error('Loaded texture is null');

                this._texture = texture;
                console.log('[BeerAsset] Load complete', texture.label);
                return texture;
            } catch (e) {
                console.error('[BeerAsset] Load failed', e);
                this._loadPromise = null; // Reset promise on failure to allow retry
                throw e;
            }
        })();

        return this._loadPromise;
    }

    getTexture() {
        if (!this._texture) {
            console.warn('[BeerAsset] getTexture called before load complete. Returning EMPTY.');
            return PIXI.Texture.EMPTY;
        }
        return this._texture;
    }
}

export const BeerAsset = new BeerAssetManager();
