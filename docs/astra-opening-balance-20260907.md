# Opening engagement and precision-ship balance

Clean baseline: `3dcfd4a0b4ffef3600bbb306d099ba3c6fa9ca6c`. Branch: `codex/astra-visual-overhaul`. Runtime checkpoints: `285b5a4` (arrivals) and `a95860e` (precision hulls). Current checkout, not an older main branch, was the baseline. No inherited work was changed.

## Decisions

Keep three waves before the first boss and the early Tactical choice. The retention goal is early meaningful action and a reward, not a longer opening filled with weak enemies. Arrival wings now approach from opposite sides in two or three separated beats, using crown, hook, braid and scissor routes. This makes camping one interception lane less effective. Ships remain damageable throughout entry; their existing 2.0-2.55-second travel durations remain. Delayed divers retain settling grace. The change applies to ordinary encounters in source sectors 1-6 and tapers toward normal cadence. Daily, Overrun, authored high-sector encounters, reinforcements and source sectors 7+ retain their arrival rules.

Four precision hulls had under half the starter's calculated sustained single-target output. Their narrow weapon, small hitbox and penetration traits provide benefits, but the damage deficit made these choices too punitive. Buff their shot damage while retaining handling, cadence, traits, unlocks and the existing sound cues. Other 26 hulls are unchanged.

| Ship | Base shot damage before → after | Calculated sustained DPS before → after |
|---|---:|---:|
| Pixel Needle | 1.10 → 1.65 | 8.23 → 12.34 |
| Glacier Scope | 1.22 → 1.85 | 8.00 → 12.13 |
| Quartz Needle | 1.32 → 2.10 | 7.21 → 11.48 |
| Chrome Rail | 1.52 → 2.42 | 8.12 → 12.93 |

The starter's same-model DPS is 17.95. This model assumes shots hit and does not value multi-target penetration or survivability. It identifies outliers; it does not prove equal ship performance. These buffs apply wherever the hull is used, including ranked play. Existing leaderboard places do not veto balance improvements. No scores are deleted, identities changed or artificial score multipliers added.

The complete base pressure curve was inspected from source sector 1 through 410, alongside time pressure, boss mercy and ship-threat response. Existing health scaling reaches its 1.8 cap around sector 30 and projectile pressure continues rising toward the deep-game ceiling. Time pressure already interpolates. There was no evidence supporting a blanket increase to veteran pressure. This is a focused balance pass across the opening and the full ship roster, not a claim that every encounter has been human-tested or perfectly balanced.

## References informing the decision

