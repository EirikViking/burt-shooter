# Steam Upload Evidence - Cinematic Menu Motion Polish

- Upload date: 2026-06-18
- Steam account: gaunziman
- AppID: 4765070
- DepotID: 4765071
- BuildID: 23802017
- Depot manifest: 4793512219779198335
- Source commit packaged: 222c7d1651f9f7a4077ac1b31a64fb05b7dedf5d
- Source commit short SHA reported by packaged smoke: 222c7d1
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
[2026-06-18 13:58:30]: Starting AppID 4765070 build (flags 0x0).
[2026-06-18 13:58:30]: Building depot 4765071...
[2026-06-18 14:00:10]: Successfully finished AppID 4765070 build (BuildID 23802017).
```

Depot log proof:

```text
[2026-06-18 13:58:30]: Found 398 files (837 MB) for depot 4765071
[2026-06-18 14:00:03]: Summary: 0 files added (0 bytes), 2 files changed (12.89 MB), 0 files removed (0 bytes)
[2026-06-18 14:00:09]: Success! New manifestID 4793512219779198335 created and 8 new chunks uploaded.
```

## Verification Summary

Passed before upload:

- git diff --check
- npm run check:release-line
- npm run check:i18n
- npm run check:i18n-ui
- npm run check:cinematic-hangar-menu
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

Known pre-upload failure:

- npm run smoke failed at `scripts/smoke-playtest.mjs:764:26` with `page.waitForFunction: Timeout 15000ms exceeded` after `10-level3-gameplay.png`.
- Upload proceeded only after the user explicitly requested: "upload to steam".

## Package SHA Proof

Packaged smoke report:

- Path: test-results/packaged-exe-smoke-2026-06-18T10-35-51-479Z/report.json
- Status: passed
- Build: v2026-06-18_12-30-48
- gitSha: 222c7d1
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
