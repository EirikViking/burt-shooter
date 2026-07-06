# Nova Swarm Improvement Track - 2026-07-06

Goal: implement and verify at least 50 new player-facing improvements while keeping rollback simple and preserving Steam/score/leaderboard/achievement safety boundaries.

Expanded 2026-07-06 request: continue toward 100 additional improvements after batch 4, still in small rollback-friendly batches.

## Batch 1 - Pilot Orders Loop Clarity

Source target: `codex/main-menu-run-contracts-20260702`

1. Mayhem briefing now surfaces the next active Pilot Order before launch.
2. In-run Pilot Orders start and pause cues now include overall track progress, such as `49/50`.
3. Pilot Orders completion banners and Run Report now show overall track progress, such as `50/50`.

Verification:

- `npm run check:run-contracts`
- Screenshots: `test-results/run-contracts-2026-07-06T16-00-15-473Z/`
- Steam private build: `24076150`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, public branch, or live branch change.
- Rollback should remain a single source commit for this batch.

## Batch 2 - Pilot Orders Review Follow-Through

Source target: `codex/main-menu-run-contracts-20260702`

4. Hangar Career Intel now shows active Pilot Orders with progress inside the review/archive panel.
5. The shared Pilot Orders state now exposes the next queued order after the current active slots.
6. Run Report can show the next queued Pilot Order after reporting completed or progressed orders.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T16-37-26-157Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Generic `develop-web-game` Playwright client was attempted but blocked by the local missing Chromium headless-shell install; repo-native Playwright checks passed with local Chrome.

## Batch 3 - Pilot Orders Readability Meters

Source target: `codex/main-menu-run-contracts-20260702`

7. Main-menu Pilot Orders rows now include visual progress meters in addition to numeric counters.
8. Hangar Career Intel Pilot Orders review now color-codes active, next, and completed order lines.
9. Run Report Pilot Orders summaries now split multi-item summaries across readable lines instead of one dense comma chain.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T16-56-48-857Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Generic `develop-web-game` Playwright client remains blocked by the local missing Chromium headless-shell install; repo-native Playwright checks passed with local Chrome.

## Batch 4 - Pilot Orders Handoff Cues

Source target: `codex/main-menu-run-contracts-20260702`

10. Pilot Orders completion banners now show the next queued order when the track is not finished.
11. Pilot Orders progress banners now include overall track progress and use a safer left-side framed notice.
12. Run Report now reserves a `NEXT` line after non-final Pilot Order completions so follow-up goals are not crowded out.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T17-30-38-648Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- Steam private build: `24077384`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, public branch, or live branch change in the source pass.
- Rollback should remain one source commit for this batch.

## Batch 5 - Pilot Orders Review Path

Source target: `codex/main-menu-run-contracts-20260702`

13. Fresh Pilot Orders now introduce the board as Mayhem tactics training before anything has been cleared.
14. Once any Pilot Order is cleared, the main-menu board and Ship Hangar dock card point players toward the review/archive path.
15. Career Intel now summarizes active, queued, and completed Pilot Orders in the archive header.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T18-13-30-768Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 6 - Pilot Orders Language Consistency

Source target: `codex/main-menu-run-contracts-20260702`

16. Run Report now uses the consistent `PILOT ORDERS` label instead of mixed-case `Pilot orders`.
17. How To Play now frames Pilot Orders as `OPTIONAL MAYHEM DRILLS`, reducing chore/quest-board feel.
18. How To Play now points completed-order review to Ship Hangar Career Intel, matching the actual UI path.

Verification:

- `npm run check:run-contracts`
- Screenshot proof: `test-results/run-contracts-2026-07-06T18-34-57-724Z/`
- `npm run check:how-to-play`
- Screenshot/report proof: `test-results/how-to-play-2026-07-06T18-36-23-663Z/`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 7 - Pilot Orders Archive Clarity

Source target: `codex/main-menu-run-contracts-20260702`

19. Hangar Career Intel now labels the Pilot Orders review panel as `PILOT ORDERS` instead of implying it only contains cleared orders.
20. The archive count now explicitly reads as a completed-order counter, such as `DONE 3/50`.
21. Active and queued archive rows now put progress first, making long review lists faster to scan.

Verification:

- `npm run check:run-contracts`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 8 - Pilot Orders Run Report Cleanup

Source target: `codex/main-menu-run-contracts-20260702`

22. Run Report Pilot Orders rows no longer repeat the section name inside the value text.
23. Pilot Orders track progress now renders as a concise `DONE x/50` line in Run Report.
24. Run Report now carries Pilot Orders track progress as structured data so Game Over owns the visible formatting.

Verification:

- `npm run check:run-contracts`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.

## Batch 9 - Pilot Orders Status Line Consistency

Source target: `codex/main-menu-run-contracts-20260702`

25. Run-start Pilot Orders nudges now use a compact status separator instead of a sentence-like colon.
26. Pause-menu Pilot Orders lines now use the same compact separator for active orders.
27. Pause-menu fallback lines preserve track progress when showing `NEXT` or `COMPLETE`.

Verification:

- `npm run check:run-contracts`
- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `git diff --check`

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, package, upload, public branch, or live branch change.
- Rollback should remain one source commit for this batch.
