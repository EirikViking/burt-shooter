# Boss frame and flight revision — 7 September 2026

Branch: `codex/astra-visual-overhaul`. Starting commit: `384cec24de8836d6e75cdc8b2b067aa2661d5417`. Runtime: `2333f645b29af199dcf394692a240f2a34fc40b3`.

## Changes

- Removed the constant pink chamfered frame from every boss. `PlayScene.updateBossPriorityEdge` drew four arcs as a connected Pixi path; straight connecting lines made the unwanted box. It was decorative, with no collision or warning role. Health bars, warning tokens, arming boundaries and damage gates remain.
- Six deterministic normal-wave entrances: braid, hook, ribbon, crown, scissor and coil. Exact formation endpoints, spawn staggering and upper-playfield bounds remain. Sectors 1–3 retain entry timing; from sector 4, eligible entries take 6% less time. Challenge flights, reinforcements and authored special encounters keep their routes.
- Ten boss-family patrols, with occasional smooth later-phase feints. Movement is bounded and capped at 15% of screen width per second. Locked warning sequences pause movement; there are no teleports or additional gameplay RNG draws.
- The existing wave-clear reward plaque gains sequential gold chevrons and small side-rail streaks. Existing score, audio and notification duration remain. Reduced Motion is respected.

These are deliberately bounded gameplay changes, not a claim of identical perceived difficulty. New boss positions can alter dodge pressure; the later-sector entry trim makes formation clears slightly more demanding. Human playtesting is still needed.

## Verification

Passed: 36 route cases, 108,000 sampled boss positions, paired runtime routes and ten boss families, warning movement locks, zero RNG use, 300 paired attack-budget cases, hazard arming, warning lifecycle, boss telegraphs, challenge flights, enemy movement smoothing, source localization, eight-language UI, controller flow, Steam/Electron bridge, release-line and production build.

The first browser smoke attempt timed out while other work was active. Its serial development-server rerun completed every gameplay flow with zero page errors or bad responses, but failed the production quiet-console gate because development logging was enabled. The production rerun and packaged checks are recorded in the final validation receipt below.

The older legacy-VFX source suite fails a pre-existing exact-text assertion for `isAuthoritativeTransitionType`: the baseline already has a multiline list including `sector_arrival`, while the test expects an older single-line list. Evidence: `test-results/flight-revision/legacy-baseline-failure.json`. This assertion was not weakened. The obsolete boss-frame presence assertions were updated specifically to require its removal.

## Evidence and rollback

Actual running source, equivalent staged 1920×1080 scene: `test-results/flight-revision/boss-frame-before.png` and `boss-frame-after.png`. Paired 1280×720 wave and reward captures are in the same folder. Staged QA scenes are not human playtests or trailer footage.

Launch with `--nova-flight-previous` (or `NOVA_SWARM_FLIGHT=previous`) to restore the previous wave entrances, boss patrols and wave-clear treatment. The unwanted frame stays removed. Source checkpoint: tag `codex/flight-revision-before-20260907`. A complete source rollback can be made with `git revert 2333f64 f5d0f39` after checking for unrelated work; no reset or save migration is needed.

Runtime files changed: `src/config/ArcadeFlight.js`, `src/entities/Boss.js`, `src/entities/Enemy.js`, `src/managers/EnemyManager.js`, `src/scenes/PlayScene.js`, `electron/main.cjs`. Additional changes are focused tests, the capture wrapper and progress/delivery notes.

No new player-facing strings or untranslated text. No new imported assets, fonts, purchases or audio. Existing approved ElevenLabs sound is retained. Local tests use isolated profiles and offline services; no real saves, achievements or leaderboard submissions are used.

## Final validation and Steam receipt

Separate Windows package: `test-results/astra-build-2026-09-07T07-32-39-014Z/win-unpacked/Nova Swarm.exe`. Production browser smoke passed with zero routine console messages, warnings/errors, page errors or bad responses. Both preserved and candidate executables passed the twelve-check native gameplay sequence (menus, controls, pause, Daily, dense combat, boss, defeat, rewards, death, restart, relaunch).

