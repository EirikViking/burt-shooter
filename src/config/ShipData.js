/**
 * Single source of truth for all ship data.
 * Unifies UI metadata (names, lore) and gameplay constants.
 */

export const ShipData = [
    {
        id: 'rank_ship_0',
        spriteKey: 'row2_ship_1.png',
        textureIndex: 0,
        name: 'NOVA SPARROW',
        description: 'Balanced starter craft with friendly twin lasers.',
        loreShort: 'starter',
        loreLong: 'The Nova Sparrow is the training cabinet favorite: compact, readable, and stubborn enough to survive a messy first wave. Its twin laser rig is tuned for players who want to learn enemy formations before chasing flashier loadouts.',
        stats: {
            speed: 5.5,
            fireRate: 112,
            damage: 1.4,
            bulletSpeed: 11.5
        },
        weapon: {
            bullets: 2,
            spread: 0.1,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_1',
        spriteKey: 'row2_ship_2.png',
        textureIndex: 1,
        name: 'COMET TWIN',
        description: 'Reliable double-shot ship with smooth handling.',
        loreShort: 'balanced',
        loreLong: 'The Comet Twin is built for calm pilots in loud situations. It trades raw punch for a forgiving firing rhythm, making it a strong choice when the swarm starts drawing shapes nobody asked for.',
        stats: {
            speed: 6,
            fireRate: 157.5,
            damage: 0.85,
            bulletSpeed: 10
        },
        weapon: {
            bullets: 2,
            spread: 0.14,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_2',
        spriteKey: 'row2_ship_3_clean.png',
        textureIndex: 2,
        name: 'PIXEL NEEDLE',
        description: 'Fast single-shot ship for confident dodgers.',
        loreShort: 'rapid',
        loreLong: 'The Pixel Needle was designed by someone who looked at a screen full of bullets and said, "I can fit through that." It rewards crisp movement, quick reactions, and the kind of confidence usually found near the last continue screen.',
        stats: {
            speed: 7.15,
            fireRate: 108.75,
            damage: 0.9,
            bulletSpeed: 12.1
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_3',
        spriteKey: 'row2_ship_5.png',
        textureIndex: 3,
        name: 'IRON ORBIT',
        description: 'Heavy shot profile with deliberate movement.',
        loreShort: 'heavy',
        loreLong: 'Iron Orbit does not hurry. It arrives, lines up the shot, and asks the enemy formation to reconsider its life choices. Slower fire and heavier damage make it a good fit for players who prefer precision over spray.',
        stats: {
            speed: 6.3,
            fireRate: 168,
            damage: 1.4,
            bulletSpeed: 9.9
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_heavy'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_4',
        spriteKey: 'ship_extract_1.png',
        textureIndex: 4,
        name: 'ARC STRIKER',
        description: 'Curved twin fire for formation cleanup.',
        loreShort: 'arc',
        loreLong: 'The Arc Striker believes straight lines are a suggestion. Its angled twin shots catch drifting enemies and make tidy work of formations that try to be clever near the edges of the screen.',
        stats: {
            speed: 6.3,
            fireRate: 150,
            damage: 1.2,
            bulletSpeed: 12
        },
        weapon: {
            bullets: 2,
            spread: 0.2,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_5',
        spriteKey: 'ship_extract_2.png',
        textureIndex: 5,
        name: 'GIGA LANCE',
        description: 'Massive single-shot damage, minimal grace.',
        loreShort: 'power',
        loreLong: 'Giga Lance is for pilots who want every shot to feel like a decision. It is not subtle, not delicate, and not especially polite, but when the beam lands the swarm tends to stop making jokes.',
        stats: {
            speed: 6.0,
            fireRate: 207,
            damage: 2.5,
            bulletSpeed: 12
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_heavy'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 13 }
    },
    {
        id: 'rank_ship_6',
        spriteKey: 'ship_extract_3.png',
        textureIndex: 6,
        name: 'QUASAR FAN',
        description: 'Triple-shot spread for crowd control.',
        loreShort: 'spread',
        loreLong: 'The Quasar Fan throws a bright net across the lane and lets the formation fly into its own bad planning. It is perfect for players who want coverage, rhythm, and a little extra forgiveness when the screen gets busy.',
        stats: {
            speed: 7.5,
            fireRate: 165,
            damage: 0.7,
            bulletSpeed: 11
        },
        weapon: {
            bullets: 3,
            spread: 0.22,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_7',
        spriteKey: 'ship_extract_5.png',
        textureIndex: 7,
        name: 'STEADY VECTOR',
        description: 'Consistent all-rounder with clean timing.',
        loreShort: 'steady',
        loreLong: 'The Steady Vector is the no-drama option in a game full of dramatic aliens. It fires when expected, moves where asked, and makes a strong case that reliability is a powerup of its own.',
        stats: {
            speed: 6,
            fireRate: 126,
            damage: 1,
            bulletSpeed: 10
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_8',
        spriteKey: 'ship_new.png',
        textureIndex: 8,
        name: 'AURORA PRIME',
        description: 'Classic hero ship with polished twin fire.',
        loreShort: 'classic',
        loreLong: 'Aurora Prime is the flagship you pick when the arcade cabinet starts humming like it knows something you do not. It is classic, bright, sturdy, and ready to turn one more impossible wave into one more excellent story.',
        stats: {
            speed: 6,
            fireRate: 142.5,
            damage: 0.95,
            bulletSpeed: 10
        },
        weapon: {
            bullets: 2,
            spread: 0.12,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    }
];
