# Nova Swarm Leaderboard Runtime

The leaderboard screen keeps the same visual deck. Data now flows through `src/leaderboard/LeaderboardAdapter.js`:

`HighscoreScene` / `GameOverScene` -> `LeaderboardAdapter` -> Steam, cloud, or local providers.

## Runtime Behavior

- Web: `GLOBAL` uses the existing Cloudflare/D1 `/api/highscores`; `LOCAL` uses browser local storage.
- Steam-capable Electron runtime: `GLOBAL` uses Steam global scores, `FRIENDS` uses Steam friends scores, and `LOCAL` remains available as a backup/history board.
- Offline/fallback: if no cloud or Steam provider is available, local scores still load and score submission failure never blocks `ONE MORE RUN`.
- Pre-release score normalization: gameplay score awards are stored, displayed, and submitted at `0.1x` the previous scale using `Math.round`. Local browser and Electron boards moved to v2 storage with low fictional seed scores (`500` through `7900`) so old inflated local rows are not mixed with new runs.
- App-owned global reset: run `NOVA_SWARM_RESET_LEADERBOARD=I_UNDERSTAND_PRE_RELEASE_RESET npm run leaderboard:reset-pre-release` to delete D1 pre-release rows and seed the same low fictional board. Do this only for pre-release cleanup.
- Steam migration: no Steam leaderboard migration is required until Steam writes are accepted. Future Steam submissions receive the already-normalized run score from `Game.score`.

## Steamworks Setup

Create this leaderboard in Steamworks App Admin:

- Internal name: `nova_swarm_global_score`
- Community name: `Global High Score` if the App Admin UI exposes it. The current UI may show this blank while the internal leaderboard exists.
- Sort method: Descending
- Display type: Numeric
- Writes: client writes are expected unless you later move to trusted Web API writes
- Reads: the current App Admin UI shows `Friends`. `FRIENDS` uses Steam's friends request against the same leaderboard. If `GLOBAL` fails in Steam-client testing while `FRIENDS` works, revisit the Reader/visibility setting.

Steam supports one entry per player, an int32 score, and optional int32 detail metadata. Nova Swarm sends score as the sortable value and details as:

1. level reached
2. ship numeric id
3. run time seconds
4. kills
5. boss kills
6. waves cleared

## Electron Bridge

No native Steamworks library is imported by the Vite/browser bundle. The Electron main process owns native access in `electron/steamLeaderboardBridge.cjs`, and `electron/preload.cjs` exposes a narrow renderer API:

- `window.__novaSteamLeaderboard`
- `window.__novaSteamBridge.leaderboards`

Expected async methods:

- `isAvailable()`
- `getPersonaName()`
- `getTopScores({ leaderboardName, request: "global", start, end, limit })`
- `getFriendsScores({ leaderboardName, request: "friends", limit })`
- `submitScore({ leaderboardName, score, details, uploadMethod: "keep_best" })`
- `getLastUploadDiagnostics()`

Native dependency status:

- `steamworks-ffi-node` is an optional dependency and is loaded only by Electron main process code.
- If `steamworks-ffi-node`, a Steam App ID, the Steam client, or SDK redistributables are missing, `isAvailable()` returns `false` and the game falls back safely.
- The renderer never gets filesystem, shell, or broad IPC access.
- Upload diagnostics are available through `window.__novaSteamLeaderboard.getLastUploadDiagnostics()` and are also saved after a Steam submit failure to `localStorage` key `novaSwarm.lastSteamUploadDiagnostics.v1`. `render_game_to_text()` includes the same value for manual Steam-runtime probes.
- In-game hidden export: press `Ctrl+Alt+Shift+D`, or run `await window.__novaSteamDiagnostics.copy()` in DevTools, to copy the current Steam diagnostics bundle. This does not change the visible leaderboard UI.

## SDK-Ready Setup

The local SDK folder is ignored by git. Expected layout:

```text
steam_sdk/
  sdk/
    redistributable_bin/
      steam_api.dll
      win64/steam_api64.dll
```

The bridge also accepts `steamworks_sdk/redistributable_bin/...` or an explicit `NOVA_SWARM_STEAMWORKS_SDK_PATH` / `STEAMWORKS_SDK_PATH`.

Required Windows files for the current Electron build:

- `steam_sdk/sdk/redistributable_bin/steam_api.dll`
- `steam_sdk/sdk/redistributable_bin/win64/steam_api64.dll`

