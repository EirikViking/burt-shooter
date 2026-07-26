import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
const rootDir = process.cwd();
const defaultOutputDir = path.resolve(rootDir, 'public/audio/sfx/nova-swarm');
const defaultCandidateDir = path.resolve(rootDir, 'public/audio/sfx/nova-swarm-candidates');
const defaultJsonReportPath = path.resolve(rootDir, 'test-results/elevenlabs-sfx-bake-report.json');
const defaultMdReportPath = path.resolve(rootDir, 'docs/reviews/elevenlabs-sfx-bake-report.md');
const defaultModelId = 'eleven_text_to_sound_v2';
const defaultOutputFormat = 'mp3_44100_128';

const eliteMiddleShipSounds = [
  {
    file: 'nova_elite_spawn_alert.mp3',
    text: 'A compact elite enemy arrival alert for a neon arcade space shooter, urgent priority-threat sting, crisp synthetic alarm and bass pulse, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_elite_special_charge.mp3',
    text: 'A short elite enemy special-ability charge cue, rising sci-fi capacitor whine with readable warning ticks, polished arcade combat sound, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_elite_death.mp3',
    text: 'A punchy elite enemy destruction sound for a neon arcade shooter, compact metal hull collapse, bright plasma crackle, premium score payoff sparkle, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_tractor_capture_sting.mp3',
    text: 'A sharp tractor beam capture sting, magnetic lock snap, short graviton cable clamp, urgent but clean in a busy arcade mix, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.68
  },
  {
    file: 'nova_tractor_debuff_apply.mp3',
    text: 'A brief negative status effect apply sound, corrupt sci-fi sparkle and electric status glitch, readable danger feedback, not harsh, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.66
  },
  {
    file: 'nova_tractor_debuff_expire.mp3',
    text: 'A short status effect recovery sound, clean shield reboot chirp and soft upward shimmer, reassuring but subtle, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.62
  },
  {
    file: 'nova_elite_tractor_puller_active.mp3',
    text: 'A unique tractor puller elite active sound, magnetic hook lashes out, pulsing gravity cable locks onto a target, tense neon arcade sci-fi, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.7
  },
  {
    file: 'nova_elite_shield_projector_active.mp3',
    text: 'A unique shield projector elite active sound, crystalline force halo blooms outward with glassy blue energy, defensive and readable, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_drone_carrier_active.mp3',
    text: 'A unique drone carrier elite active sound, tiny hangar clamps open, robotic launch chirps and miniature thrusters burst out, playful but threatening, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_mine_layer_active.mp3',
    text: 'A unique mine layer elite active sound, hot mine pod ejects with metallic clack, warning beep arms, small plasma fuse spark, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_sniper_rail_active.mp3',
    text: 'A unique sniper rail ship active sound, needle-thin railgun lance fires, bright electric crack and fast high-energy snap, clean and precise, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.7
  },
  {
    file: 'nova_elite_jammer_disruptor_active.mp3',
    text: 'A unique jammer disruptor elite active sound, corrupt radio static pulse, crunchy digital interference burst and short warning buzz, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_repair_healer_active.mp3',
    text: 'A unique repair healer elite active sound, green repair lattice pulse, soft robotic welders and restorative energy sparkle, supportive but still alien, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_elite_splitter_clone_active.mp3',
    text: 'A unique splitter clone elite active sound, shell splits with elastic metal pop, twin hologram chirps and quick duplicate shimmer, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_barrier_projector_active.mp3',
    text: 'A unique barrier projector elite active sound, hardlight wall slams into place, bright rectangular energy shield thump and lattice shimmer, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_vortex_gravity_active.mp3',
    text: 'A unique vortex gravity elite active sound, swirling gravity well opens, low circular pull with sparkling particles orbiting inward, readable and not muddy, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.7
  },
  {
    file: 'nova_elite_burst_artillery_active.mp3',
    text: 'A unique burst artillery elite active sound, three compact plasma mortar launches in staggered rhythm, heavy but clean arcade impacts, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_phase_raider_active.mp3',
    text: 'A unique phase raider elite active sound, glassy ship flicker, airy phase blink and quick dimensional shimmer, elegant and slippery, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_lane_blocker_active.mp3',
    text: 'A unique lane blocker elite active sound, heavy energy barricade clamps deploy, metallic lock and warning tone, readable lane-denial cue, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_orb_webber_active.mp3',
    text: 'A unique orb webber elite active sound, sticky plasma orbs weave filaments, elastic cyber web snap and glowing thread shimmer, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_missile_frigate_active.mp3',
    text: 'A unique missile frigate elite active sound, dual missile lock chirps, compact rocket ignition and guided launch whoosh, punchy but not huge, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_mirror_decoy_active.mp3',
    text: 'A unique mirror decoy elite active sound, holographic duplicate shimmer, prismatic mirror flicker and quick misdirection sparkle, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_pulse_emp_active.mp3',
    text: 'A unique pulse EMP elite active sound, blue electric ring discharges outward, crisp electromagnetic zap and short system-glitch tail, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.7
  },
  {
    file: 'nova_elite_anchor_turret_active.mp3',
    text: 'A unique anchor turret elite active sound, heavy turret braces deploy, servo clunk and fan-burst weapon spin-up, weighty but compact, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_escort_commander_active.mp3',
    text: 'A unique escort commander elite active sound, tactical command ping, synchronized squadron lock-on chirps and confident energy pulse, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_elite_hunter_active.mp3',
    text: 'A unique late game elite hunter active sound, predatory vector dash, sharp plasma claws and fast lock-on burst, dangerous but clean, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.7
  }
];

