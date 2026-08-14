# Nova Swarm Steam test deployment - BuildID 24733684

- Deployment date: 2026-08-14
- Source worktree: `D:\vibe-coding-e\nova-swarm-unbounded-career-rank-20260814-7f3a`
- Source branch: `codex/unbounded-career-rank-20260814-7f3a`
- Source commit: `ef228a5e5ae5152b0d082c702294199565e2beae`
- Baseline commit: `d453bdb06ea4f0269f1be874dc892a6878cb31d4`
- Build stamp: `v2026-08-14_13-33-46`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Assigned branch: `sector-continue-test`
- Steam BuildID: `24733684`
- Depot manifest: `8364117419507757365`

## Branch safety

Fresh authenticated app info immediately before upload showed:

- `public`: BuildID `24709658`.
- `sector-continue-test`: BuildID `24717163`.
- `test-build`: BuildID `23782673`.

Fresh authenticated app info immediately after upload showed:

- `public`: BuildID `24709658` - unchanged.
- `sector-continue-test`: BuildID `24733684`.
- `test-build`: BuildID `23782673` - unchanged.

The inspected VDF contained exactly `SetLive "sector-continue-test"`.

## Product scope

- Career Rank now continues indefinitely beyond the authored Rank 40 progression track.
- Authored unlocks, rewards, combat power, difficulty, achievements, and progression content remain capped exactly where they were.
- Post-track ranks are status-only and use an exact decimal-string/BigInt XP path with a fixed 640,000 XP cadence per rank.
- Steam Cloud merge remains max-based and legacy numeric saves continue to normalize safely.
- Career Rank is surfaced in the HUD, Hangar, Run Report, How To Play, and leaderboard row details without changing competitive score ordering or tie-breaks.
- Rank values remain compact and readable even at deliberately extreme 100-digit test values.
- The final production visuals and behavior were reviewed in the existing internal ChatGPT Pro conversation, which returned `ENDLESS IMPLEMENTATION APPROVED`.

## Payload and validation

- Files: `410`.
- Bytes: `1,178,106,104`.
- Payload manifest SHA-256: `EBD72A15E86B59D9998C8F5904A71FA51F6AD5792F9F03495BB3C66B913EEDD9`.
- Executable SHA-256: `2C9944502585AF8B8303B39C4848F0E7880B15A47D848DD1CC53CA4E28F05B21`.
- The packaged Steam SDK was narrowed to exactly `steam_api.dll` and `steam_api64.dll` before manifesting and upload.
- The dedicated endless-rank contract covered authored-cap preservation, exact post-cap math, 100-digit values, save migration, max-based Cloud merge, leaderboard detail transport, no-row retry behavior, and unchanged competitive payloads.
- Rank progression, achievement, ship unlock, unlock provenance, late-game experiment, leaderboard adapter/mock/split/top-50/visual, i18n, all-language UI, controller, source smoke, desktop smoke, release-line, current/full build, packaged runtime, packaged controls, and packaged performance checks passed.
- The direct packaged executable smoke passed in the repository's explicit local-package mode. Its strict Steam-online assertion was unavailable when the executable was launched outside Steam; the separate packaged-runtime gate passed and this limitation was not hidden or waived.
- Packaged performance: 12 samples, minimum 59.88 FPS, average 60.08 FPS, zero warnings and errors.
- SteamCMD upload: `Successfully finished AppID 4765070 build (BuildID 24733684)`.

No store metadata, achievements, leaderboard definitions, Steam Cloud configuration, patch notes, forum posts, public assignment, Git push, or publication was changed.

Rollback: assign `sector-continue-test` back to BuildID `24717163`. Public requires no rollback because it was not changed.
