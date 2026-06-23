# Nova Swarm Ship Unlock Provenance - 2026-06-23

## Problem

Ship unlocks showed whether a hull was available, but not what the player did to earn it. Players could return to the Hangar later and see a ready ship without knowing whether it came from sector reach, score, bosses, Codex progress, clears, or an older profile migration.

## Implementation Summary

- Ship unlock definitions remain in `src/config/ShipUnlockConfig.js`.
- Profile-scoped unlock history is stored in `nova.hangarProgress.v1` as `shipUnlockHistory`.
- Each entry stores a stable `reasonKey`, structured `reasonParams`, source/run context, optional sector/score/boss count, run mode, build version, and timestamp.
- Existing unlocked ships without known history receive the safe fallback `shipUnlock.reason.legacy`, shown as `Unlocked: Before tracking was added`.
- Known history is not overwritten by vague migration data.
- Saved unlocked ship IDs are preserved during normalization so migration cannot relock a previously unlocked hull.
- New unlocks record the deterministic requirement group that became true, such as best score, boss count, sector reach, or combined milestones.
- Renderer and Electron Steam Cloud merge/sanitize paths preserve `shipUnlockHistory` without merging profiles.

## UI

- Ship Select / Hangar combat readout:
  - Locked hulls show `Unlock: <requirement>` plus progress counts when available.
  - Unlocked hulls show `STATUS: READY FOR LAUNCH` and `Unlocked: <reason>`.
- Game Over unlock summary:
  - A single newly unlocked ship can show `Reason: <reason>` below the unlock line.
  - No active-gameplay popups were added.

## Example Text

- `Unlocked: Reached Sector 8`
- `Unlocked: Defeated 1 bosses`
- `Unlocked: Scored 140,000 points in one run`
- `Unlocked: Before tracking was added`
- `Unlock: Clear twice, reach rank 16, and discover 180 threats`

## Evidence

- Focused provenance report: `test-results/ship-unlock-provenance-2026-06-23T10-45-10-089Z/report.json`
- Existing 4K UI Scale harness captures the Hangar combat readout at `03-hangar-combat-readout` for `100%`, `150%`, and `200%` simulated 4K layouts when run for this branch.

## Scope Guard

No ship unlock requirements, score formula, XP formula, balance, leaderboard identity, achievements metadata/behavior, Steam Cloud settings, save profile namespace, AppID, depot ID, store visibility, or Steamworks metadata were intentionally changed.
