# Nova Swarm: continuation handoff — 7 September 2026

## Start here

Continue improving the actual game in `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`. Read the current root `AGENTS.md`, this handoff, `docs/astra-opening-balance-20260907.md` and the newest section of `progress.md` before editing. This file transfers context; it is not permission to publish public announcements, change Steamworks service settings or discard work.

The user's goal is an engaging, impressive game that earns good reviews, retains beginners and veterans, and sells more Steam copies. They explicitly granted broad gameplay/balance freedom. They later clarified that making new players happy and competitive matters more than protecting old leaderboard positions. Do not use historical leaderboard positions as a veto on worthwhile balance changes. This does not authorize deleting scores or saves.

The most recent task is completed and delivered. There is no unfinished implementation to blindly resume. Establish the next improvement from current play evidence and the user's new instructions.

## Repository provenance and safety

- Branch: `codex/astra-visual-overhaul`. Keep this checkout as the baseline; do not switch to main or import an older release.
- Latest implementation runtime: `a95860e`. Delivery/documentation HEAD before adding this handoff: `1f180784ca6b872479f24f2bc45dfb9c1ce859da`, verified clean. A subsequent documentation-only commit adds this handoff. Read live HEAD/status rather than treating either historical hash as current forever.
- Baseline before the latest balance pass: `3dcfd4a0b4ffef3600bbb306d099ba3c6fa9ca6c`.
- Balance checkpoints: `285b5a4` (opening choreography) and `a95860e` (four precision hulls).
- Before coding, perform the root AGENTS-required fetch/status/branch/log/worktree checks. Fetch is not permission to pull, merge or rebase. Verify worktree ownership and explain any branch divergence. Stop and ask if unexplained/pre-existing uncommitted work exists; never discard, stash or commit unrelated work.
- No reset, clean, bulk imports, Git push, release overwrite or engine migration. Existing PixiJS/Electron/Vite stack stays. Use task-only local checkpoint commits and separate test outputs.
- Do not run multiple agents in this directory. Any permitted delegation requires separate worktrees under the applicable instructions.
- Treat old progress sections as historical. For current delivery facts, prefer this dated handoff, the latest report, Git and receipts.

## User preferences that must carry forward

- Work autonomously on concrete improvements, inspect actual gameplay, iterate and test. Communicate regularly and explicitly explain what changed. The user has repeatedly objected to vague completion claims and subtle changes presented as dramatic redesigns.
- Preserve recognizable, readable combat and honest collision cues. Presentation must not consume gameplay RNG. Gameplay changes are now authorized when justified; do not casually alter score identities, saves or Cloud paths.
- **Always use ElevenLabs for sound work. Primitive/local synthesized substitutes are never allowed.** Preserve existing approved audio when no sound change is needed. The user says a key is available in the environment; never print or commit it. If ElevenLabs is unavailable, report that rather than substitute primitive sounds. Do not purchase services or assets.
- For substantial visual assets, use internal image generation, Blender and appropriate free tools when useful. Keep editable sources and commercial-use license evidence. Do not substitute concept renders for actual game evidence.
- Menus should show the last selected/played hangar ship, be sharp and impressive, and allow manual rotation without jerky automatic rotation. Older requests also cover richer bosses, attacks, explosions, warning lanes, Codex art, drones and rank badges. Inspect the current implementation and existing delivery reports before assuming these are still unimplemented or fully solved.
- In-game text must use `src/i18n/` and all supported locales, following AGENTS. No new hardcoded English player-facing strings. No new text/audio/assets were introduced in the latest balance pass.
- Local automated QA must use isolated saves and offline/mock platform services. Do not write real saves, Cloud, achievements or live leaderboard submissions.
- The user is building a bot intended to simulate a human tester and use it extensively. They have not supplied it or requested integration yet. Do not invent its path or claim it was used. Future comparison should include novice, ordinary and expert input profiles; bot results do not establish human enjoyment or retention.

## What the latest pass actually changed

### More active opening, without delaying the first reward

The first sector deliberately has three waves. This was introduced earlier because users quit after a few minutes; do not casually restore five waves or long filler. The latest complaint was that one firing lane could erase arriving waves too easily.

`src/config/OpeningWaveEngagement.js` now defines deterministic two/three-wing arrivals from opposing approaches, with separated beats and crown/hook/braid/scissor routes. It applies to ordinary source sectors 1-6 and tapers toward the original cadence. Integration is in `src/managers/EnemyManager.js`. Delayed forced divers retain at least 520 ms settling grace after actual arrival.

Per-ship flight remains 2.0-2.55 seconds. Counts, enemy HP, score/drop budgets and the three-wave first sector remain. Daily, Overrun, reinforcements, authored high-sector encounters and source sectors 7+ retain their arrival rules. No gameplay RNG was added. Do not return to the rejected very slow 2.8-3.5-second entrance trial from earlier work.

### Four precision hulls made more viable

Only base shot damage changed in `src/config/ShipData.js`:

