# Career Rank synchronization — source only

The leaderboard now catches up to saved Career Rank without a new personal best or another rank increase. Rank number, authored title and badge use the same current career metadata. This change is not in Steam Build 25282423; no new build, packaging, upload or Steamworks setting change was performed.

## Provenance and preservation

- Worktree: `D:/vibe-coding-e/nova-swarm-forum-129-improvements-20260822`; verified physical D: directories without junctions.
- Branch: `codex/space-snake-broods-20260912`; starting HEAD `ab0734a` (the source-only mouse double-tap addition).
- Original continuation baseline `4663de2`; milestone ref `milestone/2026-09-13-encounter-brood-expansion` currently resolves to `be7f85be8c2c2918950a3b7236920ed4e9b63f40`.
- Fetch, status, branch, log and worktree checks completed before edits. The existing two shortened forum drafts and inherited untracked evidence were preserved, outside this commit. No reset, clean, stash, discard, merge or remote push.
- The black-screen forum report is deferred at the user's request.

## Root causes and changes

1. `Game.js` only refreshed leaderboard Career Rank after an increase above 40. Eligible finalization now refreshes all current ranks, even without an increase.
2. Existing stale records had no catch-up trigger. Availability checks and leaderboard reads now queue the saved Hangar Career Rank through the existing refresh/retry mechanism. A leaderboard read waits for the pending repair before displaying entries. A higher pending offline rank wins over a lower request.
3. The renderer called `getPlayerBest`, but Electron did not expose it. Added the preload/IPC/native lookup using Steam's `GlobalAroundUser` request with offsets 0,0 and strict signed-in Steam ID matching. It is not limited to the top 100. Fresh-profile IPC returns null without accessing Steam. API behavior checked against [Valve's documentation](https://partner.steamgames.com/doc/api/ISteamUserStats#ELeaderboardDataRequest).
4. Metadata force-updates now skip equal/lower ranks and preserve all competitive detail integers and the stored score. Score submissions and metadata refreshes share a serialized transaction queue, preventing one from writing an obsolete read over the other in this game process. A higher stored rank also survives a new score submitted from older local progress, including ranks above int32.
5. Number, badge and title now resolve from the same Career Rank. Legacy fallback remains available when metadata is absent; authored artwork/titles stay capped at the final authored rank for endless ranks. This affects presentation only, not competitive run data.

The native Steam request and the read/write sequence still require a live check in the next approved desktop build. These tests do not prove atomicity against an unrelated device uploading to the same Steam account concurrently.

## Files changed

- `src/game/Game.js`
- `src/leaderboard/LeaderboardAdapter.js`
- `src/leaderboard/LeaderboardTypes.js`
- `src/leaderboard/SteamLeaderboardProvider.js`
- `src/scenes/HighscoreScene.js`
- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/steamLeaderboardBridge.cjs`
- `scripts/check-unbounded-career-rank.mjs`
- `scripts/check-steam-electron-bridge.mjs`
- `scripts/check-career-rank-runtime.mjs`
- `progress.md` and this report

## Validation

Passed:

- `node scripts/check-unbounded-career-rank.mjs`: stored 22 -> 29 on first read without a new run/PB, legacy records, all three boards' exact score/details preservation, idempotency, no-row behavior, offline restart/retry, partial failure, stale requests, concurrent PB/metadata transactions, 40+, int32 boundary, huge ranks, and rejection of another same-name player's details.
- `node scripts/check-steam-electron-bridge.mjs`: native lookup arguments, identity filtering, preload exposure and existing bridge contracts.
- `node scripts/check-leaderboard-adapter.mjs`
- `node scripts/check-leaderboard-pending-steam.mjs`
- `node scripts/check-rank-progression.mjs`
- `node scripts/check-i18n.mjs`; no new strings or untranslated text introduced. Existing proper rank names are reused.
- `node scripts/check-career-rank-runtime.mjs` against a source-only Vite server: real finalization at unchanged 29, 22 -> 23 and 40 -> 41, repeated finalization idempotency, and a displayed mock Steam record catching up from 22 to 29 while retaining score 7,654,321. The badge lookup selects authored index 28. Final report has no page errors; screenshots inspected.
- Installed web-game skill client, with a temporary compatibility copy selecting installed Chrome: completed source-menu capture/state export without reported page errors.
- `git diff --check`.

Earlier attempts: the stock skill client lacked its expected bundled Chromium executable; the source server initially scanned historical output folders and timed out. Restricting dependency entries/watch scope and using installed Chrome resolved the source runtime check. One visual fixture initially referred to the wrong scene property (`highscores` instead of `entries`); corrected before final pass. The separate fresh-profile desktop smoke was stopped after noticing its default output path was on D:; its job-owned files were moved to E: for cleanup. Do not count that desktop smoke as passed.

No `build:current`, packaging, production `check:i18n-ui`, or new-build desktop smoke was run because the user explicitly requested no new build. Current source behavior was exercised in an isolated browser profile with mocked Steam; actual Steam records were not changed.

## Next approved build: player checks

1. While online, open Hangar and note Career Rank, then open Pure, Tactical and Sector boards. Each existing own record should show that Career Rank immediately after loading, without playing a run. The score and run details must remain unchanged.
2. On Pure/Tactical, confirm the rank title and badge agree with the Hangar's current authored rank. Sector keeps its existing reached-sector subtitle.
3. Finish a run below your personal best, both without gaining a rank and after gaining a rank below 40; reopen the boards and check consistency. Repeat across 40 -> 41 when available.
4. Earn progress offline, then reconnect/relaunch. Existing records should catch up; older local progress must not lower a higher rank already on Steam.

## Evidence and rollback

Retained test evidence only (no game build): `E:/Codex/builds/nova-swarm/career-rank-sync-20260913/`, including runtime report/screenshots, skill-client capture/state and small reproduction helpers. Temporary work belongs exclusively to `E:/Codex/tmp/nova-career-rank-20260913`; TEMP/TMP were set there and shared caches were not cleared.

Cleanup limitation: automatic approval review rejected removal of this task's temporary directory with `blocked by policy`. The directory remains, including Vite cache and disposable failed browser profiles. Test processes were stopped; no deletion was retried or bypassed. The earlier mouse-task cleanup block is separate and unchanged.

Rollback is an inverse commit: `git revert <the Career Rank synchronization commit>`. Do not reset to the baseline, because the source-only mouse fix, forum drafts and inherited evidence must remain preserved.
