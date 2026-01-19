import { ShipData } from '../config/ShipData.js';

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
    }
};

// Populate unified ships
ShipData.forEach(ship => {
    ShipRegistry[ship.id] = {
        id: ship.id,
        name: ship.name,
        textureIndex: ship.textureIndex,
        stats: { ...ship.stats },
        weapon: { ...ship.weapon },
        visuals: { ...ship.visuals },
        hitbox: { ...ship.hitbox }
    };
});

export const getDefaultShip = () => ShipRegistry.rank_ship_0;