| Hull | Before | After |
|---|---:|---:|
| Pixel Needle | 1.10 | 1.65 |
| Glacier Scope | 1.22 | 1.85 |
| Quartz Needle | 1.32 | 2.10 |
| Chrome Rail | 1.52 | 2.42 |

Calculated sustained DPS improved from 7.21-8.23 to 11.48-12.93; the same model gives the starter 17.95. This model assumes hits and does not fully value multi-target penetration or survivability. It diagnoses outliers, not perfect balance. Narrow shots, hitboxes, speed, reload, traits, unlocks and existing sounds are preserved. Other 26 hulls are unchanged. Explicit `shoot_small` metadata on the first three avoids an unintended timbre change caused by crossing the old damage threshold.

The base pressure curve through source sector 410, time escalation, boss mercy and ship threat response were reviewed. No evidence justified a blanket veteran difficulty increase. Do not claim a complete natural playthrough or perfect whole-game balance.

## Validation, caveats and outstanding issues

- Final Windows timing run: first boss **44.4 s**, first Tactical choice **57.9 s**; previous package **42.6/58.6 s**. Ordinary movement/shooting, but QA invulnerability was enabled for this timing harness. No forced damage, waves or kills.
- Separate real-input browser arrival tests without invulnerability used the three verified starters: boss in **43.4/52.6/38.5 s**, ending with **3/2/2 lives**. Final buffed Needle: **37.3 s**, two lives remaining. Independent content rolls, not identical seeded replays.
- The initial browser baseline mistakenly passed ship IDs where texture keys were required. Its three runs were all Sparrow, not three distinct hulls. The harness was fixed and now asserts actual ship identity. Do not repeat the misleading interpretation.
- Passing: 672 choreography cases, precision/30-hull checks, run pacing, content director, ship threat response/traits, boss mercy, score normalization, rank-policy parity, high-sector curve and staged runtime checks, release-line, i18n, 80 UI screenshots across eight languages, controller flow, production browser smoke, Steam bridge/runtime, basic native smoke, twelve native gameplay checks and native performance gate. Existing large-bundle warning remains.
- Native performance gate: **59.95 average / 59.17 minimum FPS**, above its existing 50 FPS gate.
- **Unresolved performance observation:** one initial sector-90 frame stalled **13.1 seconds**. A separate sequential comparison without recording did not reproduce it: previous/candidate p95 **16.9/16.9 ms**, p99 **17.2/17.1 ms**, maxima **249.9/33.3 ms**; candidate had zero frames above 100 ms. Cause is unconfirmed. Do not claim all stutters eliminated or remove the failing observation from evidence.
- Three inherited checks fail and were not weakened: `check-wave-pacing` and `check-progression-tempo` demand at least five opening waves, conflicting with the existing three-wave design. `check-overrun-opening-tempo` expects a Cabinet Wonder clock guard absent in unchanged baseline PlayScene. Distinguish obsolete pacing assertions from a potentially legitimate clock issue before fixing either.
- Source sectors 60/75/80/85 and packaged sector 90 were staged for runtime checks, not reached naturally. Automated captures and videos use scripted/staged QA; some use invulnerability. They are not human play or approved marketing trailers.
- Normal-game browser tests did not establish seed replay equivalence. A seed-looking URL alone does not prove a deterministic normal run. Verify actual seeded behavior before relying on paired bot outcomes.
- No live Cloud round trip or real leaderboard submission was performed in local QA. Existing integration and published Cloud configuration were preserved and checked.

## Build, Steam and launch

Latest **recorded server verification**: 2026-09-07 14:31:19 UTC. Refresh Steam app info before any future deployment; these assignments can change independently.

- App **4765070**, depot **4765071**.
- Test branch **`sector-continue-test`: Build 25169120**, manifest **1098716849352211032**.
- Public/default remained **25163288**; `test-build` remained **23782673**.
- This task uploaded to the authorized test branch only. No public deployment, store-page update, announcement publication or Steamworks service-setting change.
- Current Windows executable: `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-07T13-53-33-473Z\win-unpacked\Nova Swarm.exe`.
- Manual isolated launch: double-click **Nova Swarm - Visual Upgrade** on the desktop, or run `wscript.exe "D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822\test-results\astra-build-2026-09-07T13-53-33-473Z\launch.vbs"`.
- The launcher supplies `--nova-fresh-profile --windowed` and an isolated `NOVA_SWARM_USER_DATA_DIR`, with real log-file handles to avoid EPIPE popup dialogs. The game was left open after delivery; recheck its live state.
- Steam testing: Properties → Betas → `sector-continue-test`, update, launch. Selecting None returns to the public build.
- Receipt: `test-results/astra-steam-upload-20260907-balance-a95860e/receipt.json`. All 410 payload files were hash-compared to the tested package. ASAR SHA256: `5e1da2103ea25608d934af2a3f8a1f3e332fafb186847a9676c69ffcf6319be0`.

