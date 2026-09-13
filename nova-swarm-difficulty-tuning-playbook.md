# Nova Swarm Difficulty Tuning Playbook

Difficulty is currently locked at:

- Branch: `tuning/early-mid-wave-tighten-v4`
- Commit: `1bb40d9ae51d7d38562e3b9b89130aaa94486476`
- Private Steam BuildID: `23609923`
- Package: `v2026-06-07_16-21-16`

Do not retune difficulty unless explicitly requested. This baseline was accepted because normal waves became more fun, enemy bullets became harder to dodge, normal waves could kill the player by level 14, and level 30 killed the player in wave 5.

## What Changed

The tuning work centered on these files:

- `src/config/BalanceConfig.js`
- `src/config/EnemyThreatActions.js`
- `src/entities/Enemy.js`
- `src/managers/EnemyManager.js`
- `src/game/RunPressureDirector.js`
- `scripts/check-difficulty-tuning.mjs`
- `scripts/check-early-wave-threat.mjs`
- `scripts/check-early-wave-lethality.mjs`
- `scripts/check-normal-wave-runtime-lethality.mjs`
- `scripts/check-early-mid-wave-tighten.mjs`

The most important lesson: abstract pressure checks were not enough. Earlier models said early normal waves had kill potential, but human Steam playtests showed normal enemy bullets were too slow and threats were too easy to erase before they mattered. Runtime projectile speed, projectile reach, threat-action timing, and actual spawned wave behavior were the decisive signals.

## Future Tuning Knobs

If difficulty is reopened later, start with the current runtime path and make one small change at a time. The useful knobs are:

- Normal enemy projectile speed: `enemyProjectileSpeed`, `enemyProjectileSpeedPerLevel`, `enemyProjectileSpeedMax`, and banded `projectileSpeedMult`.
- Projectile reach or lifetime: projectile lifetime settings on normal and threat bullets.
- Danger-wave count and severity: `dangerWaveCount`, `dangerWaveCountBonus`, `dangerWaveFireMult`, `dangerWaveFireDelayMult`, `dangerWaveProjectileSpeedMult`.
- Threat-action activation timing: `threatInitialDelayMult`, `threatInitialDelayMs`, and forced threat action assignment.
- Challenge-wave pressure: `challengeChanceMult`, `challengeChanceBonus`, `challengeWaveCountBonus`, `challengeFormation`, `challengeTactic`.
- Priority threats: danger-wave elite fields and threat-action budget fields.
- Early/mid wave pressure bands: `opening_readable`, `early_movement_check`, `early_kill_window`, `serious_run`, `early_late_bridge`, and the focused `sector_twenty_gate`.

## What Not To Touch For Difficulty

Do not use difficulty tuning as a reason to change:

- Score or score formulas
- Leaderboards or Steam leaderboard identifiers
- Save data or save format
- Achievements
- Ships, unlocks, or rank progression
- Steam AppID, depot IDs, branch settings, store metadata, or app visibility

The Steam leaderboard name must remain exactly `nova_swarm_global_score_v2`.

## Checks

For future difficulty changes, run:

```bash
npm run check:difficulty-tuning
npm run check:early-wave-threat
npm run check:early-wave-lethality
npm run check:normal-wave-runtime-lethality
npm run check:early-mid-wave-tighten
```

Then run the standard release checks before packaging:

```bash
npm run build:current
npm run check:i18n
npm run check:i18n-ui
npm run smoke
npm run check:controller-flow
npm run check:release-hardening
npm run check:release-line
```

## Recommended Workflow

1. Branch from the locked-good commit.
2. Make one small tuning change.
3. Run the difficulty checks.
4. Run the release checks.
5. Package a private Steam build.
6. Keep `SetLive` empty.
7. Human playtest before doing another tuning pass.

Do not publish to a live Steam branch from a difficulty tuning branch.
