# Boss energy and circular-effect replacement

The stationary warning-lane arrows now travel again, with a short luminous filament and stronger charge progression inside the fixed danger boundary. Fans have broken moving wavefronts; rings have moving internal waves that preserve the escape wedge. Bosses charge through segmented capacitors, converging filaments and a soft reactor glint. Precision, split/fan and radial releases use different local discharge shapes. These changes are wired into the shared boss presentation across the existing roster.

The user's gold-circle screenshot was reproduced through `showMayhemReinforcementEntryBurst`: it combined a thick gold portal hoop, inner target/spokes and expanding rings over a combustion effect. This assembly now uses a torn aperture, textured venting plumes and uneven heated fragments. Enemy-death grid rings, radial reticles and circular echo bands were also removed; combustion and existing hull breakup remain, with smaller analytic shards instead. Actual attack boundary circles and escape gaps remain accurate.

## Provenance
- Folder: D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822
- Continued branch: `codex/astra-visual-overhaul`
- Clean starting commit: `bef81e2a5a9636663687a39de5b191653645d53b`
- Runtime checkpoint: `46c2d63fcbbf96d04d464e456c3f33bdc67c5abe`
- Separate candidate package: `test-results/astra-build-2026-09-06T15-19-11-035Z/win-unpacked/Nova Swarm.exe`
- No Steam upload, Steamworks setting changes, real-save access, achievements or live leaderboard writes. Existing release outputs preserved.
- Source rollback for inspection, after preserving any future changes: `git switch --detach bef81e2a5a9636663687a39de5b191653645d53b`. This does not roll back Steam.

## Scope and resources
No changes to attack timing, aim locking, hazard geometry, damage, controls, movement, scoring, progression, ranked/Daily rules or gameplay RNG. Animation reads presentation time and supplied charge/recoil state. No new particles, full-screen filters or runtime engine added. Shared existing optical textures are reused; arrival adds at most six small filament sprites, destroyed with its original container. Reduced Motion keeps warning ink stationary; flash settings scale the new glow and discharge. Existing family-specific charging/release audio is retained. No ElevenLabs calls, new audio, image generation, imported assets, fonts or licensing obligations in this pass.

No new player-facing strings or untranslated text. Existing adjacent language gaps documented in the Tactical/readability deliveries remain outside this pass.

## Checks completed before packaging
- PASS: ten boss animation archetypes; regular/signature telegraphs on source and production; hazard arming; warning lifecycle across ten regular/five signature profiles, pause/interruption/refuel/long-frame boundaries.
- PASS: dedicated rendering checks for motion, stable Reduced Motion, identical charge/active lane bounds, zero RNG calls, flash suppression, no death circles and bounded draw-command count.
- PASS: legacy explosion RNG/allocator parity, eighteen-effect cap, boss deduplication, eight-piece hull alignment, retirement and Reduced Motion.
- PASS: enemy-death feedback; existing tier/particle/size/runtime assertions retained. Three expectations that explicitly required the rejected rings/diamonds were replaced with assertions that these are absent.
- PASS: content-director determinism, ranked policy parity, Steam bridge isolation, i18n, eight-language UI screenshots, controller-only flow, release-line and full build:current prerequisites.
- Installed develop-web-game client ran using the existing Chrome adapter after the default client failed to find its bundled browser. State confirms movement/firing. Its discarded-buffer canvas images are not visual proof; actual compositor captures were inspected.
- Reinforcement-wow remains unresolved: source run fails upstream warning-popup placement before reaching the changed entry effect; an attempted exact previous-package browser comparison timed out at scene startup and cannot establish baseline equivalence. Assertions were not weakened. The changed arrival effect itself was staged, rendered and captured successfully.
- Previously documented first-run HUD restoration timing failure is not addressed by this presentation pass.

## Source-stage evidence
Before/after: `test-results/arrival-circles-before-verified/arrival-and-death.png` and `test-results/arrival-circles-final/arrival-and-death.png`. Nine warning families: `boss-drama-staged-before` and `boss-drama-final-shapes`. These are actual game renders with QA staging, not offline artwork. Background rotation and incidental mission copy differ, so they are equivalent staged layouts rather than bit-identical replay images.

