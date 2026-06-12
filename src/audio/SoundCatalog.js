import { AssetManifest } from '../assets/assetManifest.js';
import { gameOverCtaVoiceLines } from '../config/GameOverCtaVoiceLines.js';

// Safe lookup helpers
const getMusic = (partial) => {
    const match = AssetManifest.audio.music.find(p => p.includes(partial));
    if (match) return match;
    const prefix = partial.startsWith('nova_swarm_') ? '/audio/music/nova-swarm' : '/audio/music';
    return `${prefix}/${partial}.mp3`;
};
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

const getVoiceFile = (filename) => {
    const match = AssetManifest.audio.voice.find(p => p.endsWith(`/${filename}`));
    return match || null;
};

const getVoicePool = (...filenames) => filenames.map(getVoiceFile).filter(Boolean);

const missionControlPool = (base, alternateCount = 2) => getVoicePool(
    `${base}.mp3`,
    ...Array.from({ length: alternateCount }, (_, index) => `${base}_alt${String(index + 1).padStart(2, '0')}.mp3`)
);

const numberedVoicePool = (base, count) => getVoicePool(
    ...Array.from({ length: count }, (_, index) => `${base}_${String(index + 1).padStart(2, '0')}.mp3`)
);

const paddedNumberedVoicePool = (base, count, width = 3) => getVoicePool(
    ...Array.from({ length: count }, (_, index) => `${base}_${String(index + 1).padStart(width, '0')}.mp3`)
);

const GAME_OVER_CTA_VOICE_CATALOG = Object.fromEntries(
    gameOverCtaVoiceLines.map((line) => [line.id, [getVoiceFile(`${line.id}.mp3`)].filter(Boolean)])
);

const GENERATED_MENU_POOL = [
    getMusic('nova_swarm_menu_neon_cabinet'),
    getMusic('nova_swarm_menu_starcoin_parade')
];

const GENERATED_INTRO_POOL = [
    getMusic('nova_swarm_intro_overture')
];

const GENERATED_SCOREBOARD_POOL = [
    getMusic('nova_swarm_scoreboard_trophy_orbit'),
    getMusic('nova_swarm_menu_neon_cabinet')
];

const GENERATED_GAMEPLAY_POOL = [
    getMusic('nova_swarm_gameplay_laser_lane'),
    getMusic('nova_swarm_gameplay_comet_chase'),
    getMusic('nova_swarm_gameplay_orbit_breaker'),
    getMusic('nova_swarm_gameplay_bonus_heat')
];

const GENERATED_BOSS_POOL = [
    getMusic('nova_swarm_boss_gate_overdrive'),
    getMusic('nova_swarm_boss_cabinet_judgement')
];

const GENERATED_GAME_OVER_POOL = [
    getMusic('nova_swarm_gameover_last_coin')
];

const GENERATED_VICTORY_POOL = [
    getMusic('nova_swarm_victory_star_receipts')
];

const CLASSIC_MENU_POOL = [
    getMusic('Brave Pilots'),
    getMusic('SkyFire')
];

const CLASSIC_INTRO_POOL = [
    getMusic('nova_swarm_intro_overture')
];

const CLASSIC_SCOREBOARD_POOL = [
    getMusic('Space Heroes'),
    getMusic('SkyFire')
];

const CLASSIC_GAMEPLAY_POOL = [
    getMusic('bgm_v2'), // Forced start track
    getMusic('Alone Against Enemy'),
    getMusic('Battle in the Stars'),
    getMusic('Rain of Lasers'),
    getMusic('Without Fear')
];

const CLASSIC_BOSS_POOL = [
    getMusic('DeathMatch')
];

const CLASSIC_GAME_OVER_POOL = [
    getMusic('Defeated')
];

const CLASSIC_VICTORY_POOL = [
    getMusic('Victory Tune')
];

export const MUSIC_PACKS = {
    generated: 'generated',
    classic: 'classic'
};

