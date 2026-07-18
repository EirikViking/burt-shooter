# Nova Swarm Mayhem Difficulty And Score Delta - 2026-06-22

## Problem Report

A top/high-skill player reported that after the Mayhem update the game feels harder overall, score/XP feels lower, RNG feels more punishing, and personal high-score pushing feels worse. The player context is a top global leaderboard score around 390k.

The intent of the update was not to make the total game harder for strong players. The intended tradeoff was more active normal waves, faster pressure, and fairer late boss wipeouts so strong players could survive deeper.

## Baselines

| Line | Steam BuildID | Source commit | Evidence |
| --- | ---: | --- | --- |
| Previous public ranked flow | 23809188 | `8b0d5609c41b686979446a8e88d902f5ca89afa5` | `release/steamworks/steam_upload_evidence_dock_icon_safe_area_20260618_23809188.md`, `release/milestones/nova_swarm_menu_legibility_accepted_20260618.md`, tag `accepted/nova-swarm-menu-legibility-source-20260618` |
| Current accepted Mayhem line | 23854561 | `f6d372a11b084550753047436432a1929591adc6` | `progress.md`, source commit for Codex glow/Confirm Exit hotfix |

Temporary comparison worktrees:

- Old: `D:\vibe-coding-e\nova-swarm-delta-old-23809188-20260622`
- Current: `D:\vibe-coding-e\nova-swarm-delta-current-f6d372a-20260622`

## Method

Script: `scripts/analyze-mayhem-difficulty-score-delta.mjs`

Report JSON: `test-results/mayhem-difficulty-score-delta-2026-06-22T14-52-53-748Z/report.json`

The script loads source constants directly from both detached worktrees, validates each worktree HEAD, verifies the leaderboard identity remains `nova_swarm_global_score_v2`, and runs the same deterministic controller model across both builds.

Profiles and run count:

| Profile | Attempts |
| --- | ---: |
| Low skill / novice survival | 100 |
| Medium skill | 100 |
| High skill / aggressive scorer | 100 |

Notes:

- No live saves, Steam Cloud saves, or leaderboard submissions are used.
- The model estimates bot movement, pickups, graze opportunities, deaths, and scoring from source pressure indices. It is strongest as an old-vs-current delta, not as a perfect human replay.
- Score output uses a fixed `0.25` calibration scale after raw deterministic score opportunity is calculated, so 250k/390k threshold estimates stay in the same order of magnitude as the player report. Percentage deltas are preserved by the fixed scale.

## Old Vs Current Survival

| Skill profile | Old median sector | Current median sector | Delta |
| --- | ---: | ---: | ---: |
| Novice | 16 | 7 | -9 |
| Medium | 21 | 11 | -10 |
| High skill | 35 | 23 | -12 |

High-skill reach probabilities:

| Metric | Old | Current |
| --- | ---: | ---: |
| Reaches sector 20 | 100% | 79% |
| Reaches sector 25 | 97% | 44% |
| Reaches sector 30 | 83% | 20% |

## Old Vs Current Score And XP

| Skill profile | Old median score | Current median score | Score delta | Old median XP | Current median XP | XP delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Novice | 121,919 | 44,522 | -63.48% | 6,582 | 1,959 | -70.24% |
| Medium | 194,587 | 93,152 | -52.13% | 10,201 | 5,036 | -50.63% |
| High skill | 422,104 | 251,856 | -40.33% | 20,998 | 12,754 | -39.26% |

High-skill score distribution:

| Metric | Old | Current |
| --- | ---: | ---: |
| Median | 422,104 | 251,856 |
| P75 | 434,984 | 311,506 |
| P90 | 437,182 | 356,023 |
| Max | 446,776 | 415,393 |
| Score per minute avg | 5,936 | 5,826 |
| Score per sector avg | 12,058 | 10,924 |
| Score per wave avg | 1,877 | 1,980 |

## Boss Deaths

| Skill profile | Old avg boss deaths | Current avg boss deaths | Delta |
| --- | ---: | ---: | ---: |
| Novice | 0.20 | 0.04 | -80.00% |
| Medium | 0.12 | 0.04 | -66.67% |
| High skill | 0.20 | 0.12 | -40.00% |

