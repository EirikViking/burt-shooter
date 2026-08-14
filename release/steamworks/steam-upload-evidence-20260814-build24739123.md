# Nova Swarm Steam test deployment - BuildID 24739123

- Deployment date: 2026-08-14
- Source worktree: `D:\vibe-coding-e\nova-swarm-unbounded-career-rank-20260814-7f3a`
- Source branch: `codex/unbounded-career-rank-20260814-7f3a`
- Source commit: `ac487c0dcef08d3500e83af93cfe101ca66d6bc2`
- Baseline commit: `d453bdb06ea4f0269f1be874dc892a6878cb31d4`
- Build stamp: `v2026-08-14_18-25-57`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Assigned branch: `sector-continue-test`
- Steam BuildID: `24739123`
- Depot manifest: `7532030024113603581`

## Branch safety

The inspected upload VDF contained exactly `SetLive "sector-continue-test"`. Fresh authenticated Steamworks build history immediately after upload showed:

- `default`: BuildID `24733684`.
- `sector-continue-test`: BuildID `24739123`.
- `test-build`: BuildID `23782673`.

The new build is assigned only to `sector-continue-test`. Public/default and Steamworks configuration were not changed.

## Product scope

- A first-time pilot now sees a localized movement-and-fire prompt inside the opening run instead of receiving a detached menu tutorial.
- Enemies wait only until movement and firing are demonstrated, with a 3.8-second safety fallback so onboarding cannot stall the run.
- A second localized Phase/Focus prompt appears only after a hostile projectile becomes visible, never pauses combat, and dismisses early when both actions are demonstrated.
- The contextual lesson runs only when `totalRuns` is zero, defers Pilot Orders and achievement presentation until it is complete, and leaves returning runs and the experimental late-game mode unchanged.
- Keyboard/mouse and controller layouts were verified at 1280x720 and 960x640.
- The final implementation screenshots and lifecycle behavior were reviewed in the existing internal ChatGPT Pro conversation and received `FIRST-RUN IMPLEMENTATION APPROVED`.

## Payload and validation

- Files: `410`.
- Bytes: `1,178,122,832`.
- Payload manifest SHA-256: `ad5a0c4d424a77121b98f62239572b8d515fb83eb28af7e8807209d0b8d9c1ac`.
- Executable SHA-256: `5abe24ff4f6a8d20c9ce6bd28cefc2e304bfb05b2bc98111fe9ed0c7dfdb9ffa`.
- The packaged Steam SDK was narrowed to exactly `steam_api.dll` and `steam_api64.dll`, then revalidated before manifesting and upload.
- `check:first-run-retention` passed four deterministic keyboard/controller, timeout, returning-run, and experiment-isolation scenarios.
- `check:run-contracts`, `check:first-30-polish`, `check:retention-presentation`, `check:late-game-experiment`, `check:controller-flow`, `check:i18n`, and `check:i18n-ui` passed. The localization UI audit covered all eight supported languages with no console, page, placeholder, or English-leak errors.
- `check:release-line`, `package:steam:win`, Steam package runtime validation, current Electron smoke, packaged keyboard/controller controls, package review, and the narrowed payload manifest passed.
- A direct packaged launch outside Steam could not open the Steam leaderboard because Steam reported `steam_user_not_logged_on`; native module loading, AppID, Steam identity, cloud diagnostics, rendering, and local API all passed. The explicit local-mode packaged smoke then passed. The private Steam install is the authoritative logged-in Steam-context test.
- Packaged performance: 12 samples, minimum 59.52 FPS, average 59.98 FPS, zero warnings and errors.
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24739123)`.

No store metadata, achievements, leaderboard definitions, Steam Cloud configuration, patch notes, forum posts, Git push, or public publication was changed.

Rollback: assign `sector-continue-test` back to BuildID `24737269`. Public/default requires no rollback for this deployment.
