import { AssetManifest } from '../assets/assetManifest.js';
import { GENERATED_ENEMY_LEGACY_ASSET_COUNT } from '../config/GeneratedEnemyProfiles.js';
import { getNovaPerformanceFlags } from '../config/PerformanceFlags.js';
import * as PIXI from 'pixi.js';

class GameAssetsManager {
    constructor() {
        this.bonusCoreTexture = null;
        this.plasmaBloomTexture = null;
        this.plasmaBloomTextures = [];
        this.microSignalTextures = {};
        this.tacticalDraftFieldTexture = null;
        this.gameOverFinalTransmissionTexture = null;
        this.gameOverFinalTransmissionTextures = {};
        this.gameOverFinalSignalTexture = null;
        this.gameOverFinalSignalTextures = {};
        this.cabinetWonderTextures = {};
        this.commsPortraits = {};
        this.fallbackCommsPortraitList = AssetManifest.loreImages;
        this.crewPortraitList = AssetManifest.generated?.crewPortraits || [];
        this.shipTextures = {};
        this.enemyTextures = {};
        this.generatedEnemyTextures = [];
        this.eliteMiddleShipTextures = [];
        this.enemyWeaponTextures = [];
        this.projectileTextures = {};
        this.rankShipTextures = [];
        this.rankShipList = AssetManifest.sprites.playerRankShips || [];
        this.xtra = this.createXtraStore();
    }

    createXtraStore(existing = {}) {
        return {
            ships: existing.ships || {},
            enemies: existing.enemies || {},
            lasers: existing.lasers || {},
            damage: existing.damage || {},
            parts: existing.parts || {},
            effects: existing.effects || {},
            powerups: existing.powerups || {}
        };
    }

    async ensureBonusCoreTexture() {
        if (this.isValidTexture(this.bonusCoreTexture)) return this.bonusCoreTexture;

        try {
            const tex = await PIXI.Assets.load({
                alias: 'bonus_core',
                src: AssetManifest.sprites.bonusCore
            });

            this.bonusCoreTexture = tex;

            console.log('[BONUS][ASSET]', {
                isTexture: this.bonusCoreTexture instanceof PIXI.Texture,
                w: this.bonusCoreTexture?.width,
                h: this.bonusCoreTexture?.height,
                url: AssetManifest.sprites.bonusCore
            });

            return this.bonusCoreTexture;
        } catch (e) {
            console.error('[GameAssets] Failed to load bonus core asset:', e);
            return null;
        }
    }

    async ensureBonusCoreTextureLoaded() {
        return this.ensureBonusCoreTexture();
    }

    async ensurePlasmaBloomTexture() {
        await this.ensurePlasmaBloomTextures();
        return this.plasmaBloomTexture;
    }

    async ensurePlasmaBloomTextures() {
        const sources = AssetManifest.generated?.vfx?.plasmaBlooms || [AssetManifest.generated?.vfx?.plasmaBloom];
        const loaded = await Promise.all(sources.filter(Boolean).map(async (src, index) => {
            if (this.isValidTexture(this.plasmaBloomTextures[index])) return this.plasmaBloomTextures[index];
            try {
                return await PIXI.Assets.load({
                    alias: index === 0 ? 'nova_plasma_bloom' : `nova_plasma_bloom_${index + 1}`,
                    src
                });
            } catch (error) {
                console.warn(`[GameAssets] Plasma bloom texture ${index + 1} unavailable:`, error?.message || error);
                return null;
            }
        }));
        this.plasmaBloomTextures = loaded.filter((texture) => this.isValidTexture(texture));
        this.plasmaBloomTexture = this.plasmaBloomTextures[0] || null;
        return this.plasmaBloomTextures;
    }

    getMicroSignalSources() {
        return {
            phase: AssetManifest.generated?.vfx?.microPhaseSigil,
            direction: AssetManifest.generated?.vfx?.microDirectionBeacon,
            combo: AssetManifest.generated?.vfx?.microComboCrest,
            contact: AssetManifest.generated?.vfx?.microContactRune,
            ace: AssetManifest.generated?.vfx?.microAceCommandCrest,
            waveClear: AssetManifest.generated?.vfx?.waveClearVictoryFlourish,
            mission: AssetManifest.generated?.vfx?.missionCommandSpine,
            combatSignal: AssetManifest.generated?.vfx?.combatSignalFlourish,
            hudCapsule: AssetManifest.generated?.vfx?.hudCommandCapsule,
            skillFlight: AssetManifest.generated?.vfx?.cabinetSkillFlightPlaque,
            overrunDais: AssetManifest.generated?.vfx?.overrunCoronationDais,
            droneConstellation: AssetManifest.generated?.vfx?.droneConstellationCrest
        };
    }

