# Nova Swarm visual life and opening polish — October 1, 2026

## Changes in this increment

This continues the existing dirty repository without discarding prior encounter, Orbit, controller, localization, scoring or result-screen work. Exact path: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`; branch `codex/sector-leaderboard-unknown-20260928`; baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`. No branch/worktree switch, reset, clean, stash, pull, commit or push.

### 120 explosion animations

Twelve structural families each have ten motion/timing choreographies: corona, split fuel, lance, vortex, collapse, chain reaction, petals, ring peel, crescent, geyser, double core and shrapnel. Fuse walks, staggered ignition, inward collapse, recoil, curved travel, satellite cores, rebounds, braids, fallout and counterpulses alter motion and topology. Tests find 120 distinct traces independently of tint and overall rotation. These are **120 procedural animations sharing a prewarmed combustion atlas**, not 120 separately painted flipbooks.

Boss deaths use staged lobes, an exposed reactor rupture, shaded smoke rollover and hot ballistic fragments. Ordinary kills use compact versions; rival kill feedback now uses the same combustion language. Convoy rescue retains its non-kill cue. Existing whole-hull breakup and legacy particles remain. Deduplication prevents one boss death's component callbacks from piling up unrelated overlapping fireballs.

The pool is capped at 18 displays; ordinary events retire within 0.8 seconds and boss events within 2 seconds. Sixteen lobe slots, four smoke puffs and twelve ember slots are reused per display. Cached optics and smoke are prewarmed. No per-frame canvas generation, new filters or combat diagnostics. Flash Intensity and Reduced Motion update during active effects; Flash0 removes reactor/ember spikes and uses later, dimmer combustion frames. Reduced Motion limits travel and uses a static planet tableau.

### 48 harmless planetary spectacles

Every existing world gets its own authored composition and story. They reuse original cached miniatures with directional shading, seams, scratched metal, windows and recognizable silhouettes. Examples: whale commuters, orbital laundry, moon curling, meteor bowling, volcanic tea service, saucer photobomb, moon fishing, kite club, goose crossing, robot pit stop, turtle race, clockwork and egg hatching.

At most six actors and three fine cables exist. Each spectacle plays, then leaves a quiet interval. Existing world changes every five sectors remain; Sector51 uses world11, and the 48-world cycle repeats at Sector241. Actors stay behind combat, below the HUD, and dim during warning/boss/pressure windows. They have no colliders, targets, rewards, wave gate, progression or save state. Cabinet Wonders retain their established harmless role.

Initial timing is a **tuning hypothesis**: start four seconds after that world becomes active, fade over two seconds, present for 19–22 seconds, period42–60 seconds. This changes no hostile encounter percentage or ranked selection. Cosmetic paths and explosion selection do not consume gameplay RNG.

### 21 new ElevenLabs sounds

Generated once through the existing authorized ElevenLabs account: twelve ordinary destruction families, three boss collapses and six occasional planet-life cues. Mastered mono44.1kHz/16-bit WAVs, controlled peaks, short tails, no speech/music or runtime generation. Original MP3 sources, prompts and hashes are retained locally for reproducibility. Existing creature voices, warning identities and authored encounter sounds remain.

Audio routing retains legacy variant-bag and pitch RNG draws before choosing the cosmetic source. A matched real-controller test counted48 draws in both baseline and candidate. Planet playback explicitly preserves gameplay RNG. Planet cues have priority1, quiet gain, bounded cooldown, one cue per presentation, no cue during warnings and stop on pause/retry. Existing warning ducking/mute rules remain.

Receipt: `docs/audio/visual-life-20261001.json`. Provider-reported generation-time remaining quota was5,280; a later fresh check reported5,034 remaining (`audio-quota-final.json`). No quota exhaustion. The estimated request credits and subscription-counter delta are recorded separately and are not a monetary billing claim. Human listening is still required.

### Opening and forum continuity

The new destruction feedback and first-world scene are available from the earliest run. The existing opening convoy/rescue/Rival sequence is preserved and its discontinuous warning/retreat/departure was repaired after reviewing the reported clip. No extra threats were stacked onto the first minutes to manufacture spectacle.

