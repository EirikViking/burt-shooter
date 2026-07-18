# Nova Swarm Mayhem Score And Difficulty Recalibration Analysis - 2026-06-22

## Scope

This is analysis only. No gameplay balance, score formula, XP formula, enemy behavior, boss behavior, wave progression, save format, Steamworks metadata, Steam Cloud settings, achievements, or leaderboard behavior was changed.

The goal was to test temporary tuning variants after the first old-vs-current analysis supported the player report that current Mayhem is harder, lower scoring, and worse for personal best chasing than the pre-Mayhem public ranked flow.

## Baselines

| Line | Steam BuildID | Source commit |
| --- | ---: | --- |
| Previous public ranked flow | 23809188 | `8b0d5609c41b686979446a8e88d902f5ca89afa5` |
| Current accepted Mayhem line | 23854561 | `f6d372a11b084550753047436432a1929591adc6` |
| Analysis branch starting point | n/a | `674180a5596c5c02d6ad67efa488e093e5c59720` |

BuildID `23809188` was identified from `release/steamworks/steam_upload_evidence_dock_icon_safe_area_20260618_23809188.md`, `release/milestones/nova_swarm_menu_legibility_accepted_20260618.md`, and tag `accepted/nova-swarm-menu-legibility-source-20260618`.

Temporary detached worktrees used by the script:

| Line | Worktree |
| --- | --- |
| Old | `D:\vibe-coding-e\nova-swarm-delta-old-23809188-20260622` |
| Current | `D:\vibe-coding-e\nova-swarm-delta-current-f6d372a-20260622` |

## Method

Script: `scripts/analyze-mayhem-difficulty-score-delta.mjs`

Evidence JSON: `test-results/mayhem-difficulty-score-delta-2026-06-22T15-33-04-594Z/report.json`

The script loads source constants directly from both detached worktrees, verifies the worktree HEADs, verifies the global leaderboard identity remains `nova_swarm_global_score_v2`, and applies the same deterministic controller model to old, current, and each temporary variant.

Run size:

| Profile | Seeds |
| --- | ---: |
| Low skill / novice survival | 100 |
| Medium skill | 100 |
| High skill / aggressive scorer | 100 |

Variant overrides are in-script only. They are not source balance changes.

## Variants Tested

| Variant | Temporary override |
| --- | --- |
| A | Current accepted Mayhem baseline |
| B | A minus final +5% Mayhem normal-wave aggression |
| C | B plus 1.20 normal-wave score/XP compensation |
| D | B plus `normalWaveDifficultyLevelOffset = 8` |
| E | B plus `normalWaveDifficultyLevelOffset = 7` |
| F | B plus `normalWaveDifficultyLevelOffset = 7` and 1.20 normal-wave score/XP compensation |
| G | B plus `normalWaveDifficultyLevelOffset = 6` and 1.20 normal-wave score/XP compensation |
| H1 | Offset 7 plus 1.15 compensation |
| H2 | Offset 7 plus 1.25 compensation |
| H3 | Offset 6 plus 1.15 compensation |
| H4 | Offset 6 plus 1.25 compensation |

## High-Skill Variant Summary

| Line | Median sector | P75 sector | P90 sector | Median score | Median XP | Score/min | 250k prob | 390k prob | Normal deaths | Boss deaths |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Old public | 34 | 35 | 35 | 416,622 | 20,650 | 5,926 | 99% | 62% | 4.90 | 0.24 |
| A current | 23 | 28 | 31 | 250,578 | 12,778 | 5,827 | 51% | 5% | 5.95 | 0.03 |
| B no +5% aggression | 26 | 32 | 35 | 290,020 | 14,535 | 5,849 | 68% | 20% | 5.81 | 0.07 |
| C B + 1.20 comp | 26 | 32 | 35 | 342,897 | 15,990 | 6,915 | 88% | 42% | 5.81 | 0.07 |
| D B + offset 8 | 29 | 33 | 35 | 327,629 | 16,291 | 5,785 | 86% | 25% | 5.63 | 0.11 |
| E B + offset 7 | 30 | 34 | 35 | 330,759 | 16,565 | 5,731 | 84% | 24% | 5.61 | 0.10 |
| F offset 7 + 1.20 comp | 30 | 34 | 35 | 391,073 | 18,244 | 6,773 | 92% | 51% | 5.61 | 0.10 |
| G offset 6 + 1.20 comp | 30 | 34 | 35 | 391,058 | 18,309 | 6,719 | 93% | 51% | 5.66 | 0.08 |
| H1 offset 7 + 1.15 comp | 30 | 34 | 35 | 375,970 | 17,824 | 6,513 | 90% | 43% | 5.61 | 0.10 |
| H2 offset 7 + 1.25 comp | 30 | 34 | 35 | 406,264 | 18,663 | 7,036 | 94% | 53% | 5.61 | 0.10 |
| H3 offset 6 + 1.15 comp | 30 | 34 | 35 | 376,047 | 17,887 | 6,461 | 93% | 41% | 5.66 | 0.08 |
| H4 offset 6 + 1.25 comp | 30 | 34 | 35 | 406,173 | 18,730 | 6,979 | 96% | 59% | 5.66 | 0.08 |