Analytical boss-chain risk for sectors 20-25:

| Skill profile | Old avg 2+ death risk | Current avg 2+ death risk | Delta |
| --- | ---: | ---: | ---: |
| Novice | 0.12% | 0.07% | -43.66% |
| Medium | 0.02% | 0.01% | -36.36% |
| High skill | 0.00% | 0.00% | 0.00% |

Interpretation: the boss wipeout changes are doing useful work in this model. Sampled boss deaths are lower across all profiles, and the analytical 2+ death boss-chain risk falls for novice/medium profiles. High-skill boss-chain risk was already near zero in this simplified bot model.

## Normal Wave Deaths

| Skill profile | Old avg normal-wave deaths | Current avg normal-wave deaths | Delta |
| --- | ---: | ---: | ---: |
| Novice | 5.80 | 5.96 | +2.76% |
| Medium | 5.88 | 5.96 | +1.36% |
| High skill | 4.80 | 5.88 | +22.50% |

Interpretation: current Mayhem normal waves are materially more punishing for the high-skill profile. The medium and novice profiles already spend most lives in normal waves, so their percentage increase is smaller, but they also stop much earlier.

## Score Opportunity By Sector

| Sector | Score at sector delta | XP at sector delta | Waves before boss delta | Enemies before boss delta |
| ---: | ---: | ---: | ---: | ---: |
| 5 | +11.28% | -11.38% | -16.67% | +9.34% |
| 10 | +11.10% | -6.10% | 0.00% | +23.36% |
| 15 | +16.19% | -1.04% | 0.00% | +7.54% |
| 20 | +7.66% | -6.71% | -14.29% | -16.22% |
| 25 | +1.05% | -9.58% | -14.29% | -8.33% |
| 30 | -2.20% | -8.95% | -14.29% | -13.91% |

Interpretation: early same-sector score can look slightly higher because current waves are denser and more dangerous. By later sectors, there are fewer waves/enemies before bosses, XP is lower by sector, and score by sector flattens or drops.

## High-Score Feasibility Sanity

High-skill profile threshold probabilities:

| Threshold | Old | Current |
| --- | ---: | ---: |
| 250k+ | 99% | 53% |
| 390k+ | 65% | 6% |
| Combo 50+ | 87% | 80% |
| No-death or <=1 death | 0% | 0% |

Probability that current high-skill attempts beat old-build high-skill references:

| Old reference | Current beat probability |
| --- | ---: |
| Old median, 422,104 | 0% |
| Old P75, 434,984 | 0% |
| Old P90, 437,182 | 0% |
| Old best, 446,776 | 0% |

## Findings

1. Current Mayhem is harder to survive in this deterministic comparison, including for the high-skill/aggressive profile.
2. Boss deaths and modeled boss-chain risk are lower, so the boss fairness work appears directionally successful.
3. Normal waves are now the main problem. The current line combines a +9 normal-wave effective difficulty offset, 5% Mayhem pressure multipliers, and fewer waves before bosses.
4. Score per wave is slightly higher, but total run score/XP and deep-run high-score probability are lower because the bot reaches fewer sectors, kills fewer enemies, collects fewer powerups, and has fewer late-run scoring opportunities.
5. The player report is supported directionally by this model: current Mayhem can feel harder, lower-reward, and worse for personal-best chasing even though the direct score formula was not changed.

## Recommendation

Do not revert the whole Mayhem update. The boss fairness side appears useful.

The safest follow-up candidates are:

- Score/XP pacing compensation for fewer waves or later sectors.
- A modest Mayhem normal-wave pressure trim, especially around the effective late-teens through sector 30 pressure bands.
- A sector/boss-clear reward review that preserves leaderboard identity only if explicitly approved.

Do not change score formula, leaderboard identity, achievements, Steam Cloud, saves, or Steamworks metadata without an explicit follow-up approval because leaderboard fairness would need a separate decision.

## Guardrails

This investigation changed only analysis/docs/progress artifacts. It did not change gameplay balance, score formula, XP formula, enemy behavior, boss behavior, wave rules, progression rules, save format, achievements, leaderboard behavior, Steam Cloud settings, AppID, depot IDs, store visibility, or Steamworks metadata.
