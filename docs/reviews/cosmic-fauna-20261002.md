# Cosmic fauna — all42 delivered to the private Steam test branch

## Verified delivery: 2026-10-02 20:07 Oslo

App4765070 / Windows depot4765071 / **sector-continue-test Build25683581**, manifest **2117634921635676724**, version **v2026-10-02_19-32-17**. SteamCMD success at18:07:35UTC and authenticated app-info at18:08:16.587UTC agree. Public25671489, other test-build23782673, unrelated manifests and Cloud SHA2562baeb1acdb90a31ddae4f907711cc6d4ba9bb4724500617046036c93c41d334f remained unchanged. No public promotion, Steamworks configuration changes, player resets, forum posts or additional email. Earlier sections below are historical checkpoints.

Delivered: all42 individually illustrated background animals, all42 anatomy-specific mesh motions and separate ElevenLabs recordings, bounded ordinary-combat scheduling and lifecycle, warning/accessibility suppression, and the one-line idle explosion-carrier visibility fix. No new gameplay targets, rewards, score sources, localization strings or save schema. Eight of67 playable surprise contacts remain implemented; these decorative animals do not count toward the remaining59.

Current retained static output is `E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0/release-fixed`; native executable is `win-unpacked/Nova Swarm.exe` under the same root. Entry assets/index-BUETGZwh.js SHA25653fbfaf62519df3c59da63b01d1548667c599bf427c8385f070d4d47d0929d8a; app.asar SHA2568cd6225a83cf1172a6cb24bf79c8954269cb53f937fdf9cd5b3da17377b25d5d. Exact582 source/native/changed-public hashes,146 built public files,15652 payload files and4520 native files verified. `delivery.json` and `steam-before.json`/`steam-after.json` are the authoritative receipts. `current` is an old three-entry prototype and `release-current` predates the idle-pool fix; neither is the current deliverable.

Final gates passed: fresh release-line, full build:current (7m22s), i18n, default42 asset gate,551-vertex/48-pose anatomical checks, clock/eligibility/no-repeat/ownership tests, actual all42 source lifecycle, final compiled43-passage/five-layout soak, compiled smoke, eight-language UI, controller flow, Steam Electron bridge, native package structure, actual isolated native smoke and keyboard/gamepad movement/fire/pause. Final soak also asserts idle explosion carriers remain invisible. Expired fauna resources are released and score/lives unchanged. Full build/native/release evidence is retained under fixed-soak, fixed-smoke, release-i18n, release-controller, pool-visibility-final, pool-delivered-parity and native logs. Historical ParticleManager comparison still fails as explained below; the explicitly verified delivered25675532 snapshot passes every parity assertion.

Matched compiled pressure comparisons, both target orders,1280x720,160 shots, capped explosions and fully visible Lantern Medusa: CPU p99 baseline8.8ms both times, candidate8.5/9.5ms; RAF p99 baseline17.3ms, candidate17.3/17.4ms, zero frames>50ms. Final isolated43-passage admission p95/p99/max9.6/12.1/12.1ms; render p95/p99/max4.8/5.9/35.8ms. CPU variability and short fixtures do not establish universal speedup or stutter-free hardware performance. Natural180s finite-life run observed one creature around45s and reached Sector2; it does not establish population frequency or fun.

### Exact local checks and tuning

