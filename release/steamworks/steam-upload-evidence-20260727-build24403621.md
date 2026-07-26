# Steam upload evidence — BuildID 24403621

Date: 2026-07-27

Source commit: `b8ccd2c458e4ba81405250bdeb7cec59d2a94692`

Build stamp: `v2026-07-27_01-33-54`

## Candidate

- AppID: `4765070`
- Windows depot: `4765071`
- Executable SHA-256: `37a883813bc004680f70030185eadaa1af8c18a19dec014ea650e31b5c301775`
- Payload: 410 files, 1,165,013,499 bytes
- Payload manifest hash: `2f318e999baf09c1a74512bcc0eaf687378e327b4d35a1513a731887f8ce8957`
- VDF `SetLive`: exactly `sector-continue-test`

## Verification

- Release-line, Steam SDK/runtime, strict packaged Steam runtime, fresh-profile isolation, packaged launch, keyboard/controller controls, desktop package review, and payload-manifest checks passed.
- Packaged performance: 58.48 minimum / 60.03 average FPS, 12 samples, no warnings or errors.
- SteamCMD completed successfully with BuildID `24403621`.
- Depot manifest: `1402463280774430983`.

## Branch proof

Pre-upload:

- `public`: `24400692`
- `sector-continue-test`: `24401245`
- `test-build`: `23782673`

Post-upload:

- `public`: `24400692` — unchanged
- `sector-continue-test`: `24403621`
- `test-build`: `23782673` — unchanged

No public/default assignment, store metadata, achievements, patch notes, or other Steamworks setting changed.

Rollback: assign `sector-continue-test` back to BuildID `24401245` in Steamworks.
