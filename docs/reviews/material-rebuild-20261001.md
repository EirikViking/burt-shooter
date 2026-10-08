# Nova Swarm: material and backdrop rebuild — 2026-10-01

## Current local build

- Windows: E:\Codex\builds\nova-swarm\material-rebuild\win-unpacked\Nova Swarm.exe
- Static: E:\Codex\builds\nova-swarm\material-rebuild\current
- Version: v2026-10-01_16-09-33; entry assets/index-BZMGdvzH.js; SHA256 dbc156ac647581ebd2323ddbcb015dcd489a9736c001818d7cb294ce1ac5bcb2.
- app.asar SHA256 3f997c2d0d7882595cac64b4ce75662bfd912248eb48752a6685cc0fc2ea13a2; 15560 payload / 4520 retained native files verified against staging and the previous package.
- Same repository D:/vibe-coding-e/nova-swarm-arcade-onslaught-20260920, branch codex/sector-leaderboard-unknown-20260928, HEAD/baseline 7e8325e3d9abb09357636bca7e994c0227be02d6. Initial inherited state 56 tracked modifications/110 untracked paths. No upstream; fetch stalled and was aborted, so remote freshness remains unverified. User's explicit preserve-in-place instruction takes precedence over AGENTS clean-branch/worktree guidance. No reset, clean, stash, pull, commit, push or branch/directory/worktree switch.
- Local pass only: Steamworks, forum drafts, email and production player data untouched. Last previously uploaded Steam test build remains 25650189; this is a new local build, not a Steam delivery.

## Changes and tuning

1. Three newly generated and normalized 1920x1080 backgrounds: ocean cloud systems/city lights/orbital architecture; volcanic fissures/debris ring; fractured ice and rings. Existing five-sector mapping now uses these in Sectors 1–15; the other 45 worlds and Sector 51 entry mapping are preserved.
2. Rebuilt Scout artwork with beveled white/blue panels, defined cockpit and metal nozzles. Its 512x512 canvas and alpha>=32 bounds are exactly the original (47,60,418,392). No sprite sizing, hit radius, movement, weapons, unlock identity or reward rules changed. Remaining 29 hull identities retain their original artwork.
3. Existing cached hull material pass now retains dark cavities, edge contrast and faction colours. It applies to the previously graded hulls; existing painted Astra hulls and the new Scout bypass it. No per-entity filter or per-hit material allocation. The neighbor lookup also stops wrapping across image rows.
4. Shared 64x192 exhaust raster now has a hot nozzle, blue envelope, shock compression and tapered filaments. Existing three display slots remain bounded. Scout's central slot is dimmed to match its two visible nozzles; flat triangular overlays, beads and heat dots are quieter. No thrust, fire or collision changes.
5. HUD surfaces use darker metal, restrained machining highlights and quieter ordinary rails; warning rails keep their priority. Layout, text, navigation and combat suppression rules are unchanged.

Product files: src/assets/assetManifest.js; src/effects/AstraHullMaterial.js; src/effects/AstraEnginePlume.js; src/entities/Player.js; src/ui/NovaCommandHud.js. New public/art/material-rebuild/{ocean,volcanic,ice}.webp and scout.png; two focused check scripts; version/service-worker metadata; this review, progress and handoff. Exact 13 source/public hashes, minimal dirty checkpoints and reverse patch are in the build root. Asset provenance/dimensions/hashes are in asset-provenance.json. Built-in image generation originals remain application-managed; project assets are D:, all task build/scratch/cache work E:.

Tuning: manifest presentation maps; shadeHullPixels contrast/chroma/detail coefficients; createEnginePlumePixels envelope/shock/core; Player.updateEngineVfx alpha coefficients; NovaCommandHud gradient, lift and rail opacity. Existing encounter, explosion, vignette and audio tuning remains in the previous visual-life report. No new player-facing strings or untranslated text; older translation/native-speaker backlog remains. No ElevenLabs calls in this visual pass; previously generated premium audio is retained.

## Verified

- Red fixture before integration rejected the old world mapping; focused checks now pass early boundaries, 48/30 mapping/identity, Sector 51, exact Scout registration, deterministic alpha-preserving material and zero-RNG exhaust with a transparent tail.
- Actual renderer: new Scout/first world used; second legacy hull has stable cached 512x512 material; no material failures; shared exhaust texture; all three worlds admitted through the existing async lifecycle; score and radius unchanged; paused backdrop frozen; Reduced Motion/Flash0 capture inspected.
- Existing lifecycle checks pass audio RNG parity (48 draws), warning identity/deferral, once-only cues, active accessibility, pause/focus/draft clocks/audio stop and destroyed retry root. Critical HUD/cover wear/expiry/no reward and compact result navigation checks pass.
- Official Develop Web Game client ran two keyboard bursts with actual captures/state, no error files, using installed Chrome and the compositor fallback. Initial harness issues and their corrections are recorded in verification-issues.json; no product timeouts were relaxed.
- Actual 180-second finite-life keyboard/autofire natural prototype reached Sector 2, exercised convoy/rival, last sample score 15,869 / one life. Starting damage 1.05 / three lives; no forced kills, extra lives, invulnerability or injected spawns. Seed, inputs, state, clocks and footage retained. Its source-only policy blocks all production progression/leaderboard writes. Seed alone is not reproduction.
- Full npm run build:current passed (Vite 7m55s); release-line and i18n pass; Steam bridge contract pass. Compiled browser smoke: zero warnings/errors/page errors/bad responses. Eight-locale UI: zero missing placeholders, English leaks or renderer errors. Controller-only 1280x720 flow passes. Native delivered executable smoke passes render/menu/API/version and rejects production Steam IPC through the explicit fresh profile. Installed online Steam behavior is not certified by local tests.
- No source scoring formulas, target counts, damage budgets, encounter selection, controls, progress, save schema, achievement IDs or leaderboard IDs changed. Greater visual clarity can influence player decisions; no hidden balance compensation or leaderboard reset.