const sounds = [
  {
    file: 'nova_miracle_collect.mp3',
    text: 'A spectacular ultra-rare jackpot pickup sound for a premium neon arcade space shooter: one deep clean sub impact, a brilliant crystalline heart chime, white-gold energy blooming upward, euphoric choir-like synthesizer sparkle, and a short victorious tail. Extremely gratifying and unmistakably positive, huge but clear in a busy combat mix, original sound design, no voice, no spoken words, no copyrighted melody, four seconds.',
    duration_seconds: 4,
    prompt_influence: 0.82,
    allowCreate: true
  },
  {
    file: 'nova_miracle_purge.mp3',
    text: 'A cinematic full-board cosmic purge for a neon arcade space shooter: a fast outward white-hot energy sweep, many tiny hostile projectiles vaporizing into glitter, a wide cyan-magenta shockwave, then one warm life-restored pulse. Powerful, clean, euphoric, and readable without harshness, original sound design, no voice, no spoken words, no copyrighted melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.8,
    allowCreate: true
  },
  {
    file: 'nova_top10_fanfare.mp3',
    text: 'An original heroic top-ten leaderboard fanfare for a neon arcade space shooter, seven seconds, bright synth brass, crisp trophy drums, shimmering score counter arpeggios, proud but readable, no vocals, no copyrighted melody.',
    duration_seconds: 7,
    prompt_influence: 0.78
  },
  {
    file: 'nova_fuel_ship_spawn.mp3',
    text: 'A readable boss fuel ship arrival cue, bright green sci-fi tanker warp-in, soft warning ping, quick engine flare, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_fuel_ship_heal.mp3',
    text: 'A boss healing fuel transfer sound, liquid plasma gulp, rising shield recharge shimmer, warm dangerous energy bloom, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_fuel_ship_pop.mp3',
    text: 'A small fuel tanker enemy popping apart, fizzy plasma burst, glassy green sparkles, quick reward snap, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.66
  },
  {
    file: 'nova_danger_mid_pop.mp3',
    text: 'A dangerous mid enemy ship destruction sound, tougher hull crack, orange plasma snap, compact arcade payoff, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.66
  },
  {
    file: 'nova_boss_death_sonia.mp3',
    text: 'A unique boss death sound called Sonia crownfall, pink-cyan royal energy shatters, huge arcade explosion tail, glittering crown fragments, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.72
  },
  {
    file: 'nova_boss_death_forge.mp3',
    text: 'A unique forge boss death sound, molten engine core collapses, heavy metal slam, hot orange plasma vent, premium arcade finale, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.72
  },
  {
    file: 'nova_boss_death_mirror_crack.mp3',
    text: 'A unique boss death sound for Tyrian the Great, mirror hive cracks, glassy phase shards, deep alien cabinet thump, brilliant sci-fi sparkle finish, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.72
  },
  {
    file: 'nova_boss_death_needle.mp3',
    text: 'A unique needle sniper boss death, razor laser lances snap one by one, icy blue pressure release, sharp but not painful, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.7
  },
  {
    file: 'nova_boss_death_vortex.mp3',
    text: 'A unique vortex boss death sound, gravity spiral unwinds, bass vacuum implosion, neon debris slingshot sparkle, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.72
  },
  {
    file: 'nova_boss_death_jester.mp3',
    text: 'A unique jester boss death sound, chaotic arcade confetti burst, trickster synth squeal collapses into a clean explosion, funny but dangerous, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.7
  },
  {
    file: 'nova_boss_death_carrier.mp3',
    text: 'A unique carrier boss death sound, drone hangar implodes, many tiny clamps snap shut then a large plasma boom, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.7
  },
  {
    file: 'nova_boss_death_monolith.mp3',
    text: 'A unique monolith boss death sound, massive rectangular hull crumbles, stone-metal bass hits, white-hot crack lines burst, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.72
  },
  {
    file: 'nova_boss_death_choir.mp3',
    text: 'A unique laser choir boss death sound, synthetic chord collapses into sparkling silence, pink-cyan harmonic blast, no vocals, no copyrighted melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.72
  },
  {
    file: 'nova_boss_death_clock.mp3',
    text: 'A unique clockwork boss death sound, giant gears strip and unwind, ticking accelerates into a bright sci-fi explosion, no voice, no melody, three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.72
  },
  {
    file: 'nova_boss_arrival_alarm.mp3',
    text: 'A short retro arcade boss arrival alarm, cinematic sci-fi siren, rising energy, punchy but not harsh, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.55
  },
  {
    file: 'nova_boss_entrance_impact.mp3',
    text: 'A huge arcade space boss entrance impact, deep mechanical drop, starship armor shockwave, bright energy crackle, cinematic but clean in a busy shooter mix, no voice, no melody, under three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.72
  },
  {
    file: 'nova_boss_charge_lattice.mp3',
    text: 'A readable boss weapon charge cue for a neon arcade shooter, rising plasma lattice, servo shutters opening, warning ticks, tense but not harsh, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.7
  },
  {
    file: 'nova_boss_damage_armor_crack.mp3',
    text: 'A short heavy armored boss damage reaction, metal hull crack, shield glass spark, compressed bass thud, satisfying impact feedback, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.68
  },
  {
    file: 'nova_boss_death_cascade.mp3',
    text: 'A spectacular layered arcade boss death cascade, massive hull collapse, plasma core overload, multiple bright explosions rolling outward, triumphant payoff sparkle, no voice, no copyrighted melody, under four seconds.',
    duration_seconds: 4,
    prompt_influence: 0.74
  },
  {
    file: 'nova_bonus_core_jackpot.mp3',
    text: 'A bright arcade bonus core jackpot pickup sound, sparkling coin-slot energy, quick upward chime, satisfying and playful, no voice, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.6
  },
  {
    file: 'nova_shield_snap.mp3',
    text: 'A crisp sci-fi shield activation snap, glassy force field shimmer with a tight arcade attack, clean and readable, no voice, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.55
  },
  {
    file: 'nova_rank_fanfare.mp3',
    text: 'A short victorious arcade rank-up fanfare, neon cabinet flourish, celebratory but compact, no voice, no copyrighted melody, under three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.58
  },
  {
    file: 'nova_highscore_chime.mp3',
    text: 'A premium arcade high-score chime, glittering score counter sparkle, confident and clean, no voice, no melody quote, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.6
  },
  {
    file: 'nova_global_near_fanfare.mp3',
    text: 'An original epic near-leaderboard achievement fanfare music cue for a neon arcade space shooter. Four seconds, cinematic synth brass swell, rising trophy drums, glittering score counter arpeggios, heroic but still tense because the player almost made the global board, no vocals, no copyrighted melody, polished game award music.',
    duration_seconds: 4,
    prompt_influence: 0.74
  },
  {
    file: 'nova_global_slot_fanfare.mp3',
    text: 'An original epic global leaderboard achievement fanfare music cue for Nova Swarm, a neon arcade space shooter. Six seconds, huge synth brass, heroic arcade trophy melody, pounding cinematic drums, sparkling coin-op score explosion, proud and ego-feeding, no vocals, no copyrighted melody, sounds like entering the global hall of fame.',
    duration_seconds: 6,
    prompt_influence: 0.78
  },
  {
    file: 'nova_top3_fanfare.mp3',
    text: 'An original massive top-three leaderboard fanfare music cue for a premium neon arcade space shooter. Eight seconds, triumphant synth orchestra, gold trophy impact, big rising drums, bright arcade arpeggios, starfield choir pads without vocals, spectacular and proud, no copyrighted melody, sounds like the player became a legend.',
    duration_seconds: 8,
    prompt_influence: 0.8
  },
  {
    file: 'nova_number_one_fanfare.mp3',
    text: 'An original absurdly epic number-one global leaderboard coronation fanfare music cue for Nova Swarm. Ten seconds, gigantic heroic synth brass theme, thunderous trophy drums, cosmic arcade choir pads without vocals, glittering score explosion, final boss victory energy, proud emotional payoff, no copyrighted melody, sounds like the entire arcade bows to the champion.',
    duration_seconds: 10,
    prompt_influence: 0.82
  },
  {
    file: 'nova_overrun_clear_coronation.mp3',
    text: 'An original huge sector-ten clear coronation fanfare for Nova Swarm, a neon arcade space shooter. Seven seconds, triumphant synth brass, cosmic trophy drums, glittering coin-slot starburst, heroic victory swell that opens into dangerous overrun energy, no vocals, no copyrighted melody, beautiful and epic achievement payoff.',
    duration_seconds: 7,
    prompt_influence: 0.82
  },
  {
    file: 'nova_overrun_clear_shockwave.mp3',
    text: 'A massive but clean arcade achievement shockwave for clearing sector ten in a neon space shooter. Bright gold-cyan energy bloom, deep cabinet bass impact, sparkling score counter burst, quick celebratory whoosh, no voice, no copyrighted melody, under three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.76
  },
  {
    file: 'nova_enemy_pew_cluster.mp3',
    text: 'A tiny clustered alien arcade laser shot, quick chirpy pew with digital swarm texture, readable in busy combat, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.62
  },
  {
    file: 'nova_player_hit_crackle.mp3',
    text: 'A short player ship damage crackle, metallic shield impact and electric fizz, urgent but not harsh, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.6
  },
  {
    file: 'nova_life_extend_bloom.mp3',
    text: 'A warm arcade extra-life bloom, hopeful rising sparkle and soft coin cabinet reward, compact and premium, no voice, no melody quote, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.6
  },
  {
    file: 'nova_wave_clear_sweep.mp3',
    text: 'A bright wave-clear sweep for a neon arcade shooter, quick upward shimmer with tiny score-counter sparkle, satisfying but not too loud, no voice, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_game_over_drop.mp3',
    text: 'A compact arcade game-over stinger, descending sci-fi synth drop with a tiny coin-slot clack at the end, dramatic but playful, no voice, no melody quote, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_combo_tick.mp3',
    text: 'A tiny premium arcade combo tick, crisp score counter blip with a little neon sparkle, very short, readable during combat, no voice, no melody.',
    duration_seconds: 1,
    prompt_influence: 0.62
  },
  {
    file: 'nova_combo_breakout.mp3',
    text: 'A short escalating arcade combo breakout flourish, bright rising synth coins and score multiplier energy, satisfying but compact, no voice, no copyrighted melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.6
  },
  {
    file: 'nova_boss_phase_surge.mp3',
    text: 'A dramatic boss phase surge for a neon arcade shooter, heavy sci-fi power pulse with warning shimmer, intense but clean, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_level_clear_medal.mp3',
    text: 'A bright level-clear medal sting for an arcade space shooter, heroic score flourish with coin-slot sparkle, confident and compact, no voice, no copyrighted melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_menu_tick.mp3',
    text: 'A tiny premium arcade menu cursor tick, soft neon button click with faint coin-cabinet sparkle, extremely short, elegant, no voice, no melody.',
    duration_seconds: 1,
    prompt_influence: 0.62
  },
  {
    file: 'nova_pause_in.mp3',
    text: 'A compact arcade pause engage sound, clean synth latch with soft screen-freeze shimmer, satisfying but quiet, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.58
  },
  {
    file: 'nova_pause_out.mp3',
    text: 'A compact arcade resume sound, bright synth unlock and quick energy return, satisfying but quiet, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.58
  },
  {
    file: 'nova_ship_lock_chime.mp3',
    text: 'A premium ship selection confirmation chime, sci-fi hangar lock-on sparkle with tiny thruster bloom, confident and polished, no voice, no melody quote, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.6
  },
  {
    file: 'nova_chain_lightning_arc.mp3',
    text: 'A fast arcade chain lightning zap, crisp electric arc hopping between targets with tiny neon crackles, readable in busy combat, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.62
  },
  {
    file: 'nova_magnet_pull_warble.mp3',
    text: 'A compact sci-fi magnet pull sound, soft gravitational warble and coin sparkle tug, playful arcade powerup feedback, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_ghost_phase_shift.mp3',
    text: 'A short ghost phase shift sound for an arcade spaceship, airy digital cloak shimmer and quick whoosh, clean and not spooky, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_time_slow_warp.mp3',
    text: 'A compact slow-time activation sound, rubbery sci-fi time warp with soft tape-stop shimmer, polished arcade feel, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_drone_launch_blip.mp3',
    text: 'A small companion drone launch blip, cute robotic thruster chirp with tiny lock-on sparkle, fast and premium, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.6
  },
  {
    file: 'nova_orbital_strike_charge.mp3',
    text: 'A short orbital strike charge cue, distant sci-fi targeting pulse rising into a clean arcade impact promise, dramatic but compact, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_tractor_lock_charge.mp3',
    text: 'A premium sci-fi tractor beam lock-on charge for a neon arcade space shooter, rising magnetic hum, crisp targeting chirps, ominous but readable, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.64
  },
  {
    file: 'nova_tractor_beam_active.mp3',
    text: 'A compact active tractor beam sound, powerful graviton pull, pulsing energy cable, clean arcade sci-fi texture, satisfying but not muddy, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.64
  },
  {
    file: 'nova_tractor_break_bloom.mp3',
    text: 'A satisfying tractor beam break sound, magnetic cable snaps into a bright reward bloom, electric shards and score payoff sparkle, punchy arcade sci-fi, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_boss_beam_telegraph.mp3',
    text: 'A boss beam telegraph warning sound, sharp lance lock-on, rising high-energy rail charge, dangerous and readable, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_boss_beam_fire.mp3',
    text: 'A boss beam firing sound, heavy neon rail-lance discharge, bright plasma crack, powerful but clean in a busy arcade mix, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.68
  },
  {
    file: 'nova_boss_web_telegraph.mp3',
    text: 'A boss web attack telegraph, shimmering energy filaments stretching into place, tense cyber web windup, readable warning texture, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.64
  },
  {
    file: 'nova_boss_web_snap.mp3',
    text: 'A boss web attack release, snapping neon filaments and quick plasma lash, agile threatening arcade sci-fi sound, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_boss_net_telegraph.mp3',
    text: 'A boss net attack telegraph, circular energy lattice charging, resonant grid pulses and warning ticks, tense but readable, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.64
  },
  {
    file: 'nova_boss_net_burst.mp3',
    text: 'A boss net burst sound, expanding energy ring and snapping plasma grid, strong arcade impact with clean high-frequency sparkle, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.66
  },
  {
    file: 'nova_boss_hazard_impact.mp3',
    text: 'A boss special weapon impact on a player shield or hull, hot plasma hit, metallic crackle, brief low thump, urgent but not harsh, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.64
  },
  ...eliteMiddleShipSounds
];

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    force: false,
    onlyFiles: null,
    outputDir: defaultOutputDir,
    candidateDir: defaultCandidateDir,
    candidateCount: 2,
    delayMs: 650,
    modelId: process.env.ELEVENLABS_SFX_MODEL_ID || defaultModelId,
    outputFormat: process.env.ELEVENLABS_SFX_OUTPUT_FORMAT || defaultOutputFormat,
    jsonReportPath: defaultJsonReportPath,
    mdReportPath: defaultMdReportPath,
    help: false
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--force') {
      parsed.force = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg.startsWith('--only=')) {
      parsed.onlyFiles = new Set(arg.slice('--only='.length)
        .split(',')
        .map((item) => path.basename(item.trim()))
        .filter(Boolean));
    } else if (arg.startsWith('--out=')) {
      parsed.outputDir = path.resolve(rootDir, arg.slice('--out='.length));
    } else if (arg.startsWith('--candidate-dir=')) {
      parsed.candidateDir = path.resolve(rootDir, arg.slice('--candidate-dir='.length));
    } else if (arg.startsWith('--candidate-count=')) {
      parsed.candidateCount = parsePositiveInt(arg, '--candidate-count', 2);
    } else if (arg.startsWith('--delay-ms=')) {
      parsed.delayMs = parsePositiveInt(arg, '--delay-ms', 650);
    } else if (arg.startsWith('--json-report=')) {
      parsed.jsonReportPath = path.resolve(rootDir, arg.slice('--json-report='.length));
    } else if (arg.startsWith('--md-report=')) {
      parsed.mdReportPath = path.resolve(rootDir, arg.slice('--md-report='.length));
    } else if (arg.startsWith('--model-id=')) {
      parsed.modelId = arg.slice('--model-id='.length).trim() || defaultModelId;
    } else if (arg.startsWith('--output-format=')) {
      parsed.outputFormat = arg.slice('--output-format='.length).trim() || defaultOutputFormat;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  parsed.candidateCount = Math.max(1, Math.min(8, parsed.candidateCount));
  parsed.delayMs = Math.max(0, parsed.delayMs);
  return parsed;
}

