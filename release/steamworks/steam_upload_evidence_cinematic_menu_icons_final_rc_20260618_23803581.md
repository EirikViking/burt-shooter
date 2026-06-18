# Steam Upload Evidence - Cinematic Menu Icons Final RC

- Upload date: 2026-06-18
- Steam account: gaunziman
- AppID: 4765070
- DepotID: 4765071
- BuildID: 23803581
- Depot manifest: 5897673778580686701
- Source commit packaged: 90bdca398183f37ce4ce7ea54b478c562b6bb72f
- Source commit short SHA reported by packaged smoke: 90bdca3
- Evidence commit: post-upload evidence only
- VDF: release/steamworks/app_build_LOCAL.vdf
- SetLive: blank, `"SetLive" ""`
- Branch assignment: none in VDF; build uploaded for manual Steamworks assignment
- Steamworks metadata changes: none
- Leaderboard name: nova_swarm_global_score_v2
- Local package path: release/desktop/win-unpacked/Nova Swarm.exe

## Upload Proof

SteamCMD completed successfully:

```text
[2026-06-18 15:32:30]: Starting AppID 4765070 build (flags 0x0).
[2026-06-18 15:32:30]: Building depot 4765071...
[2026-06-18 15:34:16]: Successfully finished AppID 4765070 build (BuildID 23803581).
```

Depot log proof:

```text
[2026-06-18 15:32:31]: Found 398 files (837 MB) for depot 4765071
[2026-06-18 15:34:07]: Summary: 0 files added (0 bytes), 2 files changed (13.39 MB), 0 files removed (0 bytes)
[2026-06-18 15:34:15]: Success! New manifestID 5897673778580686701 created and 15 new chunks uploaded.
```

## Verification Summary

Passed before upload:

- git diff --check
- npm run check:release-line
- npm run check:i18n
- npm run check:i18n-ui
- npm run check:cinematic-hangar-menu
- npm run check:cinematic-hangar-menu-icons
- npm run check:sector-challenge-selector
- npm run check:controller-flow
- npm run check:steam-electron-bridge
- npm run check:powerup-assets
- npm run check:powerup-visuals
- npm run check:codex-layout
- npm run check:threat-codex
- npm run build:current
- npm run package:steam:win
- npm run package:steam:win:current
- npm run desktop:smoke:packaged
- npm run desktop:smoke:current
- npm run desktop:perf:current
- npm run smoke

## Smoke Investigation

- The previous broad smoke timeout after `10-level3-gameplay.png` was investigated before this polish pass.
- `npm run smoke` passed twice before menu/icon changes and passed again after the final RC changes.
- The final smoke report included the wave transition and boss victory steps with no failures, console warnings, page errors, or bad responses.
- One packaged smoke run timed out during packaged window load before report creation; a clean standalone rerun passed. The packaged runtime report below is the passing report used for upload proof.

## Package SHA Proof

Packaged smoke report:

- Path: test-results/packaged-exe-smoke-2026-06-18T13-29-08-985Z/report.json
- Status: passed
- Build: v2026-06-18_15-21-13
- gitSha: 90bdca3
- AppID: 4765070
- Leaderboard: nova_swarm_global_score_v2

## VDF Proof

The uploaded VDF contained:

```text
"AppID" "4765070"
"BuildOutput" "..\\steam-build-output"
"ContentRoot" "..\\desktop\\win-unpacked"
"SetLive" ""
"4765071"
```

No Steam branch was assigned by this upload.
