import { AssetManifest } from '../assets/assetManifest.js';

// Safe lookup helpers
const getMusic = (partial) => AssetManifest.audio.music.find(p => p.includes(partial)) || `/audio/music/${partial}.mp3`;
const getSfx = (partial) => {
    const match = AssetManifest.audio.sfx.find(p => p.includes(partial));
    if (!match) {
        // Warn only in development/console if possible, but for now just return safe fallback
        // Return a known safe sound to prevent crashes
        console.warn(`[SoundCatalog] Missing SFX: ${partial}`);
        return AssetManifest.audio.sfx[0]; // computerNoise_000
    }
    return match;
};

const getVoice = (partial) => {
    const match = AssetManifest.audio.voice.find(p => p.includes(partial));
    return match || null;
};

// Music Pools
const MENU_POOL = [
    getMusic('Brave Pilots'),
    getMusic('SkyFire')
];

const INTRO_POOL = [
    getMusic('nova_swarm_intro_overture')
];

const SCOREBOARD_POOL = [
    getMusic('Space Heroes'),
    getMusic('SkyFire')
];

const GAMEPLAY_POOL = [
    getMusic('bgm_v2'), // Forced start track
    getMusic('Alone Against Enemy'),
    getMusic('Battle in the Stars'),
    getMusic('Rain of Lasers'),
    getMusic('Without Fear')
];

const BOSS_POOL = [
    getMusic('DeathMatch')
];

const GAME_OVER_POOL = [
    getMusic('Defeated')
];

const VICTORY_POOL = [
    getMusic('Victory Tune')
];

export const MUSIC_PLAYLISTS = {
    intro: INTRO_POOL,
    menu: MENU_POOL,
    scoreboard: SCOREBOARD_POOL,
    gameplay: GAMEPLAY_POOL,
    boss: BOSS_POOL,
    gameover: GAME_OVER_POOL,
    victory: VICTORY_POOL
};

export const SFX_MIX = {
    shoot_small: { volume: 0.78, minIntervalMs: 42 },
    shoot_alt: { volume: 0.7, minIntervalMs: 50 },
    shoot_heavy: { volume: 0.82, minIntervalMs: 80 },
    enemy_explode: { volume: 0.68, minIntervalMs: 35 },
    boss_explode: { volume: 0.95, minIntervalMs: 300 },
    hit: { volume: 0.48, minIntervalMs: 45 },
    impactMetal: { volume: 0.42, minIntervalMs: 60 },
    shield: { volume: 0.52, minIntervalMs: 140 },
    ui_open: { volume: 0.28, minIntervalMs: 120 },
    ui_close: { volume: 0.24, minIntervalMs: 120 },
    pickup: { volume: 0.62, minIntervalMs: 90 },
    achievement: { volume: 0.68, minIntervalMs: 450 },
    enemy_shoot: { volume: 0.18, minIntervalMs: 90 },
    computerNoise: { volume: 0.22, minIntervalMs: 350 },
    thrusterFire: { volume: 0.18, minIntervalMs: 240 },
    doorClose: { volume: 0.24, minIntervalMs: 120 },
    spaceEngine: { volume: 0.18, minIntervalMs: 350 },
    shoot: { volume: 0.72, minIntervalMs: 55 },
    explosion: { volume: 0.75, minIntervalMs: 80 },
    powerup: { volume: 0.72, minIntervalMs: 150 },
    menuSelect: { volume: 0.3, minIntervalMs: 120 },
    playerHit: { volume: 0.78, minIntervalMs: 220 },
    levelComplete: { volume: 0.45, minIntervalMs: 700 },
    forceField: { volume: 0.5, minIntervalMs: 140 },
    shield_up: { volume: 0.55, minIntervalMs: 140 },
    spawn_special: { volume: 0.55, minIntervalMs: 600 },
    life_up: { volume: 0.7, minIntervalMs: 700 },
    explosionCrunch: { volume: 0.74, minIntervalMs: 80 },
    boss_spawn: { volume: 0.75, minIntervalMs: 800 }
    ,
    intro_panel_whoosh: { volume: 0.58, minIntervalMs: 350 },
    coin_portal_open: { volume: 0.74, minIntervalMs: 900 },
    swarm_chatter_stinger: { volume: 0.58, minIntervalMs: 700 },
    boss_reveal_stinger: { volume: 0.82, minIntervalMs: 1200 },
    start_game_confirm: { volume: 0.7, minIntervalMs: 500 },
    nova_boss_arrival_alarm: { volume: 0.72, minIntervalMs: 1200 },
    nova_bonus_core_jackpot: { volume: 0.66, minIntervalMs: 180 },
    nova_shield_snap: { volume: 0.54, minIntervalMs: 140 },
    nova_rank_fanfare: { volume: 0.62, minIntervalMs: 800 },
    nova_highscore_chime: { volume: 0.62, minIntervalMs: 500 },
    nova_enemy_pew_cluster: { volume: 0.2, minIntervalMs: 80 },
    nova_player_hit_crackle: { volume: 0.72, minIntervalMs: 220 },
    nova_life_extend_bloom: { volume: 0.66, minIntervalMs: 700 },
    nova_wave_clear_sweep: { volume: 0.54, minIntervalMs: 700 },
    nova_game_over_drop: { volume: 0.62, minIntervalMs: 1000 },
    combo_tick: { volume: 0.42, minIntervalMs: 180 },
    combo_breakout: { volume: 0.68, minIntervalMs: 650 },
    boss_phase_surge: { volume: 0.76, minIntervalMs: 900 },
    level_clear_medal: { volume: 0.62, minIntervalMs: 700 },
    menu_tick: { volume: 0.2, minIntervalMs: 70 },
    pause_in: { volume: 0.34, minIntervalMs: 250 },
    pause_out: { volume: 0.3, minIntervalMs: 250 },
    ship_lock_chime: { volume: 0.56, minIntervalMs: 500 },
    chain_lightning_arc: { volume: 0.45, minIntervalMs: 160 },
    magnet_pull: { volume: 0.5, minIntervalMs: 260 },
    ghost_phase_shift: { volume: 0.48, minIntervalMs: 450 },
    time_slow_warp: { volume: 0.48, minIntervalMs: 450 },
    drone_launch_blip: { volume: 0.46, minIntervalMs: 220 },
    orbital_strike_charge: { volume: 0.56, minIntervalMs: 600 }
};

