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
- Ship Details modal:
  - The primary discoverable placement is now under `YOUR LAUNCHES`.
  - Unlocked hulls show `Unlocked: <reason>`.
  - Locked hulls show `Unlock: <requirement>`.
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

- Focused provenance report: `test-results/ship-unlock-provenance-2026-06-23T10-46-14-295Z/report.json`
- Simulated 4K UI Scale Hangar evidence: `test-results/ui-scale-4k-2026-06-23T10-47-52-339Z/`, including `03-hangar-combat-readout` captures for the 4K scale scenarios.
- Packaged smoke proof: `test-results/packaged-exe-smoke-2026-06-23T11-13-20-348Z/report.json`, build `v2026-06-23_13-09-25`, gitSha `d44064c`.
- Packaged perf proof: `test-results/packaged-perf-smoke-2026-06-23T11-13-20-340Z/report.json`, build `v2026-06-23_13-09-25`, gitSha `d44064c`.
- Payload manifest: `release/steamworks/steam_payload_manifest.json`, 336 files, 880,525,922 bytes, manifest hash `4d7cb0f5b841c6d7a4bc511e75519a2c61f219f84cc2462750189619c38a7734`.
- Steam upload: SteamCMD uploaded private BuildID `23873700`. The generated VDF kept `"SetLive" ""`, with AppID `4765070` and depot `4765071`; no Steam branch was assigned.
- Details-modal polish evidence: `test-results/ui-scale-4k-2026-06-23T11-52-53-810Z/` includes `04-hangar-details-unlock-history` captures at 100%, 150%, 175%, and 200% UI Scale.
- Legacy fallback Details proof: `test-results/hangar-controller-details-2026-06-23T11-50-26-435Z/03-ship-details-opened.png` shows `Unlocked: Before tracking was added` in the modal.
- Details-modal polish package: source commit `052fbfd72db6c42c5e96555ee26690499253418e`, build `v2026-06-23_13-57-04`, packaged gitSha `052fbfd`, private Steam BuildID `23874257`, VDF `"SetLive" ""`.

## Scope Guard

No ship unlock requirements, score formula, XP formula, balance, leaderboard identity, achievements metadata/behavior, Steam Cloud settings, save profile namespace, AppID, depot ID, store visibility, or Steamworks metadata were intentionally changed.
