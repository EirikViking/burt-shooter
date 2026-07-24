# Steam Upload Evidence - Tyrian Feedback Manual Test

Generated: 2026-07-24
Worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
Branch: `codex/tyrian-feedback-program-20260724`
Verified V2 baseline: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
Packaged source commit: `23e37ccfffe45eb22d622ce91301a73e95688458`
Package-evidence commit: `b87a901`
AppID: `4765070`
DepotID: `4765071`

## Reviewed Tyrian Improvements

- Extended the Sector Run selector and controller flow through mature-profile checkpoints.
- Made Tactical Draft stat previews report the values the selected upgrade will actually apply.
- Corrected player-facing rank numbering and preserved the published rank art set.
- Cleared transient input state at scene transitions to prevent contaminated browser/controller checks.
- Stabilized boss signature warnings by locking their lane, movement, and telegraph arc.
- Removed dense kill-path allocations while preserving score, bonus, and progression behavior.
- Preserved cumulative Pilot Order progress across order transitions through the final order.
- Added the career-only Sector 51 Overrun Tactical mode without changing competitive eligibility.
- Added late-Overrun boss shuffles and routine reinforcement escalation.
- Reverified the existing guided bomb implementation from the V2 baseline.

## Package Evidence

- Package version: `v2026-07-24_20-22-36`
- Content root: `release/desktop/win-unpacked`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Files: `410`
- Total bytes: `1057949882`
- Executable SHA-256: `145e0fa38887d7d480003764e00a38bf9c8d3061b0712e435a8f01c63130d9de`
- Payload manifest hash: `85e536da75761bbaf4f043fb5bfc43f37a2d7d3e72d54e261478759bc1ff979b`
- Depot manifest: `7393812582283906988`

## Verification

- Release-line, i18n, i18n UI, production build, smoke, controller-flow, Steam bridge, Steam Cloud, package-runtime, package-review, packaged controls, packaged smoke, and packaged performance checks passed.
- Focused Sector selector, Tactical Draft, input transitions, boss roster, boss telegraph, boss phase variety, Overrun mode, Overrun reinforcements, Mayhem reinforcements, run contracts, bomb usability, and power-up checks passed.
- Collision hot-path stress, browser frame pacing, Mayhem/Sector frame pacing, desktop smoke, and desktop performance checks passed.
- The first cold-start boss-phase-variety launch exceeded its 30-second startup timeout; the complete immediate rerun passed all 10 archetypes in 212.9 seconds.
- A delayed packaged-menu capture confirmed that the initially incomplete automated menu frame was a screenshot timing race, not missing packaged assets.

## SteamPipe Uploads

The reviewed package was first uploaded without branch assignment:

- BuildID: `24379730`
- `SetLive`: empty string

The same package was then uploaded and assigned only to the existing manual-test branch:

- BuildID: `24379809`
- `SetLive`: `sector-continue-test`
- SteamCMD user: `gaunziman`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24379809).`

Post-upload Steam metadata confirmed:

- `sector-continue-test`: BuildID `24379809`, depot manifest `7393812582283906988`
- `public`: BuildID `24339078`, depot manifest `7475394859305636484`

The public/default branch, store page, achievements, Steamworks configuration, and public release were not changed.

## Rollback

- Steam: assign `sector-continue-test` back to BuildID `24339078`.
- Source changes: `git revert --no-edit 41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f..23e37ccfffe45eb22d622ce91301a73e95688458`.
- Evidence-only commits can be reverted separately after the source rollback if required.
