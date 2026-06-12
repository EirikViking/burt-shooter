# Boss Presentation Polish

## Scope

This pass is presentation-only. It does not change boss health, damage, attack cadence, projectile speeds, hitboxes, score rewards, player stats, lives, unlocks, ranks, leaderboards, Steam paths, or normal enemy pacing.

## In-Engine Changes

- Bosses now expose lightweight acting states through existing runtime telemetry: `idle`, `arrival`, `arrivalImpact`, `charge`, `firing`, `hurt`, `phaseChange`, and `death`.
- Boss art can now present larger while preserving the legacy gameplay hit radius. Visual radius is used for HUD, rig, spark, and telegraph presentation; boss contact and hazard math continue to use the preserved gameplay radius.
- Bosses now use an articulated procedural PIXI rig over the generated body art: side armor plates, fins, mandibles, core shutters, animated weapon pods, exhaust, scan, aura, and impact layers move independently.
- Charge/firing adds local recoil, node glow, muzzle flash, and a quick settle-back without changing shot timing or projectile creation.
- Hurt feedback uses a throttled spark/flash/snap layer so rapid player fire reads as impact without flooding the particle pool.
- Phase changes add a pulse ring and existing surge SFX/shockwave while preserving the signature telegraph and phase thresholds.
- Defeat feedback uses the existing boss explosion and shockwave hooks, with a short contained flash, chained nearby bursts, extra shake, and celebration debris centered near the defeated boss instead of only random screen bursts.
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

This pass adds four new ElevenLabs Sound Generation SFX files under `public/audio/sfx/nova-swarm/` and wires them through the existing manifest/catalog/mix path:

- `nova_boss_entrance_impact.mp3`
- `nova_boss_charge_lattice.mp3`
- `nova_boss_damage_armor_crack.mp3`
- `nova_boss_death_cascade.mp3`

They were generated from original text prompts in `scripts/generate-nova-swarm-sfx.mjs` using only `ELEVENLABS_API_KEY` from the local environment. The key was not committed, logged, printed, or written to a file. Existing boss cues (`boss_beam_telegraph`, `boss_beam_fire`, `boss_web_telegraph`, `boss_web_fire`, `boss_net_telegraph`, `boss_net_fire`, `boss_phase_surge`, `boss_hazard_impact`, `boss_explode`, `explosionCrunch`) remain as layered support.

## Tooling Note

Procedural PIXI animation stayed the best fit for this pass. PIXI's scene graph supports nested containers with independent transforms, pivot/rotation/scale, and per-frame rendering hooks, so an in-engine articulated rig gives real motion without adding a new editor/runtime pipeline. Spritesheet animation remains a good future option if bespoke boss frame art is later authored, but this pass keeps the shipped generated boss art and animates it with original procedural parts.

Rive and dotLottie both have official web runtimes, but they would add a new asset authoring/export/runtime path to a release-sensitive game. Spine was not a good "free tooling" fit because its runtime integration is tied to a valid editor license. DragonBones has MIT JavaScript runtimes, but it would still introduce a separate skeletal animation pipeline. In-engine animation kept the change small, testable, and aligned with current boss hitbox telemetry.

References checked:
- PIXI scene objects / transforms: https://pixijs.com/8.x/guides/components/scene-objects
- PIXI AnimatedSprite / spritesheet option: https://pixijs.download/dev/docs/scene.AnimatedSprite.html
- ElevenLabs Sound Effects docs: https://elevenlabs.io/docs/overview/capabilities/sound-effects
- Rive runtime/docs: https://rive.app/docs/runtimes/web
- Rive runtime size notes: https://rive.app/docs/runtimes/runtime-sizes
- dotLottie web player: https://developers.lottiefiles.com/docs/dotlottie-player/dotlottie-web/
- Spine license: https://esotericsoftware.com/licenses/Spine-Runtimes-License-Agreement.pdf
- DragonBones GitHub: https://github.com/DragonBones

## Evidence

Run `npm run capture:boss-vfx-polish` after `npm run build:current`. Evidence is written under `test-results/boss-vfx-polish/<timestamp>/` and should include level 1, level 5, level 10, and a special beam-hazard capture plus `report.json`.
