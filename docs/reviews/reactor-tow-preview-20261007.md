# Reactor Tow — local preview, October 7, 2026

## Status and scope

**Playable local prototype; not admitted to ordinary runs and not uploaded.** Still eight of 67 delivered playable surprises. Row14 is being developed; it does not count as a ninth completed contact yet. Latest authenticated private Steam delivery remains Build25765088 / manifest3743460415809241959, receipt E:/Codex/builds/nova-swarm/payback-timing-20261007-3e61a904/delivery.json. The local notification readability refinement also remains unuploaded. Normal fauna catalog still uses original recordings; twenty-second candidates remain inactive.

Same non-junction D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920, branch codex/sector-leaderboard-unknown-20260928, HEAD7e8325e3d9abb09357636bca7e994c0227be02d6, no upstream. Inherited dirty work preserved. Read AGENTS, latest HANDOFF, sprint review and delivery receipt. Git status/branch/HEAD/worktree and fetch dry-run checked; remote advertises the same separate one-more-run branch, with no integration. No branch/worktree switch, reset, clean, stash, pull, commit or push. No competing writer. Old Goal remains usageLimited; this work does not claim to resume it.

## Why this interaction

Audited the current FirstLightModel/director/view, eight ConvoySurprises, BreachModel, EncounterComponent and AuthoredEnvironment. Existing Molt/Shielded Evacuation already offer neutral cover. Rescue Tow cuts a captive free; Last Shuttle arrests a gun; siege relays disable existing guns; Dreadnought uses staged part exposure. Reactor Tow tests a different spatial consequence: moving a pending projectile lane versus cancelling its source. Future Pulse Reservoir/vent proposals must not count as separate mechanics merely by reskinning cancellation.

### Current tuning hypotheses

- Six scaled HP total: coupling2, vent4. Strong fire may end it immediately; no forced cinematic or refill.
- After4.5 active encounter seconds, a1.4-second visible charge precedes **one five-projectile vertical release**. Ordinary Bullet damage/collision/retirement rules apply. No beam, contact damage, debris trap or screen clear.
- Cutting the cheaper coupling moves the reactor continuously toward the right side over1.2seconds, then gives a fresh full warning. It creates an opening in the center while retaining a side hazard. No discharge during relocation.
- Breaking the vent cancels the release and leaves within2seconds. A last-frame intercepted vent hit wins before discharge commitment. A spent reactor has no targets and leaves within2.8seconds; total encounter cap16seconds. Owned shots have2.8second lifetime and are cleared on owner cancellation.
- Pause freezes time. Draft/headline safety suspends/hides as before; ordinary danger preemption resets the reactor warning before it can resume. Same First Light lifecycle, no second director.
- Explicit family reactor_freight for local diagnostics. Normal catalog/seeded order/opportunities/anti-repeat/recovery are unchanged; normal admission remains unimplemented pending preview evaluation and natural pacing tests. Source-only loopback test route; production/remote URLs cannot activate it.

## Credit and remaining balance risk

Utility parts return credit:false, have one-shot identity deduplication, and grant no accuracy/damage-progress credit, kill, XP, drop, rescue, Payback or reward drone. Allies/hostiles cannot break parts. Bomb snapshots may break both at once without duplicate result/reward. No repaired parts or indefinite duration. The model and view do not enter the ordinary enemy list or hold a wave open.

The five hostile projectiles deliberately retain ordinary collision and graze behavior. **If later admitted to ranked runs, that creates up to five additional ordinary graze opportunities**, and cutting/venting changes time spent firing at useful enemies. No claim of unchanged scoring opportunity, and no global formula compensation or leaderboard reset. Current preview policy blocks every production allow* permission. Actual captured samples stayed at score0/lives3; these samples do not prove balance or fun.

## Presentation

Uses already shipped/prewarmed convoy Ark, reactor closed/open and coupling machinery textures, with physical cable separation, restrained opening animation and five thin projected shot lanes. Rotation respects Reduced Motion; the small charge glint respects Flash Intensity. Solid hulls and machinery are harmless, below live projectiles/player. Existing arrival, coupling, vent, charge and release recordings are used. No new art generation or new ElevenLabs sounds are claimed. No purchases, overage or new generation requests.

Four new source strings have complete entries for all eight supported locales in reactorTowText.js, merged into the existing locale source-text registration. No new untranslated labels. Human translation quality and laptop/headphone/mono listening remain review tasks. The source screenshot's unrelated existing Chinese directive `SPEED UP` was not introduced by this feature; not claimed fixed.

