# Nova Swarm achievement integrity audit

Date: 2026-07-19

Branch: `codex/achievement-integrity-audit-20260719`

Baseline: `ff0a4d3c330d54c0a1e1c6aadac9b394d407d7de`

Catalog reviewed: 81 achievements

- 39 rank achievements
- 40 milestone achievements
- 2 leaderboard achievements

## Confirmed defects

### No Repair Receipts used the wrong moment

The previous correction froze life losses when Sector 10 marked the run clear, but combined that value with the final score. A run could therefore clear Sector 10 without a loss, lose lives in Overrun, reach 250,000 afterward, and still unlock.

The corrected runtime freezes life losses only at the first moment when both conditions are simultaneously true:

- the ranked run has cleared Sector 10; and
- the current run score is at least 250,000.

The order is covered both ways. Reaching 250,000 first waits for the clear; clearing first below 250,000 waits for the score. Life losses between those two moments invalidate the achievement. Once both conditions were met cleanly, later Overrun losses do not revoke it.

The Steam unlock shown in the supplied screenshot was created by the earlier support backfill, not by a naturally evaluated corrected run.

After explicit approval, the single `ACH_NO_REPAIR_RECEIPTS` unlock was cleared through the normal Steam achievement bridge and removed from the matching local, retry-queue, and Steam Cloud mirrors. Steam and local counts each changed from 60 to 59, and set comparison proved every other achievement unchanged.

### Full Hangar Omega was stale

The catalog now has 30 playable ships, but Full Hangar Omega still said and required 25. Its requirement, 250,000-point score gate, all supported-language descriptions, and release-preparation metadata now match the intended 30-ship condition. The uploaded package contains the corrected runtime and in-game text. Steamworks stats revision 10 published the matching English description, changing only `25` to `30`.

## Full-catalog review

- Every catalog ID and display name is unique.
- All 81 IDs remain stable and below Steam's 100-achievement limit.
- All 39 rank IDs map sequentially to the 40-rank progression model.
- All 40 milestone achievements evaluate through the authored run/career metric path.
- Every legendary achievement retains its required current-run score gate; historical best score cannot satisfy that gate.
- No Repair Receipts now has order-sensitive boundary coverage for clear-before-score, score-before-clear, intervening losses, and post-qualification Overrun losses.
- Both leaderboard achievements retain their accepted-submission and stable-ID guards.
- Local persistence, Steam import/export, queued unlock retry, StoreStats, and clear diagnostics pass the mocked Steam bridge.
- Practice, Scout, Daily, Sector Start, and debug run achievement gates remain unchanged.

## Scope preserved

No achievement ID, leaderboard identity, stored score, save key, save schema, Steam Cloud path, AppID, depot ID, score formula, or rank formula changed. The explicitly approved single-account achievement clear and the approved Full Hangar Omega description correction are the only production changes in this pass.

## Private Steam deployment

The verified package `v2026-07-19_12-07-13` was uploaded as Steam BuildID `24282095` for AppID `4765070` and depot `4765071`. The VDF retained `SetLive ""`; no Steam branch was assigned or moved.

The uploaded build contains the corrected Full Hangar Omega runtime and localized in-game descriptions. Steamworks stats revision 10 was then published with exactly one pending diff: the `ACH_FULL_HANGAR_OMEGA` English description changed from 25 to 30 playable ships. The history page showed no remaining unpublished changes, and the achievement table was reopened to verify the 30-ship text.
