export const AssetManifest = {
    generated: {
        menuBackdrop: '/art/generated/nova-swarm/menu/nova-swarm-cinematic-hangar-20260617.webp',
        menuCredits: '/art/generated/nova-swarm/menu/nova-swarm-credits-20260519.png',
        menuIcons: {
            launch: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-launch-run.png',
            sectorChallenge: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-sector-challenge.png',
            shipHangar: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-ship-hangar.png',
            leaderboard: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-leaderboard.png',
            threatCodex: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-threat-codex.png',
            achievements: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-achievements.png',
            settings: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-settings.png',
            music: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-music.png',
            howToPlay: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-how-to-play.png',
            exit: '/art/generated/nova-swarm/menu/icons/approved-menu-icon-exit.png'
        },
        leaderboardHall: '/art/generated/nova-swarm/leaderboard/nova-swarm-leaderboard-hall-20260519.png',
        gameOverCeremony: '/art/generated/nova-swarm/gameover/nova-swarm-gameover-ceremony-20260519.png',
        gameplayArenaBackdrop: '/art/generated/nova-swarm/nova-swarm-gameplay-arena.webp',
        stormGameplayBackdrop: '/art/generated/nova-swarm/nova-swarm-storm-gameplay-backdrop.webp',
        bossArenaBackdrop: '/art/generated/nova-swarm/nova-swarm-boss-arena.webp',
        bossDossier: '/art/generated/nova-swarm/nova-swarm-boss-dossier.png',
        vfx: {
            overrunVictorySeal: '/art/generated/nova-swarm/vfx/overrun-victory-seal.png',
            bossWarningAtlas: '/art/generated/nova-swarm/vfx/boss-warning-emblems/nova-boss-warning-emblem-atlas-20260603-clean.png',
            bossWarningEmblems: Array.from({ length: 50 }, (_, i) => `/art/generated/nova-swarm/vfx/boss-warning-emblems/nova-boss-warning-emblem-${String(i + 1).padStart(2, '0')}-20260603-clean.png`)
        },
        sectors: Array.from({ length: 240 }, (_, i) => `/art/generated/nova-swarm/replacements/sector-scenes/nova-sector-scene-${String(i + 1).padStart(3, '0')}-20260616.png`),
        bosses: Array.from({ length: 50 }, (_, i) => `/art/generated/nova-swarm/bosses/nova-boss-${String(i + 1).padStart(2, '0')}.png`),
        playerShips: Array.from({ length: 25 }, (_, i) => `/art/generated/nova-swarm/ships/nova-player-ship-${String(i + 1).padStart(2, '0')}.png`),
        enemies: [
            ...Array.from({ length: 50 }, (_, i) => `/art/generated/nova-swarm/enemies/enhanced/nova-enemy-enhanced-${String(i + 1).padStart(2, '0')}.png`),
            ...Array.from({ length: 177 }, (_, i) => `/art/generated/nova-swarm/enemies/late-mayhem/nova-late-mayhem-enemy-${String(i + 1).padStart(3, '0')}.png`)
        ],
        eliteMiddleShips: [
            '/art/generated/nova-swarm/elites/nova-elite-middle-01-tractor-puller-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-02-shield-projector-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-03-drone-carrier-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-04-mine-layer-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-05-sniper-rail-ship-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-06-jammer-disruptor-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-07-repair-healer-ship-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-08-splitter-clone-ship-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-09-barrier-projector-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-10-vortex-gravity-ship-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-11-burst-artillery-ship-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-12-phase-raider-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-13-lane-blocker-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-14-orb-webber-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-15-missile-frigate-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-16-mirror-decoy-ship-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-17-pulse-emp-ship-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-18-anchor-turret-ship-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-19-escort-commander-20260523.png',
            '/art/generated/nova-swarm/elites/nova-elite-middle-20-late-game-elite-hunter-20260523.png'
        ],
        enemyWeapons: [
            '/art/generated/nova-swarm/projectiles/nova-basic-enemy-bolt-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-heavy-enemy-orb-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-fast-enemy-needle-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-boss-shard-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-boss-shard-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-heavy-enemy-orb-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-fast-enemy-needle-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-enemy-fireball-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-tractor-beam-energy-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-boss-shard-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-warning-hazard-marker-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-boss-plasma-bolt-20260624.png'
        ],
        projectiles: {
            basicEnemyBolt: '/art/generated/nova-swarm/projectiles/nova-basic-enemy-bolt-20260624.png',
            fastEnemyNeedle: '/art/generated/nova-swarm/projectiles/nova-fast-enemy-needle-20260624.png',
            heavyEnemyOrb: '/art/generated/nova-swarm/projectiles/nova-heavy-enemy-orb-20260624.png',
            enemyFireball: '/art/generated/nova-swarm/projectiles/nova-enemy-fireball-20260624.png',
            bossPlasmaBolt: '/art/generated/nova-swarm/projectiles/nova-boss-plasma-bolt-20260624.png',
            bossShard: '/art/generated/nova-swarm/projectiles/nova-boss-shard-20260624.png',
            bossLaserCore: '/art/generated/nova-swarm/projectiles/nova-boss-laser-core-20260624.png',
            bossLaserEdge: '/art/generated/nova-swarm/projectiles/nova-boss-laser-edge-20260624.png',
            tractorBeamEnergy: '/art/generated/nova-swarm/projectiles/nova-tractor-beam-energy-20260624.png',
            warningHazardMarker: '/art/generated/nova-swarm/projectiles/nova-warning-hazard-marker-20260624.png'
        },
        projectileSourceSheet: [
            '/art/generated/nova-swarm/source/nova-enemy-projectile-source-sheet-20260624.png',
            '/art/generated/nova-swarm/projectiles/nova-enemy-projectile-sheet-alpha-20260624.png'
        ],
        powerups: {
            triple_beam: '/art/generated/nova-swarm/powerups/nova-powerup-triple_beam-20260519.png',
            vector_boost: '/art/generated/nova-swarm/powerups/nova-powerup-vector_boost-20260519.png',
            rapid_cabinet: '/art/generated/nova-swarm/powerups/nova-powerup-rapid_cabinet-20260519.png',
            overdrive_core: '/art/generated/nova-swarm/powerups/nova-powerup-overdrive_core-20260519.png',
            slow_time: '/art/generated/nova-swarm/powerups/nova-powerup-slow_time-20260519.png',
            ghost: '/art/generated/nova-swarm/powerups/nova-powerup-ghost-20260519.png',
            life: '/art/generated/nova-swarm/powerups/nova-powerup-life-20260519.png',
            shield: '/art/generated/nova-swarm/powerups/nova-powerup-shield-20260519.png',
            rapid_fire: '/art/generated/nova-swarm/powerups/nova-powerup-rapid_fire-20260519.png',
            double_shot: '/art/generated/nova-swarm/powerups/nova-powerup-double_shot-20260519.png',
            damage_up: '/art/generated/nova-swarm/powerups/nova-powerup-damage_up-20260519.png',
            speed_up: '/art/generated/nova-swarm/powerups/nova-powerup-speed_up-20260519.png',
            pierce: '/art/generated/nova-swarm/powerups/nova-powerup-pierce-20260519.png',
            score_x2: '/art/generated/nova-swarm/powerups/nova-powerup-score_x2-20260519.png',
            magnet: '/art/generated/nova-swarm/powerups/nova-powerup-magnet-20260519.png',
            drones: '/art/generated/nova-swarm/powerups/nova-powerup-drones-20260519.png',
            shockwave: '/art/generated/nova-swarm/powerups/nova-powerup-shockwave-20260519.png',
            point_defense: '/art/generated/nova-swarm/powerups/nova-powerup-point_defense-20260519.png',
            bomb: '/art/generated/nova-swarm/powerups/nova-powerup-bomb-20260519.png',
            chain_lightning: '/art/generated/nova-swarm/powerups/nova-powerup-chain_lightning-20260519.png',
            orbital_strike: '/art/generated/nova-swarm/powerups/nova-powerup-orbital_strike-20260519.png',
            vampire: '/art/generated/nova-swarm/powerups/nova-powerup-vampire-20260519.png',
            prism_splitter: '/art/generated/nova-swarm/powerups/nova-powerup-prism_splitter-20260613.png',
            rail_surge: '/art/generated/nova-swarm/powerups/nova-powerup-rail_surge-20260613.png',
            chrono_anchor: '/art/generated/nova-swarm/powerups/nova-powerup-chrono_anchor-20260613.png',
            blink_drive: '/art/generated/nova-swarm/powerups/nova-powerup-blink_drive-20260613.png',
            nano_patch: '/art/generated/nova-swarm/powerups/nova-powerup-nano_patch-20260613.png',
            score_fever: '/art/generated/nova-swarm/powerups/nova-powerup-score_fever-20260613.png',
            gravity_well: '/art/generated/nova-swarm/powerups/nova-powerup-gravity_well-20260613.png',
            drone_carousel: '/art/generated/nova-swarm/powerups/nova-powerup-drone_carousel-20260613.png',
            plasma_lance: '/art/generated/nova-swarm/powerups/nova-powerup-plasma_lance-20260613.png',
            stasis_net: '/art/generated/nova-swarm/powerups/nova-powerup-stasis_net-20260613.png',
            aegis_burst: '/art/generated/nova-swarm/powerups/nova-powerup-aegis_burst-20260613.png',
            jackpot_lens: '/art/generated/nova-swarm/powerups/nova-powerup-jackpot_lens-20260613.png',
            ion_dash: '/art/generated/nova-swarm/powerups/nova-powerup-ion_dash-20260613.png',
            saw_matrix: '/art/generated/nova-swarm/powerups/nova-powerup-saw_matrix-20260613.png',
            mirror_shots: '/art/generated/nova-swarm/powerups/nova-powerup-mirror_shots-20260613.png',
            mercy_protocol: '/art/generated/nova-swarm/powerups/nova-powerup-mercy_protocol-20260613.png',
            target_paint: '/art/generated/nova-swarm/powerups/nova-powerup-target_paint-20260613.png',
            void_crown: '/art/generated/nova-swarm/powerups/nova-powerup-void_crown-20260613.png',
            swarm_contract: '/art/generated/nova-swarm/powerups/nova-powerup-swarm_contract-20260613.png',
            pulse_refund: '/art/generated/nova-swarm/powerups/nova-powerup-pulse_refund-20260613.png',
            bonus_core: '/art/generated/nova-swarm/powerups/nova-powerup-bonus_core-20260519.png'
        },
        introPanels: [
            '/art/generated/nova-swarm/nova-swarm-intro-last-arcade.webp',
            '/art/generated/nova-swarm/nova-swarm-intro-swarm-awakens.webp',
            '/art/generated/nova-swarm/nova-swarm-intro-small-ship.webp',
            '/art/generated/nova-swarm/nova-swarm-intro-boss-chorus.webp'
        ],
        shipHangar: '/art/generated/nova-swarm/nova-swarm-ship-hangar.webp',
        crewPortraits: [
            '/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-01-20260519.webp',
            '/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-02-20260519.webp',
            '/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-03-20260519.webp',
            '/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-04-20260519.webp'
        ]
    },

    // Original generated comms portraits only. Real-person portrait assets are not shipped.
    loreImages: [],

    // Sprites
    sprites: {
        // Core Ships
        ships: Array.from({ length: 9 }, (_, i) => `/sprites/Ships/spaceShips_00${(i + 1).toString()}.png`),
        player: '/sprites/player/player_01.png',
        playerRankShips: Array.from({ length: 25 }, (_, i) => `/art/generated/nova-swarm/ships/nova-player-ship-${String(i + 1).padStart(2, '0')}.png`),

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

        // Boss Sprites
        bosses: [
            '/sprites/boss/Gemini_Generated_Image_kgxeipkgxeipkgxe_no_bg2.png',
            '/sprites/boss/boss_battleship_no_bg2.png',
            '/sprites/boss/boss_crystal_no_bg2.png',
            '/sprites/boss/boss_insect_no_bg2.png',
            '/sprites/boss/boss_turret_no_bg2.png'
        ],

        // Nova Swarm rank badges - 40 ranks total (0-39)
        ranks: Array.from({ length: 40 }, (_, i) => `/art/generated/nova-swarm/ranks/nova-rank-badge-${i.toString().padStart(2, '0')}-20260612.png`),

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
        ],

        // Xtra Player Ships (for rank progression)
        xtraPlayerShips: {
            ship1: {
                blue: '/sprites/xtra-sprites/playerShip1_blue.png',
                green: '/sprites/xtra-sprites/playerShip1_green.png',
                orange: '/sprites/xtra-sprites/playerShip1_orange.png',
                red: '/sprites/xtra-sprites/playerShip1_red.png'
            },
            ship2: {
                blue: '/sprites/xtra-sprites/playerShip2_blue.png',
                green: '/sprites/xtra-sprites/playerShip2_green.png',
                orange: '/sprites/xtra-sprites/playerShip2_orange.png',
                red: '/sprites/xtra-sprites/playerShip2_red.png'
            },
            ship3: {
                blue: '/sprites/xtra-sprites/playerShip3_blue.png',
                green: '/sprites/xtra-sprites/playerShip3_green.png',
                orange: '/sprites/xtra-sprites/playerShip3_orange.png',
                red: '/sprites/xtra-sprites/playerShip3_red.png'
            }
        },

        // Powerups
        bonusCore: '/art/generated/nova-swarm/powerups/nova-powerup-bonus_core-20260519.png'
    },

    // Audio Assets
    audio: {
        voice: [
            '/audio/voice/mission-control/mission_control_launch.mp3',
            '/audio/voice/mission-control/mission_control_launch_alt01.mp3',
            '/audio/voice/mission-control/mission_control_launch_alt02.mp3',
            '/audio/voice/mission-control/mission_control_level_start.mp3',
            '/audio/voice/mission-control/mission_control_level_start_alt01.mp3',
            '/audio/voice/mission-control/mission_control_level_start_alt02.mp3',
            '/audio/voice/mission-control/mission_control_wave_clear.mp3',
            '/audio/voice/mission-control/mission_control_wave_clear_alt01.mp3',
            '/audio/voice/mission-control/mission_control_wave_clear_alt02.mp3',
            ...Array.from({ length: 100 }, (_, i) => `/audio/voice/mission-control/mission_control_reinforcements_incoming_${String(i + 1).padStart(3, '0')}.mp3`),
            '/audio/voice/mission-control/mission_control_boss_inbound.mp3',
            '/audio/voice/mission-control/mission_control_boss_inbound_alt01.mp3',
            '/audio/voice/mission-control/mission_control_boss_inbound_alt02.mp3',
            '/audio/voice/mission-control/mission_control_life_low.mp3',
            '/audio/voice/mission-control/mission_control_life_low_alt01.mp3',
            '/audio/voice/mission-control/mission_control_life_low_alt02.mp3',
            '/audio/voice/mission-control/mission_control_lives_max.mp3',
            '/audio/voice/mission-control/mission_control_powerup.mp3',
            '/audio/voice/mission-control/mission_control_powerup_alt01.mp3',
            '/audio/voice/mission-control/mission_control_powerup_alt02.mp3',
            '/audio/voice/mission-control/mission_control_victory.mp3',
            '/audio/voice/mission-control/mission_control_victory_alt01.mp3',
            '/audio/voice/mission-control/mission_control_victory_alt02.mp3',
            '/audio/voice/mission-control/mission_control_game_over.mp3',
            '/audio/voice/mission-control/mission_control_game_over_alt01.mp3',
            '/audio/voice/mission-control/mission_control_game_over_alt02.mp3',
            '/audio/voice/mission-control/mission_control_ship_unlocked_01.mp3',
            '/audio/voice/mission-control/mission_control_ships_unlocked_01.mp3',
            '/audio/voice/mission-control/mission_control_combo_01.mp3',
            '/audio/voice/mission-control/mission_control_combo_02.mp3',
            '/audio/voice/mission-control/mission_control_combo_03.mp3',
            '/audio/voice/mission-control/mission_control_local_highscore_01.mp3',
            '/audio/voice/mission-control/mission_control_local_highscore_02.mp3',
            '/audio/voice/mission-control/mission_control_global_highscore_01.mp3',
            '/audio/voice/mission-control/mission_control_global_highscore_02.mp3',
            '/audio/voice/mission-control/mission_control_global_close_01.mp3',
            '/audio/voice/mission-control/mission_control_top3_close_01.mp3',
            '/audio/voice/mission-control/mission_control_number_one_close_01.mp3',
            '/audio/voice/mission-control/mission_control_top3_highscore_01.mp3',
            '/audio/voice/mission-control/mission_control_number_one_highscore_01.mp3',
            '/audio/voice/mission-control/mission_control_near_miss_01.mp3',
            '/audio/voice/mission-control/mission_control_personal_best_01.mp3',
            '/audio/voice/mission-control/mission_control_personal_best_02.mp3',
            '/audio/voice/mission-control/mission_control_restart_01.mp3',
            '/audio/voice/mission-control/mission_control_restart_02.mp3',
            '/audio/voice/mission-control/mission_control_hijacker_01.mp3',
            '/audio/voice/mission-control/mission_control_hijacker_02.mp3',
            '/audio/voice/mission-control/mission_control_tractor_hijack_01.mp3',
            '/audio/voice/mission-control/mission_control_tractor_hijack_02.mp3',
            '/audio/voice/mission-control/mission_control_tractor_hijack_03.mp3',
            '/audio/voice/mission-control/mission_control_overrun_clear_01.mp3',
            '/audio/voice/mission-control/mission_control_overrun_clear_sector_10_01.mp3',
            '/audio/voice/mission-control/mission_control_overrun_clear_sector_20_01.mp3',
            '/audio/voice/mission-control/mission_control_overrun_clear_sector_30_01.mp3',
            '/audio/voice/mission-control/mission_control_overrun_clear_sector_40_01.mp3',
            '/audio/voice/mission-control/mission_control_overrun_clear_sector_50_01.mp3',
            '/audio/voice/mission-control/mission_control_overrun_clear_far_signal_01.mp3',
            '/audio/voice/mission-control/mission_control_credits_01.mp3',
            ...Array.from({ length: 50 }, (_, i) => `/audio/voice/cta/one_more_run_${String(i + 1).padStart(2, '0')}.mp3`),
            ...Array.from({ length: 100 }, (_, i) => `/audio/voice/boss-death/boss_death_agony_${String(i + 1).padStart(3, '0')}.mp3`),
            ...Array.from({ length: 100 }, (_, i) => `/audio/voice/game-over-taunt/game_over_taunt_${String(i + 1).padStart(3, '0')}.mp3`),
            ...Array.from({ length: 200 }, (_, i) => `/audio/voice/level-clear/level_clear_flirt_${String(i + 1).padStart(3, '0')}.mp3`),
            '/audio/voice/nova-swarm/intro_narrator_01.mp3',
            '/audio/voice/nova-swarm/intro_narrator_02.mp3',
            '/audio/voice/nova-swarm/intro_narrator_03.mp3',
            '/audio/voice/nova-swarm/intro_narrator_04.mp3'
        ],
        music: [
            '/audio/music/Alone Against Enemy.mp3', '/audio/music/Battle in the Stars.mp3', '/audio/music/Brave Pilots (Menu Screen).mp3',
            '/audio/music/DeathMatch (Boss Theme).mp3', '/audio/music/Defeated (Game Over Tune).mp3', '/audio/music/Rain of Lasers.mp3',
            '/audio/music/SkyFire (Title Screen).mp3', '/audio/music/Space Heroes.mp3', '/audio/music/Victory Tune.mp3',
            '/audio/music/Without Fear.mp3', '/audio/music/bgm_v2.mp3',
            '/audio/music/nova-swarm/nova_swarm_intro_overture.mp3',
            '/audio/music/nova-swarm/nova_swarm_menu_neon_cabinet.mp3',
            '/audio/music/nova-swarm/nova_swarm_menu_starcoin_parade.mp3',
            '/audio/music/nova-swarm/nova_swarm_scoreboard_trophy_orbit.mp3',
            '/audio/music/nova-swarm/nova_swarm_gameplay_laser_lane.mp3',
            '/audio/music/nova-swarm/nova_swarm_gameplay_comet_chase.mp3',
            '/audio/music/nova-swarm/nova_swarm_gameplay_orbit_breaker.mp3',
            '/audio/music/nova-swarm/nova_swarm_gameplay_bonus_heat.mp3',
            '/audio/music/nova-swarm/nova_swarm_overdrive_quarterstorm.mp3',
            '/audio/music/nova-swarm/nova_swarm_overdrive_vector_riot.mp3',
            '/audio/music/nova-swarm/nova_swarm_overdrive_boss_singularity.mp3',
            '/audio/music/nova-swarm/nova_swarm_boss_gate_overdrive.mp3',
            '/audio/music/nova-swarm/nova_swarm_boss_cabinet_judgement.mp3',
            '/audio/music/nova-swarm/nova_swarm_victory_star_receipts.mp3',
            '/audio/music/nova-swarm/nova_swarm_gameover_last_coin.mp3'
        ],
        sfx: [
            // Computer Noise
            '/audio/sfx/computerNoise_000.mp3', '/audio/sfx/computerNoise_001.mp3', '/audio/sfx/computerNoise_002.mp3', '/audio/sfx/computerNoise_003.mp3',
            // Door
            '/audio/sfx/doorClose_000.mp3', '/audio/sfx/doorClose_001.mp3', '/audio/sfx/doorClose_002.mp3',
            '/audio/sfx/doorOpen_000.mp3', '/audio/sfx/doorOpen_001.mp3', '/audio/sfx/doorOpen_002.mp3',
            // Engine Circular
            '/audio/sfx/engineCircular_000.mp3',
            // Explosions
            '/audio/sfx/explosionCrunch_000.mp3', '/audio/sfx/explosionCrunch_001.mp3', '/audio/sfx/explosionCrunch_002.mp3', '/audio/sfx/explosionCrunch_003.mp3', '/audio/sfx/explosionCrunch_004.mp3',
            '/audio/sfx/lowFrequency_explosion_000.mp3', '/audio/sfx/lowFrequency_explosion_001.mp3',
            // ForceField
            '/audio/sfx/forceField_000.mp3', '/audio/sfx/forceField_001.mp3', '/audio/sfx/forceField_002.mp3', '/audio/sfx/forceField_003.mp3', '/audio/sfx/forceField_004.mp3',
            // Impact
            '/audio/sfx/impactMetal_000.mp3', '/audio/sfx/impactMetal_001.mp3', '/audio/sfx/impactMetal_002.mp3', '/audio/sfx/impactMetal_003.mp3', '/audio/sfx/impactMetal_004.mp3',
            // Lasers
            '/audio/sfx/laserLarge_000.mp3', '/audio/sfx/laserLarge_001.mp3', '/audio/sfx/laserLarge_002.mp3', '/audio/sfx/laserLarge_003.mp3', '/audio/sfx/laserLarge_004.mp3',
            '/audio/sfx/laserRetro_000.mp3', '/audio/sfx/laserRetro_001.mp3', '/audio/sfx/laserRetro_002.mp3', '/audio/sfx/laserRetro_003.mp3', '/audio/sfx/laserRetro_004.mp3',
            '/audio/sfx/laserSmall_000.mp3', '/audio/sfx/laserSmall_001.mp3', '/audio/sfx/laserSmall_002.mp3', '/audio/sfx/laserSmall_003.mp3', '/audio/sfx/laserSmall_004.mp3',
            // Slime
            '/audio/sfx/slime_000.mp3', '/audio/sfx/slime_001.mp3',
            // Space Engines
            '/audio/sfx/spaceEngineLarge_000.mp3', '/audio/sfx/spaceEngineLarge_001.mp3', '/audio/sfx/spaceEngineLarge_002.mp3', '/audio/sfx/spaceEngineLarge_003.mp3', '/audio/sfx/spaceEngineLarge_004.mp3',
            '/audio/sfx/spaceEngineLow_000.mp3', '/audio/sfx/spaceEngineLow_001.mp3', '/audio/sfx/spaceEngineLow_002.mp3', '/audio/sfx/spaceEngineLow_003.mp3', '/audio/sfx/spaceEngineLow_004.mp3',
            '/audio/sfx/spaceEngineSmall_000.mp3', '/audio/sfx/spaceEngineSmall_001.mp3', '/audio/sfx/spaceEngineSmall_002.mp3', '/audio/sfx/spaceEngineSmall_003.mp3', '/audio/sfx/spaceEngineSmall_004.mp3',
            '/audio/sfx/spaceEngine_000.mp3', '/audio/sfx/spaceEngine_001.mp3', '/audio/sfx/spaceEngine_002.mp3', '/audio/sfx/spaceEngine_003.mp3',
            // Thrusters
            '/audio/sfx/thrusterFire_000.mp3', '/audio/sfx/thrusterFire_001.mp3', '/audio/sfx/thrusterFire_002.mp3', '/audio/sfx/thrusterFire_003.mp3', '/audio/sfx/thrusterFire_004.mp3',
            // Original Nova Swarm polish
            '/audio/sfx/nova-swarm/intro_panel_whoosh.mp3',
            '/audio/sfx/nova-swarm/coin_portal_open.mp3',
            '/audio/sfx/nova-swarm/swarm_chatter_stinger.mp3',
            '/audio/sfx/nova-swarm/boss_reveal_stinger.mp3',
            '/audio/sfx/nova-swarm/start_game_confirm.mp3',
            '/audio/sfx/nova-swarm/nova_boss_arrival_alarm.mp3',
            '/audio/sfx/nova-swarm/nova_boss_entrance_impact.mp3',
            '/audio/sfx/nova-swarm/nova_boss_charge_lattice.mp3',
            '/audio/sfx/nova-swarm/nova_boss_damage_armor_crack.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_cascade.mp3',
            '/audio/sfx/nova-swarm/nova_bonus_core_jackpot.mp3',
            '/audio/sfx/nova-swarm/nova_shield_snap.mp3',
            '/audio/sfx/nova-swarm/nova_rank_fanfare.mp3',
            '/audio/sfx/nova-swarm/nova_highscore_chime.mp3',
            '/audio/sfx/nova-swarm/nova_global_near_fanfare.mp3',
            '/audio/sfx/nova-swarm/nova_global_slot_fanfare.mp3',
            '/audio/sfx/nova-swarm/nova_top10_fanfare.mp3',
            '/audio/sfx/nova-swarm/nova_top3_fanfare.mp3',
            '/audio/sfx/nova-swarm/nova_number_one_fanfare.mp3',
            '/audio/sfx/nova-swarm/nova_fuel_ship_spawn.mp3',
            '/audio/sfx/nova-swarm/nova_fuel_ship_heal.mp3',
            '/audio/sfx/nova-swarm/nova_fuel_ship_pop.mp3',
            '/audio/sfx/nova-swarm/nova_danger_mid_pop.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_sonia.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_forge.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_kurt.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_needle.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_vortex.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_jester.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_carrier.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_monolith.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_choir.mp3',
            '/audio/sfx/nova-swarm/nova_boss_death_clock.mp3',
            '/audio/sfx/nova-swarm/nova_overrun_clear_coronation.mp3',
            '/audio/sfx/nova-swarm/nova_overrun_clear_shockwave.mp3',
            '/audio/sfx/nova-swarm/nova_enemy_pew_cluster.mp3',
            '/audio/sfx/nova-swarm/nova_player_hit_crackle.mp3',
            '/audio/sfx/nova-swarm/nova_life_extend_bloom.mp3',
            '/audio/sfx/nova-swarm/nova_wave_clear_sweep.mp3',
            '/audio/sfx/nova-swarm/nova_game_over_drop.mp3',
            '/audio/sfx/nova-swarm/nova_combo_tick.mp3',
            '/audio/sfx/nova-swarm/nova_combo_breakout.mp3',
            '/audio/sfx/nova-swarm/nova_boss_phase_surge.mp3',
            '/audio/sfx/nova-swarm/nova_level_clear_medal.mp3',
            '/audio/sfx/nova-swarm/nova_menu_tick.mp3',
            '/audio/sfx/nova-swarm/nova_codex_tick.wav',
            '/audio/sfx/nova-swarm/nova_pause_in.mp3',
            '/audio/sfx/nova-swarm/nova_pause_out.mp3',
            '/audio/sfx/nova-swarm/nova_ship_lock_chime.mp3',
            '/audio/sfx/nova-swarm/nova_chain_lightning_arc.mp3',
            '/audio/sfx/nova-swarm/nova_magnet_pull_warble.mp3',
            '/audio/sfx/nova-swarm/nova_ghost_phase_shift.mp3',
            '/audio/sfx/nova-swarm/nova_time_slow_warp.mp3',
            '/audio/sfx/nova-swarm/nova_drone_launch_blip.mp3',
            '/audio/sfx/nova-swarm/nova_orbital_strike_charge.mp3',
            '/audio/sfx/nova-swarm/nova_tractor_lock_charge.mp3',
            '/audio/sfx/nova-swarm/nova_tractor_beam_active.mp3',
            '/audio/sfx/nova-swarm/nova_tractor_break_bloom.mp3',
            '/audio/sfx/nova-swarm/nova_boss_beam_telegraph.mp3',
            '/audio/sfx/nova-swarm/nova_boss_beam_fire.mp3',
            '/audio/sfx/nova-swarm/nova_boss_web_telegraph.mp3',
            '/audio/sfx/nova-swarm/nova_boss_web_snap.mp3',
            '/audio/sfx/nova-swarm/nova_boss_net_telegraph.mp3',
            '/audio/sfx/nova-swarm/nova_boss_net_burst.mp3',
            '/audio/sfx/nova-swarm/nova_boss_hazard_impact.mp3',
            '/audio/sfx/nova-swarm/nova_elite_spawn_alert.mp3',
            '/audio/sfx/nova-swarm/nova_elite_special_charge.mp3',
            '/audio/sfx/nova-swarm/nova_elite_death.mp3',
            '/audio/sfx/nova-swarm/nova_tractor_capture_sting.mp3',
            '/audio/sfx/nova-swarm/nova_tractor_debuff_apply.mp3',
            '/audio/sfx/nova-swarm/nova_tractor_debuff_expire.mp3',
            '/audio/sfx/nova-swarm/nova_elite_tractor_puller_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_shield_projector_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_drone_carrier_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_mine_layer_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_sniper_rail_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_jammer_disruptor_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_repair_healer_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_splitter_clone_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_barrier_projector_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_vortex_gravity_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_burst_artillery_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_phase_raider_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_lane_blocker_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_orb_webber_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_missile_frigate_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_mirror_decoy_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_pulse_emp_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_anchor_turret_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_escort_commander_active.mp3',
            '/audio/sfx/nova-swarm/nova_elite_hunter_active.mp3'
        ]
    },

    // Weapon Mappings (Gameplay Logic - using keys from above or direct paths)
    enemyWeaponMap: {
        'chaser': { projectile: '/sprites/xtra-sprites/Lasers/laserRed13.png', flashColor: 0xff0000, impactColor: 0xff0000, sound: 'enemy_shoot' },
        'bruiser': { projectile: '/sprites/xtra-sprites/Lasers/laserGreen08.png', flashColor: 0x00ff00, impactColor: 0x00ff00, sound: 'enemy_shoot' },
        'turret': { projectile: '/sprites/xtra-sprites/Lasers/laserBlue11.png', flashColor: 0x0088ff, impactColor: 0x0088ff, sound: 'enemy_shoot' },
        'striker': { projectile: '/sprites/xtra-sprites/Lasers/laserRed15.png', flashColor: 0xff4400, impactColor: 0xff4400, sound: 'enemy_shoot' },
        'trickster': { projectile: '/sprites/xtra-sprites/Lasers/laserBlue05.png', flashColor: 0xff00ff, impactColor: 0xff00ff, sound: 'enemy_shoot' },
        'bonus_challenge': { projectile: '/sprites/xtra-sprites/Lasers/laserGreen08.png', flashColor: 0x00ff00, impactColor: 0x00ff00, sound: 'enemy_shoot' }
    },

    // Extras Bundles (Curated, Scene-Scoped)
    extras: {
        // Start Screen Extras - subtle background decorations
        start: {
            decorSprites: [
                '/sprites/xtra-sprites/Effects/star1.png',
                '/sprites/xtra-sprites/Effects/star2.png',
                '/sprites/xtra-sprites/Effects/star3.png'
            ]
        },

        // Play Scene Extras - impact effects and variety
        play: {
            impactEffects: [
                '/sprites/xtra-sprites/Effects/fire00.png',
                '/sprites/xtra-sprites/Effects/fire03.png',
                '/sprites/xtra-sprites/Effects/fire08.png',
                '/sprites/Effects/spaceEffects_001.png',
                '/sprites/Effects/spaceEffects_003.png',
                '/sprites/Effects/spaceEffects_007.png'
            ],
            particles: [
                '/sprites/xtra-sprites/Effects/star1.png',
                '/sprites/xtra-sprites/Effects/speed.png'
            ]
        },

        // Highscore Scene Extras - party mode enhancements
        highscore: {
            confettiSprites: [
                '/sprites/xtra-sprites/Effects/star1.png',
                '/sprites/xtra-sprites/Effects/star2.png',
                '/sprites/xtra-sprites/Effects/star3.png'
            ],
            celebrationSprites: [
                '/sprites/xtra-sprites/Effects/shield1.png',
                '/sprites/xtra-sprites/Effects/shield2.png'
            ]
        },

        // Audio Extras - additional SFX variety
        audio: {
            hitVariants: [
                '/audio/sfx/impactMetal_000.mp3',
                '/audio/sfx/laserRetro_000.mp3'
            ],
            uiSounds: [
                '/audio/sfx/computerNoise_000.mp3'
            ]
        },

        // Hijacker enemy feature (tractor-beam special enemy)
        hijacker: {
            ships: [
                '/art/generated/nova-swarm/enemies/nova-hijacker-tractor-craft-20260518.png'
            ],
            beams: [
                '/sprites/xtra-sprites/Parts/beam0.png',
                '/sprites/xtra-sprites/Parts/beam1.png',
                '/sprites/xtra-sprites/Parts/beam2.png',
                '/sprites/xtra-sprites/Parts/beam3.png',
                '/sprites/xtra-sprites/Parts/beam4.png',
                '/sprites/xtra-sprites/Parts/beam5.png',
                '/sprites/xtra-sprites/Parts/beam6.png',
                '/sprites/xtra-sprites/Parts/beamLong1.png',
                '/sprites/xtra-sprites/Parts/beamLong2.png'
            ],
            effects: {
                capture: [
                    '/sprites/xtra-sprites/Effects/shield1.png',
                    '/sprites/xtra-sprites/Effects/shield2.png',
                    '/sprites/xtra-sprites/Effects/shield3.png'
                ],
                rescue: [
                    '/sprites/xtra-sprites/Effects/star1.png',
                    '/sprites/xtra-sprites/Effects/star2.png',
                    '/sprites/xtra-sprites/Effects/star3.png'
                ]
            },
            audio: {
                spawn: '/audio/voice/mission-control/mission_control_hijacker_01.mp3',
                beamLoop: '/audio/sfx/forceField_000.mp3',
                captureHit: '/audio/sfx/impactMetal_000.mp3',
                rescueSuccess: '/audio/voice/mission-control/mission_control_powerup.mp3',
                doubleShip: '/audio/sfx/thrusterFire_000.mp3'
            }
        }
    }
};
