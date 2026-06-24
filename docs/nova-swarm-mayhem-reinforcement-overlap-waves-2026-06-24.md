# Nova Swarm Mayhem Reinforcement Overlap Waves - 2026-06-24

## Problem

Mayhem can feel too stop-start after most of a normal wave has been cleared. The requested behavior is a rare "new wave flies in" moment that makes high-pressure Mayhem feel more alive without replacing the remaining enemies, surprising players during unsafe moments, or changing Scout/Sector Run.

## Implementation Summary

- Added Mayhem-only normal-wave reinforcements under `BalanceConfig.difficulty.mayhemReinforcements`.
- Eligibility is limited to ranked Mayhem, normal wave phase, no boss gate/boss active, no sector arrival stinger, no respawn/player invulnerability, no active wave briefing, and safe low-pressure cleanup windows.
- Default chance is 10% per eligible wave.
- Reinforcements are only considered after the current wave is at least 75% cleared, at least 6500ms old, down to 4 or fewer objective enemies, and at 18 or fewer active enemy bullets.
- A 2-second warning is shown before the reinforcement arrives.
- The reinforcement wave is spawned in addition to the surviving enemies. Existing enemies are not cleared.
- After the combined enemy set is defeated, the scheduler skips the consumed next wave so it is not spawned a second time.
- The feature does not run in Scout or Sector Run.

## Warning And Audio

- Visual warning text: `INCOMING REINFORCEMENTS`
- Voice line text: `Incoming enemy reinforcements!`
- Voice asset: `public/audio/voice/mission-control/mission_control_reinforcements_incoming.mp3`
- The voice line uses the existing mission-control voice event path and respects voice settings. The visual warning remains the reliable gameplay signal.

## Balance Notes

This is a pacing overlap, not a reward duplication. A reinforcement consumes the next normal wave in the sector, so it does not add a new extra normal wave on top of the sector. It mainly:

- reduces dead time between mostly-cleared waves,
- creates occasional stacked cleanup pressure,
- can raise score/XP per minute by making the same sector resolve faster,
- avoids adding boss pressure, boss reward changes, Scout pressure, or Sector Run pressure.

The deterministic pressure model is saved at:

- `test-results/mayhem-reinforcement-wave-analysis-20260624.json`

High-skill modeled result with reinforcements compared with the same model without reinforcements:

| Metric | Without | With | Delta |
| --- | ---: | ---: | ---: |
| Median sector | 46 | 46 | +0 |
| Median score | 270,192 | 270,192 | +0 |
| Score/min | 3,078 | 3,189 | +111 |
| Avg deaths | 4.82 | 4.62 | -0.20 |
| Avg reinforcements/run | 0.00 | 12.52 | +12.52 |

The model is a deterministic comparative pressure check, not a live Steam or human skill sample.

## Guardrails

- No Steamworks metadata changed.
- No AppID, depot, leaderboard identity, achievements metadata, Steam Cloud settings, store visibility, save format, or profile rescue changed.
- No score formula, XP formula, boss behavior, boss cadence, boss rewards, Scout waves, or Sector Run rules changed.

## Focused Verification

- `npm run check:mayhem-reinforcement-waves`
- `node scripts/analyze-mayhem-reinforcement-waves.mjs`
