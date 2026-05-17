# Audio Mix Audit - 2026-05-17

Generated: 2026-05-17T07:19:43.355Z

This FFmpeg `volumedetect` pass measures referenced music, SFX, and voice files, then applies the current default in-game volume multipliers. It is objective release evidence, not a final by-ear approval.

## Defaults

- Master: 0.3
- Music: 0.2 (effective 0.060)
- SFX base: 0.4 (effective 0.120 before per-event mix)
- Voice base: 0.45 (effective 0.135 before per-event mix)

## Coverage

- Measured files: 72
- Music rows: 12
- SFX rows: 72
- Voice rows: 16
- Warnings: 7
- Errors: 0

## Loudest Effective Peaks

### Music

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| music | menu | Brave Pilots (Menu Screen).mp3 | 0.0 dB | -24.4 dB | -36.4 dB |
| music | menu | SkyFire (Title Screen).mp3 | 0.0 dB | -24.4 dB | -35.5 dB |
| music | scoreboard | Space Heroes.mp3 | 0.0 dB | -24.4 dB | -36.1 dB |
| music | scoreboard | SkyFire (Title Screen).mp3 | 0.0 dB | -24.4 dB | -35.5 dB |
| music | gameplay | bgm_v2.mp3 | 0.0 dB | -24.4 dB | -37.3 dB |
| music | gameplay | Battle in the Stars.mp3 | 0.0 dB | -24.4 dB | -37.9 dB |
| music | boss | DeathMatch (Boss Theme).mp3 | 0.0 dB | -24.4 dB | -37.4 dB |
| music | gameplay | Without Fear.mp3 | -0.5 dB | -24.9 dB | -37.1 dB |

### SFX

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| sfx | boss_explode | lowFrequency_explosion_001.mp3 | -1.1 dB | -20.0 dB | -34.8 dB |
| sfx | boss_explode | lowFrequency_explosion_000.mp3 | -1.2 dB | -20.1 dB | -37.2 dB |
| sfx | shoot_heavy | laserLarge_002.mp3 | -0.3 dB | -20.4 dB | -36.9 dB |
| sfx | shoot_heavy | laserLarge_004.mp3 | -0.6 dB | -20.7 dB | -37.4 dB |
| sfx | shoot_heavy | laserLarge_003.mp3 | -1.0 dB | -21.1 dB | -38.3 dB |
| sfx | shoot_heavy | laserLarge_001.mp3 | -1.1 dB | -21.2 dB | -36.9 dB |
| sfx | shoot_heavy | laserLarge_000.mp3 | -1.2 dB | -21.3 dB | -37.6 dB |
| sfx | shoot_alt | laserRetro_000.mp3 | -0.2 dB | -21.7 dB | -29.3 dB |
| sfx | shoot_alt | laserRetro_003.mp3 | -0.2 dB | -21.7 dB | -29.4 dB |
| sfx | playerHit | impactMetal_000.mp3 | -1.2 dB | -21.8 dB | -42.9 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | you_win | you_win.mp3 | -0.5 dB | -19.4 dB | -33.5 dB |
| voice | game_over | game_over.mp3 | -0.9 dB | -19.8 dB | -33.9 dB |
| voice | round | final_round.mp3 | -0.1 dB | -21.1 dB | -38.0 dB |
| voice | wave_clear | objective_achieved.mp3 | -0.5 dB | -21.2 dB | -39.2 dB |
| voice | mission_complete | mission_completed.mp3 | -1.5 dB | -21.7 dB | -35.6 dB |
| voice | war_look_out | war_look_out.mp3 | -0.7 dB | -22.5 dB | -37.1 dB |
| voice | powerup | power_up.mp3 | -0.9 dB | -23.0 dB | -35.7 dB |
| voice | mission_control_life_low | mission_control_life_low.mp3 | -4.9 dB | -23.6 dB | -42.5 dB |

## Quietest Effective Peaks

### SFX

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| sfx | enemy_shoot | laserSmall_003.mp3 | -7.9 dB | -41.2 dB | -55.7 dB |
| sfx | spaceEngine | spaceEngine_000.mp3 | -1.3 dB | -34.6 dB | -43.2 dB |
| sfx | thrusterFire | thrusterFire_000.mp3 | -0.9 dB | -34.2 dB | -52.4 dB |
| sfx | enemy_shoot | laserRetro_001.mp3 | -0.7 dB | -34.0 dB | -41.0 dB |
| sfx | enemy_shoot | laserRetro_000.mp3 | -0.2 dB | -33.5 dB | -41.1 dB |
| sfx | computerNoise | computerNoise_000.mp3 | -1.3 dB | -32.9 dB | -39.5 dB |
| sfx | ui_close | doorClose_001.mp3 | -1.4 dB | -32.2 dB | -46.6 dB |
| sfx | ui_close | doorClose_000.mp3 | -1.1 dB | -31.9 dB | -48.8 dB |

### Voice

| Type | Event | File | Raw peak | Effective peak | Effective mean |
| --- | --- | --- | ---: | ---: | ---: |
| voice | mission_control_game_over | mission_control_game_over.mp3 | -7.4 dB | -26.1 dB | -43.4 dB |
| voice | mission_control_wave_clear | mission_control_wave_clear.mp3 | -4.7 dB | -24.3 dB | -42.0 dB |
| voice | mission_control_powerup | mission_control_powerup.mp3 | -2.5 dB | -23.8 dB | -44.7 dB |
| voice | war_target | war_target_engaged.mp3 | -1.6 dB | -23.7 dB | -40.1 dB |
| voice | mission_control_level_start | mission_control_level_start.mp3 | -4.6 dB | -23.7 dB | -41.5 dB |
| voice | mission_control_boss_inbound | mission_control_boss_inbound.mp3 | -5.3 dB | -23.6 dB | -41.4 dB |
| voice | mission_control_launch | mission_control_launch.mp3 | -4.7 dB | -23.6 dB | -41.9 dB |
| voice | mission_control_life_low | mission_control_life_low.mp3 | -4.9 dB | -23.6 dB | -42.5 dB |

## Warnings

- music:menu /audio/music/Brave Pilots (Menu Screen).mp3 - raw peak is very close to full scale (0.0 dB)
- music:menu /audio/music/SkyFire (Title Screen).mp3 - raw peak is very close to full scale (0.0 dB)
- music:scoreboard /audio/music/Space Heroes.mp3 - raw peak is very close to full scale (0.0 dB)
- music:scoreboard /audio/music/SkyFire (Title Screen).mp3 - raw peak is very close to full scale (0.0 dB)
- music:gameplay /audio/music/bgm_v2.mp3 - raw peak is very close to full scale (0.0 dB)
- music:gameplay /audio/music/Battle in the Stars.mp3 - raw peak is very close to full scale (0.0 dB)
- music:boss /audio/music/DeathMatch (Boss Theme).mp3 - raw peak is very close to full scale (0.0 dB)

## Remaining Manual Check

- Listen through menu, normal gameplay, wave clear, boss inbound, boss fight, victory, and game over on headphones or speakers.
- Confirm mission-control calls are intelligible when music ducks and combat SFX are active.
- Confirm repeated player shots and explosions feel energetic without becoming tiring over a 10-15 minute run.
