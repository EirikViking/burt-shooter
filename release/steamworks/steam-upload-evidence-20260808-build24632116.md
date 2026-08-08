# Nova Swarm Steam upload evidence

Date: 2026-08-08

AppID: `4765070`

Depot: `4765071`

BuildID: `24632116`

Source branch: `codex/footage-polish-20260808-7c4e`

Source HEAD: `7dfc30aae46a95b178241eeadbff508f2c1ac5fc`

VDF: `release/steamworks/app_build_LOCAL.vdf`

## SteamPipe result

- SteamCMD logged in using the existing cached `gaunziman` credentials.
- AppID `4765070` and depot `4765071` uploaded successfully.
- SteamCMD reported: `Successfully finished AppID 4765070 build (BuildID 24632116)`.
- `SetLive` was empty (`"SetLive" ""`); no public/default/beta branch was assigned or moved.
- SteamCMD log: `release/steam-build-output/app_build_4765070.log`.

## Pre-upload gates

- `npm run check:release-line` passed.
- Steam SDK readiness passed.
- `npm run package:steam:win:current` passed.
- Steam package runtime passed for AppID `4765070` and leaderboard `nova_swarm_global_score_v2`.
- Packaged executable smoke passed: `test-results/packaged-exe-smoke-2026-08-08T19-25-47-174Z/report.json`.
- Packaged controls smoke passed: `test-results/packaged-control-smoke-2026-08-08T19-25-58-888Z/report.json`.

SteamCMD emitted its existing warnings about SDK tooling files present in the staged payload (`steam_appid.txt`, `steamservice.exe`, `steamclient.dll`, `steamclient64.dll`, and `steamcmd.exe`). The upload completed successfully; this remains a packaging-cleanup item before any future branch assignment.
