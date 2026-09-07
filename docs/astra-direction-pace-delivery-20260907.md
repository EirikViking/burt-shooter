# Outward boss attacks and slower wave entrances

Baseline: `6ce292ffd96bad6bf6d11e1be72a2d43fe5e5421`, clean current checkout on `codex/astra-visual-overhaul`. Attack/fixed-pace checkpoint: `8010a372f81594994d18a0d2b58881fa4a468d1c`. Final varied-pace runtime checkpoint: `d9b077c`; supersedes the rejected slower `6d0aada` trial.

Every Colossus attack front now travels from its boss toward the far end of its warning lane. Removed reversed and opposing-half paths across forge, mirror, conductor, monolith, jester and choir families, including Sam and Tyrian. Warning packets travel in the same direction. Damage detection and visuals use the same spatial function. Existing arming times, per-point exposure, attack budgets and gameplay RNG are preserved; changing traversal order can still change perceived dodge pressure.

Ordinary entrances vary deterministically by wave and route from 2.0 to 2.55 seconds per ship, retaining any longer authored route and spawn staggering. All ships in one formation share its tempo. A formation typically arrives over roughly 2.5–4 seconds. The first entrance takes 2.2 seconds. The slower 2.8–3.5-second trials were rejected and are not the release candidate. Six tempo choices plus route biases create variation without gameplay RNG. Follow-up ordinary briefings are shorter to offset some added travel time. Entry ships remain damageable, so clearing does not require waiting for arrival. First briefings, cleanup/pickup time, wave counts and boss gates are unchanged. Bonus challenges, reinforcements and authored high-sector encounters retain their timing. Tactical dive grace shifts with the new arrival time. Exact human sector-clear time is not proven identical and depends on how quickly the player destroys entering ships.

Runtime files: `src/config/ColossusAssault.js`, `src/effects/ColossusAssaultVfx.js`, `src/config/ArcadeFlight.js`, `src/managers/EnemyManager.js`. Supporting changes: direction and entrance regression tests, source/native capture helpers, package matcher exclusion and progress notes. The package matcher excludes preserved test builds from repository-root scanning while retaining the explicit candidate-dist mapping.

## Verification

- Direction regression: 1,800 boss/phase/lane cases; baseline had 780 inward cases, candidate has zero.
- Exposure/arming/safe corridor checks, 300 paired attack-budget cases, ten-family rendering/Reduced Motion checks, warning lifecycle and 36 route cases plus 108,000 boss patrol samples passed.
- Source gameplay captures inspected for intermediate entrance positions and Sam/Tyrian near/far attack fronts. These are real rendered game scenes staged by QA, not human gameplay or offline concept renders.
- Production build and production browser smoke passed; no smoke failures, console warnings/errors, page errors or bad responses. Initial hazard-readability startup timed out; unchanged rerun passed. Existing large-bundle warning remains.
- Final Windows package, native controls and twelve-step gameplay smoke passed; Steam receipt below.

Evidence: `test-results/direction-pace/`. Local checks use isolated profiles and offline services. No new strings, untranslated text, sound, fonts or imported assets. Existing ElevenLabs audio retained.

## Rollback

After checking for unrelated work, source rollback: `git revert d9b077c 6d0aada 8010a37`. Preserved previous Steam test build: `25163288`. Existing `--nova-flight-previous` launch switch restores older flight behavior; it does not revert the outward boss-attack fix. Previous Windows packages remain intact.

## Reference-informed tuning

Galaga's official manual recommends attacking assembling formations; Bandai Namco's Galaga Legions history describes previewed flight routes and efficient kills; Gunvein's developer description emphasizes aggressive early destruction. These support readable opportunities to intercept ships, rather than long uninteractive arrivals. The 2.0–2.55-second range is our Nova Swarm tuning decision, not a measured competitor timing. No competitor executable or footage was frame-timed.

- https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NABNE.pdf
- https://galaga.com/en/history/galagaLegions.php
- https://store.steampowered.com/app/2025840/Gunvein/

Known prior limitation: the legacy-VFX source suite has an obsolete exact-text assertion documented in astra-flight-delivery-20260907.md; it was already failing at the baseline and was not weakened here. The first intermediate native performance run failed with an opening slowdown (minimum 20 FPS after its warm-up exclusion), then an unchanged rerun passed at 59.89 average / 58.48 minimum FPS versus the preserved build's 59.96 / 58.14. Cause remains unconfirmed; final-candidate checks are recorded separately below. One source capture assertion was sensitive to screenshot latency during asset copying; it now observes entry state independently on animation frames rather than treating screenshot completion as a timing sample.

