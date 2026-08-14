# Steam test deployment evidence — BuildID 24744996

- AppID: `4765070`
- Depot: `4765071`
- Depot manifest: `3321151417592180065`
- Live branch: `sector-continue-test`
- Previous test-branch BuildID: `24742019`
- Public/default BuildID after deployment: `24733684` (unchanged)
- Legacy `test-build` BuildID after deployment: `23782673` (unchanged)
- Source branch: `codex/unbounded-career-rank-20260814-7f3a`
- Source commit packaged: `d48534266f3ff50e2b65330df8687d9616649ed6`
- Verified baseline: `d453bdb06ea4f0269f1be874dc892a6878cb31d4`
- Build stamp: `v2026-08-15_01-34-48`
- Steam description: `Settings clearance and recent improvements d485342 v2026-08-15_01-34-48`

## Payload identity

- Files: `410`
- Bytes: `1,178,135,271`
- Payload manifest hash: `1f23456ccdde7afdab1b6fc1571d5c139ef30ee5bcc4ddd44f868207578098ec`
- Executable SHA-256: `a3583026900d96a9f44a35f9e390d272f89b7abed018855c5cc78f99e6b3e4d0`
- Executable bytes: `226,698,752`

The packaged payload contains only the required Steam API runtime DLLs. SteamCMD, Steam service/client tools, and the full SDK were not staged in the depot.

## Validation

- `npm run check:i18n` — passed.
- `npm run check:late-game-experiment` — passed; experimental gameplay behavior unchanged.
- `npm run check:chatter-frequency` — passed.
- `npm run build:current` — passed.
- `npm run check:i18n-ui` — passed in all eight supported languages with no console, page, placeholder, or English-leak errors.
- Strict Settings clearance matrix — passed at UI scale 2 in all eight languages at 1920x1080, 1280x720, and 960x640 (96 captures).
- Whole-menu overlap audit — passed for 13 menu states at the same three viewports and maximum UI scale.
- `npm run build` — passed; 899 modules.
- `npm run check:release-line` — passed before packaging and upload.
- `npm run package:steam:win:current` — passed.
- Packaged local smoke — passed. Direct launch outside Steam correctly reported `steam_user_not_logged_on`; Steam native module, AppID, Cloud identity, local API, and rendering were valid.
- Packaged controls smoke — passed.
- Packaged performance smoke — passed: minimum 59.5238 FPS, average 59.9528 FPS, 11 samples, zero warnings/errors.
- ChatGPT Pro visual review — `SETTINGS CLEARANCE IMPLEMENTATION APPROVED`.
- SteamCMD upload — exited 0 and reported `Successfully finished AppID 4765070 build (BuildID 24744996)`.
- Authenticated Steamworks build-history verification — BuildID `24744996` set live only on `sector-continue-test`; public/default and `test-build` unchanged.

## Rollback

If the private test build must be rolled back, assign BuildID `24742019` to `sector-continue-test`. Do not change public/default.
