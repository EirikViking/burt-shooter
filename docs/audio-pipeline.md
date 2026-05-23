# Audio Pipeline Notes

## Announcer voicepack

Current shipped game-facing voice lines are stored in:

```text
public/audio/voice/mission-control/
public/audio/voice/nova-swarm/
```

The current pack was regenerated on 2026-05-19 with the Misfit Galaxy `Female misfit` ElevenLabs voice (`SIbt9DJkaY96v2K2fQyQ`) using `eleven_v3`. This replaces the earlier `Microsoft Zira Desktop` fallback pack. The API key must stay in the local environment and must never be committed, logged, or printed.

To regenerate the current ElevenLabs voice pack, set `ELEVENLABS_API_KEY` in the shell environment and run:

```bash
npm run generate:announcer-voicepack
```

To regenerate the old local fallback pack for emergency/offline work, run:

```bash
npm run generate:local-announcer-voicepack
```

The ElevenLabs generator covers the mission-control variation pools plus the four intro narration files.

## Nova Swarm SFX pack

The current bespoke arcade SFX layer was generated with ElevenLabs Sound Generation and is stored in:

```text
public/audio/sfx/nova-swarm/
```

To regenerate the current generated SFX pack, set `ELEVENLABS_API_KEY` in the shell environment and run:

```bash
npm run generate:nova-sfx
```

Current generated SFX include boss arrival, leaderboard/highscore fanfares, powerup and trait cues, UI/pause/ship-select cues, and the 2026-05-22 tractor/boss-special attack cues:

- `nova_tractor_lock_charge.mp3`, `nova_tractor_beam_active.mp3`, `nova_tractor_break_bloom.mp3`
- `nova_boss_beam_telegraph.mp3`, `nova_boss_beam_fire.mp3`
- `nova_boss_web_telegraph.mp3`, `nova_boss_web_snap.mp3`
- `nova_boss_net_telegraph.mp3`, `nova_boss_net_burst.mp3`
- `nova_boss_hazard_impact.mp3`

The 2026-05-23 elite middle ship follow-up added a compact ElevenLabs SFX pack for role identity. Each of the 20 elite middle ships has one unique active/special cue, and the shared elite/tractor status events now point at generated files instead of reused fallback combinations:

- `nova_elite_spawn_alert.mp3`, `nova_elite_special_charge.mp3`, `nova_elite_death.mp3`
- `nova_tractor_capture_sting.mp3`, `nova_tractor_debuff_apply.mp3`, `nova_tractor_debuff_expire.mp3`
- `nova_elite_tractor_puller_active.mp3`, `nova_elite_shield_projector_active.mp3`, `nova_elite_drone_carrier_active.mp3`, `nova_elite_mine_layer_active.mp3`
- `nova_elite_sniper_rail_active.mp3`, `nova_elite_jammer_disruptor_active.mp3`, `nova_elite_repair_healer_active.mp3`, `nova_elite_splitter_clone_active.mp3`
- `nova_elite_barrier_projector_active.mp3`, `nova_elite_vortex_gravity_active.mp3`, `nova_elite_burst_artillery_active.mp3`, `nova_elite_phase_raider_active.mp3`
- `nova_elite_lane_blocker_active.mp3`, `nova_elite_orb_webber_active.mp3`, `nova_elite_missile_frigate_active.mp3`, `nova_elite_mirror_decoy_active.mp3`
- `nova_elite_pulse_emp_active.mp3`, `nova_elite_anchor_turret_active.mp3`, `nova_elite_escort_commander_active.mp3`, `nova_elite_hunter_active.mp3`

`npm run check:elite-ships` now fails if two elite middle ships share the same active SFX key.

Do not put the API key in `.env` unless `.env` is confirmed ignored by git, and never commit generated logs or screenshots that contain secrets. The script reads the key only from `process.env.ELEVENLABS_API_KEY` and does not print it.

Optional environment overrides:

```bash
ELEVENLABS_VOICE_ID=<voice id>
ELEVENLABS_MODEL_ID=<model id>
```

## Runtime behavior

- `src/assets/assetManifest.js` lists all voice assets for catalog lookup.
- `src/audio/SoundCatalog.js` maps mission-control events to generated MP3 files, keeps separate music pools for menu, scoreboard, gameplay, boss, victory, and game over contexts, and owns the default SFX/voice mix presets used by `AudioManager`.
- `src/audio/AudioManager.js` applies short music ducking while voice lines play, puts mission-control lines in an exclusive announcer group, and uses per-event variant bags to prevent immediate repeats.
- High-traffic SFX are pooled by resolved URL so repeated hits/explosions do not create a new media element for every frame of combat.
- The service worker bypasses audio and `Range` requests. Letting the browser/network handle media directly avoids stale cache responses and local preview 404/HTML fallbacks during longer playtests.
- Pause uses `AudioManager.setPauseDucked(true)` so music stays continuous but quieter.
- `npm run check:audio` verifies manifest audio files, catalog references, music contexts, mix keys, and voice fallback mappings. It also runs as part of `npm run build`.
- `npm run check:announcer-voice` verifies the announcer variant pools, local/global highscore voice hooks, no legacy root voice files in `public/audio/voice`, and the no-repeat runtime marker.
- `npm run smoke` checks that production gameplay does not accidentally use menu, game-over, boss, or victory music; it also verifies boss theme, victory stinger, and return-to-gameplay music after boss defeat.
- `npm run playtest:release` runs a longer no-debug survival pass with audio/art asset preflight and fails on console, page, HTTP, or request failures.

## Current voice events

- `mission_control_launch`
- `mission_control_level_start`
- `mission_control_wave_clear`
- `mission_control_boss_inbound`
- `mission_control_life_low`
- `mission_control_powerup`
- `mission_control_victory`
- `mission_control_game_over`
- `mission_control_combo`
- `mission_control_local_highscore`
- `mission_control_global_highscore`
- `mission_control_personal_best`
- `mission_control_restart`
- `mission_control_hijacker`
- `mission_control_tractor_hijack`