export const MUSIC_PLAYLISTS_BY_PACK = {
    generated: {
        intro: GENERATED_INTRO_POOL,
        menu: GENERATED_MENU_POOL,
        scoreboard: GENERATED_SCOREBOARD_POOL,
        gameplay: GENERATED_GAMEPLAY_POOL,
        boss: GENERATED_BOSS_POOL,
        gameover: GENERATED_GAME_OVER_POOL,
        victory: GENERATED_VICTORY_POOL
    },
    classic: {
        intro: CLASSIC_INTRO_POOL,
        menu: CLASSIC_MENU_POOL,
        scoreboard: CLASSIC_SCOREBOARD_POOL,
        gameplay: CLASSIC_GAMEPLAY_POOL,
        boss: CLASSIC_BOSS_POOL,
        gameover: CLASSIC_GAME_OVER_POOL,
        victory: CLASSIC_VICTORY_POOL
    }
};

export function normalizeMusicPack(pack) {
    return pack === MUSIC_PACKS.generated ? MUSIC_PACKS.generated : MUSIC_PACKS.classic;
}

export function getMusicPlaylists(pack = MUSIC_PACKS.classic) {
    return MUSIC_PLAYLISTS_BY_PACK[normalizeMusicPack(pack)];
}

export const MUSIC_PLAYLISTS = {
    intro: [...GENERATED_INTRO_POOL, ...CLASSIC_INTRO_POOL],
    menu: [...GENERATED_MENU_POOL, ...CLASSIC_MENU_POOL],
    scoreboard: [...GENERATED_SCOREBOARD_POOL, ...CLASSIC_SCOREBOARD_POOL],
    gameplay: [...GENERATED_GAMEPLAY_POOL, ...CLASSIC_GAMEPLAY_POOL],
    boss: [...GENERATED_BOSS_POOL, ...CLASSIC_BOSS_POOL],
    gameover: [...GENERATED_GAME_OVER_POOL, ...CLASSIC_GAME_OVER_POOL],
    victory: [...GENERATED_VICTORY_POOL, ...CLASSIC_VICTORY_POOL]
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
    codex_open: { volume: 0.18, minIntervalMs: 180 },
    codex_move: { volume: 0.12, minIntervalMs: 120 },
    codex_back: { volume: 0.16, minIntervalMs: 180 },
    pickup: { volume: 0.62, minIntervalMs: 90 },
    achievement: { volume: 0.68, minIntervalMs: 450 },
    enemy_shoot: { volume: 0.18, minIntervalMs: 90 },
    enemy_threat_soft_warn: { volume: 0.12, minIntervalMs: 1800 },
    computerNoise: { volume: 0.22, minIntervalMs: 350 },
    thrusterFire: { volume: 0.18, minIntervalMs: 240 },
    doorClose: { volume: 0.24, minIntervalMs: 120 },
    spaceEngine: { volume: 0.18, minIntervalMs: 350 },
    shoot: { volume: 0.72, minIntervalMs: 55 },
    explosion: { volume: 0.75, minIntervalMs: 80 },
    powerup: { volume: 0.72, minIntervalMs: 150 },
    powerup_pickup: { volume: 0.56, minIntervalMs: 120 },
    menuSelect: { volume: 0.3, minIntervalMs: 120 },
    playerHit: { volume: 0.78, minIntervalMs: 220 },
    levelComplete: { volume: 0.45, minIntervalMs: 700 },
    forceField: { volume: 0.5, minIntervalMs: 140 },
    shield_up: { volume: 0.55, minIntervalMs: 140 },
    spawn_special: { volume: 0.55, minIntervalMs: 600 },
    life_up: { volume: 0.7, minIntervalMs: 700 },
    explosionCrunch: { volume: 0.74, minIntervalMs: 80 },
    boss_spawn: { volume: 0.75, minIntervalMs: 800 },
    boss_entrance_impact: { volume: 0.78, minIntervalMs: 1200 },
    boss_charge_lattice: { volume: 0.5, minIntervalMs: 760 },
    boss_damage_armor_crack: { volume: 0.36, minIntervalMs: 115 },
    boss_death_cascade: { volume: 0.88, minIntervalMs: 2500 },
    intro_panel_whoosh: { volume: 0.58, minIntervalMs: 350 },
    coin_portal_open: { volume: 0.74, minIntervalMs: 900 },
    swarm_chatter_stinger: { volume: 0.58, minIntervalMs: 700 },
    boss_reveal_stinger: { volume: 0.82, minIntervalMs: 1200 },
    start_game_confirm: { volume: 0.7, minIntervalMs: 500 },
    nova_boss_arrival_alarm: { volume: 0.72, minIntervalMs: 1200 },
    nova_boss_entrance_impact: { volume: 0.78, minIntervalMs: 1200 },
    nova_boss_charge_lattice: { volume: 0.5, minIntervalMs: 760 },
    nova_boss_damage_armor_crack: { volume: 0.36, minIntervalMs: 115 },
    nova_boss_death_cascade: { volume: 0.88, minIntervalMs: 2500 },
    nova_bonus_core_jackpot: { volume: 0.66, minIntervalMs: 180 },
    nova_shield_snap: { volume: 0.54, minIntervalMs: 140 },
    nova_rank_fanfare: { volume: 0.62, minIntervalMs: 800 },
    nova_highscore_chime: { volume: 0.62, minIntervalMs: 500 },
    nova_global_near_fanfare: { volume: 0.68, minIntervalMs: 900 },
    nova_global_slot_fanfare: { volume: 0.84, minIntervalMs: 900 },
    nova_top10_fanfare: { volume: 0.9, minIntervalMs: 900 },
    nova_top3_fanfare: { volume: 0.96, minIntervalMs: 900 },
    nova_number_one_fanfare: { volume: 1.05, minIntervalMs: 900 },
    nova_fuel_ship_spawn: { volume: 0.66, minIntervalMs: 900 },
    nova_fuel_ship_heal: { volume: 0.72, minIntervalMs: 500 },
    nova_fuel_ship_pop: { volume: 0.62, minIntervalMs: 80 },
    nova_danger_mid_pop: { volume: 0.56, minIntervalMs: 90 },
    nova_boss_death_sonia: { volume: 0.82, minIntervalMs: 900 },
    nova_boss_death_forge: { volume: 0.82, minIntervalMs: 900 },
    nova_boss_death_kurt: { volume: 0.82, minIntervalMs: 900 },
    nova_boss_death_needle: { volume: 0.8, minIntervalMs: 900 },
    nova_boss_death_vortex: { volume: 0.82, minIntervalMs: 900 },
    nova_boss_death_jester: { volume: 0.78, minIntervalMs: 900 },
    nova_boss_death_carrier: { volume: 0.8, minIntervalMs: 900 },
    nova_boss_death_monolith: { volume: 0.84, minIntervalMs: 900 },
    nova_boss_death_choir: { volume: 0.8, minIntervalMs: 900 },
    nova_boss_death_clock: { volume: 0.82, minIntervalMs: 900 },
    overrun_clear_coronation: { volume: 0.88, minIntervalMs: 60000 },
    overrun_clear_shockwave: { volume: 0.86, minIntervalMs: 60000 },
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
    orbital_strike_charge: { volume: 0.56, minIntervalMs: 600 },
    tractor_lock_charge: { volume: 0.5, minIntervalMs: 700 },
    tractor_beam_active: { volume: 0.46, minIntervalMs: 850 },
    tractor_break_bloom: { volume: 0.68, minIntervalMs: 300 },
    tractor_capture_sting: { volume: 0.54, minIntervalMs: 650 },
    tractor_debuff_apply: { volume: 0.5, minIntervalMs: 700 },
    tractor_debuff_expire: { volume: 0.28, minIntervalMs: 700 },
    elite_spawn_alert: { volume: 0.62, minIntervalMs: 1400 },
    elite_special_charge: { volume: 0.46, minIntervalMs: 700 },
    elite_special_active: { volume: 0.48, minIntervalMs: 650 },
    elite_death: { volume: 0.58, minIntervalMs: 180 },
    elite_tractor_puller_active: { volume: 0.48, minIntervalMs: 650 },
    elite_shield_projector_active: { volume: 0.48, minIntervalMs: 650 },
    elite_drone_carrier_active: { volume: 0.48, minIntervalMs: 650 },
    elite_mine_layer_active: { volume: 0.48, minIntervalMs: 650 },
    elite_sniper_rail_active: { volume: 0.54, minIntervalMs: 650 },
    elite_jammer_disruptor_active: { volume: 0.46, minIntervalMs: 650 },
    elite_repair_healer_active: { volume: 0.44, minIntervalMs: 650 },
    elite_splitter_clone_active: { volume: 0.46, minIntervalMs: 650 },
    elite_barrier_projector_active: { volume: 0.48, minIntervalMs: 650 },
    elite_vortex_gravity_active: { volume: 0.5, minIntervalMs: 650 },
    elite_burst_artillery_active: { volume: 0.52, minIntervalMs: 650 },
    elite_phase_raider_active: { volume: 0.46, minIntervalMs: 650 },
    elite_lane_blocker_active: { volume: 0.5, minIntervalMs: 650 },
    elite_orb_webber_active: { volume: 0.48, minIntervalMs: 650 },
    elite_missile_frigate_active: { volume: 0.52, minIntervalMs: 650 },
    elite_mirror_decoy_active: { volume: 0.44, minIntervalMs: 650 },
    elite_pulse_emp_active: { volume: 0.5, minIntervalMs: 650 },
    elite_anchor_turret_active: { volume: 0.52, minIntervalMs: 650 },
    elite_escort_commander_active: { volume: 0.46, minIntervalMs: 650 },
    elite_hunter_active: { volume: 0.52, minIntervalMs: 650 },
    boss_beam_telegraph: { volume: 0.56, minIntervalMs: 700 },
    boss_beam_fire: { volume: 0.72, minIntervalMs: 700 },
    boss_web_telegraph: { volume: 0.48, minIntervalMs: 700 },
    boss_web_fire: { volume: 0.62, minIntervalMs: 700 },
    boss_net_telegraph: { volume: 0.5, minIntervalMs: 700 },
    boss_net_fire: { volume: 0.66, minIntervalMs: 700 },
    boss_hazard_impact: { volume: 0.58, minIntervalMs: 180 },
    trait_bonus_hit: { volume: 0.08, minIntervalMs: 650 },
    trait_wing_hit: { volume: 0.34, minIntervalMs: 120 },
    trait_pierce_hit: { volume: 0.32, minIntervalMs: 120 },
    trait_crit_splash: { volume: 0.46, minIntervalMs: 350 }
};

