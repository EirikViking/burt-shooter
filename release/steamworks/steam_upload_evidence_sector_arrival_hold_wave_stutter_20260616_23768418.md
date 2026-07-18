# Steam Upload Evidence - Sector Arrival Hold And Wave Entry Stutter

- Date: 2026-06-16
- Worktree: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Branch: `codex/hard-achievements-20260612`
- Source commit packaged: `2b40f988e8b7b1c6851bb6088d3a5c348cc6f38b`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Leaderboard preserved: `nova_swarm_global_score_v2`
- SteamPipe BuildID: `23768418`
- Steam branch/live assignment: none; VDF used `SetLive ""`

## Fixes Included

- Prevented delayed sector arrivals from inheriting stale `LEVEL_COMPLETE` state while the stinger is playing.
- Added `LEVEL_ENTRY_HOLD` before delayed enemy release so a new run cannot auto-advance through multiple sectors.
- Spread enemy wave construction across short frame chunks while preserving entry timing and visual quality.
- Extended regression/performance checks to cover stale-complete sector arrival and next-wave fly-in frame timing.

## Validation

- `git fetch --all --prune`
- `git status --short --branch`
- `git rev-list --left-right --count HEAD...origin/codex/hard-achievements-20260612` -> `0 0`
- `npm run check:sector-arrival-spawn-delay`
  - Evidence: `test-results/sector-arrival-spawn-delay-2026-06-16T17-57-28-740Z/report.json`
- `npm run check:gameplay-performance-analysis`
  - Evidence: `test-results/gameplay-performance-analysis-2026-06-16T18-03-07-563Z/report.json`
  - Sector 1 next-wave entry p95: `16.8ms`, frames >33ms: `0`
  - Sector 2 next-wave entry p95: `16.8ms`, frames >33ms: `0`
  - Sector 20 next-wave entry p95: `16.8ms`, frames >33ms: `0`
- `npm run check:enemy-movement-smoothing`
- `npm run check:release-line`
- `npm run build:current`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run package:steam:win`
- `npm run desktop:smoke:packaged`
  - Evidence: `test-results/packaged-exe-smoke-2026-06-16T18-23-37-197Z/report.json`
  - Packaged build: `v2026-06-16_20-18-33`, git `2b40f98`
- `npm run desktop:perf:packaged`
  - Evidence: `test-results/packaged-perf-smoke-2026-06-16T18-24-18-304Z/report.json`
  - Min FPS `59.523809523824994`, average FPS `59.95736269598559`, warnings `0`, errors `0`
- `npm run steamworks:payload-manifest`
  - Evidence: `release/steamworks/steam_payload_manifest.json`
  - Files `336`, bytes `873136349`, manifest hash `837922393d6f56c234a2dc7b053d910e4c84995778e5dd880d2ee9ddce6489c1`
- `STEAM_APP_ID=4765070 STEAM_DEPOT_ID=4765071 STEAM_SET_LIVE="" npm run steamworks:write-vdf`
  - Evidence: `release/steamworks/app_build_LOCAL.vdf`
  - Verified `AppID "4765070"`, depot `"4765071"`, `DepotPath "."`, `SetLive ""`

## SteamPipe Upload

- SteamCMD: `D:\vibe-coding-e\burt-shooter\tools\steamcmd\steamcmd.exe`
- SteamCMD user: `gaunziman`
- VDF absolute path: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf`
- App build log: `release/steam-build-output/app_build_4765070.log`
- Depot build log: `release/steam-build-output/depot_build_4765071.log`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 23768418).`
- Depot manifest ID: `6374520255562897022`
- Depot summary: `0 files added`, `2 files changed`, `0 files removed`, `8 new chunks uploaded`

## Steamworks Safety

- Did not change AppID.
- Did not change depot IDs.
- Did not change achievements config.
- Did not change store metadata.
- Did not change visibility.
- Did not change Steam branch/live assignment.
- Did not change leaderboard identity; `nova_swarm_global_score_v2` remains packaged and verified.

## Rollback

- Because `SetLive` was blank, this upload did not change public/default or any Steam live branch.
- To avoid publishing this build, do not manually assign BuildID `23768418` to any branch.
- If BuildID `23768418` is manually assigned later and needs rollback, use Steamworks App Admin -> Builds and set the affected branch back to the prior known-good build for that branch, then restart Steam and verify the client downloads the restored BuildID.
- Source rollback: `git revert 2b40f988e8b7b1c6851bb6088d3a5c348cc6f38b`
