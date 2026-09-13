# Nova Swarm Release Lock - Build 24132596

Created: 2026-07-09

## Locked Steam Build

- Steam BuildID: 24132596
- Package: v2026-07-09_19-41-50
- Description: Nova Swarm sector and combat message timing 4268eb6 20260709
- Steam AppID: 4765070
- Depot: 4765071
- Leaderboard: nova_swarm_global_score_v2
- Release source commit: 4268eb69e7bf023c0dc15760d350c89747755e93
- Release source branch at lock time: codex/main-menu-run-contracts-20260702
- Release tag: nova-swarm-release-20260709-build24132596
- Evidence commit: a7b72d1 Record Steam build 24132596
- Steam branch assignment: none
- SetLive: empty string

This lock records the private/unassigned SteamPipe build uploaded on 2026-07-09. It does not mark the build live, assign it to default, assign it to a beta branch, edit Steamworks settings, or change store metadata.

## Evidence

- Steam upload evidence:
  - release/steamworks/steam_upload_evidence_message_timing_surgical_20260709_24132596.json
  - Result: Successfully finished AppID 4765070 build (BuildID 24132596).
  - Cached SteamCMD login user: gaunziman
- SteamCMD console log:
  - release/steamworks/steam_upload_console_message_timing_surgical_20260709.log
  - Result: Successfully finished AppID 4765070 build (BuildID 24132596).
- VDF:
  - release/steamworks/app_build_LOCAL.vdf
  - AppID: 4765070
  - Depot: 4765071
  - ContentRoot: ..\\desktop\\win-unpacked
  - SetLive: empty string
- Payload manifest:
  - Path: release/steamworks/steam_payload_manifest.json
  - Version: v2026-07-09_19-41-50
  - Generated: 2026-07-09T17:49:41.056Z
  - Files: 336
  - Total bytes: 916313073
  - Manifest hash: b14c18b345511960d97916250dd401fe3c519d24cb326115542c007eb0f5c75c
  - Executable bytes: 226698752
  - Executable SHA-256: 4847ca4563a102275e873365c7d40789888844ef44f6f8a1344b60cb79eab7df

## Included Game Work

This build contains the surgical message timing hotfix committed in:

- 4268eb6 Tune sector and combat message timing

Changes:

- Suppress the redundant in-play sector title when the full-screen sector arrival stinger already announced that sector.
- Keep wave/tactic banners visible longer.
- Keep the BOSS DEFEATED message visible longer.

## Verification Results

Passed before upload:

- git fetch --all --prune
- git status --short --untracked-files=all
- git branch --show-current
- git log -1 --oneline
- git worktree list
- git diff --check
- npm run check:i18n
- node scripts/check-sector-arrival-stinger.mjs
- npm run check:release-line
- npm run package:steam:win
- npm run steamworks:payload-manifest
- npm run steamworks:write-vdf
- SteamCMD run_app_build

Skipped by explicit user request:

- npm run smoke
- packaged smoke
- desktop smoke

## No-Change Confirmations

- No Steamworks settings were changed.
- No Steam branch was assigned.
- No public/default branch was moved.
- No beta branch was moved.
- No SetLive target was used.
- No store metadata changed.
- No AppID, depot ID, leaderboard identity, achievements metadata, Steam Cloud paths, score identity, XP identity, or price metadata changed.
- No new Steam upload was performed during this lock step; the lock records the already uploaded BuildID 24132596.

## Rollback Notes

To inspect the locked source:

```powershell
git checkout nova-swarm-release-20260709-build24132596
```

To undo this lock commit and source hotfix on the working branch:

```powershell
git switch codex/main-menu-run-contracts-20260702
git revert a7b72d1 4268eb6
```

Steam rollback is not needed while BuildID 24132596 remains unassigned. If it is manually assigned later and must be rolled back, use Steamworks App Admin > SteamPipe > Builds to reassign the affected branch to the previous desired BuildID.

## Release Checklist

- Verify Steamworks AppID is 4765070.
- Verify depot is 4765071.
- Verify leaderboard remains nova_swarm_global_score_v2.
- Verify BuildID 24132596 is selected only for the intended branch.
- Verify SetLive is only changed intentionally in Steamworks.
- Launch through Steam client.
- Confirm main menu, launch flow, gameplay, pause/resume, game over/result flow, controller flow, and dense combat performance.
- Specifically verify sector transition no longer double-announces the same sector.
- Specifically verify wave/tactic banners and BOSS DEFEATED remain readable.
