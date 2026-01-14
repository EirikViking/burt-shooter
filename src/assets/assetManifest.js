export const AssetManifest = {
    // Lore & Character Images (Root /public)
    loreImages: [
        '/eirik1.jpg',
        '/kurt2.jpg',
        '/eirik_briller.jpg',
        '/eirik_kurt2.jpg',
        '/burtelurt.jpg',
        '/anja.png',
        '/donaldtru.jpg',
        '/eriikviking.webp',
        '/morten_whale.jpg',
        '/wieik_shorts.jpg',
        '/eirikanja.jpg',
        '/19904965_10154611409746437_4832768224138573801_n.jpg'
    ],

    // Sprites
    sprites: {
        // Core Ships
        ships: Array.from({ length: 9 }, (_, i) => `/sprites/Ships/spaceShips_00${(i + 1).toString()}.png`),
        player: '/sprites/player/player_01.png',

        // Core Enemies
        enemies: {
            Black: Array.from({ length: 5 }, (_, i) => `/sprites/xtra-sprites/Enemies/enemyBlack${i + 1}.png`),
            Blue: Array.from({ length: 5 }, (_, i) => `/sprites/xtra-sprites/Enemies/enemyBlue${i + 1}.png`),
            Green: Array.from({ length: 5 }, (_, i) => `/sprites/xtra-sprites/Enemies/enemyGreen${i + 1}.png`),
            Red: Array.from({ length: 5 }, (_, i) => `/sprites/xtra-sprites/Enemies/enemyRed${i + 1}.png`)
        },

        // Lasers
        lasers: {
            Blue: Array.from({ length: 16 }, (_, i) => `/sprites/xtra-sprites/Lasers/laserBlue${(i + 1).toString().padStart(2, '0')}.png`),
            Green: Array.from({ length: 16 }, (_, i) => `/sprites/xtra-sprites/Lasers/laserGreen${(i + 1).toString().padStart(2, '0')}.png`),
            Red: Array.from({ length: 16 }, (_, i) => `/sprites/xtra-sprites/Lasers/laserRed${(i + 1).toString().padStart(2, '0')}.png`)
        },

        // Missiles
        missiles: Array.from({ length: 40 }, (_, i) => `/sprites/Missiles/spaceMissiles_${(i + 1).toString().padStart(3, '0')}.png`),

        // Effects
        effects: [
            ...Array.from({ length: 18 }, (_, i) => `/sprites/Effects/spaceEffects_${(i + 1).toString().padStart(3, '0')}.png`),
            // xtra-sprites/Effects
            '/sprites/xtra-sprites/Effects/fire00.png', '/sprites/xtra-sprites/Effects/fire01.png',
            '/sprites/xtra-sprites/Effects/fire02.png', '/sprites/xtra-sprites/Effects/fire03.png',
            '/sprites/xtra-sprites/Effects/fire04.png', '/sprites/xtra-sprites/Effects/fire05.png',
            '/sprites/xtra-sprites/Effects/fire06.png', '/sprites/xtra-sprites/Effects/fire07.png',
            '/sprites/xtra-sprites/Effects/fire08.png', '/sprites/xtra-sprites/Effects/fire09.png',
            '/sprites/xtra-sprites/Effects/fire10.png', '/sprites/xtra-sprites/Effects/fire11.png',
            '/sprites/xtra-sprites/Effects/fire12.png', '/sprites/xtra-sprites/Effects/fire13.png',
            '/sprites/xtra-sprites/Effects/fire14.png', '/sprites/xtra-sprites/Effects/fire15.png',
            '/sprites/xtra-sprites/Effects/fire16.png', '/sprites/xtra-sprites/Effects/fire17.png',
            '/sprites/xtra-sprites/Effects/fire18.png', '/sprites/xtra-sprites/Effects/fire19.png',
            '/sprites/xtra-sprites/Effects/shield1.png', '/sprites/xtra-sprites/Effects/shield2.png',
            '/sprites/xtra-sprites/Effects/shield3.png', '/sprites/xtra-sprites/Effects/speed.png',
            '/sprites/xtra-sprites/Effects/star1.png', '/sprites/xtra-sprites/Effects/star2.png',
            '/sprites/xtra-sprites/Effects/star3.png'
        ],

        // Ranks (Default to Gold for consistency) - 20 ranks total (0-19)
        ranks: Array.from({ length: 20 }, (_, i) => `/sprites/ranks/PNG/Default size/Gold/rank${i.toString().padStart(3, '0')}.png`),

        // Damage Overlays
        damage: {
            playerShip1: ['/sprites/xtra-sprites/Damage/playerShip1_damage1.png', '/sprites/xtra-sprites/Damage/playerShip1_damage2.png', '/sprites/xtra-sprites/Damage/playerShip1_damage3.png'],
            playerShip2: ['/sprites/xtra-sprites/Damage/playerShip2_damage1.png', '/sprites/xtra-sprites/Damage/playerShip2_damage2.png', '/sprites/xtra-sprites/Damage/playerShip2_damage3.png'],
            playerShip3: ['/sprites/xtra-sprites/Damage/playerShip3_damage1.png', '/sprites/xtra-sprites/Damage/playerShip3_damage2.png', '/sprites/xtra-sprites/Damage/playerShip3_damage3.png']
        },

        // UI
        ui: [
            '/sprites/xtra-sprites/UI/cursor.png', '/sprites/xtra-sprites/UI/buttonYellow.png', '/sprites/xtra-sprites/UI/buttonRed.png', '/sprites/xtra-sprites/UI/buttonGreen.png', '/sprites/xtra-sprites/UI/buttonBlue.png',
            '/sprites/xtra-sprites/UI/numeral0.png', '/sprites/xtra-sprites/UI/numeral1.png', '/sprites/xtra-sprites/UI/numeral2.png', '/sprites/xtra-sprites/UI/numeral3.png', '/sprites/xtra-sprites/UI/numeral4.png',
            '/sprites/xtra-sprites/UI/numeral5.png', '/sprites/xtra-sprites/UI/numeral6.png', '/sprites/xtra-sprites/UI/numeral7.png', '/sprites/xtra-sprites/UI/numeral8.png', '/sprites/xtra-sprites/UI/numeral9.png', '/sprites/xtra-sprites/UI/numeralX.png',
            '/sprites/xtra-sprites/UI/playerLife1_blue.png', '/sprites/xtra-sprites/UI/playerLife1_green.png', '/sprites/xtra-sprites/UI/playerLife1_orange.png', '/sprites/xtra-sprites/UI/playerLife1_red.png'
        ]
    },

    // Audio Assets
    audio: {
        voice: [
            '/audio/voice/congratulations.mp3', '/audio/voice/correct.mp3', '/audio/voice/final_round.mp3', '/audio/voice/game_over.mp3',
            '/audio/voice/go.mp3', '/audio/voice/hold.mp3', '/audio/voice/hurry_up.mp3', '/audio/voice/its_a_tie.mp3',
            '/audio/voice/level.mp3', '/audio/voice/level_up.mp3', '/audio/voice/mission_completed.mp3', '/audio/voice/mission_failed.mp3',
            '/audio/voice/new_highscore.mp3', '/audio/voice/objective_achieved.mp3', '/audio/voice/power_up.mp3', '/audio/voice/ready.mp3',
            '/audio/voice/round.mp3', '/audio/voice/set.mp3', '/audio/voice/time_over.mp3', '/audio/voice/war_call_for_backup.mp3',
            '/audio/voice/war_cover_me.mp3', '/audio/voice/war_fire_in_the_hole.mp3', '/audio/voice/war_get_down.mp3', '/audio/voice/war_go_go_go.mp3',
            '/audio/voice/war_look_out.mp3', '/audio/voice/war_medic.mp3', '/audio/voice/war_reloading.mp3', '/audio/voice/war_rpg.mp3',
            '/audio/voice/war_sniper.mp3', '/audio/voice/war_suppressing_fire.mp3', '/audio/voice/war_target_destroyed.mp3',
            '/audio/voice/war_target_engaged.mp3', '/audio/voice/war_watch_my_back.mp3', '/audio/voice/wrong.mp3', '/audio/voice/you_lose.mp3',
            '/audio/voice/you_win.mp3'
        ],
        music: [
            '/audio/music/Alone Against Enemy.mp3', '/audio/music/Battle in the Stars.mp3', '/audio/music/Brave Pilots (Menu Screen).mp3',
            '/audio/music/DeathMatch (Boss Theme).mp3', '/audio/music/Defeated (Game Over Tune).mp3', '/audio/music/Rain of Lasers.mp3',
            '/audio/music/SkyFire (Title Screen).mp3', '/audio/music/Space Heroes.mp3', '/audio/music/Victory Tune.mp3',
            '/audio/music/Without Fear.mp3', '/audio/music/bgm_v2.mp3'
        ],
        sfx: [
            '/audio/sfx/computerNoise_000.mp3', '/audio/sfx/doorClose_000.mp3', '/audio/sfx/doorOpen_000.mp3', '/audio/sfx/engineCircular_000.mp3',
            '/audio/sfx/explosionCrunch_000.mp3', '/audio/sfx/forceField_000.mp3', '/audio/sfx/impactMetal_000.mp3', '/audio/sfx/laserLarge_000.mp3',
            '/audio/sfx/laserRetro_000.mp3', '/audio/sfx/laserSmall_000.mp3', '/audio/sfx/lowFrequency_explosion_000.mp3', '/audio/sfx/slime_000.mp3',
            '/audio/sfx/spaceEngineLarge_000.mp3', '/audio/sfx/spaceEngineLow_000.mp3', '/audio/sfx/spaceEngineSmall_000.mp3',
            '/audio/sfx/spaceEngine_000.mp3', '/audio/sfx/thrusterFire_000.mp3'
        ]
    },

    // Weapon Mappings (Gameplay Logic - using keys from above or direct paths)
    enemyWeaponMap: {
        'gris': { projectile: '/sprites/xtra-sprites/Lasers/laserRed13.png', flashColor: 0xff0000, impactColor: 0xff0000, sound: 'enemy_shoot' },
        'mongo': { projectile: '/sprites/xtra-sprites/Lasers/laserGreen08.png', flashColor: 0x00ff00, impactColor: 0x00ff00, sound: 'enemy_shoot' },
        'tufs': { projectile: '/sprites/xtra-sprites/Lasers/laserBlue11.png', flashColor: 0x0088ff, impactColor: 0x0088ff, sound: 'enemy_shoot' },
        'deili': { projectile: '/sprites/xtra-sprites/Lasers/laserRed15.png', flashColor: 0xff4400, impactColor: 0xff4400, sound: 'enemy_shoot' },
        'rolp': { projectile: '/sprites/xtra-sprites/Lasers/laserBlue05.png', flashColor: 0xff00ff, impactColor: 0xff00ff, sound: 'enemy_shoot' },
        'beer_challenge': { projectile: '/sprites/xtra-sprites/Lasers/laserGreen08.png', flashColor: 0x00ff00, impactColor: 0x00ff00, sound: 'enemy_shoot' }
    }
};
