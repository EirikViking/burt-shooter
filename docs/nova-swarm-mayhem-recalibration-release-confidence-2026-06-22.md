# Nova Swarm Mayhem Recalibration Release Confidence - 2026-06-22

## Scope

Validated private Steam BuildID `23859328`, packaged build `v2026-06-22_18-09-05`, source commit `b73f72cdf59145ccf6a84e19941a066dae64cc79`, and packaged gitSha `b73f72c`.

This pass did not package or upload a new build. It did not change gameplay/source behavior, Steamworks metadata, AppID, depot IDs, leaderboard identity, achievements metadata, Steam Cloud settings, save format, profile rescue behavior, live saves, or live leaderboard state.

## Extended Simulation

Evidence:

- JSON report: `test-results/mayhem-difficulty-score-delta-2026-06-22T16-36-51-892Z/report.json`
- Skill profiles: novice `500` seeds, medium `500` seeds, high-skill/aggressive `500` seeds
- Implemented source worktree: `D:\vibe-coding-e\nova-swarm-delta-implemented-b73f72c-20260622`

High-skill/aggressive metrics:

| Line | Median sector | P75 sector | P90 sector | Median score | Median XP | Score/min | XP/min | 250k prob | 390k prob | Normal deaths | Boss deaths | Boss 2+ chain |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Old public 23809188 | 35 | 35 | 35 | 425,942 | 21,221 | 5,923 | 303 | 98.0% | 66.2% | 4.79 | 0.19 | 0.2% |
| Current accepted 23854561 | 24 | 28 | 32 | 265,698 | 13,251 | 5,841 | 294 | 58.6% | 5.8% | 5.89 | 0.09 | 0.0% |
| Recalibrated 23859328 | 30 | 34 | 35 | 387,006 | 18,152 | 6,777 | 320 | 93.0% | 49.0% | 5.58 | 0.15 | 0.0% |

The implemented source matched candidate F exactly in the deterministic model (`implementedMatches=true`). It restores the intended high-score push band while keeping score/min above old public and boss chain deaths below old public.

## Score/XP Attribution

Evidence: `test-results/mayhem-score-xp-attribution-2026-06-22T16-35-36-458Z/report.json`

Result: passed.

Verified:

- Mayhem normal enemy, combo, normal wave clear, no-hit wave, Graze Break, and normal-wave XP use `1.20`.
- Boss score, boss XP, boss kill rewards, Scout, Sector Run, and bonus drone reward do not use the `1.20` multiplier.
- No double compensation pattern was detected.
- Leaderboard identity remains `nova_swarm_global_score_v2`.

## Isolation And Safety

Run-mode isolation passed:

- `test-results/run-modes-mayhem-scout-sector-2026-06-22T16-38-05-903Z/report.json`
- `test-results/mayhem-scout-difficulty-delta-2026-06-22T16-37-41-436Z/report.json`

Verified:

- Mayhem normal waves use effective level offset `7`.
- Mayhem bosses remain HP `1` and attack danger `1`.
- Scout effective pressure remains lower, Scout boss HP remains `0.75`, and Scout boss attack danger remains `0.6375` versus Mayhem.
- Sector Run remains uncompensated and keeps its normal mode behavior.

Leaderboard and achievement mock checks passed:

- `npm run check:steam-leaderboard-mock`
- `npm run check:steam-achievements-mock`
- `npm run check:steamworks-leaderboard-config`
- `npm run check:score-normalization`

Save/profile/display checks passed:

- `npm run check:steam-cloud-save`
- `npm run check:profile-isolation`
- `npm run check:scout-codex-persistence`
- `npm run check:threat-codex`
- `npm run check:display-settings`
- `npm run check:ui-scale-4k`

## Performance

Passed:

- Collision hotpath: `test-results/mayhem-collision-hotpath-stress-2026-06-22T16-38-05-900Z/report.json`
- Mayhem performance diagnostics: `test-results/mayhem-performance-diagnostics-2026-06-22T16-41-35-743Z/report.json`
- Sector frame pacing: `test-results/mayhem-sector-frame-pacing-2026-06-22T16-41-35-877Z/report.json`
- Current desktop smoke: `test-results/electron-smoke-2026-06-22T16-46-46-151Z/`
- Current desktop perf: `test-results/electron-perf-smoke-2026-06-22T16-47-04-249Z/`
- Packaged smoke: `test-results/packaged-exe-smoke-2026-06-22T16-51-43-589Z/report.json`
- Packaged perf: `test-results/packaged-perf-smoke-2026-06-22T16-52-09-022Z/report.json`

Packaged smoke/perf prove packaged gitSha `b73f72c`.

## Packaged Build

Validated existing packaged build only. No new package or upload was produced.

- Packaged gitSha: `b73f72c`
- VDF AppID: `4765070`
- VDF Depot: `4765071`
- VDF SetLive: `"SetLive" ""`
- Payload manifest evidence: `test-results/steam-payload-manifest-release-confidence-20260622T165320/steam_payload_manifest.json`

## Residual Findings

These are not Mayhem recalibration logic failures, but they should be known before assigning the build publicly:

1. `npm run check:result-screen-flow` failed a visual spacing assertion: Good run `1366x768` gap from `run-summary-card` to `rank-progress-card` was `8px`, expected at least `10px`.
2. `npm run check:scout-local-best` failed idempotency: replaying the same Scout best is treated as a new best because a newer `completedAt` timestamp wins the final tie. Scout best remains profile-scoped and persists, but duplicate equal score/sector attempts are not idempotent.
3. `npm run smoke` hit the known non-blocking timeout at `scripts/smoke-playtest.mjs:764:26` after the level 3 debug capture. Current and packaged smoke/perf passed, so this remains non-blocking.
4. One parallel current desktop smoke/perf attempt and one first packaged smoke attempt hit Electron startup load timeouts; sequential reruns passed.

## Recommendation

Release after minimal manual sanity testing.

No Mayhem score/difficulty, boss, run-mode isolation, leaderboard, achievement, save/profile, packaged gitSha, VDF, or performance blocker was found. The remaining manual sanity should be short and focused:

- Start BuildID `23859328` from Steam.
- Launch Mayhem, confirm normal-wave score popups feel sane and the result screen shows final score/XP.
- Open Settings once to confirm UI Scale and Confirm Exit are still present.
- Optional if time: run one Scout attempt and confirm Scout Best display is acceptable despite the duplicate-idempotency finding.

Machine-readable release-confidence summary:

`test-results/mayhem-recalibration-release-confidence-2026-06-22T16-57-30-128Z/report.json`
