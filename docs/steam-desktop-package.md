# Nova Swarm Desktop / Steam Package

Nova Swarm now has a Windows desktop package path for Steam release-candidate work.

## Build

```bash
npm run desktop:smoke
npm run package:steam:win
```

Outputs:

- Desktop smoke evidence: `test-results/electron-smoke-*/`
- Steam candidate payload: `release/desktop/win-unpacked/`
- Launch executable: `release/desktop/win-unpacked/Nova Swarm.exe`

`release/desktop/` is intentionally ignored because it is generated release output, not source.

## Runtime Shape

The Electron wrapper starts a local loopback server, serves the Vite `dist/` build, and implements `/api/highscores` locally. That means the Steam build can launch and keep a local leaderboard even when the Cloudflare Pages Functions API is not available.

The web deployment remains unchanged and still uses Cloudflare Pages and D1 at `https://burt.tinyfoundry.app`.

Latest verified package evidence:

- `npm run desktop:smoke` passed and wrote `test-results/electron-smoke-2026-05-17T10-17-05-615Z/`.
- `npm run package:steam:win` produced `release/desktop/win-unpacked/Nova Swarm.exe`.
- `npm audit --omit=dev` reports `found 0 vulnerabilities`.
- Dev-only audit caveat: the non-omitted audit still reports Vite/esbuild dev-server advisories that npm says require a breaking Vite major upgrade.

## Steamworks Handoff

The template at `release/steamworks/app_build_TEMPLATE.vdf` maps all files from `release/desktop/win-unpacked/` into a Steam depot. Before upload, replace:

- `STEAM_APP_ID_HERE`
- `STEAM_DEPOT_ID_HERE`

Suggested Steam launch option:

```text
Nova Swarm.exe
```

Reference checked on 2026-05-17:

- SteamPipe uploading docs: https://partner.steamgames.com/doc/sdk/uploading
- Steam platform support docs: https://partner.steamgames.com/doc/store/application/platforms

## Remaining Manual Steam Steps

- Confirm the actual Steam app ID and depot ID in Steamworks.
- Run SteamPipe upload with the edited VDF on a machine with SteamCMD and Steamworks credentials.
- Run the uploaded build through Steam client install/launch, controller checks, offline launch, and quit/relaunch.
- Decide whether achievements, cloud saves, and Steam Input metadata are in scope for v1.0 or a later update.
