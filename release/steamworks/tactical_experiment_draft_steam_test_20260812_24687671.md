# Tactical Experiment Draft Steam Test Build

- Uploaded: 2026-08-12 09:44 Europe/Oslo
- AppID: `4765070`
- DepotID: `4765071`
- Steam BuildID: `24687671`
- Depot manifest: `8576537259633784556`
- Assigned branch: `sector-continue-test`
- Public/default after upload: `24667008` (unchanged)
- Other test branch after upload: `test-build` = `23782673` (unchanged)
- Previous `sector-continue-test` build: `24681737`
- Packaged source commit: `0dbb691c8c2e09c0de4df5dbe3f20d04342b6fe3`
- Payload-manifest evidence commit: `0a43bf5`
- Build stamp: `v2026-08-12_09-17-43`
- Executable SHA-256: `7cee7d205d434f8b7170c557d1b43f34b0d31db00d286387d3f7b7245888d2e1`
- Payload manifest SHA-256: `7cc3a21bcd2633df64dd057d3c26b657d624e3ff7ecb8a5b1b6ea554a73d4c38`
- Payload: 861 files, 1,363,246,258 bytes

## Included correction

The acknowledged late-game Tactical experiment now retains the normal post-boss augment draft. At the Sector 75 boundary, the run remains on Sector 75 until the player selects an augment, then advances to Sector 76 with the choice retained. Pure experimental runs remain draft-free. No ordinary run-mode or shared Tactical Draft implementation code changed.

This build also retains the accepted native-pressure correction from BuildID `24681737`: experiment starts at Sectors 75, 100, 120, and 150 preserve the matching native late-sector wave count, danger moments, elite pressure, and difficulty while layering the authored experiment beats.

## Validation

- Experiment fixture contract: passed.
- Exact Sector 75 Tactical boss -> armed three-card draft -> confirmed augment -> Sector 76 flow: passed.
- Paired Pure Sector 75 -> Sector 76 with no draft and zero augments: passed.
- Normal Tactical automatic boss-clear draft flow: passed.
- Run-mode identity and runtime persistence/no-awards isolation: passed.
- Native-pressure differential at Sectors 75/100/120/150: passed.
- Eight-locale experiment report UI and source localization: passed.
- Controller-only flow: passed.
- Release-line and production build gates: passed.
- Packaged smoke: `test-results/packaged-exe-smoke-2026-08-12T07-38-39-262Z/report.json`.
- Packaged performance: `test-results/packaged-perf-smoke-2026-08-12T07-38-58-944Z/report.json`; minimum 58.48 FPS, average 60.15 FPS, zero warnings and errors.
- Visual draft evidence: `test-results/late-game-experiment-draft-flow-2026-08-12T06-54-10-243Z/sector-75-tactical-draft.png`.

## SteamPipe result

SteamCMD reported: `Successfully finished AppID 4765070 build (BuildID 24687671).`

The upload used the D:-resident cached SteamCMD and absolute VDF path in one authenticated process:

`D:\vibe-coding-e\.steamcmd-nova-swarm\steamcmd.exe +@ShutdownOnFailedCommand 1 +login gaunziman +run_app_build D:\vibe-coding-e\nova-swarm-development\release\steamworks\app_build_LOCAL.vdf +quit`

The inspected VDF used `SetLive "sector-continue-test"`; it did not target `default` or `public`. Refreshed authenticated Steam app info proved the branch IDs listed above.

SteamPipe repeated the inherited packaging warning that the staged SDK lane includes `steam_appid.txt`, `steamservice.exe`, `steamclient.dll`, `steamclient64.dll`, and `steamcmd.exe`. The upload succeeded. Narrow this staging payload before any later public/default promotion.

## Rollback

- Test-branch rollback: assign `sector-continue-test` back to BuildID `24681737`.
- Source rollback: `git revert 0dbb691c8c2e09c0de4df5dbe3f20d04342b6fe3`.