export const VOICE_MIX = {
    intro_narrator_01: { volume: 0.9, duckFactor: 0.36, duckMs: 5200, cooldownMs: 0 },
    intro_narrator_02: { volume: 0.9, duckFactor: 0.36, duckMs: 5400, cooldownMs: 0 },
    intro_narrator_03: { volume: 0.9, duckFactor: 0.36, duckMs: 6200, cooldownMs: 0 },
    intro_narrator_04: { volume: 0.9, duckFactor: 0.34, duckMs: 5200, cooldownMs: 0 },
    mission_control_launch: { volume: 0.84, duckFactor: 0.42, duckMs: 2600, cooldownMs: 2600 },
    mission_control_level_start: { volume: 0.82, duckFactor: 0.46, duckMs: 2200, cooldownMs: 2400 },
    mission_control_wave_clear: { volume: 0.78, duckFactor: 0.52, duckMs: 1900, cooldownMs: 2800 },
    mission_control_boss_inbound: { volume: 0.9, duckFactor: 0.38, duckMs: 2800, cooldownMs: 3000 },
    mission_control_life_low: { volume: 0.86, duckFactor: 0.45, duckMs: 2400, cooldownMs: 5200 },
    mission_control_powerup: { volume: 0.64, duckFactor: 0.62, duckMs: 1200, cooldownMs: 3800 },
    mission_control_victory: { volume: 0.86, duckFactor: 0.42, duckMs: 2800, cooldownMs: 3200 },
    mission_control_game_over: { volume: 0.86, duckFactor: 0.42, duckMs: 2800, cooldownMs: 3200 },
    mission_complete: { volume: 0.72, duckFactor: 0.56, duckMs: 1500, cooldownMs: 22000 },
    wave_clear: { volume: 0.68, duckFactor: 0.58, duckMs: 1300, cooldownMs: 22000 },
    round: { volume: 0.66, duckFactor: 0.6, duckMs: 1200, cooldownMs: 22000 },
    powerup: { volume: 0.58, duckFactor: 0.66, duckMs: 900, cooldownMs: 1600 },
    game_over: { volume: 0.84, duckFactor: 0.44, duckMs: 2500, cooldownMs: 3200 },
    you_win: { volume: 0.84, duckFactor: 0.44, duckMs: 2500, cooldownMs: 3200 },
    war_target: { volume: 0.58, duckFactor: 0.68, duckMs: 900, cooldownMs: 2600 },
    war_look_out: { volume: 0.6, duckFactor: 0.66, duckMs: 1000, cooldownMs: 2800 }
};

