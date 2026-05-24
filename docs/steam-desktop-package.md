# Nova Swarm Desktop / Steam Package

Nova Swarm now has a Windows desktop package path for Steam release-candidate work.

## Build

```bash
npm run build:current
npm run package:steam:win:current
npm run desktop:smoke:current
npm run desktop:smoke:packaged
npm run check:desktop-package
```

`npm run verify:steam-rc` runs the same current-build package, Electron-smoke, packaged-executable-smoke, and desktop package gates as part of the fast RC path without regenerating the build ID. `npm run verify:steam-rc -- --full` also runs browser smoke and the long release playtest.

Outputs:

- Desktop smoke evidence: `test-results/electron-smoke-*/`
- Packaged executable smoke evidence: `test-results/packaged-exe-smoke-*/`
- Steam candidate payload: `release/desktop/win-unpacked/`
- Launch executable: `release/desktop/win-unpacked/Nova Swarm.exe`

`release/desktop/` is intentionally ignored because it is generated release output, not source.

## Runtime Shape

The Electron wrapper starts a local loopback server, serves the Vite `dist/` build, and implements `/api/highscores` locally for package health checks and offline fallback. The game runtime also keeps its own local leaderboard in `localStorage`, and desktop launches with `?desktop=1` so the online/global leaderboard path points at `https://novaswarm.tinyfoundry.app/api/highscores` instead of mistaking the loopback API for the shared board.

The web deployment uses Cloudflare Pages and D1 at `https://novaswarm.tinyfoundry.app`; the global leaderboard claim should remain phrased as an online/shared leaderboard, not a Steamworks leaderboard.

## Steam Cloud Auto Cloud setup

Nova Swarm is prepared for Steam Auto Cloud with one explicit JSON save file. Do not sync Chromium localStorage, the full Electron profile, logs, renderer caches, window state, graphics settings, or debug flags.

The file is created under Electron `app.getPath('userData')`:

```text
steam-cloud/nova-swarm-save.json
```

It contains `version`, `updatedAt`, `language` (`system` is preserved as a valid preference), `localHighscores`, a local `achievements` mirror, `selectedShipKey`, ship unlock/progression bests, and safe player settings: screen shake, player focus, color assist, audio volumes/toggles, and music pack. It intentionally excludes resolution, window state, renderer details, absolute paths, debug flags, logs, Steam diagnostics, and the Chromium profile. The legacy Electron fallback file `local-highscores-v2.json` remains in place for backward compatibility and is mirrored into the cloud save.

Recommended Steamworks Auto Cloud values:

| Field | Value |
| --- | --- |
| Byte quota | `1048576` |
| File count | `20` |
| Root | `WinAppDataRoaming` |
| Subdirectory | `nova-swarm/steam-cloud` |
| Pattern | `nova-swarm-save.json` |
| Recursive | `No` |
| Dynamic Cloud Sync | Leave off for now |

Run `npm run steamworks:cloud-diagnose` to print the resolved local `userData` path, cloud save path, persistence summary, and the exact Steamworks values from the current Electron runtime. After `npm run package:steam:win:current`, run `npm run steamworks:cloud-diagnose:packaged` for the packaged app identity; that is the value to copy into Steamworks.

Steam leaderboard provider support now has an Electron preload/native bridge boundary: `electron/main.cjs` registers IPC handlers, `electron/preload.cjs` exposes `window.__novaSteamLeaderboard`, and `electron/steamLeaderboardBridge.cjs` owns optional `steamworks-ffi-node` access. See `docs/steam-leaderboards.md`.

This is SDK-ready, not yet Steam-client-verified live support. The bridge needs a configured numeric Steam App ID and a Steam-client launch before it should be considered live. With no App ID or unavailable Steam runtime, Steam reports unavailable and the game falls back safely.

Latest leaderboard split evidence:

- `npm run check:leaderboard-split` passed at `test-results/leaderboard-split-2026-05-18T22-14-22-735Z/report.json`.
- `npm run desktop:smoke:current` passed at `test-results/electron-smoke-2026-05-18T22-14-22-276Z/` after the desktop/global endpoint split.

Latest verified package evidence:

