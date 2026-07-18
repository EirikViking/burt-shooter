# Nova Swarm Release Lock - Build 24121908

Created: 2026-07-09

## Locked Steam Build

- Steam BuildID: 24121908
- Package: v2026-07-09_06-50-59
- Description: Nova Swarm visual polish performance guards a13e5b2 v2026-07-09_06-50-59
- Steam AppID: 4765070
- Depot: 4765071
- Leaderboard: nova_swarm_global_score_v2
- Release source commit: a13e5b2f65f18b269910edd9e8ca72166a42acdb
- Release source branch at lock time: codex/main-menu-run-contracts-20260702
- Release tag: nova-swarm-release-20260709-build24121908
- Evidence commit: 288c33d2f3cd6fdfba200480d99afa6a258764f4
- Steam branch assignment: none
- SetLive: empty string

This lock records the private/unassigned SteamPipe build uploaded on 2026-07-09. It does not mark the build live, assign it to default, assign it to a beta branch, edit Steamworks settings, or change store metadata.

## Evidence

- Steam upload evidence:
  - release/steamworks/steam_upload_evidence_visual_polish_performance_guards_20260709_24121908.json
  - Result: Successfully finished AppID 4765070 build (BuildID 24121908).
  - Cached SteamCMD login user: gaunziman
- SteamCMD app log:
  - release/steam-build-output/app_build_4765070.log
  - Result: Successfully finished AppID 4765070 build (BuildID 24121908).
- SteamCMD depot log:
  - release/steam-build-output/depot_build_4765071.log
  - Depot: 4765071
  - Baseline manifest: 7446306585141416786
  - New manifest: 6010931714352864807
  - Changed files: Nova Swarm.exe and resources/app.asar
  - Added files: 0
  - Removed files: 0
- VDF:
  - release/steamworks/app_build_LOCAL.vdf
  - AppID: 4765070
  - Depot: 4765071
  - ContentRoot: ..\\desktop\\win-unpacked
  - SetLive: empty string
- Payload manifest:
  - Path: release/steamworks/steam_payload_manifest.json
  - Version: v2026-07-09_06-50-59
  - Generated: 2026-07-09T04:50:59.252Z
  - Files: 336
  - Total bytes: 916284706
  - Manifest hash: f2b695f805d6467ec3951aa44d59717b89058fca5ded5ad51096685410533d96
  - Executable bytes: 226698752
  - Executable SHA-256: 06e3a489e71ca1a577c0b7cb30bcde139d2c020cc7a1ceda45c1be81848da445

## Included Game Work

This build contains the 50 visual, combat-feedback, boss/powerup readability, dense-combat performance, and overlap-guarded presentation improvements committed in:

- a13e5b2 Add visual polish and performance guards

The improvement ledger records this as reaching 470 tracked improvements.

## Verification Results

Passed before upload:

- git fetch --all --prune
- npm run check:release-line
- npm run package:steam:win
- npm run desktop:smoke:packaged
- npm run desktop:perf:packaged
- npm run desktop:controls:packaged
- npm run desktop:smoke:current
- npm run check:desktop-package
- npm run steamworks:payload-manifest
- npm run steamworks:write-vdf
- SteamCMD run_app_build

Relevant reports:

- test-results/packaged-exe-smoke-2026-07-09T05-01-22-210Z/report.json
- test-results/packaged-perf-smoke-2026-07-09T05-01-31-796Z/report.json
- test-results/packaged-control-smoke-2026-07-09T05-02-52-918Z/report.json
- test-results/electron-smoke-2026-07-09T05-03-35-959Z/report.json
- release/steamworks/desktop_package_review_report.json

Note: the first packaged smoke launch timed out before writing a report. An immediate clean retry passed and was used as the packaged smoke proof.

## No-Change Confirmations

- No Steamworks settings were changed.
- No Steam branch was assigned.
- No public/default branch was moved.
- No beta branch was moved.
- No SetLive target was used.
- No store metadata changed.
- No AppID, depot ID, leaderboard identity, achievements metadata, Steam Cloud paths, score identity, XP identity, or price metadata changed.
- No new Steam upload was performed during this lock step; the lock records the already uploaded BuildID 24121908.

## Rollback Notes

To inspect the locked source:

```powershell
git checkout nova-swarm-release-20260709-build24121908
```

To return the working branch to the locked source commit if needed:

```powershell
git switch codex/main-menu-run-contracts-20260702
git reset --hard a13e5b2f65f18b269910edd9e8ca72166a42acdb
```

Steam rollback is not needed while BuildID 24121908 remains unassigned. If it is manually assigned later and must be rolled back, use Steamworks App Admin > SteamPipe > Builds to reassign the affected branch to the previous desired BuildID.

## Release Checklist

- Verify Steamworks AppID is 4765070.
- Verify depot is 4765071.
- Verify leaderboard remains nova_swarm_global_score_v2.
- Verify BuildID 24121908 is selected only for the intended branch.
- Verify SetLive is only changed intentionally in Steamworks.
- Launch through Steam client.
- Confirm main menu, launch flow, gameplay, pause/resume, game over/result flow, controller flow, and dense combat performance.
- Check the visually obvious polish points: player thrusters, projectile trails, enemy spawn cues, enemy death bursts, powerup pickup/expiry cues, boss aura/intro overlap, and Plasma Lance smoothness.
