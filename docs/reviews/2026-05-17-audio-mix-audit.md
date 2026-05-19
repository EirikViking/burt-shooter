# Audio Mix Audit - 2026-05-19

Generated: 2026-05-19T16:46:03.359Z

This FFmpeg `volumedetect` pass measures referenced music, SFX, and voice files, then applies the current default in-game volume multipliers. It is objective release evidence, not a final by-ear approval.

## Defaults

- Master: 0.3
- Music: 0.2 (effective 0.060)
- SFX base: 0.4 (effective 0.120 before per-event mix)
- Voice base: 0.45 (effective 0.135 before per-event mix)

## Coverage

- Measured files: 126
- Music rows: 26
- SFX rows: 121
- Voice rows: 26
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
| sfx | boss_explode | lowFrequency_explosion_001.mp3 | -1.1 dB | -20.0 dB | -34.8 dB |
| sfx | boss_explode | lowFrequency_explosion_000.mp3 | -1.2 dB | -20.1 dB | -37.2 dB |
| sfx | nova_number_one_fanfare | nova_number_one_fanfare.mp3 | -2.1 dB | -20.1 dB | -33.4 dB |
| sfx | boss_reveal_stinger | boss_reveal_stinger.mp3 | -0.2 dB | -20.3 dB | -28.9 dB |
| sfx | shoot_heavy | laserLarge_002.mp3 | -0.3 dB | -20.4 dB | -36.9 dB |
| sfx | shoot_heavy | laserLarge_004.mp3 | -0.6 dB | -20.7 dB | -37.4 dB |
| sfx | nova_top3_fanfare | nova_top3_fanfare.mp3 | -2.2 dB | -21.0 dB | -37.8 dB |
| sfx | shoot_heavy | laserLarge_003.mp3 | -1.0 dB | -21.1 dB | -38.3 dB |
| sfx | shoot_heavy | laserLarge_001.mp3 | -1.1 dB | -21.2 dB | -36.9 dB |
| sfx | shoot_heavy | laserLarge_000.mp3 | -1.2 dB | -21.3 dB | -37.6 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | mission_control_top3_highscore | mission_control_top3_highscore_01.mp3 | -1.1 dB | -18.3 dB | -32.3 dB |
| voice | mission_control_number_one_highscore | mission_control_number_one_highscore_01.mp3 | -1.6 dB | -18.5 dB | -30.1 dB |
| voice | mission_control_boss_inbound | mission_control_boss_inbound.mp3 | -0.9 dB | -19.0 dB | -33.9 dB |
| voice | intro_narrator_03 | intro_narrator_03.mp3 | -1.0 dB | -19.3 dB | -32.4 dB |
| voice | mission_control_number_one_close | mission_control_number_one_close_01.mp3 | -1.8 dB | -19.4 dB | -30.7 dB |
| voice | intro_narrator_04 | intro_narrator_04.mp3 | -1.1 dB | -19.4 dB | -33.6 dB |
| voice | mission_control_global_highscore | mission_control_global_highscore_01.mp3 | -1.8 dB | -19.5 dB | -32.1 dB |
| voice | intro_narrator_02 | intro_narrator_02.mp3 | -1.3 dB | -19.6 dB | -32.8 dB |

## Quietest Effective Peaks

### SFX

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| sfx | enemy_shoot | laserSmall_003.mp3 | -7.9 dB | -41.2 dB | -55.7 dB |
| sfx | menu_tick | nova_menu_tick.mp3 | -7.4 dB | -39.8 dB | -57.4 dB |
| sfx | forceField | nova_shield_snap.mp3 | -13.7 dB | -38.1 dB | -62.9 dB |
| sfx | nova_shield_snap | nova_shield_snap.mp3 | -13.7 dB | -37.5 dB | -62.3 dB |
| sfx | shield_up | nova_shield_snap.mp3 | -13.7 dB | -37.3 dB | -62.1 dB |
| sfx | ui_open | nova_menu_tick.mp3 | -7.4 dB | -36.9 dB | -54.5 dB |
| sfx | menuSelect | nova_menu_tick.mp3 | -7.4 dB | -36.3 dB | -53.9 dB |
| sfx | trait_bonus_hit | nova_combo_tick.mp3 | -4.6 dB | -34.7 dB | -42.8 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | mission_control_restart | mission_control_restart_01.mp3 | -2.2 dB | -22.4 dB | -36.8 dB |
| voice | mission_control_level_start | mission_control_level_start.mp3 | -1.3 dB | -21.1 dB | -33.4 dB |
| voice | mission_control_local_highscore | mission_control_local_highscore_01.mp3 | -1.8 dB | -20.9 dB | -34.0 dB |
| voice | mission_control_game_over | mission_control_game_over.mp3 | -2.0 dB | -20.9 dB | -31.3 dB |
| voice | mission_control_launch | mission_control_launch.mp3 | -2.1 dB | -20.8 dB | -31.9 dB |
| voice | mission_control_hijacker | mission_control_hijacker_01.mp3 | -1.2 dB | -20.8 dB | -34.7 dB |
| voice | mission_control_near_miss | mission_control_near_miss_01.mp3 | -1.7 dB | -20.6 dB | -33.8 dB |
| voice | mission_control_personal_best | mission_control_personal_best_01.mp3 | -1.4 dB | -20.5 dB | -33.6 dB |

## Warnings

- None.

## Remaining Manual Check

- Listen through menu, normal gameplay, wave clear, boss inbound, boss fight, victory, and game over on headphones or speakers.
- Confirm mission-control calls are intelligible when music ducks and combat SFX are active.
- Confirm repeated player shots and explosions feel energetic without becoming tiring over a 10-15 minute run.
