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
