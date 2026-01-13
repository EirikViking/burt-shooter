import * as PIXI from 'pixi.js';

class GameAssetsManager {
    constructor() {
        this.beerTexture = null;
        this.photos = {};
        this.photoList = [
            'anja.png',
            'donaldtru.jpg',
            'eirik1.jpg',
            'burtelurt.jpg',
            'eirik_kurt2.jpg',
            'kurt2.jpg',
            'eriikviking.webp'
        ];
        this.shipTextures = {};
        this.enemyTextures = {};
    }

    async ensureBeerTexture() {
        // Alias for compatibility if needed, using the store variable
        if (this.isValidTexture(this.beerTexture)) return this.beerTexture;

        try {
            const tex = await PIXI.Assets.load({
                alias: 'beervan',
                src: '/beervan.png'
            });

            this.beerTexture = tex;

            console.log('[BEER][ASSET]', {
                isTexture: this.beerTexture instanceof PIXI.Texture,
                w: this.beerTexture?.width,
                h: this.beerTexture?.height,
                url: '/beervan.png'
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
                const alias = filename.split('.')[0];
                const texture = await PIXI.Assets.load({
                    alias: alias,
                    src: `/${filename}`
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
        const playerShips = ['player_01.png'];
        const enemyShips = Array.from({ length: 9 }, (_, i) => `spaceShips_00${i + 1}.png`);

        // this.shipTextures and this.enemyTextures are initialized in constructor
        // We ensure they are objects here just in case
        this.shipTextures = this.shipTextures || {};
        this.enemyTextures = this.enemyTextures || {};

        // Load Player Ships
        await Promise.all(playerShips.map(async (filename) => {
            const alias = filename.split('.')[0];
            try {
                const texture = await PIXI.Assets.load({
                    alias: alias,
                    src: `/sprites/player/${filename}`
                });
                if (this.isValidTexture(texture)) this.shipTextures[alias] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load ship ${filename}:`, e);
            }
        }));

        // Load Enemy Ships
        await Promise.all(enemyShips.map(async (filename) => {
            const alias = filename.split('.')[0];
            try {
                const texture = await PIXI.Assets.load({
                    alias: alias,
                    src: `/sprites/Ships/${filename}`
                });
                if (this.isValidTexture(texture)) this.enemyTextures[alias] = texture;
            } catch (e) {
                console.warn(`[GameAssets] Failed to load enemy ship ${filename}:`, e);
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

    async loadXtraAssets() {
        this.xtra = { ships: {}, enemies: {}, lasers: {}, damage: {}, parts: {}, effects: {}, powerups: {} };
        const basePath = '/sprites/xtra-sprites';

        // 1. Player Ships: playerShip{1-3}_{blue,green,orange,red}
        const shipTypes = [1, 2, 3];
        const shipColors = ['blue', 'green', 'orange', 'red'];
        const shipPromises = [];
        shipTypes.forEach(t => {
            shipColors.forEach(c => {
                const name = `playerShip${t}_${c}`;
                shipPromises.push(this.loadSingleAsset(`xtra_ship_${name}`, `${basePath}/${name}.png`, this.xtra.ships));
            });
            // Damage: playerShip{t}_damage{1-3}
            [1, 2, 3].forEach(d => {
                const dName = `playerShip${t}_damage${d}`;
                shipPromises.push(this.loadSingleAsset(`xtra_damage_${dName}`, `${basePath}/Damage/${dName}.png`, this.xtra.damage));
            });
        });

        // 2. Enemies: enemy{Color}{1-5}
        const enemyColors = ['Black', 'Blue', 'Green', 'Red'];
        const enemyPromises = [];
        enemyColors.forEach(c => {
            for (let i = 1; i <= 5; i++) {
                const name = `enemy${c}${i}`;
                enemyPromises.push(this.loadSingleAsset(`xtra_enemy_${name}`, `${basePath}/Enemies/${name}.png`, this.xtra.enemies));
            }
        });

        // 3. Lasers: laser{Color}{01-16}
        const laserColors = ['Blue', 'Green', 'Red'];
        const laserPromises = [];
        laserColors.forEach(c => {
            for (let i = 1; i <= 16; i++) {
                const num = i.toString().padStart(2, '0');
                const name = `laser${c}${num}`;
                laserPromises.push(this.loadSingleAsset(`xtra_laser_${name}`, `${basePath}/Lasers/${name}.png`, this.xtra.lasers));
            }
        });

        // 4. Parts (Safe Selection)
        const partPromises = [];
        ['engine1', 'engine2', 'gun01', 'gun02', 'wingRed1'].forEach(p => {
            partPromises.push(this.loadSingleAsset(`xtra_part_${p}`, `${basePath}/Parts/${p}.png`, this.xtra.parts));
        });

        // 5. Meteors (Safe Selection)
        const meteorPromises = [];
        ['meteorBrown_med1', 'meteorGrey_med1', 'meteorBrown_small1', 'meteorGrey_small1'].forEach(m => {
            meteorPromises.push(this.loadSingleAsset(`xtra_meteor_${m}`, `${basePath}/Meteors/${m}.png`, this.xtra.parts)); // Store in parts for debris
        });

        // 6. Powerups
        const powerupPromises = [];
        ['powerupBlue_shield', 'powerupRed_shield', 'powerupGreen_shield', 'powerupYellow_shield'].forEach(p => {
            powerupPromises.push(this.loadSingleAsset(`xtra_powerup_${p}`, `${basePath}/Power-ups/${p}.png`, this.xtra.powerups));
        });
        ['pill_red', 'pill_green', 'pill_blue', 'pill_yellow'].forEach(p => {
            powerupPromises.push(this.loadSingleAsset(`xtra_powerup_${p}`, `${basePath}/Power-ups/${p}.png`, this.xtra.powerups));
        });

        await Promise.all([...shipPromises, ...enemyPromises, ...laserPromises, ...partPromises, ...meteorPromises, ...powerupPromises]);
        console.log('[GameAssets] Xtra Assets Loaded');
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
        return this.xtra?.ships[`xtra_ship_playerShip${type}_${color}`];
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