## Frame-time comparison

Sequential headless Chrome 1280x720, same Breach diagonal layout, seed, state setup, initial 320 hostile shots, capped repeated impacts/explosions, fixed CPU wall/combat clocks and identical diagonal engine intent. First-world upload explicitly settled before sampling. 120 warmup / 780 CPU samples with alternate-frame render, then 120 warmup / 180 RAF gaps.

| Metric | Previous visual-life | Material rebuild |
|---|---:|---:|
| CPU p95 / p99 / max | 11.6 / 13.9 / 16.2 ms | 10.4 / 12.1 / 15.1 ms |
| Render-gap p99 | 17.2 ms | 17.2 ms |
| Samples >50ms | 0 | 0 |

An initial fixture retaining the trusted launch's deep-world art measured CPU p99 10.9/12.4ms and render p99 17.4/17.2ms. Variation and the 1.5ms CPU increase are disclosed; this is no general speedup or stutter-free certification. New first-world evidence is performance-final/report.json. Ordinary rank/world transitions, hardware and long-session tails remain manual. One other-hull admission measured 61.9ms during concurrent checks; the existing synchronous load-time grade is not represented by steady-state frame statistics.

## Reproduce locally

PowerShell in the existing D: repository; never use its stale dist junction. Check available E: space first. Set:

    $env:TEMP='E:\Codex\tmp\nova-material-rebuild'
    $env:TMP=$env:TEMP
    $env:npm_config_cache='E:\dev-cache\npm'
    $env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-material-rebuild'
    New-Item -ItemType Directory -Force $env:TEMP | Out-Null
    npm run check:release-line
    node scripts/check-material-rebuild.mjs
    npm run build:current -- --outDir E:/Codex/builds/nova-swarm/material-rebuild/current --emptyOutDir

Source testing: npm run dev -- --host 127.0.0.1 --port 4942 --strictPort. Restart after presentation edits before module-import fixtures to avoid HMR singleton duplication. Open http://127.0.0.1:4942/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural. This progression-free source route is intentionally unavailable in compiled production. Set CHECK_URL and E: CHECK_OUTPUT_DIR before node scripts/check-material-rebuild-runtime.mjs or scripts/playtest-opening.mjs.

Compiled local serving: node E:/Codex/builds/nova-swarm/material-rebuild/reproduction/serve.cjs (baseline 4943, current 4944; empty isolated local API, POST ignored). Set SMOKE_URL/SMOKE_OUTPUT_DIR for smoke; I18N_UI_URL/I18N_UI_OUTPUT_DIR for check:i18n-ui; CHECK_URL/CHECK_OUTPUT_DIR for check:controller-flow. All outputs must stay E:.

Performance: set BASELINE_URL, CANDIDATE_URL and E: CHECK_OUTPUT_DIR, then run reproduction/performance.mjs. Do not run other build/browser checks concurrently with timing. Local safe native launch:

    & 'E:\Codex\builds\nova-swarm\material-rebuild\win-unpacked\Nova Swarm.exe' --nova-fresh-profile --nova-qa-user-data=E:\Codex\tmp\nova-material-rebuild\play-profile

The fresh profile isolates production Steam identity/save/Cloud/score/achievement writes. Remove only that job-owned profile after closing the test. Packaging reproduction checks source hashes/current version and refuses unexplained existing outputs; preserve the current deliverable before any explicitly requested future replacement.

Rollback review only (verified, never applied):

    git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/material-rebuild/rollback.patch

Actual reversal requires reviewing later changes and an explicit request; never reset HEAD. Documentation is excluded from the source-only patch.

## Human playtest and next step

- First 90 seconds: read enemies, orange hostile shots, locks and earned pickups against the ocean world; inspect hull sharpness at 720p and larger supported layouts.
- Move/fire/Focus/Phase: judge nozzle attachment, thrust legibility and clutter with normal and broad/drone builds; audio remains the earlier premium mix.
- Third sighting: assess whether the silly background tableau stays atmospheric, and whether the physical art still feels coherent during dense combat.
- Sector 6/11 world arrivals, Sector 51 and later rank changes: watch texture admission/frame tails; test Flash0, Reduced Motion, controller and translations on actual hardware.
- No automated test establishes fun, premium art quality or AAA quality. Other 45 world paintings, 29 ship silhouettes, cartoony miniature props, fleet lighting consistency and old result/briefing language backlog are future art/QA work, not newly authored here.