An actual180-second finite-life keyboard/autofire prototype reached Sector2, rescued both fighters, saw their one earned return and remained playable. Starting damage1.05, three lives; no script granting invulnerability, kills, lives, spawns, skips or score. Rival appeared near99 wall seconds; recorded samples reached14,354 score and two lives by175 seconds. Inputs, seed, relevant state and simulation timing are retained: matching seed alone does not reproduce a run. This is an automated observed run, **not proof that the opening is fun or optimally balanced**.

## Verification and delivery

Current local root: `E:\Codex\builds\nova-swarm\visual-life`. Static `current`; packaged executable `win-unpacked\Nova Swarm.exe` is created only from this verified candidate. Version **v2026-10-01_11-57-51**; entry `assets/index-CWnwrQi7.js`, SHA256 `3931eac145905c63eb9cec6b960252024b28ea2a62a22646a24a3b32ec0d5fc0`.

Completed targeted checks:120 trace uniqueness/finite bounds,48 scenes/sector boundaries, all21 WAVs/catalog/routing, actual Pixi pool stress peak18 with stable pool, exactly one boss callback, finite cleanup, mid-effect accessibility, real audio RNG parity/warning identity, cue deferral/exact-once consumption, pause/draft/focus freeze, pause sound stop and old root destruction on retry. Full build/release-line/i18n and Steam bridge pass. Final package, compiled UI/controller/smoke, actual death footage, matched performance tails and upload receipts are appended below after verification.

The existing Vite large-bundle/import advisories remain. The source-only natural-test route is deliberately unavailable in production builds; the opening harness correctly rejected a production URL before a protected source-server repeat. No forced encounter is allowed to submit ranked scores or production progression.

## Exact local instructions

From the established repository, verify E: resolved paths and available space before intensive commands. Do not use the source `dist` junction.

```powershell
$env:TEMP='E:\Codex\tmp\nova-visual-life'
$env:TMP=$env:TEMP
$env:npm_config_cache='E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-visual-life'
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null
npm run check:release-line
npm run check:i18n
npm run build:current -- --outDir E:\Codex\builds\nova-swarm\visual-life\current --emptyOutDir
```

For local source-only practice, run `npx vite --host 127.0.0.1 --port 4932 --strictPort`. Open `http://127.0.0.1:4932/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`. This route isolates progression and submissions. `molt`, `payback`, `orbit-breaker`, `breach` and `reassembly` replace `natural` for isolated inherited mechanic fixtures. Never use production progress as a debug baseline.

```powershell
$env:CHECK_URL='http://127.0.0.1:4932'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\visual-life\evidence\runtime'
node scripts/check-visual-life.mjs
node scripts/check-visual-life-runtime.mjs
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\visual-life\evidence\lifecycle'
node scripts/check-visual-life-lifecycle.mjs
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\visual-life\evidence\opening'
node scripts/playtest-opening.mjs
```

For actual death capture use `scripts/astra-detonation-review.mjs` with a separate E: output. For compiled smoke/i18n/controller set `SMOKE_URL`, `I18N_UI_URL`, `CHECK_URL` to the production preview, and the corresponding `SMOKE_OUTPUT_DIR`, `I18N_UI_OUTPUT_DIR`, `CHECK_OUTPUT_DIR` to separate owned E: paths. Run `npm run smoke`, `npm run check:i18n-ui`, `npm run check:controller-flow` serially. Source-only module fixtures require the source server; they cannot import `/src` from a compiled preview.

Performance harness: `scripts/measure-visual-life-builds.mjs`, `BASELINE_URL` and `CANDIDATE_URL` point to verified production previews, `CHECK_OUTPUT_DIR` to an owned E: directory. It checks equal seeded state, inputs, clocks, viewport and breach layout, with320 hostile shots, local sparks, six ordinary detonations every24 frames and one boss detonation every180 frames. It updates normal backdrops, honoring actual boss suppression, and reports CPU/render-gap p95/p99/max rather than FPS alone. Hardware and long-session transitions still need manual QA.