Run from the established D: repository. Set process-local TEMP and TMP to the existing owned `E:/Codex/tmp/cosmic-fauna-20261002-451b6ea0`, npm cache to `E:/dev-cache/npm`, and `NOVA_SWARM_VITE_CACHE_DIR` to `E:/dev-cache/vite/cosmic-fauna-451b6ea0`. Verify resolved paths before disk-intensive commands. Source server: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4973 --strictPort`; final static server: `node E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0/serve-fixed.cjs` (port4976). Do not start duplicate listeners.

```powershell
node scripts/check-cosmic-fauna.mjs
node scripts/check-cosmic-fauna-anatomy.mjs
node scripts/check-cosmic-fauna-ownership.mjs
# Default42 required; omit FAUNA_EXPECTED_COUNT.
node scripts/check-cosmic-fauna-assets.mjs
$env:CHECK_URL='http://127.0.0.1:4973'
$env:CHECK_OUTPUT_DIR='E:/Codex/builds/nova-swarm/<new-owned-evidence-directory>'
node scripts/check-cosmic-fauna-runtime.mjs
node scripts/check-detonation-pool-visibility.mjs
$env:ASTRA_PARTICLE_BASELINE_FILE='E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0/source-before/src/effects/ParticleManager.js'
node scripts/check-astra-detonation.mjs
$env:CHECK_URL='http://127.0.0.1:4976'
$env:FAUNA_COMPILED='1'
node scripts/check-cosmic-fauna-passage-soak.mjs
```

For a future build, choose a fresh owned E: output and version; run `npm run check:release-line`, `npm run check:i18n`, `npm run build:current -- --outDir <verified-new-E-output>`, and applicable compiled/localization/native gates. The completed `build-fixed.ps1`, `check-fixed-release.ps1`, `check-native-release.ps1` and reproduction helpers retain exact invocation/environment details. Build scripts deliberately refuse to overwrite existing output. Never package the inherited dist junction or bypass gates to meet the timer. Tuning is in CosmicFaunaCatalog.js, CosmicFaunaMotion.js and CosmicFauna.js; the pool fix is in AstraDetonation.js. Source integration/manifest,84 art/audio assets and focused tests are captured by source-checkpoint-42.json.

Human checks remain: first-sighting harmlessness and hostile-shot readability; third-sighting interest; frequency across finite-life Pure/Tactical/Sector51 runs; speakers/headphones; long sessions/target hardware and installed Steam online identity. The inherited390px portrait score/lives overlap and older native-speaker localization backlog remain open. No new untranslated strings. Full42 local370s video contains actual game audio but predates the corner-ring fix; it has not been emailed again. Latest measured ElevenLabs quota3947/10000 remaining, no further generation in this delivery.

### Repository, preservation and continuation

Same branch `codex/sector-leaderboard-unknown-20260928`, HEAD/baseline `7e8325e3d9abb09357636bca7e994c0227be02d6`, no upstream, inherited dirty work preserved. No branch/worktree switch, reset, clean, stash, pull, commit or push. Review-only rollback check (never applied): `git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0/runtime-integration.patch`. Actual reversal requires reviewing subsequent edits; the patch preserves unique assets and unrelated work.

On the October3 continuation the user still holds existing build/temp cleanup. Existing release-current, package-source and native-profile are consequently retained, along with current release-fixed/native deliverable, original assets/audio, comparisons and evidence. No inherited directory was removed. Goal service reports `usageLimited`, not active; the heartbeat can request a new bounded continuation, but the agent cannot override that limit. Updated the stale heartbeat to reference the verified25683581 receipt. Next development priority is the existing bosses' animation and menace, then planetary weather and the remaining59 interactive contacts. No unchanged upload is made merely to meet the next six-hour slot.

## Historical checkpoint: full42 source catalog before release

### Release verification and an observed rendering fix

The first complete build v2026-10-02_18-57-34 compiled in7m52s, entry assets/index-DWTJ1BRy.js (SHA256ffdad15dc03abd1c91e446de5846a2511ac6b3c9748432de244e8209d5df9c93).582 exact source/native/changed-public files and146 built public assets matched. A new receipt helper initially missed the normal `./assets/` HTML path; only that parser was corrected, then the full hash check passed. No production loader change.

Three minutes of ordinary finite-life source play reached Sector2/score13,310/two lives with no page errors; no forced kills, spawns, invulnerability or granted score. Astral Cobra was first sampled at45.969s, age0.783s. One passage occurred in that run; this is an observation, not a population frequency estimate. Source development routes intentionally do not activate in a compiled build: the first attempted compiled natural fixture stopped on its safety assertion. Natural observation therefore used the existing progression-free source route, while compiled all42 checks used the existing trusted test preset with all production permissions disabled before starting. No production test route was broadened.

Compiled43-passage/five-layout soak passes (42 unique before repeat), all resources released, zero errors. Admission CPU p95/p99/max9.8/16.4/16.4ms; isolated render p95/p99/max4.7/5.5/29.8ms, zero>50ms. Compiled smoke, eight-language UI and controller-only checks pass. Official skill-client keyboard bursts and images were inspected. English HUD, German pause and Japanese settings are readable at1280x720. The390px score/lives overlap is also present in the retained pre-fauna rescue-batch compiled smoke, so it is an inherited portrait-layout issue; it remains a follow-up, not a claim of clean mobile UI.

Actual natural footage revealed a bright ring/plume stuck at the upper-left corner. The targeted real-renderer test reproduced18 visible idle explosion carriers with zero active explosions; the effect was not part of the planet art. `AstraDetonation.createDisplay` now initializes carriers hidden; normal `emit` reveals them as before. Red/green screenshots and reports prove zero idle carriers, visible active boss/ordinary effects and hidden expiry/clear, with the18-carrier cap unchanged. This one-line source fix requires a new release-fixed build before upload. The earlier full42 video predates this fix.

The older detonation parity script compared against Git682264e and failed because that historical ParticleManager predates already-delivered effects changes. Current ParticleManager SHA2563c595a6598a29ae7b6a5b6880814cc7ed58e7254b741bc14ee6688884536fa55 exactly matches the verified source receipt for Steam25675532. An optional `ASTRA_PARTICLE_BASELINE_FILE` now supports that explicitly identified delivered snapshot, preserving all assertions and the default historical comparison. Against the delivered baseline, exact RNG/particle/allocator/retirement parity passes; detonation/hull effects consume zero additional gameplay RNG, duplicate boss event remains one, accessibility/expiry and transformed hull fragments pass. The historical mismatch is retained in pool-parity.log; it is not concealed as a passing historical comparison. Current-release proof is pool-delivered-parity/report.json with the selected baseline path.

All42 production identities have their own inspected built-in imagegen RGBA artwork, ElevenLabs source/master and anatomy-specific mesh motion. Added30 after the12-entry checkpoint in production batches3–5. Prompts, selected original paths, hashes and alpha inspections are in the production/art provenance documents; paid audio sources and per-request receipts are retained on E:. Targeted imagegen edits repaired visibly cut-off salamander gill, shark dorsal and drake fin tips; full edit provenance is preserved. These are animated textured meshes, not painted frame sequences or skeletal3D models.

Verified: default42-entry asset/manifest/audio gate without count override; 48 poses per anatomy on551 vertices with finite coordinates, bounded displacement, non-inverted triangles, distinct motion traces and exact stationary Reduced Motion. Added fixed samples for centipede ribs, urchin core, iron bell, drake armor, scallop valves, stag crown, isopod plates, shrimp crown, coral ridges, hammerhead head and sailfish bill. Unknown anatomy fails explicitly. Latest minimum signed triangle area0.0001215176 and maximum normalized displacement0.0825000. Actual source Chrome rendered all42 with zero additional gameplay RNG/score, no page errors, and passing pause/focus/draft/Reduced Motion/Flash0/ordinary and frozen warning/retry isolation.

The new sequential soak visits all42 in one real cosmetic bag and then the first repeat (43 passages), rotating1280x720,1280x800,1024x768,2560x1080 and390x844 viewports. Every expiry leaves zero active fauna displays and releases owned mesh, texture, bitmap and audio; private bitmap width becomes0, sound src is cleared, no score/lives change. Trace stays capped. Mid-passage bounds fit vertically. Isolated admission CPU p95/p99/max7.9/12.7/12.7ms; 516 isolated render samples p95/p99/max4/5.1/34.3ms, zero>50ms. This is not a matched whole-game or target-hardware performance claim. First soak attempts failed when an asynchronous game transition changed the test's interwave state while decoding (index4, next present but not prepared, stateWAVE_ACTIVE); the fixture now reestablishes its isolated state after decode. Production scheduling was not weakened.

All30 new runtime screenshots were opened and inspected. The portrait fixture also exposes a cramped/overlapping existing score/lives HUD; fauna itself stays in the letterboxed combat region. Do not claim the whole portrait HUD is visually clean. Desktop/Steam Deck/ultrawide fauna bounds are verified; full UI regression and comparison against the previous build remain a release check.

Fresh ElevenLabs read at2026-10-02T16:38:22Z:6053/10000 used,3947 remaining. Immediate counters lag (batch4 initially reported zero delta; batch5 later settled). No blind paid retry or quota overrun; all42 source requests have receipts and unique master hashes. Mastering peaks remain below−5dBFS; human listening and distraction judgement are still manual.

Evidence root remains E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0: batch3/4 runtime+validation, full-validation, full-runtime, full-soak-final. Full42 controlled recording is complete: full-preview/cosmic-fauna-42-med-spilllyd.mp4,370.166667s,1280x792 H.264/AAC,90,329,319bytes,SHA256539a3c012e45fe36ed54ec840fb39ae7c1ca974b0e00ae4bf178eadb0a6c2f33. All42 actual game cue events are present; zero page errors; full decode exit0. The video was shown locally, not emailed again. **Existing compiled current/checkpoint.json is the earlier3-entry comparison. A fresh full42 release-current build is in progress (v2026-10-02_18-57-34); natural observation, matched compiled frame tails, native packaging and authenticated Steam verification are pending. Last verified private build stays25675532.** No new strings, settings, score formulas, HP, progression schema, Steam/public promotion or email operation in the fauna expansion. The requested earlier gameplay video email was separately verified SENT/INBOX and was not sent again.

Current source commands use the same E: TEMP/TMP/cache and CHECK_URL below. Run check-cosmic-fauna-assets.mjs with no FAUNA_EXPECTED_COUNT override, plus check-cosmic-fauna-anatomy.mjs, check-cosmic-fauna.mjs, check-cosmic-fauna-ownership.mjs, check-cosmic-fauna-runtime.mjs and check-cosmic-fauna-passage-soak.mjs. Capture helper defaults to all42; optional FAUNA_CLIP_SECONDS=8 gives a bounded full-catalog motion/audio preview. Historical smaller-count instructions below apply only to those old milestones.

## Historical checkpoint: nine additional animals

Added Glassjaw Leviathan, Ember Cuttle, Crown Nautilus, Mourning Swan, Abyssal Ribbon, Bloom Kraken, Polar Seahorse, Velvet Angel and Cinderback Turtle. Each has separate built-in imagegen art, full prompt/hash/alpha provenance, one individually requested ElevenLabs source/master and an authored motion profile. Production briefs: `docs/cosmic-fauna-production-batch2.json`; artwork: `public/art/cosmic-fauna`; masters: `public/audio/sfx/cosmic-fauna`. Existing originals and paid sources are preserved.30 remain; this is not the completed42 set.

The new profiles include rigid shell interiors with independently moving limbs, a delayed fluke stroke, mantle/fin waves, opening arms, neck/sail drift, a traveling ribbon wave and curling tail/gill movement. Full-cycle tests cover all12 on the actual551-vertex grid: finite positions, maximum normalized displacement0.0826, no inverted triangles (minimum signed area0.0001215), exact stationary Reduced Motion, and fixed nautilus/turtle shell samples. The rigid-shell assertion failed on the old generic fin motion and passed after anatomy integration.

Actual source Chrome rendered all12 with zero added gameplay RNG or score changes and zero page errors. Pause, focus loss, draft, Reduced Motion/Flash0, ordinary/frozen warning suppression and retry/resource ownership passed. Inspected output revealed tall animals clipped at the top; the new screen-bounds assertion reproduced it (first ray top−55.40px). Aspect-aware66%-height fitting and a12%-height stroke margin now keep all12 mid-passage mesh bounds inside720px. Post-fix top47.84–82.05px and bottom559.85–601.15px. Hostile-pressure/warning dimming remains unchanged. These controlled screenshots do not establish natural-run distraction or frequency.

Evidence under `E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0`: `batch2-validation/asset-validation.json`, pre-fit `batch2-runtime`, final `batch2-layout`, and `batch2-preview`. Latest controlled video `batch2-preview/cosmic-fauna-nine.mp4`:84.207s,1280x792,H.264/AAC,26,583,421bytes,SHA2564fe1be5873c232f37c6218255e1e98cb7ce086c76cd5c54d940708bf1b13bb28. All nine cues actually routed into MediaRecorder; all nine sound events and no page errors. Full MP4 decoding passed. Captions identify nine-of42 controlled local footage; no production progress/submission. Capture-only initialization now explicitly calls the existing idempotent AudioManager.init before using its context, fixing an observed null-context fixture failure. In-game audio initialization is unchanged.

Fresh delayed ElevenLabs count:5340/10000 used,4660 remaining, versus5117 before this batch. Immediate count lagged again. Nine successful paid sources retained with requests/hashes; no retries. Authored batch reserve1800 using conservative duration estimates; generator now writes a request-attempt ledger before contacting the provider and refuses a paid retry when an outcome is unknown. All12 audio files have distinct hashes, finite3–6s PCM44100Hz mono16-bit data, peaks below−5dBFS and non-silent energy. Listening/artistic quality still needs human judgement.

Read-only `git fetch --dry-run --no-write-fetch-head origin` now completed with exit0; no fetch ref write/pull or branch change. Same baseline/branch, no upstream. No new localization strings. No new compiled/native build, Steam upload, forum or email operation in this expansion. The `current` compiled comparison and historical checkpoint below still describe the first three; do not claim they include these nine. Fresh full42 release, packaged/native, layout/admission/performance/soak checks remain required. Current Steam private build remains25675532.

Source commands: run `node scripts/check-cosmic-fauna-anatomy.mjs`, `node scripts/check-cosmic-fauna.mjs`, `node scripts/check-cosmic-fauna-ownership.mjs`; set `FAUNA_EXPECTED_COUNT=12` for the explicit local asset milestone. Default remains42 and must pass without override before release. Runtime helper now reads every registered catalog entry. Capture helper accepts `FAUNA_CAPTURE_IDS` (comma-separated registered IDs) and `FAUNA_CLIP_SECONDS` (8–15); default captures all registered entries. Use fresh owned E: output folders and the same E: TEMP/TMP rules below.

## Historical first-three milestone and compiled comparison

## Scope and identity

Established checkout: D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920. Branch `codex/sector-leaderboard-unknown-20260928`, baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`, no upstream. The inherited dirty tree is preserved. A read-only fetch dry run did not finish and was cancelled; remote freshness is unverified. No directory/branch/worktree switch, reset, clean, stash, pull, commit or push. Execution and review are serial, respecting the user's autonomous workflow and same-directory agent restriction.