export const VOICE_MIX = {
    intro_narrator_01: { volume: 0.9, duckFactor: 0.36, duckMs: 4200, cooldownMs: 0 },
    intro_narrator_02: { volume: 0.9, duckFactor: 0.36, duckMs: 3600, cooldownMs: 0 },
    intro_narrator_03: { volume: 0.9, duckFactor: 0.36, duckMs: 3200, cooldownMs: 0 },
    intro_narrator_04: { volume: 0.9, duckFactor: 0.34, duckMs: 3600, cooldownMs: 0 },
    mission_control_launch: { volume: 0.86, duckFactor: 0.42, duckMs: 1900, cooldownMs: 2600, eventCooldownMs: 45000 },
    mission_control_level_start: { volume: 0.7, duckFactor: 0.58, duckMs: 1250, cooldownMs: 18000 },
    mission_control_wave_clear: { volume: 0.76, duckFactor: 0.52, duckMs: 1300, cooldownMs: 30000 },
    mission_control_boss_inbound: { volume: 0.88, duckFactor: 0.42, duckMs: 1800, cooldownMs: 14000 },
    boss_death_agony: { volume: 1.0, duckFactor: 0.42, duckMs: 1700, cooldownMs: 0, eventCooldownMs: 0 },
    mission_control_life_low: { volume: 0.88, duckFactor: 0.42, duckMs: 1800, cooldownMs: 18000 },
    mission_control_lives_max: { volume: 0.82, duckFactor: 0.48, duckMs: 1500, cooldownMs: 30000 },
    mission_control_powerup: { volume: 0.72, duckFactor: 0.52, duckMs: 900, cooldownMs: 28000 },
    mission_control_victory: { volume: 0.82, duckFactor: 0.48, duckMs: 1800, cooldownMs: 18000 },
    mission_control_game_over: { volume: 0.84, duckFactor: 0.44, duckMs: 2300, cooldownMs: 4200 },
    mission_control_ship_unlocked: { volume: 0.98, duckFactor: 0.34, duckMs: 3200, cooldownMs: 8000 },
    mission_control_ships_unlocked: { volume: 0.98, duckFactor: 0.34, duckMs: 3400, cooldownMs: 8000 },
    mission_control_combo: { volume: 0.72, duckFactor: 0.54, duckMs: 900, cooldownMs: 30000 },
    mission_control_local_highscore: { volume: 0.82, duckFactor: 0.46, duckMs: 2200, cooldownMs: 7000 },
    mission_control_global_highscore: { volume: 0.96, duckFactor: 0.32, duckMs: 3400, cooldownMs: 9000 },
    mission_control_global_close: { volume: 0.9, duckFactor: 0.42, duckMs: 2100, cooldownMs: 42000 },
    mission_control_top3_close: { volume: 0.94, duckFactor: 0.38, duckMs: 2300, cooldownMs: 42000 },
    mission_control_number_one_close: { volume: 0.98, duckFactor: 0.34, duckMs: 2600, cooldownMs: 42000 },
    mission_control_top3_highscore: { volume: 1.02, duckFactor: 0.28, duckMs: 3800, cooldownMs: 9000 },
    mission_control_number_one_highscore: { volume: 1.06, duckFactor: 0.24, duckMs: 4300, cooldownMs: 9000 },
    mission_control_near_miss: { volume: 0.84, duckFactor: 0.46, duckMs: 2300, cooldownMs: 9000 },
    mission_control_personal_best: { volume: 0.82, duckFactor: 0.48, duckMs: 2200, cooldownMs: 7000 },
    mission_control_restart: { volume: 0.72, duckFactor: 0.6, duckMs: 1100, cooldownMs: 7000, eventCooldownMs: 12000 },
    mission_control_hijacker: { volume: 0.76, duckFactor: 0.54, duckMs: 1500, cooldownMs: 24000 },
    mission_control_tractor_hijack: { volume: 0.8, duckFactor: 0.48, duckMs: 1300, cooldownMs: 26000 },
    mission_control_overrun_clear: { volume: 1.05, duckFactor: 0.28, duckMs: 4200, cooldownMs: 60000 },
    mission_control_overrun_clear_sector_10: { volume: 1.05, duckFactor: 0.28, duckMs: 4200, cooldownMs: 60000 },
    mission_control_overrun_clear_sector_20: { volume: 1.05, duckFactor: 0.28, duckMs: 4200, cooldownMs: 60000 },
    mission_control_overrun_clear_sector_30: { volume: 1.05, duckFactor: 0.28, duckMs: 4200, cooldownMs: 60000 },
    mission_control_overrun_clear_sector_40: { volume: 1.05, duckFactor: 0.28, duckMs: 4200, cooldownMs: 60000 },
    mission_control_overrun_clear_sector_50: { volume: 1.05, duckFactor: 0.28, duckMs: 4200, cooldownMs: 60000 },
    mission_control_overrun_clear_far_signal: { volume: 1.05, duckFactor: 0.28, duckMs: 4200, cooldownMs: 60000 },
    mission_control_credits: { volume: 0.9, duckFactor: 0.34, duckMs: 3600, cooldownMs: 0 }
};

