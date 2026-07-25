# Nova Swarm Tactical clarity and Run Report Steam test upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `55ed4bd71bcdfb44af3ce3b5481cffbd8a0ef560`
- Product commit: `f36bec8`
- Verified baseline ancestor: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Packaged version: `v2026-07-25_14-21-20`
- Payload files: `410`
- Payload bytes: `1,058,856,685`
- Payload content hash: `4a803e9c22c5cabf3bdbd3d7c87e8c87aa4611652db16e635f92d584dbb73462`
- Payload manifest file SHA-256: `7915860c8c0a1c87d04800a2011d9c86ad632e2280338319767f6d4cb7a7983b`
- Executable SHA-256: `af2c47816a67808e7596f6d62fd0e084baf9b863eaea664dbe9c85e6c2f53bc7`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24389020`
- Depot manifest: `7627440623903404544`
- Assigned branch: `sector-continue-test`
- Previous private rollback BuildID: `24388501`
- Post-upload branch verification:
  - `sector-continue-test`: `24389020`
  - `public`: `24339078` (unchanged)
  - `test-build`: `23782673` (unchanged)
- Steamworks store data, achievements, public/default branch, published patch notes, and release visibility were not changed.

## Included fixes

- Tactical/Pure selector labels retain their final letters on a cold menu render.
- Sector 51+ Overrun warnings announce the same seeded boss profile that runtime spawning uses.
- Tactical Draft choices visibly install into the correct Active Build category and remain paused for one second.
- Run Report uses a color-coded metric dashboard with compact, non-overlapping layouts at 960x640, 1280x720, and 1920x1080.
- The player-facing Steam patch-note draft includes these additions and retains the local-highscore/possible-future-leaderboard explanation.

## Passed gates

- `check:tactical-draft`
- `check:boss-warning-popup`
- `check:run-report`
- `check:run-modes`
- `check:i18n`
- `build:current`
- `check:i18n-ui` (all eight languages)
- `check:controller-flow`
- `check:steam-electron-bridge`
- `check:release-line`
- `package:steam:win`
- `check:steam-package-runtime`
- `check:packaged-steam-runtime-gate`
- `desktop:smoke:packaged` in explicit local mode
- `desktop:controls:packaged`
- `desktop:perf:packaged` (`60.0` minimum and average FPS)
- `desktop:smoke:current`
- `check:desktop-package` in explicit local mode
- payload manifest and VDF scope verification

## Steam runtime caveat

The exact package loaded the staged native Steam module, but direct local launch returned `steam_init_returned_false` during strict packaged smoke. The explicit local smoke, controls, renderer/API, and performance checks passed. Manual launch from the assigned Steam test branch is required to confirm SteamAPI, Steam Cloud, achievements, and leaderboard access for this BuildID.

## Upload proof

- SteamCMD: `[2026-07-25 14:38:06]: Successfully finished AppID 4765070 build (BuildID 24389020).`
- Depot: `[2026-07-25 14:38:05]: Success! New manifestID 7627440623903404544 created and 11 new chunks uploaded.`
- VDF `SetLive`: exactly `sector-continue-test`
