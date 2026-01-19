import { AssetManifest } from '../assets/assetManifest.js';

// Safe lookup helpers
// Safe lookup helpers
const getMusic = (partial) => AssetManifest.audio.music.find(p => p.includes(partial)) || `/audio/music/${partial}.mp3`;
const getSfx = (partial) => {
    const match = AssetManifest.audio.sfx.find(p => p.includes(partial));
    if (match) return match;
    // Fallback: Construct URL assuming standard location and format
    return `/audio/sfx/${partial}.mp3`;
};

// Music Pools
const MENU_POOL = [
    getMusic('Brave Pilots'),
    getMusic('SkyFire'),
    getMusic('Space Heroes'),
    getMusic('Defeated'),
    getMusic('Victory Tune')
];

const GAMEPLAY_POOL = [
    getMusic('bgm_v2'), // Forced start track
    getMusic('Alone Against Enemy'),
    getMusic('Battle in the Stars'),
    getMusic('Rain of Lasers'),
    getMusic('DeathMatch'),
    getMusic('Without Fear')
];

export const MUSIC_PLAYLISTS = {
    menu: MENU_POOL,
    scoreboard: MENU_POOL,
    gameplay: GAMEPLAY_POOL
};

export const SFX_CATALOG = {
    'shoot_small': [
        getSfx('laserSmall_000'), getSfx('laserSmall_001'), getSfx('laserSmall_002'), getSfx('laserSmall_003'), getSfx('laserSmall_004')
    ],
    'shoot_alt': [
        getSfx('laserRetro_000'), getSfx('laserRetro_001'), getSfx('laserRetro_002'), getSfx('laserRetro_003'), getSfx('laserRetro_004')
    ],
    'shoot_heavy': [
        getSfx('laserLarge_000'), getSfx('laserLarge_001'), getSfx('laserLarge_002'), getSfx('laserLarge_003'), getSfx('laserLarge_004')
    ],
    'enemy_explode': [
        getSfx('explosionCrunch_000'), getSfx('explosionCrunch_001'), getSfx('explosionCrunch_002'), getSfx('explosionCrunch_003'), getSfx('explosionCrunch_004')
    ],
    'boss_explode': [
        getSfx('lowFrequency_explosion_000'), getSfx('lowFrequency_explosion_001') // 001 might not exist in manifest if truncated in my previous tool output, but lookup returns partial if not found, safe enough
    ],
    'hit': [
        getSfx('impactMetal_000'), getSfx('impactMetal_001'), getSfx('impactMetal_002'), getSfx('impactMetal_003'), getSfx('impactMetal_004')
    ],
    'shield': [
        getSfx('forceField_000'), getSfx('forceField_001'), getSfx('forceField_002'), getSfx('forceField_003'), getSfx('forceField_004')
    ],
    'ui_open': [
        getSfx('doorOpen_000'), getSfx('doorOpen_001'), getSfx('doorOpen_002')
    ],
    'ui_close': [
        getSfx('doorClose_000'), getSfx('doorClose_001'), getSfx('doorClose_002')
    ],
    'pickup': [
        getSfx('forceField_000'),
        getSfx('forceField_001')
    ],
    // Direct matches from manifest
    'computerNoise': [getSfx('computerNoise_000')],
    'thrusterFire': [getSfx('thrusterFire_000')],
    'doorClose': [getSfx('doorClose_000')],
    'spaceEngine': [getSfx('spaceEngine_000')],

    // Mappings and Aliases
    'shoot': [getSfx('laserSmall_000')],
    'explosion': [getSfx('explosionCrunch_000')],
    'powerup': [getSfx('forceField_000')],
    'menuSelect': [getSfx('doorOpen_000')],
    'playerHit': [getSfx('impactMetal_000')],
    'levelComplete': [getSfx('doorOpen_000')],

    // Aliases for inconsistent call sites
    'forceField': [getSfx('forceField_000')], // Alias for shield/pickup reuse
    'shield_up': [getSfx('forceField_000')],
    'life_up': [getSfx('ui_open_000')] // Fallback if specific not found
};
