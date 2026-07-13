# Nova Swarm: 1000 Tactical Directives

Date: 2026-07-12
Branch: `codex/sales-success-1000-20260712`
Authoritative lock tag: `nova-swarm-lock-20260712-tactical-store-refresh`
Lock commit: `b80059ae255499e379283bef4e762c5b5901f944`

## Delivered scope

This pass adds exactly **1000 mechanically distinct, playable side-mission variants**:

`10 objective families x 10 intensity tiers x 10 reward programs = 1000 directives`

The count describes unique objective/target/reward combinations, not 1000 unrelated source-code edits. Every variant has a stable ID, deterministic selection, runtime progress, a completion path, and a reward identity. The exhaustive pure check constructs and completes all 1000 variants.

## Objective families and ten tiers

| Family | Tier targets |
| --- | --- |
| Hostile Quota | 10, 14, 18, 22, 26, 30, 36, 42, 50, 60 kills |
| Graze Count | 2, 3, 4, 5, 6, 8, 10, 12, 15, 20 near misses |
| Danger Streak | 2, 3, 4, 5, 6, 7, 8, 9, 10, 12 streak peak |
| Combo Peak | 6, 8, 10, 12, 15, 18, 22, 26, 32, 40 combo peak |
| Powerup Claims | 1, 2, 3, 4, 5, 6, 7, 8, 10, 12 pickups |
| Phase Uses | 1, 2, 3, 4, 5, 6, 8, 10, 12, 15 uses |
| Support Hunts | 1, 2, 3, 4, 5, 6, 7, 8, 10, 12 support kills |
| Boss Hunts | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 boss kills |
| Sector Reach | sectors 2 through 11 |
| Enemy Variety | 3, 4, 5, 6, 7, 8, 10, 12, 15, 20 unique types |

## Reward programs

Every objective/tier pair can award each of these ten rewards:

1. Extra Rescan
2. Shield
3. Bomb
4. Orbital Strike
5. Point Defense
6. Ghost Mode
7. Rapid Fire
8. Speed Up
9. Magnet
10. Drones

## Player-facing behavior

- One directive is active at a time and appears in the Mission Status panel with its campaign position, live progress, and promised reward.
- A run now offers a fifty-stage chain drawn without exact repeats from the 1000-variant catalog. Recent objective families and rewards also stay out of short freshness windows.
- A completed directive grants its reward immediately, then queues the next directive for the following level. Only one directive can complete per level, so the fiftieth cannot complete before level 50.
- Unfinished directives still carry forward and use adaptive recalibration. Intensity opens in ten five-level chapters, reaching the full tier ceiling at level 50.
- Selection is deterministic from the run seed and sequence, so the system is reproducible and testable.
- Side directives are optional. They do not alter score, XP, leaderboard identity, achievements, enemy counts, or the existing Tactical Draft math.
- Pause, How To Play, `render_game_to_text`, Run Summary, and Run Report all expose directive state.
- All player-facing copy is localized in English, German, Spanish, Brazilian Portuguese, Russian, Japanese, Korean, and Simplified Chinese.

## Design intent

Successful survivor-likes repeatedly turn a simple combat loop into short, legible decisions: pursue an objective, accept tactical risk, and earn an immediate build-shaping payoff. Tactical Directives add that optional micro-goal loop without replacing Nova Swarm's movement, threat-reading, or Draft identity. The fifty-stage relay now grows with the entire level-50 arc, while one-clear-per-level pacing prevents farming a whole clipboard in an easy wave.

## Acceptance guards

- Catalog size is exactly 1000 and all IDs are unique.
- Every objective family has ten mechanically distinct target values.
- Every family contributes 100 variants: ten tiers paired with ten rewards.
- Every catalog entry reaches completion under its declared event/mode.
- Count, peak, and unique-value progress modes are all covered.
- A deterministic fifty-directive sample has no exact repeats, avoids the previous three objective families and previous two rewards, and reaches tier ten at level 50.
- Pure and browser runtime checks prove same-level progress cannot enter a queued directive and the final directive remains locked through level 49.
- Browser runtime covers reward delivery, next-directive queuing, level-13 campaign HUD, level-50 completion, compact HUD, desktop HUD, German HUD, and debug state.
- Run Report serialization is versioned and preserves completed directive history.

Focused commands:

```text
npm run check:tactical-directives
npm run check:tactical-directive-runtime
npm run check:how-to-play
npm run check:run-report
```

## Release state

This source pass does not package or upload a build. Steamworks, public/default, the private test branch, store metadata, pricing, leaderboards, achievements, and Steam Cloud remain untouched.
