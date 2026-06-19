# Nova Swarm Run Modes: Mayhem, Scout, Sector

Date: 2026-06-19

## Mayhem Run

Mayhem Run is the current ranked arcade run. It starts from Sector 1, uses the accepted harder ranked baseline, submits qualifying scores to the existing global Steam leaderboard, unlocks ranked checkpoint starts, updates career progress, and is the only run mode that can unlock Steam achievements in this first version.

The global leaderboard identity remains `nova_swarm_global_score_v2`.

## Scout Run

Scout Run is an unranked lower-pressure practice run for testing ships, learning routes, and warming up without affecting ranked state. It starts from Sector 1, shows the score locally as unranked, and preserves One More Run as another Scout Run.

Scout Run does not submit to the global leaderboard, does not update global best or ranked best, does not unlock Mayhem/Sector Run checkpoints, does not update career progress, and does not unlock Steam achievements. There is no Scout leaderboard in this version.

The first Scout profile is `scout_lower_pressure_v1` in `src/game/RunMode.js`:

- `normalWaveDifficultyLevelOffsetDelta: -5`
- `fireChanceMult: 0.72`
- `projectileSpeedMult: 0.82`
- `enemySpeedMult: 0.88`
- `eliteChanceMult: 0.62`
- `specialThreatChanceMult: 0.58`
- `sustainForgivenessMult: 1.18`
- `scorePressureMult: 1`
- `contentRarityBoostMult: 0.8`

This is intentionally below Mayhem pressure and slightly softer than the old pre-Mayhem normal-wave start.

## Sector Run

Sector Run is the checkpoint-start system. It uses unlocked ranked checkpoints, keeps the existing checkpoint behavior, and is unranked for achievement purposes in this first version.

Checkpoint behavior:

- Sector 5 starts at Sector 5.
- Checkpoint 10 starts at Sector 11.
- Checkpoint 20 starts at Sector 21.
- Checkpoint 30 starts at Sector 31.
- New start points unlock every 5 sectors.
- Locked options cannot launch.
- Checkpoint starts do not grant an immediate Overrun reward.

Checkpoint unlocks come from Mayhem Run ranked progression. Scout Run and Sector Run do not unlock Mayhem checkpoints.

## Ranked Versus Unranked

Mayhem Run is ranked. It affects the global leaderboard, ranked bests, career progression, checkpoint unlocks, and Steam achievements.

Scout Run and Sector Run are unranked. They are allowed to show local run results and mode context, but must not claim global leaderboard submission or achievement unlocks.

## Achievement Policy

Steam achievements are Mayhem Run only in this first version. This is intentional for clarity and fairness. Scout Run and Sector Run cannot unlock Steam achievements, including milestone achievements.

No Steam achievements were created, deleted, renamed, or changed for this mode split. The Early Pilot status/backfill path remains preserved.

## Future Option

A separate Scout leaderboard may be considered later if the mode grows into a stable community challenge, but it should use a separate leaderboard identity and a clear UI distinction from Mayhem.