## Best Candidate

The script-selected best compromise is F: remove the final +5% Mayhem normal-wave aggression, set `normalWaveDifficultyLevelOffset` to `7`, and apply `1.20` normal-wave score/XP compensation.

| Metric | Old public | A current | F candidate |
| --- | ---: | ---: | ---: |
| Median sector | 34 | 23 | 30 |
| P75 sector | 35 | 28 | 34 |
| P90 sector | 35 | 31 | 35 |
| Median score | 416,622 | 250,578 | 391,073 |
| Median XP | 20,650 | 12,778 | 18,244 |
| Score/min | 5,926 | 5,827 | 6,773 |
| XP/min | 302 | 293 | 320 |
| Median time to 250k | 2,526.5s | 2,568.3s | 2,212.5s |
| Median time to 390k | 3,928.8s | 3,962.2s | 3,443.2s |
| 250k probability | 99% | 51% | 92% |
| 390k probability | 62% | 5% | 51% |
| Normal-wave deaths | 4.90 | 5.95 | 5.61 |
| Boss deaths | 0.24 | 0.03 | 0.10 |
| Boss 2+ death-chain rate | 0% | 0% | 0% |

F meets the target band for 250k and 390k probability, makes score/min higher than old, keeps boss chain deaths below old, and is less aggressive than the 1.25 compensation variants. It does not fully restore old survival depth or old normal-wave death rates: median sector is still 30 vs old 34, and normal-wave deaths remain 14.49% above old.

## Score Opportunity By Sector For F

| Sector | Score delta vs old | XP delta vs old | Waves before boss delta | Enemies before boss delta |
| ---: | ---: | ---: | ---: | ---: |
| 5 | +23.32% | -2.82% | -16.67% | +5.49% |
| 10 | +17.86% | -2.25% | -16.67% | -0.58% |
| 15 | +27.64% | +9.23% | 0.00% | +8.04% |
| 20 | +21.40% | +1.79% | -14.29% | -16.22% |
| 25 | +15.13% | +2.12% | -14.29% | -8.33% |
| 30 | +12.19% | +2.74% | -14.29% | -13.91% |

The compensation offsets fewer wave opportunities enough to make score/min and threshold timing stronger than old while keeping the faster Mayhem pacing intact.

## Personal Best Probability

For the F candidate, probability that high-skill attempts beat old-build high-skill references:

| Old reference | F candidate beat probability |
| --- | ---: |
| Old median, 416,622 | 38% |
| Old P75, 434,952 | 35% |
| Old P90, 440,598 | 32% |
| Old best, 448,004 | 29% |

This is a large improvement over current A, where 390k probability is only 5% and beating old references is effectively not supported by the model.

## Interpretation

Current A is still the clear miss: high-skill median sector is down 11 sectors from old, median score is down about 40%, 390k probability falls from 62% to 5%, and normal-wave deaths rise from 4.90 to 5.95.

B proves the final +5% normal-wave aggression is a contributor but not the whole issue. It improves median sector from 23 to 26 and 390k probability from 5% to 20%, but it does not restore score or personal-best pressure.

C proves score/XP compensation can restore the high-score chase faster, but without reducing the effective normal-wave offset it leaves survival depth too low.

D and E improve depth without enough score/min. F is the smallest tested blend that gets close to the target player outcome without jumping straight to 1.25 compensation.

H2 and H4 are stronger scoring variants. They may be useful if the goal is to make 390k substantially more common, but they are larger ranked-scoring changes than F.

## Recommendation

Recommended next implementation candidate, pending explicit approval: F.

1. Remove the final +5% Mayhem normal-wave aggression.
2. Set Mayhem `normalWaveDifficultyLevelOffset` from 9 to 7.
3. Add a ranked-Mayhem-only normal-wave score/XP pacing compensation of 1.20.

This should be treated as a leaderboard-affecting ranked scoring decision even if the leaderboard identity stays the same. If implemented, release notes should be explicit that Mayhem scoring/XP pacing was compensated after the pacing update reduced scoring opportunities.

If "normal-wave deaths not materially higher than old" is a hard requirement, none of the tested A-H variants fully solves it. A follow-up grid should test pressure-shape changes rather than only offset and score/XP compensation.

## Guardrails

No Steam package or upload was performed. No live saves, Steam Cloud saves, or leaderboard submissions were written. Steam AppID `4765070`, depot `4765071`, and leaderboard identity `nova_swarm_global_score_v2` were only verified by the script.