The candidate's first native run stalled before Daily enemies appeared. The unchanged package passed on rerun. Its cause is unconfirmed; do not interpret the successful rerun as a fix. Failure capture/report are preserved in `test-results/flight-revision/native-after-first-failure.*`. Added failure-state diagnostics to the browser/native harnesses without relaxing assertions or timeouts.

Matched 1280×720 native samples (before → after): Daily p95 16.9 → 16.9 ms, p99 17.3 → 17.2 ms; dense p95 16.9 → 16.9 ms, p99 17.1 → 17.2 ms; boss p95 17.0 → 16.9 ms, p99 17.2 → 17.1 ms. Retained JS heap: Daily 47.79 → 47.76 MiB, dense 40.96 → 42.91 MiB, boss 34.23 → 34.60 MiB. Maximum individual frames remain: Daily 83.3 → 216.7 ms, dense 316.6 → 49.8 ms, boss 33.3 → 33.3 ms. Menu-to-control 6.34 → 7.13 s; dense navigation/load 11.85 → 9.78 s. Baseline startup overlapped the end of packaging; background user applications were preserved. These are operational comparisons, not controlled laboratory measurements or proof that all stutters are gone.

Gallery: `test-results/flight-delivery/index.html`. Includes actual source comparisons and silent normal-speed packaged recordings, explicitly labeled scripted/staged QA with invulnerability.

Packaged identity/isolation/frame/previous-flight switch checks passed, as did native basic smoke, controls and 60-second performance smoke: average 59.69 FPS, minimum 58.14 FPS against the existing 50 FPS floor. Steam SDK/runtime packaging check passed for app 4765070 and the existing leaderboard. Exact runtime label verified in the executable: `2333f64`.

**Steam build 25163288 is assigned to `sector-continue-test`.** Upload completed successfully at 08:21:19 UTC; refreshed authenticated app info verified the assignment at 08:22:46 UTC. Public/default remains **25150873**, and `test-build` remains **23782673**. App 4765070, depot 4765071, manifest 2048505359033859356. No public release, store change or Steamworks service-setting change was performed.

The separate upload copy contains 410 files / 1,655,325,990 bytes. Its `resources/app.asar` matches the validated Windows package: SHA256 `aa57d388b6a688e4d82b44a1261036a131e9587bb47d5fb0b72784374ee368b9`. Steam reused its existing depot content and uploaded about 42.81 MiB of changed file data. Upload configuration explicitly targets only `sector-continue-test`; receipt and logs are under `test-results/astra-steam-upload-20260907-flight-2333f64/`.

Published Cloud configuration was compared before/after and is identical: `WinAppDataRoaming/nova-swarm/steam-cloud/nova-swarm-save.json`, Windows, 1 MiB quota / 20 files. Existing leaderboard identities remain `nova_swarm_global_score_v2`, `nova_swarm_tactical_score_v1` and `nova_swarm_sector_start_score_v1`. Local QA used offline isolation; successful live Cloud synchronization, achievement writes and leaderboard submissions were deliberately not tested against the user's account.

## How to play

In Steam: Nova Swarm → Properties → Betas → `sector-continue-test`. Let Steam update, then launch normally. Selecting **None** returns to the unchanged public build 25150873. Steam-side test-branch rollback target is also the preserved prior build 25150873.

Locally: double-click **Nova Swarm - Visual Upgrade** on the desktop. It now points to `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-07T07-32-39-014Z\launch.vbs`. Alternatively, double-click that file directly. The launcher uses an isolated profile inside this new build folder; the game is left open. `previous-flight.vbs` in the same folder launches the rollback comparison with its own isolated profile. Keep the complete `win-unpacked` folder together.

All changes are checkpointed locally. Runtime commit is 2333f64; the validation checkpoint is 048959d. Later delivery-only commits do not change the uploaded executable. Existing releases were preserved; no Git push, pull, merge, rebase, reset or stash was performed.