The Electron packager includes and unpacks `steam_sdk/sdk/redistributable_bin/**/*` and `steamworks_sdk/redistributable_bin/**/*` when those folders exist.

Configure the Steam App ID for a real Steam-client test with one of:

- `NOVA_SWARM_STEAM_APP_ID=<numeric app id>`
- `STEAM_APP_ID=<numeric app id>`
- an ignored `steam_appid.txt` file in the repo root

Checks:

- `npm run check:steam-sdk-ready` verifies the SDK redistributables and optional native package.
- `npm run check:steam-electron-bridge` verifies the native adapter contract with a mocked Steamworks SDK, the preload surface, and renderer isolation.
- `npm run desktop:smoke:current` verifies the Electron app still runs when Steam is unavailable.
- `npm run probe:steam-leaderboard-live` is a manual live probe for the real `nova_swarm_global_score` leaderboard. It uses the same native adapter as Electron and writes a JSON report under `test-results/`.
- `npm run probe:steam-leaderboard-electron` is a manual Electron/preload/IPC probe for the same leaderboard. It can run against local Electron or the packaged executable with `-- --packaged`.
- `npm run steamworks:leaderboard-write-diagnose` is a read-only checklist/report command. It reads local build files, Steam install manifests, and recent probe reports, then prints the exact Steamworks values to verify.

Live probe prerequisites:

- Steam client is running and the account has access to App ID `4765070`.
- `steam_appid.txt` contains `4765070`, or `NOVA_SWARM_STEAM_APP_ID` / `STEAM_APP_ID` is set.
- Steamworks SDK redistributables exist at `steam_sdk/sdk/redistributable_bin/`.
- `steamworks-ffi-node` is installed through `npm install`.

Current live result from local Node with `steam_appid.txt`: bridge ready, `nova_swarm_global_score` opens, global download succeeds with `0` entries, friends download succeeds with `0` entries, and keep-best upload of score `1` returned `Score upload was not successful`. The no-details variant failed the same way, so metadata formatting is not the likely first blocker. Steam leaderboard read path is verified locally; write path is pending.

Current Steam-installed result for build `23351534`: the game launches from Steam, shows `GLOBAL / FRIENDS / LOCAL`, friends read works but is empty, local backup saves, and Steam global submission still fails. Steam leaderboard read path is verified in Steam runtime; write path is pending. Upload diagnostics added after this build need a new SteamPipe build before they can prove the raw Steam callback result in the Steam-installed runtime.

Upload implementation note: `steamworks-ffi-node@0.10.3` documents `uploadScore(leaderboardHandle, score, uploadMethod, details?)`, while the underlying Steamworks SDK function is `UploadLeaderboardScore(handle, method, score, detailsPtr, detailsCount)`. Nova Swarm now uses a direct diagnostic SDK upload path when the wrapper internals are available so failed uploads preserve the raw `LeaderboardScoreUploaded_t` callback fields instead of collapsing to `null`.

Official Steamworks notes relevant to the current failure:

- `LeaderboardScoreUploaded_t.m_bSuccess = 0` is documented for either too many detail values or a leaderboard set to `Trusted`. Nova Swarm's `details=none`, `score=1` probe still returns `m_bSuccess: 0`, so detail length is not the likely blocker.
- `UploadLeaderboardScore` is rate-limited to 10 uploads per 10 minutes and one outstanding call. Keep probes to one submit per pass.
- Steam testing depends on package entitlement: the Dev Comp or Beta Testing package used by the account must include App ID `4765070` and Windows depot `4765071`.

The default live probe submits one deliberately low keep-best score of `1` with metadata `[1, 0, 1, 0, 0, 0]`. It does not force-overwrite, reset, or delete leaderboard data. Useful flags:

- `npm run probe:steam-leaderboard-live -- --no-submit` runs read-only global/friends checks.
- `npm run probe:steam-leaderboard-live -- --details=none --score=1` submits without metadata to isolate details formatting.
- `npm run probe:steam-leaderboard-live -- --details=empty --score=1` submits an empty details array.
- `npm run probe:steam-leaderboard-live -- --score=1001` submits a custom keep-best score.
- `npm run probe:steam-leaderboard-live -- --force-update --score=1` is available only for intentional manual diagnosis. Do not use it casually because it can overwrite an existing better score.

Electron runtime probe examples:

- `npm run probe:steam-leaderboard-electron -- --no-submit` runs read-only checks through the renderer preload bridge.
- `npm run probe:steam-leaderboard-electron -- --details=none --score=1` submits one low keep-best score through the Electron IPC path.
- `npm run probe:steam-leaderboard-electron -- --packaged --no-submit` runs the read-only probe against `release/desktop/win-unpacked/Nova Swarm.exe`.
- `npm run probe:steam-leaderboard-steam-installed -- --dry-run --details=none --score=1` prints the Steam client launch command without starting the game.
- `npm run probe:steam-leaderboard-steam-installed -- --details=none --score=1` attempts one Steam-launched keep-best submit through `Steam.exe -applaunch 4765070 ...`. If no report appears, Steam likely ignored the extra launch args; set Steam client Properties -> Launch Options to `--steam-leaderboard-probe --submit --details=none --score=1`, launch once, then remove the launch options.

The Electron probe intentionally does not support force update. It records whether the app looks Steam-launched through Steam environment hints, but the only authoritative write validation is still an installed build launched from the Steam client. Packaged/Steam-installed probe reports are written under Electron user data by default, usually `%APPDATA%\\Nova Swarm\\test-results\\steam-leaderboard-electron-*\\report.json`.

Do not spam submissions. Prefer one read-only run, one default keep-best run, then one no-details run if default still fails. Interpret results as:

- Bridge unavailable: check Steam client/login, app access, App ID config, SDK redistributables, and native package install.
- Leaderboard open failed: confirm `nova_swarm_global_score` exists for App ID `4765070`.
- Friends download works but global download fails: the current Steamworks Reader/Leser setting may be limiting global reads; investigate that before deleting or recreating the leaderboard.
- Local Node reads work but writes fail: test from a Steam-client-installed launch before overfitting code, then verify Steamworks write settings and wrapper upload mapping.
- Submit succeeds and entries can be downloaded: Steam leaderboard read/write path is verified locally, but the Steam-installed build still needs the manual runtime checklist below.

SteamPipe status on 2026-05-21: App ID `4765070` and Windows depot ID `4765071` are known. `release/steamworks/app_build_LOCAL.vdf` is ignored and should be regenerated locally for SteamPipe uploads; do not commit it or any Steam credentials.

Current diagnosis as of build `23352036`: installed Steam manifest matches build `23352036`, local and packaged probes can open/read the leaderboard, and the raw upload callback returns `m_bSuccess: 0` with `details=none`. The most likely remaining cause is Steamworks backend/config/entitlement state, not local upload signature. Check only:

- Leaderboard config: `nova_swarm_global_score`, Writes `Client`, Sort `Descending`, Display `Numeric`; do not delete/reset/recreate.
- Builds: default branch points to `23352036` or newer diagnostics build; do not release/publish or alter pricing/date.
- Packages: the Dev Comp or Beta Testing package used by `gaunziman` / `EvilEirik` includes app `4765070` and depot `4765071`.
- Steam client console: `licenses_for_app 4765070` should show the package and depot used by this account.

For local validation without Steam, open with `?mockSteamLeaderboard=1`. This enables the mock provider and shows `GLOBAL / FRIENDS / LOCAL` tabs.

## Manual Steam Runtime Checklist

1. Install/launch Nova Swarm from Steam client or a Steam runtime test environment.
2. Confirm Steam overlay works, if overlay support is expected.
3. Open leaderboard screen.
4. Confirm tabs show `GLOBAL / FRIENDS / LOCAL`.
5. Confirm `GLOBAL` source label says `Steam Global`.
6. Confirm `FRIENDS` source label says `Steam Friends`.
7. Play a short run and die.
8. Confirm no manual name entry is required.
9. Confirm Steam persona name is used.
10. Confirm score submission succeeds or gives a clear friendly failure.
11. Confirm local backup score is saved.
12. Confirm `ONE MORE RUN` appears after submission/fallback.
13. Restart and confirm no duplicate submission/event listener issues.
14. Relaunch game and confirm leaderboard data can still load.
15. If `GLOBAL` fails but `FRIENDS` works, revisit the Steamworks Reader setting.

References: Steamworks `ISteamUserStats` leaderboards use `FindLeaderboard` or `FindOrCreateLeaderboard`, `DownloadLeaderboardEntries`, `k_ELeaderboardDataRequestFriends`, and `UploadLeaderboardScore`. See the official Steamworks leaderboard overview at https://partner.steamgames.com/doc/features/leaderboards and the `ISteamUserStats` API reference at https://partner.steamgames.com/doc/api/ISteamUserStats.
