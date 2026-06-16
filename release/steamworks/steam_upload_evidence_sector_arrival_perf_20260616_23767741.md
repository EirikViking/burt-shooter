# Steam Upload Evidence - Sector Arrival Safety And Enemy Motion

- Date: 2026-06-16
- Worktree: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype`
- Branch: `codex/hard-achievements-20260612`
- Source commit packaged: `ea053578ccf54c5a70713a731e31d26c445098e3`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Leaderboard preserved: `nova_swarm_global_score_v2`
- SteamPipe BuildID: `23767741`
- Steam live branch assignment: none; VDF used `SetLive ""`

## What Changed

- Delayed enemy wave release until the sector arrival stinger finishes for sectors after the run-start sector.
- Kept sector 1 and initial Sector Start sector behavior immediate.
- Smoothed generated enemy parked motion by replacing step/round sine movement with eased curves.
- Added a short formation sway ramp so enemies do not snap sideways when their fly-in path locks to the top formation.

## Validation

- `git fetch --all --prune`
- `git status --short --branch`
- `git rev-list --left-right --count HEAD...origin/codex/hard-achievements-20260612`
- `npm run check:enemy-movement-smoothing`
- `npm run check:sector-arrival-stinger`
- `npm run check:wave-pacing`
- `npm run check:sector-arrival-spawn-delay`
  - Evidence: `test-results/sector-arrival-spawn-delay-2026-06-16T17-29-05-335Z/report.json`
  - During stinger: `enemyCount=0`, `activeEnemyCount=0`, `pendingEnemyStart=true`
  - After stinger: `enemyCount=7`, `waveState=WAVE_ACTIVE`
- `npm run check:gameplay-performance-analysis`
  - Evidence: `test-results/gameplay-performance-analysis-2026-06-16T17-26-56-684Z/report.json`
  - Sector 1: p95 `16.8ms`, long frames over 33ms: `0`, parked max x-step `0.63px`
  - Sector 2: p95 `16.9ms`, long frames over 33ms: `0`, parked max x-step `1.48px`
  - Sector 20: p95 `16.8ms`, long frames over 33ms: `0`, parked max x-step `1.46px`
- `npm run build:current`
- `npm run desktop:perf:current`
  - Evidence: `test-results/electron-perf-smoke-2026-06-16T17-30-50-098Z/report.json`
  - Min FPS `59.88023952094243`, average FPS `59.945825763591415`, warnings `0`, errors `0`
- `npm run package:steam:win:current`
- `npm run desktop:smoke:packaged`
  - Evidence: `test-results/packaged-exe-smoke-2026-06-16T17-37-09-822Z/report.json`
- `npm run desktop:perf:packaged`
  - Evidence: `test-results/packaged-perf-smoke-2026-06-16T17-37-52-078Z/report.json`
  - Min FPS `59.17159763315647`, average FPS `59.98135891109537`, warnings `0`, errors `0`
- `npm run steamworks:payload-manifest`
  - Evidence: `release/steamworks/steam_payload_manifest.json`
  - Files `336`, bytes `873133702`, manifest hash `fdf811c6fbe50a8aecb9a90d912fa5a41910359f1fd624e7291b18ef4e8519a9`
- `STEAM_APP_ID=4765070 STEAM_DEPOT_ID=4765071 STEAM_SET_LIVE="" npm run steamworks:write-vdf`
  - Evidence: `release/steamworks/app_build_LOCAL.vdf`
  - Verified `AppID "4765070"`, depot `"4765071"`, `DepotPath "."`, `SetLive ""`
- SteamCMD upload:
  - Command used absolute VDF path: `D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf`
  - Console log: `release/steamworks/steam_upload_console_20260616_sector_arrival_perf.log`
  - Result: `Successfully finished AppID 4765070 build (BuildID 23767741)`

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
- To avoid publishing this build, do not manually assign BuildID `23767741` to any branch.
- If BuildID `23767741` is manually assigned later and needs rollback, use Steamworks App Admin -> Builds and set the affected branch back to the prior known-good build for that branch, then restart Steam and verify the client downloads the restored BuildID.