At 1280x720, a fixed-progress radial warning rendered for twelve seconds at normal wall-clock speed: baseline p95/p99 17.0/17.3 ms, candidate 16.9/17.0 ms; retained JS heap 68.72/68.93 MiB. These short browser samples are not a dense-combat benchmark, exclude GPU/native memory and do not prove all stutters fixed. Build adds code only; no new disk assets or additional network requests. Existing large-bundle warning remains. No controlled cold-load claim.

## Files changed
`src/effects/AstraWarningField.js`, `AstraBossEnergy.js`, `AstraShatterBurst.js`; `src/entities/Boss.js`; the death-feedback and reinforcement-entry presentation sections of `src/scenes/PlayScene.js`; `scripts/capture-boss-drama.mjs`, `check-boss-drama-materials.mjs`, `check-enemy-death-feedback-readability.mjs`; `progress.md` and this delivery report.



## Native package verification

Both the previous package (runtime 9a42bb5, same source runtime as starting bef81e2) and candidate (46c2d63) passed the twelve native encounter/input/transition checks. Captures cover menu, opening, movement/fire, pause/resume, ordinary and dense combat, Daily, boss, destruction, rewards, death, restart and relaunch. Candidate independently passes native control-smoke and sixty-second perf-smoke (60.28 average sampled FPS, 59.88 minimum; zero errors/warnings). ASAR code and running runtime both verify 46c2d63.

Nine staged warning shapes and the no-circle arrival/death comparison were also rendered by the actual candidate executable. Initial native staging attempted a boss before the first wave had finished initializing; the helper now waits for WAVE_ACTIVE before staging, on both packages. The failed initial report is retained.

At verified 1280x720, fixed-progress radial warning p95 17.0 -> 16.9 ms; p99 17.2 -> 17.2; max 17.4 -> 17.4; retained JS heap 37.64 -> 38.13 MiB. These are twelve-second normal-wall-clock draws, not a replay of full combat.

Matched full-game scenarios, same resolution/settings and Daily seed nova-swarm:daily:v1:2026-09-06 (DCS1-0CA0B0F5):

| Scene | p95 before / after (ms) | p99 before / after (ms) | max before / after (ms) | retained JS heap before / after (MiB) |
|---|---:|---:|---:|---:|
| daily-seeded | 16.90 / 16.90 | 17.10 / 17.30 | 33.20 / 483.30 | 47.72 / 47.03 |
| sector-90-dense | 17.00 / 16.90 | 17.20 / 17.10 | 17.50 / 33.40 | 41.29 / 42.74 |
| boss | 16.90 / 17.00 | 17.10 / 17.30 | 17.30 / 50.00 | 34.78 / 35.25 |

Entity populations differ: Daily before/after max enemies 10/10, bullets 53/55; dense enemies 17/18, bullets 36/49. These are short equivalent scenarios, not bit-identical replays. The candidate had an isolated large Daily frame; the table intentionally retains it. Typical frame times remain near 60 Hz, but this is not evidence that all stutters are eliminated.

Main-menu art-ready time before/after 18840/4348 ms; menu-to-controllable 7174/7023 ms. Single launches with differing cache history, not a controlled loading-speed comparison.

Evidence page: test-results/boss-drama-delivery/index.html. Actual packaged recordings: astra-desktop-boss-drama/gameplay-normal-speed.mp4 (27.00 s) and boss-destruction-normal-speed.mp4 (11.03 s). Normal wall-clock speed, silent, scripted QA with invulnerability; the boss defeat is staged. Screenshots and sampled video frames inspected; no complete real-time human viewing or human playtest claimed.

Daily follow-up on a fresh isolated candidate profile, same seed and verified 1280x720: two consecutive twenty-second samples had p95 16.9/16.9 ms, p99 17.2/17.1 ms and maximum 150/100 ms. The 483 ms spike did not recur, but smaller hitches remain. The first sample reported 107/65 ms main-thread long tasks; the second had no >50 ms long tasks despite a 100 ms frame gap. Cause remains unproven; no claim that stutters are fixed or that these measurements prove a regression-free worst case. Detailed report: test-results/boss-drama-daily-repeat/report.json.

## Play
Double-click **Nova Swarm - Visual Upgrade** on the desktop, or **Play Nova Swarm.vbs** in test-results/astra-build-2026-09-06T15-19-11-035Z. The wrapper launches this exact executable with --nova-fresh-profile --windowed and its own isolated-play-profile directory, disables live platform services and writes logs to real file handles to avoid EPIPE popups. Keyboard controls remain unchanged.
