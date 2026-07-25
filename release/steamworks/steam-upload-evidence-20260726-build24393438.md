# Nova Swarm boss-warning input continuity Steam test upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `28f591f9716e33f897a2b1bbdab637d263fd2c35`
- Verified baseline ancestor: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Packaged version: `v2026-07-26_00-03-46`
- Payload files: `410`
- Payload bytes: `1,155,959,336`
- Payload content hash: `637938e66bf74624fd049c37d98af178adc1488c260c61daa0f4d642bb83e4da`
- Payload manifest file SHA-256: `8b6073eac67fdd0318dfc4bf069d441a844cc84a8b8252263872c59e7783cb9e`
- Executable SHA-256: `dfd0bdcbd5d41cc685a5cff602acee9c6d1343e027367e1891e0e6bf495df3c7`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24393438`
- Depot manifest: `5209036808547903819`
- Assigned branch: `sector-continue-test`
- Previous test-branch rollback BuildID: `24390949`
- Pre-upload branch state:
  - `sector-continue-test`: `24390949`
  - `public`: `24390949`
  - `test-build`: `23782673`
- Post-upload branch verification:
  - `sector-continue-test`: `24393438`
  - `public`: `24390949`
  - `test-build`: `23782673`
- Public/default was already on the previous test BuildID before this upload. This upload moved only `sector-continue-test`; store data, achievements, published patch notes, release visibility, and other Steamworks settings were not changed.

## Included change

- Held keyboard and gamepad steering now survives boss-intro entrance and exit presentation resets.
- Held fire remains preserved as before.
- Phase/Dodge, Focus, Pause, Tactical Draft, focus-loss, and scene-transition resets retain their existing stale-input suppression.
- The patch-notes draft now mentions the player-visible boss-warning steering repair.

## Verification

- `check:input-state-transitions`
- `build:current`
- `check:boss-warning-popup`, including real held-key continuity across timed intro enter and exit
- `check:controller-flow`
- `check:frame-pacing-probe:browser` (`17.2 ms` p95 / `17.4 ms` p99)
- `check:mayhem-sector-frame-pacing` (`16.8 ms` active-wave p95 / `16.9 ms` p99)
- `check:release-line`
- `package:steam:win`
- `check:steam-package-runtime`
- `check:packaged-steam-runtime-gate`
- `desktop:smoke:packaged` in explicit local mode
- `desktop:controls:packaged`
- `desktop:perf:packaged` (`59.88` minimum / `60.08` average FPS)
- `desktop:smoke:current` with the Steam bridge ready
- `check:desktop-package` in explicit local mode
- `check:steam-electron-bridge`
- payload manifest and VDF scope verification

The separate generic develop-web-game client was attempted but could not launch because its own Playwright cache lacks `chromium_headless_shell-1208`. Repository-native installed-Chrome and packaged-Electron checks supplied the passing runtime evidence. Deterministic pacing probes did not reproduce the separate normal-wave explosion observation, so this build is scoped to the proven boss-warning input-state defect.

## Upload proof

- SteamCMD: `[2026-07-26 00:19:35]: Successfully finished AppID 4765070 build (BuildID 24393438).`
- Read-only post-upload app info: depot manifest `5209036808547903819`
- VDF `SetLive`: exactly `sector-continue-test`
