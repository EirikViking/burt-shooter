# Nova Swarm Desktop / Steam Package

Nova Swarm now has a Windows desktop package path for Steam release-candidate work.

## Build

```bash
npm run build
npm run package:steam:win:current
npm run desktop:smoke:current
npm run check:desktop-package
```

`npm run verify:steam-rc` runs the same current-build package and Electron-smoke gates as part of the fast RC path.

Outputs:

- Desktop smoke evidence: `test-results/electron-smoke-*/`
- Steam candidate payload: `release/desktop/win-unpacked/`
- Launch executable: `release/desktop/win-unpacked/Nova Swarm.exe`

`release/desktop/` is intentionally ignored because it is generated release output, not source.

## Runtime Shape

The Electron wrapper starts a local loopback server, serves the Vite `dist/` build, and implements `/api/highscores` locally. That means the Steam build can launch and keep a local leaderboard even when the Cloudflare Pages Functions API is not available.

The web deployment remains unchanged and still uses Cloudflare Pages and D1 at `https://burt.tinyfoundry.app`.

Latest verified package evidence:

- `npm run verify:steam-rc` passed at `test-results/steam-rc-verify-2026-05-17T16-16-07-474Z/report.json`.
- `npm run desktop:smoke:current` passed and wrote `test-results/electron-smoke-2026-05-17T16-40-53-251Z/` for build `v2026-05-17_18-38-06`.
- `npm run package:steam:win:current` produced `release/desktop/win-unpacked/Nova Swarm.exe` at 226,666,496 bytes.
- `npm run check:desktop-package` passed and wrote `release/steamworks/desktop_package_review_report.json`, confirming the packaged executable, Electron intro/menu render, local highscore API, captured screenshot, matching current build ID, package modified time newer than the build timestamp, and zero Electron smoke console events.
- `npm audit --omit=dev` reports `found 0 vulnerabilities`.
- Dev-only audit caveat: the non-omitted audit still reports Vite/esbuild dev-server advisories that npm says require a breaking Vite major upgrade.

The desktop package checker intentionally fails stale evidence. The latest Electron smoke `build` must match `public/version.json`, and the packaged executable must be newer than the current build timestamp.

## Steamworks Handoff

The template at `release/steamworks/app_build_TEMPLATE.vdf` maps all files from `release/desktop/win-unpacked/` into a Steam depot. Before upload, replace:

- `STEAM_APP_ID_HERE`
- `STEAM_DEPOT_ID_HERE`

Or generate the ignored local upload VDF:

```bash
STEAM_APP_ID=<app id> STEAM_DEPOT_ID=<depot id> npm run steamworks:write-vdf
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

- Confirm the actual Steam app ID and depot ID in Steamworks.
- Local SteamCMD now runs from ignored `tools/steamcmd/`; see `docs/reviews/2026-05-17-steamcmd-local-check.md`.
- Run SteamPipe upload with the edited VDF on a machine with SteamCMD and Steamworks credentials.
- Run the uploaded build through Steam client install/launch, controller checks, offline launch, and quit/relaunch.
- Decide whether achievements, cloud saves, and Steam Input metadata are in scope for v1.0 or a later update.
