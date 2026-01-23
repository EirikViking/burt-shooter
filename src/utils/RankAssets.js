import * as PIXI from 'pixi.js';
import { AssetManifest } from '../assets/assetManifest.js';

const NUM_RANKS = 20;
const MAX_RANK_INDEX = 19;
const BUNDLE_NAME = 'rank_badges';

class RankAssetsManager {
    constructor() {
        this.cache = new Map();
        this.inflight = new Map();
        this.failedIcons = new Set();
        this.warned = new Set();
        this.bundleRegistered = false;
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

    ensureBundleRegistered() {
        if (this.bundleRegistered) return;
        const manifestList = AssetManifest.sprites.ranks || [];
        const bundle = {};
        manifestList.forEach((src, idx) => {
            if (typeof src === 'string' && src.length > 0) {
                bundle[this.rankAlias(idx)] = src;
            }
        });
        if (Object.keys(bundle).length > 0) {
            PIXI.Assets.addBundle(BUNDLE_NAME, bundle);
        }
        this.bundleRegistered = true;
    }

    async loadRankTexture(idx) {
        const clamped = this.clampIndex(idx);
        const alias = this.rankAlias(clamped);
        const src = this.rankSrc(clamped);

        if (!src) {
            this.noteFailure(alias, src, 'manifest missing');
            return null;
        }

        if (this.cache.has(alias)) {
            return this.cache.get(alias);
        }

        if (this.failedIcons.has(alias)) return null;

        if (this.inflight.has(alias)) {
            return await this.inflight.get(alias);
        }

        this.ensureBundleRegistered();

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

    getRankTexture(idx) {
        const clamped = this.clampIndex(idx);
        const alias = this.rankAlias(clamped);
        return this.cache.get(alias) || null;
    }

    getRankAlias(idx) {
        return this.rankAlias(this.clampIndex(idx));
    }

    getRankPath(idx) {
        return this.rankSrc(this.clampIndex(idx));
    }

    getRankTextureFallback() {
        return null;
    }

    async preloadAll() {
        this.ensureBundleRegistered();
        try {
            const bundle = await PIXI.Assets.loadBundle(BUNDLE_NAME);
            if (bundle && typeof bundle === 'object') {
                Object.entries(bundle).forEach(([alias, texture]) => {
                    if (this.isValidTexture(texture)) {
                        this.cache.set(alias, texture);
                    }
                });
            }
            if (this.cache.size > 0) {
                return bundle || null;
            }
        } catch (error) {
            console.warn('[RankAssets] preloadAll failed:', error?.message || error);
        }

        const manifestList = AssetManifest.sprites.ranks || [];
        const entries = manifestList
            .map((src, idx) => ({ alias: this.rankAlias(idx), src }))
            .filter(entry => typeof entry.src === 'string' && entry.src.length > 0);

        if (entries.length === 0) {
            return null;
        }

        const textures = await Promise.all(
            entries.map(entry => PIXI.Assets.load(entry).catch(() => null))
        );

        textures.forEach((texture, index) => {
            const alias = entries[index]?.alias;
            if (alias && this.isValidTexture(texture)) {
                this.cache.set(alias, texture);
            }
        });

        return this.cache.size > 0 ? textures : null;
    }
}

export const RankAssets = new RankAssetsManager();