function parsePositiveInt(arg, name, fallback) {
  const raw = arg.slice(name.length + 1);
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function printHelp() {
  console.log(`Usage: npm run generate:nova-sfx -- [options]

Safely bakes local Nova Swarm SFX candidates with ElevenLabs Sound Generation.
The game never calls ElevenLabs at runtime; this script writes local MP3 files.

Options:
  --dry-run                         List selected SFX without generating audio.
  --force                           Overwrite candidates and promote the first technically clean candidate to production.
  --only=file1.mp3,file2.mp3        Limit generation to exact existing SFX filenames.
  --out=public/audio/sfx/nova-swarm Production SFX directory for accepted replacements.
  --candidate-dir=public/audio/sfx/nova-swarm-candidates
                                    Candidate output directory.
  --candidate-count=2               Candidates per selected SFX.
  --delay-ms=650                    Delay between ElevenLabs requests.
  --model-id=eleven_text_to_sound_v2
  --output-format=mp3_44100_128     Requested ElevenLabs output format.
  --json-report=<path>              JSON report path.
  --md-report=<path>                Markdown report path.
`);
}

function requireApiKey(args) {
  if (args.dryRun) return;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is required. Keep it in the environment and never commit or print it.');
  }
}

function selectSounds(args) {
  const selected = sounds.filter((entry) => !args.onlyFiles || args.onlyFiles.has(entry.file));
  if (args.onlyFiles) {
    const known = new Set(sounds.map((entry) => entry.file));
    const missing = [...args.onlyFiles].filter((file) => !known.has(file));
    if (missing.length) {
      console.warn(`[nova-sfx] warning: --only included unknown file(s): ${missing.join(', ')}`);
    }
  }
  return selected;
}

