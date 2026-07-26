# Nova Swarm Tyrian feedback follow-up Steam test upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `80ae7bc5497bf84adcbb6a983def670baf2d0987`
- Verified baseline ancestor: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Packaged version: `v2026-07-26_01-54-55`
- Payload files: `410`
- Payload bytes: `1,155,968,369`
- Payload content hash: `f2b0a8253a7f9e2109c8be367c02968158103a7f8eec54574d4aea82e71eebcc`
- Payload manifest file SHA-256: `97fcf0bde77d8dc76b58115ec6f0365b0ebf94c540796dd2b7871561902e1987`
- Executable SHA-256: `379716e63eaa338732cec3fa81dd7a144d070942ab71d6bc0a11096cc657a337`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24394148`
- Depot manifest: `802192151679690464`
- Assigned branch: `sector-continue-test`
- Previous test-branch rollback BuildID: `24393438`
- Pre-upload branch state:
  - `sector-continue-test`: `24393438`
  - `public`: `24393438`
  - `test-build`: `23782673`
- Post-upload branch state:
  - `sector-continue-test`: `24394148`
  - `public`: `24393438`
  - `test-build`: `23782673`

The public/default branch had independently moved to BuildID `24393438` before this upload. This operation moved only `sector-continue-test`. Store data, achievements, published patch notes, release visibility, and all other Steamworks settings were untouched.

## Included changes

- Drone Constellation now creates mirrored converging fire with one drone, and permanent drones render below the player hull.
- Boss-warning artwork no longer draws target lines through the boss portrait.
- Reinforcement alerts use routine, major, and headline intensity tiers, with routine traffic no longer repeating full-screen voice-heavy warnings.
- Final death holds briefly on the frozen battle and the Game Over transmission can be skipped by fresh keyboard, pointer, or controller input.
- Sector Run quick-launches the remembered checkpoint; selecting another start point is a clearly labeled secondary action.
- Eligible diving, returning, and reinforcement-route ships can award one guarded ship graze without formation or repeated-enemy farming.
- Overrun Career XP is now 85% of normal activity XP. Skipped sectors still award nothing and competitive progression remains isolated.
- Opt-in `inputDiagnostics=1` telemetry records bounded input edges, focus resets, and long-frame context without changing default gameplay behavior.

## Verification

- `check:input-state-transitions`
- `check:overrun-mode`
- `check:overrun-reinforcements`
- `check:reinforcement-wow` isolated under full VFX load
- `check:tactical-fusions`
- `check:near-miss-streak-clarity`
- `check:gameover-ceremony`
- `check:boss-warning-popup`
- `check:sector-challenge-selector`
- `check:sector-continue-controller-flow`
- `check:run-modes`
- `check:how-to-play` across 10 viewport/scale scenarios
- `check:controller-flow`
- `check:i18n`
- `check:i18n-ui` across all eight supported languages
- `check:steam-electron-bridge`
- `check:release-line`
- `package:steam:win`
- `check:steam-package-runtime`
- `check:packaged-steam-runtime-gate`
- `desktop:smoke:packaged`
- `desktop:controls:packaged`
- `desktop:smoke:current`
- `desktop:perf:packaged` (`58.48` minimum / `59.69` average FPS)
- `check:fresh-profile-steam-isolation`
- `check:desktop-package`
- payload manifest and Steam branch-scope verification

## Upload proof

- SteamCMD: `[2026-07-26 02:10:15]: Successfully finished AppID 4765070 build (BuildID 24394148).`
- Read-only post-upload app info: depot manifest `802192151679690464`
- VDF `SetLive`: exactly `sector-continue-test`