    async ensureMicroSignalTexture(key) {
        if (this.isValidTexture(this.microSignalTextures[key])) return this.microSignalTextures[key];
        const src = this.getMicroSignalSources()[key];
        if (!src) return null;
        try {
            const texture = await PIXI.Assets.load({
                alias: `nova_micro_signal_${key}`,
                src
            });
            if (this.isValidTexture(texture)) this.microSignalTextures[key] = texture;
            return this.microSignalTextures[key] || null;
        } catch (error) {
            console.warn(`[GameAssets] Micro-signal texture ${key} unavailable:`, error?.message || error);
            return null;
        }
    }

    async ensureMicroSignalTextures() {
        const entries = await Promise.all(Object.keys(this.getMicroSignalSources()).map(async (key) => [
            key,
            await this.ensureMicroSignalTexture(key)
        ]));
        for (const [key, texture] of entries) {
            if (this.isValidTexture(texture)) this.microSignalTextures[key] = texture;
        }
        return this.microSignalTextures;
    }

    async ensureTacticalDraftFieldTexture() {
        if (this.isValidTexture(this.tacticalDraftFieldTexture)) return this.tacticalDraftFieldTexture;
        try {
            const texture = await PIXI.Assets.load({
                alias: 'nova_tactical_draft_command_field',
                src: AssetManifest.generated?.tacticalDraftField
            });
            if (this.isValidTexture(texture)) this.tacticalDraftFieldTexture = texture;
        } catch (error) {
            console.warn('[GameAssets] Tactical Draft command field unavailable:', error?.message || error);
        }
        return this.tacticalDraftFieldTexture;
    }

    resolveGameOverFinalTransmissionVariant(variantOrId) {
        const variants = AssetManifest.generated?.gameOverFinalTransmissions || [];
        if (variantOrId?.id && variantOrId?.src) return variantOrId;
        const id = String(variantOrId || '');
        return variants.find((variant) => variant.id === id) || variants[0] || {
            id: 'final_transmission_01',
            src: AssetManifest.generated?.gameOverFinalTransmission
        };
    }

    async ensureGameOverFinalTransmissionTexture(variantOrId) {
        const variant = this.resolveGameOverFinalTransmissionVariant(variantOrId);
        if (this.isValidTexture(this.gameOverFinalTransmissionTextures[variant.id])) {
            return this.gameOverFinalTransmissionTextures[variant.id];
        }
        try {
            const texture = await PIXI.Assets.load({
                alias: `nova_game_over_${variant.id}`,
                src: variant.src
            });
            if (this.isValidTexture(texture)) {
                Object.keys(this.gameOverFinalTransmissionTextures).forEach((cachedId) => {
                    if (cachedId === variant.id) return;
                    delete this.gameOverFinalTransmissionTextures[cachedId];
                    try {
                        Promise.resolve(PIXI.Assets.unload(`nova_game_over_${cachedId}`)).catch(() => {});
                    } catch {
                        // The new current texture remains usable if an old cache entry cannot unload.
                    }
                });
                this.gameOverFinalTransmissionTextures[variant.id] = texture;
                this.gameOverFinalTransmissionTexture = texture;
            }
        } catch (error) {
            console.warn(`[GameAssets] Game Over final-transmission plate ${variant.id} unavailable:`, error?.message || error);
        }
        return this.gameOverFinalTransmissionTextures[variant.id] || null;
    }

