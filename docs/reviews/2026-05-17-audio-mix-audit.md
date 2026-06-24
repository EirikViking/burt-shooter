# Audio Mix Audit - 2026-06-24

Generated: 2026-06-24T13:49:18.964Z

This FFmpeg `volumedetect` pass measures referenced music, SFX, and voice files, then applies the current default in-game volume multipliers. It is objective release evidence, not a final by-ear approval.

## Defaults

- Master: 0.3
- Music: 0.2 (effective 0.060)
- SFX base: 0.4 (effective 0.120 before per-event mix)
- Voice base: 0.45 (effective 0.135 before per-event mix)

## Coverage

- Measured files: 773
- Music rows: 40
- SFX rows: 189
- Voice rows: 611
- Warnings: 12
- Errors: 0

## Loudest Effective Peaks

### Music

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| music | menu | nova_swarm_menu_starcoin_parade.mp3 | -0.4 dB | -24.8 dB | -40.6 dB |
| music | boss | nova_swarm_boss_gate_overdrive.mp3 | -0.4 dB | -24.8 dB | -39.8 dB |
| music | gameplay | Without Fear.mp3 | -0.5 dB | -24.9 dB | -37.1 dB |
| music | menu | Brave Pilots (Menu Screen).mp3 | -1.0 dB | -25.4 dB | -37.9 dB |
| music | menu | SkyFire (Title Screen).mp3 | -1.0 dB | -25.4 dB | -37.0 dB |
| music | scoreboard | SkyFire (Title Screen).mp3 | -1.0 dB | -25.4 dB | -37.0 dB |
| music | scoreboard | Space Heroes.mp3 | -1.1 dB | -25.5 dB | -37.6 dB |
| music | gameplay | bgm_v2.mp3 | -1.1 dB | -25.5 dB | -38.8 dB |

### SFX

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| sfx | nova_top10_fanfare | nova_top10_fanfare.mp3 | 0.0 dB | -19.3 dB | -31.2 dB |
| sfx | boss_death_cascade | nova_boss_death_cascade.mp3 | -0.1 dB | -19.6 dB | -36.9 dB |
| sfx | nova_boss_death_cascade | nova_boss_death_cascade.mp3 | -0.1 dB | -19.6 dB | -36.9 dB |
| sfx | boss_explode | lowFrequency_explosion_001.mp3 | -1.1 dB | -20.0 dB | -34.8 dB |
| sfx | overrun_clear_shockwave | nova_overrun_clear_shockwave.mp3 | -0.3 dB | -20.0 dB | -39.5 dB |
| sfx | boss_explode | lowFrequency_explosion_000.mp3 | -1.2 dB | -20.1 dB | -37.2 dB |
| sfx | nova_boss_death_forge | nova_boss_death_forge.mp3 | 0.0 dB | -20.1 dB | -32.3 dB |
| sfx | nova_boss_death_kurt | nova_boss_death_kurt.mp3 | -0.1 dB | -20.2 dB | -34.5 dB |
| sfx | nova_boss_death_clock | nova_boss_death_clock.mp3 | -0.1 dB | -20.2 dB | -33.7 dB |
| sfx | boss_reveal_stinger | boss_reveal_stinger.mp3 | -0.2 dB | -20.3 dB | -29.1 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | game_over_taunt | game_over_taunt_037.mp3 | -0.7 dB | -17.8 dB | -42.4 dB |
| voice | boss_death_agony | boss_death_agony_070.mp3 | -0.4 dB | -17.8 dB | -29.5 dB |
| voice | game_over_taunt | game_over_taunt_021.mp3 | -0.8 dB | -17.9 dB | -41.2 dB |
| voice | mission_control_overrun_clear_sector_50 | mission_control_overrun_clear_sector_50_01.mp3 | -1.0 dB | -18.0 dB | -31.4 dB |
| voice | boss_death_agony | boss_death_agony_029.mp3 | -0.6 dB | -18.0 dB | -30.3 dB |
| voice | boss_death_agony | boss_death_agony_040.mp3 | -0.6 dB | -18.0 dB | -30.0 dB |
| voice | boss_death_agony | boss_death_agony_062.mp3 | -0.6 dB | -18.0 dB | -29.2 dB |
| voice | mission_control_overrun_clear | mission_control_overrun_clear_01.mp3 | -1.1 dB | -18.1 dB | -30.8 dB |