Audio regeneration is paid and is **not part of routine testing**. Do not rerun generation to verify an existing asset; use `check-visual-life-audio.mjs`. The generator checks quota, uses a bounded credit ceiling and does not automatically retry paid requests.

## Tuning and changed files

- `ExplosionChoreography.js`: structural families, motion, ignition and bounded lifetime.
- `AstraDetonation.js`: sizes, opacity, lobe/smoke/ember counts, pool and accessibility.
- `PlanetVignettes.js` config:48 rows, paths, sizes, introduction and quiet intervals.
- `PlanetVignetteArt.js`: cached original miniature materials and silhouettes.
- `PlanetVignettes.js` effect / `PlayScene.js`: prewarm, background ownership, pressure and cue/cleanup integration.
- `VisualLifeSounds.js`, `SoundCatalog.js`, `AudioManager.js`, `assetManifest.js`:21 sound files, low-priority planetary mix and existing destruction routing.
- `ArcadeFirstLightDirector.js`/`ArcadeFirstLightVisual.js`: warning distinction, continuous approach/exit and rival kill combustion.
- Focused visual/audio/lifecycle/opening/performance/continuity scripts; two existing explosion QA harnesses and notification-output/layout harness; build metadata, notes and quoted forum drafts.

Exact46 source/public paths and before/current hashes are in `source-state.json`; the patch includes new WAVs and preserves inherited changes. Documentation is intentionally excluded from rollback.

## Balance and remaining human checks

Health, damage, hostile selection, controls, wave gates, save schema, achievements, leaderboard IDs and scoring formulas are unchanged in this visual/audio pass. Legacy particle allocation and RNG calls remain. Backgrounds grant no XP, drops, score or grazes. Convoy continuity changes when physical lanes/targets are visible and therefore can change opportunity despite unchanged formulas. No hidden global compensation or board reset.

No new player-facing strings were added, and no known untranslated text was introduced. Older translation/native-speaker limitations remain in the previous report. Steam public/default, Steamworks settings and production player data must remain unchanged during the authorized private test upload.

Human checklist:

1. First minute: can you immediately read enemy fire, your ship, rescue locks and pickups while noticing the background story?
2. First/third sighting: are twelve explosion families meaningfully recognizable, and do repeated deaths still have weight without hiding hostile shots?
3. Boss death: does the hull rupture feel layered and substantial, with a readable return to ordinary combat?
4. Rescue and return: do approach/retreat/late rescue stay continuous; do you recognize SWIFT/MERLIN and choose how to exploit the opening?
5. Sound at normal volume: sharpness, bass weight, fatigue, priorities and disabled-voice comprehension; headphones and speakers.
6. Reduced Motion/Flash0, pause/resume, draft, focus loss, retry, supported resolutions, physical controller and all eight languages.
7. Several natural runs at early/51/deep entry: pacing, droughts, third-sighting interest, scoring opportunity and hardware frame-time tails.
8. Installed Steam test branch: unchanged save/Cloud/profile/leaderboard identity. Fresh-profile local smoke does not certify online identity.

## Rollback review

```powershell
git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/visual-life/rollback.patch
```

This review passed without applying. An actual reversal requires explicit user instruction and review against any later work. Never reset HEAD. Prior private build25646684 remains the test-branch rollback reference; no rollback is performed.

## Final local verification

Full production build passed in6m50s. Final compiled browser smoke: zero console warnings/errors, page errors or bad responses. Eight-language UI: zero placeholder/English-leak hits and renderer errors. Controller-only flow passed. Steam bridge and release-line gates passed. Existing encounter pure checks and nine actual evolution groups passed again, including plate/projectile ownership/build interactions, exactly-once rewards, expiry/reset, early eligibility and Sector51 policy. Fifty convoy continuity groups passed on the final source. No source change was made to health/scoring or player input in this visual/audio increment.

Actual death capture now checks the selected hull type: the tested colossus split all three authored panels immediately; ordinary whole-hull mesh regression checks all eight pieces and preserved transforms. Both visual flame and hull debris retire; actual death footage and ordinary/player death images were inspected. The capture harness uses the source-only prototype policy and verifies all production permissions disabled. Corrected an obsolete eight-pieces-for-every-boss assumption rather than changing the existing colossus lifecycle.