function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status < 600);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestSound(sound, args, attempt = 1) {
  const url = new URL('https://api.elevenlabs.io/v1/sound-generation');
  url.searchParams.set('output_format', args.outputFormat);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: sound.text,
      duration_seconds: sound.duration_seconds,
      prompt_influence: sound.prompt_influence,
      model_id: args.modelId
    })
  });

  if (response.ok) {
    return Buffer.from(await response.arrayBuffer());
  }

  const body = await response.text().catch(() => '');
  if (attempt < 4 && isRetryableStatus(response.status)) {
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const retryDelay = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : Math.min(8000, 1000 * 2 ** (attempt - 1));
    console.warn(`[nova-sfx] ${sound.file} got HTTP ${response.status}; retry ${attempt}/3 after ${retryDelay}ms`);
    await sleep(retryDelay);
    return requestSound(sound, args, attempt + 1);
  }

  throw new Error(`HTTP ${response.status} ${body.slice(0, 240)}`);
}

function candidateFileFor(sound, index, args) {
  const ext = path.extname(sound.file) || '.mp3';
  const base = path.basename(sound.file, ext);
  return path.join(args.candidateDir, `${base}.candidate-${String(index + 1).padStart(2, '0')}${ext}`);
}

function expectedDurationRange(sound) {
  const expected = Number(sound.duration_seconds) || 1;
  const tiny = expected <= 1;
  const fanfare = expected >= 4;
  return {
    min: tiny ? 0.25 : Math.max(0.45, expected * 0.45),
    max: fanfare ? expected + 2.5 : Math.max(1.1, expected * 1.75 + 0.35)
  };
}

