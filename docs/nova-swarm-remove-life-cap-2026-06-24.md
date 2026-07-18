# Nova Swarm Remove 6-Life Cap - 2026-06-24

## Request

Remove the hard 6-life maximum so extra-life pickups and repair-style powerups can keep adding lives during deep runs.

## Implementation Summary

- `MAX_PLAYER_LIVES` is now unlimited through the shared balance config.
- Extra-life pickups still use the existing `Game.gainLife()` path, but no longer convert into the old max-life score bonus at 6 lives.
- Max-life notification logic now only fires for finite caps, so the old `MAX LIVES REACHED!` toast and voice line do not trigger during normal unlimited-life play.
- Powerup and Threat Codex copy for Extra Life/Nano Patch no longer claims that capped lives turn into a score payout.
- Boss-clear recovery keeps its separate low-life recovery cap (`bossClearRepairMaxLives: 3`) and was not turned into unlimited sustain.

## Scope Guard

This change does not alter score formula, XP formula, leaderboard identity, achievement metadata/behavior, save format, Steam Cloud settings, AppID/depot IDs, Steamworks metadata, boss behavior, enemy behavior, or wave behavior.

## Verification

Focused guard: `npm run check:life-cap`.

Passed checks are recorded in `progress.md`. Steam upload was not performed because real Steam-enabled desktop smoke/perf were blocked by missing Steam client initialization in this session.