export const VOICE_EVENT_FALLBACKS = {
    mission_control_launch: 'mission_control_launch.mp3',
    mission_control_level_start: 'mission_control_level_start.mp3',
    mission_control_wave_clear: 'mission_control_wave_clear.mp3',
    mission_control_boss_inbound: 'mission_control_boss_inbound.mp3',
    mission_control_life_low: 'mission_control_life_low.mp3',
    mission_control_lives_max: 'mission_control_lives_max.mp3',
    mission_control_powerup: 'mission_control_powerup.mp3',
    mission_control_victory: 'mission_control_victory.mp3',
    mission_control_game_over: 'mission_control_game_over.mp3',
    mission_control_ship_unlocked: 'mission_control_ship_unlocked_01.mp3',
    mission_control_ships_unlocked: 'mission_control_ships_unlocked_01.mp3',
    mission_control_combo: 'mission_control_combo_01.mp3',
    mission_control_local_highscore: 'mission_control_local_highscore_01.mp3',
    mission_control_global_highscore: 'mission_control_global_highscore_01.mp3',
    mission_control_global_close: 'mission_control_global_close_01.mp3',
    mission_control_top3_close: 'mission_control_top3_close_01.mp3',
    mission_control_number_one_close: 'mission_control_number_one_close_01.mp3',
    mission_control_top3_highscore: 'mission_control_top3_highscore_01.mp3',
    mission_control_number_one_highscore: 'mission_control_number_one_highscore_01.mp3',
    mission_control_near_miss: 'mission_control_near_miss_01.mp3',
    mission_control_personal_best: 'mission_control_personal_best_01.mp3',
    mission_control_restart: 'mission_control_restart_01.mp3',
    mission_control_hijacker: 'mission_control_hijacker_01.mp3',
    mission_control_tractor_hijack: 'mission_control_tractor_hijack_01.mp3',
    mission_control_overrun_clear: 'mission_control_overrun_clear_01.mp3',
    mission_control_overrun_clear_sector_10: 'mission_control_overrun_clear_sector_10_01.mp3',
    mission_control_overrun_clear_sector_20: 'mission_control_overrun_clear_sector_20_01.mp3',
    mission_control_overrun_clear_sector_30: 'mission_control_overrun_clear_sector_30_01.mp3',
    mission_control_overrun_clear_sector_40: 'mission_control_overrun_clear_sector_40_01.mp3',
    mission_control_overrun_clear_sector_50: 'mission_control_overrun_clear_sector_50_01.mp3',
    mission_control_overrun_clear_far_signal: 'mission_control_overrun_clear_far_signal_01.mp3',
    mission_control_credits: 'mission_control_credits_01.mp3',
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
    'codex_open': [
        getSfx('nova_codex_tick')
    ],
    'codex_move': [
        getSfx('nova_codex_tick')
    ],
    'codex_back': [
        getSfx('nova_codex_tick')
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
        getSfx('laserRetro_000'), getSfx('laserRetro_001'), getSfx('laserSmall_003')
    ],
    'enemy_threat_soft_warn': [
        getSfx('forceField_001'), getSfx('forceField_002')
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
    'levelComplete': [getSfx('nova_level_clear_medal'), getSfx('nova_rank_fanfare')],

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
        getSfx('forceField_001'), // Sharp
        getSfx('forceField_002'), // Resonant
        getSfx('forceField_003')  // High pitch
    ],
    'powerup_pickup': [
        getSfx('nova_bonus_core_jackpot'),
        getSfx('doorOpen_002')
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
    'tractor_lock_charge': [
        getSfx('nova_tractor_lock_charge')
    ],
    'tractor_beam_active': [
        getSfx('nova_tractor_beam_active')
    ],
    'tractor_break_bloom': [
        getSfx('nova_tractor_break_bloom')
    ],
    'tractor_capture_sting': [
        getSfx('nova_tractor_capture_sting')
    ],
    'tractor_debuff_apply': [
        getSfx('nova_tractor_debuff_apply')
    ],
    'tractor_debuff_expire': [
        getSfx('nova_tractor_debuff_expire')
    ],
    'elite_spawn_alert': [
        getSfx('nova_elite_spawn_alert')
    ],
    'elite_special_charge': [
        getSfx('nova_elite_special_charge')
    ],
    'elite_special_active': [
        getSfx('nova_enemy_pew_cluster'),
        getSfx('nova_boss_phase_surge')
    ],
    'elite_death': [
        getSfx('nova_elite_death')
    ],
    'elite_tractor_puller_active': [
        getSfx('nova_elite_tractor_puller_active')
    ],
    'elite_shield_projector_active': [
        getSfx('nova_elite_shield_projector_active')
    ],
    'elite_drone_carrier_active': [
        getSfx('nova_elite_drone_carrier_active')
    ],
    'elite_mine_layer_active': [
        getSfx('nova_elite_mine_layer_active')
    ],
    'elite_sniper_rail_active': [
        getSfx('nova_elite_sniper_rail_active')
    ],
    'elite_jammer_disruptor_active': [
        getSfx('nova_elite_jammer_disruptor_active')
    ],
    'elite_repair_healer_active': [
        getSfx('nova_elite_repair_healer_active')
    ],
    'elite_splitter_clone_active': [
        getSfx('nova_elite_splitter_clone_active')
    ],
    'elite_barrier_projector_active': [
        getSfx('nova_elite_barrier_projector_active')
    ],
    'elite_vortex_gravity_active': [
        getSfx('nova_elite_vortex_gravity_active')
    ],
    'elite_burst_artillery_active': [
        getSfx('nova_elite_burst_artillery_active')
    ],
    'elite_phase_raider_active': [
        getSfx('nova_elite_phase_raider_active')
    ],
    'elite_lane_blocker_active': [
        getSfx('nova_elite_lane_blocker_active')
    ],
    'elite_orb_webber_active': [
        getSfx('nova_elite_orb_webber_active')
    ],
    'elite_missile_frigate_active': [
        getSfx('nova_elite_missile_frigate_active')
    ],
    'elite_mirror_decoy_active': [
        getSfx('nova_elite_mirror_decoy_active')
    ],
    'elite_pulse_emp_active': [
        getSfx('nova_elite_pulse_emp_active')
    ],
    'elite_anchor_turret_active': [
        getSfx('nova_elite_anchor_turret_active')
    ],
    'elite_escort_commander_active': [
        getSfx('nova_elite_escort_commander_active')
    ],
    'elite_hunter_active': [
        getSfx('nova_elite_hunter_active')
    ],
    'boss_beam_telegraph': [
        getSfx('nova_boss_beam_telegraph')
    ],
    'boss_beam_fire': [
        getSfx('nova_boss_beam_fire')
    ],
    'boss_web_telegraph': [
        getSfx('nova_boss_web_telegraph')
    ],
    'boss_web_fire': [
        getSfx('nova_boss_web_snap')
    ],
    'boss_net_telegraph': [
        getSfx('nova_boss_net_telegraph')
    ],
    'boss_net_fire': [
        getSfx('nova_boss_net_burst')
    ],
    'boss_hazard_impact': [
        getSfx('nova_boss_hazard_impact')
    ],
    'boss_entrance_impact': [
        getSfx('nova_boss_entrance_impact')
    ],
    'boss_charge_lattice': [
        getSfx('nova_boss_charge_lattice')
    ],
    'boss_damage_armor_crack': [
        getSfx('nova_boss_damage_armor_crack')
    ],
    'boss_death_cascade': [
        getSfx('nova_boss_death_cascade')
    ],
    'nova_boss_death_sonia': [
        getSfx('nova_boss_death_sonia')
    ],
    'nova_boss_death_forge': [
        getSfx('nova_boss_death_forge')
    ],
    'nova_boss_death_kurt': [
        getSfx('nova_boss_death_kurt')
    ],
    'nova_boss_death_needle': [
        getSfx('nova_boss_death_needle')
    ],
    'nova_boss_death_vortex': [
        getSfx('nova_boss_death_vortex')
    ],
    'nova_boss_death_jester': [
        getSfx('nova_boss_death_jester')
    ],
    'nova_boss_death_carrier': [
        getSfx('nova_boss_death_carrier')
    ],
    'nova_boss_death_monolith': [
        getSfx('nova_boss_death_monolith')
    ],
    'nova_boss_death_choir': [
        getSfx('nova_boss_death_choir')
    ],
    'nova_boss_death_clock': [
        getSfx('nova_boss_death_clock')
    ],
    'trait_bonus_hit': [
        getSfx('nova_combo_tick')
    ],
    'trait_wing_hit': [
        getSfx('nova_drone_launch_blip')
    ],
    'trait_pierce_hit': [
        getSfx('nova_chain_lightning_arc')
    ],
    'trait_crit_splash': [
        getSfx('nova_boss_phase_surge')
    ],
    'taunt': numberedVoicePool('mission_control_combo', 3),
    'intro_voice': missionControlPool('mission_control_launch'),
    'mission_control_launch': missionControlPool('mission_control_launch'),
    'mission_control_level_start': missionControlPool('mission_control_level_start'),
    'mission_control_wave_clear': missionControlPool('mission_control_wave_clear'),
    'mission_control_boss_inbound': missionControlPool('mission_control_boss_inbound'),
    'mission_control_life_low': missionControlPool('mission_control_life_low'),
    'mission_control_lives_max': missionControlPool('mission_control_lives_max', 0),
    'mission_control_powerup': missionControlPool('mission_control_powerup'),
    'mission_control_victory': missionControlPool('mission_control_victory'),
    'mission_control_game_over': missionControlPool('mission_control_game_over'),
    'mission_control_ship_unlocked': numberedVoicePool('mission_control_ship_unlocked', 1),
    'mission_control_ships_unlocked': numberedVoicePool('mission_control_ships_unlocked', 1),
    'mission_control_combo': numberedVoicePool('mission_control_combo', 3),
    'mission_control_local_highscore': numberedVoicePool('mission_control_local_highscore', 2),
    'mission_control_global_highscore': numberedVoicePool('mission_control_global_highscore', 2),
    'mission_control_global_close': numberedVoicePool('mission_control_global_close', 1),
    'mission_control_top3_close': numberedVoicePool('mission_control_top3_close', 1),
    'mission_control_number_one_close': numberedVoicePool('mission_control_number_one_close', 1),
    'mission_control_top3_highscore': numberedVoicePool('mission_control_top3_highscore', 1),
    'mission_control_number_one_highscore': numberedVoicePool('mission_control_number_one_highscore', 1),
    'mission_control_near_miss': numberedVoicePool('mission_control_near_miss', 1),
    'mission_control_personal_best': numberedVoicePool('mission_control_personal_best', 2),
    'mission_control_restart': numberedVoicePool('mission_control_restart', 2),
    'mission_control_hijacker': numberedVoicePool('mission_control_hijacker', 2),
    'mission_control_tractor_hijack': numberedVoicePool('mission_control_tractor_hijack', 3),
    'mission_control_overrun_clear': numberedVoicePool('mission_control_overrun_clear', 1),
    'mission_control_overrun_clear_sector_10': numberedVoicePool('mission_control_overrun_clear_sector_10', 1),
    'mission_control_overrun_clear_sector_20': numberedVoicePool('mission_control_overrun_clear_sector_20', 1),
    'mission_control_overrun_clear_sector_30': numberedVoicePool('mission_control_overrun_clear_sector_30', 1),
    'mission_control_overrun_clear_sector_40': numberedVoicePool('mission_control_overrun_clear_sector_40', 1),
    'mission_control_overrun_clear_sector_50': numberedVoicePool('mission_control_overrun_clear_sector_50', 1),
    'mission_control_overrun_clear_far_signal': numberedVoicePool('mission_control_overrun_clear_far_signal', 1),
    'mission_control_credits': numberedVoicePool('mission_control_credits', 1),
    'boss_death_agony': paddedNumberedVoicePool('boss_death_agony', 100, 3),
    ...GAME_OVER_CTA_VOICE_CATALOG,
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
    'nova_boss_entrance_impact': [
        getSfx('nova_boss_entrance_impact')
    ],
    'nova_boss_charge_lattice': [
        getSfx('nova_boss_charge_lattice')
    ],
    'nova_boss_damage_armor_crack': [
        getSfx('nova_boss_damage_armor_crack')
    ],
    'nova_boss_death_cascade': [
        getSfx('nova_boss_death_cascade')
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
    'nova_global_near_fanfare': [
        getSfx('nova_global_near_fanfare')
    ],
    'nova_global_slot_fanfare': [
        getSfx('nova_global_slot_fanfare')
    ],
    'nova_top10_fanfare': [
        getSfx('nova_top10_fanfare')
    ],
    'nova_top3_fanfare': [
        getSfx('nova_top3_fanfare')
    ],
    'nova_number_one_fanfare': [
        getSfx('nova_number_one_fanfare')
    ],
    'nova_fuel_ship_spawn': [
        getSfx('nova_fuel_ship_spawn')
    ],
    'nova_fuel_ship_heal': [
        getSfx('nova_fuel_ship_heal')
    ],
    'nova_fuel_ship_pop': [
        getSfx('nova_fuel_ship_pop')
    ],
    'nova_danger_mid_pop': [
        getSfx('nova_danger_mid_pop')
    ],
    'overrun_clear_coronation': [
        getSfx('nova_overrun_clear_coronation')
    ],
    'overrun_clear_shockwave': [
        getSfx('nova_overrun_clear_shockwave')
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
    'nova_tractor_lock_charge': [
        getSfx('nova_tractor_lock_charge')
    ],
    'nova_tractor_beam_active': [
        getSfx('nova_tractor_beam_active')
    ],
    'nova_tractor_break_bloom': [
        getSfx('nova_tractor_break_bloom')
    ],
    'nova_boss_beam_telegraph': [
        getSfx('nova_boss_beam_telegraph')
    ],
    'nova_boss_beam_fire': [
        getSfx('nova_boss_beam_fire')
    ],
    'nova_boss_web_telegraph': [
        getSfx('nova_boss_web_telegraph')
    ],
    'nova_boss_web_snap': [
        getSfx('nova_boss_web_snap')
    ],
    'nova_boss_net_telegraph': [
        getSfx('nova_boss_net_telegraph')
    ],
    'nova_boss_net_burst': [
        getSfx('nova_boss_net_burst')
    ],
    'nova_boss_hazard_impact': [
        getSfx('nova_boss_hazard_impact')
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
    ].filter(Boolean)
};
