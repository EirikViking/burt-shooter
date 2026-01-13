// Music Pools for distinct audio experiences

const MENU_POOL = [
    '/audio/music/Brave Pilots (Menu Screen).mp3',
    '/audio/music/SkyFire (Title Screen).mp3',
    '/audio/music/Space Heroes.mp3',
    '/audio/music/Defeated (Game Over Tune).mp3',
    '/audio/music/Victory Tune.mp3'
];

const GAMEPLAY_POOL = [
    '/audio/music/bgm_v2.mp3', // Forced start track
    '/audio/music/Alone Against Enemy.mp3',
    '/audio/music/Battle in the Stars.mp3',
    '/audio/music/Rain of Lasers.mp3',
    '/audio/music/DeathMatch (Boss Theme).mp3',
    '/audio/music/Without Fear.mp3'
];

// Combine for preloading if needed
const MUSIC_LIBRARY = [...MENU_POOL, ...GAMEPLAY_POOL];

export const MUSIC_PLAYLISTS = {
    menu: MENU_POOL,
    scoreboard: MENU_POOL, // Share pool to allow seamless switching
    gameplay: GAMEPLAY_POOL
};

export const SFX_CATALOG = {
    'shoot_small': [
        '/audio/sfx/laserSmall_000.mp3',
        '/audio/sfx/laserSmall_001.mp3',
        '/audio/sfx/laserSmall_002.mp3',
        '/audio/sfx/laserSmall_003.mp3',
        '/audio/sfx/laserSmall_004.mp3'
    ],
    'shoot_alt': [
        '/audio/sfx/laserRetro_000.mp3',
        '/audio/sfx/laserRetro_001.mp3',
        '/audio/sfx/laserRetro_002.mp3',
        '/audio/sfx/laserRetro_003.mp3',
        '/audio/sfx/laserRetro_004.mp3'
    ],
    'shoot_heavy': [
        '/audio/sfx/laserLarge_000.mp3',
        '/audio/sfx/laserLarge_001.mp3',
        '/audio/sfx/laserLarge_002.mp3',
        '/audio/sfx/laserLarge_003.mp3',
        '/audio/sfx/laserLarge_004.mp3'
    ],
    'enemy_explode': [
        '/audio/sfx/explosionCrunch_000.mp3',
        '/audio/sfx/explosionCrunch_001.mp3',
        '/audio/sfx/explosionCrunch_002.mp3',
        '/audio/sfx/explosionCrunch_003.mp3',
        '/audio/sfx/explosionCrunch_004.mp3'
    ],
    'boss_explode': [
        '/audio/sfx/lowFrequency_explosion_000.mp3',
        '/audio/sfx/lowFrequency_explosion_001.mp3'
    ],
    'hit': [
        '/audio/sfx/impactMetal_000.mp3',
        '/audio/sfx/impactMetal_001.mp3',
        '/audio/sfx/impactMetal_002.mp3',
        '/audio/sfx/impactMetal_003.mp3',
        '/audio/sfx/impactMetal_004.mp3'
    ],
    'shield': [
        '/audio/sfx/forceField_000.mp3',
        '/audio/sfx/forceField_001.mp3',
        '/audio/sfx/forceField_002.mp3',
        '/audio/sfx/forceField_003.mp3',
        '/audio/sfx/forceField_004.mp3'
    ],
    'ui_open': [
        '/audio/sfx/doorOpen_000.mp3',
        '/audio/sfx/doorOpen_001.mp3',
        '/audio/sfx/doorOpen_002.mp3'
    ],
    'ui_close': [
        '/audio/sfx/doorClose_000.mp3',
        '/audio/sfx/doorClose_001.mp3',
        '/audio/sfx/doorClose_002.mp3'
    ],
    'pickup': [
        '/audio/sfx/computerNoise_000.mp3',
        '/audio/sfx/computerNoise_001.mp3',
        '/audio/sfx/computerNoise_002.mp3',
        '/audio/sfx/computerNoise_003.mp3'
    ],
    // Mapping old keys to new catalog for compatibility if needed
    'shoot': ['/audio/sfx/laserSmall_000.mp3'],
    'explosion': ['/audio/sfx/explosionCrunch_000.mp3'],
    'powerup': ['/audio/sfx/computerNoise_000.mp3'],
    'menuSelect': ['/audio/sfx/doorOpen_000.mp3'], // Closest map
    'playerHit': ['/audio/sfx/impactMetal_000.mp3'],
    'levelComplete': ['/audio/sfx/computerNoise_002.mp3']
};
