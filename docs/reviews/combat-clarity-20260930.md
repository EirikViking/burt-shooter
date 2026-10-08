# Combat clarity and result navigation — 2026-09-30

## Authorization and baseline

User requested further improvements and Steam upload. This pass fixes observed display problems and uploads only the established `sector-continue-test` branch. Repository remains `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`, branch `codex/sector-leaderboard-unknown-20260928`, HEAD/baseline `7e8325e3d9abb09357636bca7e994c0227be02d6`. Initial 40 tracked modifications/79 untracked paths matched HANDOFF. Fetch/status/branch/log/worktree checks completed; no upstream/matching remote branch. Inherited dirty source, dependency/dist junctions and other chat work preserved. No reset/clean/stash/pull/commit/push/branch/worktree/location switch, player-data reset or writing agents.

Build/temp/cache locations are the verified real E: roots `E:\Codex\builds\nova-swarm\combat-clarity`, `E:\Codex\tmp\nova-combat-clarity`, `E:\dev-cache\vite\nova-combat-clarity`; intensive commands set process-local TEMP/TMP there. Previous task output `playthrough-polish/current` is the explicit comparison baseline. Shared caches and older blocked cleanup are untouched.

## Observed problems and changes

The new finite-life keyboard/autofire prototype run reached Sector 4 and ended at Game Over, 18,160 points / 4:39 displayed. It rescued SWIFT/MERLIN and spent one earned callback in Sector 2. Original stats, normal finite lives/earned recovery, no scripted kills/skips/invulnerability; pause/resume, weapon changes and ordinary combat exercised. All progression/submission permissions false. Zero renderer/page/console errors. Valid report/video/images: output `evidence/natural`. This is automated observation, not a human fun or complete endless-game assessment.

- `src/ui/HUD.js`: occlusion walked top-level children but classified nested livesText as essential. Actual lives and powerup panels therefore faded to 24% beneath threats. Classify lives/active-powerup/trait containers correctly; retain 65% readability and restore on pause/clear. Keep secondary notices subdued. Mission backdrop rises from .30/.42 to .48/.58 for ordinary/critical states.
- `src/ui/NovaCommandHud.js`: persistent frame surface .34 → .48. No size, hit area, text, timing, priority or warning lead-in changes.
- `src/effects/SerpentMolt.js`: damaged cover gains two bounded static fracture branches at 28%/62% wear. Still-solid cover retains at least .65 opacity until actual expiry, correcting near-invisible blocking in its last .45 seconds. No extra entity/texture/particle/filter/RNG/audio or per-hit logging. Same two plates, geometry, health, expiry, mother ownership, bullet interactions and exactly-once/no-neutral-reward accounting. Flash 0 / Reduced Motion preserve the solid-cover cues.
- `src/scenes/GameOverScene.js`: actual 1280×720 run showed clipped lower navigation. Long result/status text can overflow despite nominal stack estimates. In compact desktop runback, suppress the optional next-goal strip only when rendered navigation would cross the bottom edge, moving the following stack upward by its occupied height. It returns on roomy layouts. Fonts, actions, eligibility, input and save/score lifecycle are unchanged.
- New `scripts/check-combat-clarity-runtime.mjs`: actual renderer regressions for overlap priority/pause restore, mission contrast, worn-cover visibility/accessibility/expiry/no reward, and result/button bounds at 1280×720, 1366×768, 1920×1080.

Failing tests were observed before each fix: life/powerup ratio .24, plate opacity .074 while active with no wear cue, clipped runback Hangar at 1280×720. Green assertions preserve actual health/score/lifecycle checks. One startup check timed out while a recorded run loaded concurrently; the isolated rerun passed the same 90-second limit without product workaround or relaxed assertions. Source playback captured under load is not a frame-time benchmark.

