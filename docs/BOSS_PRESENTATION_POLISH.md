# Boss Presentation Polish

## Scope

This pass is presentation-only. It does not change boss health, damage, attack cadence, projectile speeds, hitboxes, score rewards, player stats, lives, unlocks, ranks, leaderboards, Steam paths, or normal enemy pacing.

## In-Engine Changes

- Bosses now expose lightweight acting states through existing runtime telemetry: `idle`, `charge`, `firing`, `hurt`, `phaseChange`, and `death`.
- Charge/firing adds local recoil, node glow, muzzle flash, and a quick settle-back without changing shot timing or projectile creation.
- Hurt feedback uses a throttled spark/flash/snap layer so rapid player fire reads as impact without flooding the particle pool.
- Phase changes add a pulse ring and existing surge SFX/shockwave while preserving the signature telegraph and phase thresholds.
- Defeat feedback uses the existing boss explosion and shockwave hooks, with celebration bursts centered near the defeated boss instead of only random screen bursts.
- Special hazards remain driven by the existing hazard data. Beam/cone/wall/ring hit tests are unchanged; only layered graphics were added.

## Archetype Personality

- Conductor and choir bosses get baton-like sweep lines and wave staff pulses.
- Forge and monolith bosses dip heavier into slam/heat shapes.
- Mirror bosses shimmer with offset duplicate panels.
- Needle bosses twitch the aim spike during charge and fire.
- Vortex bosses spin their inner arms harder during action.
- Jester bosses bounce fakeout nodes.
- Carrier bosses pulse drone-bay pips.
- Clock bosses show sharper tick-hand movement.

## Special Attack Readability

- Beam hazards add cross-bands and moving chevrons so they read as powered force lanes, not flat lines.
- Cone/web hazards add node points on the strand edges.
- Tractor hijack VFX adds directional chevrons along the beam to make the pull direction clearer.
- Ring and wall hazards keep their existing safe-lane presentation and collision geometry.

## Audio

This pass reuses the existing catalogued boss SFX (`boss_beam_telegraph`, `boss_beam_fire`, `boss_web_telegraph`, `boss_web_fire`, `boss_net_telegraph`, `boss_net_fire`, `boss_phase_surge`, `boss_hazard_impact`) rather than adding new ElevenLabs assets. That keeps the audio audit surface stable while still letting the improved visual states fire the existing cues more expressively.

## Tooling Note

Procedural PIXI animation stayed the best fit for this pass. Rive and dotLottie both have official web runtimes, but they would add a new asset authoring/export/runtime path to a release-sensitive game. Spine was not a good "free tooling" fit because its runtime integration is tied to a valid editor license. DragonBones has MIT JavaScript runtimes, but it would still introduce a separate skeletal animation pipeline. In-engine VFX kept the change small, testable, and aligned with current boss hitbox telemetry.

References checked:
- Rive runtime/docs: https://rive.app/docs/runtimes/web
- Rive runtime size notes: https://rive.app/docs/runtimes/runtime-sizes
- dotLottie web player: https://developers.lottiefiles.com/docs/dotlottie-player/dotlottie-web/
- Spine license: https://esotericsoftware.com/licenses/Spine-Runtimes-License-Agreement.pdf
- DragonBones GitHub: https://github.com/DragonBones

## Evidence

Run `npm run capture:boss-vfx-polish` after `npm run build:current`. Evidence is written under `test-results/boss-vfx-polish/<timestamp>/` and should include level 1, level 5, level 10, and a special beam-hazard capture plus `report.json`.