Latest verified Steam delivery remains private Build25675532 / manifest2141408636682790097. This prototype is not uploaded. Steamworks, production progress, Cloud and leaderboard configuration are untouched. The requested earlier video email was already delivered; this prototype has not been emailed again.

## Implemented in this milestone

- Cathedral Ray: arched bone ribs, flexible opal fins and paired trailing tails; rooted fin strokes and tail lag; resonant organic moan/bone/wing recording.
- Lantern Medusa: translucent bell, amber organs, layered mantle and long tentacle curtain; bell pulse and phase-lagged tentacle waves; liquid lung/crystalline throat recording.
- Obsidian Mantis: dark articulated armor, sickle forelimbs and emerald sails; separate limb and abdomen-sail deformation; chitin/joint/predatory breath recording.

Three separately generated RGBA images, three distinct ElevenLabs sources and masters. Prompts, hashes and provider receipts are in the art provenance and audio documents. These are animated textured meshes, not frame-by-frame painted animation or 3D skeletal models. There are **39 remaining animals**, not 42 completed entries.

One owned backdrop layer, one current creature plus one prepared next slot, 551 vertices each. The draw order is behind all combat objects and HUD. Textures are privately owned, bypass shared Pixi cache and release their image bitmaps/geometry/audio. Late decode and upload teardown are explicitly handled. No targets, colliders, reward calls, gameplay RNG draws, profile-history selection, discovery grants, notifications or new save schema.

