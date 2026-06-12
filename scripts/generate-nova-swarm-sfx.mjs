import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
const outputDir = path.resolve('public/audio/sfx/nova-swarm');
const force = process.argv.includes('--force');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const onlyFiles = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(',').map((item) => item.trim()).filter(Boolean))
  : null;

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

function requireApiKey() {
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is required. Keep it in the environment and never commit it.');
  }
}

async function generateSound(sound) {
  const target = path.join(outputDir, sound.file);
  if (!force && existsSync(target)) {
    console.log(`skip existing ${sound.file}`);
    return;
  }

  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: sound.text,
      duration_seconds: sound.duration_seconds,
      prompt_influence: sound.prompt_influence,
      output_format: 'mp3_44100_128'
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ElevenLabs SFX failed for ${sound.file}: HTTP ${response.status} ${body.slice(0, 240)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(target, buffer);
  console.log(`generated ${sound.file} (${buffer.length} bytes)`);
}

async function main() {
  requireApiKey();
  await mkdir(outputDir, { recursive: true });

  for (const sound of sounds.filter((entry) => !onlyFiles || onlyFiles.has(entry.file))) {
    await generateSound(sound);
  }

  console.log(`Nova Swarm SFX written to ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