Next recommended step: play this local build on the user's display at normal audio volume, then select the next visually weakest fleet/prop family from actual footage. Do not publish or upload implicitly. Current and required previous visual-life comparison/Steam rollback are retained; job cleanup receipt follows in HANDOFF and cleanup-result.json.

Final verification: all thirteen current source/public hashes and source-only reverse check pass; branch/HEAD unchanged, cumulative58 tracked modifications/114 untracked paths. No owned game/test/server remains. Eleven exact task-owned temp/cache/staging/superseded fixture/log paths are verified absent after fresh path/reparse/process/lock audit and bottom-up native PowerShell removal. Current material-rebuild static/package, requested valid captures/footage, minimal source checkpoint/rollback/provenance/reproduction and previous required visual-life comparison/Steam rollback remain. E: approximately282.68GiB free. Automatic approval review rejected the subsequent final cleanup batch with stated reason 'blocked by policy'; the redundant17,407-byte E:\Codex\builds\nova-swarm\material-rebuild\reproduction\finalize.cjs remains as the exact blocked cleanup residual. No rejected removal was retried. Prior user preview, shared caches, older rejected cleanup and unrelated work preserved. Steamworks untouched, no upload/deploy performed in this pass.


## Authorized Steam test delivery — 2026-10-01 20:51 CEST

The user explicitly requested "upload to steam". Uploaded the already verified current material-rebuild package to the existing private sector-continue-test branch only. Steam accepted BuildID **25660369**, Windows depot4765071 manifest **2981657180304201051**, version **v2026-10-01_16-09-33** (app4765070). Authenticated fresh before/after app-info proves sector-continue-test25650189→25660369, public25579437 unchanged, test-build23782673 unchanged, and Cloud configuration hash2baeb1acdb90a31ddae4f907711cc6d4ba9bb4724500617046036c93c41d334f unchanged. Steamworks settings/player data/public promotion/forum/media publishing were untouched. This was an authorized private branch upload/deployment; it was not a public release.

Same repository D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920, branch codex/sector-leaderboard-unknown-20260928, baseline/HEAD7e8325e3d9abb09357636bca7e994c0227be02d6; no upstream. Inherited cumulative58 tracked modifications/114 untracked paths preserved in place. Prior fetch stalls mean remote freshness remains unverified; no pull/reset/clean/stash/commit/push or branch/worktree switch. This delivery changes only HANDOFF.md, progress.md and this existing review in the repository; no additional game source or player-facing text changed. No new untranslated strings. Prior documented localization backlog remains.

Fresh upload verification: npm run check:release-line PASS; all13 recorded source/public hashes, entry checksum and delivered app.asar checksum PASS; actual packaged executable isolated-profile smoke PASS (API200, no console events, production score/achievement/Cloud identity isolated); authenticated branch/Cloud assertions PASS. Prior build and detailed gameplay/render/accessibility/performance results remain above. The delivered archive SHA256 is3f997c2d0d7882595cac64b4ce75662bfd912248eb48752a6685cc0fc2ea13a2. Steam-installed play/audio/online identity remains a human check; isolated smoke does not establish that behavior or artistic quality.

Evidence: E:\Codex\builds\nova-swarm\material-rebuild\delivery.json, steam-before/after.{txt,json}, steam-build.vdf, steam-upload.txt, steam-build-output depot/app logs and evidence\upload\native-smoke. package.json records the earlier local packaging checkpoint; delivery.json supersedes its delivery field. Reproduction uses cached SteamCMD login at E:\dev-cache\steamcmd-nova; VDF SetLive targets sector-continue-test only. TEMP/TMP were explicitly E:\Codex\tmp\nova-material-upload; source/package/ancestor paths checked with no reparse points. No new full build/staging copy was needed.

Upload-owned temporary native profile and compile cache removed after process/reparse/path/lock audit; exact E:\Codex\tmp\nova-material-upload verified absent. Current package/static/evidence/unique art/reproduction/VDF/receipts/depot logs and required prior visual-life comparison/Steam rollback retained. Shared SteamCMD cache is approximately77MiB and authentication preserved. E: free303,521,333,248bytes (approximately282.68GiB). Prior automatically rejected removal of reproduction\finalize.cjs remains blocked and was not retried. upload-cleanup-result.json records current cleanup.

To test: Steam → Nova Swarm → Properties → Betas → sector-continue-test; allow update and verify installed BuildID25660369. If already selected, restart Steam/check downloads to obtain the update. Next step is a normal installed Steam playtest on the user's display and speakers.

Rollback target retained: previous private BuildID25650189 / manifest4046387036714204723. Reverting the Steam branch requires an explicit user request. Source rollback review command (read-only, never applied): git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/material-rebuild/rollback.patch. Review later work before any actual reversal; never reset HEAD.