Initial pacing hypotheses: first admission after 24 seconds of eligible ordinary combat; 28/30/32-second passages; 70–110 ordinary combat seconds between passages. All catalog entries occur once per local deterministic bag cycle. The existing run seed is read without consuming its generator. Asset readiness and safe presentation still gate admission. GPU preparation waits for introduction/interwave gaps; a missing asset skips presentation rather than affecting the run.

Boss gates, bosses/snakes, major warnings, Cabinet Wonders, rescue/rival activity, returning allies and high projectile density suppress new appearances and dim active ones. Actual pause/focus loss freezes motion and stops the cue; draft/interlude hides the layer. Reduced Motion gives a stationary, softly faded composition; Flash Intensity reduces brightness. Sounds respect master/SFX mute and warning priorities, play once and do not restart on resume. No gameplay string was added; existing localization backlog is unchanged.

## Evidence and fixes

Owned E: root: `E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0`; TEMP/TMP: corresponding folder under `E:/Codex/tmp`; Vite cache: `E:/dev-cache/vite/cosmic-fauna-451b6ea0`. Existing output preservation hold remains in force.

- Pure clock/motion tests: bounded admission/lifetime, no immediate repeat, deterministic order, paused/busy recovery, no RNG, reduced movement and warning exclusions.
- Ownership regression reproduced premature destruction of an in-flight upload source; fixed deferred release, verified retired decode/upload cleanup.
- Actual Chrome runtime: all three animate; zero additional RNG draws or score changes; pause/focus/draft/Reduced Motion/Flash0/warning/death-retry ownership tested. Three screenshots inspected. Source-runtime mesh update p99 around 0.2–0.3ms is a narrow component measurement, not a whole-game performance claim.
- A 180-second finite-life keyboard run reached Sector2, 13,285 at the last sample, two lives. First creature arrived around43 seconds. Its screenshot exposed a missed `BOSS_GATE` exclusion. A second independent regression also reproduced failure to dim when a warning freezes the combat clock. Both are fixed and have red/green tests.
- A subsequent90-second finite-life run reached Sector2 with three lives and 4,503 at the last sample. At57 seconds the actual `BOSS_GATE` sample has creature alpha0.04000003 versus0.58 before the fix; actual screenshot inspected. No forced creature/encounter spawn, invulnerability, kills, score or progression in either natural run. Timing, inputs and relevant state are recorded; equal seed alone does not reproduce a run.
- Controlled40-second video of all three anatomical motions with their actual owned sound cues: `preview/cosmic-fauna-three.mp4`, H.264/AAC1280x792. Full decode passes. Audio starts at2.966s and ends at40.379s; video ends40.217s. Captions clearly identify three-of-42 work in progress and a controlled local view. Video-only loudness normalization does not change the in-game mix. Automated evidence does not establish human listening quality or fun.
- Three PCM44100Hz mono16-bit masters, durations4.0–4.48s, peaks−8.57/−5.22/−5.04dBFS, distinct SHA256 hashes. Fresh delayed ElevenLabs quota:5117/10000 used,4883 remaining. Immediate provider counters lagged; no claim that generation was free or that counter delta equals a currency bill.

