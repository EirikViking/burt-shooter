# Audio Mix Audit - 2026-05-19

Generated: 2026-05-19T02:14:23.031Z

This FFmpeg `volumedetect` pass measures referenced music, SFX, and voice files, then applies the current default in-game volume multipliers. It is objective release evidence, not a final by-ear approval.

## Defaults

- Master: 0.3
- Music: 0.2 (effective 0.060)
- SFX base: 0.4 (effective 0.120 before per-event mix)
- Voice base: 0.45 (effective 0.135 before per-event mix)

## Coverage

- Measured files: 105
- Music rows: 13
- SFX rows: 119
- Voice rows: 19
- Warnings: 0
- Errors: 0

## Loudest Effective Peaks

### Music

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| music | gameplay | Without Fear.mp3 | -0.5 dB | -24.9 dB | -37.1 dB |
| music | menu | Brave Pilots (Menu Screen).mp3 | -1.0 dB | -25.4 dB | -37.9 dB |
| music | menu | SkyFire (Title Screen).mp3 | -1.0 dB | -25.4 dB | -37.0 dB |
| music | scoreboard | SkyFire (Title Screen).mp3 | -1.0 dB | -25.4 dB | -37.0 dB |
| music | scoreboard | Space Heroes.mp3 | -1.1 dB | -25.5 dB | -37.6 dB |
| music | gameplay | bgm_v2.mp3 | -1.1 dB | -25.5 dB | -38.8 dB |
| music | boss | DeathMatch (Boss Theme).mp3 | -1.1 dB | -25.5 dB | -38.9 dB |
| music | gameplay | Battle in the Stars.mp3 | -1.2 dB | -25.6 dB | -39.4 dB |

### SFX

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| sfx | boss_explode | lowFrequency_explosion_001.mp3 | -1.1 dB | -20.0 dB | -34.8 dB |
| sfx | boss_explode | lowFrequency_explosion_000.mp3 | -1.2 dB | -20.1 dB | -37.2 dB |
| sfx | boss_reveal_stinger | boss_reveal_stinger.mp3 | -0.2 dB | -20.3 dB | -28.9 dB |
| sfx | shoot_heavy | laserLarge_002.mp3 | -0.3 dB | -20.4 dB | -36.9 dB |
| sfx | shoot_heavy | laserLarge_004.mp3 | -0.6 dB | -20.7 dB | -37.4 dB |
| sfx | shoot_heavy | laserLarge_003.mp3 | -1.0 dB | -21.1 dB | -38.3 dB |
| sfx | shoot_heavy | laserLarge_001.mp3 | -1.1 dB | -21.2 dB | -36.9 dB |
| sfx | shoot_heavy | laserLarge_000.mp3 | -1.2 dB | -21.3 dB | -37.6 dB |
| sfx | shoot_alt | laserRetro_000.mp3 | -0.2 dB | -21.7 dB | -29.3 dB |
| sfx | shoot_alt | laserRetro_003.mp3 | -0.2 dB | -21.7 dB | -29.4 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | mission_control_global_highscore | mission_control_global_highscore_01.mp3 | -2.2 dB | -19.9 dB | -37.0 dB |
| voice | intro_narrator_04 | intro_narrator_04.mp3 | -1.9 dB | -20.2 dB | -37.6 dB |
| voice | intro_narrator_01 | intro_narrator_01.mp3 | -3.1 dB | -21.4 dB | -36.8 dB |
| voice | intro_narrator_02 | intro_narrator_02.mp3 | -3.1 dB | -21.4 dB | -37.9 dB |
| voice | mission_control_boss_inbound | mission_control_boss_inbound.mp3 | -3.3 dB | -21.4 dB | -38.0 dB |
| voice | mission_control_launch | mission_control_launch.mp3 | -3.1 dB | -21.8 dB | -38.3 dB |
| voice | mission_control_powerup | mission_control_powerup.mp3 | -2.7 dB | -21.8 dB | -38.9 dB |
| voice | mission_control_hijacker | mission_control_hijacker_01.mp3 | -2.4 dB | -22.0 dB | -39.7 dB |

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
| sfx | enemy_shoot | nova_enemy_pew_cluster.mp3 | -1.8 dB | -35.1 dB | -50.8 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | mission_control_personal_best | mission_control_personal_best_01.mp3 | -5.6 dB | -24.7 dB | -39.4 dB |
| voice | mission_control_game_over | mission_control_game_over.mp3 | -5.6 dB | -24.5 dB | -38.5 dB |
| voice | mission_control_level_start | mission_control_level_start.mp3 | -4.4 dB | -24.2 dB | -39.6 dB |
| voice | intro_narrator_03 | intro_narrator_03.mp3 | -5.7 dB | -24.0 dB | -37.7 dB |
| voice | mission_control_tractor_hijack | mission_control_tractor_hijack_01.mp3 | -4.5 dB | -23.6 dB | -38.9 dB |
| voice | mission_control_combo | mission_control_combo_01.mp3 | -4.2 dB | -23.5 dB | -39.4 dB |
| voice | mission_control_local_highscore | mission_control_local_highscore_01.mp3 | -4.0 dB | -23.1 dB | -38.8 dB |
| voice | mission_control_wave_clear | mission_control_wave_clear.mp3 | -3.6 dB | -22.7 dB | -37.2 dB |

## Warnings

- None.

## Remaining Manual Check

- Listen through menu, normal gameplay, wave clear, boss inbound, boss fight, victory, and game over on headphones or speakers.
- Confirm mission-control calls are intelligible when music ducks and combat SFX are active.
- Confirm repeated player shots and explosions feel energetic without becoming tiring over a 10-15 minute run.