    async ensureGameOverFinalSignalTexture(variantOrId) {
        const variant = this.resolveGameOverFinalTransmissionVariant(variantOrId);
        if (!variant.signalSrc) return null;
        if (this.isValidTexture(this.gameOverFinalSignalTextures[variant.id])) {
            return this.gameOverFinalSignalTextures[variant.id];
        }
        try {
            const texture = await PIXI.Assets.load({
                alias: `nova_game_over_signal_${variant.id}`,
                src: variant.signalSrc
            });
            if (this.isValidTexture(texture)) {
                Object.keys(this.gameOverFinalSignalTextures).forEach((cachedId) => {
                    if (cachedId === variant.id) return;
                    delete this.gameOverFinalSignalTextures[cachedId];
                    try {
                        Promise.resolve(PIXI.Assets.unload(`nova_game_over_signal_${cachedId}`)).catch(() => {});
                    } catch {
                        // The selected signal remains usable if an old cache entry cannot unload.
                    }
                });
                this.gameOverFinalSignalTextures[variant.id] = texture;
                this.gameOverFinalSignalTexture = texture;
            }
        } catch (error) {
            console.warn(`[GameAssets] Game Over final-signal ${variant.id} unavailable:`, error?.message || error);
        }
        return this.gameOverFinalSignalTextures[variant.id] || null;
    }

    async ensureCabinetWonderTexture(id) {
        const sources = AssetManifest.generated?.cabinetWonders || {};
        const key = String(id || '');
        if (!key || !sources[key]) return null;
        if (this.isValidTexture(this.cabinetWonderTextures[key])) return this.cabinetWonderTextures[key];
        try {
            const texture = await PIXI.Assets.load({ alias: `nova_cabinet_wonder_${key}`, src: sources[key] });
            if (this.isValidTexture(texture)) this.cabinetWonderTextures[key] = texture;
        } catch (error) {
            console.warn(`[GameAssets] Cabinet Wonder texture ${key} unavailable:`, error?.message || error);
        }
        return this.getCabinetWonderTexture(key);
    }

    async ensureCabinetWonderTextures(ids = []) {
        const sources = AssetManifest.generated?.cabinetWonders || {};
        const requestedIds = Array.isArray(ids) && ids.length ? ids : Object.keys(sources).slice(0, 1);
        await Promise.all(requestedIds.map((id) => this.ensureCabinetWonderTexture(id)));
        return this.cabinetWonderTextures;
    }

    async loadBonusCore() {
        return this.ensureBonusCoreTexture();
    }

    getCommsPortraitList() {
        if (!this.crewPortraitList.length) return this.fallbackCommsPortraitList;
        return this.crewPortraitList;
    }

    async loadCommsPortraits() {
        const portraitFiles = this.getCommsPortraitList();
        const keepAliases = new Set(portraitFiles.map((filename) => {
            const parts = filename.split('/');
            return parts[parts.length - 1].split('.')[0];
        }));
        for (const alias of Object.keys(this.commsPortraits)) {
            if (!keepAliases.has(alias)) delete this.commsPortraits[alias];
        }

        const promises = portraitFiles.map(async (filename) => {

            try {
                // filename is now full path in manifest, extract alias
                const parts = filename.split('/');
                const name = parts[parts.length - 1];
                const alias = name.split('.')[0];
                const texture = await PIXI.Assets.load({
                    alias: alias,
                    src: filename // Use full path from manifest
                });

                if (this.isValidTexture(texture)) {
                    this.commsPortraits[alias] = texture;
                }
            } catch (e) {
                console.warn(`[GameAssets] Failed to load comms portrait ${filename}:`, e);
            }
        });

        await Promise.all(promises);
        console.log('[GameAssets] Comms portraits loaded:', Object.keys(this.commsPortraits));
    }

    getBonusCoreTexture() {
        return this.bonusCoreTexture;
    }

    getPlasmaBloomTexture(variant = 0) {
        const textures = this.getPlasmaBloomTextures();
        if (!textures.length) return this.plasmaBloomTexture;
        const index = Math.abs(Math.floor(Number(variant) || 0)) % textures.length;
        return textures[index];
    }

    getPlasmaBloomTextures() {
        return this.plasmaBloomTextures.filter((texture) => this.isValidTexture(texture));
    }

    getMicroSignalTexture(key) {
        const texture = this.microSignalTextures[String(key || '')];
        return this.isValidTexture(texture) ? texture : null;
    }

    getTacticalDraftFieldTexture() {
        return this.tacticalDraftFieldTexture;
    }