No new translated strings or known new untranslated text. No new paid audio generation; existing remastered ElevenLabs/audio priorities are retained. No health/damage/spawn/selection/reward/formula/save schema/achievement/leaderboard changes. Extra readable information can affect player decisions; no hidden score compensation or board reset. Human listening, first/third-sighting counterplay, ordinary frequency, hardware tails, native-language and installed Steam save/Cloud/leaderboard checks remain manual.

## Verification and local reproduction

Passed targeted renderer checks, current skill-client three key bursts with screenshots inspected, pure encounter/Orbit/accessibility/score-pacing checks, i18n and release-line. Build/package/UI/runtime/performance and Steam receipts are appended after final verification.

Full build:current passed (7m5s; existing large-bundle warning remains). Nine actual encounter evolution groups passed. Compiled browser smoke passed with zero console/page errors/bad responses; all eight language UI checks passed without detected missing placeholders/English leaks. English result, German HUD and Chinese result images inspected. Controller-only flow passed at 1280×720, native bridge contract passed. Existing temporary achievement toast can overlap a long result title in the English score-entry capture; this is a remaining presentation issue, not fixed by the navigation repair. Native-language/art/hardware judgement remains manual.

Current label `v2026-09-30_22-38-37`; entry `assets/index-CC2e8lN3.js`, SHA256 `4dcb248f2bd4a6830022a6c2373d13ae0db499339c1008a09c7f9e721c737a5e`. Seven exact changed/new source/public hashes recorded, including four product sources, focused test and version/sw metadata; source-only reverse patch check passed without applying. Package helper verified 15,535 payload and 4,520 retained native files. app.asar SHA256 `cf4ed1336d5be3f1c7a9165eff93122e2fec7d457ad0d3f62e1afe9360c64ca3`. Static/package/evidence/receipts under the owned output root. No new UI strings; all eight locale files preserved.

Package integrity and delivered executable render/menu/local-API/version checks passed in an isolated fresh profile. All production Steam IPC is disabled in that profile; installed online Steam identity/save/Cloud/leaderboard behavior is not claimed tested.

Matched sequential headless Chrome 1280×720 stress comparison, same diagonal Breach/seed/state/inputs/clocks, 320 initial hostile bullets, capped impacts, ParticleManager and HUD updated each tick (cached score chase skipped equally), 120 warmup/780 CPU samples and 120 warmup/180 render gaps. Baseline/candidate/sustained-hammer CPU p95/p99/max ms: 12.0/13.9/21.3; 11.0/13.1/15.6; 10.8/12.0/17.3. Render-gap p99 17.3ms in all three; zero >50ms samples. Exact evidence/performance/report.json and owned reproduction/measure-current.mjs retained. Small differences do not establish universal speedup. Plate-wear and result-transition hardware tails, long sessions and fun remain manual. Hammer fixture deliberately holds the tool beyond normal expiry for sustained-work measurement.

From the existing repository, recreate owned scratch after cleanup and use explicit paths:

```powershell
New-Item -ItemType Directory -Force E:\Codex\tmp\nova-combat-clarity,E:\dev-cache\vite\nova-combat-clarity | Out-Null
$env:TEMP='E:\Codex\tmp\nova-combat-clarity'
$env:TMP=$env:TEMP
$env:npm_config_cache='E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-combat-clarity'
npm run build:current -- --outDir E:/Codex/builds/nova-swarm/combat-clarity/current --emptyOutDir
npx --no-install vite --host 127.0.0.1 --port 4910 --strictPort
```

Separate terminal with the same E: environment:

```powershell
$env:CHECK_URL='http://127.0.0.1:4910'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\combat-clarity\evidence\clarity'
node scripts/check-combat-clarity-runtime.mjs
```

Use `http://127.0.0.1:4910/?encounterEvolution=molt&autostart=1&offlineLeaderboard=1`, `orbit-breaker` or `natural` for safe local play. Source/loopback-only prototype policy forbids production scores/progression. Reproduction requires state/inputs/timing, not seed alone. Current production preview must use explicit `--outDir E:/Codex/builds/nova-swarm/combat-clarity/current`; source dist remains stale. Existing gate/test helpers and local playthrough script are retained under reproduction. No network telemetry or combat HUD diagnostics were added.

