# Nova Swarm Steam Client Validation Runbook

Status on 2026-05-17: not complete. The Windows package exists locally and local SteamCMD now runs, but Steam client validation still requires real Steamworks app/depot IDs and a credentialed upload.

## Current Local Evidence

- Package output exists at `release/desktop/win-unpacked/`.
- Launch executable exists at `release/desktop/win-unpacked/Nova Swarm.exe`.
- Packaged executable smoke rehearsal is now automated with `npm run desktop:smoke:packaged`.
- Packaged controls rehearsal is now automated with `npm run desktop:controls:packaged`, covering keyboard movement/fire/pause plus virtual gamepad movement/fire/pause from the packaged payload.
- Steam upload/client-test preflight is summarized by `npm run steamworks:client-preflight`.
- Latest known package verification remains documented in `docs/steam-desktop-package.md`.
- Local SteamCMD availability is documented in `docs/reviews/2026-05-17-steamcmd-local-check.md`.

## Required Steamworks Inputs

Fill these before upload:

- Steam app ID: `TBD`
- Windows depot ID: `TBD`
- Branch target: `default`, `beta`, or a private release-candidate branch
- Launch option: `Nova Swarm.exe`
- Steam Cloud decision: local-only for v1.0 unless explicitly enabled
- Achievements decision: defer unless explicitly scoped
- Steam Input/controller metadata: keyboard, gamepad, and touch are supported in-game; Steam metadata still needs setup in Steamworks

## Upload Steps

1. Install or locate SteamCMD.
2. Generate an untracked credentialed VDF:

```powershell
$env:STEAM_APP_ID='<steam app id>'
$env:STEAM_DEPOT_ID='<windows depot id>'
npm run steamworks:write-vdf
```

3. Inspect `release/steamworks/app_build_LOCAL.vdf` and confirm the IDs.
4. Confirm `ContentRoot` still points at `..\\desktop\\win-unpacked`.
5. Run SteamCMD with the credentialed VDF.

Example command shape:

```powershell
.\tools\steamcmd\steamcmd.exe +login <steamworks_user> +run_app_build .\release\steamworks\app_build_LOCAL.vdf +quit
```

Do not commit `app_build_LOCAL.vdf` if it contains private app IDs, branch names, or credentials.

## Client Validation Checklist

Run these from an installed Steam client build, not from the local unpacked folder:

- Install build from Steam client.
- Launch through Steam.
- Confirm the game reaches the menu.
- Confirm the optional Story Intro opens from the main menu, can advance, and can skip back to the menu.
- Start a run, shoot, dodge, pause, and resume with keyboard.
- Repeat movement/fire/pause with a gamepad.
- Confirm SFX, voice, and music play from Steam install path.
- Confirm local high-score save works after game over.
- Quit and relaunch; confirm settings/high-score persistence.
- Launch once while offline or with network disabled; confirm local play and high-score fallback.
- Capture one Steam-client screenshot for evidence.

## Completion Evidence To Save

- SteamPipe upload output or build ID.
- Steam client install path and launch result.
- Screenshot of the Steam-installed build at menu or gameplay.
- Notes for keyboard, gamepad, audio, high-score persistence, offline launch, and quit/relaunch.
- After all checks pass, write the validation report with the guarded helper:

```powershell
$env:STEAM_CLIENT_VALIDATION_CONFIRM='I_REVIEWED_STEAM_CLIENT_BUILD'
$env:STEAM_CLIENT_ALL_CHECKS_PASSED='YES'
$env:STEAM_BUILD_ID='<steam build id>'
$env:STEAM_VALIDATED_BY='<name>'
$env:STEAM_INSTALL_PATH='<steam install path>'
$env:STEAM_SCREENSHOT_EVIDENCE='<path to Steam-client screenshot evidence>'
npm run steamworks:write-client-validation
```

- Alternatively, copy `release/steamworks/client_validation_report.template.json` to `release/steamworks/client_validation_report.json`, record the real Steam build ID, and set every validation check to `true`.

This remains a hard Steam-readiness blocker until the client-installed build is verified.
