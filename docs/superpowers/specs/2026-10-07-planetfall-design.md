# Planetfall Design

## Intent

User requests a major audiovisual/gameplay step beyond successive small contacts, sustained ambitious development, and a quality-leap target every14hours. Literal doubling, perfection, sales or uninterrupted execution are not measurable promises. Latest delivered baseline is private Steam25778573. Hourly status/email reports are cancelled. No purchase, overage or paid generation without approval.

Selected direction: a world-scale orbital siege, **Planetfall**, that changes the composition and rhythm of the battle while preserving precise arcade control. Compared with a fleet AI warfront (substantial new AI/balance scope) and a persistent returning rival (overlap with existing boss/Payback systems), this is a focused, visible signature encounter. It is not another entry claimed toward the67 convoy surprises.

## Playable Contract

- Integrate a Boss subclass through the existing EnemyManager boss slot, components, ordinary projectiles, death/score and cleanup. No independent spawn director or new progression schema.
- First implementation is loopback DEV `encounterEvolution=planetfall` only, with every production progression permission false. No normal selection weight, new saves or release admission until actual audiovisual and gameplay evidence supports it.
- A monumental orbital ring occupies the upper battlefield. Four shootable anchor-machines flank a central core. The lower field stays navigable; machinery and decorative debris never deal contact damage or secretly block player movement.
- Four anchors own32% of the original boss health budget (8% each); core owns68%. Anchors are optional. Destroying one permanently removes its contribution to crossfire and detaches the matching ring quadrant. A timed iris exposes the core, allowing a faster, riskier core-focused kill without mandatory anchor destruction. This differs from Breach's compulsory relay/hull sequence.
- Arrival lasts3.2 playable seconds. Afterwards the iris cycle is7seconds, open for3.2seconds. Core damage cannot happen while closed. Destroying all anchors holds the iris open. At half core health, the damaged ring enters a distinct rupture performance; its attack cadence changes but maximum volley remains6 normal projectiles with normal graze rules. No score-neutrality claim about added shots.
- Warnings last1.4seconds, aim is frozen when warning begins, and any pause/draft/milestone/focus loss or player life loss clears owned warning/shots and requires a fresh full lead-in. A broken anchor cannot fire a previously queued shot. No delayed async sound/texture work may revive a dead encounter.
- Use the original capped boss health/score. Components have no drops, kill identity, bonus drone or duplicate damage credit. Core death finishes the root once, even when anchors remain. Strong builds may shorten phases. The75-100second duration is a weak-build playtest target, not a forced cinematic or invulnerable duration.

## Presentation

Use existing high-resolution premium spacecraft/material textures for authored, articulated ring machinery, retaining sharp focal details. Background planet, ring interior light, cable energy, apertures, recoil, detached quadrants and post-defeat breakup must convey distinct readable phases. Avoid merely scaling one static hull or obscuring hostile bullets with bloom. A finite non-colliding aftermath records the visual consequence; the first iteration does not claim persistent planetary simulation.

Build an owned audio performance from existing licensed game recordings first: spatially/tonally distinct arrival, iris release, anchor separation, rupture and collapse, with bounded layers. Gameplay warnings retain their priority. Respect SFX/music/voice mute and preserve cosmetic RNG isolation. Do not activate preview-gated20second fauna candidates. Actual captured sound must be present and unclipped; human mix quality remains a listening judgment.

Reduced Motion suppresses nonessential drift/rotation/shake, not gameplay timing or hit geometry. Flash Intensity scales presentation flashes. Show the important silhouettes, aims and available targets at720p,1080p,ultrawide and portrait. All player-facing instructions/state labels are supplied through the existing source-text i18n system for all8locales. No new subtitle/full-audio claim.

## Architecture And Acceptance

`src/game/Planetfall.js` owns deterministic clocks, HP, iris and volley authorization; no Pixi/audio/RNG dependency. `PlanetfallBoss` owns existing game integration/score/projectiles/components. `PlanetfallVisual` and finite aftermath own presentation resources, preserving shared atlases. `PlanetfallAudio` owns finite sound groups and lifecycle. Existing DEV classification/setup provides isolated access; normal game remains unchanged.

Require red/green model tests, real player weapons, score/HP/shot budget tests, pause/focus/death/retry/loading failure, layout/accessibility, actual keyboard/controller and sound capture. Compare rendered baseline/candidate frame tails with no concurrent heavy work. Before future delivery: full release-line/i18n/build/UI/native/private authenticated gates, ownership-safe cleanup, and a candid review of actual play. This spec authorizes implementation under the user's waived manual design gates, not a claim of completion or guaranteed quality.