async function evaluateAudio(filePath, sound) {
  const fileStat = await stat(filePath);
  const buffer = await readFile(filePath);
  const probe = probeAudio(filePath);
  const volume = measureVolume(filePath);
  const durationRange = expectedDurationRange(sound);
  const reasons = [];
  const warnings = [];

  if (fileStat.size < 5000) {
    reasons.push(`suspiciously small file (${fileStat.size} bytes)`);
  }

  if (!Number.isFinite(probe.durationSeconds)) {
    reasons.push('ffprobe could not read duration');
  } else {
    if (probe.durationSeconds < durationRange.min) {
      reasons.push(`too short (${probe.durationSeconds.toFixed(3)}s, expected >= ${durationRange.min.toFixed(2)}s)`);
    }
    if (probe.durationSeconds > durationRange.max) {
      reasons.push(`too long (${probe.durationSeconds.toFixed(3)}s, expected <= ${durationRange.max.toFixed(2)}s)`);
    }
  }

  if (Number.isFinite(volume.maxDb) && volume.maxDb > 0) {
    reasons.push(`clipped peak (${volume.maxDb.toFixed(1)} dB)`);
  } else if (Number.isFinite(volume.maxDb) && volume.maxDb > -0.1) {
    warnings.push(`raw peak is very close to full scale (${volume.maxDb.toFixed(1)} dB)`);
  }

  if (Number.isFinite(volume.meanDb) && volume.meanDb > -7) {
    reasons.push(`mean loudness is extremely hot (${volume.meanDb.toFixed(1)} dB)`);
  }

  if (Number.isFinite(volume.maxDb) && volume.maxDb < -48) {
    reasons.push(`peak is likely inaudible (${volume.maxDb.toFixed(1)} dB)`);
  }

  if (Number.isFinite(volume.meanDb) && volume.meanDb < -60) {
    reasons.push(`mean loudness is likely silent (${volume.meanDb.toFixed(1)} dB)`);
  }

  return {
    file: path.relative(rootDir, filePath).replaceAll('\\', '/'),
    sizeBytes: fileStat.size,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    durationSeconds: round(probe.durationSeconds, 3),
    sampleRate: probe.sampleRate,
    codecName: probe.codecName,
    bitRate: probe.bitRate,
    meanDb: round(volume.meanDb, 1),
    maxDb: round(volume.maxDb, 1),
    ffprobeAvailable: probe.available,
    ffmpegAvailable: volume.available,
    technicallyClean: reasons.length === 0,
    warnings,
    rejectReasons: reasons
  };
}