## Quietest Effective Peaks

### SFX

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| sfx | codex_move | nova_codex_tick.wav | -17.2 dB | -54.0 dB | -65.0 dB |
| sfx | codex_back | nova_codex_tick.wav | -17.2 dB | -51.5 dB | -62.5 dB |
| sfx | codex_open | nova_codex_tick.wav | -17.2 dB | -50.5 dB | -61.5 dB |
| sfx | trait_bonus_hit | nova_combo_tick.mp3 | -4.6 dB | -45.0 dB | -53.1 dB |
| sfx | enemy_shoot | laserSmall_003.mp3 | -7.9 dB | -41.2 dB | -55.7 dB |
| sfx | menu_tick | nova_menu_tick.mp3 | -7.4 dB | -39.8 dB | -57.4 dB |
| sfx | forceField | nova_shield_snap.mp3 | -13.7 dB | -38.1 dB | -62.9 dB |
| sfx | enemy_threat_soft_warn | forceField_001.mp3 | -1.2 dB | -38.0 dB | -48.7 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | game_over_taunt | game_over_taunt_067.mp3 | -20.1 dB | -37.2 dB | -58.7 dB |
| voice | game_over_taunt | game_over_taunt_057.mp3 | -16.8 dB | -33.9 dB | -55.2 dB |
| voice | game_over_taunt | game_over_taunt_070.mp3 | -16.6 dB | -33.7 dB | -54.6 dB |
| voice | game_over_taunt | game_over_taunt_100.mp3 | -16.2 dB | -33.3 dB | -55.3 dB |
| voice | game_over_taunt | game_over_taunt_058.mp3 | -16.1 dB | -33.2 dB | -54.2 dB |
| voice | game_over_taunt | game_over_taunt_055.mp3 | -15.8 dB | -32.9 dB | -54.2 dB |
| voice | game_over_taunt | game_over_taunt_098.mp3 | -15.6 dB | -32.7 dB | -54.1 dB |
| voice | game_over_taunt | game_over_taunt_066.mp3 | -15.3 dB | -32.4 dB | -53.2 dB |

## Warnings

- sfx:nova_top10_fanfare /audio/sfx/nova-swarm/nova_top10_fanfare.mp3 - raw peak is very close to full scale (0.0 dB)
- sfx:nova_fuel_ship_pop /audio/sfx/nova-swarm/nova_fuel_ship_pop.mp3 - raw peak is very close to full scale (0.0 dB)
- sfx:nova_danger_mid_pop /audio/sfx/nova-swarm/nova_danger_mid_pop.mp3 - raw peak is very close to full scale (0.0 dB)
- sfx:nova_boss_death_forge /audio/sfx/nova-swarm/nova_boss_death_forge.mp3 - raw peak is very close to full scale (0.0 dB)
- sfx:nova_boss_death_needle /audio/sfx/nova-swarm/nova_boss_death_needle.mp3 - raw peak is very close to full scale (0.0 dB)
- sfx:nova_boss_death_jester /audio/sfx/nova-swarm/nova_boss_death_jester.mp3 - raw peak is very close to full scale (0.0 dB)
- sfx:nova_boss_death_carrier /audio/sfx/nova-swarm/nova_boss_death_carrier.mp3 - raw peak is very close to full scale (0.0 dB)
- voice:game_over_taunt /audio/voice/game-over-taunt/game_over_taunt_057.mp3 - voice peak is only 2.0 dB over estimated ducked music
- voice:game_over_taunt /audio/voice/game-over-taunt/game_over_taunt_058.mp3 - voice peak is only 2.7 dB over estimated ducked music
- voice:game_over_taunt /audio/voice/game-over-taunt/game_over_taunt_067.mp3 - voice peak is only -1.3 dB over estimated ducked music
- voice:game_over_taunt /audio/voice/game-over-taunt/game_over_taunt_070.mp3 - voice peak is only 2.2 dB over estimated ducked music
- voice:game_over_taunt /audio/voice/game-over-taunt/game_over_taunt_100.mp3 - voice peak is only 2.6 dB over estimated ducked music

## Remaining Manual Check

- Listen through menu, normal gameplay, wave clear, boss inbound, boss fight, victory, and game over on headphones or speakers.
- Confirm mission-control calls are intelligible when music ducks and combat SFX are active.
- Confirm repeated player shots and explosions feel energetic without becoming tiring over a 10-15 minute run.
