# Elite Middle Ships

## Design Purpose

Elite middle ships are priority threats between normal enemies and bosses. They are rarer than normal waves, weaker than bosses, and built around readable special behaviors instead of bulk HP. The intended player read is: "that one matters; focus it."

They do not change boss HP, boss damage, boss timing, projectile speed, scoring, leaderboards, ship unlocks, rank progression, player base stats, normal enemy unlock pacing, or the six-to-eight-wave boss pacing model.

## Spawn Rules

- First unlock: level 3.
- Level 11 pool: four elites, not the full roster.
- Level 40 pool: all 20 elites.
- Levels below 30 cap active elite middle ships at 1.
- Levels 30 and later may stage up to 2 active elite middle ships.
- Spawn plans use normal wave configs and avoid the first wave and final pre-boss wave.
- Elites are introduced as normal-wave priority threats, not boss-gate or boss-phase entities.
- Old random `applyElite()` normal-enemy bulk upgrades are not used by the wave spawner.

## Roster

| ID | Display name | Role | Unlock | Special ability | Asset |
|---|---|---:|---:|---|---|
| `nova_elite_tractor_puller` | Grav Hook Interceptor | Tractor puller | 3 | Tractor cone and debuff roll | `public/art/generated/nova-swarm/elites/nova-elite-middle-01-tractor-puller-20260523.png` |
| `nova_elite_shield_projector` | Aegis Halo Projector | Shield projector | 5 | Brief shield aura | `public/art/generated/nova-swarm/elites/nova-elite-middle-02-shield-projector-20260523.png` |
| `nova_elite_drone_carrier` | Latchbay Drone Carrier | Drone carrier | 8 | Launches weak escorts | `public/art/generated/nova-swarm/elites/nova-elite-middle-03-drone-carrier-20260523.png` |
| `nova_elite_mine_layer` | Cinder Mine Layer | Mine layer | 10 | Slow mine-style drops | `public/art/generated/nova-swarm/elites/nova-elite-middle-04-mine-layer-20260523.png` |
| `nova_elite_sniper_rail` | Needleline Rail Sniper | Sniper rail ship | 12 | Telegraph rail shot | `public/art/generated/nova-swarm/elites/nova-elite-middle-05-sniper-rail-ship-20260523.png` |
| `nova_elite_jammer_disruptor` | Static Choir Jammer | Jammer disruptor | 15 | Close cooldown hiccup | `public/art/generated/nova-swarm/elites/nova-elite-middle-06-jammer-disruptor-20260523.png` |
| `nova_elite_repair_healer` | Mender Lattice Healer | Repair healer ship | 18 | Small ally repair pulse | `public/art/generated/nova-swarm/elites/nova-elite-middle-07-repair-healer-ship-20260523.png` |
| `nova_elite_splitter_clone` | Twin-Shell Splitter | Splitter clone ship | 20 | Weak escorts on death | `public/art/generated/nova-swarm/elites/nova-elite-middle-08-splitter-clone-ship-20260523.png` |
| `nova_elite_barrier_projector` | Hardlight Barrier Projector | Barrier projector | 22 | Brief hardlight armor | `public/art/generated/nova-swarm/elites/nova-elite-middle-09-barrier-projector-20260523.png` |
| `nova_elite_vortex_gravity` | Vortex Gravity Well | Vortex gravity ship | 24 | Soft non-damaging pull | `public/art/generated/nova-swarm/elites/nova-elite-middle-10-vortex-gravity-ship-20260523.png` |
| `nova_elite_burst_artillery` | Amber Burst Artillery | Burst artillery ship | 26 | Spaced burst volley | `public/art/generated/nova-swarm/elites/nova-elite-middle-11-burst-artillery-ship-20260523.png` |
| `nova_elite_phase_raider` | Phaseglass Raider | Phase raider | 28 | Brief damage reduction | `public/art/generated/nova-swarm/elites/nova-elite-middle-12-phase-raider-20260523.png` |
| `nova_elite_lane_blocker` | Lane Lock Bastion | Lane blocker | 30 | Sparse lane wall | `public/art/generated/nova-swarm/elites/nova-elite-middle-13-lane-blocker-20260523.png` |
| `nova_elite_orb_webber` | Orbweb Threader | Orb webber | 32 | Slow web orb spread | `public/art/generated/nova-swarm/elites/nova-elite-middle-14-orb-webber-20260523.png` |
| `nova_elite_missile_frigate` | Redcap Missile Frigate | Missile frigate | 34 | Two slow missiles | `public/art/generated/nova-swarm/elites/nova-elite-middle-15-missile-frigate-20260523.png` |
| `nova_elite_mirror_decoy` | Mirrorwake Decoy | Mirror decoy ship | 36 | Harmless visual decoys | `public/art/generated/nova-swarm/elites/nova-elite-middle-16-mirror-decoy-ship-20260523.png` |
| `nova_elite_pulse_emp` | Bluecoil Pulse EMP | Pulse EMP ship | 38 | Close radial cooldown pulse | `public/art/generated/nova-swarm/elites/nova-elite-middle-17-pulse-emp-ship-20260523.png` |
| `nova_elite_anchor_turret` | Anchor Turret Hulk | Anchor turret ship | 40 | Anchored fan burst | `public/art/generated/nova-swarm/elites/nova-elite-middle-18-anchor-turret-ship-20260523.png` |
| `nova_elite_escort_commander` | Crownline Escort Commander | Escort commander | 40 | Brief ally command aura | `public/art/generated/nova-swarm/elites/nova-elite-middle-19-escort-commander-20260523.png` |
| `nova_elite_hunter` | Nightglide Elite Hunter | Late game elite hunter | 40 | Fast hunter volley | `public/art/generated/nova-swarm/elites/nova-elite-middle-20-late-game-elite-hunter-20260523.png` |

