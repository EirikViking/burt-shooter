# Nova Swarm Improvement Track - 2026-07-06

Goal: implement and verify at least 50 new player-facing improvements while keeping rollback simple and preserving Steam/score/leaderboard/achievement safety boundaries.

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

Safety notes:

- No score, XP, leaderboard, achievement API ID, balance, Steamworks metadata, public branch, or live branch change in the source pass.
- Rollback should remain one source commit for this batch.
