# Nova Swarm Private Steam Build - June 13, 2026

Status: uploaded privately to SteamPipe. No live branch was set.

## Build

- Steam AppID: `4765070`
- Windows depot: `4765071`
- Steam BuildID: `23719163`
- Package version: `v2026-06-13_19-46-50`
- VDF: `release/steamworks/app_build_LOCAL.vdf`
- `SetLive`: empty string
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- SteamCMD log: `test-results/steam-upload-leaderboard-clarity-20260613-195435/steamcmd.log`

## Scope

This build includes the global leaderboard clarity fix from commit `c9aadd754afa99b3585d89522b467ffeebfbb9f8`.

Global and friends leaderboards no longer show score-derived `LV` chips. Local rows still show trusted level data, and sector challenge rows still show start-sector data.

## Verification

- `npm run check:release-line`
- `npm run package:steam:win`
- `npm run desktop:smoke:packaged`
- `npm run steamworks:payload-manifest`
- `STEAM_APP_ID=4765070 STEAM_DEPOT_ID=4765071 STEAM_SET_LIVE="" npm run steamworks:write-vdf`
- SteamCMD upload via cached `gaunziman` credentials

SteamCMD reported:

```text
Successfully finished AppID 4765070 build (BuildID 23719163).
```

## Rollback

Because this build was uploaded with `SetLive ""`, no public branch pointer was changed. If this build is assigned manually in Steamworks and needs to be rolled back, reassign the target branch to the previous desired BuildID in Steamworks.
