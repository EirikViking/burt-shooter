# Counterweight: isolated playable preview — October 7, 2026

## What this milestone is

The previously model-only Counterweight now has an articulated in-game rig and an isolated local test route. Breaking either gun tilts the surviving gun, visibly moving its next firing lane. Breaking the pivot stops both. Guns and pivot share the six-scaled-HP machinery budget. A full new warning follows a tilt or interruption. Strong builds can disable it during arrival.

**This is a prototype, not normal admission or a Steam delivery.** The normal deck still has nine contacts (eight rescue interactions plus Reactor Tow). Steam still has eight. Counts remain **9/67 local, 8 delivered, 58 unimplemented**. Counterweight does not become the tenth completed contact merely because it can now be forced in a test.

The mechanical distinction and primary-source research are in [the preceding audit](next-contact-audit-20261007.md). Normal scheduling must eventually apply both `rescue_contact` and `linked_battery` recovery, without consuming an opportunity on failed eligibility. That integration and natural pressure testing remain outstanding.

## Implementation

- `src/game/Counterweight.js`: bounded phase machine, ownership and projectile deduplication; now also one uniformly scaled world-pose calculation for targets, muzzle positions and warnings.
- `src/effects/CounterweightVisual.js`: two existing gun sprites, a pivot and physically joined piston/arm assemblies. Shared prewarmed machinery art, one owned texture view, fixed node count; no new generated assets. Tilting changes actual aim. Reduced Motion suppresses recoil while retaining necessary gameplay geometry. Flash Intensity limits muzzle emission.
- `src/game/ConvoySurprises.js`, `src/effects/ConvoySurpriseVisual.js`: delegate only this isolated event to its model/view; existing contacts remain on their previous paths.
- `src/managers/ArcadeFirstLightDirector.js`: real player interception before volley commitment; normal hostile Bullets with owner tags and finite lifetime; existing charge/fire/break sounds; existing cancellation and owned-bullet cleanup. A targeted failing regression exposed a charge sound continuing under a major warning; it now retires with that warning and is stopped before a component-break cue.
- `src/effects/ArcadeFirstLightVisual.js`: localized label/hint, consistent stable warning origin, room below the tilting hardware for text. Two generic unrelated energy wisps are skipped for this prototype only. This is **not** a fix for the user's still-unidentified central artifact.
- `src/config/EncounterEvolutionTest.js`: loopback DEV-only `counterweight` preset, rejected for production, remote and desktop URL use.
- `src/i18n/counterweightText.js`, `src/i18n/firstLightText.js`: four strings in all eight supported locales. No new voices or claimed subtitles.

Initial timing hypotheses: 3.6-second approach, 0.9-second physical settling, 1.2-second warning, 2.2-second cooldown, 0.42-radian tilt, at most three volleys/six ordinary bullets, 16-second maximum encounter. Hardware does not collide with the ship. Disable/spent states depart promptly and do not leave a persistent wreck. No health refill or forced invulnerability.

## Evidence already completed

Evidence root: **E:/Codex/builds/nova-swarm/counterweight-preview-20261007-2a906fb1**. TEMP: **E:/Codex/tmp/counterweight-preview-20261007-2a906fb1**. Vite cache: **E:/dev-cache/vite/counterweight-preview-2a906fb1**. The prior frozen Windows payload in `ion-drive-20261007-24ab6e13` is separate and preserved.

1. Eight pure-model groups and the new integration test pass. Integration explicitly asserts that the normal catalog excludes Counterweight and that forced tests reject unsafe environments.
2. `runtime/report.json`: real source browser, sectors 3/51/401, both guns and pivot, exact warning/muzzle/velocity correspondence, no early shot after a break, finite bullets/expiry, pause/draft/major-warning recovery, bomb cancellation, death cleanup, stable node counts and shared-texture preservation. Component credit and reward hooks stayed at zero. The audio-preemption test was first red, then green.
3. `build-matrix/report.json`: 18 cases using actual Player volley constructors, both targeting choices, low/rapid/broad/slow/precision/Ghost/drone/Chain/piercing configurations. All expire with at most six emitted bullets and no component reward/credit. Drone cases actually emitted drone shots. This is an isolated machinery test, not natural combat pressure or proof of fun.
4. `recovery/report.json`: actual browser blur releases held firing and pauses time; resume, Pure retry and director/model cleanup pass. Prototype progression/submission permissions remain disabled.
5. `layouts/report.json`: eight locales at 1280x720, 800x600 and 720x1280. Expected translated text, label bounds and browser errors checked. Actual English, German portrait and Chinese images inspected. No new missing translation observed; the existing Chinese HUD `SPEED UP` leak remains outside this change.
6. `input/shot-0.png` and state: the existing official input client exercised real left/right/Space input with progression blocked. Its incidental 500 score includes an unrelated ambient bonus-drone interaction; it is **not** evidence of Counterweight component scoring. Controlled runtime tests above establish zero component credit/reward.
7. `performance/report.json`: same source build, Chrome, viewport and 160 stationary projectiles, existing Rival versus Counterweight warning in A/B/B/A order. CPU p99 6.8/7.5ms baseline versus 5.7/5.5ms prototype; RAF p99 17.3/16.9 versus 17.2/17.3ms; no frames above 50ms. This measures the bounded presentation under that fixture, not whole-run or packaged performance. Render code was unchanged by the subsequent audio-preemption fix.
8. Existing convoy, Reactor model/admission (1000 seeded rotations), encounter evolution and expansion checks pass again. Release-line and static eight-language checks pass.

