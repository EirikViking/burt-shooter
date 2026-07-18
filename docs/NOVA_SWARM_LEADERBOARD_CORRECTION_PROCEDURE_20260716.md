# Nova Swarm Pure/Tactical Leaderboard Correction Procedure - 2026-07-16

Status: procedure prepared; no production score, leaderboard definition, or Steamworks setting was changed.

## Current finding

The future-submission defect is fixed in source:

- missing or unknown run modes no longer silently normalize to Mayhem Pure for reporting or eligibility;
- Pure and Tactical use explicit canonical identities;
- unknown, invalid, debug, Scout, Daily, Sector, and other ineligible runs fail closed;
- pending Steam submissions preserve their original mode and eligibility identity.

The reported existing live score was not moved or deleted because the player/run identity is not proven and the current native Steam bridge exposes read and upload operations, not a safe per-entry delete or move operation.

Resetting or recreating a whole leaderboard would affect unrelated legitimate scores and is not an acceptable substitute.

## Data required before any correction

Collect and retain all of the following:

1. Player's SteamID64, supplied directly by the player or obtained through an authenticated support channel.
2. Exact displayed player name at the time of the run.
3. Exact score.
4. Approximate UTC date/time.
5. Ship, sector, run duration, kills, boss kills, and waves cleared if available.
6. Screenshot/video or local Run Report proving Tactical mechanics were active.
7. The player's explicit confirmation that the identified entry is theirs.
8. The player's preferred fallback if Steam cannot remove one entry: leave the old entry, replace the board version later, or request Valve/Steamworks support.

Do not identify the record from display name and score alone.

## Read-only verification

Run only with `--no-submit`. The probe submits by default if this flag is omitted.

Pure:

```powershell
npm.cmd run probe:steam-leaderboard-live -- --no-submit --leaderboard nova_swarm_global_score_v2
```

Tactical:

```powershell
npm.cmd run probe:steam-leaderboard-live -- --no-submit --leaderboard nova_swarm_tactical_score_v1
```

Record:

- report path;
- UTC timestamp;
- board name;
- rank;
- player name;
- score;
- sanitized Steam ID suffix;
- metadata/details;
- whether the entry is present on one or both boards.

If the entry is outside the probe's downloaded range, use the authenticated Steamworks/Steam API administrative surface to read the relevant range. Do not use `--submit`, `--force-update`, `NOVA_SWARM_STEAM_FIND_OR_CREATE=1`, or the pre-release reset script during investigation.

## Correction decision

### Preferred: supported per-entry administrative move

Use this only if Steamworks support or an established project admin tool provides an authenticated, documented operation that can:

1. remove the exact Pure entry by SteamID64 and leaderboard handle;
2. insert or migrate the exact verified score and metadata into Tactical;
3. preserve an audit trail;
4. avoid touching any other score.

Before execution, save read-only snapshots of both boards and obtain explicit approval for the production mutation.

After execution, repeat both read-only probes and verify:

- the Pure entry is absent;
- the Tactical entry is present once;
- score and metadata match the proven run;
- ranks were recalculated by Steam;
- no duplicate entry exists;
- unrelated neighboring entries are unchanged.

### If only upload is available

The game bridge can upload a score for the currently authenticated Steam account, but it cannot safely impersonate another player or delete that player's wrong-board entry. Do not use a developer account to manufacture a replacement record.

If the affected player is willing and the exact score is independently proven, a player-owned authenticated migration utility could submit the verified score to Tactical. That still leaves the incorrect Pure entry unless Steam provides a separate removal path, so it is not a complete correction by itself.

### If only whole-board reset/recreation is available

Do not reset the existing Pure board. The impact is disproportionate and would erase unrelated legitimate records.

The least destructive future alternative is a versioned replacement board, created only after explicit product/Steamworks approval:

1. freeze `nova_swarm_global_score_v2` as legacy/read-only;
2. create a new Pure board;
3. route new verified Pure runs to the new board;
4. communicate that old contaminated history is archived;
5. preserve Tactical separately.

This changes Steamworks definitions and player-facing history and therefore requires a separate approved migration plan.

### Steamworks support path

If no supported project operation exists, open a Steamworks support case with:

- AppID `4765070`;
- both leaderboard API names;
- affected SteamID64;
- exact score and timestamp;
- proof that the run was Tactical;
- read-only before snapshots;
- request for one-entry removal/migration capability or confirmation that it is unsupported.

Do not request or execute a whole-board reset unless the project owner explicitly accepts loss of all entries.

## Audit record template

```text
Case ID:
Approved by:
Affected SteamID64:
Player confirmation:
Pure board:
Tactical board:
Score:
Run UTC:
Evidence:
Read-only before reports:
Chosen correction path:
Production command/action:
Read-only after reports:
Neighboring-entry comparison:
Result:
Rollback or follow-up:
```

## Current blocker

The affected SteamID64/run identity is not available in the verified local evidence, and no safe per-entry Steam correction API is present in the repository. The live record therefore remains unchanged pending manual production access and an approved supported path.
