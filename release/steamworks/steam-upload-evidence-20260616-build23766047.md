# Steam Upload Evidence - Build 23766047

Generated: 2026-06-16 18:01 Europe/Oslo

## Source

- Worktree: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Branch: `codex/hard-achievements-20260612`
- Commit uploaded: `c9ee63d16275d75397f0fe2708e0a0da25f7d7c0`
- Commit subject: `Add generated sector scenes and ship art stinger`
- Remote sync before packaging: `HEAD...origin/codex/hard-achievements-20260612 = 0 0`
- Steamworks untouched except local SteamPipe upload artifacts.

## Build Contents

- AppID: `4765070`
- DepotID: `4765071`
- Leaderboard identity verified: `nova_swarm_global_score_v2`
- Build version: `v2026-06-16_10-21-23`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Payload file count: `336`
- Payload bytes: `873122057`
- Payload manifest hash: `a1cbaa834cf021f60edad2b9a59f437da57f697f389b8957280e03ef79bf16bf`
- Executable SHA256: `abd8baef467bf2571440d6082543965b00f44f7f9f3e38ee53a957c85c7f0aeb`

## Local Checks

- `npm run check:release-line` - PASS
- `npm run build:current` - PASS
- `npm run smoke` - PASS (`test-results/smoke-2026-06-16T15-50-38-478Z/report.json`)
- `npm run desktop:smoke:current` - PASS (`test-results/electron-smoke-2026-06-16T15-52-43-456Z`)
- `npm run package:steam:win:current` - PASS
- `npm run desktop:smoke:packaged` - PASS (`test-results/packaged-exe-smoke-2026-06-16T15-56-37-916Z/report.json`)
- `npm run desktop:perf:packaged` - PASS (`test-results/packaged-perf-smoke-2026-06-16T15-57-16-240Z/report.json`)
- `npm run steamworks:write-vdf` - PASS

`build:current` included the new static guards:

- `check-generated-ship-art` - PASS (`sectorScenes=240`, `lateMayhem=177`)
- `check-sector-arrival-stinger` - PASS

## SteamPipe Upload

- VDF: `release/steamworks/app_build_LOCAL.vdf`
- `SetLive`: empty string, so no Steam branch was assigned by this upload.
- SteamCMD: `C:\SteamCMD\steamcmd.exe`
- Steam user: `gaunziman`
- Console log: `release/steamworks/steam_upload_console_20260616_c9ee63d.log`
- BuildID: `23766047`
- Depot manifest: `4105415191539731513`
- Baseline depot manifest: `4991392013300227928`
- SteamPipe result: `Successfully finished AppID 4765070 build (BuildID 23766047).`

## Branch Status

This upload did not set public/default live. The build is uploaded and available in Steamworks for manual branch assignment.

## Rollback

Because this run did not set a live/default branch, no player-facing rollback is required unless the build is manually assigned later.

If BuildID `23766047` is later assigned to a public/default Steam branch and must be rolled back, use Steamworks to set that branch back to the previous known-good BuildID or depot manifest. The immediate previous depot manifest in SteamPipe output was `4991392013300227928`.
