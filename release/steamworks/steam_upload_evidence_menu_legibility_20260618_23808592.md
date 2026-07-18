# Steam Upload Evidence - Menu Legibility Private Test

- Uploaded: 2026-06-18 20:41 local time
- AppID: 4765070
- DepotID: 4765071
- Steam BuildID: 23808592
- Depot manifest: 7108180269509852215
- Source branch: codex/cinematic-hangar-menu-button-legibility-goal-20260618
- Starting commit: ec38b5b78695f9345148430722d2509e3faba952
- Source commit packaged: ec38b5b78695f9345148430722d2509e3faba952
- Packaged smoke gitSha: ec38b5b
- Current desktop smoke gitSha: ec38b5b
- Build stamp: v2026-06-18_20-26-06
- SteamPipe VDF: release/steamworks/app_build_LOCAL.vdf
- Payload manifest: release/steamworks/steam_payload_manifest.json
- Menu visual artifact folder: test-results/menu-button-legibility-goal-2026-06-18T17-59-20-191Z/
- SetLive: blank (`"SetLive" ""`)
- Branch assignment: none
- Public/default assignment: none
- sector-continue-test assignment: none
- Steamworks metadata, AppID, depot IDs, store visibility, achievements, save format, and leaderboard identity were not changed.

## Protected Runtime Identity

- Steam AppID: 4765070
- Depot ID: 4765071
- Leaderboard identity: nova_swarm_global_score_v2
- Packaged runtime report: test-results/packaged-exe-smoke-2026-06-18T18-31-39-221Z/report.json
- Current runtime report: test-results/electron-smoke-2026-06-18T18-33-34-772Z/report.json
- Current perf report: test-results/electron-perf-smoke-2026-06-18T18-33-49-795Z/report.json
- Packaged runtime reported `consoleEvents: 0`.
- Current runtime reported `consoleEvents: 0`.

## Checks

- git diff --check: pass
- npm run check:release-line: pass
- npm run check:i18n: pass
- npm run check:i18n-ui: pass (`test-results/i18n-ui-2026-06-18T18-18-28-831Z/`)
- npm run check:cinematic-hangar-menu: pass (`test-results/cinematic-hangar-menu-2026-06-18T18-19-57-422Z/report.json`)
- npm run check:cinematic-hangar-menu-icons: pass (`test-results/cinematic-hangar-menu-icons-2026-06-18T18-20-39-405Z/report.json`)
- npm run check:sector-challenge-selector: pass (`test-results/sector-challenge-selector-2026-06-18T18-21-03-015Z/report.json`)
- npm run check:controller-flow: pass (`test-results/controller-only-flow-2026-06-18T18-21-48-905Z/`)
- npm run check:steam-electron-bridge: pass
- npm run check:powerup-assets: pass
- npm run check:powerup-visuals: pass (`test-results/powerup-visuals-2026-06-18T18-22-58-547Z/powerup-icons-runtime.png`)
- npm run check:codex-layout: pass (`test-results/codex-revamp-20260606/layout/`)
- npm run check:threat-codex: pass
- npm run build:current: pass
- npm run package:steam:win: pass
- npm run package:steam:win:current: pass
- npm run desktop:smoke:packaged: pass (`test-results/packaged-exe-smoke-2026-06-18T18-31-39-221Z/report.json`)
- npm run desktop:smoke:current: first attempt timed out during Electron smoke load; retry passed (`test-results/electron-smoke-2026-06-18T18-33-34-772Z/report.json`)
- npm run desktop:perf:current: pass (`test-results/electron-perf-smoke-2026-06-18T18-33-49-795Z/report.json`)
- npm run smoke: non-blocking known flaky timeout at `scripts/smoke-playtest.mjs:764:26`, after `10-level3-gameplay.png`; no artifact error hits found; policy conditions satisfied because packaged smoke, current smoke, current perf, selector/menu checks, and packaged gitSha all passed.

## SteamPipe Proof

SteamCMD command shape used:

```powershell
& 'D:\vibe-coding-e\burt-shooter\tools\steamcmd\steamcmd.exe' +login 'gaunziman' +run_app_build 'D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf' +quit
```

SteamCMD reported:

```text
[2026-06-18 20:41:58]: Successfully finished AppID 4765070 build (BuildID 23808592).
```

Depot build log reported:

```text
[2026-06-18 20:41:57]: Success! New manifestID 7108180269509852215 created and 15 new chunks uploaded.
```

Generated VDF confirmation:

```text
"AppID" "4765070"
"SetLive" ""
"4765071"
```

The VDF contains no `public`, `default`, `sector-continue-test`, or other Steam branch assignment.

## Manual Test Steps

1. In Steamworks, locate BuildID 23808592 for AppID 4765070.
2. Manually assign BuildID 23808592 to the intended private test branch.
3. Install/update Nova Swarm from that private branch.
4. Open the main menu at 1920x1080 and verify the derived glyph menu is the default.
5. Verify Sector Challenge text and `BEST` score stay inside the tile.
6. Verify the approved badge menu variant remains available with the existing query parameter if testing through local runtime.
7. Verify top-right Exit remains compact and no large Exit dock tile appears.
8. Verify Select Start Point overlay behavior and checkpoint starts: Sector 5 starts at 5; checkpoint 10/20/30 start at 11/21/31.
9. Verify Threat Codex unread marker appears only for unread intel.
10. Verify no Steam leaderboard identity change: `nova_swarm_global_score_v2`.

## Rollback

- To undo the source menu legibility changes locally: `git revert ec38b5b78695f9345148430722d2509e3faba952`
- To roll back the Steam test branch, manually assign the previous known-good BuildID in Steamworks.
- This upload was private/unassigned; no public/default branch, `sector-continue-test`, or live branch was changed by SteamPipe.
