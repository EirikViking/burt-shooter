# Nova Swarm Tyrian the Great Steam test upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `fe0c225`
- Verified baseline ancestor: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Packaged version: `v2026-07-26_11-33-38`
- Payload files: `410`
- Payload bytes: `1,160,562,577`
- Payload content hash: `236825da566ea2c5f328161282749cb1be757337ed9043b3234bc4541d5c031b`
- Payload manifest file SHA-256: `5f446ec7f2bdd7da04b356db46b65b5aa1daa643270dd3086d513b849474cea4`
- Executable SHA-256: `f484f30a540dbe2eba3390fb4b136ff93dac4d15b619c5ae6ab4ca8aaabfc1e3`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24397254`
- Depot manifest: `3672975861801350471`
- Assigned branch: `sector-continue-test`
- Previous test-branch rollback BuildID: `24396942`
- Pre-upload branches: `sector-continue-test` `24396942`, `public` `24393438`, `test-build` `23782673`
- Post-upload branches: `sector-continue-test` `24397254`, `public` `24393438`, `test-build` `23782673`

## Scope

- Renamed boss profile `nova_boss_03` from `Ro ro ro` to `Tyrian the Great`.
- Replaced its English epic Codex story and combat tip with a Nova Swarm tribute to Tyrian's precise, persistent feedback.
- Preserved boss ID, order, artwork, archetype, movement, attacks, balance, unlocks, save identity, audio asset, and every Steam integration contract.

## Verification

- `check:threat-codex`
- `check:i18n`
- `build:current`
- `check:i18n-ui`
- `check:codex-layout` at 1920x1080, 1600x900, 1366x768, and 1280x720
- `check:release-line`
- `package:steam:win`
- `check:steam-package-runtime`
- `desktop:smoke:packaged` using explicit local-runtime mode
- payload manifest and pre/post Steam branch-scope verification

SteamCMD reported: `[2026-07-26 11:47:39]: Successfully finished AppID 4765070 build (BuildID 24397254).`
