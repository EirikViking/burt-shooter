# Nova Swarm Steam Client Preflight Packet

Generated: 2026-05-18T21:54:24.249Z
Build: `v2026-05-18_23-27-36`
Status: `ready_for_steam_upload_and_client_validation`

This packet proves local upload preflight only. It is not Steam-client validation evidence.

## Local Payload

- Executable: `release/desktop/win-unpacked/Nova Swarm.exe`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Payload files: 74
- Payload SHA-256 manifest hash: `b446d1cd34bd88611adf90cdcbf5122750270cb9cf68a50ecc8fc301efde236c`
- Product name: Nova Swarm
- Electron app id: app.novaswarm.game
- Packaged smoke report: `test-results/packaged-exe-smoke-2026-05-18T21-36-18-902Z/report.json`
- Packaged controls report: `test-results/packaged-control-smoke-2026-05-18T21-36-55-580Z/report.json`
- Full RC report: `test-results/steam-rc-verify-2026-05-18T21-34-54-911Z/report.json`

## SteamPipe

- Template: `release/steamworks/app_build_TEMPLATE.vdf`
- ContentRoot: `..\\desktop\\win-unpacked`
- Local VDF output: `release/steamworks/app_build_LOCAL.vdf`
- Write command: `STEAM_APP_ID=<id> STEAM_DEPOT_ID=<id> npm run steamworks:write-vdf`
- Upload command shape: `tools\\steamcmd\\steamcmd.exe +login <steamworks-user> +run_app_build release\\steamworks\\app_build_LOCAL.vdf +quit`

## Steam Client Validation Still Required

After real SteamPipe upload and Steam-client install, either copy `release/steamworks/client_validation_report.template.json` to `release/steamworks/client_validation_report.json` manually or run:

`STEAM_CLIENT_VALIDATION_CONFIRM=I_REVIEWED_STEAM_CLIENT_BUILD STEAM_CLIENT_ALL_CHECKS_PASSED=YES STEAM_BUILD_ID=<steam build id> STEAM_VALIDATED_BY=<name> STEAM_INSTALL_PATH=<steam install path> STEAM_SCREENSHOT_EVIDENCE=<screenshot path> npm run steamworks:write-client-validation`

Only use that command after testing the Steam-installed build.

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
| yes | `release/steamworks/steam_payload_manifest.json` | 15372 |
| yes | `release/steamworks/app_build_TEMPLATE.vdf` | 359 |
| yes | `release/steamworks/client_validation_report.template.json` | 994 |
| yes | `release/steamworks/desktop_package_review_report.json` | 2516 |
| yes | `release/steamworks/full_rc_verification_report.json` | 3536 |
| yes | `release/steamworks/steam_client_validation_runbook.md` | 3902 |
| yes | `docs/reviews/2026-05-17-steamcmd-local-check.md` | 854 |

## Warnings

- None
