# Nova Swarm: continuation handoff — 7 September 2026

## Latest delivery: surgical menu-return hotfix (8 September)

User requested only the menu-return bug fix and fast test upload, expressly skipping smoke and lengthy tests. Runtime **77b731b** resets cached tile/variant controls when rebuilding MenuScene; the reproduced return-from-Codex exception is gone. Five runtime lines changed. Steam Build **25182624** is verified on **sector-continue-test**, manifest **3892268512034224992**. Public/default **25169120**, test-build **23782673**, Cloud unchanged. Existing unreleased cores/snakes remain included. Focused return checks, i18n, release-line, production compilation, package runtime and archive identity passed; broad smoke/controller/performance/localization screenshot suites were deliberately not run. Read `docs/menu-return-hotfix-20260908.md` for evidence, exact scope and limitations. Rollback: `git revert 77b731b`; Steam test rollback **25175308**. No forum-feedback implementation is approved by this narrow hotfix request.
## Latest delivery: cinematic launch menu

The subsequently approved main-menu redesign is complete. Read `docs/cinematic-launch-menu-20260907.md` for full provenance, QA, intermediate failures and rollback. Baseline was clean `6b2e86b5b8611fdbc796db9b9be80e8a1c45280a` on this uniquely owned `codex/astra-visual-overhaul` branch. Runtime **373e23f** adds the cinematic generated launch bay, dominant direct Tactical Play, saved ship/manual rotation, visible Other Modes with remembered alternative selection, restrained navigation and all eight translations. Detailed alternative-mode rules remain available. Existing ElevenLabs sounds and the earlier core/snake/HUD expansion are preserved.

Steam Build **25175308** is verified on **sector-continue-test**, manifest **7033274111373604527**. Public/default remains **25169120**, test-build **23782673**, Cloud/service settings unchanged. Package: `test-results/astra-build-2026-09-07T21-15-45-887Z/win-unpacked/Nova Swarm.exe`; receipt: `test-results/launch-menu-steam-upload-373e23f/receipt.json`. Every one of 410 uploaded regular files matches the tested package. This verifies server assignment and packaged QA, not a Steam-client download or human test.

Final packaged menu, twelve-step desktop, startup, controls and performance checks pass without renderer warnings/errors. Production localization covers eight languages/80 captures; controller, responsive and gameplay smoke checks pass. One-minute native performance: **60.42 average / 58.82 minimum sampled FPS**. Settings return dimming and duplicate rotation hints were caught visually and corrected; old tests were updated to target visible controls. Preserve all older unresolved stall/pacing limitations and the fact that the user bot has not been supplied. No further implementation or upload is pending; await the user's test feedback or next request. Rollback test build is **25173832**; source rollback is documented in the menu report. Later documentation/test-only commits do not change runtime 373e23f.

## Previous delivery: cores and serpents

The later user-approved expansion is complete. Read `docs/core-serpent-expansion-20260907.md` before continuing; it supersedes the runtime, Steam build and rollback values in the earlier handoff below. Baseline was `67c84381fb3e3304fa99a2424b9583905a3dafa4` on the same uniquely owned `codex/astra-visual-overhaul` branch. Delivered runtime is `8b2b9870c018c0a9033b045eb55283b80f75667f`; later documentation commits do not alter the executable. Steam Build **25173832** is verified on **sector-continue-test**, with public/default **25169120**, test-build **23782673**, and Cloud configuration unchanged.

Delivered: ten rare non-power bonus cores with a shared randomized 2–4-sector budget, four connected snake species eligible from sector 6 with randomized 20% rolls on eligible ordinary waves, full Codex/localization and ElevenLabs monster/reward sounds, six rotating enemy effect families, +50% boss fuel in sectors 1–20, central sector headline and contextual trait display. The user rejected a large gold sidebar sector box. Keep the short trait introduction, actionable experimental notices, pause explanation and ship-centered phase cues. Snakes always pay a bounty; their core drops spend the same shared rarity budget.

Final native feature/startup/controller/twelve-step/performance checks pass. One-minute performance: 59.86 FPS average, 58.82 minimum sampled reading. Preserve the older unexplained 13.1-second stall and three inherited incompatible checks; no claim of a fix or human enjoyment validation. The user's testing bot remains unsupplied and unused. The report records intermediate failures and the browser resource-buffer warning, as well as exact package, hash proof, Steam receipt and rollback. Do not repeat completed asset production or upload this build to public/default without a new instruction.

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


## Latest continuation: 2026-09-08 predator expansion

This section supersedes older build assignments above. Current runtime: **e2f9433**, based on clean verified **e3f14db** on `codex/astra-visual-overhaul` in this exact worktree. A subsequent documentation/QA commit records delivery. Recheck live branch/HEAD/status/worktree ownership before further work; preserve checked-out content.