The user previously requested Steam uploads for testing. Keep test-branch delivery distinct from public promotion. A separate player-facing patch-note draft comparing Build 25150873 with its successor was requested for staging, not publication. Locate and inspect that existing draft if it becomes relevant; do not overwrite or publish it while doing unrelated balance work. Steam screenshots/trailers/store updates also require the user's approval before publication. Do not assume old media artifacts are current or approved.

## Useful files and workflows

Read in this order: `docs/astra-opening-balance-20260907.md`; `docs/astra-direction-pace-delivery-20260907.md`; then only relevant older reports such as `docs/astra-flight-delivery-20260907.md`, `docs/astra-boss-drama-delivery.md`, `docs/astra-menu-clarity.md`, `docs/astra-readability-delivery.md`, `docs/astra-v6-delivery.md`, `docs/astra-visual-progress.md`. Existing editable art is under `docs/astra-models/` and related versioned art folders. Avoid scanning/rendering everything unnecessarily.

Useful test helpers:

- `scripts/check-opening-wave-engagement.mjs`, `scripts/check-precision-ship-balance.mjs`.
- `scripts/check-opening-pressure-playtest.mjs LABEL`: normal-speed opening test, optional `TEST_SHIPS`, `CHECK_URL`. Requires a source server. Correct ship keys and isolation are already implemented.
- `scripts/astra-opening-playthrough.mjs LABEL`: reads `test-results/astra-build-location.json`; native first-boss/reward timing with QA invulnerability.
- `scripts/astra-desktop-playtest.mjs LABEL`: packaged twelve-step smoke, screenshots, recordings, frame/heap measures. `ASTRA_EXE` overrides package. It stages encounters and is not a human benchmark.
- `scripts/astra-native-check.mjs LABEL smoke|control-smoke|perf-smoke EXE`: isolated native launch with robust logging.
- `scripts/astra-offline-test-context.mjs`: preload for existing browser checks to isolate platform transport without weakening assertions.
- `scripts/run-astra-skill-client.mjs`: installed web-game skill client using installed Chrome; action names are lowercase `space`, `left`, `right`.
- `test-results/check-opening-dense-pair.mjs`: latest sequential packaged comparison; this evidence helper is ignored/untracked, not a shipping dependency.

Evidence: `test-results/astra-desktop-opening-balance-final/`, `astra-opening-playthrough-opening-balance-final/`, `opening-pressure-dense-pair/`, `opening-pressure-production-smoke/`, `opening-pressure-i18n-ui/`, `opening-pressure-high-sector/`, and `astra-native-opening-balance-final-perf-smoke/`. Detailed raw failures are retained in `test-results/opening-pressure-check-*.log`.

For new builds, run `npm run check:release-line` first. Use `npm run build:current -- --outDir test-results/NEW-DIST` to avoid overwriting release output or unnecessarily rewriting version metadata. Then `ASTRA_DIST=... node scripts/package-astra-test.mjs` (set the environment appropriately in PowerShell). The helper creates a timestamped package and updates `test-results/astra-build-location.json`. Never trust that pointer without checking what was actually built.

After packaging, set `NOVA_SWARM_STEAM_PACKAGE_ROOT` to that exact new package and run the existing `scripts/stage-steam-native-runtime.mjs`, then `scripts/check-steam-package-runtime.mjs`; set a separate `NOVA_SWARM_STEAM_PACKAGE_CHECK_OUTPUT_DIR`. Verify resolved targets first: staging replaces only the new package's copied runtime folders. The raw packager includes extra platform SDK files that the staging step removes. Run native QA on the staged final package, not only the source server. On this machine the final Vite build took about 8.5 minutes and Windows packaging about 19 minutes; slow progress alone was not failure. Avoid parallel I/O-heavy packaging or recording during performance measurement.

Steam upload material and executable receipt/verification helpers are under `test-results/astra-steam-upload-20260907-balance-a95860e/`. Reuse their approach, not their output directory. Run release-line before VDF generation/upload, verify the exact payload and current branch assignments, and verify server assignment afterwards. The VDF must not silently promote public/default. Keep credentials out of logs and source.

## Rollback and sensible next work

Source rollback for the latest balance changes, only after a clean-status/ownership check: `git revert a95860e 285b5a4`. Do not reset history. Previous test build is **25164967**; previous preserved executable is `test-results/astra-build-2026-09-07T09-39-02-902Z/win-unpacked/Nova Swarm.exe`. Steam rollback is a separate deployment action, not accomplished by a Git revert. The existing `--nova-flight-previous` flag reverts broader flight behavior but does not revert precision buffs; it is not a full rollback of this pass.

Recommended next step, subject to the user's new request: establish whether Build 25169120 gives a better first five minutes for real novice and experienced players before another broad difficulty adjustment. When the user's bot is ready, inspect its actual interface and validate input-only, visible-information behavior, seed reproducibility, reaction delays and survivability profiles. Compare the three starters over multiple runs and progression bands. Separate technical pass rates from human engagement. Investigate the isolated severe stall if it recurs; preserve evidence rather than repeatedly rerunning until green. Keep further changes focused enough that their effect can be understood and rolled back.