## Final packaged verification

Package: `test-results/astra-build-2026-09-07T09-39-02-902Z/win-unpacked/Nova Swarm.exe`. Embedded runtime SHA verified as `d9b077c`. Native first-wave entries measured 2200 ms; Sam and Tyrian each passed near-first/far-later collision checks. Their actual packaged screenshots were inspected. For the paired screenshots only, the QA lane was shortened to fit the viewport after full-length collision assertions; no shipping geometry was changed for the captures.

Final production browser smoke passed with zero failures, routine console messages, warnings/errors, page errors or bad responses. Native basic smoke, controls, isolated-profile/Steam runtime checks and all twelve gameplay checks passed: menu, opening, pause, combat, Daily, sector-90 combat, boss, destruction, rewards, death, restart and relaunch. The Steam runtime check used the existing app and leaderboard identities. Local tests were offline; no live Cloud/achievement/score writes were exercised.

Final 60-second performance rerun: **59.98 FPS average / 59.17 minimum**, above the existing 50 FPS gate. Its first attempt failed with an isolated 30 FPS sample; that evidence remains at `test-results/astra-native-direction-pace-final-perf-smoke/`. The unchanged rerun is `test-results/astra-native-direction-pace-final-verified-perf-smoke/`. These passes do not establish that every stutter is eliminated.

Same-resolution 1280×720 operational samples, preserved prior package to final package:

| Scene | p95 frame ms | p99 frame ms | Retained JS heap MiB | Maximum frame ms |
|---|---:|---:|---:|---:|
| Daily | 16.9 → 16.9 | 17.2 → 17.2 | 47.76 → 47.76 | 216.7 → 33.3 |
| Sector 90 | 16.9 → 17.0 | 17.2 → 17.2 | 42.91 → 43.41 | 49.8 → 17.5 |
| Boss | 16.9 → 17.1 | 17.1 → 17.2 | 34.60 → 34.38 | 33.3 → 50.0 |

Menu-to-control: 7.13 → 6.41 seconds; dense-scene load: 9.78 → 11.48 seconds. These are separate runs on the user's active machine, not controlled laboratory measurements or proof of faster loading. Baseline report: `test-results/astra-desktop-flight-after/report.json`; final: `test-results/astra-desktop-direction-pace-final/report.json`.

Actual final-package screenshots and silent normal-speed recordings are in `test-results/astra-desktop-direction-pace-final/`, including `gameplay-normal-speed.mp4` and `boss-destruction-normal-speed.mp4`. These are scripted/staged QA with invulnerability, not human play or marketing trailers.

## Steam delivery and launch

**Build 25164967 is verified on `sector-continue-test`.** Upload completed at 10:14:10 UTC; authenticated app info verified the assignment at 10:15:22 UTC. App 4765070, depot 4765071, manifest 1542789625690799551. Public/default remains 25163288; `test-build` remains 23782673. No public deployment, store publication or Steamworks service-setting change was performed.

Published Cloud configuration is identical before/after. Existing Cloud and leaderboard integration is retained; local QA used offline isolation rather than live account submissions. Upload receipt: `test-results/astra-steam-upload-20260907-direction-d9b077c/receipt.json`. The separate 410-file / 1,650,066,848-byte payload matched the tested ASAR SHA256 `e1fae4c403e066b5c5b58f6e7cd07e2982f4788c01122ced57c5ebe6756c03a5`. Steam reported two changed files, about 12.77 MB changed data, and no added or removed files.

In Steam: **Nova Swarm → Properties → Betas → sector-continue-test**, wait for the update, then launch normally. Selecting **None** returns to the unchanged public build. Steam-side rollback target for this test update is the preserved build 25163288.

Locally, double-click **Nova Swarm - Visual Upgrade** on the desktop. It points to `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-07T09-39-02-902Z\launch.vbs`. That launcher starts the final package with its own isolated profile. The game was left open; previous packages and other shortcuts were preserved. `previous-flight.vbs` in the same folder launches the older flight behavior for comparison, without reverting the outward boss fix.

Supporting files changed: `scripts/check-colossus-direction.mjs`, `scripts/check-arcade-flight.mjs`, `scripts/check-direction-pace-visual.mjs`, `scripts/check-direction-pace-native.mjs`, `scripts/package-astra-test.mjs`, `progress.md`, and this delivery report. No new untranslated text, sound or imported assets. Source rollback for the gameplay changes: `git revert d9b077c 6d0aada 8010a37` after checking for unrelated work. No Git push, pull, merge, rebase, reset or stash was performed.
