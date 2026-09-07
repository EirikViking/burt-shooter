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

Inherited limits remain: three incompatible pacing/Overrun checks, the earlier unexplained sector-90 stall, no human enjoyment/retention test, no complete natural playthrough, and no supplied user testing bot. No live saves, Cloud, achievements or score submissions are used by QA.

## Delivery boundary

No public release, store/announcement publication or Steamworks service-setting change is authorized by this redesign. Prior core/serpent Build 25173832 remains the last verified test-branch delivery until a new receipt is recorded. Source rollback will be a revert of this task's implementation commit; it does not change Steam branch assignments.
