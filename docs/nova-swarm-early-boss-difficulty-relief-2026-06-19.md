# Nova Swarm Early Boss Difficulty Relief, 2026 06 19

## Change

- Added `bossEarlyDifficultyScalar=0.9`.
- Added `bossEarlyDifficultyMaxLevel=11`.
- Boss levels 1-11 now get a 10% overall relief across boss health, boss pressure, and regular/phase shooting cadence.
- Boss levels 12+ do not receive the early relief and stay on the previous post-first boss curve.

## Preserved Baseline

- Accepted normal-wave difficulty remains `normalWaveDifficultyLevelOffset=9`.
- Accepted pacing remains `MIN_WAVES_BETWEEN_BOSSES=5` and `wavesPerBossBase=5`.
- Leaderboard identity remains `nova_swarm_global_score_v2`.
- Sector Challenge checkpoint behavior is unchanged.
- Steamworks metadata, packaging, upload, SetLive, and Steam branch assignment were not touched.

## Test Evidence

- `npm run check:early-boss-difficulty-relief` verifies levels 1, 2, 5, 10, and 11 receive the 0.9 early scalar, and levels 12, 20, and 30 stay on the old post-first curve.
- `npm run check:boss-post-first-difficulty` verifies the post-first scalar still combines correctly with the new early scalar.
- `npm run check:normal-wave-difficulty-shift` and `npm run check:sector10-clear-time-pacing` guard the accepted wave difficulty and pacing baseline.

## Manual Test Advice

- Start with the starter ship and compare boss pressure in sectors 1-3 against the accepted pacing build.
- Confirm normal waves still feel like the accepted harder baseline.
- Play past sector 11 and confirm boss pressure ramps back to the prior post-first curve from sector 12 onward.

## Rollback

```bash
git revert <commit>
```
