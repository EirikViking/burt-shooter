# Steam test deployment evidence — BuildID 24748875

- AppID: `4765070`
- Depot: `4765071`
- Live branch: `sector-continue-test`
- Previous test-branch BuildID: `24747407`
- Public/default BuildID after deployment: `24733684` (unchanged)
- Legacy `test-build` BuildID after deployment: `23782673` (unchanged)
- Source branch: `codex/tyrian-latest-feedback-20260815-4c2d`
- Source runtime commit packaged: `52226cdfb8eba3abf0b318a7c4f19d7273e1ca16`
- Source branch HEAD at upload: `7f10b7d11f3722e742e843f87af384128fdfe709`
- Build stamp: `v2026-08-15_08-37-41`
- Steam description: `Tyrian latest feedback 52226cd v2026-08-15_08-37-41`

## Payload identity

- Files: `410`
- Bytes: `1,167,790,940`
- Payload manifest hash: `0bbcfc2918f0c045413403593591b9f2d7f0e4304d74a8d42b7f66366208a429`
- Executable SHA-256: `6b7e57b96d6874aceed94cb1ba66332b463e782f21f7a592cab733d1870f4b8e`
- Executable bytes: `226,698,752`
- Depot manifest: `3236136788880634189`

The payload contains the required Steam runtime modules and API DLLs. It does not contain SteamCMD, Steam service/client tools, `steam_appid.txt`, or the Steam SDK toolset.

## Product behavior

- The acknowledged late-game experiment now introduces its pressure vocabulary at Sectors 51–59, tightens the existing vocabulary at Sectors 60–74, and retains full five-beat Protocols from Sector 75 onward.
- Shifting Front warnings are width-aware and grant the slowest eligible hull enough time to traverse the calculated route plus 500 ms, with a 3,200 ms minimum.
- Fixed Standard and endless Endurance remain separate experiment scenarios.
- The packaged ordinary-enemy death palette excludes the long `spawn_special` sound while retaining intentional long-event uses.
- Normal released modes, score and reward rules, leaderboard payloads, boss cadence, RNG topology, Pierce/Chain behavior, and the experiment-disabled path are unchanged.
- The payload includes every earlier change present in BuildID `24747407`, including the overlap-safe menus, contextual first-flight teaching, Overrun opening-tempo floor, and unbounded cosmetic Career Rank.

## ChatGPT Pro review

ChatGPT Pro inspected the exact packaged menu, Sector-51 experiment, slow-hull Shifting Front, and German 840×640 CONTACT SAFE captures. It replied `PRIVATE TEST DEPLOYMENT: APPROVED` and found no visual or contract blocker.

## Validation

- Focused audio, TOURS, Tactical Draft, challenge-flight, experiment, high-sector, run-mode, Overrun, Tractor/Chain, and normal-mode isolation checks passed.
- `npm run check:i18n` and `npm run check:i18n-ui` passed all eight supported languages and the compact-layout matrix.
- `npm run build:current` and full `npm run build` passed with 899 modules.
- `npm run check:release-line` passed immediately before VDF generation and upload.
- `npm run check:steam-sdk-ready` and `npm run check:steam-package-runtime` passed.
- Packaged ordinary-death audio verification passed against the final `app.asar` and 17 extracted clips.
- Browser smoke, packaged launch, keyboard/controller smoke, and desktop package checks passed.
- Packaged performance passed with minimum `59.5238` FPS, average `60.0980` FPS, and zero warnings/errors.
- SteamCMD upload exited `0` and reported `Successfully finished AppID 4765070 build (BuildID 24748875)`.
- Authenticated post-upload app-info verification reported `sector-continue-test=24748875`, `public=24733684`, and `test-build=23782673`.

## Known watch item

One source Electron smoke completed its full report and then exited once with a Windows native Steam shutdown access violation. The Steam-disabled source rerun passed, and the packaged Steam-enabled performance run completed and exited cleanly. ChatGPT Pro classified this as a regression-watch item rather than a blocker for the private branch.

## Rollback

If the private test build must be rolled back, assign BuildID `24747407` to `sector-continue-test`. Do not change public/default.