- `npm run package:steam:win:current`, `npm run desktop:smoke:current`, `npm run desktop:smoke:packaged`, and `npm run check:desktop-package` passed for build `v2026-05-17_21-41-17`.
- `npm run desktop:smoke:current` wrote `test-results/electron-smoke-2026-05-17T20-27-11-571Z/`.
- `npm run desktop:smoke:packaged` wrote `test-results/packaged-exe-smoke-2026-05-17T20-28-09-416Z/`.
- `npm run package:steam:win:current` produced `release/desktop/win-unpacked/Nova Swarm.exe` at 226,666,496 bytes.
- `npm run check:desktop-package` passed and wrote `release/steamworks/desktop_package_review_report.json`, confirming the packaged executable, Electron intro/menu render, packaged executable intro/menu render, local highscore API, captured screenshots, matching current build ID, package modified time newer than the build timestamp, and zero smoke console events.
- `npm audit --omit=dev` reports `found 0 vulnerabilities`.
- Dev-only audit caveat: the non-omitted audit still reports Vite/esbuild dev-server advisories that npm says require a breaking Vite major upgrade.

The desktop package checker intentionally fails stale evidence. The latest Electron smoke and packaged executable smoke `build` values must match `public/version.json`, and the packaged executable must be newer than the current build timestamp.

## Steamworks Handoff

The template at `release/steamworks/app_build_TEMPLATE.vdf` maps all files from `release/desktop/win-unpacked/` into a Steam depot. Before upload, replace:

- `STEAM_APP_ID_HERE`
- `STEAM_DEPOT_ID_HERE`

Or generate the ignored local upload VDF:

```bash
STEAM_APP_ID=<app id> STEAM_DEPOT_ID=<depot id> npm run steamworks:write-vdf
```

Current known IDs on 2026-05-21:

- Steam App ID: `4765070`
- Windows depot ID: `4765071`

`app_build_LOCAL.vdf` is ignored and can be regenerated for SteamPipe upload with:

```powershell
$env:STEAM_APP_ID='4765070'
$env:STEAM_DEPOT_ID='4765071'
$env:STEAM_BUILD_DESC='Nova Swarm Steam leaderboard runtime test'
npm run steamworks:write-vdf
```

Suggested Steam launch option:

```text
Nova Swarm.exe
```

Reference checked on 2026-05-17:

- SteamPipe uploading docs: https://partner.steamgames.com/doc/sdk/uploading
- Steam platform support docs: https://partner.steamgames.com/doc/store/application/platforms

Detailed client validation handoff:

- `release/steamworks/steam_client_validation_runbook.md`

## Remaining Manual Steam Steps

- Run the SteamPipe upload with a Steamworks account that has package/depot upload permission.
- Configure the Steam App ID for local bridge testing with `NOVA_SWARM_STEAM_APP_ID`, `STEAM_APP_ID`, or an ignored `steam_appid.txt`.
- Keep the official SDK redistributables at `steam_sdk/sdk/redistributable_bin/` or set `NOVA_SWARM_STEAMWORKS_SDK_PATH`.
- Run `npm run check:steam-sdk-ready` and `npm run check:steam-electron-bridge`.
- Local SteamCMD now runs from ignored `tools/steamcmd/`; see `docs/reviews/2026-05-17-steamcmd-local-check.md`.
- Run SteamPipe upload with the generated ignored VDF on a machine with SteamCMD and Steamworks credentials.
- Run the uploaded build through Steam client install/launch, controller checks, offline launch, and quit/relaunch.
- Decide whether achievements, cloud saves, and Steam Input metadata are in scope for v1.0 or a later update.

## Latest Runtime Probe

On 2026-05-21, the packaged executable at `release/desktop/win-unpacked/Nova Swarm.exe` passed:

- `npm run desktop:smoke:packaged`
- `npm run desktop:controls:packaged`
- `npm run probe:steam-leaderboard-electron -- --packaged --no-submit`
- `npm run check:desktop-package`

The packaged Electron leaderboard probe reported bridge `ready`, App ID `4765070`, persona `EvilEirik`, and successful `GLOBAL`/`FRIENDS` reads with zero entries. It also reported `launchedBySteamHint: false`, so this is still not Steam-installed write validation.

For a Steam-installed probe, set Steam launch options to `--steam-leaderboard-probe --details=none --score=1` and launch the app from Steam. The probe exits after one keep-best submit attempt and writes its JSON report under `%APPDATA%\\Nova Swarm\\test-results\\`.
