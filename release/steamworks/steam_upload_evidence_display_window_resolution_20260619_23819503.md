# Nova Swarm Display/Window/Resolution Steam Upload Evidence - 2026-06-19

## Upload

- Branch: `codex/display-window-resolution-options-20260619`
- Requested source commit: `2907771fd659ae510b17832135448e48c5a23360`
- Packaged source commit: `f4039efb4abe3a5f16f2e581bcb42c9fece26c23`
- Build version: `v2026-06-19_12-06-51`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Steam BuildID: `23819503`
- Depot manifest: `4963871976868120006`
- VDF: `release/steamworks/app_build_LOCAL.vdf`
- VDF `SetLive`: empty string
- Steam branch assignment: none
- Upload command shape: `D:\vibe-coding-e\burt-shooter\tools\steamcmd\steamcmd.exe +login gaunziman +run_app_build <absolute app_build_LOCAL.vdf> +quit`

SteamCMD result:

```text
[2026-06-19 12:18:29]: Successfully finished AppID 4765070 build (BuildID 23819503).
```

Depot result:

```text
[2026-06-19 12:18:28]: Success! New manifestID 4963871976868120006 created and 10 new chunks uploaded.
```

## Packaged Runtime Proof

- `desktop:smoke:packaged` report: `test-results/packaged-exe-smoke-2026-06-19T10-11-39-481Z/report.json`
- Packaged `gitSha`: `f4039ef`
- Packaged build: `v2026-06-19_12-06-51`
- Steam bridge AppID: `4765070`
- Leaderboard identity: `nova_swarm_global_score_v2`
- Steam Cloud profile smoke: `steam_identity_ready`

## Checks

- `git diff --check` - PASS
- `npm run check:release-line` - PASS
- `npm run check:display-settings` - PASS
- `npm run check:steam-cloud-save` - PASS
- `npm run check:i18n` - PASS
- `npm run build:current` - PASS
- `npm run check:i18n-ui` - PASS
- `npm run check:cinematic-hangar-menu` - PASS
- `npm run check:sector-challenge-selector` - PASS
- `npm run check:controller-flow` - PASS
- `npm run check:steam-electron-bridge` - PASS
- `npm run check:sector-start-checkpoint-unlocks` - PASS
- `npm run check:fullscreen-menu-removed` - PASS
- `npm run package:steam:win` - PASS
- `npm run package:steam:win:current` - PASS
- `npm run desktop:smoke:packaged` - PASS
- `npm run desktop:smoke:current` - PASS, `gitSha: f4039ef`
- `npm run desktop:perf:current` - PASS, min FPS 60.0, no errors
- `npm run smoke` - NON-BLOCKING known timeout at `scripts/smoke-playtest.mjs:764:26` after `10-level3-gameplay.png`; packaged smoke, current smoke, perf smoke, menu/settings/selector/Steam bridge/package runtime checks passed and no app errors were reported.
- `npm run steamworks:payload-manifest` - PASS
- `STEAM_APP_ID=4765070 STEAM_DEPOT_ID=4765071 STEAM_SET_LIVE="" npm run steamworks:write-vdf` - PASS

## VDF Verification

Verified before upload:

- `"AppID" "4765070"`
- Depot `"4765071"`
- `"SetLive" ""`
- No `public`, `default`, or `sector-continue-test` strings in the generated VDF.

Because `SetLive` was blank, this upload did not assign BuildID `23819503` to public/default or any Steam branch.

## Display Manual Test Steps

1. In Steamworks, assign BuildID `23819503` only to the intended private manual-test branch if manual Steam client testing is needed.
2. Install/update the branch in Steam on Windows and launch Nova Swarm.
3. Open Settings and verify the Display section shows Display Mode, Window Size, Apply/selection behavior, and Safe Reset.
4. Change Display Mode between Fullscreen, Windowed, and Borderless Fullscreen where supported.
5. Change Window Size to common sizes such as 1280x720, 1366x768, 1600x900, 1920x1080, and native/current display if offered.
6. Quit and relaunch through Steam; confirm the selected display mode and window size persist.
7. Use Safe Reset and confirm the game returns to the safe fullscreen/default window-size configuration.
8. Confirm Sector Challenge start-point behavior is unchanged: Sector 5 starts at 5, checkpoint 10 starts at 11, checkpoint 20 starts at 21, checkpoint 30 starts at 31, and practice runs do not unlock later career start points.

## Rollback

This upload was not assigned live, so normal rollback is to leave BuildID `23819503` unassigned. If it is later assigned manually and needs rollback, use Steamworks App Admin for AppID `4765070` to reassign the target branch to the previous desired BuildID without changing AppID, depot IDs, store visibility, achievements, leaderboard identity, or Steam Cloud settings.
