# Steam Upload Evidence - Build 23767198

Generated: 2026-06-16
Worktree: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
Branch: `codex/hard-achievements-20260612`
Starting HEAD: `313b90e3d7e5d28c2fe9c3de61749ff25427af47`
AppID: `4765070`
DepotID: `4765071`
Leaderboard preserved: `nova_swarm_global_score_v2`

## Change Summary

- Made the visible Threat Codex entry scrollbar interactive with click-to-jump and drag-to-scroll.
- Made the visible Threat Codex detail scrollbar interactive for long dossier text.
- Made the visible Achievements scrollbar interactive with click-to-jump and drag-to-scroll.
- Preserved wheel, keyboard, controller, menu layout, Codex identity, achievements, Steam IDs, and leaderboard identity.

## Checks

- `git diff --check` - PASS
- `npm run check:menu-scrollbars` - PASS
  - Evidence: `test-results/menu-scrollbars-2026-06-16T16-59-49-424Z/report.json`
  - Codex drag moved list start from `0` to `1889`
  - Achievements drag moved scroll offset from `0` to `69`
- `npm run build:current` - PASS
- `npm run package:steam:win:current` - PASS
- `STEAM_APP_ID=4765070 STEAM_DEPOT_ID=4765071 STEAM_SET_LIVE="" npm run steamworks:write-vdf` - PASS
- `npm run steamworks:payload-manifest` - PASS

## Package Evidence

- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Content root: `release/desktop/win-unpacked`
- Executable SHA-256: `49cf15d299c55f23fd75ef896ab6eac51ac1f2c94639911e09252ea94cb29513`
- Payload manifest hash: `e56058dba4c65762b5d8063387a95049715006e615bc8713615b746abcdbef15`
- Packaged file count: `336`
- Packaged total bytes: `873132154`

## SteamPipe Upload

- VDF: `release/steamworks/app_build_LOCAL.vdf`
- `SetLive`: empty string
- SteamCMD: `C:\SteamCMD\steamcmd.exe`
- SteamCMD user: `gaunziman`
- Console log: `release/steamworks/steam_upload_console_20260616_menu_scrollbars.log`
- App build log: `release/steam-build-output/app_build_4765070.log`
- Depot build log: `release/steam-build-output/depot_build_4765071.log`
- BuildID: `23767198`
- Depot manifest ID: `3383234237943266886`

SteamCMD completed with exit code 0:

```text
[2026-06-16 19:06:29]: Successfully finished AppID 4765070 build (BuildID 23767198).
```

Depot log summary:

```text
Changed: "Nova Swarm.exe" 221386 KB size, 1024 KB changed
Changed: "resources\app.asar" 462503 KB size, 93777 KB changed
Summary: 0 files added (0 bytes), 2 files changed (92.58 MB), 0 files removed (0 bytes)
Success! New manifestID 3383234237943266886 created and 7 new chunks uploaded.
```

## Branch Status

Because `SetLive` was empty, this upload did not assign the build to public/default or any other Steam branch. Manual Steamworks action is still required to test or publish this build.

## Rollback

- Before manual live assignment: no Steam rollback is required; leave BuildID `23767198` unassigned.
- If BuildID `23767198` is manually assigned and must be rolled back: in Steamworks App Admin, select the target branch and set it back to previous known uploaded build `23766886`, or another verified build.
- Source rollback after this commit: `git revert <commit-hash>`.
