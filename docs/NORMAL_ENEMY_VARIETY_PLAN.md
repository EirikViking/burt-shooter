# Normal Enemy Variety Plan

## Old Baseline

- Normal enemy profiles: 50 generated profiles in `src/config/GeneratedEnemyProfiles.js`.
- Movement families: 10 (`sine`, `zigzag`, `circle`, `drunk`, `aggressive`, `flutter`, `pincer`, `orbit`, `snap`, `weave`).
- Attack families: 10 (`single`, `double`, `wide`, `needle`, `fan`, `slowHeavy`, `quickChip`, `offsetPair`, `triad`, `stutter`).
- Full normal enemy pool became available by level 11 through the random pool cap `min(50, 8 + level * 4)`.

## New Counts

- Normal enemy profiles: 120 generated profiles.
- Movement families: 28.
- Attack families: 23.
- Enemy art assets: 50 generated enemy sprites are reused with profile-specific sprite index, target width, scale, tint, glow, accent color, role, movement, and attack metadata.

## Unlock Pacing

| Level | Available profiles | Movement families | Attack families |
| --- | ---: | ---: | ---: |
| 1 | 10 | 4 | 3 |
| 5 | 22 | 8 | 6 |
| 10 | 36 | 13 | 11 |
| 11 | 39 | 14 | 12 |
| 20 | 64 | 19 | 16 |
| 30 | 92 | 24 | 20 |
| 40 | 120 | 28 | 23 |

- All normal enemy profiles become available at level 40.
- All movement families become available at level 40.
- All attack families become available at level 40.
- Level 11 exposes 39 of 120 profiles, so it is intentionally far below the full pool.

## Movement Families Introduced After Level 11

- Level 12: `feint`
- Level 14: `boomerang`
- Level 16: `corkscrew`
- Level 18: `turretDrift`
- Level 20: `sweep`
- Level 22: `escortOrbit`
- Level 24: `baitRetreat`
- Level 26: `spiralIn`
- Level 28: `crossCut`
- Level 30: `waveDive`
- Level 32: `mirrorWeave`
- Level 34: `pulseAdvance`
- Level 37: `hookTurn`
- Level 40: `fastNeedle`

## Attack Families Introduced After Level 11

- Level 13: `crossShot`
- Level 15: `fanPulse`
- Level 17: `slowOrb`
- Level 19: `warningShot`
- Level 21: `arcVolley`
- Level 24: `splitLite`
- Level 27: `suppressiveLine`
- Level 30: `rotatingPair`
- Level 34: `chargeShot`
- Level 37: `forkShot`
- Level 40: `predictiveShot`

## Selection And Weighting

- Each generated profile has `unlockLevel`, `tier`, `role`, `movementStyle`, and `fireStyle` metadata.
- `EnemyManager` selects only profiles with `unlockLevel <= current level`.
- Random wave selection gives recently unlocked profiles extra weight:
  - just unlocked: 5 entries in the weighted pool
  - unlocked within 2 levels: 3 entries
  - unlocked within 5 levels: 2 entries
  - older profiles: 1 entry
- Curated levels 1-4 use only profiles that are legal for those levels.
- Boss spacing add-waves now use the same level-gated normal enemy pool.

## Fairness Notes

- Level 1 remains a 10-profile starter pool with only basic movement and simple shots.
- New movement styles are formation offsets, not instant collision dives.
- Late movement families are introduced after level 11 and remain bounded around formation positions.
- Late attack styles avoid dense bullet-hell behavior: most patterns use one to three shots and use slower or lower-damage multipliers where they widen coverage.
- Early profile shot behavior keeps existing wave-tactic priority through level 11, protecting the current opening difficulty curve.
- No boss values, score values, leaderboard code, ship unlocks, rank progression, or player ship stats are part of this plan.

## Validation

- `npm run check:normal-enemy-variety` verifies profile count, movement count, attack count, unique IDs, valid assets, unlock-level bounds, level 11 partial exposure, and level 40 full exposure.
- `npm run check:generated-rosters` verifies the generated roster still has valid assets and distinct behavior signatures.
- `npm run check:enemy-wave-patterns` verifies wave tactics still spawn, move, and shoot in runtime.

## Manual Playtest Checklist

1. Start a fresh run.
2. Play levels 1-3 and confirm early game still feels readable and fair.
3. Confirm new enemies do not appear too early.
4. Play or simulate level 5 and confirm more variety but no chaos.
5. Play or simulate level 11 and confirm not all normal enemy profiles, movement styles, or attack styles are available.
6. Simulate level 20 and confirm new mid-game enemy content appears.
7. Simulate level 30 and confirm advanced enemy content appears.
8. Simulate level 40 and confirm the full normal enemy pool is available.
9. Confirm after level 40 the game continues using the full pool.
10. Confirm no boss behavior changed.
11. Confirm no scoring, leaderboard, unlock, or rank behavior changed.
