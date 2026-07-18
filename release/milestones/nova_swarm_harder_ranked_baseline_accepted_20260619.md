# Nova Swarm Harder Ranked Baseline Accepted Milestone, 2026 06 19

## Manual Test Status

Accepted by user after private Steam test. User says this build is great.

## Accepted Steam Build

- BuildID: `23822761`
- Depot manifest: `3998297278931999212`

## Source And Evidence

- Packaged source commit: `0aad2d87782c10168579a5c089c90dd8d7c93950`
- Evidence commit: `8cce12765e29261a757eb0039f33baa96aee7c52`
- Score fairness analysis commit: `00bc730b3fcf1060a855150b68b7f20bc4a9cd15`
- Evidence file: `release/steamworks/steam_upload_evidence_early_boss_relief_20260619_23822761.json`
- Score fairness report: `docs/nova-swarm-score-fairness-after-difficulty-shift-2026-06-19.md`

## Gameplay Summary

- Normal waves use the harder early game baseline.
- Normal wave difficulty offset remains `9`.
- Wave pacing was shortened.
- Early bosses 1 through 11 have relief scalar `0.9`.
- Bosses 12 and later return to the previous curve.
- Normal waves, pacing, and early boss relief together are now the accepted main gameplay feel.

## Score Fairness Summary

- The score fairness analysis found average clears are not disadvantaged.
- Sector 10 average clear estimates were higher than the old baseline.
- Low combo clears may score lower.
- No score formula change was made.
- A visible Mayhem or Ranked score bonus around 15 percent may be considered later only if needed.

## Early Pilot Note

The Early Pilot achievement and safe backfill code are present on this line (`ACH_EARLY_PILOT` and `backfillEarlyPilotAchievement`). No Early Pilot changes were made in this milestone.

## Future Direction

- This current harder baseline may later be named Mayhem or Ranked mode.
- A future Easy or Practice mode should be unranked at first and slightly easier than the old difficulty.
- A separate Practice leaderboard may be considered later, but should not be implemented now.
- Do not change the existing leaderboard identity unless explicitly requested later.

## Preserved Invariants

- Leaderboard identity remains `nova_swarm_global_score_v2`.
- Steam bridge preserved.
- Save format preserved.
- Sector Challenge checkpoint behavior preserved.
- Display settings preserved.
- Menu legibility milestone preserved.
- Powerup art and Prism Splitter preserved.
- Steamworks metadata untouched.

## Steam Safety

- SetLive blank for uploaded build.
- No public/default assignment.
- No sector-continue-test assignment.
- No Steam branch assignment by Codex.

## Rollback

Steam rollback is manual reassignment of the private branch to previous known good BuildID.

Git rollback to this accepted baseline should use the accepted tag once created.

Source rollback if needed:

```bash
git revert 0aad2d87782c10168579a5c089c90dd8d7c93950
```

## Future Work Rule

Build future Easy/Practice mode work from the clean forward branch created by this milestone, not from older difficulty branches.