The user approved the reliability/readability pass and then ten additional snakes. **Fourteen total species** now have complete eight-language Codex stories/tips. New imagegen heads, 7–14-section bodies, different thickness/palettes/periods and eight smoothly blended routes; randomized 20% eligible-wave chance and earliest sector 6 remain. Section HP now 18 at sector 6, double for heads, progression-scaled up to 258. Ordinary-wave straggler dives/retreats had interfered with snakes: these no longer affect live snakes, and the emergency watchdog allows 180 seconds. Head volleys follow cooldowns directly. The first snake should be much tougher, but automated checks are not human balance approval.

63 new ElevenLabs sounds cover fourteen hunt/death pairs, arrival omen, six ordinary fly-ins, eighteen evolving boss-family performances and ten core pickups. No synthesized substitute audio. Rare cores remain score/collection rewards, never powers, on their existing randomized 2–4-sector cadence. Snake defeats also respect that cadence. Core pickups have new capture effects/mix priority. No full listening review claimed.

Also delivered: measured sector HUD row spacing; wider/shorter Railbreaker gameplay artwork (previous long rails were squeezed by the height cap; stats/hitbox unchanged, showroom model unchanged); Settings focus visible above background with shoulder page navigation; Hangar Escape directly to menu and unlocked requirement text retained; four distinct powerup glyphs; Rift converts innate as well as Phase pulse clears with the existing five-shard cap; bounded optional Steam result lookups. Deleted long-run crash report remains unconfirmed—no lengthy crash investigation or claim of a general crash fix.

Passing: production guard chain/build, release-line, i18n, 80 eight-language UI captures, controller flow, Rift/core/snake checks, focused source UI/audio-event/results fixtures, isolated fourteen-snake entity/Codex fixtures, Steam bridge/runtime and packaged native Eclipse encounter/route change/full defeat/Codex. Preserve older 13.1-second sector-90 stall and inherited pacing/Overrun check limitations; no natural full campaign, real leaderboard submission or Cloud round trip was tested.

Steam server verification **2026-09-08 09:40:49 UTC**: `sector-continue-test` **25183937**, depot manifest **5768472008275080347**. Public remains **25169120**, `test-build` **23782673**, Cloud configuration unchanged. No public deployment or announcement. Exact executable: `test-results/astra-build-2026-09-08T09-22-06-396Z/win-unpacked/Nova Swarm.exe`. QA executable was closed and the temporary source server stopped.

Read `docs/predator-expansion-20260908.md` and `docs/predator-steam-delivery-20260908.json` for complete scope, evidence and rollback. Runtime source rollback from a clean checkout: `git revert e2f9433`; this is not a Steam rollback. Future work should build on this delivered version and not repeat completed core/snake/menu work or silently remove inherited limitations.

## Latest continuation: 2026-09-08 Horizon main menu

User explicitly requested a substantial creative visual upgrade of the clean main menu. Runtime **7ab0116**, based on verified clean **047fc68** on `codex/astra-visual-overhaul` in this worktree. A subsequent documentation-only commit records this delivery. New imagegen sunrise/orbital hangar, bounded animated traffic/stars/motes/light shafts/platform lights, subtle pointer parallax and polished title/Play accents. Compact landscape spacing improved; existing selected-ship turntable, music, controls, modes and all predator/core gameplay retained. No new player-facing strings or audio; no newly untranslated text.

Production guard chain/build, release-line, i18n, controller flow, final eight-language UI pass (80 captures), Steam bridge/runtime and focused packaged native first-launch/modes/Codex/settings-return checks passed. New motion stops for reduced-motion preference; one owned Horizon instance after re-entry; no page errors. Brief native menu sample: 300 frames over five seconds, median 16.7 ms, p95 16.9 ms. An earlier source i18n run timed out entering gameplay during finalization; the frozen production run passed. No human WOW/sales claim, full campaign or new general performance claim. All earlier gameplay/performance limitations remain.

Steam server verified **2026-09-08 10:30:47 UTC**: `sector-continue-test` **25184837**, manifest **4905702832297288373**. Public **25169120**, test-build **23782673**, Cloud unchanged. No public deployment or announcement. Exact executable: `test-results/astra-build-2026-09-08T10-05-32-078Z/win-unpacked/Nova Swarm.exe`; ASAR SHA256 `0029e9bfe722460e8712d55042aaf36ebd87482338233bfbfca82644b8fda71c`. Source/preview servers and isolated native QA closed. See `docs/menu-horizon-20260908.md` and `docs/menu-horizon-steam-delivery-20260908.json` for provenance, tests and receipt. Source rollback from verified clean ownership: `git revert 7ab0116`. Prior Steam test build 25183937 is preserved; reverting source does not change Steam.

