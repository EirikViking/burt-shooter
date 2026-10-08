# Game quality repair audit - 2026-09-30

## Repository and scope

User requested fixing everything wrong with the game. This pass audits reproducible defects and repairs them without changing combat balance, input, save identity or competitive rules. It is not a certification that every possible defect has been removed.

Established repository: `D:\vibe-coding-e\nova-swarm-arcade-onslaught-20260920`. Branch `codex/sector-leaderboard-unknown-20260928`, baseline/HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`. AGENTS/HANDOFF and recent development/forum reviews read first; fetch/status/branch/log/worktree and inherited changes inspected. Initial 42 tracked modifications/81 untracked paths match handoff. No upstream/matching origin branch; preserve the documented dirty baseline under the user's explicit instruction. No directory/branch/worktree switch, reset/clean/stash/pull/commit/push or concurrent writing agent.

Task outputs `E:\Codex\builds\nova-swarm\quality-repair`, temp `E:\Codex\tmp\nova-quality-repair`, cache `E:\dev-cache\vite\nova-quality-repair`. Resolved paths/ancestors and source dist/dependency junctions verified; no C: project output. Current combat-clarity static/package is the retained comparison/last uploaded baseline.

## Reproduced and repaired

1. **Achievement banners obscured result titles.** Actual English 1280x720/German 1366x768 and Korean narrow results reproduced overlap. Fixed placement against final rendered result/action bounds; moves to available space with a gap. Layout now runs after normal and first-flight result positions are final, including resize. No announcement/input lock or combat HUD change.
2. **Duplicate active notification delivery requeued the same achievement.** The existing queued-ID guard ignored the active ID. The active banner now carries its achievement identity and repeated delivery is consumed once. Real achievement grants/IDs are unchanged.
3. **Expired notifications left graphics/text objects alive.** Removal detached the container and removed its ticker but did not destroy its children. Removal/expiry now release owned container/text/graphics, and repeated removal is safe. Shared game assets remain intact.
4. **Scout results used romanized/English explanatory text.** Ten inspected result/advice labels in Chinese, Russian, Korean and Japanese lacked native-script text. A standard i18n feature catalog now supplies 13 canonical keys in all eight locales; mode name Scout is intentional. German/Spanish/Portuguese result text remains translated, with proper accents in this catalog.
5. **Scout next-goal guidance leaked English.** The normalized English goal lacked an exact localized key and a raw setter bypassed translation. Both uppercase source and normalized source now have complete locale entries; the result getter translates the displayed goal.

Verification also caught and repaired a feedback loop introduced while translating the goal: display text must not be stored back into canonical goal state. Repeated layout and language changes now preserve the same source goal and stable presentation.

Changed product files: `src/scenes/GameOverScene.js`, new `src/i18n/gameOverQualityText.js`, eight `src/i18n/locales/*.js` integrations. New focused tests `scripts/check-game-quality-runtime.mjs` and `scripts/check-game-quality-localization.mjs`. Existing runback audit now honors `CHECK_OUTPUT_DIR`; version/service-worker metadata and notes updated. No combat health/damage/spawn/eligibility/rewards/scoring/progression/achievement identifiers or audio assets changed. No paid media generation.

## Verification evidence

Observed failing tests before production repairs: title/score overlap, active ID in queue twice, undestroyed banner/text on removal/expiry; native-script Scout probes and all seven non-English next-goal probes failed. The test caught result-guidance growth during the candidate work and was strengthened with layout idempotence. Assertions cover real renderer bounds and actual production notification lifecycle rather than source markers.

Focused renderer passes 14 result/layout/locale fixtures, five viewport sizes, normal and first-flight results, all eight locales, native score placeholders, longest actual catalog names, active/queued ID deduplication, exactly-once removal/expiry, ticker removal and unchanged score. Native-script localization regression and required i18n checks pass. Final screenshots inspected, including narrow Korean native text and English result; prototype policy blocks production progression/submission.

Existing audit checks passed: projectile defense rules and actual projectile lifecycle; keyboard/canvas Hold/Toggle, UI isolation, mouse steering/double tap, controller/Phase/focus transitions; encounter score pacing/no passive farming/capped irreversible damage credit; pure evolution/expansion/Orbit eligibility, family scheduling, expiry/reset and exactly-once rewards; Onslaught contracts, mode policy, Steam-profile isolation; voice mute and 20 remastered WAV format/duration/no clipping/silence.

Actual runtime checks passed: nine evolution groups; Orbit pickup/contact/local bullet clearing/armor locks/refresh/expiry/pause/cleanup; eight expansion routes and pause/draft/focus/death/retry state; prior forum regressions for Phase snake contact, convoy pose/health through briefing, controller Hangar recovery and real achievement row scrolling. All-eight-language UI audit reports no console/page errors, placeholders or detected English leaks in its covered screens. Controller-only flow at 1280x720 passes. Source skill client exercised three keyboard bursts; actual gameplay screenshots/text inspected.

Harness limitations were investigated rather than hidden: initial cold navigation hit the standard load timeout; focused startup now waits for DOM plus actual ready state, with diagnostics and unchanged ready limit. The official skill client's raw canvas read captured a discarded WebGL buffer as black; its task copy uses compositor screenshots for WebGL, and actual frames were inspected. A later runback audit navigation timed out while the build/UI jobs loaded concurrently; isolated final outcome is appended below. No game timeout workaround or weakened behavior assertion was added.

## Local reproduction

From the established repository, use E: environment paths (recreate owned scratch after cleanup):

```powershell
New-Item -ItemType Directory -Force E:\Codex\tmp\nova-quality-repair,E:\dev-cache\vite\nova-quality-repair | Out-Null
$env:TEMP='E:\Codex\tmp\nova-quality-repair'
$env:TMP=$env:TEMP
$env:npm_config_cache='E:\dev-cache\npm'
$env:NOVA_SWARM_VITE_CACHE_DIR='E:\dev-cache\vite\nova-quality-repair'
npm run build:current -- --outDir E:/Codex/builds/nova-swarm/quality-repair/current --emptyOutDir
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4920 --strictPort
```

Separate terminal with the same E: environment:

```powershell
$env:CHECK_URL='http://127.0.0.1:4920'
$env:CHECK_OUTPUT_DIR='E:\Codex\builds\nova-swarm\quality-repair\evidence\quality-current'
node scripts/check-game-quality-runtime.mjs
node scripts/check-game-quality-localization.mjs
```

Safe source-only fixture: `http://127.0.0.1:4920/?encounterEvolution=orbit-breaker&autostart=1&offlineLeaderboard=1`; `molt`, `payback`, `breach` and `natural` use the existing isolated prototype policy. Forced tests cannot grant production progression or submit ranked scores. Source dist remains stale; use the explicit E: output. Reproduction depends on relevant state, inputs and timing, not seed alone.

## Remaining checks and known limits

- Native-speaker review is still required. Older romanized practice briefings/achievement descriptions elsewhere in the locale dictionaries remain a broader localization backlog; this audit repairs the inspected Scout result/advice keys. The general i18n UI check alone does not establish translation quality.
- Installed Steam/Cloud/leaderboard identity, physical controllers, hardware frame-time tails and long sessions remain manual. No combat loop changed in this pass; no new frame-time improvement is claimed. Previous matched combat comparison remains in the combat-clarity report.
- Personal listening, first/third-sighting encounter enjoyment, natural early/51/deep frequency and balance remain human checks. Existing audio is preserved; passing catalog/mute checks does not establish good sound or fun.
- Vite still emits the inherited large-bundle/static-and-dynamic-import warnings and development public-atlas import advisory. Source renderer tests complete without browser errors; no startup failure is attributed to that advisory.
- Free-space/cleanup, final build/package hashes and local delivery outcome are appended after verification. Earlier tasks' rejected cleanup is not retried.

Human checklist: finish a long localized result with achievement notifications; resize and change language repeatedly; activate retry/report/Hangar/main menu by mouse/keyboard/controller; verify one notification per grant and no obscured score/input; test dense combat, focus loss/pause/draft/death/retry; listen at normal volume on installed hardware.

## Rollback

Source-only review against this pass's saved dirty baseline (never reset HEAD):

```powershell
git apply --reverse --check --ignore-space-change E:/Codex/builds/nova-swarm/quality-repair/rollback.patch
```

No rollback applied. Actual reversal requires review/explicit request against later changes; remove `--check` only then. Documentation/history excluded. The previous Steam test build was last verified as 25638003; no new Steam deployment or settings/public/forum/media change is part of this repair pass.

## Final build and runtime receipts (2026-10-01)

Final `build:current` passed in 7m48s. Version `v2026-09-30_23-40-37`; current entry `assets/index-BC3GPnXF.js`, SHA256 `83e0b8e415d04e5777248dc08e9544824d4d58514b624a86b742a5bafe0e65e9`. All 15 source/public hashes and the source-only reverse patch check passed again after testing; see `E:\Codex\builds\nova-swarm\quality-repair\source-state.json`.

Final compiled browser smoke passed with zero warnings/errors, page errors or bad responses. Isolated runback audit passed at its original timeout: cached acceptance-to-control 473ms; uncached 1388.5ms. Source screenshots and final English/Chinese/Korean results were inspected. These timings characterize the tested fixture and machine, not every player installation.

The existing runback harness initially ignored the explicit E: output override and created two task-owned D: `test-results/runback-agency-lifecycle-*` directories. Its output selection now honors `CHECK_OUTPUT_DIR`; a verified E: repeat replaces those disposable captures. Cleanup outcomes and package verification follow below. Existing source/dependency junctions, inherited artifacts, shared caches and earlier rejected cleanup targets are preserved.

Package integrity passed: 15,535 payload files checked, 4,520 retained native files, `app.asar` SHA256 `8534dd707f270761d9bab3fb429330e3ffe781b5ab3060cb8f27acc3cba39ddb`. Current local executable: `E:\Codex\builds\nova-swarm\quality-repair\win-unpacked\Nova Swarm.exe`. Actual delivered executable smoke passed with the expected version, rendered ready menu, API 200 and zero console events. `NOVA_SWARM_FRESH_PROFILE=1` isolated all production Steam IPC (`fresh_profile_isolated`); the explicit local gate does not verify installed online Steam/Cloud/leaderboards. No Steam CLI or upload was used.

To test locally without production progression/Steam writes, launch from PowerShell:

```powershell
$env:TEMP='E:\Codex\tmp\nova-quality-playtest'
$env:TMP=$env:TEMP
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
$env:NOVA_SWARM_USER_DATA_DIR='E:\Codex\tmp\nova-quality-playtest\profile'
$env:NOVA_SWARM_FRESH_PROFILE='1'
& 'E:\Codex\builds\nova-swarm\quality-repair\win-unpacked\Nova Swarm.exe' --nova-fresh-profile
```

This creates a separate opt-in test profile, not a reset of existing player data. Close it before removing its owned scratch. Unset the two `NOVA_SWARM_*` variables in that terminal before any intentional production run. Package receipts and executable smoke evidence are retained in the output root.

## Cleanup and final repository state

Cleanup completed after exact resolved-root/reparse/process/exclusive-lock audits. Removed this job's E: temp/packaging stage, Vite cache, packaged-smoke userData and intermediate raw runback videos, and only the two accidental D: runback output folders listed in `cleanup-result.json`. All six paths were rechecked absent; no owned game/server/browser-test/SteamCMD process remains. E: free 304.47GiB. Retained current static/package, minimal source checkpoint/rollback/reproduction, valid named footage/screenshots and receipts, and the combat-clarity comparison/last uploaded package. Shared caches, unrelated/inherited outputs and older approval-rejected cleanup targets were untouched.

Final cumulative Git state: 51 tracked modifications/85 untracked paths; branch and HEAD unchanged. Source hashes/rollback reverse check and process-local CR-at-EOL-aware whitespace check pass. Windows line-ending advisories are inherited; Git configuration and unrelated formatting were not changed. No new untranslated strings in the repaired catalog; the older translation backlog above remains. Steamworks untouched, deploy not performed, last verified uploaded test BuildID25638003 unchanged.

## Authorized Steam test delivery - 2026-10-01

The subsequent explicit user request authorized upload. Latest verified package is now on **sector-continue-test**, **BuildID25646684**, Windows depot4765071 manifest **1833921479221021248**, label **v2026-09-30_23-40-37**. App4765070. Authenticated fresh before/after receipts verify public25579437, test-build23782673 and Cloud settings unchanged. No Steamworks configuration/store/forum/media change or production reset. Steam > Nova Swarm > Properties > Betas > sector-continue-test; allow update and verify label/build. Cached CLI login can sign out the desktop Steam client; reconnect if needed.

Fresh upload gates passed: release-line, 15 source/public hashes and reverse patch check, app.asar SHA256 against the package receipt, delivered executable isolated render/menu/API/version smoke. No product source changes or new build were needed; prior full build/regression evidence belongs to this exact package. This does not establish installed online identity, human enjoyment or native-language quality. Branch `codex/sector-leaderboard-unknown-20260928`, HEAD `7e8325e3d9abb09357636bca7e994c0227be02d6`, dirty work preserved; only delivery notes changed in source.

`E:\Codex\builds\nova-swarm\quality-repair\delivery.json` and fresh Steam receipts supersede `package.json` historical local delivery fields. VDF, depot manifest, upload/depot/app logs, source hashes and reproduction helpers retained. Rollback test target25638003; no rollback applied. Source review command above remains valid without applying.

Upload cleanup verified: fresh E: upload temp, task SteamPipe staging/output and new smoke test profile removed; three exact paths absent, no owned processes, E: free approximately304.46GiB. Current required package/static and combat-clarity rollback/comparison retained; shared caches and older blocked cleanup untouched. Installed test checklist: long localized result/achievement queues/expiry, normal combat/audio, keyboard/controller/focus recovery, save/Cloud/leaderboard identity and long-session hardware performance.
