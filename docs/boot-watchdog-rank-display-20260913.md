# Nova Swarm — boot watchdog and Career Rank display repair

The private Steam beta now contains the repair from source commit `b11d36d`.

## User-visible result

- A delayed compositor or first-use GPU upload no longer turns the final menu reveal into a fatal `BOOT TIMEOUT - STUCK AT hide loading` overlay. The reveal waits for a bounded frame grace period and uses a non-blocking GPU flush.
- The signed-in pilot's highlighted leaderboard row now uses the current Hangar Career Rank when Steam briefly returns an older cached metadata row. A higher stored rank and every score/run detail remain preserved. Rank number, title and badge resolve from the same effective rank.

The screenshot's two values were therefore caused by two separate issues: the old package's startup watchdog was too strict, and the leaderboard presentation trusted a stale Steam row immediately after the metadata refresh. Other pilots' different ranks remain per-player data and are unchanged.

## Provenance

- Worktree: `D:/vibe-coding-e/nova-swarm-forum-129-improvements-20260822`
- Branch: `codex/space-snake-broods-20260912`
- Continuation baseline: `4663de2`; milestone ref resolves to `be7f85be8c2c2918950a3b7236920ed4e9b63f40`
- Repair commit: `b11d36d` (`Fix boot watchdog and stale career rank display`)
- Existing source, evidence, forum drafts and untracked inherited WIP were preserved. No reset, clean, stash, discard, merge or remote push.

## Validation

- `npm run check:release-line`: pass.
- `npm run build:current -- --outDir E:/Codex/builds/nova-swarm/boot-watchdog-rank-fix-20260913/dist`: pass; 1,022 modules built.
- Steam native staging and `check-steam-package-runtime`: pass for AppID `4765070` and `nova_swarm_global_score_v2`.
- Source career-rank runtime: pass for unchanged rank 29, 22 -> 23, 40 -> 41, idempotent finalization, and a displayed Steam row catching up from 22 to 29 while retaining score `7,654,321` and badge index 28.
- Packaged desktop smoke: pass; build `v2026-09-13_13-28-12`, commit `b11d36d`, scene `menu`, zero console events.
- Packaged controls: pass; keyboard and gamepad movement, firing and pause, with no screenshot warnings or errors.
- Targeted input, Steam bridge, leaderboard adapter/pending queue, unbounded rank, rank progression and i18n checks: pass. No player-facing strings were added.

## Steam receipt

- AppID `4765070`, depot `4765071`
- BuildID `25286658`
- Depot manifest `8880927934099950069`
- Build version `v2026-09-13_13-28-12`
- `SetLive`: `sector-continue-test`
- `resources/app.asar` SHA-256: `363C0AE55B101941C1A7942D96FEF44B7133A3A2B617366DC25AAF439CE3F7BC`
- Tested package: `E:/Codex/builds/nova-swarm/boot-watchdog-rank-fix-20260913/release/desktop/win-unpacked`

Steamworks changes were limited to this private beta upload. Public/default and legacy `test-build` assignments, store metadata, achievements, Cloud settings and leaderboard definitions were untouched. No public release was performed.

## Test and rollback

In Steam, choose **Nova Swarm → Properties → Betas → `sector-continue-test`**, wait for BuildID `25286658`, and launch normally. Open Hangar, note the current rank, then open Tactical, Pure and Sector boards. The highlighted `TINY FOUNDRY` row should show the same rank number, title and badge as Hangar while retaining its existing score and run details. Relaunch once to exercise the cached path, and confirm startup reaches the menu without the red freeze overlay.

To roll back only the private beta, reassign `sector-continue-test` to BuildID `25284959`. To undo the source repair without rewriting history, use `git revert b11d36d` after checking current worktree ownership.