## Latest continuation: 2026-09-08 active piloting and Wonders

User approved Tyrian feedback items **1, 2 and 4 only**. Runtime **78a41f0**, based on clean verified **830fc3b**, same uniquely owned `codex/astra-visual-overhaul` worktree. Vulnerable grazes have a 22px margin and count distinct bullets individually; protected flight retains a 450ms limiter and collision radii are unchanged. Contextual actual-hitbox feedback appears on approach. Phase Reactor adds one +50% normal volley within 1.8 gameplay seconds; Bombs preserve the charge. Rift keeps five-shard cap/no bonus score and scales with weapon power and sector depth (sector contribution caps at 200). Wonders are larger adaptive luminous presentations without opaque card frames, retaining HUD/player-lane clearance, cadence and transition timing. No boss-personality, directional aiming, legacy-art or unrelated changes. Five changed help/upgrade strings translated across eight languages; existing audio/art reused.

Production guard chain/build, release-line, i18n, 80 final UI captures, 16 additional upgrade-detail captures, controller flow, focused graze/Reactor/Rift/Wonder checks and packaged native mechanics/Steam runtime passed. Native Bomb-preservation check passed; no page errors. Skill client required installed Chrome and compositor capture because bundled browser was absent and canvas extraction was black; actual screenshot showed gameplay. No human balance proof or full campaign, live score submission or Cloud round trip. Historical sector-90 stall and pacing/Overrun test limitations remain. QA app and temporary servers closed.

Steam server verified **2026-09-08 11:30:37 UTC**: `sector-continue-test` **25185903**, manifest **2395758064661931684**. Public **25169120**, other test branch **23782673**, Cloud unchanged. Exact executable: `test-results/astra-build-2026-09-08T11-13-35-722Z/win-unpacked/Nova Swarm.exe`. ASAR SHA256 `78228970c23b9db309d8e049d09601b0ab95640610c1d800ebbb02469c246cfa`. No public deployment, announcements or settings changes. Full detail/receipt: `docs/active-piloting-20260908.md`, `docs/active-piloting-steam-delivery-20260908.json`. Source rollback after clean ownership check: `git revert 78a41f0`; prior Steam test build 25184837 is a separate deployment rollback. A subsequent documentation commit records this delivery; preserve checked-out content as the next baseline.


## Latest continuation: 2026-09-08 fleet identities, bounty drones and hangar ambience

Baseline bb26bb8, runtime commits dcbb7b7 and 09187d9 on uniquely owned codex/astra-visual-overhaul in this checkout. Fifteen additional Blender-authored shootable score drones (650–2,050), nineteen active including four prior designs, separate localized Codex category in eight languages. Core pickups remain separate and unchanged. New main-menu Codex button animates for unread entries and respects reduced motion. Animated help illustrations and shared glass-panel/menu effects added. Thirty matching gameplay/showroom/48-view ship presentations; following user feedback, ships 1–14 now use the approved original-art relief technique, ships 15–30 preserved. Stats, traits and hitboxes unchanged. Four ElevenLabs ambience layers replace menu/scoreboard songs, with independent breathing/motion and smooth gameplay transition. No procedural substitute sounds.

Full build guard chain, release-line, i18n/Codex copy, 80 frozen production UI screenshots, controller flow, asset/reward/localization checks, audio transitions and isolated packaged menu/help/Codex-return/gameplay checks passed. Final 1,609 new candidate assets match source hashes. One production UI attempt timed out at the leaderboard; unchanged isolated rerun passed. One native fixture null-scene inspection was corrected without changing runtime. No page errors in the final packaged run. No full campaign, human balance/fun/audio verdict, leaderboard write or Cloud round trip. Preserve historical sector-90 stall and pacing/Overrun limitations. Testing bot remains unsupplied.

Exact package: test-results/astra-build-2026-09-08T13-43-06-693Z/win-unpacked/Nova Swarm.exe. Steam test build **25189001**, manifest **7633105530588293812**, verified 2026-09-08T14:17:47.388Z. Public 25169120, test-build 23782673, Cloud unchanged. ASAR 9e77390662e9d1367d097faa67c9d4349f9616d7cc78e7b6ab30fc9c339168d6. No public release, Steamworks settings change or forum post; staged Tyrian reply untouched. QA app and temporary servers closed. See docs/fleet-identity-and-hangar-20260908.md and docs/fleet-identity-steam-delivery-20260908.json. Source rollback after clean ownership verification: git revert 09187d9 dcbb7b7. Prior Steam test build 25185903 is the separate deployment rollback.
