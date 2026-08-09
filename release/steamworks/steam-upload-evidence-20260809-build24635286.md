# Nova Swarm Steam upload evidence

Date: 2026-08-09

AppID: `4765070`

Depot: `4765071`

BuildID: `24635286`

Depot manifest: `8600931996044792337`

Source branch: `codex/tyrian-112-20260809-c7e1`

Packaged source commit: `5e6091b028e5ced60d8ff4a311d8e1684fe307ed`

Implementation baseline: `14525f1` (`Polish combat clarity and results presentation`)

Previous branch build at final Steamworks verification: `24632116` from source `7dfc30a`

VDF: `release/steamworks/app_build_LOCAL.vdf`

## SteamPipe result

- SteamCMD logged in using the existing cached `gaunziman` credentials.
- SteamCMD exited `0` and reported: `Successfully finished AppID 4765070 build (BuildID 24635286)`.
- Depot `4765071` produced manifest `8600931996044792337`.
- `SetLive` was empty (`"SetLive" ""`), so no public/default/beta branch was assigned or moved.
- The signed-in Steamworks Builds page independently showed `24635286` as the newest row with an empty Current field and `-- Select an app branch --` still selected. The existing `default` and `sector-continue-test` branches both remained on `24632116`; no Preview Change or branch update was performed.
- App build log: `release/steam-build-output/app_build_4765070.log`.
- Depot build log: `release/steam-build-output/depot_build_4765071.log`.

## Packaged payload

- Files: `410`.
- Total bytes: `1174720626`.
- `Nova Swarm.exe` bytes: `226698752`.
- `Nova Swarm.exe` SHA-256: `8DAB1F0CCAF120C158E8A926223DEBC5A527C011048C24091743F37DF76AE37F`.
- Packaged executable smoke: `test-results/packaged-exe-smoke-2026-08-09T02-54-49-596Z/report.json`.
- The packaged smoke reported `gitSha: 5e6091b`, Steam bridge `ready`, native module loaded, AppID `4765070`, leaderboard `nova_swarm_global_score_v2`, achievements ready, and Steam Cloud diagnostics passing.
- The isolated worktree initially lacked the ignored Steam SDK and the first package attempt stopped before packaging or upload. Only the official `redistributable_bin` tree from the verified authoritative project was copied locally, with required DLL hashes verified, and the complete package command then passed.
- Unlike the previous payload, this package contains only the required Steam API redistributables. SteamPipe recorded removal of `760` old SDK tooling files (`179.58 MB`) and emitted no unwanted-SDK-tool warning.

## Release gates and QA

- `npm run check:release-line` passed immediately before packaging and again while writing the VDF.
- `npm run package:steam:win:current` passed, including Steam SDK readiness, Electron packaging, native runtime staging, and packaged Steam runtime validation.
- The post-commit `npm run build:current` passed and embedded source `5e6091b`.
- `npm run check:i18n`, `npm run check:i18n-ui`, `npm run check:controller-flow`, `npm run check:steam-electron-bridge`, browser smoke, desktop smoke, and `npm run qa:release` passed.
- Focused gameplay checks passed for Focus Lens, keyboard bindings, rank progression, powerup balance/effects, Magnet, Tactical Draft, Tactical Fusions, How to Play, Cabinet Wonders, and the Sector 130 performance stress matrix.
- Dedicated Special Fire regression coverage proved that a valid Bomb lock consumes the Bomb while Toggle remains latched and a simultaneously ready Graze Break remains banked.
- Visual QA covered Focus projectile clarity, Magnet staging, one-card Tactical Draft, localized How to Play and Settings, and Cabinet Wonder presentation.

## Rollback

Because `SetLive` was blank, this upload changed no Steam branch and requires no live-branch rollback. If BuildID `24635286` is assigned manually later, BuildID `24632116` is the verified prior branch build.
