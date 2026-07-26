# Nova Swarm Codex and Hangar launch-mode Steam upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Product source commit: `9b0aed1432330161ec6b155e93eee223e917b675`
- Package evidence commit: `f647011feca388e86b66c980080c1d30ca754349`
- Verified baseline ancestor: `55d9b33300808434a1a2af30a70b9e2b1dd1a8dd`
- Packaged version: `v2026-07-26_15-57-05`
- Payload files: `410`
- Payload bytes: `1,160,582,701`
- Payload content hash: `be6d00afac583cedaaf0f7f2c4064be6bcc3425a068bf811f9fea6661cdc5381`
- Payload manifest file SHA-256: `bc85fbba1ca46e7c875c24741cd5fc1b4c3aa42760d41be195300572a0e5367f`
- Executable SHA-256: `9799fd4ce7f5059acf8ecd22284e0605fef6fa562ea4e3e97d7ea973c803dffd`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24398974`
- Depot manifest: `939621609412580332`
- Baseline depot manifest: `3672975861801350471`
- SetLive: blank (`"SetLive" ""`)
- Assigned branch: none

## Scope

- Reformatted long Threat Codex stories into readable paragraph groups while preserving the authored localized prose.
- Added a shared Hangar launch chooser to both ship-selection launch paths.
- Exposed all seven supported launch contracts: Mayhem Tactical, Mayhem Pure, Daily Cabinet Signal, Scout Run, Sector Run, Overrun Tactical, and Overrun Pure.
- Preserved deterministic Daily loaners, saved Scout anomalies, earned Sector checkpoints, Overrun eligibility, selected-hull behavior, saves, balance, progression, achievements, leaderboard identities, and controller support.
- Localized the new chooser interface in all eight supported interface languages.

## Verification

- `check:codex-lore-layout` (including Sonia and Tyrian the Great)
- `check:codex-layout`
- `check:codex-tab-count-layout`
- `check:threat-codex`
- `check:ship-selector-start` (all seven launch contracts)
- `check:hangar-controller-details`
- `check:controller-flow`
- `check:run-modes`
- `check:i18n`
- `build:current`
- `check:i18n-ui` (all eight interface languages)
- `check:release-line`
- `check:steam-electron-bridge`
- `smoke`
- `package:steam:win`
- `check:steam-package-runtime`
- `desktop:smoke:current`
- `desktop:smoke:packaged` using explicit local-runtime mode
- `desktop:controls:packaged`
- `desktop:perf:packaged` (`58.14` minimum / `59.69` average FPS)
- `check:desktop-package`
- `check:packaged-steam-runtime-gate`
- `steamworks:payload-manifest`

SteamCMD reported: `[2026-07-26 16:10:44]: Successfully finished AppID 4765070 build (BuildID 24398974).`

Because `SetLive` was blank, this upload did not assign or move the public/default branch, a beta branch, or any Steamworks setting. No Steam branch rollback is required for this upload-only build. If it is manually assigned later, roll back by reassigning that branch to its prior desired BuildID in Steamworks.
