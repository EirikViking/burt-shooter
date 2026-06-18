# Steam Upload Evidence - Dock Icon Safe-Area Private Test

- Uploaded: 2026-06-18 21:27 local time
- AppID: 4765070
- DepotID: 4765071
- Steam BuildID: 23809188
- Depot manifest: 2093552943102439710
- Source branch: codex/cinematic-hangar-menu-button-legibility-goal-20260618
- Pre-run snapshot: snap/pre-dock-icon-safe-area-20260618-205452
- Starting commit: 46e5b9cd924c9fdf67265f0b0d6e4fdbf6d1f03a
- New source commit: 8b0d5609c41b686979446a8e88d902f5ca89afa5
- Source commit packaged: 8b0d5609c41b686979446a8e88d902f5ca89afa5
- Previous uploaded BuildID before this fix: 23808592
- Packaged smoke gitSha: 8b0d560
- Current desktop smoke gitSha: 8b0d560
- Build stamp: v2026-06-18_21-12-11
- SteamPipe VDF: release/steamworks/app_build_LOCAL.vdf
- Payload manifest: release/steamworks/steam_payload_manifest.json
- Menu visual artifact folder: test-results/menu-button-legibility-goal-2026-06-18T19-02-38-141Z/
- SetLive: blank (`"SetLive" ""`)
- Branch assignment: none
- Public/default assignment: none
- sector-continue-test assignment: none
- Steamworks metadata, AppID, depot IDs, store visibility, achievements, save format, and leaderboard identity were not changed.

## Changed Files

- src/scenes/MenuScene.js
- scripts/capture-menu-button-legibility-goal.mjs
- release/steamworks/steam_payload_manifest.json
- release/steamworks/steam_upload_evidence_dock_icon_safe_area_20260618_23809188.md

## Spacing Fix

- Moved Launch Run icon center from the old left-crowded lane to a safer dock lane.
- Moved secondary dock icon centers right so their visible glyphs no longer press into the left bevel.
- Rebalanced dock title and sublabel fit widths so text remains inside the tile after the icon lane shift.
- Added capture assertions for bottom-dock icon left clearance and label/sublabel horizontal and vertical safe area.
- 1920x1080 derived-glyph clearances after the fix:
  - Launch Run: 26 px icon-left clearance
  - Sector Challenge: 19 px icon-left clearance
  - Ship Hangar: 18 px icon-left clearance
  - Leaderboard: 19 px icon-left clearance
  - Threat Codex: 18 px icon-left clearance
  - Achievements: 19 px icon-left clearance
  - Settings: 18 px icon-left clearance

## Protected Runtime Identity

- Steam AppID: 4765070
- Depot ID: 4765071
- Leaderboard identity: nova_swarm_global_score_v2
- Packaged runtime report: test-results/packaged-exe-smoke-2026-06-18T19-18-06-717Z/report.json
- Current runtime report: test-results/electron-smoke-2026-06-18T19-20-10-864Z/report.json
- Current perf report: test-results/electron-perf-smoke-2026-06-18T19-20-37-407Z/report.json
- Packaged runtime reported `consoleEvents: 0`.
- Current runtime retry reported `consoleEvents: 0`.
- Local Steam API was unavailable in current smoke/perf because Steam client was not running, but the smoke/perf reports passed and preserved AppID/leaderboard configuration.

## Checks

- git diff --check: pass
- node scripts/capture-menu-button-legibility-goal.mjs: pass (`test-results/menu-button-legibility-goal-2026-06-18T19-02-38-141Z/report.json`)
- npm run check:release-line: pass
- npm run check:i18n: pass
- npm run check:i18n-ui: pass (`test-results/i18n-ui-2026-06-18T19-05-20-944Z/`)
- npm run check:cinematic-hangar-menu: pass (`test-results/cinematic-hangar-menu-2026-06-18T19-06-48-264Z/report.json`)
- npm run check:cinematic-hangar-menu-icons: pass (`test-results/cinematic-hangar-menu-icons-2026-06-18T19-07-13-764Z/report.json`)
- npm run check:sector-challenge-selector: pass (`test-results/sector-challenge-selector-2026-06-18T19-07-32-568Z/report.json`)
- npm run check:controller-flow: pass (`test-results/controller-only-flow-2026-06-18T19-08-13-857Z/`)
- npm run check:steam-electron-bridge: pass
- npm run check:powerup-assets: pass
- npm run check:powerup-visuals: pass (`test-results/powerup-visuals-2026-06-18T19-09-24-153Z/powerup-icons-runtime.png`)
- npm run check:codex-layout: pass (`test-results/codex-revamp-20260606/layout/`)
- npm run check:threat-codex: pass
- npm run build:current: pass
- npm run package:steam:win: pass
- npm run package:steam:win:current: pass
- npm run desktop:smoke:packaged: pass (`test-results/packaged-exe-smoke-2026-06-18T19-18-06-717Z/report.json`)
- npm run desktop:smoke:current: first attempt timed out during Electron smoke load; retry passed (`test-results/electron-smoke-2026-06-18T19-20-10-864Z/report.json`)
- npm run desktop:perf:current: pass (`test-results/electron-perf-smoke-2026-06-18T19-20-37-407Z/report.json`)
- npm run smoke: non-blocking known flaky timeout at `scripts/smoke-playtest.mjs:764:26`, after `10-level3-gameplay.png`; policy conditions satisfied because packaged smoke, current smoke retry, current perf, selector/menu checks, and packaged gitSha all passed.

## SteamPipe Proof

SteamCMD command shape used:

```powershell
& 'D:\vibe-coding-e\burt-shooter\tools\steamcmd\steamcmd.exe' +login 'gaunziman' +run_app_build 'D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf' +quit
```

SteamCMD reported:

```text
[2026-06-18 21:27:55]: Successfully finished AppID 4765070 build (BuildID 23809188).
```

Depot build log reported:

```text
[2026-06-18 21:27:55]: Success! New manifestID 2093552943102439710 created and 7 new chunks uploaded.
```

Generated VDF confirmation:

```text
"AppID" "4765070"
"SetLive" ""
"4765071"
```

The VDF contains no `public`, `default`, `sector-continue-test`, or other Steam branch assignment.

## Manual Test Steps

1. In Steamworks, locate BuildID 23809188 for AppID 4765070.
2. Manually assign BuildID 23809188 to the intended private test branch.
3. Install/update Nova Swarm from that private branch.
4. Open the main menu at 1920x1080 and verify the derived glyph menu is the default.
5. Verify Launch Run and all secondary dock icons have visible breathing room from the left frame/bevel.
6. Verify Sector Challenge text and `BEST` score stay inside the tile.
7. Verify top-right Exit remains compact and no large Exit dock tile appears.
8. Verify Select Start Point overlay behavior and checkpoint starts: Sector 5 starts at 5; checkpoint 10/20/30 start at 11/21/31.
9. Verify Threat Codex unread marker appears only for unread intel.
10. Verify no Steam leaderboard identity change: `nova_swarm_global_score_v2`.

## Rollback

- To undo the source dock icon safe-area change locally: `git revert 8b0d5609c41b686979446a8e88d902f5ca89afa5`
- To undo this evidence commit after it exists: `git revert <evidence-commit-sha>`
- To roll back the Steam test branch, manually assign the previous known-good BuildID in Steamworks.
- This upload was private/unassigned; no public/default branch, `sector-continue-test`, or live branch was changed by SteamPipe.