Actual preview: E:/Codex/builds/nova-swarm/reactor-tow-preview-20261007-51c8d9e2/preview/Nova-Swarm-reaktorslep-med-lyd.mp4. H.264960×594,27.605seconds, AAC48kHz stereo,2,274,033bytes. Three chapters show leaving it linked, shooting the coupling and shooting the vent. Captured real animation, projectiles and game mix; explicitly labeled isolated mechanics test with scripted pilot placement/keyboard fire. No replacement soundtrack. SourceWebM and final decode retained; actual source screenshots and exported video frame inspected. Audio mean-38.3dBFS, peak-18.6dBFS, no clipping; this verifies signal, not premium listening quality. Original game volume is preserved. The user's prior unidentified center-artifact complaint remains open.

## Verified so far

- New model regression failed before implementation, then passed: two choices, six-HP budget, one release, relocation/full warning, safe vent, preemption, owner filtering, same-shot deduplication, simultaneous destruction, no normal-catalog admission and source-only loopback gate.
- Existing eight-contact pure regression and50 actual First Light continuity checks pass.
- New source and compiled real runtime regression passes at sector3/51/401, nine actual Player volley setups (low, rapid, broad, slow hull, precision, Ghost, drone, Chain-equipped and piercing), pause/draft/warning restart, bomb simultaneity, player death, departure and owned-bullet cleanup. Drone case emits actual drone shots. No scripted positive credit or extra reward. Chain-equipped test does not claim chained arcs between utility machinery.
- Official web-game input client adaptation (installed Chrome, actual page screenshot, prototype policy guard) ran movement/fire; inspected end-state image shows completed/cleaned-up contact. No console errors;41volleys/82disposed player bullets and five disposed enemy bullets. Actual mid-contact images/video also inspected. Source server retains its historical build label; these are source observations, not installed Steam gameplay.
-24 contact/language/layout cases (eight locales×1280×720,800×600,720×1280) pass; German portrait and Chinese landscape images inspected. Initial German check failed because a direct dynamic import reached a second hot-server i18n instance; using the game's actual window.__novaI18n setter fixed the harness. No product translation data change was needed for that failure.
- i18n and fresh release-line pass; full build:current completed,1098modules,7m35s. Candidate E:/Codex/builds/nova-swarm/reactor-tow-preview-20261007-51c8d9e2/release-fixed, v2026-10-07_02-49-23; assets/index-CuLjQyO8.js SHA256 d82b403fbefb8aa3dd29990d29410a9214357bf7794814614bfe1239f447ba08.629 source/188public hashes verified. No native packaging or Steam upload.
- Paired source rendering, same Chrome/context/background and160stationary hostile projectiles, A/B/B/A existing rival versus new reactor at peak charge: CPU p99 rival6.1/8.5ms, reactor7.1/6.0ms; RAF p99 rival17.3/17.1ms, reactor17.3/17.4ms. Zero samples>50ms. Score/lives/part health/entity count stable. This is comparable bounded rendering cost, not an old-binary whole-game regression proof or general speedup claim.
- Complete compiled eight-language UI check passed with zero console/page errors, placeholders or English leaks in its covered screens.629 source/188public hashes reverified at03:13:04Oslo after tests.

Two harness invocation mistakes were corrected: missing E: output env for the first continuity invocation, and case-sensitive ship-name lookup in the first runtime attempt. They were test setup failures, not shipped fixes.

## Reproduce locally

Use the existing checkout, process TEMP and TMP E:/Codex/tmp/reactor-tow-preview-20261007-51c8d9e2, npm cache E:/dev-cache/npm. Existing source server4983 is preserved. The job-owned compiled read-only server4988 was stopped after verification; restart with node E:/Codex/builds/nova-swarm/reactor-tow-preview-20261007-51c8d9e2/serve-fixed.cjs when needed. No new dependencies or project relocation.

Open http://127.0.0.1:4983/?autostart=1&offlineLeaderboard=1&encounterEvolution=reactor-tow for the isolated preview. This forced empty-wave test has no production progression. A normal run has no Reactor Tow yet. Existing natural inspection uses encounterEvolution=natural.

