/**
 * Single source of truth for playable ship data.
 *
 * The public roster uses 25 original generated Nova Swarm ship sprites plus
 * five late-game Ascendant hulls. Phase Seraph and Eirik the Viking have dedicated
 * final art while the first three Ascendant hulls retain explicit safe fallbacks. Only the
 * first craft is available on a fresh profile; the rest unlock through
 * level progress so ship choice becomes part of long-term mastery.
 */

const LEGACY_PLAYER_SHIP_KEYS = [
    'row2_ship_1.png',
    'row2_ship_2.png',
    'row2_ship_3_clean.png',
    'row2_ship_5.png',
    'ship_extract_1.png',
    'ship_extract_2.png',
    'ship_extract_3.png',
    'ship_extract_5.png',
    'ship_new.png'
];

const SHIP_BLUEPRINTS = [
    ['Nova Sparrow', 'ion', 'Balanced starter craft with friendly twin lasers.', 'starter', 1, 5.75, 122, 1.05, 11.2, 2, 0.1, 12],
    ['Comet Courier', 'signal', 'Quick courier frame with fast reload discipline.', 'courier', 2, 6.15, 112, 0.95, 11.8, 2, 0.12, 11],
    ['Pixel Needle', 'vector', 'Needle-nosed interceptor for precise dodgers.', 'needle', 3, 6.85, 128, 1.1, 12.7, 1, 0, 10],
    ['Mint Skater', 'mint', 'Ultra-light hull that wins by never being where expected.', 'skater', 4, 7.25, 134, 0.92, 12.2, 2, 0.14, 10],
    ['Crimson Bite', 'crimson', 'Short-range bruiser with mean close-lane damage.', 'biter', 5, 6.25, 132, 1.28, 10.9, 2, 0.16, 13],
    ['Iron Orbit', 'obsidian', 'Heavy frame with calm steering and hard bolts.', 'heavy', 7, 5.55, 154, 1.55, 10.4, 1, 0, 14],
    ['Quasar Fan', 'magenta', 'Triple-lane crowd cleaner for messy formations.', 'fan', 9, 6.45, 156, 0.82, 11.1, 3, 0.23, 12],
    ['Glacier Scope', 'glacier', 'Cold precision platform with fast straight projectiles.', 'scope', 11, 5.95, 144, 1.22, 13.2, 1, 0, 11],
    ['Arc Striker', 'arcade', 'Wide arcade spray that punishes smug swarm lanes.', 'arc', 14, 6.7, 142, 0.92, 11.6, 3, 0.27, 12],
    ['Solar Hammer', 'solar', 'Slower trigger, heavier shots, very satisfying hits.', 'hammer', 17, 5.85, 168, 1.75, 11.5, 1, 0, 13],
    ['Circuit Tap', 'circuit', 'Rhythm ship with rapid weak taps and bonus shot tricks.', 'rhythm', 20, 6.3, 100, 0.78, 11.7, 2, 0.13, 12],
    ['Violet Feint', 'violet', 'Small collision core and slippery movement.', 'feint', 23, 7.15, 138, 0.98, 12.4, 2, 0.09, 10],
    ['Auric Core', 'auric', 'Premium damage profile with deliberate timing.', 'premium', 26, 6.0, 170, 1.8, 11.2, 2, 0.08, 13],
    ['Plasma Skate', 'plasma', 'Fast strafe rig with angled pressure shots.', 'plasma', 29, 7.3, 132, 1.0, 12.3, 2, 0.2, 11],
    ['Ruby Spike', 'ruby', 'Big risk hull that cashes in huge spikes.', 'spike', 32, 5.75, 184, 2.1, 10.8, 1, 0, 14],
    ['Spectral Slip', 'spectral', 'Ghost-thin dodger made for near-miss hunters.', 'spectral', 35, 7.45, 148, 0.94, 12.9, 2, 0.08, 10],
    ['Cobalt Guard', 'cobalt', 'Stable armored craft with tight firing lines.', 'guard', 38, 5.7, 148, 1.62, 11.5, 2, 0.04, 14],
    ['Ember Burst', 'ember', 'Hot trigger ship built for combo pressure.', 'ember', 41, 6.45, 96, 0.86, 11.4, 2, 0.16, 12],
    ['Neon Stutter', 'neon', 'Very fast fire and a tiny per-shot bite.', 'stutter', 44, 6.9, 90, 0.72, 12.1, 3, 0.17, 11],
    ['Quartz Needle', 'quartz', 'Tiny hitbox, strict reload, beautiful threading.', 'quartz', 47, 6.35, 166, 1.32, 13.4, 1, 0, 10],
    ['Chrome Rail', 'chrome', 'High-speed rail rounds for pattern readers.', 'rail', 50, 6.1, 164, 1.52, 13.9, 1, 0, 11],
    ['Verdant Flow', 'verdant', 'Smooth all-round craft with forgiving rhythm.', 'flow', 53, 7.0, 122, 1.0, 11.7, 2, 0.13, 11],
    ['Hazard Ram', 'hazard', 'Dangerous burst hull with a broad body.', 'hazard', 56, 5.9, 150, 1.88, 11.2, 2, 0.19, 15],
    ['Nova Overdrive', 'nova', 'Aggressive late-roster all-round pressure machine.', 'overdrive', 58, 7.1, 112, 1.3, 12.6, 3, 0.16, 12],
    ['Arcade Legend', 'arcade', 'Final cabinet hero craft with absurd confidence.', 'legend', 60, 7.25, 108, 1.45, 13.0, 3, 0.22, 12],
    ['Aegis Comet', 'aegis', 'Survive the sector wall. Shield-style recovery and mistake forgiveness at the cost of speed.', 'aegis-comet', 30, 5.9, 108, 1.62, 12.4, 3, 0.13, 12, {
        textureIndex: 20,
        tier: 'ascendant',
        powerClass: 'late_game',
        powerRating: 1.1,
        intendedSectorBand: '30-34',
        difficulty: 'survival bridge',
        role: 'Survival bridge',
        fantasy: 'A late-game shield cruiser built to survive the first impossible sector wall.',
        weakness: 'Slower movement and less boss burst than the cannon hulls.',
        recommendedBuildTags: ['shield', 'recovery', 'safe-entry'],
        art: { temporaryFallback: true, fallbackSpriteKey: 'nova-player-ship-21.png', note: 'Final Aegis Comet art needed.' }
    }],
    ['Railbreaker', 'railbreaker', 'Crack boss gates. Heavy precision damage, weaker crowd cleanup.', 'railbreaker', 35, 5.45, 112, 2.11, 13.8, 3, 0.02, 13, {
        textureIndex: 21,
        tier: 'ascendant',
        powerClass: 'late_game',
        powerRating: 1.11,
        intendedSectorBand: '35-39',
        difficulty: 'boss killer',
        role: 'Boss killer',
        fantasy: 'A precision cannon ship that turns boss gates into damage races.',
        weakness: 'Tight lanes and slower handling make dense swarms harder.',
        recommendedBuildTags: ['boss', 'pierce', 'precision'],
        shootSfx: 'shoot_railbreaker',
        art: { temporaryFallback: true, fallbackSpriteKey: 'nova-player-ship-22.png', note: 'Final Railbreaker art needed.' }
    }],
    ['Drone Sovereign', 'sovereign', 'Command the swarm back. Drone-style side pressure and magnet control turn density into opportunity.', 'drone-sovereign', 40, 6.15, 94, 0.96, 12.2, 4, 0.21, 12, {
        textureIndex: 22,
        tier: 'ascendant',
        powerClass: 'late_game',
        powerRating: 1.12,
        intendedSectorBand: '40-44',
        difficulty: 'swarm clearer',
        role: 'Swarm clearer',
        fantasy: 'A command ship that turns drones, magnets, and chain pressure into a moving kill zone.',
        weakness: 'Crowd tools are excellent, but boss damage relies on staying on target.',
        recommendedBuildTags: ['crowd-clear', 'magnet', 'side-lanes'],
        art: { temporaryFallback: true, fallbackSpriteKey: 'nova-player-ship-23.png', note: 'Final Drone Sovereign art needed.' }
    }],
    ['Phase Seraph', 'seraph', 'Slip through impossible screens. Phase and near-miss tools, lower raw damage than the cannon hulls.', 'phase-seraph', 45, 7.4, 90, 0.98, 13.0, 4, 0.11, 10, {
        textureIndex: 25,
        tier: 'ascendant',
        powerClass: 'late_game',
        powerRating: 1.13,
        intendedSectorBand: '45-49',
        difficulty: 'bullet-hell specialist',
        role: 'Bullet-hell specialist',
        fantasy: 'A phase-dodge ship built for sectors where the screen stops pretending to be fair.',
        weakness: 'Lower raw boss pressure than Railbreaker or Eirik the Viking.',
        recommendedBuildTags: ['phase', 'near-miss', 'dodge'],
        art: {
            temporaryFallback: false,
            sourceSpritePath: '/art/generated/nova-swarm/ships/nova-player-ship-phase-seraph-20260801.png',
            fallbackSpriteKey: 'nova-player-ship-24.png',
            note: 'Dedicated phase-seraph silhouette with a safe legacy fallback.'
        }
    }],
    ['Eirik the Viking', 'singularity', 'Level-50 endgame hull. Viking overdrive built for the sectors that hate you personally.', 'eirik-the-viking', 50, 6.85, 90, 0.96, 13.5, 4, 0.19, 13, {
        textureIndex: 26,
        tier: 'ascendant',
        powerClass: 'late_game',
        powerRating: 1.14,
        intendedSectorBand: '50+',
        difficulty: 'apex late-game',
        role: 'Apex late-game ship',
        fantasy: 'The level-50 endgame monster ship: Viking overdrive, boss pressure, and swarm control in one terrifying package.',
        weakness: 'Large core and high output reward clean positioning; sloppy overdrive windows still lose runs.',
        recommendedBuildTags: ['overdrive', 'boss', 'crowd-control'],
        art: {
            temporaryFallback: false,
            sourceSpritePath: '/art/generated/nova-swarm/ships/nova-player-ship-eirik-viking-20260801.png',
            fallbackSpriteKey: 'nova-player-ship-25.png',
            inscription: 'ᛖᛁᚱᛁᚲ',
            note: 'Prestige Viking flagship with dragon prow, shield nacelles, and carved runic bands.'
        }
    }]
];

