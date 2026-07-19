# Nova Swarm achievement integrity Steam upload

Date: 2026-07-19

Source folder: `C:\tmp\nova-swarm-post-stable-development-20260718`

Branch: `codex/achievement-integrity-audit-20260719`

Locked stable baseline: `ae1d2e82accf20859da172f636907a11c965cf3d`

Development baseline: `ff0a4d3c330d54c0a1e1c6aadac9b394d407d7de`

Achievement fix commit: `f670378080e04d76c2e05eda88606eeebbcf5619`

Packaged source commit: `e16cd634c9d05b3246ef90214317a5cdae0b293d`

Package version: `v2026-07-19_12-07-13`

Package folder: `E:\Codex\nova-swarm-steam-package-achievement-integrity-20260719\desktop\win-unpacked`

Packaged executable SHA-256: `D0963ACEADD470D8229C439337E576C416C99631044C46DD7F4DD212CC948721`

Payload manifest SHA-256: `8a9652a9dcc45849653388de9750454fd1c207d3a7a15ddef66dc0276dbe813e`

Steam AppID: `4765070`

Windows depot: `4765071`

Steam BuildID: `24282095`

Steam branch assignment: none

VDF `SetLive`: `""`

Upload description: `Nova Swarm achievement integrity fix v2026-07-19_12-07-13`

SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24282095).`

Upload log: `test-results/steam-upload-achievement-integrity-20260719/steamcmd.stdout.log`

## Corrections

- No Repair Receipts now snapshots life losses only when the ranked run has both cleared Sector 10 and reached 250,000 points. Lives lost between those two conditions invalidate it; later Overrun losses after valid qualification do not.
- Full Hangar Omega now requires and describes all 30 currently playable ships instead of the stale 25-ship requirement.
- After explicit approval, only `ACH_NO_REPAIR_RECEIPTS` was cleared from the logged-in Steam user and matching local/Cloud mirrors. Steam and local counts changed from 60 to 59, with every other achievement unchanged.

The package includes the Full Hangar Omega runtime and localized in-game description correction. After exact-diff review, Steamworks stats revision 10 published the matching English player-facing description. The only metadata diff changed `25` to `30`; the achievement table and empty unpublished-change list were verified afterward.

## Exact-package verification

- All 81 achievement catalog entries passed: 39 rank, 40 milestone, and 2 leaderboard achievements.
- No Repair Receipts order-sensitive boundary cases passed.
- Rank progression, Swarm Elite accepted-submission eligibility, Steam achievement mock synchronization, and Overrun clear behavior passed.
- `npm run check:i18n`, `npm run build:current`, and all-eight-language `npm run check:i18n-ui` passed.
- `npm run check:release-line` and `npm run check:steam-package-runtime` passed.
- Current Steam-backed Electron smoke confirmed 59 unlocked achievements and no `ACH_NO_REPAIR_RECEIPTS`.
- Packaged executable smoke and keyboard/gamepad controls passed.
- Fresh-profile Steam isolation passed.
- Packaged performance held 60.0 minimum and average FPS across 11 samples.
- `npm run check:desktop-package` passed.
- The payload manifest contains 417 files and 958,421,535 bytes.

The upload did not move a Steam branch, call SetLive, alter leaderboard data or stored scores, change achievement IDs, or change save or Steam Cloud paths. The only production changes were the explicitly approved single-account achievement clear and the published Full Hangar Omega description correction.
