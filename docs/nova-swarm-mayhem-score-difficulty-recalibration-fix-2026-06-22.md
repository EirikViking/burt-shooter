# Nova Swarm Mayhem Score And Difficulty Recalibration Fix - 2026-06-22

## Problem

The Mayhem difficulty/score delta analysis showed that current Mayhem was both harder and lower reward than the old public ranked run for a high-skill/aggressive model. Boss fairness improved, but shorter five-wave pacing plus extra normal-wave pressure reduced deep-run survival and score/XP opportunity too much.

## Implemented Fix

Candidate F from the recalibration analysis was implemented:

- Removed the final +5% Mayhem normal-wave aggression bump.
- Set the Mayhem normal-wave difficulty baseline to `normalWaveDifficultyLevelOffset = 7`.
- Added `1.20` Mayhem ranked normal-wave score/XP compensation.

The `1.20` multiplier is scoped to Mayhem ranked normal-wave activity. It compensates for five waves replacing six before bosses while preserving the faster run pacing.

## Scope

Mayhem bosses are unchanged by this recalibration. Boss HP, boss cadence, boss projectile speed, boss attack behavior, boss scalars, boss wipeout protection, and boss2 relief were not changed.

Scout and Sector Run gameplay are preserved:

- Scout boss HP remains at the existing `0.75` multiplier.
- Scout boss attack relief remains at `0.85`.
- Scout normal-wave score/XP compensation remains `1`.
- Sector Run normal-wave score/XP compensation remains `1`.
- Scout and Sector Run effective normal-wave levels are preserved through their run-mode deltas after the Mayhem baseline offset changed.

## Normal-Wave Score/XP Compensation

Score compensation is applied only to normal-wave awards:

- normal enemy kill/combo score during normal waves
- normal-wave combo milestone/tick bonuses
- normal-wave clear bonus
- normal-wave no-hit bonus
- Graze Break normal-wave enemy/bonus scoring

Pilot XP compensation is applied only to ranked Mayhem wave-clear XP and no-hit-wave XP. Boss XP, sector XP, Codex/discovery XP, run-clear XP, lives-remaining XP, achievements, and leaderboard identity are unchanged.

## Validation Evidence

Deterministic analysis report:

`test-results/mayhem-difficulty-score-delta-2026-06-22T16-03-28-643Z/report.json`

High-skill/aggressive metrics:

| Line | Median sector | Median score | Median XP | Score/min | 250k prob | 390k prob | Normal deaths | Boss deaths |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Old public | 34 | 416,622 | 20,650 | 5,926 | 99% | 62% | 4.90 | 0.24 |
| Current accepted | 23 | 250,578 | 12,778 | 5,827 | 51% | 5% | 5.95 | 0.03 |
| Implemented | 30 | 391,073 | 18,244 | 6,773 | 92% | 51% | 5.61 | 0.10 |

The implemented source matched candidate F in the deterministic analysis (`implementedMatches=true`). Boss deaths remain below old public, and modeled boss-chain deaths remain at 0% for the high-skill profile.

## Guardrails

This fix does not change Steamworks metadata, AppID, depot IDs, leaderboard identity, achievements metadata, Steam Cloud settings, save format, store visibility, or profile rescue behavior.