Test-helper failures corrected: natural capture accessed duration while no animal was active; showcase started before deferred wave-entry setup completed. Neither was a production gameplay defect. Old inherited CRLF lines make unconfigured `git diff --check` noisy; the scoped check with `core.whitespace=cr-at-eol` passes without rewriting inherited files.

## Local commands and tuning

Set TEMP/TMP and caches to the verified owned E: paths before browser/build work. Start the current source server with `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4973 --strictPort` and `NOVA_SWARM_VITE_CACHE_DIR` set as above.

```powershell
node scripts/check-cosmic-fauna.mjs
node scripts/check-cosmic-fauna-ownership.mjs
$env:FAUNA_EXPECTED_COUNT='3' # Explicit prototype only; default requires all42.
node scripts/check-cosmic-fauna-assets.mjs
$env:CHECK_URL='http://127.0.0.1:4973'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\cosmic-fauna-20261002-451b6ea0\evidence'
node scripts/check-cosmic-fauna-runtime.mjs
```

Natural isolated route: `http://127.0.0.1:4973/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`. It is source-only/loopback-only and denies production progression and submission. `playtest-opening.mjs` now records creature selection/appearance alongside ordinary combat and inputs. `capture-cosmic-fauna.mjs` makes a controlled motion/audio demonstration and refuses to overwrite an existing capture. It is not a natural gameplay test.

