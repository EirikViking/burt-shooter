# Nova Swarm Boss Cliff Audit Smoothing - 2026-06-20

## Summary

This pass follows the boss 2 and sector 22 fairness work with a broader early boss cliff audit. The goal is not to nerf bosses. Normal waves still rarely take lives, so bosses must remain able to kill players and create real run tension.

The pass adds a deterministic `check:boss-cliff-audit` guard and applies small, scoped relief to the early bosses most likely to feel unfair rather than merely hard.

## Design Rule

Bosses should stay lethal. This pass only smooths the most refund-risk edges:

- Slightly later first danger.
- Slightly longer regular/signature tells.
- Slightly slower repeat cadence.
- Small ring safe-lane widening where the boss already uses ring pressure.
- No HP reduction.
- No boss damage reduction.
- No score, leaderboard, achievements, save, Steamworks, or mode-rule changes.

For sectors 9, 15, 18, and 19, phase 2 and phase 3 shot counts are preserved. Those bosses still throw their dangerous patterns.

Sector 22 is intentionally different: it keeps the softer `NOVA DEVOURER` playtest version so it can be tested before being hardened or retuned again.

## Candidate Results

Latest focused report:

`test-results/boss-cliff-audit-2026-06-20T17-03-41-450Z/report.json`

| Sector | Boss | Raw pressure | Smoothed Mayhem | Ratio | Scout | First danger |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 9 | HYPERGLYPH | 2.121 | 1.918 | 0.904 | 1.152 | 2872 ms |
| 15 | STARLOCK DUCHESS | 3.514 | 3.208 | 0.913 | 1.957 | 2813 ms |
| 18 | PANIC ENGINE | 2.054 | 1.909 | 0.929 | 1.233 | 2804 ms |
| 19 | CRYSTAL CAPTAIN | 2.504 | 2.217 | 0.885 | 1.337 | 2922 ms |
| 22 | NOVA DEVOURER | 2.984 | 2.062 | 0.691 | 1.310 | 3040 ms |

## Scoped Relief

Sectors 9, 15, 18, and 19 are intentionally only slightly smoothed. They keep their phase 2 and phase 3 shot counts, and the audit rejects over-smoothing by requiring pressure to remain close to the raw boss.

Sector 22 keeps the softer playtest exception:

- `NOVA DEVOURER` remains `forge / burst / ring`.
- Phase 2 burst is 4 shots.
- Phase 3 burst is 4 shots.
- Ring gap and tells are slightly more readable.
- This is kept for hands-on testing before any further adjustment.

All relief is scoped by profile id and `maxLevel`, so later roster repeats do not inherit early cliff smoothing.

## Manual Test Plan

1. Test Mayhem boss 2 from the latest private build first.
2. Test sector 22 `NOVA DEVOURER` and decide whether the 4-shot softer version should stay, be partially hardened, or be adjusted differently.
3. Test Mayhem sectors 9, 15, 18, and 19 for readability while confirming each boss can still kill careless play.
4. Test Scout on the same sectors to confirm it remains calmer but not toothless.

## Rollback

`git revert <source-commit>`