Run node scripts/check-reactor-tow.mjs and node scripts/check-convoy-surprises.mjs. For browser checks set CHECK_URL and CHECK_OUTPUT_DIR to an owned E: subdirectory, then run check-reactor-tow-runtime.mjs, check-reactor-tow-layouts.mjs, measure-reactor-tow.mjs or capture-reactor-tow.mjs in scripts. Compiled runtime uses CHECK_URL=http://127.0.0.1:4988 and REACTOR_TOW_COMPILED=1 with the existing isolated bootstrap. Never use that bootstrap as a production launch mode. Capture requires a fresh output filename to preserve earlier media.

Full build reproduction is the owned E: build-fixed.ps1 with explicit E: output/cache/temp and source checkpoint; it refuses to overwrite an existing output. For compiled UI use I18N_UI_URL=http://127.0.0.1:4988 and I18N_UI_OUTPUT_DIR under this owned E: root, then npm run check:i18n-ui. Fresh applicable release/native/controller/performance/authenticated Steam gates remain mandatory before any upload.

## Human playtest and next work

1. First sighting: can the player identify the coupling, vent and shot lane without narration?
2. Under ordinary pressure: does the cheaper cut free a useful lane, and is spending more fire to vent worthwhile?
3. Third sighting: is there a reason to choose differently with precision, broad fire or drones? Automated success alone is insufficient.
4. Listen for a clear approach/charge/release without masking ordinary warnings; assess laptop, mono and headphones.
5. Measure natural eligible opportunities before choosing frequency. Integrate through existing First Light opportunity and shared-family recovery only after the preview milestone is ready; no extra scheduled enemy on top of a headline.

Preview/status email sent and full readback verified **03:15:04Oslo**, message **1a113edaa072c07f**, from/to personal Gmail;2,274,033-byte video attachment confirmed. SHA256 dd9ef49f36a729399f2b96f27e2f259ed7b95e0f96247a8358f6f38159f1096a. User explicitly notified. Central email-latest.json and job email-receipt.json updated, retaining earlier boss/fauna preview references. Next report roughly04:15; check recent sent mail first. Existing hourly automation updated with this actual checkpoint and unchanged deadline22:36.

Next: evaluate the two choices under ordinary pressure, refine art/scale/audio from inspection and feedback, then test natural admission/anti-repeat/mode/scoring opportunities before counting or delivering row14. Preserve preview-first presentation review. Prior fauna candidates remain inactive. User-requested hourly report cadence and sprint deadline remain in effect.

## Ownership, rollback and publication

New E: build/evidence and TEMP roots end reactor-tow-preview-20261007-51c8d9e2. Root ownership and parents checked non-reparse; free space checked before building. This local candidate, source/rollback checkpoint, QA and new video are required continuation artifacts. Inherited build/temp directories and previously rejected cleanup paths are untouched. No shared cache cleanup.

Product files changed this increment: game/ReactorTow.js(new), game/ConvoySurprises.js, game/ArcadeFirstLight.js, managers/ArcadeFirstLightDirector.js, effects/ReactorTowVisual.js(new), effects/ConvoySurpriseVisual.js, effects/ArcadeFirstLightVisual.js, config/EncounterEvolutionTest.js, i18n/reactorTowText.js(new), i18n/firstLightText.js. New five focused runtime/model/layout/performance/capture scripts; review, HANDOFF, sprint and progress notes. Preserve all inherited changes in these files. Steamworks settings, public, Cloud and player data were untouched; no deployment performed. Narrow rollback patch/check and final cleanup/Git/email receipt are recorded at completion below.

Final Git:63 tracked modifications/388 untracked individual files, same branch/HEAD/no upstream. Narrow runtime reverse dry-run passed, not applied: git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/reactor-tow-preview-20261007-51c8d9e2/reactor-runtime.patch. It covers only this increment's edits to seven existing files and preserves inherited work; new inert modules/evidence are not deleted. Actual reversal needs an explicit request and a fresh check before removing --check. Never reset HEAD.

Current local web candidate/QA/preview/source checkpoints retained. The owned compiled server4988/PID6540 was stopped and confirmed absent; existing4983–4987 servers untouched. Recursive removal of this job's two compiler-cache TEMP children was **rejected before execution** with only `blocked by policy`, no more specific reason/reviewer. No deletion or alternate route/escalation attempted. Retained: E:/Codex/tmp/reactor-tow-preview-20261007-51c8d9e2/node-compile and node-compile-cache. All earlier blocked paths and inherited build/temp folders remain untouched. Exact receipt: cleanup.json and verification.json under this E: job.