Tuning: `src/config/CosmicFaunaCatalog.js` (authored animals, pacing, sizes); `src/effects/CosmicFaunaMotion.js` (clock, exclusion predicates and anatomy); `src/effects/CosmicFauna.js` (owned loader, mesh, audio, brightness and lifecycle). `PlayScene` adds creation, update/sync and teardown only. `assetManifest` lists package assets without preloading the entire set.

## Remaining gates / next step

Produce the remaining39 distinct creatures and sounds, add their anatomical motion profiles, extend the catalog and require the default42-entry asset gate. Before any new Steam upload: fresh release-line/full build, applicable gameplay/localization/native checks, comparable whole-game frame tails, source/package hashes, and authenticated before/after private branch/public/other branches/Cloud verification.

Human checks: identify the first creature as distant harmless life rather than a target; continue seeing all hostile shots; confirm no cue masks a warning on speakers/headphones; assess whether the third sighting remains welcome; assess frequency across several finite-life Pure/Tactical/Sector51 runs, narrow/ultrawide layouts and Reduced Motion. Hardware frame tails/long sessions and final artistic judgement remain manual.

## Compiled prototype verification

`npm run check:release-line`, `npm run check:i18n` and full `npm run build:current -- --outDir E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0/current` passed; Vite7m51s. Existing large bundle/import advisories remain. The out-of-repository output warning correctly says Vite did not empty the target; this was the job's new output. It inherits the previous build stamp because it is a local prototype, not an upload-ready version.