function probeAudio(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name,sample_rate,bit_rate:format=duration',
    '-of', 'json',
    filePath
  ], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });

  if (result.status !== 0) {
    return { available: false, durationSeconds: null, sampleRate: null, codecName: null, bitRate: null };
  }

  try {
    const parsed = JSON.parse(result.stdout || '{}');
    const stream = parsed.streams?.[0] || {};
    return {
      available: true,
      durationSeconds: Number(parsed.format?.duration),
      sampleRate: Number(stream.sample_rate) || null,
      codecName: stream.codec_name || null,
      bitRate: Number(stream.bit_rate) || null
    };
  } catch {
    return { available: true, durationSeconds: null, sampleRate: null, codecName: null, bitRate: null };
  }
}

function measureVolume(filePath) {
  const nullSink = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const result = spawnSync('ffmpeg', [
    '-hide_banner',
    '-nostats',
    '-i',
    filePath,
    '-af',
    'volumedetect',
    '-f',
    'null',
    nullSink
  ], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4
  });

  if (result.status !== 0) {
    return { available: false, meanDb: null, maxDb: null };
  }

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  return {
    available: true,
    meanDb: parseDb(output, 'mean_volume'),
    maxDb: parseDb(output, 'max_volume')
  };
}

function parseDb(output, key) {
  const match = output.match(new RegExp(`${key}:\\s*(-?[0-9.]+) dB`));
  return match ? Number(match[1]) : null;
}

function round(value, places) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function promotionTargetFor(sound, args) {
  return path.join(args.outputDir, sound.file);
}

async function promoteCandidate(sound, candidatePath, args) {
  const target = promotionTargetFor(sound, args);
  if (!existsSync(target) && sound.allowCreate !== true) {
    throw new Error(`production target does not exist: ${path.relative(rootDir, target)}`);
  }
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(candidatePath, target);
  return path.relative(rootDir, target).replaceAll('\\', '/');
}

