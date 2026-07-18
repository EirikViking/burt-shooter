# P0 Explicit Profile Rescue - 2026-06-20

## Root Cause

BuildID `23829231` still loaded the lower-progress Steam-scoped save because the active AppData shared save and active profile folder are keyed to `steam-76561198953993508`.

The higher-progress save was not erased. It is preserved as a sibling explicit Steam profile keyed to `steam-76561198692310517`, and it is also present in the backed-up Steam Cloud userdata mirror.

The previous migration was intentionally conservative: it imports only unscoped legacy progress into the first active scoped profile and refuses to automatically merge one explicit Steam profile into another. That protected profile isolation, but it also meant this real rescue case needed an explicit operator-driven import.

## Evidence From Local Backup

Pre-run backup:

`test-results/save-backup-p0-explicit-profile-rescue-20260620-003708/`

Inspected save roots:

- `C:\Users\cromk\AppData\Roaming\Nova Swarm`
- `C:\Users\cromk\AppData\Roaming\nova-swarm`
- `C:\Program Files (x86)\Steam\userdata\732044789\4765070`
- `C:\Program Files (x86)\Steam\userdata\993727780\4765070`

Profile summaries from the backup:

- Active target profile: `steam-76561198953993508`
  - Pilot rank `1`
  - Pilot XP `1078`
  - Ships unlocked `3`
  - Codex discoveries `40`
  - Checkpoint records `20, 25, 45`
- Preserved high-progress source profile: `steam-76561198692310517`
  - Pilot rank `17`
  - Pilot XP `126083`
  - Ships unlocked `23`
  - Codex discoveries `783`
  - Checkpoint records `5, 10, 15, 20, 30`

## Rescue Tool

The explicit rescue command is:

```powershell
npm run profile:rescue -- --source steam-76561198692310517 --target steam-76561198953993508
```

This is dry-run by default. It writes an ignored audit log under `test-results/profile-rescue-import-*/rescue-audit.json` and does not modify saves.

To apply the import after reviewing the dry-run:

```powershell
npm run profile:rescue -- --source steam-76561198692310517 --target steam-76561198953993508 --apply
```

The apply path creates a backup before writing. By default the backup is under the same ignored audit folder:

`test-results/profile-rescue-import-*/backup-before-apply/`

For testing against a copied AppData folder instead of live saves:

```powershell
npm run profile:rescue -- --user-data "D:\path\to\copied\nova-swarm" --source steam-76561198692310517 --target steam-76561198953993508
```

## Merge Rules

The import is additive and monotonic:

- Sets are unioned.
- Numeric progress uses max.
- Unlocked flags preserve `true`.
- Local highscores are merged and sorted by score.
- Codex discoveries are unioned by category and id.
- Hangar ship unlocks are unioned.
- Sector Run checkpoint records are unioned, with the best record kept per checkpoint.
- Pilot rank and XP use max.
- Best scores use max.
- The target Steam profile identity remains `steam-76561198953993508`.

Fields not overwritten:

- Target settings are preserved unless a nested setting is missing.
- Target selected ship is preserved when present.
- Source profile save is never modified.
- Other Steam profile saves are never deleted or modified.

The script refuses a source that is not meaningfully ahead of the target, unless the target already contains the source. In the already-merged case it reports an idempotent no-op and writes nothing.

## Manual Recovery Procedure

1. Close Nova Swarm and Steam before applying, so Steam Cloud does not race the file write.
2. Confirm the dry-run source is `steam-76561198692310517` and the target is `steam-76561198953993508`.
3. Confirm the dry-run shows rank, ships, Codex discoveries, and checkpoints increasing.
4. Run the apply command.
5. Keep the generated backup folder until the next successful in-game verification.
6. Launch Nova Swarm and verify the Hangar, Codex, and Sector Run checkpoint list.

Do not use the low-progress `steam-76561198953993508` profile as the source. It is the target that should receive the restored progress.

## Steam Safety

This rescue path does not package, upload, call Steam APIs, assign a Steam branch, change `SetLive`, or change Steamworks metadata. It edits only local JSON save files when `--apply` is explicitly passed.
