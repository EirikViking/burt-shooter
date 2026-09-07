# Cinematic launch menu — 7 September 2026

## Scope and approval

The user approved the cinematic menu redesign through the side conversation after the core/serpent delivery. Baseline: `6b2e86b5b8611fdbc796db9b9be80e8a1c45280a`, branch `codex/astra-visual-overhaul`, uniquely owned by this checkout. Fetch, status, branch, log and worktree checks completed. All changes belong to this task.

Home now has one dominant PLAY action that directly starts Mayhem Tactical with the saved, unlocked ship. Other Modes retains Pure, Daily, Scout, Sector Start and both Overrun variants with their existing eligibility and detailed explanations. Its last selection is remembered locally; it never changes home Play. Hangar, Leaderboard, Codex, Achievements, Settings, How to Play and Exit remain accessible. Audio controls remain in Settings; the permanent Music button and detailed scoring rules leave the first screen.

The generated orbital launch bay frames the existing detailed, manually rotatable ship. Asset: `public/art/astra/menu-launch-bay-20260907.png`; original imagegen output: `C:/Users/cromk/.codex/generated_images/01a07c7f-68cf-7f50-a0f4-45ce84e71f3a/exec-130dc0a0-4e43-47a6-90f3-8bab086100c0.png`. No new Blender model or audio is claimed. Existing ElevenLabs UI/start sounds are preserved. New interface copy is translated in all eight languages; ship/brand proper names remain intentionally English.

Design reference: [NN/G on progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/). This supports moving secondary detail behind visible access, not a claim that this menu measurably improves retention. The user's impression that most players prefer Tactical is not telemetry.

## Validation

Source functional checks passed keyboard direct launch, every alternative run mode, real mouse rotation, modal gating, local selection persistence and eight-language captures. Full existing controller flow passed. Responsive checks cover 960×540 enlarged German, 1280×720 enlarged Russian, 960×600, and 390-pixel portrait English/Japanese. Home controller navigation, back and direct Tactical launch pass.

Visual review caught Japanese text overflowing a short portrait window; word wrapping and horizontal bounds assertions now cover it. Initial test failures are retained: incorrect fixture i18n API, unserialized Pixi bounds, a shell-escaped harness syntax error, and selecting a locked ship in the saved-ship fixture. These were corrected without weakening behavior checks. Production/native validation and deployment evidence will be added below.

Implementation checkpoint `c39975c` passed production build and the initial 80-capture localization check, but visual review found stale home dimming and a duplicate rotation hint after changing Settings/language. Runtime correction `373e23f` synchronizes modal presentation each frame, including replacement turntables. The superseded packaging attempt `astra-build-2026-09-07T21-07-14-596Z` was deliberately stopped and must not be distributed. The revised checks inspect the visible home controls, assert full brightness and one rotation hint, and explicitly open Other Modes before testing its briefing.

Source corrected functional evidence: `test-results/launch-menu-modal-corrected/report.json`. Saved unlocked Comet Courier is shown and actually launched; Reduced Motion leaves ambient position/angle/brightness static while real pointer dragging still rotates the ship. Fixtures stay in isolated offline profiles. No source gameplay or audio changes occurred in this menu task.

Production static files reuse the preserved `8b2b987` asset snapshot after Git proves only one new public image. Every old output link is verified by file identity and size; the new image is copied and SHA256 checked. Proof: `test-results/launch-menu-static-proof-final.json`. Vite only writes new generated JS/CSS into a separate output, preserving every earlier build.

Final production: `test-results/launch-menu-dist-373e23f`. `check:i18n`, `build:current`, release-line and Steam bridge checks pass. `test-results/launch-menu-i18n-ui-final-ready/report.json` passes all eight languages and 80 screenshots with zero console/page/placeholder/English-leak findings. Production controller flow, responsive geometry/home-gamepad checks and the installed development-skill gameplay client pass. Current screenshots were inspected, including German and Japanese after Settings changes. The first strengthened localization attempt sampled an asynchronously absent turntable; the fixture now waits for the ship and two rendered frames before taking its snapshot, without relaxing assertions.

Windows package: `test-results/astra-build-2026-09-07T21-15-45-887Z/win-unpacked/Nova Swarm.exe`. Steam native runtime staging and package checks pass. `test-results/launch-menu-native/report.json` passes every menu scenario against the actual executable, asserting runtime `373e23f`, packaged status and isolated profile ownership. The older general desktop fixture initially clicked the now-hidden former launch button and timed out; it now requires a visible control and clicks home Play, with a fallback retained for older-baseline comparisons. No runtime change was needed for that test correction.

All twelve corrected desktop steps pass in `test-results/astra-desktop-launch-menu-final-ready/report.json`, with zero renderer warnings/errors. Standalone native startup, controls and one-minute performance checks pass under `test-results/astra-native-launch-menu-final-*`. Performance: 60.42 average / 58.82 minimum sampled FPS, no manual time advancement. This does not resolve the inherited isolated sector-90 stall or establish human enjoyment.

Upload payload: 410 regular files, 1,683,057,882 bytes; every file SHA256 matches the tested package. ASAR SHA256: `4aaf00a16a62330877742accac96314e89165f084c98b4eebd46318337dbac5d`. Proof and receipt directory: `test-results/launch-menu-steam-upload-373e23f`. Release-line passed before packaging and upload. Steam Build **25175308** is verified on **sector-continue-test**, depot 4765071, manifest **7033274111373604527**, at 2026-09-07 21:42:58 UTC. Public/default remains **25169120**, test-build **23782673**; the complete Cloud UFS block is unchanged. Verification covers the tested package, upload identity and server assignment, not a Steam-client download or human play session.

## Files changed

- Runtime: `src/scenes/MenuScene.js`, `src/ui/AstraLaunchHome.js`, `src/ui/AstraDockAtmosphere.js`.
- Artwork: `public/art/astra/menu-launch-bay-20260907.png`.
- Text: `src/i18n/launchHomeText.js` and all eight dictionaries under `src/i18n/locales/`.
- QA: `scripts/check-launch-menu.mjs`, `scripts/check-launch-menu-layout.mjs`, `scripts/check-i18n-ui.mjs`, `scripts/astra-desktop-playtest.mjs`.
- Records: this report, `progress.md`, and the continuation handoff.

Inherited limits remain: three incompatible pacing/Overrun checks, the earlier unexplained sector-90 stall, no human enjoyment/retention test, no complete natural playthrough, and no supplied user testing bot. No live saves, Cloud, achievements or score submissions are used by QA.

## Delivery boundary

Deployment was performed only to `sector-continue-test`. Steamworks was not wholly untouched: its test-branch build assignment changed. Public/default, other branches, Cloud and service settings, store media and announcements were not changed. No live saves, score submissions or achievements were touched by QA. No new untranslated text remains beyond intentional proper names; audio remains the previously approved English audio.

From the clean delivery HEAD, source rollback is `git revert --no-edit 6b2e86b..HEAD` on `codex/astra-visual-overhaul`. This reverts the menu task's source, tests and records; it does not deploy anything. Steam rollback is a separate reassignment of **25173832** to **sector-continue-test** only. Neither rollback was performed. Do not use the HEAD range after unrelated future commits; substitute this delivery's final documentation commit instead.
