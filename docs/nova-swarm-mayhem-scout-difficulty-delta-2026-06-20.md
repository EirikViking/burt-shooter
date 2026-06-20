# Nova Swarm Mayhem vs Scout Difficulty Delta

Date: 2026-06-20

Branch: `codex/verify-mayhem-scout-difficulty-delta-20260620`

Source baseline: `f311e97b72394dafce38a34d1ee3242145156338`

Evidence baseline: `9ba361db8555a8d193c9238a2af6972878464788`

Automated report: `test-results/mayhem-scout-difficulty-delta-2026-06-20T11-31-56-222Z/report.json`

## Goal

Verify that Scout Run is meaningfully easier and lower pressure than Mayhem Run while preserving the run-mode rules:

- Mayhem remains the ranked accepted harder baseline.
- Mayhem submits to `nova_swarm_global_score_v2`.
- Scout remains unranked and does not submit leaderboard scores.
- Scout does not unlock achievements, career XP, ranked progress, or checkpoints.
- Sector Run checkpoint behavior remains unchanged.

Gameplay tuning changed in this pass only for Scout boss difficulty.

## Actual Profiles

### Mayhem Run

- `difficultyProfileId`: `accepted_harder_ranked`
- `ranked`: `true`
- `submitsGlobalLeaderboard`: `true`
- `submitsLocalLeaderboard`: `true`
- `unlocksAchievements`: `true`
- `unlocksRankedCheckpoints`: `true`
- `updatesCareerProgress`: `true`
- `normalWaveDifficultyLevelOffsetDelta`: `0`
- `bossDifficultyMult`: `1`
- Pressure multipliers:
  - fire: `1`
  - projectile speed: `1`
  - enemy speed: `1`
  - elite: `1`
  - special threat: `1`
  - sustain: `1`
  - score: `1`
  - content rarity: `1`

### Scout Run

- `difficultyProfileId`: `scout_lower_pressure_v1`
- `ranked`: `false`
- `submitsGlobalLeaderboard`: `false`
- `submitsLocalLeaderboard`: `false`
- `unlocksAchievements`: `false`
- `unlocksRankedCheckpoints`: `false`
- `updatesCareerProgress`: `false`
- `normalWaveDifficultyLevelOffsetDelta`: `-5`
- `bossDifficultyMult`: `0.75`
- Pressure multipliers:
  - fire: `0.72`
  - projectile speed: `0.82`
  - enemy speed: `0.88`
  - elite: `0.62`
  - special threat: `0.58`
  - sustain forgiveness: `1.18`
  - score: `1`
  - content rarity: `0.8`

## Method

The automated check uses the live exports from:

- `src/game/RunMode.js`
- `src/game/RunPressureDirector.js`
- `src/config/BalanceConfig.js`
- `src/leaderboard/LeaderboardTypes.js`

It compares sectors `1`, `5`, `10`, `20`, and `30` across deterministic seeds:

`101`, `202`, `303`, `404`, `505`, `606`, `707`, `808`, `909`

For each mode and sector it records:

- effective normal-wave difficulty level
- wave count
- enemy count estimate
- total normal-enemy HP budget
- projectile/fire pressure
- enemy speed pressure
- elite threat pressure
- special threat pressure
- estimated incoming pressure index
- estimated clear-time pressure
- boss HP, projectile speed, firing cadence, and whether boss values changed by run mode

The check fails if Scout's incoming pressure is not at least 18% lower than Mayhem in every sampled sector. Scout boss HP must stay near 75% of Mayhem, Scout boss projectile speed must be 75% of Mayhem, and Mayhem boss values must remain baseline.

## Sector Comparison

| Sector | Mayhem level | Scout level | Enemy ratio | HP ratio | Projectile/fire ratio | Speed ratio | Elite ratio | Special ratio | Incoming pressure ratio | Clear-time ratio | Boss HP ratio | Boss projectile ratio |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 10 | 5 | 0.807 | 0.807 | 0.344 | 0.869 | 0.481 | 0.374 | 0.202 | 0.918 | 0.765 | 0.750 |
| 5 | 14 | 9 | 0.883 | 0.441 | 0.667 | 0.876 | 0.592 | 0.601 | 0.235 | 0.768 | 0.744 | 0.750 |
| 10 | 19 | 14 | 0.738 | 0.738 | 0.457 | 0.876 | 0.536 | 0.556 | 0.255 | 0.779 | 0.750 | 0.750 |
| 20 | 29 | 24 | 1.000 | 1.000 | 0.590 | 0.880 | 0.620 | 0.587 | 0.465 | 1.000 | 0.756 | 0.750 |
| 30 | 39 | 34 | 1.000 | 1.000 | 0.590 | 0.880 | 0.620 | 0.573 | 0.460 | 1.000 | 0.748 | 0.750 |