export const VOICE_EVENT_FALLBACKS = {
    ready: 'ready.mp3',
    go: 'go.mp3',
    wave_clear: 'objective_achieved.mp3',
    mission_complete: 'mission_completed.mp3',
    war_target: 'war_target_engaged.mp3',
    war_look_out: 'war_look_out.mp3',
    round: 'round.mp3',
    powerup: 'power_up.mp3',
    game_over: 'game_over.mp3',
    you_win: 'you_win.mp3',
    mission_control_launch: 'mission_control_launch.mp3',
    mission_control_level_start: 'mission_control_level_start.mp3',
    mission_control_wave_clear: 'mission_control_wave_clear.mp3',
    mission_control_boss_inbound: 'mission_control_boss_inbound.mp3',
    mission_control_life_low: 'mission_control_life_low.mp3',
    mission_control_powerup: 'mission_control_powerup.mp3',
    mission_control_victory: 'mission_control_victory.mp3',
    mission_control_game_over: 'mission_control_game_over.mp3',
    intro_narrator_01: 'intro_narrator_01.mp3',
    intro_narrator_02: 'intro_narrator_02.mp3',
    intro_narrator_03: 'intro_narrator_03.mp3',
    intro_narrator_04: 'intro_narrator_04.mp3'
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
        getSfx('lowFrequency_explosion_000'), getSfx('lowFrequency_explosion_001')
    ],
    'hit': [
        getSfx('impactMetal_000'), getSfx('impactMetal_001'), getSfx('impactMetal_002'), getSfx('impactMetal_003'), getSfx('impactMetal_004')
    ],
    'impactMetal': [
        getSfx('impactMetal_000'), getSfx('impactMetal_001'), getSfx('impactMetal_002'), getSfx('impactMetal_003'), getSfx('impactMetal_004')
    ],
    'shield': [
        getSfx('forceField_000'), getSfx('forceField_001'), getSfx('forceField_002'), getSfx('forceField_003'), getSfx('forceField_004')
    ],
    'ui_open': [
        getSfx('nova_menu_tick'),
        getSfx('doorOpen_000'), getSfx('doorOpen_001')
    ],
    'ui_close': [
        getSfx('nova_pause_out'),
        getSfx('doorClose_000'), getSfx('doorClose_001'), getSfx('doorClose_002')
    ],
    'pickup': [
        getSfx('nova_bonus_core_jackpot'),
        getSfx('forceField_000'),
        getSfx('forceField_001')
    ],
    'achievement': [
        getSfx('nova_highscore_chime'),
        getSfx('doorOpen_001'),
        getSfx('forceField_003')
    ],
    'enemy_shoot': [
        getSfx('nova_enemy_pew_cluster'), getSfx('laserRetro_000'), getSfx('laserRetro_001'), getSfx('laserSmall_003')
    ],
    // Direct matches from manifest
    'computerNoise': [getSfx('computerNoise_000')],
    'thrusterFire': [getSfx('thrusterFire_000')],
    'doorClose': [getSfx('doorClose_000')],
    'spaceEngine': [getSfx('spaceEngine_000')],

    // Mappings and Aliases
    'shoot': [getSfx('laserSmall_000')],
    'explosion': [getSfx('explosionCrunch_000')],
    'menuSelect': [getSfx('nova_menu_tick'), getSfx('doorOpen_000')],
    'playerHit': [getSfx('nova_player_hit_crackle'), getSfx('impactMetal_000')],
    'levelComplete': [getSfx('nova_level_clear_medal'), getSfx('nova_wave_clear_sweep'), getSfx('nova_rank_fanfare')],

    // Aliases for inconsistent call sites
    'forceField': [getSfx('nova_shield_snap'), getSfx('forceField_000')], // Alias for shield/pickup reuse
    'shield_up': [getSfx('nova_shield_snap'), getSfx('forceField_000')],
    'life_up': [getSfx('nova_life_extend_bloom'), getSfx('doorOpen_002')],
    'explosionCrunch': [getSfx('explosionCrunch_000'), getSfx('explosionCrunch_001'), getSfx('explosionCrunch_002')],

    // Refined Categories
    'spawn_special': [
        getSfx('spaceEngineLarge_000'),
        getSfx('spaceEngineLarge_001'),
        getSfx('forceField_002')
    ],
    'powerup': [
        getSfx('nova_bonus_core_jackpot'),
        getSfx('forceField_001'), // Sharp
        getSfx('forceField_002'), // Resonant
        getSfx('forceField_003')  // High pitch
    ],
    'chain_lightning_arc': [
        getSfx('nova_chain_lightning_arc')
    ],
    'magnet_pull': [
        getSfx('nova_magnet_pull_warble')
    ],
    'ghost_phase_shift': [
        getSfx('nova_ghost_phase_shift')
    ],
    'time_slow_warp': [
        getSfx('nova_time_slow_warp')
    ],
    'drone_launch_blip': [
        getSfx('nova_drone_launch_blip')
    ],
    'orbital_strike_charge': [
        getSfx('nova_orbital_strike_charge')
    ],
    'taunt': [
        getVoice('war_cover_me'),
        getVoice('war_get_down'),
        getVoice('war_go_go_go'),
        getVoice('war_look_out'),
        getVoice('war_watch_my_back'),
        getVoice('war_target_engaged')
    ].filter(Boolean),
    'intro_voice': [
        getVoice('ready'),
        getVoice('go'),
        getVoice('mission_control_launch')
    ].filter(Boolean),
    'mission_control_launch': [
        getVoice('mission_control_launch')
    ].filter(Boolean),
    'mission_control_level_start': [
        getVoice('mission_control_level_start')
    ].filter(Boolean),
    'mission_control_wave_clear': [
        getVoice('mission_control_wave_clear')
    ].filter(Boolean),
    'mission_control_boss_inbound': [
        getVoice('mission_control_boss_inbound')
    ].filter(Boolean),
    'mission_control_life_low': [
        getVoice('mission_control_life_low')
    ].filter(Boolean),
    'mission_control_powerup': [
        getVoice('mission_control_powerup')
    ].filter(Boolean),
    'mission_control_victory': [
        getVoice('mission_control_victory')
    ].filter(Boolean),
    'mission_control_game_over': [
        getVoice('mission_control_game_over')
    ].filter(Boolean),
    'boss_spawn': [
        getSfx('nova_boss_arrival_alarm'),
        getSfx('spaceEngineLow_000'),
        getSfx('spaceEngineLow_001')
    ],
    'intro_panel_whoosh': [
        getSfx('intro_panel_whoosh')
    ],
    'coin_portal_open': [
        getSfx('coin_portal_open')
    ],
    'swarm_chatter_stinger': [
        getSfx('swarm_chatter_stinger')
    ],
    'boss_reveal_stinger': [
        getSfx('boss_reveal_stinger')
    ],
    'start_game_confirm': [
        getSfx('start_game_confirm')
    ],
    'nova_boss_arrival_alarm': [
        getSfx('nova_boss_arrival_alarm')
    ],
    'nova_bonus_core_jackpot': [
        getSfx('nova_bonus_core_jackpot')
    ],
    'nova_shield_snap': [
        getSfx('nova_shield_snap')
    ],
    'nova_rank_fanfare': [
        getSfx('nova_rank_fanfare')
    ],
    'nova_highscore_chime': [
        getSfx('nova_highscore_chime')
    ],
    'nova_enemy_pew_cluster': [
        getSfx('nova_enemy_pew_cluster')
    ],
    'nova_player_hit_crackle': [
        getSfx('nova_player_hit_crackle')
    ],
    'nova_life_extend_bloom': [
        getSfx('nova_life_extend_bloom')
    ],
    'nova_wave_clear_sweep': [
        getSfx('nova_wave_clear_sweep')
    ],
    'nova_game_over_drop': [
        getSfx('nova_game_over_drop')
    ],
    'combo_tick': [
        getSfx('nova_combo_tick')
    ],
    'combo_breakout': [
        getSfx('nova_combo_breakout')
    ],
    'boss_phase_surge': [
        getSfx('nova_boss_phase_surge')
    ],
    'level_clear_medal': [
        getSfx('nova_level_clear_medal')
    ],
    'menu_tick': [
        getSfx('nova_menu_tick')
    ],
    'pause_in': [
        getSfx('nova_pause_in')
    ],
    'pause_out': [
        getSfx('nova_pause_out')
    ],
    'ship_lock_chime': [
        getSfx('nova_ship_lock_chime')
    ],
    'nova_chain_lightning_arc': [
        getSfx('nova_chain_lightning_arc')
    ],
    'nova_magnet_pull_warble': [
        getSfx('nova_magnet_pull_warble')
    ],
    'nova_ghost_phase_shift': [
        getSfx('nova_ghost_phase_shift')
    ],
    'nova_time_slow_warp': [
        getSfx('nova_time_slow_warp')
    ],
    'nova_drone_launch_blip': [
        getSfx('nova_drone_launch_blip')
    ],
    'nova_orbital_strike_charge': [
        getSfx('nova_orbital_strike_charge')
    ],
    'intro_narrator_01': [
        getVoice('intro_narrator_01')
    ].filter(Boolean),
    'intro_narrator_02': [
        getVoice('intro_narrator_02')
    ].filter(Boolean),
    'intro_narrator_03': [
        getVoice('intro_narrator_03')
    ].filter(Boolean),
    'intro_narrator_04': [
        getVoice('intro_narrator_04')
    ]
};