[DEVIL BLADE REBOOT](https://store.steampowered.com/app/2882440/DEVIL_BLADE_REBOOT/) describes simple core controls with proximity risk/reward. [Crimzon Clover World EXplosion](https://store.steampowered.com/app/1718160/Crimzon_Clover_World_EXplosion/) provides distinct novice and advanced experiences. [Galaga](https://store.steampowered.com/app/403430/) centers arcade wave combat. The design inference is to reward positioning and interception while retaining an approachable start. No competitor executable was timed, and these sources do not establish a universal ideal first-boss time.

## Actual opening samples

Browser tests used normal-speed keyboard firing and modest nearest-target correction, without invulnerability, forced kills or accelerated time. Each run had an independent content roll; this is not a same-seed replay comparison.

- Baseline: three runs of Nova Sparrow reached the first boss 32.6-36.2 seconds after the first wave began; all retained three lives. The initial harness mistakenly treated ship IDs as texture keys. These are explicitly three Sparrow runs, not three different ships.
- Arrival candidate: verified Sparrow, Needle and Fan reached the boss in 43.4 / 52.6 / 38.5 seconds, with 3 / 2 / 2 lives remaining.
- Final buffed Needle: boss in 37.3 seconds, two lives remaining, 34 hostile shots observed. Its p95/p99 animation-frame intervals were 17.7/18.6 ms.
- Baseline native Tactical playthrough reached the boss in 42.6 seconds from launch and first choice in 58.6 seconds. That separate harness uses QA invulnerability; use it for progression timing, not survival difficulty.

Evidence: `test-results/opening-pressure-before/`, `opening-pressure-after-v1/`, `opening-pressure-precision-final/`, `opening-pressure-skill-final/` and `astra-opening-playthrough-challenge-baseline/`.

## Checks and known inherited failures

Opening choreography: 672 cases, bounded arrivals, deterministic output, zero gameplay RNG, excluded modes and byte-identical score/board/reward contracts. Precision checks cover all 30 hulls. Run pacing, content director, ship threat response, ship traits, boss mercy, score normalization, rank-policy parity, i18n and Steam bridge passed. The installed web-game skill client ran with real keyboard input and its screenshot was inspected.

Three older checks fail: `check-wave-pacing` and `check-progression-tempo` still require at least five opening waves, conflicting with the baseline's already-established three-wave first sector. `check-overrun-opening-tempo` expects a Cabinet Wonder gameplay-clock guard absent from baseline PlayScene. The failing generation/clock rules and test assertions were not modified in this task; no test was weakened. Exact logs are `test-results/opening-pressure-check-*.log`.

All local runs use isolated profiles and offline/mock transport. No new text, translations, audio, fonts, assets, dependencies or paid tools. Existing audio is retained. No real saves, achievements or live score submissions were used for QA.

## Rollback

Preserved prior package: `test-results/astra-build-2026-09-07T09-39-02-902Z/win-unpacked/Nova Swarm.exe`. Source rollback, after checking that no unrelated work is present: `git revert a95860e 285b5a4`. This reverts only the two implementation checkpoints without resetting history. Existing earlier packages remain intact.

## Final verification

`build:current` passed with its existing large-bundle warning. The separate production browser smoke passed with zero failures, console warnings/errors, page errors or bad responses. The controller-only flow passed. All-eight-language UI QA passed with 80 screenshots, no placeholder hits, English leaks or page errors. The high-sector pressure-curve and runtime suites passed, including staged sector 60 support warnings and sectors 75 Pure, 80 Tactical and 85 Overrun. These runtime suites stage encounters; they are not full natural playthroughs to those sectors.

Separate Windows package: `test-results/astra-build-2026-09-07T13-53-33-473Z/win-unpacked/Nova Swarm.exe`. Both the script actually referenced by its packaged index and running game state were verified as `a95860e`. The existing Steam runtime staging step removed non-Windows SDK development files from this new package; the final runtime/Cloud/leaderboard contract check passed. Local QA remained offline.

All twelve packaged gameplay checks passed with no renderer errors: menu, opening, movement/shooting, pause, combat, Daily, sector 90, boss, destruction, reward selection, death, restart and relaunch (some checks share a capture). Basic native smoke also passed. Actual screenshots and silent normal-speed videos are in `test-results/astra-desktop-opening-balance-final/`; recordings are scripted/staged QA with invulnerability, not human gameplay or marketing trailers. The ordinary-input native opening test reached its first boss at 44.4 seconds and Tactical choice at 57.9 seconds, versus baseline 42.6/58.6 seconds. That timing harness uses invulnerability but no forced kills, damage or waves.

The native 60-second performance gate passed at **59.95 average / 59.17 minimum FPS**, above its existing 50 FPS threshold. The initial full smoke measured one severe 13.1-second stall in sector 90 despite a 17.0 ms p95. It is preserved in the report rather than hidden by averages. A subsequent separate sequential sector-90 comparison, with no recording or concurrent game tests, measured previous/candidate p95 **16.9/16.9 ms**, p99 **17.2/17.1 ms**, maximum **249.9/33.3 ms**, and frames over 100 ms **1/0**. The severe stall was not reproduced; its cause is unconfirmed. This does not prove all stutters eliminated.

Retained heap after collection in the full native suite, previous → candidate: Daily **47.76 → 47.27 MiB**, sector 90 **43.41 → 42.05 MiB**, boss **34.38 → 34.14 MiB**. Menu-to-control was **6.41 → 10.80 seconds**, and dense-scene load **11.48 → 9.59 seconds**. These are separate active-machine samples with independent normal-game content rolls, not laboratory-controlled loading benchmarks. No new assets or loading systems were introduced. Evidence: `test-results/opening-pressure-dense-pair/report.json`, `astra-native-opening-balance-final-perf-smoke/`, and the two full native reports.

Manual local launch: double-click **Nova Swarm - Visual Upgrade** on the desktop, or run `wscript.exe "D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-07T13-53-33-473Z\launch.vbs"`. This opens the new package with its isolated offline profile. The executable can also be started with `--nova-fresh-profile --windowed` and a separate `NOVA_SWARM_USER_DATA_DIR`. Do not remove isolation flags for automated testing.

Runtime files changed: `src/config/OpeningWaveEngagement.js`, `src/managers/EnemyManager.js`, `src/config/ShipData.js`. Supporting files: `scripts/check-opening-wave-engagement.mjs`, `scripts/check-opening-pressure-playtest.mjs`, `scripts/check-precision-ship-balance.mjs`, `progress.md` and this report. No new untranslated text. Existing Steamworks Cloud/leaderboard settings and old scores are retained; no public announcement or store-page changes.

## Steam delivery

**Build 25169120 is verified on `sector-continue-test`**, App 4765070, depot 4765071, manifest 1098716849352211032. Verified at 2026-09-07 14:31:19 UTC. Public/default remains **25163288** and `test-build` remains **23782673**. No public deployment, announcement publication, store-page change or Steamworks service-setting change was performed. Published Cloud configuration was verified identical before/after. Local tests do not claim a live Cloud round trip or real leaderboard submission.

The 410-file, 1,650,067,943-byte payload was hash-compared file by file with the tested package. ASAR SHA256: `5e1da2103ea25608d934af2a3f8a1f3e332fafb186847a9676c69ffcf6319be0`. Steam reported two changed files, 12.78 MB of changed data, zero additions and zero removals. Receipt: `test-results/astra-steam-upload-20260907-balance-a95860e/receipt.json`. Release-line checks passed before packaging, payload preparation and upload.

In Steam: **Nova Swarm → Properties → Betas → sector-continue-test**, wait for the update, then launch normally. Selecting **None** returns to the unchanged public version. The previous test build **25164967** remains the rollback target for this update. Old leaderboard scores are retained; the precision buffs can change competitive results, as authorized in favor of improving new-player experience.

The local game was left open with its isolated profile and the existing **Nova Swarm - Visual Upgrade** desktop shortcut updated. No Git push, pull, merge, rebase, reset or stash was performed. Runtime remains `a95860e`; the final documentation checkpoint does not change the tested binary. Source rollback remains `git revert a95860e 285b5a4` after checking for unrelated work.