Package:15,556 payload files and4,520 retained native files checked. `app.asar` SHA256 `91c6fdc277cce6ee5ffd5aa243b419ad76994215b97b44ed90f9bff25d2af022`, bytes2,228,300,592. Actual packaged executable smoke passed with expected version, ready menu, API200 and zero console events. The fresh profile deliberately isolates Steam IPC, achievements, saves/Cloud and submissions; installed online identity is not claimed tested. The native runtime matches the last delivered quality-repair package.

Matched sequential headless Chrome performance, same1280x720 fixture/seed/state/inputs/clocks/diagonal breach/320 shots/capped visual requests:

| Measurement | Previous forum candidate | Current candidate |
|---|---:|---:|
| CPU p50 |5.8ms|7.0ms|
| CPU p95 |10.0ms|12.4ms|
| CPU p99 |15.3ms|18.4ms|
| CPU maximum |18.4ms|20.7ms|
| Render-gap p99 |17.3ms|17.2ms|
| Render-gap maximum |17.4ms|17.2ms|
| Render gaps over50ms |0|0|

The added animation costs CPU; this is not a performance improvement claim. The measured render tails stayed bounded in this fixture. Headless timing does not establish performance on every GPU or during long sessions/world transitions.

Evidence retained under the local output root: `evidence/opening/opening-playthrough.webm`, `evidence/opening/report.json` (inputs/relevant state), `evidence/death/boss-death-review.webm`, actual images, runtime/lifecycle/audio/continuity/evolution/smoke/i18n/controller/native reports, `evidence/performance/report.json`. No combat HUD clutter or network telemetry was added.

## Verified Steam test delivery

Uploaded App4765070 / Windows depot4765071 to existing **sector-continue-test** only: **BuildID25650189**, depot manifest **4046387036714204723**, version **v2026-10-01_11-57-51**. Fresh authenticated before/after app info confirms public/default25579437, other test-build23782673 and Cloud hash `2baeb1acdb90a31ddae4f907711cc6d4ba9bb4724500617046036c93c41d334f` unchanged. No store/media/forum publication by this agent, Steamworks settings change or player-data reset. No Git publication.

Steam > Nova Swarm > Properties > Betas > **sector-continue-test**; let the update finish and verify the version. Cached SteamCMD login can sign out the desktop client; reconnect if needed. This is a private test-branch delivery, not a public promotion. `delivery.json` supersedes the package helper's earlier local-only delivery fields; app/depot build logs, VDF, depot manifest and before/after receipts are retained.

## Cleanup and repository state

Resolved-root/ancestor/descendant reparse, active-task/process and exclusive-lock audits passed before removal. Removed this task's packaging/temp trees, private Vite caches, completed forum comparison static build, SteamPipe staging, isolated native test profile, two superseded death videos and nine intermediate clip frames. The accidental task-owned D: notification output was removed only after its E: replacement passed. All exact paths are in `cleanup-audit.json` / `cleanup-result.json` and were verified absent. E: free approximately288.95GiB at cleanup; another active game task has no owned-path overlap.

Retained the current visual-life static/package, explicitly required prior quality-repair rollback build25646684, minimal dirty/source checkpoints and source-only rollback/reproduction helpers, unique paid audio originals/final assets, required clip/contact sheet, current playthrough/death/renderer/UI/performance evidence and Steam delivery receipts. Shared caches/application state/unrelated inherited work and earlier tasks' automatic-review-rejected cleanup targets were not touched or retried. No cleanup for this increment remains blocked.

Final cumulative56 tracked modifications/110 untracked paths, same branch/HEAD.46 exact source/public hashes and delivered app.asar rechecked; reverse patch review and process-local CR-at-EOL-aware whitespace check pass. Existing Windows EOL advisories remain; no Git configuration was changed or inherited files deliberately reformatted.

Complete change report emailed from/to personal cromkake@gmail.com, connector-confirmed SENT/INBOX message1a0f71b5e7bb35dd. Includes full46-file inventory and both visual/forum reports. Local email-receipt.json retained.
