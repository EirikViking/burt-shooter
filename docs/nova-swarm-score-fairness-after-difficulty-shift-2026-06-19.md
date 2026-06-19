# Nova Swarm Score Fairness After Difficulty Shift, 2026-06-19

## Summary

This is an analysis-only pass. It does not change scoring, leaderboard submission, leaderboard identity, save format, gameplay behavior, Steamworks metadata, packaging, upload state, SetLive, or Steam branch assignment.

Conclusion: the current harder early-wave build does not appear to disadvantage average clears, and perfect Sector 10 clears are slightly ahead of the old easier baseline. The risk is specifically low-combo clears: the shorter pacing removes enough low-skill base-score and wave-clear opportunity that a no-combo Sector 10 clear is estimated at 15.77% below the old baseline. If the next scoring change is meant to preserve comparability for low-combo new leaderboard runs, use a visible ranked/Mayhem score bonus of about 15%. If the target is average and high-skill leaderboard comparability only, no immediate score change is required.

## Baselines Compared

| Baseline | Commit | Notes |
| --- | --- | --- |
| Old easier baseline before early wave difficulty | `8b381fac3bcee96ce47b00fb6bdf8aab848c3edc` | Display/window/resolution accepted branch before normal-wave difficulty shift. |
| Raised wave difficulty and pacing accepted source | `b7c8d7eafcb63c223cf2e21ee44aa776cd058dd1` | `normalWaveDifficultyLevelOffset` 9 and five-wave boss pacing accepted. |
| Current build with early boss relief | `0aad2d87782c10168579a5c089c90dd8d7c93950` | Current private Steam test source with first 11 levels of boss relief. |

Current settings confirmed by the script:

| Setting | Old easier | Current |
| --- | ---: | ---: |
| `normalWaveDifficultyLevelOffset` | 0 | 9 |
| `MIN_WAVES_BETWEEN_BOSSES` | 6 | 5 |
| `wavesPerBossBase` | 6 | 5 |
| `wavesPerBossMax` | 7 | 7 |
| `bossEarlyDifficultyScalar` | none | 0.9 through level 11 |
| Main leaderboard | `nova_swarm_global_score_v2` | `nova_swarm_global_score_v2` |

## Method And Limits

The analysis script is `scripts/analyze-score-fairness-after-difficulty-shift.mjs`, runnable with `npm run check:score-fairness-after-difficulty-shift`.

The script loads historical `BalanceConfig.js` values directly from each baseline commit and reconstructs normal wave counts, enemy score budgets, HP budgets, boss score, boss HP, wave-clear score, sector-clear score, no-hit score, run-clear score, and starter-ship score-per-minute estimates through Sectors 5, 10, 20, and 30.

It also guards that these files are unchanged between the old easier baseline and the current source:

- `src/game/Game.js`
- `src/scenes/PlayScene.js`
- `src/config/GeneratedEnemyProfiles.js`
- `src/leaderboard/LeaderboardTypes.js`
- `src/leaderboard/LeaderboardAdapter.js`
- `src/leaderboard/SteamLeaderboardProvider.js`

Limitations:

- Random bonus drones, score multiplier pickups, discovery bonuses, trait bonuses, hijacker bonuses, and stochastic elite rolls are excluded.
- Combo behavior is modeled deterministically. Real combo uptime depends on player aim, ship, wave gaps, damage taken, and enemy routing.
- Score per minute uses starter-ship DPS and the existing pacing-check style of estimate, not a stopwatch capture.
- Run pressure elapsed-time score multipliers are not included because the same score formula is present in both baselines and actual routing changes the elapsed-time multiplier.

## Score Budget Through Target Sectors

These are cumulative deterministic budgets through each target sector, not per-sector-only values.

| Through Sector | Build | Waves | Enemies | Enemy Base Score | Normal HP Budget | Boss Score | Boss HP Budget | Wave Clear Score | Sector Clear Score |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | Old easier | 30 | 268 | 6,356 | 391 | 5,000 | 195 | 52,500 | 5,000 |
| 5 | Current | 25 | 315 | 5,841 | 522 | 5,000 | 176 | 37,500 | 5,000 |
| 10 | Old easier | 60 | 606 | 12,509 | 749 | 10,000 | 456 | 105,000 | 10,000 |
| 10 | Current | 52 | 712 | 13,241 | 1,347 | 10,000 | 412 | 81,000 | 10,000 |
| 20 | Old easier | 123 | 1,508 | 28,974 | 2,491 | 20,000 | 1,193 | 220,500 | 20,000 |
| 20 | Current | 112 | 1,645 | 31,204 | 3,213 | 20,000 | 1,143 | 186,000 | 20,000 |
| 30 | Old easier | 193 | 2,595 | 48,988 | 4,681 | 30,000 | 2,219 | 360,500 | 30,000 |
| 30 | Current | 172 | 2,635 | 50,240 | 5,225 | 30,000 | 2,169 | 291,000 | 30,000 |

Fewer waves reduce wave-clear score sharply. Higher normal-wave intensity offsets that for average combo play by adding more/higher-value enemies, but not enough for no-combo clears.

## Skill Model Comparison Versus Old Easier Baseline

| Through Sector | Model | Total Score Delta | Score Delta | Score Per Minute Delta |
| ---: | --- | ---: | ---: | ---: |
| 5 | Low combo clear | -15,515 | -22.53% | -23.76% |
| 5 | Average clear | +14,576 | +13.88% | +13.84% |
| 5 | Perfect clear | -2,656 | -1.57% | -0.18% |
| 10 | Low combo clear | -23,268 | -15.77% | -21.92% |
| 10 | Average clear | +44,646 | +17.85% | +12.82% |
| 10 | Perfect clear | +11,648 | +3.09% | +1.73% |
| 20 | Low combo clear | -32,270 | -10.78% | -14.05% |
| 20 | Average clear | +129,452 | +20.40% | +17.97% |
| 20 | Perfect clear | +16,850 | +1.96% | +1.58% |
| 30 | Low combo clear | -68,248 | -14.23% | -14.62% |
| 30 | Average clear | +41,846 | +3.51% | +4.00% |
| 30 | Perfect clear | -71,719 | -4.98% | -3.62% |

## Recommendation

Recommended bonus if scoring is changed later: 15%.

Where it should apply: a visible ranked/Mayhem score bonus applied to the final ranked score, or equivalently to normal-wave score values if the intent is to compensate only the harder/shorter normal-wave path. A final-score modifier is simpler to explain and safer to tune, but it affects boss, sector-clear, run-clear, and no-hit contributions too. A normal-wave-only modifier is more targeted but harder to communicate and test.

Do not reset or replace `nova_swarm_global_score_v2` unless future data shows there is no fair alternative. Resetting would punish existing players and makes the previous accepted test builds harder to reason about. A documented, visible ranked/Mayhem bonus is a softer compatibility path.

If Mayhem/Ranked and Practice modes are split later, keep `nova_swarm_global_score_v2` for the ranked/default harder baseline unless there is a deliberate leaderboard migration. Practice should be unranked or use a separate leaderboard.

## Manual Test Advice

- Run a no-combo/low-combo Sector 10 clear and compare score feel to the old baseline expectation.
- Run an average Sector 10 clear with normal combo uptime and verify the score does not feel lower than before.
- If testing a future score bonus, start with +10% and +15% side-by-side in a local-only branch before touching the live leaderboard path.

## Rollback Note

This pass is docs/script only. Roll back with:

```bash
git revert <analysis-commit-sha>
```
