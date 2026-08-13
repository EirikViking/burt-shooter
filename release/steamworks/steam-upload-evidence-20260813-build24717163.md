# Nova Swarm Steam test deployment - BuildID 24717163

- Deployment date: 2026-08-13
- Source worktree: `D:\vibe-coding-e\nova-swarm-all-latest-20260813`
- Source branch: `codex/creative-gameplay-iteration-20260813`
- Packaged runtime commit: `feaf085`
- Build-process HEAD before upload: `9a30bf7`
- Build stamp: `v2026-08-13_17-37-42`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Assigned branch: `sector-continue-test`
- Steam BuildID: `24717163`
- Depot manifest: `1097072668262206102`

## Branch safety

Fresh app info immediately before upload showed:

- `public`: BuildID `24709658`.
- `sector-continue-test`: BuildID `24714499`.
- `test-build`: BuildID `23782673`.

Fresh app info immediately after upload showed:

- `public`: BuildID `24709658` - unchanged.
- `sector-continue-test`: BuildID `24717163`.
- `test-build`: BuildID `23782673` - unchanged.

The inspected VDF contained exactly `SetLive "sector-continue-test"`.

## Product scope

- Added an evidence-driven combat-clarity system based on review of 42 raw gameplay videos totaling 4.34 GB.
- Routine notifications share one focused Nova Command lane, coalesce by family, and expire quickly instead of competing across the playfield.
- Action warnings remain sovereign and always defer routine information.
- Dense hostile pressure gently suppresses decorative background layers by at most 18%, with no vignette, pulse, gameplay-object dimming, or UI dimming.
- Reduced Motion uses slower transitions, and the complete system is hard-disabled for the experimental late-game mode.
- No player-facing strings were added or changed.

## Visual review

The exact production build was captured at 1280x720 and 960x640 and sent through the existing internal ChatGPT Pro review conversation. ChatGPT Pro returned exactly `APPROVED` after reviewing the real rendered screenshots and the implementation behavior.

Evidence: `test-results/combat-clarity-visuals-2026-08-13T14-59-36-691Z`.

## Payload and validation

- Files: `410`.
- Bytes: `1,165,314,639`.
- Manifest hash: `a5eef941ee7f79e50f5211e3b030e9a9e503e5dc843cdb87f1f774c7f8d6c978`.
- Executable SHA-256: `481465d0cd50a1286b6cd697ae4b458a592dbd514a3abc5b505d0403a6435420`.
- The packaged Steam SDK was narrowed to exactly `steam_api.dll` and `steam_api64.dll` before manifesting and upload.
- `check:combat-clarity-presentation`, `check:notification-orchestration`, `check:i18n`, `build:current`, `check:i18n-ui`, `check:release-line`, `check:steam-electron-bridge`, source smoke, isolated desktop smoke, package build, packaged runtime, packaged controls, and packaged performance passed.
- The packaged smoke report recorded `status: passed`; its wrapper also emitted a contradictory late `packaged Steam leaderboard unavailable` line while Steam was not logged on. This did not affect the report, package runtime, controls, or performance results.
- Packaged performance: 12 samples, minimum 59.52 FPS, average 59.95 FPS, zero warnings and errors.
- SteamCMD upload: `Successfully finished AppID 4765070 build (BuildID 24717163)`.

No store metadata, achievements, leaderboard definitions, Steam Cloud configuration, patch notes, forum posts, release visibility, public assignment, Git push, or publication was changed.

Rollback: assign `sector-continue-test` back to BuildID `24714499`. Public requires no rollback because it was not changed.
