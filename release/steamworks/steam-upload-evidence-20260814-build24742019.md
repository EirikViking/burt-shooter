# Nova Swarm Steam test deployment - BuildID 24742019

- Deployment date: 2026-08-14
- Source worktree: `D:\vibe-coding-e\nova-swarm-unbounded-career-rank-20260814-7f3a`
- Source branch: `codex/unbounded-career-rank-20260814-7f3a`
- Product/test commit: `9ad2ac82e56f5f59bb609fb62ca2d2257ac6c906`
- Packaging guard commit: `50863b12a278761b3b7c7b3dd0502bfa5facb46b`
- Baseline commit: `d453bdb06ea4f0269f1be874dc892a6878cb31d4`
- Build stamp: `v2026-08-14_21-20-56`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Assigned branch: `sector-continue-test`
- Steam BuildID: `24742019`
- Depot manifest: `1656496344664056637`

## Branch safety

The inspected upload VDF contained exactly `SetLive "sector-continue-test"`. Fresh authenticated Steamworks build history immediately after upload showed:

- `default`: BuildID `24733684`.
- `sector-continue-test`: BuildID `24742019`.
- `test-build`: BuildID `23782673`.

The new build is assigned only to `sector-continue-test`. Public/default and Steamworks configuration were not changed.

BuildID `24741834` was an earlier private upload of the same game content with an over-broad packaged Steam SDK directory. It was immediately superseded on `sector-continue-test` by this narrowed package and is not assigned to any branch.

## Product scope

- Replaced fragile fixed-offset main-menu briefing layout with sequential placement based on actual rendered bounds.
- Fixed the full `VIEW MODE DETAILS` action label so it remains complete and inside its frame.
- Expanded the automated menu audit to launch its own isolated preview and verify real rendered geometry at UI scale 1 and 2 across main-menu modes, Settings pages, How to Play, Hangar, and responsive layouts.
- Rebuilt the first legitimate ranked-death result as a focused first-flight surface: one score/sector summary, one unlock card, one concise `NEXT TRY` coaching card, a dominant `ONE MORE RUN` action, and three clear secondary actions.
- Added responsive 960x640 handling for first-flight results and achievement presentation.
- Added all new first-flight copy in all eight supported languages.
- Returning-run results, scoring, saves, leaderboards, experiment mode, and public Steam configuration are unchanged.
- Exact 1280x720 and 960x640 screenshots plus the corrected main-menu screenshot were reviewed in the existing internal ChatGPT Pro conversation and received `FIRST-FLIGHT + MENU IMPLEMENTATION APPROVED`.

## Payload and validation

- Files: `410`.
- Bytes: `1,178,134,997`.
- Payload manifest SHA-256: `FF2EF80987395979D688D64A1D319F9E06A1B177F35821E013E6FC8B447D55A5`.
- Executable bytes: `226,698,752`.
- Executable SHA-256: `AD96DC7B770EB89375B423E132CABC7A5CE3DABCDC71453CEC1D97C3513A6512`.
- The packaged Steam SDK contains exactly `steam_api.dll` and `steam_api64.dll`; a new package-time allowlist guard rejects any extra SDK/tool files.
- `check:menu-overlap-audit` passed the complete menu matrix at UI scale 1 and UI scale 2.
- `check:run-contracts` passed first-flight eligibility, 1280x720 and 960x640 viewport containment, text-frame clearance, title/content/action separation, controller/keyboard details access, and returning-run behavior.
- `check:i18n` and `check:i18n-ui` passed all eight supported languages with zero console, page, placeholder, or English-leak errors.
- `check:release-line`, `build:current`, full `build`, Steam package runtime validation, packaged local smoke, packaged keyboard/controller controls, and packaged Steam runtime-gate checks passed.
- Direct packaged smoke outside Steam loaded the native Steam module, AppID, Tiny Foundry identity, Steam Cloud diagnostics, renderer, and local API with zero console events; only the expected out-of-client leaderboard connection was unavailable.
- Packaged performance: 12 samples, minimum 59.17 FPS, average 60.11 FPS, zero warnings and errors.
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24742019)`.

No store metadata, achievements, leaderboard definitions, Steam Cloud configuration, patch notes, forum posts, Git push, or public publication was changed.

Rollback: assign `sector-continue-test` back to BuildID `24739123`. Public/default requires no rollback for this deployment.
