# Nova Swarm final-death signal and Tactical cap clarity Steam test upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `64e5b01a0be448903adf0de404e11b13b0f49732`
- Verified baseline ancestor: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Packaged version: `v2026-07-26_10-33-58`
- Payload files: `410`
- Payload bytes: `1,160,562,276`
- Payload content hash: `470215f66a951041ba3e617aea4cfc0ede24abfed860d852d264710f18ffda27`
- Payload manifest file SHA-256: `141b6c45111010a1330298ca6fce981a31a4bd23d624a471c3643ae83c5de6ee`
- Executable SHA-256: `b6e89018e60f8df5a76bc9acdcb8bb749719e6bbf6dd8e6306be99538cfe0f73`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24396942`
- Depot manifest: `3257325674348362189`
- Assigned branch: `sector-continue-test`
- Previous test-branch rollback BuildID: `24394148`
- Pre-upload branch state:
  - `sector-continue-test`: `24394148`
  - `public`: `24393438`
  - `test-build`: `23782673`
- Post-upload branch state:
  - `sector-continue-test`: `24396942`
  - `public`: `24393438`
  - `test-build`: `23782673`

This operation moved only `sector-continue-test`. The existing Game Over screen and its 30 full-screen transmission artworks were preserved. Store data, achievements, published patch notes, release visibility, the public/default branch, and all other Steamworks settings were untouched.

## Included changes

- The frozen final-death battlefield now remains visible for 1.1 seconds with a clearer impact cue before the transmission begins. Fresh keyboard, pointer, or controller input can skip it; held input cannot.
- Only the former small geometric transmission animation was replaced. Thirty generated luminous signal cores are paired with distinct motion, pulse, echo, orbit, spin, and tilt treatments.
- Tactical Draft removes stat-only offers that cannot change gameplay at the current cap and backfills a useful choice.
- Mixed offers clearly label unchanged damage as `DIRECT DAMAGE CAP REACHED` while retaining any effective secondary benefit.
- Genuine stat reductions remain visible and are not incorrectly presented as cap behavior.
- The cap warning is localized in all eight supported interface languages.

## Verification

- `check:gameover-final-transmissions`
- `check:gameover-ceremony`
- `check:tactical-draft`
- `check:i18n`
- `build:current`
- `check:i18n-ui`
- `check:controller-flow`
- `check:steam-electron-bridge`
- `check:release-line`
- `package:steam:win`
- `check:steam-package-runtime`
- `check:packaged-steam-runtime-gate`
- `desktop:smoke:packaged` with the explicit local-runtime mode
- `desktop:controls:packaged`
- `desktop:smoke:current` with the live Steam bridge ready
- `desktop:perf:packaged` (`60.0` minimum / `60.0` average FPS)
- `check:fresh-profile-steam-isolation`
- `check:desktop-package`
- payload manifest and Steam branch-scope verification

## Upload proof

- SteamCMD: `[2026-07-26 10:55:54]: Successfully finished AppID 4765070 build (BuildID 24396942).`
- Read-only post-upload app info: depot manifest `3257325674348362189`
- VDF `SetLive`: exactly `sector-continue-test`
