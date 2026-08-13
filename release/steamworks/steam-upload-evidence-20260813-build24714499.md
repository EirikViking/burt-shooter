# Nova Swarm Steam test deployment — BuildID 24714499

- Deployment date: 2026-08-13
- Source worktree: `D:\vibe-coding-e\nova-swarm-all-latest-20260813`
- Source branch: `codex/tyrian-latest-feedback-20260813`
- Source commit: `748866b`
- Build stamp: `v2026-08-13_15-15-25`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Assigned branch: `sector-continue-test`
- Steam BuildID: `24714499`
- Depot manifest: `4292258921342613276`

## Branch safety

Fresh app info immediately before upload showed public and `sector-continue-test` on BuildID `24709658`, with `test-build` on `23782673`.

Fresh app info immediately after upload showed:

- `public`: BuildID `24709658` — unchanged.
- `sector-continue-test`: BuildID `24714499`.
- `test-build`: BuildID `23782673` — unchanged.

The inspected VDF contained exactly `SetLive "sector-continue-test"`.

## Payload and validation

- Files: `410`.
- Bytes: `1,165,307,587`.
- Manifest hash: `1a3aff8a3758ea3d550fd64f77e0e5215cd955e020da9cf954fcdd8809af5941`.
- The embedded Steam SDK was narrowed to exactly `steam_api.dll` and `steam_api64.dll` before manifesting and upload.
- ChatGPT Pro reviewed the final eight-image build capture set and returned exactly `APPROVED`.
- `check:release-line`, full package build, packaged runtime, packaged smoke, packaged controls, and packaged performance all passed.
- Packaged performance: 12 samples, minimum 59.52 FPS, average 60.08 FPS, zero warnings and errors.
- SteamCMD upload: `Successfully finished AppID 4765070 build (BuildID 24714499)`.

No store metadata, achievements, leaderboard definitions, Steam Cloud configuration, patch notes, forum posts, release visibility, public assignment, Git push, or publication was changed.

Rollback: assign `sector-continue-test` back to BuildID `24709658`. Public requires no rollback because it was not changed.
