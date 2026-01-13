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
            scale: 0.15, // Adjust based on actual sprite size (assuming it's large)
            idleAmplitude: 2, // px
            idleSpeed: 0.05,
            tiltMax: 0.2, // radians
            tiltSpeed: 0.1
        },
        hitbox: {
            radius: 12 // pixel radius for collision
        }
    }
};

export const getDefaultShip = () => ShipRegistry.player_01;
