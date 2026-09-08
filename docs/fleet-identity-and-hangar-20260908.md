# Fleet identity, bounty drones, living menus and orbital hangar ambience

Baseline: clean `codex/astra-visual-overhaul`, `bb26bb814630020a013f56a0310c86b619f7d951`, uniquely owned checkout `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`. Fetch, branch, HEAD, status, worktrees, AGENTS and current handoff verified before edits. All implementation explicitly requested by the user; the additional main-menu ambience request is included.

## Delivered source changes

- Fifteen additional shootable bonus drone designs, each authored/rendered in Blender and assigned its own 650–2,050 base score reward. The four previously active ambient designs remain available, for nineteen active designs. Existing twelve legacy texture assets remain compatible with other callers. New drones have mechanical silhouettes and a localized SHOOT/value label; collectible cores retain their own appearance, cadence, collection and rewards. Repeated damage after a drone dies no longer reports another kill.
- Separate Bonus Drones Codex category, discovery/defeat recording, names and individual descriptions, with scoring/contact guidance in all eight languages. Drone model names are intentional proper names. Discovery does not add an extra first-seen score bonus.
- The actual new main-menu Codex button displays animated gold/cyan edge light and warm text when unread entries exist. Reading clears it; reduced motion uses a steady cue. Its polling no longer depends on the old button's badge existing.
- How to Play cards have animated illustrations using the actual player ship artwork. Dense/small layouts omit illustrations rather than displace text. Shared panels have darker glass materials, broad reflections and moving edge light. Shared animation respects reduced motion, keeps labels/hit areas stationary, and bounds draw work. Navigation and close/back actions remain intact.
- Thirty matching gameplay/showroom/48-view turntable sets. Following user feedback, ships 1–14 were rebuilt using the same artwork-led relief approach as ships 16–30. Ship 15 retains its approved detailed Blender model. The relief ships reconstruct the original artwork's silhouettes as curved, textured relief hulls with thickness; the existing upper-hemisphere showroom camera reveals that shape. These are presentation meshes, not full free-flight 3D assets. Railbreaker's wider/shorter readability correction is retained. Ship stats, unlock identities, traits and hitboxes are unchanged.
- Four new ElevenLabs ambience recordings replace menu/scoreboard music: reactor, machinery, distant signals and shimmer. No synthesized sounds, oscillator tones, music generation or locally generated noise. Independent 29/23/19/17-second loops have slow mix/pan envelopes, restrained level, 2.6-second entry and 1.4-second launch fade overlapping the gameplay music's 1.2-second rise. Existing music/master controls and voice ducking apply. Muting also silences retiring layers. Rapid scene changes cannot resurrect an asynchronous menu load.

## Asset provenance and reconstruction

- `scripts/render-bounty-drones.py`: original Blender machine geometry; output normalized by `scripts/pack-fleet-identity.mjs --drones-only`.
- `scripts/render-fleet-identity.py -- player 15 0`: initial detailed hulls; only approved ship 15 remains in the final set. Original two-dimensional references were inspected as a contact sheet.
- `scripts/render-fleet-relief.py -- player 15 15`: ships 16–30; repeated with -- player 14 0 for ships 1–14. Original owned player artwork applied to sculpted silhouette geometry. The five named Ascendant references are explicit. Editable representative `.blend` scenes are retained; generated PNG intermediates are ignored.
- `scripts/pack-fleet-identity.mjs`: common alpha crop, registered emitter positions, 384-pixel atlases and 1024-pixel streamed views. No runtime model generation.
- `scripts/generate-hangar-ambience.mjs`: ElevenLabs `eleven_text_to_sound_v2`, seamless-loop requests. Prompts, byte sizes and hashes: `docs/fleet-identity-20260908/hangar-audio-receipt.json`. API credentials remained in the environment. Two rejected initial API requests generated no assets: prompt exceeded 450 characters; shortened prompts succeeded. Four final files are verified against receipts.
- Audio audition: `test-results/identity-pass/orbital-hangar-audition.mp3`, 90 seconds, raised above the in-game mix for listening. Runtime uses quieter master/music-scaled levels and stereo motion. Automated checks are not a human listening verdict.

## Validation and boundaries

Source checks: i18n, eight-language/80-screen UI suite, Codex copy, current-source controller flow, all drone rewards/locales/assets, all thirty complete fleet sets, authored audio hashes, unread/read/reload behavior, four help illustrations, repeat-hit rejection, master/mute, gameplay fade and rapid audio transitions passed. One initial controller run accidentally used the older preview build and timed out at the credits coin; the corrected current-source run passed. One development fixture initially read a separate Vite module-cache instance; persistence/reload verifies the actual menu's unread state. No runtime error was attributed to that fixture issue.

Production build and packaged verification passed; test upload receipt follows separately. Steamworks settings, public/default, other Steam branches and Cloud are protected. No public post was made or the staged Tyrian reply altered. No untranslated new copy remains; proper model names intentionally stay English.

Preserve the unexplained historical sector-90 stall and prior pacing/Overrun limitations. No full-campaign, live score/Cloud round trip, human fun, sales improvement or human balance claim. User's standalone testing bot remains unsupplied and unused.

Runtime commits: `dcbb7b7` (complete feature pass) and `09187d9` (user-requested replacement of ships 1–14). The production build was compiled from clean `09187d9`. Ships 15–30 have no asset differences against `dcbb7b7`. All 1,609 new fleet/audio files in the candidate match the final source SHA256 hashes.

Frozen production validation passed: complete `build:current` guard chain, release-line, controller navigation, and the eight-language UI suite (80 screenshots, no page errors, placeholders or English leaks). The first concurrent production UI attempt timed out waiting for the leaderboard title; the isolated unchanged-build rerun passed. Final source feature checks also passed with the replacement Sparrow. Evidence is under `test-results/identity-pass/`; final production UI evidence is `i18n-production-final/`.

Source rollback from verified clean ownership: `git revert 09187d9 dcbb7b7`. Steam testing rollback is separately build 25185903. Do not reset or discard the checkout.

Package: `test-results/astra-build-2026-09-08T13-43-06-693Z/win-unpacked/Nova Swarm.exe`. Steam native runtime staging and verification passed. Isolated packaged desktop checks passed for 48-view Sparrow presentation, four active ambience layers, four help illustrations, nineteen Codex bonus drone entries, Escape back to menu, gameplay entry and complete ambience shutdown. No page errors. The first native fixture attempted to inspect a null unloaded scene; a fixture-only optional-chain correction fixed it without changing the build. Native QA and browser servers were closed after checks. No live leaderboard writes were made.


## Completed Steam test delivery

Steam server verified 2026-09-08T14:17:47.388Z: test branch sector-continue-test build **25189001**, depot 4765071 manifest **7633105530588293812**. Public remains 25169120, other test-build 23782673; Cloud configuration unchanged. ASAR SHA256 9e77390662e9d1367d097faa67c9d4349f9616d7cc78e7b6ab30fc9c339168d6. All requested source work, production validation and packaged checks were complete before upload. No public deployment, settings change or forum publication. Receipt: docs/fleet-identity-steam-delivery-20260908.json.
