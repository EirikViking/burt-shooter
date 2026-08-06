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

Mayhem reinforcement warnings use a 100-line numbered mission-control pool:

```text
public/audio/voice/mission-control/mission_control_reinforcements_incoming_001.mp3
...
public/audio/voice/mission-control/mission_control_reinforcements_incoming_100.mp3
```

Regenerate only those warnings with:

```bash
npm run generate:reinforcement-voices
```

That generator is locked to the same approved `Female misfit` voice as the rest of mission control and rejects a different reinforcement voice ID. `npm run check:reinforcement-voices` verifies the 100 unique scripts, the numbered files, manifest/catalog coverage, and the approved voice guard.

## Boss death agony voicepack

The 2026-06-12 boss death follow-up adds a separate male ElevenLabs voice pool for boss agony screams:

```text
public/audio/voice/boss-death/
```

The default generator voice is `Callum - Husky Trickster` (`N2lVS1w4EtoT3dr4eOWO`) using `eleven_v3`. It is intentionally separate from the current Misfit Galaxy `Female misfit` mission-control voice (`SIbt9DJkaY96v2K2fQyQ`), and the generator refuses to run with that mission-control voice id. To regenerate the pack, set `ELEVENLABS_API_KEY` in the shell environment and run:

```bash
npm run generate:boss-death-voices
```

The runtime event is `boss_death_agony`, wired through `src/assets/assetManifest.js`, `src/audio/SoundCatalog.js`, and `AudioManager.playVoice(...)` from the boss-death impact path. `npm run check:boss-death-voices` verifies exactly 100 MP3 files, catalog coverage, the forbidden-voice guard, and the PlayScene death hook. This voice pack does not replace or alter music.

## Tactical upgrade boss commentary

The Tactical Draft and the pause-menu Tactical Upgrades inspector share a 297-line ElevenLabs commentary pack:

```text
public/audio/voice/tactical-boss-banter/
```

Every one of the 32 Tactical augments has its own relevant event and a shuffled bag of nine or ten silly comments. Focus changes are debounced, a new focus stops the previous comment, active boss-death/level-clear voice locks take priority, and confirming or closing the UI stops the tactical voice group. The existing Boss Voice setting controls the feature. Spoken audio remains English by project policy; no subtitle support is claimed.

The generator imports the current approved boss voice id and model from `src/config/BossDeathVoiceLines.js`, reads the key only from `ELEVENLABS_API_KEY`, and refuses a different voice override. Regenerate missing files with:

```bash
npm run generate:tactical-boss-banter
```

Useful safe modes are `--dry-run`, `--only=<line-id>`, and `--force`. Generation writes `tactical-boss-banter-manifest.json` with provider/model/voice provenance, byte counts, SHA-256 hashes, and `aiGeneratedVoiceDisclosure: true`. These performances are AI-generated with ElevenLabs.

Verification:

```bash
npm run check:tactical-boss-banter
npm run check:tactical-boss-banter-runtime
```

The static check requires exactly 297 unique scripts, 297 unique MP3 hashes, complete 32-augment/catalog/manifest coverage, and the approved voice guard. The installed-Chrome runtime check exercises Draft and loadout focus, detail inspection, no-immediate-repeat randomization, rapid-focus debounce, voice priority, and cancellation on confirmation/close.

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

- `nova_wonder_revelation.mp3` is the dedicated four-second wordless angelic choir and cathedral-scale revelation used by every Cabinet Wonder. It begins 1.5 seconds before the Wonder visual and replaces the former reused Viking Row cues.

- `nova_tractor_lock_charge.mp3`, `nova_tractor_beam_active.mp3`, `nova_tractor_break_bloom.mp3`
- `nova_boss_beam_telegraph.mp3`, `nova_boss_beam_fire.mp3`
- `nova_boss_web_telegraph.mp3`, `nova_boss_web_snap.mp3`
- `nova_boss_net_telegraph.mp3`, `nova_boss_net_burst.mp3`
- `nova_boss_hazard_impact.mp3`

The 2026-06-12 boss presentation follow-up added four more ElevenLabs Sound Generation one-shots for boss animation/spectacle events only. They do not change boss damage, cadence, projectiles, hitboxes, or hazard geometry:

- `nova_boss_entrance_impact.mp3`
- `nova_boss_charge_lattice.mp3`
- `nova_boss_damage_armor_crack.mp3`
- `nova_boss_death_cascade.mp3`

To regenerate only this boss impact set, set `ELEVENLABS_API_KEY` in the shell environment and run:

```bash
node scripts/generate-nova-swarm-sfx.mjs --only=nova_boss_entrance_impact.mp3,nova_boss_charge_lattice.mp3,nova_boss_damage_armor_crack.mp3,nova_boss_death_cascade.mp3
```

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
- Normal enemy threat telegraphs use `enemy_threat_soft_warn`, a low-volume reuse of existing force-field SFX. The sharper `elite_special_charge` cue is reserved for actual elite middle ship specials.
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
- `mission_control_reinforcements_incoming`
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
