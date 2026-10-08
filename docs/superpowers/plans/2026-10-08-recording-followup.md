# Recorded Playtest Follow-up

User requests: analyze the complete 13:02 Arcade recording and newly supplied 13:08 Onslaught recording, improve visuals/audio/gameplay/performance, and retain the existing HUD work. Root is the sole source writer. No purchases, public release, settings changes or email.

## Evidence and Scope

Delivery checkpoint, October8 15:23 Oslo: HUD, rival aftermath and showroom recovery are now in private Build25804727 / v2026-10-08_14-53-03. Full final compiled/native release evidence and exact limitations are in `docs/reviews/recording-release-20261008.md`. Historical local-only statements below describe earlier checkpoints. Player silhouette/projectile allocation/Onslaught identity work remains blocked and unintegrated; natural admission and human audiovisual judgments remain open. Inherited200-percent desktop HUD issues remain despite repaired portrait regressions.

- Entire recording sampled chronologically at 2 fps; 66 contact sheets. Root reviewed 001-022, image-only reviewers 023-044 and 045-066. This is not continuous playback. Inspect selected full-resolution frames and denser sequences before changing a suspected defect.
- Audio measured across the entire file; direct listening is unavailable. Capture cadence is not engine frame timing.
- Preserve delivered Planetfall/Veilborn work. Current private build is25791160, not the older heartbeat milestone.

## Implementation Sequence

1. Finish compact HUD verification, including active tools, bottom letterbox docking, resize and all eight locales. Track scale2 limits honestly; no blanket accessibility clamp.
2. Improve player silhouette over bright planet textures with bounded shared-texture copies, no filter or collision/RNG changes. Test hull swaps, animation, invulnerability, cleanup and actual rendered pixels.
3. Eliminate the redundant pre-Astra projectile construction in browser rendering. Keep headless fallback, gameplay contracts and final materials identical. Test allocation removal and matched construction measurements.
4. Inspect highlighted boss/loss/animation sequences more densely. Record remaining pacing/audio judgments instead of guessing balance or claiming unheard audio quality.
5. Run fresh source regressions, build, eight-locale UI, controller/gameplay and applicable native checks. Upload only after all required release gates, not to meet a timer.
6. Record evidence, outstanding work, owned paths and cleanup in HANDOFF/progress. Retain only current proof, deliverable and required comparison.

## Onslaught Follow-up

- Whole second timeline reviewed using the same 2fps coverage plus dense12fps death/respawn inspection and full-resolution details. Combined findings: `docs/reviews/user-recordings-20261008.md`.
- Reproduced and repaired completed-rival result/wreckage clock freezing during later warnings. Unit and actual director/visual tests pass. Paused/unfinished contact clocks and one-time rewards remain intact; only normal rivals set won=true.
- Confirmed wrong Onslaught warning profile: preview lacks spawning's sector51 shuffle/fixed50pool. New identity test remains intentionally red because PlayScene.js editing fails, as do Bullet.js/Player.js edits. No bypass or claimed integration.
- Actual capture gap328.689ms coincides with nonfinal death/respawn at12:13.474; native profiling needed before asserting game-stall cause.
- Fixed the newly introduced offscreen tactical tray at960x540/200% with a bounded left-side placement. Other200%issues remain; no accessibility-complete or Steam-ready claim.
- Empty Phase Seraph final menu frame includes the rotation caption. Investigate real pixels/readiness/context, not only async loading or adding a fade.

## Showroom Recovery Follow-up

- Corrected the caption inference: AstraLaunchHome shows its own rotation hint without waiting for the model. Phase Seraph uses textureIndex25/model26.glb, not model29.
- Actual WebGL context loss while changing pose erased the copied 2D canvas and falsely recorded the pose as rendered. A settled pose then stayed blank after restoration. Two narrow rendering changes now preserve the last genuine frame and retry unsuccessful poses; loss during a draw is checked before replacing the copied frame too.
- Actual source Sparrow/Phase Seraph and compiled Phase Seraph tests pass four cases each: desktop/mobile loss with pending movement, mid-draw loss, and stationary recovery. Pixel signatures/counts, resident-count checks and screenshots verify the result. No gameplay, selection, timing, text or audio behavior changed. This independently reproduced failure is not proven to be the recording's cause.
- Current web rebuild v2026-10-08_13-46-08 includes the prior HUD/rival work plus this recovery fix. Full smoke/localization/controller completion and cleanup are tracked in the newest HANDOFF entry; no new native package or Steam delivery claimed.
