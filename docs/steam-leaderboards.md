# Nova Swarm Leaderboard Runtime

The leaderboard screen keeps the same visual deck. Data now flows through `src/leaderboard/LeaderboardAdapter.js`:

`HighscoreScene` / `GameOverScene` -> `LeaderboardAdapter` -> Steam, cloud, or local providers.

## Runtime Behavior

- Web: `GLOBAL` uses the existing Cloudflare/D1 `/api/highscores`; `LOCAL` uses browser local storage.
- Steam-capable runtime: `GLOBAL` uses Steam global scores, `FRIENDS` uses Steam friends scores, and `LOCAL` remains available as a backup/history board.
- Offline/fallback: if no cloud or Steam provider is available, local scores still load and score submission failure never blocks `ONE MORE RUN`.

## Steamworks Setup

Create this leaderboard in Steamworks App Admin:

- Internal name: `nova_swarm_global_score`
- Community name: `Global High Score`
- Sort method: Descending
- Display type: Numeric
- Writes: client writes are expected unless you later move to trusted Web API writes
- Reads: keep public/global reads enabled; the game requests friends entries through the same leaderboard

Steam supports one entry per player, an int32 score, and optional int32 detail metadata. Nova Swarm sends score as the sortable value and details as:

1. level reached
2. ship numeric id
3. run time seconds
4. kills
5. boss kills
6. waves cleared

## Steam Bridge Contract

No native Steamworks library is imported by the web bundle. A Steam/Electron preload or wrapper should expose one of these globals only in the Steam build:

- `window.__novaSteamLeaderboard`
- `window.novaSteamLeaderboard`
- `window.__novaSteam.leaderboards`
- `window.novaSteam.leaderboards`
- `window.__novaSteamBridge.leaderboards`

Expected async methods:

- `isAvailable()`
- `getPersonaName()`
- `getTopScores({ leaderboardName, request: "global", start, end, limit })`
- `getFriendsScores({ leaderboardName, request: "friends", limit })`
- `submitScore({ leaderboardName, score, details, uploadMethod: "keep_best" })`

For local validation without Steam, open with `?mockSteamLeaderboard=1`. This enables the mock provider and shows `GLOBAL / FRIENDS / LOCAL` tabs.

References: Steamworks `ISteamUserStats` leaderboards use `FindLeaderboard` or `FindOrCreateLeaderboard`, `DownloadLeaderboardEntries`, `k_ELeaderboardDataRequestFriends`, and `UploadLeaderboardScore`. See the official Steamworks leaderboard overview at https://partner.steamgames.com/doc/features/leaderboards and the `ISteamUserStats` API reference at https://partner.steamgames.com/doc/api/ISteamUserStats.
