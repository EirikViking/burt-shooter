# Nova Swarm private Steam test deployment — BuildID 24757559

## Result

- Uploaded at 2026-08-16 03:45 Europe/Oslo through the cached `gaunziman` SteamCMD session.
- Assigned only to `sector-continue-test` through the inspected VDF `SetLive` field.
- Steam BuildID: `24757559`.
- Depot: `4765071`.
- Depot manifest: `5278413703888807212`.
- Description: `First-run HUD clarity + Tyrian candidate 3f66c99 v2026-08-16_03-26-07`.
- Previous `sector-continue-test` BuildID: `24754491`.
- Public/default remained BuildID `24733684`.
- `test-build` remained BuildID `23782673`.

## Source and package

- Worktree: `D:\vibe-coding-e\nova-swarm-first-run-hud-20260816-b19f`.
- Branch: `codex/first-run-hud-20260816-b19f`.
- Source HEAD: `3f66c992be1b4e99e1328696a2c8122189a88c4d`.
- Integrated candidate baseline: `de70b1c6d32a3797a9a4bb9acb3233a253903c30`.
- Build stamp: `v2026-08-16_03-26-07`.
- `Nova Swarm.exe`: 226,698,752 bytes; SHA-256 `E04BF47724E9E66CF413F498AB9EF0ABA789ADAA572E3500E93EBEE4A0A19856`.
- `resources/app.asar`: 769,320,652 bytes; SHA-256 `74DC1C2CAAC806FD2B5217AFB678A5F318EBD9B55E18963976289466C609D6DF`.
- Payload manifest: 410 files, 1,167,799,900 bytes; SHA-256 `4A19C4666258E647843D99C03DBF2E4087287EEF670790824A350F871FDB69A3`.
- Upload VDF SHA-256: `DCB361389EC866D0137AD7E2F0FB4C0E0D0D3A6056C0ED38FDE35F78709C21EE`.

## Required gates

- ChatGPT Pro exact production-image review: `APPROVED 100%`.
- `npm run check:first-run-retention`: PASS, 7 scenarios including action/fallback restoration, keyboard/controller, returning parity, Reduced Motion, and all eight locales at 1920/1280/960.
- Production HUD disclosure visual audit: PASS, 8 exact captures, zero page errors, no runtime mock.
- `npm run check:i18n`: PASS.
- `npm run check:i18n-ui`: PASS, all eight locales with zero console/page/placeholder/English-leak findings.
- `npm run check:controller-flow`: PASS.
- `npm run smoke`: PASS.
- `npm run desktop:smoke:current`: PASS with live Steam bridge ready after the isolated SDK junction was configured.
- `npm run build`: PASS, 900 modules; inherited Vite chunk-size warning only.
- `npm run check:release-line`: PASS.
- `npm run package:steam:win:current`: PASS.
- `npm run desktop:smoke:packaged`: PASS.
- `npm run desktop:perf:packaged`: PASS, minimum 59.52 FPS, average 59.85 FPS, no warnings or errors.
- `npm run check:packaged-steam-runtime-gate`: PASS.
- `npm run steamworks:payload-manifest`: PASS.
- SteamCMD: `Successfully finished AppID 4765070 build (BuildID 24757559)`.

## Live verification and rollback

Authenticated Steamworks build history was refreshed after upload and showed:

- `sector-continue-test` → `24757559`, manifest `5278413703888807212`.
- `default` → `24733684`, unchanged.
- `test-build` → `23782673`, unchanged.

Rollback: reassign BuildID `24754491` to `sector-continue-test`. Do not alter public/default.

No Steamworks settings, store content, achievements, leaderboard definitions, Cloud definitions, forum posts, public/default assignment, or publication state changed.