Source atlas: `public/art/generated/nova-swarm/source/nova-elite-middle-ships-20-sheet-20260523-source.png`  
Review sheet: `public/art/generated/nova-swarm/elites/nova-elite-middle-ships-contact-sheet-20260523.jpg`

## Tractor Debuffs

Tractor capture now rolls one temporary status effect, then grants a 5.5 second tractor debuff immunity window. Effects clear on life loss, respawn, restart/new run via new player construction, and player destroy.

| ID | Label | Duration | Effect |
|---|---|---:|---|
| `engine_drag` | ENGINE DRAG | 3.8s | Movement speed reduced |
| `weapon_jam` | WEAPON JAM | 0.9s | Shooting blocked very briefly |
| `fire_rate_drain` | FIRE DRAIN | 3.6s | Fire delay increased |
| `powerup_nullification` | PWR NULL | 2.3s | Active powerup effects suppressed without deleting timers |
| `control_drift` | CONTROL DRIFT | 3.8s | Mild inertia/drift, no reverse controls |
| `shield_flicker` | SHIELD FLICKER | 2.5s | Shield/defense suppression with flicker |
| `target_scramble` | TARGET SCRAMBLE | 3.4s | Wider spread and slight shot jitter |
| `cooldown_spike` | COOLDOWN SPIKE | 2.6s | Dodge/shoot cooldown bump |
| `energy_leak` | ENERGY LEAK | 3.3s | Temporary damage and bullet-speed reduction |
| `sensor_glitch` | SENSOR GLITCH | 2.2s | Small local HUD/player visual distortion |

## VFX Notes

- Tractor beams use layered cones, rings, strands, capture bursts, and a player status ring.
- Elite abilities render telegraph rings and role-specific cues: aim lines, shield/repair/command nodes, vortex/tractor cones, and radial charge marks.
- Debuff HUD rows are shown under `SYSTEM STATUS` with timers and colors.
- VFX intentionally stays low-opacity so bullets and safe lanes remain readable.

## SFX Notes

The elite audio pass uses ElevenLabs Sound Generation and stores runtime files in `public/audio/sfx/nova-swarm/`. Shared generated cues cover elite arrival, special charge, elite death, tractor capture, debuff apply, and debuff recovery:

- `nova_elite_spawn_alert.mp3`
- `nova_elite_special_charge.mp3`
- `nova_elite_death.mp3`
- `nova_tractor_capture_sting.mp3`
- `nova_tractor_debuff_apply.mp3`
- `nova_tractor_debuff_expire.mp3`

Each elite middle ship also has its own generated active/special cue wired through `src/config/EliteMiddleShips.js` and `src/audio/SoundCatalog.js`:

- `nova_elite_tractor_puller_active.mp3`
- `nova_elite_shield_projector_active.mp3`
- `nova_elite_drone_carrier_active.mp3`
- `nova_elite_mine_layer_active.mp3`
- `nova_elite_sniper_rail_active.mp3`
- `nova_elite_jammer_disruptor_active.mp3`
- `nova_elite_repair_healer_active.mp3`
- `nova_elite_splitter_clone_active.mp3`
- `nova_elite_barrier_projector_active.mp3`
- `nova_elite_vortex_gravity_active.mp3`
- `nova_elite_burst_artillery_active.mp3`
- `nova_elite_phase_raider_active.mp3`
- `nova_elite_lane_blocker_active.mp3`
- `nova_elite_orb_webber_active.mp3`
- `nova_elite_missile_frigate_active.mp3`
- `nova_elite_mirror_decoy_active.mp3`
- `nova_elite_pulse_emp_active.mp3`
- `nova_elite_anchor_turret_active.mp3`
- `nova_elite_escort_commander_active.mp3`
- `nova_elite_hunter_active.mp3`

`npm run check:elite-ships` requires all 20 active elite SFX keys to be unique so this cannot silently regress to shared role audio.

## Validation

- `npm run check:elite-ships`
- `npm run check:tractor-debuffs`
- `npm run check:wave-pacing`
- `npm run check:generated-rosters`
- `npm run check:enemy-weapons`
- `npm run check:enemy-wave-patterns`
- Evidence capture: `npm run capture:elite-middle-ships`, latest reviewed output `test-results/elite-middle-ships/2026-05-23T08-07-43-629Z/`

## Known Risks And Follow Ups

- Some elite abilities intentionally reuse existing projectile behavior rather than adding bespoke physics. This keeps the release surface small but leaves room for later role-specific refinements.
- The new SFX were generated quickly from role prompts and validated structurally by the audio audit. A manual listening pass is still recommended before release freeze.
- Late-game two-elite combinations should be watched in longer playtests; the cap is conservative, but the commander, repairer, and barrier roles are the highest-risk pairings.
