# Steam test deployment evidence — BuildID 24747407

- AppID: `4765070`
- Depot: `4765071`
- Live branch: `sector-continue-test`
- Previous test-branch BuildID: `24746560`
- Public/default BuildID after deployment: `24733684` (unchanged)
- Legacy `test-build` BuildID after deployment: `23782673` (unchanged)
- Source branch: `codex/unbounded-career-rank-20260814-7f3a`
- Source commit packaged: `8a2fda8061e72f6930c2607cb3c4e8c532598825`
- Build stamp: `v2026-08-15_05-42-49`
- Steam description: `Overrun first-pressure tempo floor 8a2fda8 v2026-08-15_05-42-49`

## Payload identity

- Files: `410`
- Bytes: `1,178,142,267`
- Payload manifest hash: `e8929b2f6d50c5e0430ccd21a0ad3d3a8ebbc08101340dd24f0f781223dbcffa`
- Executable SHA-256: `5584198af59c527eee03279b6a2039447299d5985c5a9abe7bcb51e2998a3a9c`
- Executable bytes: `226,698,752`
- Forbidden Steam tools/files found: `0`

The packaged payload contains only the required Steam API runtime DLLs. SteamCMD, Steam service/client tools, `steam_appid.txt`, and the full SDK toolset were not staged in the depot.

## Product behavior

- Overrun Pure and Overrun Tactical now begin at the existing first-pressure routine tempo: fire chance `1.15`, projectile speed `1.06`, and enemy speed `1.04`.
- The floor applies only for the first 300 seconds of active gameplay time and meets the existing production curve exactly at 300 seconds.
- Score, elite, special-threat, sustain, content-rarity, spawn, wave, boss, reward, career, and leaderboard rules are unchanged.
- Mayhem, Daily, Scout, Sector Run, Practice, Sectors 1–50, and the late-game experiment are unchanged.
- This payload includes all earlier work already present in BuildID `24746560`, including the overlap-safe menu and Settings layouts, contextual first-run Phase/Focus teaching, and unbounded cosmetic Career Rank progression.

## Design review

- ChatGPT Pro approved the exact design boundary before implementation.
- ChatGPT Pro reviewed the exact implementation and evidence after the production build and replied `APPROVED`.

## Validation

- `npm run check:overrun-opening-tempo` — passed both Overrun variants, six isolated modes, 11 boundary times, canonical identity, experiment bypass, RNG identity, held active-time clocks, exact 300-second handoff, and diagnostic parity.
- `npm run check:overrun-mode` — passed Career XP, personal record, reward, and competitive-state protection.
- `npm run check:overrun-reinforcements` — passed.
- `npm run check:overrun-clear-score-runtime` — passed.
- `npm run check:run-pacing` — passed.
- `npm run check:difficulty-tuning` — passed.
- `npm run check:mayhem-scout-difficulty-delta` — passed.
- `npm run check:high-sector-escalation` — passed with the experimental system disabled by default.
- `node scripts/check-late-game-start-pressure-equivalence.mjs` — passed.
- `npm run check:late-game-experiment` — passed.
- `npm run check:input-state-transitions` — passed.
- `npm run check:runtime-persistence` — passed.
- `npm run check:run-contract-mode-eligibility` — passed.
- `npm run check:steam-cloud-save` — passed.
- `npm run build:current` — passed all prebuild guards and built 899 modules.
- `npm run check:release-line` — passed before packaging and upload.
- `npm run smoke` — passed menu, Settings, desktop, controller, pause, Game Over, mobile, wave, and boss coverage.
- `npm run desktop:smoke:current` — passed.
- `npm run package:steam:win` — passed full release-line, SDK, build, Electron package, native-runtime staging, and package-runtime checks.
- Strict standalone packaged Steam smoke reached a ready menu with the native module loaded, but the live leaderboard gate correctly failed with `steam_user_not_logged_on` because the EXE was not launched by Steam.
- Explicit local packaged smoke — passed rendering, local API, and ready-menu state.
- `npm run desktop:controls:packaged` — passed.
- `npm run desktop:perf:packaged` — passed: minimum `59.5238` FPS, average `60.0623` FPS, 11 samples, zero warnings/errors.
- SteamCMD upload — exited 0 and reported `Successfully finished AppID 4765070 build (BuildID 24747407)`.
- Authenticated Steam app-info verification — `sector-continue-test=24747407`, `public=24733684`, and `test-build=23782673`.

## Known unrelated harness issue

`npm run check:run-modes` still expects the removed main-menu Pilot Orders board to be visible for a fresh web-preview profile. The current product intentionally hides that board. None of the Overrun tempo files touch the menu, and the stale assertion was not used to reverse the approved menu design.

## Rollback

If the private test build must be rolled back, assign BuildID `24746560` to `sector-continue-test`. Do not change public/default.