function shipSpriteKey(index) {
    return `nova-player-ship-${String(index + 1).padStart(2, '0')}.png`;
}

function titleCase(name) {
    return name.toUpperCase();
}

export const ShipData = SHIP_BLUEPRINTS.map(([
    name,
    traitSlug,
    description,
    loreShort,
    unlockLevel,
    speed,
    fireRate,
    damage,
    bulletSpeed,
    bullets,
    spread,
    radius,
    metadata = {}
], index) => ({
    id: `nova_ship_${String(index + 1).padStart(2, '0')}`,
    spriteKey: shipSpriteKey(index),
    legacySpriteKeys: index < LEGACY_PLAYER_SHIP_KEYS.length ? [LEGACY_PLAYER_SHIP_KEYS[index]] : [],
    textureIndex: Number.isInteger(metadata.textureIndex) ? metadata.textureIndex : index,
    name: titleCase(name),
    description,
    loreShort,
    loreLong: metadata.fantasy
        ? `${metadata.fantasy} ${description}`
        : `${name} is a public Nova Swarm hangar build, tuned for arcade clarity and score-chase personality. Its ${loreShort} profile changes real handling, weapon cadence, and hitbox behavior instead of acting like a cosmetic skin.`,
    traitSlug,
    unlock: {
        level: unlockLevel,
        label: index === 0
            ? 'Available now'
            : (metadata.tier === 'ascendant' ? `Unlocks at Level ${unlockLevel}` : `Reach Level ${unlockLevel}`)
    },
    tier: metadata.tier || 'standard',
    powerClass: metadata.powerClass || 'normal',
    unlockLevel,
    powerRating: Number.isFinite(metadata.powerRating) ? metadata.powerRating : 1,
    intendedSectorBand: metadata.intendedSectorBand || null,
    difficulty: metadata.difficulty || null,
    role: metadata.role || null,
    fantasy: metadata.fantasy || null,
    weakness: metadata.weakness || null,
    recommendedBuildTags: Array.isArray(metadata.recommendedBuildTags) ? [...metadata.recommendedBuildTags] : [],
    art: metadata.art ? {
        spriteKey: shipSpriteKey(index),
        textureIndex: Number.isInteger(metadata.textureIndex) ? metadata.textureIndex : index,
        ...metadata.art
    } : {
        spriteKey: shipSpriteKey(index),
        textureIndex: Number.isInteger(metadata.textureIndex) ? metadata.textureIndex : index,
        temporaryFallback: false
    },
    stats: {
        speed,
        fireRate,
        damage,
        bulletSpeed
    },
    weapon: {
        bullets,
        spread,
        shootSfx: metadata.shootSfx || (damage >= 1.5 ? 'shoot_heavy' : 'shoot_small')
    },
    visuals: {
        scale: 0.15,
        idleAmplitude: 2,
        idleSpeed: 0.05,
        tiltMax: 0.2,
        tiltSpeed: 0.1
    },
    hitbox: { radius }
}));