9. Full `npm run build:current` passes as **v2026-10-07_07-20-24**. Entry `assets/index-6FYqHa-a.js`, SHA256 `7db16f6f8366262d2933ce9acaf92ac85b8e479e86e8845225dedb6154d9c8f0`; 633 source and 188 public hashes verified before/after QA. Existing large-bundle/import advisories remain. Build output is this job's `release-fixed`, not the inherited dist junction. Build identity updates only public/version.json and public/sw.js; headers are unchanged.
10. Complete `npm run check:i18n-ui` passes in all eight languages against that compiled output, covering Settings, menus, gameplay, pause, results and empty/populated leaderboards. `compiled-i18n/report.json` has no captured errors or asserted language leaks. German menu and Chinese results images were inspected. The German third-button subtitle is tight against its lower edge; the same padding is present in the frozen baseline and remains a visual follow-up, not a new fix.
11. `compiled-matrix/report.json`: the 18 actual volley cases also pass against the production bundle through the existing isolated native-test bootstrap. All production progression permissions are checked disabled before the fixture installs the prototype. Production query parameters alone still cannot enable it. No native executable or Steam upload was attempted for this later prototype.

Final machine-readable evidence: **verification.json**. The old frozen Windows cut's entry hash was rechecked unchanged. Automated passes do not establish fun or final mix quality.

## Actual audiovisual preview

**preview/Nova-Swarm-Counterweight-preview.mp4**: 27.433 seconds, H.264 1280x792 at 30fps, AAC stereo, 4,978,716 bytes. Three chapters show leaving both guns intact, breaking one gun, and disabling the pivot. This is an actual isolated game capture with normal projectile damage, scripted pilot placement and keyboard firing. Norwegian captions explicitly label it as a local mechanics test with existing art/audio and no progression. It is not footage of a natural run.

Full decode succeeds; a frame from the final MP4 was inspected. Source capture reports 32 audio plays and no browser/capture errors. Measured soundtrack mean -38.4dBFS, maximum -21.5dBFS: no clipping, but the current existing mix is quiet and has **not** been approved by listening. No new premium sound production or human first/third-sighting validation is claimed. The WebM source and export recipe remain available for a later mix review.

**Not emailed.** The last actual Gmail send attempt in the preceding cut was rejected because approval_policy is never; this turn did not retry that rejection or alter the last-success receipt. Last verified email remains 04:10:05 Oslo, message `1a1142009d54ae4f`. No upload was attempted. Latest authenticated Steam remains Build25765088/manifest3743460415809241959.

## Balance, limitations and next step

No component score, XP, kill, rescue, achievement, hit-credit or reward event is granted. Machinery consumes intercepted shots through normal rules; it is not a new credited accuracy target. The maximum six ordinary hostile bullets would add up to six graze opportunities if normally admitted. Adding a card would also delay/dilute existing rescues. Neither opportunity change is hidden by a global scoring adjustment.

Before normal admission: verify shared-family spacing against existing linked batteries and headlines; use ordinary enemy pressure and natural eligible opportunities; evaluate whether center autofire makes the pivot too dominant; inspect repeated sightings and mix with music, warning voices muted/enabled and small speakers. A player should see the tilt, predict the changed lane, and still have a reason to choose after the third sighting. No arbitrary extra spawns or new director are needed.

Known native/GPU, Steam network, Gmail and automation policy blockers from the prior cut remain unresolved and were not bypassed. The normal 20-second fauna recordings remain inactive. No new purchases, generation calls, global settings, Steamworks/Cloud/public changes or player resets.

Repository remains D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920, branch `codex/sector-leaderboard-unknown-20260928`, HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`, no upstream. Existing work is preserved. No fresh remote verification is claimed under the restricted network. This preview does not replace the frozen user-requested Windows cut.

## Reproduce locally

Use the established D: checkout. Set process-local TEMP/TMP to the verified E: job TEMP above, npm cache to E:/dev-cache/npm, and `NOVA_SWARM_VITE_CACHE_DIR` to the E: cache above. Do not write a build through the repository's inherited dist junction.

Run `node scripts/check-counterweight.mjs` and `node scripts/check-counterweight-integration.mjs`. Start the existing Vite dev tool on loopback, then visit `/?autostart=1&offlineLeaderboard=1&encounterEvolution=counterweight`. This isolated route blocks all production progression and ranked submission. For runtime evidence set `CHECK_URL` to that server and `CHECK_OUTPUT_DIR` to an owned E: directory, then run `node scripts/check-counterweight-runtime.mjs`.

The retained E: adapters `check-builds.mjs`, `check-focus-retry.mjs`, `check-layouts.mjs`, `measure-render.mjs`, `official-input.mjs` and `capture-counterweight.mjs` reproduce the other fixtures; they use the existing repository conventions and installed Chrome. `build-fixed.ps1` records the full build recipe and refuses to overwrite its existing output. Tuning lives in `COUNTERWEIGHT` in src/game/Counterweight.js; presentation is in CounterweightVisual; normal admission is intentionally absent.

The final owned servers on4991/4992 are stopped. Recreate/verify an empty owned E:TEMP and Vite-cache path before restarting a test; this job's empty TEMP and11.5MB cache were removed after completion. Two redundant red-phase PNGs were removed after checking their current replacements and file locks; the failing JSON and final images remain. Current web build, video/source capture, unique evidence and narrow before-images are retained for review/reproduction. Inherited and previously rejected cleanup paths remain untouched. Final E:free192511475712bytes; Git63modified/409untracked.

Narrow runtime rollback check, verified but **not applied**: `git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/counterweight-preview-20261007-2a906fb1/counterweight-runtime.patch`. Seven previously existing consumers/model files are covered; new helpers remain inert after reversal. This preserves unrelated inherited work. Actual reversal requires an explicit request and a fresh check, followed by rebuilding the changed source.
