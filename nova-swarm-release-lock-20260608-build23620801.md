# Nova Swarm Release Lock - Build 23620801

Created: 2026-06-08

## Locked Release Build

- Steam BuildID: 23620801
- Package: v2026-06-08_13-11-45
- Description: imagegen readable icon private Steam test
- Steam AppID: 4765070
- Depot: 4765071
- Leaderboard: nova_swarm_global_score_v2
- Release source commit: 64f0ba200406e4ecfae20b1960be0db6dfac74c5
- Release source branch at lock time: codex/final-readable-steam-icon-v1
- Release tag target: 64f0ba200406e4ecfae20b1960be0db6dfac74c5
- Steam branches recorded for release: default -> 23620801, test-build -> 23620801

Note: Steam branch pointers are recorded from the approved release state supplied for this lock task. The local repo evidence proves the BuildID upload, package version, AppID, depot, VDF, manifest, and source commit. This task did not run SteamCMD, query Steamworks live state, SetLive, upload, or change any branch.

## Evidence

- SteamCMD app log: release/steam-build-output/app_build_4765070.log
  - Result: Successfully finished AppID 4765070 build (BuildID 23620801).
- Depot log: release/steam-build-output/depot_build_4765071.log
  - Depot: 4765071
  - New manifestID: 5854404428367262236
  - Baseline manifest: 4106558293423073669
- VDF: release/steamworks/app_build_LOCAL.vdf
  - AppID: 4765070
  - Depot: 4765071
  - SetLive: empty string
  - Description: Nova Swarm v2026-06-08_13-11-45 imagegen readable icon private Steam test
- Payload manifest at release source commit:
  - Path: release/steamworks/steam_payload_manifest.json
  - Version: v2026-06-08_13-11-45
  - Generated: 2026-06-08T11:14:49.193Z
  - Files: 336
  - Total bytes: 724383586
  - Manifest hash: fbd56d48b4617de42fe2183d0f2887844ea1e00f65be62a6debfe3fc121cc03e
  - Executable SHA-256: 445142b69189f2b7f7c84a9c05e74cab595ce5a16ba75f7a203ba83b783b8dbf
  - app.asar SHA-256: 7e70100fe5d1dce2caec7bc7a9cd9e8591638c3d38fbf483bf2fd7a4230357bb

## Included Release Fixes

Confirmed by commit ancestry and focused checks:

- Xbox controller Hangar Details fix: 14623ef is contained in release source.
- Final difficulty nudge: 70ad1cd is contained in release source.
- Final runtime blockers: 73a74ef is contained in release source.
- Profile isolation / progression pacing: 2463a73 is contained in release source.
- Devtools gate: 5531f54 is contained in release source.
- Overrun score bonus and Overrun sector voice fixes: 6666709 is contained in release source.
- Steam leaderboard remains nova_swarm_global_score_v2.

## Verification Results

Verification log folder:

- test-results/release-lock-23620801-20260608-144844/

Passed once:

- npm run build:current
- npm run check:release-line
- npm run check:release-hardening
- npm run check:controller-flow
- npm run check:hangar-controller-details
- npm run check:controller-full-flow
- npm run check:overrun-clear-score-runtime
- npm run check:overrun-milestone-voice-runtime
- npm run check:codex-tab-count-layout
- npm run check:profile-isolation
- npm run check:progression-pacing
- npm run check:steam-cloud-save
- npm run check:devtools-gate
- npm run check:steam-leaderboard-mock
- npm run check:final-release-difficulty-nudge
- npm run check:steam-overlay-hook
- npm run package:steam:win
- npm run desktop:smoke:packaged
- npm run steamworks:payload-manifest

The first plain run of npm run steamworks:write-vdf failed because STEAM_APP_ID and STEAM_DEPOT_ID were not set in the environment. The failed command did not upload or SetLive. It was rerun once with:

- STEAM_APP_ID=4765070
- STEAM_DEPOT_ID=4765071
- STEAM_SET_LIVE empty
- STEAM_BUILD_DESC=Nova Swarm v2026-06-08_13-11-45 imagegen readable icon private Steam test

That rerun passed and wrote release/steamworks/app_build_LOCAL.vdf with SetLive empty.

Important packaging note: the requested verification run of npm run build:current and npm run package:steam:win created a fresh local verification package v2026-06-08_15-02-12. That package was not uploaded and is not the locked Steam BuildID. The locked uploaded Steam build remains BuildID 23620801 / package v2026-06-08_13-11-45 from the SteamCMD upload log and release-source payload manifest.

## Manual Tests Already Passed

The approved release state records that Steam client testing passed for the latest private candidate, including the final readable icon/imagegen asset update and controller flow checks. This lock task did not perform a new Steam upload or live Steam client branch mutation.

## Known Non-Blocking Issues

- Steam Overlay Shift+Tab may not open.
- Threat Codex Sectors shows 12/12 though Overrun can continue deeper.
- Leaderboard LV may be estimated if a Steam row has missing details metadata.

## No-Change Confirmations

- No game code changed for this lock.
- No gameplay, difficulty, scoring, saves, achievements, ships, unlocks, Overrun, Codex, controller code, profile/progression, leaderboard code, AppID, depot IDs, Steam metadata, app visibility, Steam branch, or SetLive changes were made.
- No Steam upload was performed.
- No merge was performed.

## Rollback Notes

To inspect the locked source:

```powershell
git checkout nova-swarm-release-20260608-build23620801
```

To return the working branch to the release source commit if needed:

```powershell
git switch codex/final-readable-steam-icon-v1
git reset --hard 64f0ba200406e4ecfae20b1960be0db6dfac74c5
```

Steam rollback, if release needs to be backed out after launch, should be performed manually in Steamworks by selecting the previous known-good BuildID for the affected branch. Do not run a new upload for rollback unless explicitly required.

## Release Checklist

- Verify Steamworks AppID is 4765070.
- Verify depot is 4765071.
- Verify leaderboard remains nova_swarm_global_score_v2.
- Verify BuildID 23620801 is selected for the intended release branch.
- Verify default and test-build still point to 23620801 before release.
- Verify SetLive is only changed intentionally in Steamworks at release time.
- Launch through Steam client with an Xbox controller.
- Main menu to Hangar.
- Move between ships.
- Open Details.
- Close Details.
- Move to another ship.
- Equip/select ship.
- Return to menu.
- Start run.
- Pause/resume.
- Game over/result retry/runback.
- Confirm Overrun milestone.
- Press Shift+Tab in Steam client and note Overlay result.
- Confirm no stuck focus traps.
