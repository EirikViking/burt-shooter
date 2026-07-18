# Nova Swarm Sector 10 Clear-Time Pacing - 2026-06-19

## Change

Normal-wave pacing now removes one regular wave from each sector before the boss gate:

- `MIN_WAVES_BETWEEN_BOSSES`: 6 -> 5
- `wavesPerBossBase`: 6 -> 5

Both values changed together so the boss-spacing guard does not add the sixth wave back before the boss.

The normal-wave difficulty offset remains +9. Sector 1 still uses the old Sector 10 normal-wave pressure band, but it now runs five focused normal waves instead of six.

## Bosses

Boss body tuning is unchanged: HP, projectile speed, shot delays, phase thresholds, fairness windows, patterns, rewards, support behavior, and voices are not edited by this pass.

The important gameplay caveat is that bosses arrive after one fewer normal wave, so boss encounters are more frequent per minute and the player has fewer pre-boss drop/score opportunities. That can make bosses feel more dangerous even though the boss stats are unchanged.

The targeted guard hashes boss body tuning separately from boss-runway pacing:

```text
39175994f789ad9578741f72138e0a22ae49dcc7bfa51308fc7c6a7a0d00e2a3
```

## Measurement

Run:

```bash
npm run check:sector10-clear-time-pacing
```

The check compares old Sector 10 pacing, the raised-difficulty state before this fix, and the current five-wave pacing state at starter-ship hit-efficiency assumptions of 25%, 40%, 55%, and 75%.

It verifies:

- one normal wave is removed from every sector through Sector 10
- the current pacing is faster than the raised-before state
- modeled boss time is unchanged
- normal waves still generate for Sectors 1, 5, and 10
- Sector Challenge starts remain 5, 11, 21, and 31
- leaderboard identity remains `nova_swarm_global_score_v2`

## Manual Test Advice

Play a fresh starter-ship Launch Run through the first three bosses. Watch specifically for:

- whether waves feel focused instead of stretched
- whether entering bosses with no powerup or fewer lives feels too punishing
- whether boss deaths feel like boss difficulty or like reaching the boss under-resourced

If bosses still feel too punishing, prefer a boss-entry cushion or drop/runway adjustment over changing boss HP or boss attacks.

## Rollback

Rollback this pacing pass with:

```bash
git revert <source-commit>
```
