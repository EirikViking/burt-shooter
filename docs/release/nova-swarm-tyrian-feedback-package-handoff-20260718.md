# Nova Swarm Tyrian feedback package handoff

## Source and package

- Source commit: `8859d6bcae51bb8cd954fba9b6536c378312ef9f`
- Source branch: `codex/tyrian-feedback-followup-20260718`
- Build: `v2026-07-18_15-08-35`
- Windows payload: ignored local path `release/desktop/win-unpacked/`
- AppID: `4765070`
- Windows depot: `4765071`
- SteamPipe description: `Nova Swarm Tyrian feedback 8859d6b v2026-07-18_15-08-35 private unassigned`
- Generated upload VDF: ignored local path `release/steamworks/app_build_LOCAL.vdf`
- VDF branch setting: `"SetLive" ""`

## Package verification

- `npm run package:steam:win` passed.
- `npm run check:steam-package-runtime` passed.
- Packaged executable local-mode smoke passed.
- Packaged keyboard and virtual-gamepad controls passed.
- Packaged performance smoke passed with minimum `59.52 FPS` and average `59.98 FPS`.
- `npm run check:desktop-package` passed in explicit local mode.
- Live Steam initialization was not claimed because the Steam client was not running.

## Upload state

The external execution approval gate rejected the SteamCMD transfer before it started. No package data was uploaded, no Steam BuildID was created, and no Steam branch was assigned or changed. Resume only after explicit upload re-authorization following that risk notice, using the existing generated VDF and verifying again that `SetLive` is blank.
