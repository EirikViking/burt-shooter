export const ShipRegistry = {
    player_01: {
        id: 'player_01',
        name: 'Burt One',
        texture: 'player_01',
        stats: {
            speed: 6,
            bulletSpeed: 10,
            damage: 1,
            fireRate: 150 // ms delay
        },
        visuals: {
            scale: 0.15,
            idleAmplitude: 2,
            idleSpeed: 0.05,
            tiltMax: 0.2,
            tiltSpeed: 0.1
        },
        hitbox: {
            radius: 12
        }
    },
    // Rank ships (playerRankShips from assetManifest)
    rank_ship_0: {
        id: 'rank_ship_0',
        name: 'Stokmarknes Skuta',
        textureIndex: 0,
        stats: { speed: 5.5, bulletSpeed: 10, damage: 1, fireRate: 160 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    rank_ship_1: {
        id: 'rank_ship_1',
        name: 'Isbjørn Classic',
        textureIndex: 1,
        stats: { speed: 6, bulletSpeed: 10, damage: 1, fireRate: 150 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    rank_ship_2: {
        id: 'rank_ship_2',
        name: 'Tufsingen',
        textureIndex: 2,
        stats: { speed: 6.5, bulletSpeed: 11, damage: 1, fireRate: 145 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    rank_ship_3: {
        id: 'rank_ship_3',
        name: 'Deili Fetta',
        textureIndex: 3,
        stats: { speed: 7, bulletSpeed: 11, damage: 1, fireRate: 140 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    rank_ship_4: {
        id: 'rank_ship_4',
        name: 'Roland Turbo',
        textureIndex: 4,
        stats: { speed: 6, bulletSpeed: 12, damage: 1, fireRate: 150 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    rank_ship_5: {
        id: 'rank_ship_5',
        name: 'Giga Gris',
        textureIndex: 5,
        stats: { speed: 5, bulletSpeed: 10, damage: 2, fireRate: 180 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 13 }
    },
    rank_ship_6: {
        id: 'rank_ship_6',
        name: 'Melbu Express',
        textureIndex: 6,
        stats: { speed: 7.5, bulletSpeed: 11, damage: 1, fireRate: 150 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    rank_ship_7: {
        id: 'rank_ship_7',
        name: 'Kjøttdeig Special',
        textureIndex: 7,
        stats: { speed: 6, bulletSpeed: 10, damage: 1, fireRate: 140 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    rank_ship_8: {
        id: 'rank_ship_8',
        name: 'Burt Prototype',
        textureIndex: 8,
        stats: { speed: 6, bulletSpeed: 10, damage: 1, fireRate: 150 },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    }
};

export const getDefaultShip = () => ShipRegistry.rank_ship_0;
