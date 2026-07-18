# Plasma Lance Smoothness Private Steam Upload - 2026-06-24

- Branch: `codex/stutter-smoothness-plasma-20260624`
- Source commit packaged: `c6536c0` (`Smooth Plasma Lance combat stutter`)
- Build ID from `version.json`: `v2026-06-24_13-41-03`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- VDF: `release/steamworks/app_build_LOCAL.vdf`
- VDF `SetLive`: blank (`"SetLive" ""`)
- Steam BuildID: `23893593`
- SteamCMD upload log: `test-results/steam-upload-plasma-smoothness-20260624-144504/steamcmd-upload.log`

## Minimal Validation

- `npm run check:release-line` - passed.
- `npm run package:steam:win:current` - passed, including Steam SDK ready and package runtime checks.
- `npm run check:mayhem-collision-hotpath-stress` - passed at `test-results/mayhem-collision-hotpath-stress-2026-06-24T12-38-07-155Z/report.json`.
- `npm run check:plasma-lance-smoothness` - passed at `test-results/plasma-lance-smoothness-2026-06-24T12-36-35-283Z/report.json`.
- Direct Vite production build: `node node_modules/vite/bin/vite.js build` - passed.

Full smoke, desktop smoke, controller flow, and broad QA suites were intentionally not run per user instruction.

## Upload Result

SteamCMD completed with cached `gaunziman` credentials and reported:

```text
[2026-06-24 14:46:51]: Successfully finished AppID 4765070 build (BuildID 23893593).
```

Because `SetLive` was blank, the upload created a private unassigned build for manual testing and did not assign public/default or any Steam branch.

No Steamworks app settings, store metadata, visibility, AppID, depot ID, leaderboard identity, achievements, Steam Cloud settings, save format, scoring formula, or live branch assignment were changed.
