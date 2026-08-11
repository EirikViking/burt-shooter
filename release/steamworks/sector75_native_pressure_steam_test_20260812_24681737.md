# Sector 75 Native Pressure Steam Test Build

- Uploaded: 2026-08-12 01:09 Europe/Oslo
- AppID: `4765070`
- DepotID: `4765071`
- Steam BuildID: `24681737`
- Assigned branch: `sector-continue-test`
- Public/default after upload: `24667008` (unchanged)
- Other test branch after upload: `test-build` = `23782673` (unchanged)
- Previous `sector-continue-test` build visible before this pass: `24668951`
- Packaged source commit: `c630bcc91ffa8a3c83c8396b9c14b079b7c94839`
- Payload-manifest evidence commit: `57011fb`
- Build stamp: `v2026-08-12_01-01-17`
- Executable SHA-256: `2499a5ebfcf790a39babd79bb56cdaa18beffe7f251a9cc925ce0d397a11fe67`
- Payload manifest SHA-256: `ef722b7ff375bacf3dd3f94306ed98d4efaec77baa7061180f3f6df183450048`

## Acceptance target

The acknowledged no-awards late-game experiment must begin Sector 75 with the same enemy-side pressure floor as a naturally reached Sector 75, while keeping every normal game mode unchanged.

The verified Sector 75 plan uses difficulty `82`, pressure band `deep_overrun`, eight waves, 142 planned ordinary enemies, three native danger waves, five authored protocol beats, and three retained native-pressure bridge waves. Real-browser reference comparisons also passed at Sectors 100, 120, and 150.

## Validation

- Production build: passed.
- Experiment contract and default-off isolation: passed.
- Native-reference differential runtime at Sectors 75/100/120/150: passed.
- Reward/Cloud persistence isolation: passed.
- Legacy high-sector runtime: passed.
- Sector 75 authored benchmark: passed.
- Rendered UI localization across eight languages: passed.
- Current Electron smoke: passed.
- Final packaged smoke: `test-results/packaged-exe-smoke-2026-08-11T23-05-31-132Z/report.json`.
- Final packaged performance: `test-results/packaged-perf-smoke-2026-08-11T23-05-47-933Z/report.json`; minimum 59.17 FPS, average 60.21 FPS, zero warnings and errors.
- Visual acceptance video: `test-results/sector75-pressure-acceptance-2026-08-11T22-41-52-643Z/sector-75-experimental-pressure.webm`; 1366x768, 33.52 seconds, peak 18 active enemies and 26 hostile projectiles, zero page/console errors.

The broad browser smoke repeatedly completed all scenes but retained an inherited, out-of-scope Sector 2 toast-overlap failure after its forced boss transition. The changed files do not touch toast orchestration, Sector 2, or the normal progression path.

## SteamPipe result

SteamCMD reported: `Successfully finished AppID 4765070 build (BuildID 24681737).`

The inspected VDF used `SetLive "sector-continue-test"`; it did not target `default` or `public`. Post-upload Steam app info confirmed the branch IDs listed above.

SteamPipe warned that the existing package lane includes `steam_appid.txt`, `steamservice.exe`, `steamclient.dll`, `steamclient64.dll`, and `steamcmd.exe` from the staged SDK. The upload succeeded; retain this warning before any later public/default promotion.

## Rollback

- Test-branch rollback: assign `sector-continue-test` back to BuildID `24668951`.
- Source rollback: `git revert c630bcc91ffa8a3c83c8396b9c14b079b7c94839`.

