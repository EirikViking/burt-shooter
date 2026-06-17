# Steam Upload Evidence - Performance Rescue Candidate

- Timestamp: 2026-06-17T00:24:38Z upload completion, local Europe/Oslo 2026-06-17 02:24:38
- Repo path: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Branch: `recovery/performance-rescue-20260616`
- Source commit packaged into Steam build: `bb28cdab2f414c0de26f8022653f864807ca4dfb`
- Required rescue commit contained by source: `26f6712e7acf4ecc60a3dafda7b3e77382209877`
- Previous wrong BuildID: `23768418`
- New SteamPipe BuildID: `23773181`
- Steam AppID: `4765070`
- Windows depot ID: `4765071`
- Leaderboard preserved: `nova_swarm_global_score_v2`
- Steam branch/live assignment: none; VDF used `SetLive ""`
- Public/default changed by this upload: no
- Test/beta/staging/preview branch assigned by this upload: no

## Source Proof

- `git branch --show-current` -> `recovery/performance-rescue-20260616`
- `git rev-parse HEAD` before packaging/evidence -> `bb28cdab2f414c0de26f8022653f864807ca4dfb`
- `git merge-base --is-ancestor 26f6712e7acf4ecc60a3dafda7b3e77382209877 HEAD` -> exit code `0`
- Source commit is not `2b40f988e8b7b1c6851bb6088d3a5c348cc6f38b`.
- Source branch is not `codex/hard-achievements-20260612`.
- The exact checked rescue diff was `git diff --stat 2b40f988e8b7b1c6851bb6088d3a5c348cc6f38b..HEAD`.
- Rescue files present in `HEAD`:
  - `src/config/PerformanceFlags.js`
  - `src/config/GeneratedEnemyProfiles.js`
  - `src/utils/GameAssets.js`
  - `src/scenes/PlayScene.js`
  - `scripts/check-gameplay-performance-analysis.mjs`

## Checks Run

- `git fetch --all --prune` -> pass
- `pwd` / `Get-Location` -> `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- `git status --short --branch` before package -> clean on `recovery/performance-rescue-20260616`
- `git worktree list` -> current worktree on `recovery/performance-rescue-20260616`
- `git log --oneline --decorate -n 30` -> showed `bb28cda`, `07a74fb`, `80d7a6c`, `26f6712`, then hard-achievements history
- `git diff --check` -> pass
- `npm run check:release-line` -> pass
- `npm run check:gameplay-performance-analysis` -> pass, report `test-results/gameplay-performance-analysis-2026-06-17T00-11-33-484Z`
- `npm run check:sector-arrival-spawn-delay` -> pass, report `test-results/sector-arrival-spawn-delay-2026-06-17T00-13-46-397Z`
- `npm run check:enemy-movement-smoothing` -> pass
- `npm run check:sector-arrival-stinger` -> pass
- `npm run check:late-enemy-mayhem` -> pass
- `npm run check:generated-rosters` -> pass
- `npm run check:generated-ship-art` -> pass
- `npm run build:current` -> pass
- `npm run package:steam:win` -> pass
- `npm run desktop:smoke:packaged` -> pass, report `test-results/packaged-exe-smoke-2026-06-17T00-19-34-819Z/report.json`
- `npm run desktop:perf:packaged` -> pass, report `test-results/packaged-perf-smoke-2026-06-17T00-20-20-866Z/report.json`
  - Min FPS: `59.99999999999999`
  - Average FPS: `59.99999999999999`
  - Errors: `0`
  - Warning note: `capturePage retry recovered after: UnknownVizError`
- `npm run steamworks:payload-manifest` -> pass
- `npm run steamworks:write-vdf` with `STEAM_APP_ID=4765070`, `STEAM_DEPOT_ID=4765071`, `STEAM_SET_LIVE=""` -> pass

## Package Proof

- Package command: `npm run package:steam:win`
- Package output path: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\desktop\win-unpacked`
- Packaged executable: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\desktop\win-unpacked\Nova Swarm.exe`
- Packaged build: `v2026-06-17_02-15-25`
- Packaged smoke git SHA: `bb28cda`
- Packaged smoke AppID: `4765070`
- Packaged smoke leaderboard: `nova_swarm_global_score_v2`
- Packaged smoke console events: `0`

## Payload Manifest

- Path: `release/steamworks/steam_payload_manifest.json`
- Content root: `release/desktop/win-unpacked`
- File count: `336`
- Total bytes: `873138188`
- Manifest hash: `882334ec14ac30085704f61e55605e76c5e2c864933aaf8c66def825863f2600`
- Executable SHA-256: `8125d0507dd9e01f17e2e8d04b79d2fc8286bdd57f06cee1796ec133db20af98`

## VDF Proof

- VDF path: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf`
- `AppID` -> `4765070`
- `ContentRoot` -> `..\desktop\win-unpacked`
- Depot -> `4765071`
- `DepotPath` -> `.`
- `SetLive` -> `""`
- No `SetLive "default"`.
- No `SetLive "public"`.
- No `SetLive "test"`.
- No `SetLive "beta"`.
- No `SetLive "staging"`.
- No `SetLive "preview"`.
- No named branch assignment was present.

## SteamPipe Upload

- SteamCMD path: `C:\steamcmd\steamcmd.exe`
- SteamCMD user: `gaunziman`
- SteamCMD command:
  - `C:\steamcmd\steamcmd.exe +login gaunziman +run_app_build D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf +quit`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 23773181).`
- App build log: `release/steam-build-output/app_build_4765070.log`
- Depot build log: `release/steam-build-output/depot_build_4765071.log`
- Depot manifest ID: `435722587123880968`
- Depot summary: `0 files added`, `2 files changed`, `0 files removed`, `6 new chunks uploaded`
- Confirmed BuildID is not `23768418`.

## Steamworks Safety

- No AppID change.
- No depot ID change.
- No achievements change.
- No leaderboard identity change.
- No store metadata change.
- No visibility change.
- No Steam branch assignment.
- No public/default assignment.
- No test/beta/staging/preview assignment.
- `nova_swarm_global_score_v2` remains packaged and verified.

## Manual Steam Test Instructions

- Assign BuildID `23773181`, not `23768418`.
- Assign it only to your chosen Steam test branch.
- Do not assign it to public/default.
- Launch Nova Swarm from Steam on that test branch.
- Test Sector 1 -> 2.
- Test Sector 4 -> 5.
- Test Sector 5 Challenge.
- Test Sector 19 -> 20 if possible.
- Cold restart and repeat.
- Compare feel against current public/default.

## Rollback / Ignore Instructions

- `23768418`: ignore; do not assign for the performance rescue.
- `23773181`: if bad after manual test assignment, remove it from the test branch or switch the test branch back to the previous known-good BuildID.
- Source rollback if this rescue source needs reverting: `git revert 26f6712e7acf4ecc60a3dafda7b3e77382209877`
- Evidence rollback after the evidence commit exists: `git revert <evidence_commit_hash>`