Tuning is in the four sources above: occlusion .65, mission .48/.58, static wear thresholds .28/.62, solid opacity floor .65 and 12px navigation bottom threshold. Initial display values are hypotheses; test over bright/dark scenery, dense fire and supported languages/layouts.

## Manual checklist / rollback

1. In dense fighting, read lives/tool timer while tracking bullets through/around the HUD. Verify new contrast does not hide hostile fire.
2. First/third Molt: recognize worn plates and impending expiry, choose cover or firing lanes; repeat broad/drone/Ghost/Chain/piercing builds, Flash 0/25/100 and Reduced Motion. Confirm no nearly invisible solid plate.
3. Finish a run at 1280×720 with long localized results; see and activate every navigation button by mouse/keyboard/controller. Resize wider and verify optional guidance returns. Test actual score-entry/Steam confirmation and first-flight variants without resetting data.
4. Installed Steam long sessions/transitions, pause/focus/draft/death/retry, early/51/deep frequency, sound feel and first/third encounter enjoyment.

Source-only rollback review (never reset HEAD):

```powershell
git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/combat-clarity/rollback.patch
```

Actual rollback requires explicit request/review against later changes; remove `--check` only then. Documentation/history excluded. Prior Steam test-branch rollback target is BuildID 25635049. No rollback performed. Final Git state/delivery/cleanup are recorded in HANDOFF and appended below.

## Delivered Steam test build

Authorized upload completed successfully: App 4765070 / Windows depot 4765071, BuildID **25638003**, depot manifest **5011808096611171790**, label **v2026-09-30_22-38-37**. Fresh authenticated before/after receipts verify only `sector-continue-test` changed (25635049 to 25638003). Public/default remains 25579437 and `test-build` remains 23782673; Cloud settings hash remains `2baeb1acdb90a31ddae4f907711cc6d4ba9bb4724500617046036c93c41d334f`. Steamworks configuration, store/media/forum posts and production player data were untouched. No Git commit/push. Reconnect the Steam client if CLI login signed it out, select Properties > Betas > sector-continue-test, update and verify the version label.

Final source/public hashes and reviewed reverse patch reverified after upload. Same branch `codex/sector-leaderboard-unknown-20260928`, baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`; cumulative status 42 tracked modifications / 81 untracked paths, preserving inherited work. Four product files changed in this pass: `src/ui/HUD.js`, `src/ui/NovaCommandHud.js`, `src/effects/SerpentMolt.js`, `src/scenes/GameOverScene.js`; new `scripts/check-combat-clarity-runtime.mjs`, generated version/service-worker metadata and these development notes. Seven exact source/public manifest rows distinguish this pass from inherited changes.

Current static/package, source checkpoint/rollback, reproduction helpers, actual run footage/screenshots and receipt/report evidence remain at `E:\Codex\builds\nova-swarm\combat-clarity`. Previous uploaded `playthrough-polish` build is retained as the explicitly required comparison/rollback build. Cleanup outcome is recorded in HANDOFF and `cleanup-result.json`; previous tasks' blocked cleanup and shared caches are untouched. Next recommended work is installed-game human testing and the remaining transient achievement/result-title overlap.

Cleanup completed and independently verified: owned E: temp/staging, Vite cache and packaged smoke profile removed after exact-root/reparse/active-task/process/exclusive-lock audits. Current static/package, required prior comparison build, minimal source checkpoint/rollback/reproduction and valid requested evidence retained. No owned test/server/SteamCMD process remains; E: free 310.55GiB. Previous tasks' blocked cleanup is unchanged/unretried. Plain Git whitespace checking flags CR-at-EOL in inherited mixed Windows files; process-local CR-aware check passes and this pass's patch adds no trailing spaces/tabs. No inherited reformat or Git setting change was made.