Compiled entry `assets/index-eJ0SDaU0.js`, SHA256 `4b62883b7f9f2ae8c8877377edb514c858941ae28bcb67e2a7a5282cc992e520`.19 source/test/asset hashes and all six copied art/audio assets verified in `checkpoint.json`. The source integration reverse patch passed review-only checking:

```powershell
git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/cosmic-fauna-20261002-451b6ea0/runtime-integration.patch
```

Never applied. It covers the five runtime integration files and intentionally preserves unique art/audio, production helpers and documentation. Review subsequent changes before any actual reversal; no reset or blanket checkout.

Compiled smoke passed menu/settings/audio audition/credits, ordinary combat, powerup HUD, gamepad pause, Cabinet log, Game Over/return, mobile, wave transition, boss impact/death and next sector. Zero warnings/errors/page errors/bad responses. The first run failed only because this new local static server lacked the existing empty offline leaderboard fixture (`/api/highscores` returned404); server fixture corrected, full test repeated, original report retained. No production leaderboard endpoint/data was changed.

Two sequential matched compiled comparisons against Build25675532, no concurrent job-owned build or browser test:

| Fixture | Baseline CPU p50/p95/p99/max ms | Candidate CPU p50/p95/p99/max ms | Baseline/candidate RAF p99 ms |
|---|---|---|---|
| Actual high-pressure dimming, baseline first | 5.9 /7.7 /9.0 /10.6 | 6.8 /8.2 /10.5 /14.1 | 17.3 /17.5 |
| Forced fully visible creature, candidate first | 5.8 /7.0 /7.9 /8.7 | 6.1 /7.6 /9.0 /9.3 | 17.4 /17.3 |

480 CPU/180 RAF samples each; all zero>50ms.160 initial hostile shots plus capped repeated sparks and explosions, same viewport/arena/ocean/seeded cosmetic workload, one Lantern Medusa. Extra CPU cost is disclosed; no universal speedup/no-stutter claim. The first benchmark fixture accidentally retained a boss because `forceClearAllEnemies` deliberately preserves bosses; corrected to existing `clearEnemies` and repeated. One initial completed comparison followed normal pressure dimming to alpha0.04; its receipt is labelled accurately. The second explicitly tests full ordinary alpha0.58, with an assertion against accidental suppression. These are steady-state samples; expanded all42 admission/first-upload/long-session and target-hardware checks still belong to the final set gate.

Serial self-review followed the user's explicit same-directory/no-other-agents rule and autonomous review instruction. Fixed findings are documented above. No new player-facing/untranslated text, production scoring/HP/ownership data, settings or publication changes in this prototype.

Official develop-web-game input client also completed two movement/fire sequences; actual final screenshots and text state inspected (13→25 volleys, player x1177→1347, submission denied). The client expected an absent headless-shell binary, so a task-local adapter selects already installed Chrome; no browser download or global change. Its forced software-renderer/900-frame attempt was cancelled. Final short run uses standard Chrome, waits for real intro readiness and synchronously renders before the client's canvas read, fixing its black stale-buffer captures. The skill client and product code are unchanged by this adapter. Installed native/Steam checks remain for the completed42 set.

Cleanup:23 newly created disposable files removed and absence checked—failed/raw preview WebMs after validated MP4 and superseded failed-smoke screenshots after final replacements. Failure reports, current MP4/static prototype, natural observations, final screenshots, paid source audio, original unique art and minimal reproduction/checkpoint remain. Active milestone TEMP/cache stay available for continuing the remaining39; no inherited output folder was touched. E: free263743602688bytes after this cleanup.
