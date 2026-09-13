# Nova Swarm Stable Baseline Lock: Build 24687671

Created: 2026-08-12 (Europe/Oslo)

## Locked build identity

- Steam AppID: `4765070`
- Windows depot: `4765071`
- Steam BuildID: `24687671`
- Depot manifest: `8576537259633784556`
- Package version: `v2026-08-12_09-17-43`
- Exact packaged source commit: `0dbb691c8c2e09c0de4df5dbe3f20d04342b6fe3`
- Payload-manifest evidence commit: `0a43bf5`
- Steam receipt evidence commit: `0c34f5cc050a468acb1795ac587938a89721cb49`
- Source branch: `codex/late-game-performance-integration-20260811`
- Stable branch pointer: `codex/stable-build24687671-20260812`
- Immutable source tag: `nova-swarm-release-20260812-build24687671`
- Immutable stable evidence tag: `nova-swarm-stable-20260812-build24687671`
- Steam branch assignment: `sector-continue-test`
- Public/default rollback build: `24667008`
- Test-branch rollback build: `24681737`
- Leaderboard identity: `nova_swarm_global_score_v2`

The source tag identifies the exact game source packaged for BuildID 24687671. The stable evidence tag and stable branch pointer identify the final local handoff containing this lock and the Steam receipt. No existing commit was rewritten or discarded.

## Baseline contents

This baseline contains the accepted late-game experiment pressure correction and the experiment-only Tactical draft restoration:

- Starting an acknowledged experiment at Sector 75/100/120/150 preserves the native late-sector pressure floor, wave count, danger moments, elite plan, and difficulty instead of resembling Sector 1.
- Tactical experimental runs retain the normal post-boss augment choice before the next sector.
- Pure experimental runs remain draft-free and retain zero Tactical augments.
- The test remains explicitly labelled `EXPERIMENTAL TEST // NO AWARDS` and isolated from progression, Cloud persistence, rankings, achievements, and normal-run rewards.
- Ordinary game modes retain their existing pressure and Tactical Draft behavior.
- The late-game allocation/stutter performance work already present in public/default BuildID 24667008 remains included.

## Package and validation evidence

- Payload: 861 files, 1,363,246,258 bytes.
- Payload manifest SHA-256: `7cc3a21bcd2633df64dd057d3c26b657d624e3ff7ecb8a5b1b6ea554a73d4c38`.
- Executable SHA-256: `7cee7d205d434f8b7170c557d1b43f34b0d31db00d286387d3f7b7245888d2e1`.
- Packaged smoke: passed.
- Packaged performance: 58.48 FPS minimum, 60.15 average, zero warnings/errors.
- Exact Sector 75 Tactical boss -> augment draft -> Sector 76 flow: passed and visually inspected.
- Pure, normal Tactical, run-mode, persistence, pressure, localization, controller, release-line, and production-build gates: passed.
- Steam receipt: `release/steamworks/tactical_experiment_draft_steam_test_20260812_24687671.md`.

SteamPipe repeated the inherited warning that the broad SDK staging lane includes development Steam files. The private test upload succeeded. Narrow that staging payload before any later public/default promotion.

## Steam state

Authenticated post-upload app info proved:

- `sector-continue-test`: BuildID `24687671`
- `public` / default: BuildID `24667008` (unchanged)
- `test-build`: BuildID `23782673` (unchanged)

No store metadata, pricing, achievements, leaderboard identity, Steam Cloud configuration, or public/default assignment changed.

## Continuation and rollback

Further development should branch from `nova-swarm-stable-20260812-build24687671` or the equivalent stable branch pointer. Do not rewrite or delete either immutable tag.

- Source rollback on a new branch: `git revert 0dbb691c8c2e09c0de4df5dbe3f20d04342b6fe3`.
- Test-branch rollback: explicitly assign `sector-continue-test` back to BuildID `24681737`.
- Public/default remains at BuildID `24667008`; no public rollback action is required.

