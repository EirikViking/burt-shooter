# Nova Swarm Steam test deployment - BuildID 24737269

- Deployment date: 2026-08-14
- Source worktree: `D:\vibe-coding-e\nova-swarm-unbounded-career-rank-20260814-7f3a`
- Source branch: `codex/unbounded-career-rank-20260814-7f3a`
- Source commit: `1f00fd06cb76047cbf369cd22cb527654f4c81e1`
- Baseline commit: `d453bdb06ea4f0269f1be874dc892a6878cb31d4`
- Build stamp: `v2026-08-14_16-50-08`
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Assigned branch: `sector-continue-test`
- Steam BuildID: `24737269`
- Depot manifest: `3633735942624604593`

## Branch safety

The inspected upload VDF contained exactly `SetLive "sector-continue-test"`. Fresh authenticated Steam app info immediately after upload showed:

- `public`: BuildID `24733684`.
- `sector-continue-test`: BuildID `24737269`.
- `test-build`: BuildID `23782673`.

The new build is assigned only to `sector-continue-test`. No public/default assignment or Steamworks configuration was changed by this deployment.

## Product scope

- Main-menu briefing copy now reserves measured vertical space and drops low-priority detail rows when the available card height cannot preserve readable clearance.
- Top utility controls switch to a centered compact layout when needed, keeping Music, How To Play, and Exit labels inside their frames.
- Main-menu brand, launch deck, and five-button dock remain within the viewport through high UI scales and short supported layouts.
- The Hangar uses a compact information card and one centered action row on constrained layouts, preventing ship narrative, roster, footer, side-panel, and Random-button collisions.
- Settings helper descriptions use measured flow before the next control; the Experimental fixture and start descriptions no longer overlap their buttons.
- The overlap audit now covers fresh and progressed profiles, all 13 main-menu choices, Settings pages, How To Play pages, and Hangar states at 1920x1080, 1280x720, and 960x640 across UI scales 100%, 125%, 150%, 175%, and 200%.
- Endless Career Rank from the preceding approved work remains included; authored unlocks and gameplay rewards remain capped while status Rank continues indefinitely.
- The completed visual implementation was reviewed in the existing internal ChatGPT Pro conversation and received `FINAL VISUAL APPROVED`.

## Payload and validation

- Files: `410`.
- Bytes: `1,178,112,561`.
- Payload manifest SHA-256: `4473338c1fde7242f9bacb7e769bb802e3aeba0e236b2347a8df2f63babd065c`.
- Executable SHA-256: `340266A4C5BE0868085865E7394BE9181E7E0E1A2F7A299BCAAFAD6431180C4B`.
- The packaged Steam SDK was narrowed to exactly `steam_api.dll` and `steam_api64.dll` before manifesting and upload, then the narrowed package was revalidated.
- `check:menu-overlap-audit` passed all 15 viewport/UI-scale combinations with zero page errors.
- `check:i18n`, `build:current`, `check:i18n-ui`, `check:controller-flow`, `check:ui-readability`, menu layout checks, Hangar regression checks, leaderboard Top-50/visual/provider checks, source smoke, and desktop smoke passed.
- `check:release-line`, `package:steam:win`, `check:packaged-steam-runtime-gate`, packaged executable smoke, packaged keyboard/controller controls, package review, and narrowed Steam runtime validation passed.
- Packaged performance: 12 samples, minimum 59.52 FPS, average 60.01 FPS, zero warnings and errors.
- The packaged executable reported build `v2026-08-14_16-50-08`, source `1f00fd0`, Steam bridge ready, native module loaded, and AppID `4765070`.
- SteamCMD upload: `Successfully finished AppID 4765070 build (BuildID 24737269)`.

No store metadata, achievements, leaderboard definitions, Steam Cloud configuration, patch notes, forum posts, Git push, or public publication was changed.

Rollback: assign `sector-continue-test` back to BuildID `24733684`. Public/default requires no rollback for this deployment.
