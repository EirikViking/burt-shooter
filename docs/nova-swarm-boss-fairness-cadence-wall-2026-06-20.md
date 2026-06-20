# Nova Swarm Boss Fairness Cadence Wall - 2026-06-20

## Summary

This pass investigated the reported boss fairness wall around early boss 2 and the sector 21 to 22 area. The fix is a targeted boss wipeout guard: bosses can still kill the player, but one boss encounter should no longer be able to erase four or five lives in a few seconds through lingering hazards, immediate refire, or respawn traps.

No boss health, boss damage, Mayhem balance, Scout balance, score formula, leaderboard identity, achievements metadata, save format, Steamworks metadata, powerup art, Prism Splitter art, display settings, or profile rescue behavior was changed.

## Boss Identity

Boss number 2 is `Sam the Misfit`.

Boss 2 uses:

- Archetype: `forge`
- Title: `Forge Tyrant`
- Movement: `hammer`
- Regular attack: `burst`
- Signature: `ring`

The sector 21 to 22 complaint window is adjacent to the same cadence family, but not exactly on sector 21:

- Sector 21 is `GRAVITY COMEDIAN`, archetype `conductor`, attack `fan`, signature `cone`.
- Sector 22 is `NOVA DEVOURER`, archetype `forge`, attack `burst`, signature `ring`.

So the boss 2 pattern family repeats at sector 22, where sector pressure and lower late-game mercy windows make rapid repeated deaths more likely.

## Root Cause

The existing boss mercy system blocked immediate repeat boss damage for a short cooldown, but it did not track repeated deaths within the same boss encounter. Late bosses could fall to the minimum boss mercy window, and respawn cleanup cleared ordinary enemy bullets and nearby non-boss hazards but did not clear active boss hazard overlays.

That meant a player could respawn into or immediately after an already-armed boss hazard, then get another boss pattern before meaningful control was re-established. The deterministic model showed a five-life wipeout could happen in about 12 seconds at the sector 22 Forge repeat.

## Fix

Added a boss encounter wipeout guard under `BalanceConfig.bossMercy.wipeoutGuard`.

Behavior:

- Tracks boss-caused life losses within the current boss encounter.
- Clears active boss hazard overlays after a boss-caused death.
- Keeps the existing boss mercy behavior for the first death.
- After the second same-boss death, expands recovery to 8.5 seconds.
- After the third same-boss death, expands recovery to 11.5 seconds and enforces at least 10 seconds of control-oriented recovery.
- Pauses the boss attack cadence after respawn: 1.8 seconds after the first death, 3.2 seconds after the second, and 4.8 seconds after the third.
- Cancels current boss telegraphs during that recovery pause so the player does not respawn into an attack that was already effectively committed.
- Resets when the boss is defeated or a new level starts.

This is not an easy-mode cap. It does not make the player permanently invincible, skip bosses, lower boss HP, lower boss projectile speed, or change score. It only prevents repeated instant losses to the same boss before the player has regained real control.

## Follow-up Boss 2 Playtest Relief

After private BuildID `23836473`, live playtest feedback still showed `Sam the Misfit` killing the player twice in Mayhem and feeling punishing again in Scout. That means the wipeout guard solved the rapid chain-death failure mode, but the second boss was still too sharp as the first serious boss check.

The follow-up relief is scoped to `nova_boss_02` only while it appears as sector 2. It does not apply to later roster repeats such as sector 52.

Sam-specific changes:

- First regular danger moves from about 2.65 seconds to 3.566 seconds.
- Regular telegraph increases from 1120 ms to 1366 ms.
- Signature ring telegraph increases from 1500 ms to 1770 ms.
- Regular attack cadence slows to 4031 ms in Mayhem and 5375 ms in Scout.
- Ring safe wedge widens from 0.74 to 0.9.
- Phase 2 burst is reduced from 5 shots to 3.
- Phase 3 burst is reduced from 5 shots to 4.
- Sam's pressure scalar gets a local `0.82` multiplier.

This is deliberately not a global boss nerf. In this Sam-specific pass, sector 22 `NOVA DEVOURER` remained on the existing late-boss pressure curve. A later boss cliff audit intentionally keeps a softer sector 22 playtest version; see `docs/nova-swarm-boss-cliff-audit-smoothing-2026-06-20.md`.

## Scout And Mayhem Impact

Mayhem remains the main ranked hard mode and keeps `bossDifficultyMult: 1`.

Scout keeps the existing boss relief, `bossDifficultyMult: 0.75`, and remains lower pressure. Scout benefits from the same chain-death guard because the guard addresses fairness, not difficulty preference.

Sector Run uses the same boss encounters and also receives the guard.

## Deterministic Metrics

Generated report:

`test-results/boss-fairness-cadence-wall-2026-06-20T16-33-05-426Z/report.json`

Key metrics from the report:

- Boss 2 first dangerous attack: 3566 ms.
- Boss 2 regular telegraph: 1366 ms.
- Boss 2 signature ring telegraph: 1770 ms.
- Boss 2 Mayhem pressure index: 0.462.
- Boss 2 Scout pressure index: 0.316.
- Boss 2 phase 2 regular burst: 3 shots.
- Boss 2 phase 3 regular burst: 4 shots.
- Sector 22 repeats the Forge burst/ring family.
- Sector 22 is handled by the later boss cliff audit playtest exception.
- Sector 22 pre-guard model: 5 losses in 12 seconds, 0 lives remaining.
- Sector 22 post-guard model: 3 losses in 12 seconds, 2 lives remaining.

## Manual Test Plan

1. Start Mayhem and reach boss 2, or use the dev-only boss-start harness.
2. Confirm `Sam the Misfit` still attacks with the Forge burst/ring pattern and still kills careless play.
3. Intentionally die to boss 2 twice and verify respawn has a visible control window instead of an immediate refire/trap.
4. Start near sector 21/22 using the dev-only harness or Sector Run if unlocked.
5. Confirm sector 22 `NOVA DEVOURER` shares the Forge burst/ring cadence family.
6. Intentionally enter the sector 22 boss with multiple lives and verify repeated deaths do not delete all lives within a few seconds.
7. Confirm Mayhem still feels hard and Scout still feels easier.
8. Confirm no leaderboard, achievement, score, or save behavior changed.

## Rollback

Source rollback:

`git revert <source-commit>`

If a Steam build containing this change is manually assigned and must be rolled back, reassign the Steam test branch to the previous desired BuildID.