    getGameOverFinalTransmissionTexture(variantOrId) {
        const variant = this.resolveGameOverFinalTransmissionVariant(variantOrId);
        return this.gameOverFinalTransmissionTextures[variant.id] || null;
    }

    getGameOverFinalSignalTexture(variantOrId) {
        const variant = this.resolveGameOverFinalTransmissionVariant(variantOrId);
        return this.gameOverFinalSignalTextures[variant.id] || null;
    }

    getCabinetWonderTexture(id) {
        const texture = this.cabinetWonderTextures[String(id || '')];
        return this.isValidTexture(texture) ? texture : null;
    }

    getBonusCoreSpriteTexture() {
        return this.getBonusCoreTexture();
    }

    getBonusCore() {
        return this.getBonusCoreTexture();
    }

    getCommsPortrait(alias) {
        return this.commsPortraits[alias];
    }

    isValidTexture(tex) {
        return !!(tex && tex.width > 0 && tex.height > 0);
    }

    async loadShips() {
        // Load Rank Player Ships
        const rankShips = this.rankShipList;
        await Promise.all(rankShips.map(async (filename, index) => {
            await this.ensureRankShipTexture(index);
        }));

        // Load Player Ships
        const playerShips = AssetManifest.sprites.ships;
        await Promise.all(playerShips.map(async (filename) => {
            const parts = filename.split('/');
            const name = parts[parts.length - 1];
            const alias = name.split('.')[0];
            try {
                const texture = await PIXI.Assets.load({
                    alias: alias,
                    src: filename
                });
                if (this.isValidTexture(texture)) this.shipTextures[alias] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load ship ${filename}:`, e);
            }
        }));

        // Load Enemy Ships (Core) - Wait, manifest structure for enemies is object.
        // But original code loaded 'spaceShips_00X.png' which are in manifest.sprites.ships? 
        // No, check manifest... ships: Array of spaceShips.
        // Wait, original code: enemyShips = Array.from({ length: 9 }, (_, i) => `spaceShips_00${i + 1}.png`);
        // My manifest: ships: ... spaceShips...
        // Ah, original 'playerShips' was just 'player_01.png'.

        // Let's look at original code:
        // playerShips = ['player_01.png'] -> loaded from /sprites/player/
        // enemyShips = spaceShips... -> loaded from /sprites/Ships/

        // My manifest:
        // sprites.player = '/sprites/player/player_01.png'
        // sprites.ships = ['/sprites/Ships/spaceShips...']

        // So I should load sprites.player separately.

        // Load Player
        try {
            const pPath = AssetManifest.sprites.player;
            const texture = await PIXI.Assets.load({ alias: 'player_01', src: pPath });
            if (this.isValidTexture(texture)) this.shipTextures['player_01'] = texture;
        } catch (e) { console.warn('Failed player load', e); }

        // Load Ships (used as enemies in original code?)
        const coreShips = AssetManifest.sprites.ships;
        await Promise.all(coreShips.map(async (filepath) => {
            const parts = filepath.split('/');
            const alias = parts[parts.length - 1].split('.')[0];
            try {
                const texture = await PIXI.Assets.load({
                    alias: alias,
                    src: filepath
                });
                if (this.isValidTexture(texture)) this.enemyTextures[alias] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load enemy ship ${filepath}:`, e);
            }
        }));

