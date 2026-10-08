# Planetfall Foundry Revision, 2026-10-07

## Current State

The user rejected the primitive animation in the 2D Planetfall preview. The replacement is actual Three.js machinery composited into the existing Pixi battlefield: 32 solid, textured armor sections, bridge carriages, eight reactor shutters, animated plasma, articulated anchor fractures and an eight-section containment-frame breakup. Existing Three.js and owned artwork/audio are used; no new paid service, asset or dependency. This is a local candidate, not an accepted final art direction or a new Steam delivery.

Branch `codex/sector-leaderboard-unknown-20260928`, baseline `7e8325e3d9abb09357636bca7e994c0227be02d6`. Inherited dirty work is preserved. No reset, clean, switch, stash, pull, commit or push. The latest authenticated private Steam build remains 25778573 on sector-continue-test. Public, other branches, Cloud and Steamworks settings were not changed in this revision.

The existing development heartbeat was updated in place to a four-hour private Steam delivery cadence at the user's request. Only genuinely new, verified candidates qualify. Failed or incomplete checks leave the working Steam version in place. Routine notifications remain muted; no emails or new costs are authorized.

## Implementation And Verification

New product module: `src/effects/PlanetfallFoundryView.js`. Updated integration: `src/effects/PlanetfallVisual.js`. Earlier Planetfall mechanics, eight-language text/Codex and natural-admission integrations remain present. No new player-facing strings in this 3D revision.

- The secondary renderer owns its canvas, textures, geometry, materials, environment and context. The shared premium bitmap is borrowed, never closed. Partial construction and Pixi attachment failures release owned resources and retain the existing 2D fallback.
- Actual forced secondary context loss in combat and collapse passes; the main Pixi context survives. Three create/transfer/destroy cycles preserve resource identity through transfer, tolerate repeated teardown and release each owned GPU context.
- Actual Three target geometry projected through the camera and Pixi transforms agrees with collision centers within two screen pixels at 1280x720, 390x844 and 1920x1080, including firing recoil. Temporary target-color markers are confirmed in the composed Pixi pixels and then restored/disposed.
- Eight frame sections hold, hinge, separate and fade in a timed wave. The entire collapse retains its 3.8-second deadline. Reduced Motion suppresses authored frame translation/rotation; Flash 0 suppresses collapse light/burst contributions. Pause freezes age, poses and rendered pixels.
- Pixel verification reproduced a real opacity bug: a fading section still rendered alpha 255 because the material remained compiled as opaque. Transparency transitions now invalidate the shader once, not on each opacity change. The rendered-alpha regression passes.
- A blank portrait screenshot was a fixed-step harness error: the stopped ticker omitted the usual camera update after resize/previous shake. The harness now runs the existing viewport update and verifies actual target pixels. Existing portrait HUD overlap remains a separate known limitation.
- Latest source suites: `check-planetfall-foundry.mjs`, `check-planetfall-foundry-failure.mjs` and `check-planetfall-foundry-motion.mjs` passed. The first two predate only the final transparency correction and must be rerun with the release candidate. No current compiled/native claim yet.
- Prior source A/B/B/A measurement for 3D: full-render CPU p99 10.4/11.8 ms, RAF p99 17.5/17.3 ms, zero frames over 50 ms. This predates the final containment/fading pass; first-collapse shader work still needs measurement. Not a hardware-wide guarantee.

Evidence root: `E:/Codex/builds/nova-swarm/planetfall-20261007`. The 25.700-second `capture-foundry/planetfall-with-game-audio.mp4` shows the first 3D revision with ordinary emulated gamepad input, actual sound, finite lives and a controlled sector-18 fixture. It was shown as work in progress and predates the latest containment breakup/fading fix. It is not an unforced campaign recording. The unforced pilot ended at sector 7 with zero lives after 725.714 seconds; natural Planetfall reachability/victory/continuation are not established.

Normal admission is implemented locally, once per run with a deferred seeded threshold of sectors 14-18 and existing exclusions/reciprocal Breach spacing. Actual manager budget/discovery/reset/concurrency tests passed. Caller-level rejected/null boss-load recovery now also has a passing focused regression. Older notes describing Planetfall as DEV-only or that recovery as unfinished are superseded.

## Remaining Gates And Retention

Fresh compiled build, localization/UI/controller/full smoke, native rendering and first-collapse performance remain required before Steam packaging. Human animation, fun and mix judgment remains open. Existing German menu clipping, portrait HUD overlap and Chinese SPEED UP polish are not resolved by this pass. Planetfall is an intentional proper name; audio remains existing English/nonverbal material.

The full source-copy preflight was stopped after unusually slow reads when attention returned to the user's repeated scheduling request. No compiler, packaging or upload started. `build-source` is an incomplete refresh, not a verified current snapshot; rerun verification before building. The retained `web-final` is still the older pre-3D candidate. The four-hour schedule was saved and read back as ACTIVE with failed-runs-only notifications.

Retain the current shipping Windows build at `E:/Codex/builds/nova-swarm/steam-current-20261007`, the current candidate/evidence under the Planetfall root, and unique requested video exports. Candidate staging is reused at `E:/Codex/tmp/nova-planetfall-20261007/build-source`; live source preview is `E:/Codex/tmp/nova-steam-current-20261007/source`. Never delete the active preview or a shared baseline. Obsolete `web-check` remains under a prior cleanup-policy hold and must not be retried by another route. Raw captures and remaining job scratch still need ownership-safe cleanup. Last checked E: free space: 158.19 GiB. No C: project output was created.

Cleanup update: verified the exact retained MP4 hashes and absence of active capture/encoding processes, checked paths/reparse points and exclusive raw-file access, then removed the three superseded WebM intermediates in `capture`, `capture-current` and `capture-foundry`. Absence was verified. The unique MP4 exports remain, as does the required current shipping build. E: free space is now 158.22 GiB. The `web-check` hold and unfinished build staging remain unchanged; cleanup is not claimed complete.

The old narrow rollback patch is stale after admission changes. Do not apply it as a verified rollback. Review-only command after refreshing it: `git apply --reverse --check --ignore-space-change docs/reviews/planetfall-integration.patch`. No rollback was applied. Preserve inherited work; never reset the branch.
