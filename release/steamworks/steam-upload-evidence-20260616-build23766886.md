# Steam Upload Evidence - Build 23766886

Generated: 2026-06-16
Worktree: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
Branch: `codex/hard-achievements-20260612`
Starting HEAD: `c6bc89e2ab4f5d96b41fa2d7165ed9ff5f1a3a35`
AppID: `4765070`
DepotID: `4765071`
Leaderboard preserved: `nova_swarm_global_score_v2`

## Change Summary

- Prewarmed sector arrival art through a cache before level entry.
- Prepared sector art and incoming generated enemy/elite textures through Pixi renderer prepare to reduce first-render GPU upload hitches.
- Suppressed the sector arrival stinger for the run's starting sector:
  - classic/ranked run sector 1
  - Sector Start challenge initial play sector
- Kept sector arrival stingers enabled for later sector advances.

## Checks

- `npm run check:sector-arrival-stinger` - PASS
- `npm run build:current` - PASS
- `npm run check:release-line` - PASS
- `npm run desktop:perf:current` - PASS
  - min FPS: `60.0`
  - avg FPS: `60.0`
  - warnings: `capturePage retry recovered after: UnknownVizError`
  - errors: none
- `npm run package:steam:win:current` - PASS
- `STEAM_APP_ID=4765070 STEAM_DEPOT_ID=4765071 STEAM_SET_LIVE="" npm run steamworks:write-vdf` - PASS
- `npm run steamworks:payload-manifest` - PASS

## Package Evidence

- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Content root: `release/desktop/win-unpacked`
- Executable SHA-256: `050fe4a3d2bb7dbcf4a878da09b87c9930bbdd4664d68cc0e0b19d91cdd5fe19`
- Payload manifest hash: `b9d7d3bffb262d7c1edc82980d4692f65d1567bc1dc7619ad6130653e2b7c910`
- Packaged file count: `336`
- Packaged total bytes: `873126903`

## SteamPipe Upload

- VDF: `release/steamworks/app_build_LOCAL.vdf`
- `SetLive`: empty string
- SteamCMD: `C:\SteamCMD\steamcmd.exe`
- SteamCMD user: `gaunziman`
- Console log: `release/steamworks/steam_upload_console_20260616_perf_prewarm.log`
- App build log: `release/steam-build-output/app_build_4765070.log`
- Depot build log: `release/steam-build-output/depot_build_4765071.log`
- BuildID: `23766886`
- Depot manifest ID: `6595734140020935485`

SteamCMD completed with exit code 0:

```text
[2026-06-16 18:48:18]: Successfully finished AppID 4765070 build (BuildID 23766886).
```

Depot log summary:

```text
Changed: "Nova Swarm.exe" 221386 KB size, 1024 KB changed
Changed: "resources\app.asar" 462498 KB size, 93771 KB changed
Summary: 0 files added (0 bytes), 2 files changed (92.57 MB), 0 files removed (0 bytes)
Success! New manifestID 6595734140020935485 created and 7 new chunks uploaded.
```

## Branch Status

Because `SetLive` was empty, this upload did not assign the build to public/default or any other Steam branch. Manual Steamworks action is still required to test or publish this build.

## Rollback

- Before manual live assignment: no Steam rollback is required; leave BuildID `23766886` unassigned.
- If BuildID `23766886` is manually assigned and must be rolled back: in Steamworks App Admin, select the target branch and set it back to the previous known uploaded build, `23766449`, or another verified build.
- Source rollback after this commit: `git revert <commit-hash>`.
