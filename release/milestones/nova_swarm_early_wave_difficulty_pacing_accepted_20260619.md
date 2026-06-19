# Nova Swarm Early Wave Difficulty and Pacing Accepted Milestone, 2026 06 19

## Manual Test Status

Accepted by user after private Steam test.

The accepted result is that the new difficulty is much closer to the intended feel. Normal waves are more engaging, and the reduced wave count improves pacing.

## Accepted Steam Build

- BuildID: `23821577`
- Depot manifest: `3807309952473057445`

## Source And Evidence

- Source commit packaged: `b7c8d7eafcb63c223cf2e21ee44aa776cd058dd1`
- Evidence commit before milestone doc: `b9ac2c82be350ca4f5f232df2c47c41bb7465152`
- Branch: `codex/sector10-clear-time-pacing-20260619`
- Evidence file: `release/steamworks/steam_upload_evidence_sector10_clear_time_pacing_20260619_23821577.json`

## Balance Summary

- `normalWaveDifficultyLevelOffset` remains `9`.
- Sector 1 normal waves map roughly to old Sector 10 normal wave intensity.
- `MIN_WAVES_BETWEEN_BOSSES` changed from `6` to `5`.
- `wavesPerBossBase` changed from `6` to `5`.
- Normal waves are more engaging.
- Pacing to Sector 10 is improved.
- Boss body tuning is unchanged.
- Boss guarded hash: `39175994f789ad9578741f72138e0a22ae49dcc7bfa51308fc7c6a7a0d00e2a3`

## Preserved Behavior

- Boss HP, boss attacks, boss timing, boss sector logic, boss rewards, and boss voices unchanged.
- Sector Challenge checkpoint behavior preserved.
- Display settings branch work preserved.
- Menu legibility milestone preserved.
- Powerup art and Prism Splitter preserved.
- Steam bridge preserved.
- Save format preserved.
- Leaderboard identity remains `nova_swarm_global_score_v2`.
- Steamworks metadata untouched.

## Checks Summary

All requested gates passed except `npm run smoke`, which hit only the known non-blocking flaky timeout at `scripts/smoke-playtest.mjs:764:26` after level 3 debug capture.

Passed checks included packaged smoke, current smoke, current perf, normal wave shift, Sector 10 pacing, wave pacing, difficulty tuning, build, package, i18n, controller, Steam bridge, powerup, Codex, and Threat Codex checks.

Packaged `gitSha`: `b7c8d7e`

## Steam Safety

- `SetLive` blank, exactly `"SetLive" ""`.
- No public/default assignment.
- No `sector-continue-test` assignment.
- No Steam branch assignment by Codex.

## Future Direction Note

This accepted harder baseline may later become Mayhem or Ranked mode. A future Practice mode may be added as unranked and closer to the previous easier difficulty.

This milestone does not implement those modes.

## Rollback

Steam rollback is manual reassignment of the private branch to a previous known good BuildID.

Git rollback to this milestone should use the accepted tag once created.

Source revert if needed:

```bash
git revert b7c8d7eafcb63c223cf2e21ee44aa776cd058dd1
```

## Future Work Rule

Build forward from the accepted milestone branch, not from older difficulty or menu branches.
