# Nova Swarm Steam Client Preflight Packet

Generated: 2026-05-18T05:15:54.057Z
Build: `v2026-05-18_06-55-34`
Status: `ready_for_steam_upload_and_client_validation`

This packet proves local upload preflight only. It is not Steam-client validation evidence.

## Local Payload

- Executable: `release/desktop/win-unpacked/Nova Swarm.exe`
- Product name: Nova Swarm
- Electron app id: app.novaswarm.game
- Packaged smoke report: `test-results/packaged-exe-smoke-2026-05-18T05-04-12-824Z/report.json`
- Packaged controls report: `test-results/packaged-control-smoke-2026-05-18T05-04-17-257Z/report.json`
- Full RC report: `test-results/steam-rc-verify-2026-05-18T04-28-43-110Z/report.json`

## SteamPipe

- Template: `release/steamworks/app_build_TEMPLATE.vdf`
- ContentRoot: `..\\desktop\\win-unpacked`
- Local VDF output: `release/steamworks/app_build_LOCAL.vdf`
- Write command: `STEAM_APP_ID=<id> STEAM_DEPOT_ID=<id> npm run steamworks:write-vdf`
- Upload command shape: `tools\\steamcmd\\steamcmd.exe +login <steamworks-user> +run_app_build release\\steamworks\\app_build_LOCAL.vdf +quit`

## Steam Client Validation Still Required

Copy `release/steamworks/client_validation_report.template.json` to `release/steamworks/client_validation_report.json` only after real SteamPipe upload and Steam-client install.

- installedFromSteamClient
- launchedFromSteamClient
- menuReached
- introAdvanceAndSkip
- keyboardRunControls
- gamepadRunControls
- audioFromSteamInstall
- localHighscoreSave
- settingsPersistence
- offlineLaunch
- steamClientScreenshotCaptured

## Artifacts

| Present | Path | Bytes |
| --- | --- | ---: |
| yes | `release/desktop/win-unpacked/Nova Swarm.exe` | 226666496 |
| yes | `release/steamworks/app_build_TEMPLATE.vdf` | 359 |
| yes | `release/steamworks/client_validation_report.template.json` | 771 |
| yes | `release/steamworks/desktop_package_review_report.json` | 2782 |
| yes | `release/steamworks/full_rc_verification_report.json` | 3440 |
| yes | `release/steamworks/steam_client_validation_runbook.md` | 3383 |
| yes | `docs/reviews/2026-05-17-steamcmd-local-check.md` | 854 |

## Warnings

- None
