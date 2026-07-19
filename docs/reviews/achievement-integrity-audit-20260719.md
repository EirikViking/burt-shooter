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

The Steam unlock shown in the supplied screenshot was created by the earlier support backfill, not by a naturally evaluated corrected run. This pass does not silently clear that external Steam achievement.

### Full Hangar Omega was stale

The catalog now has 30 playable ships, but Full Hangar Omega still said and required 25. Its requirement and all supported-language descriptions now use 30. The release-preparation metadata was updated, but live Steamworks metadata was not changed.

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

No achievement ID, leaderboard identity, stored score, save key, save schema, Steam Cloud path, AppID, depot ID, score formula, or rank formula changed. No Steam package was built or uploaded, no Steam branch moved, and no Steamworks setting or live achievement row was modified.