## Findings

Scout Run is meaningfully easier than Mayhem Run in every sampled sector.

The incoming pressure ratio ranges from `0.202` to `0.465`, so Scout pressure is roughly 20% to 47% of Mayhem pressure by the composite index. This is not cosmetic. It is a large enough delta to be felt as lower pressure while still preserving the same core run content.

The early and mid sectors also show lower enemy counts and HP budgets because Scout's `-5` effective normal-wave difficulty offset moves those sectors into earlier pressure bands.

In sectors 20 and 30, enemy count and HP budget are equal in this model because current normal-wave count and enemy-count caps are already reached by both modes. Scout is still substantially easier there because projectile/fire pressure, enemy speed pressure, elite pressure, and special-threat pressure are all reduced.

Scout boss difficulty is now explicitly reduced through the mode profile. `bossDifficultyMult: 0.75` gives Scout bosses roughly 75% Mayhem HP after integer rounding, 75% projectile/hazard speed, and slower firing/regular attack cadence. Mayhem and Sector Run keep `bossDifficultyMult: 1`.

## Old Baseline Reference

The script also reads commit `8b381fac3bcee96ce47b00fb6bdf8aab848c3edc` when available.

That commit predates the run-mode profile system, so the comparison is limited to normal-wave level, wave count, enemy count, and HP budget. It is useful as context, not as a pass/fail contract.

Old baseline reference rows:

| Sector | Old effective level | Old waves | Old enemy avg | Old HP avg |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 6 | 46.00 | 46.00 |
| 5 | 5 | 6 | 61.78 | 61.78 |
| 10 | 10 | 6 | 75.00 | 75.00 |
| 20 | 20 | 7 | 111.00 | 222.00 |
| 30 | 30 | 7 | 115.00 | 230.00 |

Scout is easier than Mayhem by the current pressure index. It is not a direct clone of the old baseline: early Scout sectors can still use the current five-wave pacing and later-sector caps, while profile multipliers reduce the actual pressure curve.

## Rule Assertions

The checker asserts:

- Mayhem uses `accepted_harder_ranked`.
- Scout uses `scout_lower_pressure_v1`.
- Scout's normal-wave offset is not Mayhem's offset and remains `-5`.
- Scout's boss difficulty multiplier remains `0.75`.
- Mayhem and Sector Run boss difficulty multipliers remain `1`.
- Scout cannot submit to the global leaderboard.
- Scout cannot unlock achievements.
- Scout does not update local leaderboard, career progress, or ranked checkpoints.
- Mayhem can still submit and unlock achievements.
- `STEAM_LEADERBOARD_NAME` remains `nova_swarm_global_score_v2`.
- Sector 5 starts at Sector 5.
- Checkpoint 10 starts at Sector 11.
- Checkpoint 20 starts at Sector 21.
- Checkpoint 30 starts at Sector 31.
- Checkpoint 10 is locked at best sector 10 and unlocked at best sector 11.

## Recommendation

Keep `scout_lower_pressure_v1` with `bossDifficultyMult: 0.75` for this build.

The automated metrics show a clear lower-pressure gap without changing Mayhem, scoring, leaderboards, achievements, saves, Steam bridge, or Steamworks metadata. The only gameplay tuning change in this pass is the Scout-only boss reduction.

Manual feel testing should still focus on whether late Scout sectors feel too close in enemy density despite reduced projectile/fire, threat pressure, and boss difficulty. If Scout still feels too sharp, tune Scout through the existing mode profile rather than changing Mayhem or global balance.

## Manual Test Plan

1. Start Mayhem Run and confirm it uses the ranked result flow.
2. Start Scout Run and confirm it is labeled unranked.
3. In Scout, reach several waves and confirm no leaderboard submission, achievements, career XP, or checkpoints update.
4. Compare Sector 1 and Sector 5 feel in Mayhem vs Scout; Scout should have visibly less bullet and threat pressure.
5. Compare Sector 20 and Sector 30 feel in Mayhem vs Scout; enemy density may be similar, but Scout should be calmer due to reduced fire, projectile speed, enemy speed, elite, special threat pressure, and easier bosses.
6. Confirm Sector Run checkpoint starts and locked options still behave as before.
