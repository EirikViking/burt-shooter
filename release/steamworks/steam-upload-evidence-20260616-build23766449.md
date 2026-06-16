# Steam Upload Evidence - Build 23766449

Generated: 2026-06-16 18:23 Europe/Oslo

## Source

- Worktree: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Branch: `codex/hard-achievements-20260612`
- Commit uploaded: `4e44d8c87d46ab5043ec29c5d9e60230ec5c275e`
- Commit subject: `Double sector arrival stinger duration`
- Remote sync before packaging: `HEAD...origin/codex/hard-achievements-20260612 = 0 0`
- Change scope: sector arrival stinger timing only.

## Change

- Normal sector arrival stinger duration: `1200ms` -> `2400ms`
- Post-boss sector arrival stinger duration: `1480ms` -> `2960ms`

## Build Contents

- AppID: `4765070`
- DepotID: `4765071`
- Leaderboard identity verified: `nova_swarm_global_score_v2`
- Build version: `v2026-06-16_10-21-23`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Payload file count: `336`
- Payload bytes: `873122057`
- Payload manifest hash: `9bcd538c13ff27fe9e175be4a90200c1917cb4bf2f35a22741da8ce58432396e`
- Executable SHA256: `79b8f7d41675764ddbc60eb281c574860615bc5ca7c87f49541903a53b0a002d`

## Checks Run

- `npm run check:sector-arrival-stinger` - PASS
- `npm run check:release-line` - PASS
- `npm run build:current` - PASS
- `npm run package:steam:win:current` - PASS
- `npm run steamworks:write-vdf` - PASS

Full smoke was intentionally not run per request.

## SteamPipe Upload

- VDF: `release/steamworks/app_build_LOCAL.vdf`
- `SetLive`: empty string; no public/default branch assignment was made.
- SteamCMD: `C:\SteamCMD\steamcmd.exe`
- Steam user: `gaunziman`
- Console log: `release/steamworks/steam_upload_console_20260616_4e44d8c.log`
- BuildID: `23766449`
- Depot manifest: `6127930800456202740`
- Baseline depot manifest: `4991392013300227928`
- SteamPipe result: `Successfully finished AppID 4765070 build (BuildID 23766449).`

## Rollback

Because this upload left `SetLive` empty, no Steam branch was changed by this run.

If BuildID `23766449` is later assigned to a live branch and must be rolled back, set that branch back to the previous known-good BuildID in Steamworks. The SteamPipe baseline depot manifest reported for this upload was `4991392013300227928`.