        const generatedEnemies = AssetManifest.generated?.enemies || [];
        const loadGeneratedEnemies = getNovaPerformanceFlags().disableNewEnemyRoster
            ? generatedEnemies.slice(0, GENERATED_ENEMY_LEGACY_ASSET_COUNT)
            : generatedEnemies;
        await Promise.all(loadGeneratedEnemies.map(async (filepath, index) => {
            try {
                const texture = await PIXI.Assets.load({
                    alias: `nova_generated_enemy_${index + 1}`,
                    src: filepath
                });
                if (this.isValidTexture(texture)) this.generatedEnemyTextures[index] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load generated enemy ${filepath}:`, e);
            }
        }));

        const generatedEnemyWeapons = AssetManifest.generated?.enemyWeapons || [];
        await Promise.all(generatedEnemyWeapons.map(async (filepath, index) => {
            try {
                const texture = await PIXI.Assets.load({
                    alias: `nova_enemy_weapon_${index + 1}`,
                    src: filepath
                });
                if (this.isValidTexture(texture)) this.enemyWeaponTextures[index] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load generated enemy weapon ${filepath}:`, e);
            }
        }));

        const projectileAssets = AssetManifest.generated?.projectiles || {};
        await Promise.all(Object.entries(projectileAssets).map(async ([name, filepath]) => {
            try {
                const texture = await PIXI.Assets.load({
                    alias: `nova_projectile_${name}`,
                    src: filepath
                });
                if (this.isValidTexture(texture)) this.projectileTextures[name] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load projectile asset ${filepath}:`, e);
            }
        }));

        const eliteMiddleShips = AssetManifest.generated?.eliteMiddleShips || [];
        await Promise.all(eliteMiddleShips.map(async (filepath, index) => {
            try {
                const texture = await PIXI.Assets.load({
                    alias: `nova_elite_middle_ship_${index + 1}`,
                    src: filepath
                });
                if (this.isValidTexture(texture)) this.eliteMiddleShipTextures[index] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load elite middle ship ${filepath}:`, e);
            }
        }));

        console.log('[GameAssets] Ships loaded. Player:', Object.keys(this.shipTextures).length, 'Enemy:', Object.keys(this.enemyTextures).length, 'GeneratedEnemy:', this.generatedEnemyTextures.filter(Boolean).length, 'EliteMiddle:', this.eliteMiddleShipTextures.filter(Boolean).length, 'EnemyWeapons:', this.enemyWeaponTextures.filter(Boolean).length, 'Projectiles:', Object.keys(this.projectileTextures).length);

        // Load Xtra Assets
        await this.loadXtraAssets();
    }

    async ensureRankShipTexture(index) {
        const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
        if (this.isValidTexture(this.rankShipTextures[safeIndex])) {
            return this.rankShipTextures[safeIndex];
        }

        const filename = this.rankShipList[safeIndex];
        if (!filename) return null;

        const parts = filename.split('/');
        const alias = `rank_ship_${safeIndex}_${parts[parts.length - 1].split('.')[0]}`;
        try {
            const texture = await PIXI.Assets.load({
                alias,
                src: filename
            });
            if (this.isValidTexture(texture)) {
                this.rankShipTextures[safeIndex] = texture;
                return texture;
            }
        } catch (e) {
            console.warn(`[GameAssets] Failed to load rank ship ${filename}:`, e);
        }

        return null;
    }

    getShipTexture(alias) {
        return this.shipTextures ? this.shipTextures[alias] : null;
    }

    getEnemyTexture(alias) {
        return this.enemyTextures ? this.enemyTextures[alias] : null;
    }

    getRankShipTexture(index) {
        return this.rankShipTextures ? this.rankShipTextures[index] : null;
    }

    getGeneratedEnemyTexture(index) {
        return this.generatedEnemyTextures ? this.generatedEnemyTextures[index] : null;
    }

    getEliteMiddleShipTexture(index) {
        return this.eliteMiddleShipTextures ? this.eliteMiddleShipTextures[index] : null;
    }

    getEnemyWeaponTexture(index) {
        return this.enemyWeaponTextures ? this.enemyWeaponTextures[index] : null;
    }

    getProjectileTexture(name) {
        return this.projectileTextures ? this.projectileTextures[name] : null;
    }

    getRankShipCount() {
        return this.rankShipList.length;
    }

    getRankShipPath(index) {
        return this.rankShipList[index] || null;
    }

    async loadXtraAssets() {
        this.xtra = this.createXtraStore(this.xtra);

        // Loading Xtra Player Ships (for rank progression)
        const shipPromises = [];
        const xtraShips = AssetManifest.sprites.xtraPlayerShips;
        if (xtraShips) {
            Object.keys(xtraShips).forEach(shipKey => {
                const shipColors = xtraShips[shipKey];
                Object.keys(shipColors).forEach(colorKey => {
                    const path = shipColors[colorKey];
                    // Create deterministic alias: xtra_ship_1_blue, xtra_ship_2_green, etc.
                    const shipNum = shipKey.replace('ship', '');
                    const alias = `xtra_ship_${shipNum}_${colorKey}`;
                    shipPromises.push(this.loadSingleAsset(alias, path, this.xtra.ships));
                });
            });
        }

        // Loading Enemies (Xtra)
        const enemyColors = ['Black', 'Blue', 'Green', 'Red'];
        const enemyPromises = [];
        enemyColors.forEach(c => {
            const list = AssetManifest.sprites.enemies[c];
            if (list) {
                list.forEach(path => {
                    const split = path.split('/');
                    const alias = `xtra_enemy_${split[split.length - 1].split('.')[0]}`;
                    enemyPromises.push(this.loadSingleAsset(alias, path, this.xtra.enemies));
                });
            }
        });

        // Loading Lasers
        const laserColors = ['Blue', 'Green', 'Red'];
        const laserPromises = [];
        laserColors.forEach(c => {
            const list = AssetManifest.sprites.lasers[c];
            if (list) {
                list.forEach(path => {
                    const split = path.split('/');
                    const alias = `xtra_laser_${split[split.length - 1].split('.')[0]}`;
                    laserPromises.push(this.loadSingleAsset(alias, path, this.xtra.lasers));
                });
            }
        });

        // Loading Damage
        const dmgPromises = [];
        // Manifest damage is object of arrays
        Object.keys(AssetManifest.sprites.damage).forEach(shipKey => {
            AssetManifest.sprites.damage[shipKey].forEach(path => {
                const split = path.split('/');
                const alias = `xtra_damage_${split[split.length - 1].split('.')[0]}`;
                dmgPromises.push(this.loadSingleAsset(alias, path, this.xtra.damage));
            });
        });

        // Loading Effects
        const fxPromises = [];
        AssetManifest.sprites.effects.forEach(path => {
            const split = path.split('/');
            const name = split[split.length - 1].split('.')[0];
            // Simple alias
            fxPromises.push(this.loadSingleAsset(`xtra_effect_${name}`, path, this.xtra.effects));
        });

        // Loading generated Nova Swarm powerup icons.
        const powerupPromises = [this.loadPowerupAssets()];

        await Promise.all([...shipPromises, ...enemyPromises, ...laserPromises, ...dmgPromises, ...fxPromises, ...powerupPromises]);
        console.log('[GameAssets] Xtra Assets Loaded (ships:', Object.keys(this.xtra.ships).length, 'powerups:', Object.keys(this.xtra.powerups).length, ')');
    }

    async loadSingleAsset(alias, src, targetObj) {
        try {
            const tex = await PIXI.Assets.load({ alias, src });
            if (this.isValidTexture(tex)) targetObj[alias] = tex;
        } catch (e) {
            // calculated risk: ignore missing optional assets
        }
    }

    async loadPowerupAssets() {
        this.xtra = this.createXtraStore(this.xtra);
        const generatedPowerups = AssetManifest.generated?.powerups || {};
        const powerupPromises = Object.entries(generatedPowerups).map(([name, src]) => {
            const alias = `xtra_powerup_${name}`;
            if (this.isValidTexture(this.xtra.powerups[alias])) return Promise.resolve(this.xtra.powerups[alias]);
            return this.loadSingleAsset(alias, src, this.xtra.powerups);
        });
        await Promise.all(powerupPromises);
        return this.xtra.powerups;
    }

    getXtraShip(type, color) {
        // type is 1-3, color is 'blue', 'green', 'orange', 'red'
        const alias = `xtra_ship_${type}_${color}`;
        return this.xtra?.ships[alias] || null;
    }
    getXtraDamage(shipType, level) {
        return this.xtra?.damage[`xtra_damage_playerShip${shipType}_damage${level}`];
    }
    getXtraEnemy(color, type) {
        return this.xtra?.enemies[`xtra_enemy_enemy${color}${type}`];
    }
    getXtraLaser(color, index) {
        const num = index.toString().padStart(2, '0');
        return this.xtra?.lasers[`xtra_laser_laser${color}${num}`];
    }
    getRandomPart() {
        if (!this.xtra?.parts) return null;
        const keys = Object.keys(this.xtra.parts);
        if (keys.length === 0) return null;
        return this.xtra.parts[keys[Math.floor(Math.random() * keys.length)]];
    }
    getXtraPowerup(name) {
        return this.xtra?.powerups[`xtra_powerup_${name}`];
    }

    getPowerupTexture(name) {
        return this.getXtraPowerup(name);
    }
}

export const GameAssets = new GameAssetsManager();
