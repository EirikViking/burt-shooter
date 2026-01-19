import { AssetManifest } from '../assets/assetManifest.js';
import * as PIXI from 'pixi.js';

class GameAssetsManager {
    constructor() {
        this.beerTexture = null;
        this.photos = {};
        this.photoList = AssetManifest.loreImages;
        this.shipTextures = {};
        this.enemyTextures = {};
        this.rankShipTextures = [];
        this.rankShipList = AssetManifest.sprites.playerRankShips || [];
    }

    async ensureBeerTexture() {
        // Alias for compatibility if needed, using the store variable
        if (this.isValidTexture(this.beerTexture)) return this.beerTexture;

        try {
            const tex = await PIXI.Assets.load({
                alias: 'beervan',
                src: AssetManifest.sprites.beervan
            });

            this.beerTexture = tex;

            console.log('[BEER][ASSET]', {
                isTexture: this.beerTexture instanceof PIXI.Texture,
                w: this.beerTexture?.width,
                h: this.beerTexture?.height,
                url: AssetManifest.sprites.beervan
            });

            return this.beerTexture;
        } catch (e) {
            console.error('[GameAssets] Failed to load beer asset:', e);
            return null;
        }
    }

    // Backwards compatibility if other files call loadBeer
    async loadBeer() {
        return this.ensureBeerTexture();
    }

    async loadPhotos() {
        const promises = this.photoList.map(async (filename) => {

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
                    this.photos[alias] = texture;
                }
            } catch (e) {
                console.warn(`[GameAssets] Failed to load photo ${filename}:`, e);
            }
        });

        await Promise.all(promises);
        console.log('[GameAssets] Photos loaded:', Object.keys(this.photos));
    }

    getBeerTexture() {
        return this.beerTexture;
    }

    // Alias
    getBeer() {
        return this.getBeerTexture();
    }

    getPhoto(alias) {
        return this.photos[alias];
    }

    isValidTexture(tex) {
        return !!(tex && tex.width > 0 && tex.height > 0);
    }

    async loadShips() {
        // Load Rank Player Ships
        const rankShips = this.rankShipList;
        await Promise.all(rankShips.map(async (filename, index) => {
            const parts = filename.split('/');
            const alias = `rank_ship_${index}_${parts[parts.length - 1].split('.')[0]}`;
            try {
                const texture = await PIXI.Assets.load({
                    alias: alias,
                    src: filename
                });
                if (this.isValidTexture(texture)) this.rankShipTextures[index] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load rank ship ${filename}:`, e);
            }
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

        console.log('[GameAssets] Ships loaded. Player:', Object.keys(this.shipTextures).length, 'Enemy:', Object.keys(this.enemyTextures).length);

        // Load Xtra Assets
        await this.loadXtraAssets();
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

    getRankShipCount() {
        return this.rankShipList.length;
    }

    getRankShipPath(index) {
        return this.rankShipList[index] || null;
    }

    async loadXtraAssets() {
        this.xtra = { ships: {}, enemies: {}, lasers: {}, damage: {}, parts: {}, effects: {}, powerups: {} };

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

        // PART B: Loading Powerups - All types
        const powerupPromises = [];
        // Life powerup - red heart
        powerupPromises.push(this.loadSingleAsset(
            'xtra_powerup_life',
            '/sprites/xtra-sprites/UI/playerLife1_red.png',
            this.xtra.powerups
        ));
        // Shield powerup - blue shield
        powerupPromises.push(this.loadSingleAsset(
            'xtra_powerup_shield',
            '/sprites/xtra-sprites/Power-ups/powerupBlue_shield.png',
            this.xtra.powerups
        ));
        // Ghost powerup - star (ethereal)
        powerupPromises.push(this.loadSingleAsset(
            'xtra_powerup_ghost',
            '/sprites/xtra-sprites/Power-ups/powerupGreen_star.png',
            this.xtra.powerups
        ));
        // Slow time powerup - bolt (speed related)
        powerupPromises.push(this.loadSingleAsset(
            'xtra_powerup_slow_time',
            '/sprites/xtra-sprites/Power-ups/powerupYellow_bolt.png',
            this.xtra.powerups
        ));
        // Isbjorn powerup - yellow pill
        powerupPromises.push(this.loadSingleAsset(
            'xtra_powerup_isbjorn',
            '/sprites/xtra-sprites/Power-ups/pill_yellow.png',
            this.xtra.powerups
        ));
        // Kjottdeig powerup - red pill
        powerupPromises.push(this.loadSingleAsset(
            'xtra_powerup_kjottdeig',
            '/sprites/xtra-sprites/Power-ups/pill_red.png',
            this.xtra.powerups
        ));
        // Rolp powerup - green pill
        powerupPromises.push(this.loadSingleAsset(
            'xtra_powerup_rolp',
            '/sprites/xtra-sprites/Power-ups/pill_green.png',
            this.xtra.powerups
        ));
        // Deili powerup - blue pill
        powerupPromises.push(this.loadSingleAsset(
            'xtra_powerup_deili',
            '/sprites/xtra-sprites/Power-ups/pill_blue.png',
            this.xtra.powerups
        ));

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
}

export const GameAssets = new GameAssetsManager();
