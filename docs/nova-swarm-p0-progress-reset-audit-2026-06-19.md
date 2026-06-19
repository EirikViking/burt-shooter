# Nova Swarm P0 Progress Reset Audit - 2026-06-19

## Scope

This audit investigated a P0 report that player progress appeared reset after the Mayhem / Scout / Sector Run and launch-deck menu changes.

The pass intentionally stopped before any Steam packaging, upload, `SetLive`, public branch assignment, or live-save repair. Live save locations were copied to ignored backup evidence before running game-facing checks.

## Baseline and Branch

- Starting branch: `codex/run-mode-launch-deck-menu-layout-20260619`
- Starting HEAD: `a6fbd87eeb53e68110a4d5a0da71ac51965bd50b`
- Suspect launch-deck source commit: `d93c6c6a9c4f5298180c78fea201718a79449aea`
- Run-mode source commit: `fbaeff2c5379d01952b11b3d1d3305cb2ec8ea24`
- Accepted harder ranked baseline tag: `accepted/nova-swarm-harder-ranked-baseline-20260619`
- P0 branch: `codex/p0-progress-reset-save-migration-20260619`
- Pre-run snapshot: `7bf879e` (`chore: snapshot before p0 progress reset audit`)

## Live Save Backup

Backup root:

`test-results/save-backup-p0-progress-reset-20260619-235855/`

Copied roots:

- `%APPDATA%/Nova Swarm`
- `%APPDATA%/nova-swarm`
- `C:/Program Files (x86)/Steam/userdata/732044789/4765070`
- `C:/Program Files (x86)/Steam/userdata/993727780/4765070`

No live save was deleted, reset, repaired, or overwritten.

## Finding

The available evidence points to hidden / different-profile progress rather than erased progress.

The backup contains a high-progress Steam profile:

- Profile: `steam-76561198692310517`
- Persona: `tfoundgames`
- Pilot XP: `126083`
- Pilot rank: `17`
- Total runs: `30`
- Best sector / level: `31`
- Codex discoveries: `783`
- Unlocked ships: `23`
- Sector Run records: `5`, `10`, `15`, `20`, `30`

The current shared save in `%APPDATA%/nova-swarm/steam-cloud/nova-swarm-save.json` points at a different, lower-progress Steam profile:

- Profile: `steam-76561198953993508`
- Persona: `Tiny Foundry`
- Pilot XP: `1078`
- Pilot rank: `1`
- Total runs: `1`
- Best sector / level: `2`
- Codex discoveries: `40`
- Unlocked ships: `3`

That means the apparent reset can happen if the runtime selects the low-progress Steam identity while a richer profile remains preserved under another Steam identity. The fix below does not merge explicit Steam profiles silently, because that could incorrectly carry achievements or leaderboard-relevant progress between accounts.

## Code Fix

`src/profile/ProfileStorageNamespace.js` now imports legacy unscoped `localStorage` progress into the active scoped profile when the active scoped slot is empty.

Rules:

- Copies old unscoped Hangar, Codex, Sector Run records, achievements mirror, selected ship, usage, local leaderboard, and legacy progress keys into the active profile-scoped keys.
- Leaves the original unscoped keys in place for recovery.
- Does not overwrite an existing scoped profile.
- Claims the legacy unscoped import once with `nova.profile.legacyUnscopedClaim.v1`.
- Does not repeatedly copy one profile's legacy keys into every later Steam profile.
- Does not silently merge different explicit Steam profile saves.

This protects older valid profiles that predate profile-scoped storage from appearing blank after the namespace layer is installed.

## Regression Coverage

New check:

- `npm run check:save-profile-migration`

It proves:

- Legacy unscoped Hangar progress migrates into the first active scoped profile.
- Legacy Codex progress remains visible.
- Legacy Sector Run records remain visible.
- Legacy `ACH_EARLY_PILOT` mirror remains intact.
- Sector Run checkpoints `5`, `10`, `20`, and `30` remain available from best sector `31`.
- Existing scoped profile data is not overwritten by unscoped legacy data.
- A second Steam profile does not inherit a legacy import already claimed by the first profile.
- Steam Cloud still imports an unprofiled shared legacy save into the first matching Steam profile.
- A different explicit Steam profile remains isolated.

Existing related checks rerun:

- `npm run check:steam-cloud-save`
- `npm run check:profile-isolation`
- `npm run check:sector-start-checkpoint-unlocks`

## Decision

No Steam package or upload was performed in this P0 pass. The source fix is safe to review and test locally first.

If the player is currently seeing the low-progress profile because Steam is logged into `steam-76561198953993508`, the preserved high-progress profile under `steam-76561198692310517` should not be auto-merged by code. Recovery or account switching should be handled explicitly with user approval.