async function generateSound(sound, args) {
  const productionTarget = promotionTargetFor(sound, args);
  const entry = {
    file: sound.file,
    prompt: sound.text,
    requestedDurationSeconds: sound.duration_seconds,
    promptInfluence: sound.prompt_influence,
    productionTarget: path.relative(rootDir, productionTarget).replaceAll('\\', '/'),
    productionExists: existsSync(productionTarget),
    candidates: [],
    replacement: null,
    status: 'unchanged',
    errors: []
  };

  if (!entry.productionExists && sound.allowCreate !== true) {
    entry.status = 'skipped';
    entry.errors.push('production target is missing; refusing to create a new runtime SFX filename');
    return entry;
  }

  for (let index = 0; index < args.candidateCount; index += 1) {
    const candidatePath = candidateFileFor(sound, index, args);
    const candidate = {
      file: path.relative(rootDir, candidatePath).replaceAll('\\', '/'),
      index: index + 1,
      generated: false,
      evaluation: null,
      decision: 'not_generated',
      error: null
    };

    if (!args.force && existsSync(candidatePath)) {
      candidate.decision = 'left_for_manual_audition';
      candidate.error = 'candidate already exists; use --force to regenerate it';
      try {
        candidate.evaluation = await evaluateAudio(candidatePath, sound);
      } catch (error) {
        candidate.error = `existing candidate could not be evaluated: ${error.message}`;
      }
      entry.candidates.push(candidate);
      continue;
    }

    try {
      const buffer = await requestSound(sound, args);
      await writeFile(candidatePath, buffer);
      candidate.generated = true;
      candidate.evaluation = await evaluateAudio(candidatePath, sound);
      candidate.decision = candidate.evaluation.technicallyClean
        ? 'clean_candidate'
        : 'rejected';
      if (candidate.generated) {
        console.log(`[nova-sfx] candidate ${sound.file} #${index + 1} (${buffer.length} bytes)`);
      }
    } catch (error) {
      candidate.error = error.message;
      candidate.decision = 'failed';
      entry.errors.push(`candidate ${index + 1}: ${error.message}`);
      console.error(`[nova-sfx] failed ${sound.file} #${index + 1}: ${error.message}`);
    }

    entry.candidates.push(candidate);
    if (args.delayMs > 0) {
      await sleep(args.delayMs);
    }
  }

  const promoted = entry.candidates
    .filter((candidate) => candidate.evaluation?.technicallyClean)
    .sort((left, right) => {
      const warningDelta = (left.evaluation?.warnings?.length || 0) - (right.evaluation?.warnings?.length || 0);
      if (warningDelta !== 0) return warningDelta;
      const leftPeak = Number(left.evaluation?.maxDb);
      const rightPeak = Number(right.evaluation?.maxDb);
      const leftHeadroomPenalty = Number.isFinite(leftPeak) ? Math.abs(leftPeak + 1.5) : 99;
      const rightHeadroomPenalty = Number.isFinite(rightPeak) ? Math.abs(rightPeak + 1.5) : 99;
      return leftHeadroomPenalty - rightHeadroomPenalty;
    })[0];
  if (args.force && promoted) {
    try {
      const promotedPath = path.resolve(rootDir, promoted.file);
      const replacedPath = await promoteCandidate(sound, promotedPath, args);
      promoted.decision = 'accepted';
      entry.replacement = {
        candidate: promoted.file,
        productionFile: replacedPath
      };
      entry.status = entry.productionExists ? 'replaced' : 'created';
      console.log(`[nova-sfx] ${entry.status} ${sound.file} from ${path.basename(promoted.file)}`);
    } catch (error) {
      entry.errors.push(`promotion failed: ${error.message}`);
      entry.status = 'unchanged';
    }
  } else if (promoted) {
    entry.status = 'manual_audition';
    for (const candidate of entry.candidates) {
      if (candidate.decision === 'clean_candidate') candidate.decision = 'left_for_manual_audition';
    }
  } else if (entry.candidates.some((candidate) => candidate.decision === 'rejected' || candidate.decision === 'failed')) {
    entry.status = 'unchanged';
  }

  return entry;
}

