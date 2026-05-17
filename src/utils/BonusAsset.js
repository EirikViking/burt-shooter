import * as PIXI from 'pixi.js';
import { AssetManifest } from '../assets/assetManifest.js';

class BonusAssetManager {
    constructor() {
        this.alias = 'bonus_core';
        this.url = AssetManifest.sprites.bonusCore;
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
        console.log('[BonusAsset] Starting load...');
        this._loadPromise = (async () => {
            try {
                const texture = await PIXI.Assets.load({
                    alias: this.alias,
                    src: this.url
                });

                if (!texture) throw new Error('Loaded texture is null');

                this._texture = texture;
                console.log('[BonusAsset] Load complete', texture.label);
                return texture;
            } catch (e) {
                console.error('[BonusAsset] Load failed', e);
                this._loadPromise = null; // Reset promise on failure to allow retry
                throw e;
            }
        })();

        return this._loadPromise;
    }

    getTexture() {
        if (!this._texture) {
            console.warn('[BonusAsset] getTexture called before load complete. Returning EMPTY.');
            return PIXI.Texture.EMPTY;
        }
        return this._texture;
    }
}

export const BonusAsset = new BonusAssetManager();
