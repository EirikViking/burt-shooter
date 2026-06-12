# Audio Mix Audit - 2026-06-12

Generated: 2026-06-12T06:50:53.511Z

This FFmpeg `volumedetect` pass measures referenced music, SFX, and voice files, then applies the current default in-game volume multipliers. It is objective release evidence, not a final by-ear approval.

## Defaults

- Master: 0.3
- Music: 0.2 (effective 0.060)
- SFX base: 0.4 (effective 0.120 before per-event mix)
- Voice base: 0.45 (effective 0.135 before per-event mix)

## Coverage

- Measured files: 255
- Music rows: 26
- SFX rows: 174
- Voice rows: 111
- Warnings: 0
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
| sfx | boss_death_cascade | nova_boss_death_cascade.mp3 | -0.1 dB | -19.6 dB | -36.9 dB |
| sfx | nova_boss_death_cascade | nova_boss_death_cascade.mp3 | -0.1 dB | -19.6 dB | -36.9 dB |
| sfx | boss_explode | lowFrequency_explosion_001.mp3 | -1.1 dB | -20.0 dB | -34.8 dB |
| sfx | overrun_clear_shockwave | nova_overrun_clear_shockwave.mp3 | -0.3 dB | -20.0 dB | -39.5 dB |
| sfx | boss_explode | lowFrequency_explosion_000.mp3 | -1.2 dB | -20.1 dB | -37.2 dB |
| sfx | boss_reveal_stinger | boss_reveal_stinger.mp3 | -0.2 dB | -20.3 dB | -29.1 dB |
| sfx | shoot_heavy | laserLarge_002.mp3 | -0.3 dB | -20.4 dB | -36.9 dB |
| sfx | shoot_heavy | laserLarge_004.mp3 | -0.6 dB | -20.7 dB | -37.4 dB |
| sfx | shoot_heavy | laserLarge_003.mp3 | -1.0 dB | -21.1 dB | -38.3 dB |
| sfx | shoot_heavy | laserLarge_001.mp3 | -1.1 dB | -21.2 dB | -36.9 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | mission_control_overrun_clear_sector_50 | mission_control_overrun_clear_sector_50_01.mp3 | -1.0 dB | -18.0 dB | -31.4 dB |
| voice | mission_control_overrun_clear | mission_control_overrun_clear_01.mp3 | -1.1 dB | -18.1 dB | -30.8 dB |
| voice | mission_control_overrun_clear_sector_10 | mission_control_overrun_clear_sector_10_01.mp3 | -1.1 dB | -18.1 dB | -31.2 dB |
| voice | mission_control_overrun_clear_sector_20 | mission_control_overrun_clear_sector_20_01.mp3 | -1.1 dB | -18.1 dB | -31.0 dB |
| voice | mission_control_overrun_clear_far_signal | mission_control_overrun_clear_far_signal_01.mp3 | -1.1 dB | -18.1 dB | -31.8 dB |
| voice | one_more_run_13 | one_more_run_13.mp3 | -0.8 dB | -18.2 dB | -33.1 dB |
| voice | one_more_run_39 | one_more_run_39.mp3 | -0.8 dB | -18.2 dB | -31.5 dB |
| voice | one_more_run_40 | one_more_run_40.mp3 | -0.8 dB | -18.2 dB | -32.0 dB |

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
| voice | mission_control_level_start | mission_control_level_start_alt02.mp3 | -2.7 dB | -23.2 dB | -36.3 dB |
| voice | mission_control_restart | mission_control_restart_01.mp3 | -2.2 dB | -22.4 dB | -36.8 dB |
| voice | mission_control_powerup | mission_control_powerup_alt01.mp3 | -2.0 dB | -22.2 dB | -37.2 dB |
| voice | mission_control_combo | mission_control_combo_02.mp3 | -1.6 dB | -21.8 dB | -35.9 dB |
| voice | mission_control_combo | mission_control_combo_03.mp3 | -1.6 dB | -21.8 dB | -34.3 dB |
| voice | mission_control_level_start | mission_control_level_start.mp3 | -1.3 dB | -21.8 dB | -34.1 dB |
| voice | mission_control_powerup | mission_control_powerup_alt02.mp3 | -1.5 dB | -21.7 dB | -37.7 dB |
| voice | mission_control_level_start | mission_control_level_start_alt01.mp3 | -1.2 dB | -21.7 dB | -34.9 dB |

## Warnings

- None.

## Remaining Manual Check

- Listen through menu, normal gameplay, wave clear, boss inbound, boss fight, victory, and game over on headphones or speakers.
- Confirm mission-control calls are intelligible when music ducks and combat SFX are active.
- Confirm repeated player shots and explosions feel energetic without becoming tiring over a 10-15 minute run.