async function writeReports(report, args) {
  await mkdir(path.dirname(args.jsonReportPath), { recursive: true });
  await mkdir(path.dirname(args.mdReportPath), { recursive: true });
  await writeFile(args.jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(args.mdReportPath, renderMarkdown(report));
  console.log(`[nova-sfx] wrote ${path.relative(rootDir, args.jsonReportPath)}`);
  console.log(`[nova-sfx] wrote ${path.relative(rootDir, args.mdReportPath)}`);
}

function buildReport(args, selected, entries) {
  const candidates = entries.flatMap((entry) => entry.candidates);
  const replacements = entries.filter((entry) => entry.replacement);
  const failures = entries.filter((entry) => entry.errors.length);
  return {
    generatedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    force: args.force,
    modelId: args.modelId,
    outputFormat: args.outputFormat,
    outputDir: path.relative(rootDir, args.outputDir).replaceAll('\\', '/'),
    candidateDir: path.relative(rootDir, args.candidateDir).replaceAll('\\', '/'),
    candidateCount: args.candidateCount,
    delayMs: args.delayMs,
    counts: {
      selectedSounds: selected.length,
      candidates: candidates.length,
      generatedCandidates: candidates.filter((candidate) => candidate.generated).length,
      cleanCandidates: candidates.filter((candidate) => candidate.evaluation?.technicallyClean).length,
      replacements: replacements.length,
      failures: failures.length
    },
    replacements: replacements.map((entry) => entry.replacement),
    unchanged: entries
      .filter((entry) => !entry.replacement)
      .map((entry) => entry.productionTarget),
    entries,
    rollback: [
      'git checkout -- public/audio/sfx/nova-swarm',
      'git checkout -- scripts/generate-nova-swarm-sfx.mjs docs/elevenlabs-sfx-bake.md docs/reviews/elevenlabs-sfx-bake-report.md',
      'or revert the final commit'
    ]
  };
}

function renderMarkdown(report) {
  const lines = [
    '# ElevenLabs SFX Bake Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'This is a one-time local SFX asset bake. The shipped game plays local files only and does not call ElevenLabs at runtime.',
    '',
    '## Summary',
    '',
    `- Dry run: ${report.dryRun ? 'yes' : 'no'}`,
    `- Force/promote clean candidates: ${report.force ? 'yes' : 'no'}`,
    `- Model: ${report.modelId}`,
    `- Output format request: ${report.outputFormat}`,
    `- Selected SFX files: ${report.counts.selectedSounds}`,
    `- Generated candidates: ${report.counts.generatedCandidates}`,
    `- Technically clean candidates: ${report.counts.cleanCandidates}`,
    `- Production replacements: ${report.counts.replacements}`,
    `- Files with failures/warnings: ${report.counts.failures}`,
    '',
    '## Replacements',
    ''
  ];

  if (report.replacements.length) {
    for (const replacement of report.replacements) {
      lines.push(`- ${replacement.productionFile} from ${replacement.candidate}`);
    }
  } else {
    lines.push('- None.');
  }

  lines.push('', '## Candidates', '');
  if (report.entries.length) {
    lines.push('| SFX | Candidate | Duration | Size | Peak | Mean | Decision | Notes |');
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- |');
    for (const entry of report.entries) {
      if (!entry.candidates.length) {
        lines.push(`| ${entry.file} | n/a | n/a | n/a | n/a | n/a | ${entry.status} | ${entry.errors.join('; ') || 'No candidate generated.'} |`);
        continue;
      }
      for (const candidate of entry.candidates) {
        const evaluation = candidate.evaluation || {};
        const notes = [
          ...(evaluation.warnings || []),
          ...(evaluation.rejectReasons || []),
          candidate.error
        ].filter(Boolean).join('; ');
        lines.push(`| ${entry.file} | ${candidate.file} | ${formatCell(evaluation.durationSeconds)} | ${formatCell(evaluation.sizeBytes)} | ${formatDb(evaluation.maxDb)} | ${formatDb(evaluation.meanDb)} | ${candidate.decision} | ${notes || ''} |`);
      }
    }
  } else {
    lines.push('- None.');
  }

  lines.push(
    '',
    '## Unchanged Production Files',
    '',
    ...(report.unchanged.length ? report.unchanged.map((file) => `- ${file}`) : ['- None.']),
    '',
    '## Rollback',
    '',
    '```powershell',
    'git checkout -- public/audio/sfx/nova-swarm',
    'git checkout -- scripts/generate-nova-swarm-sfx.mjs docs/elevenlabs-sfx-bake.md docs/reviews/elevenlabs-sfx-bake-report.md',
    '# or revert the final commit',
    '```'
  );

  return `${lines.join('\n')}\n`;
}

function formatCell(value) {
  return value === undefined || value === null ? 'n/a' : String(value);
}

function formatDb(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} dB` : 'n/a';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const selected = selectSounds(args);
  requireApiKey(args);
  await mkdir(args.candidateDir, { recursive: true });
  await mkdir(args.outputDir, { recursive: true });

  if (args.dryRun) {
    const entries = selected.map((sound) => ({
      file: sound.file,
      prompt: sound.text,
      requestedDurationSeconds: sound.duration_seconds,
      promptInfluence: sound.prompt_influence,
      productionTarget: path.relative(rootDir, promotionTargetFor(sound, args)).replaceAll('\\', '/'),
      productionExists: existsSync(promotionTargetFor(sound, args)),
      candidates: [],
      replacement: null,
      status: 'dry_run',
      errors: []
    }));
    const report = buildReport(args, selected, entries);
    await writeReports(report, args);
    console.log(`[nova-sfx] dry run: ${selected.length} selected SFX file(s)`);
    for (const sound of selected) {
      console.log(`- ${sound.file} (${sound.duration_seconds}s)`);
    }
    return;
  }

  const entries = [];
  for (const sound of selected) {
    entries.push(await generateSound(sound, args));
  }

  const report = buildReport(args, selected, entries);
  await writeReports(report, args);

  console.log(`[nova-sfx] complete: ${report.counts.generatedCandidates} candidate(s), ${report.counts.replacements} replacement(s), ${report.counts.failures} file(s) with failures`);
  if (report.counts.failures) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
