# Nova Swarm Cabinet Wonders and Codex Steam test upload

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `b0080c24c0fad15e1e451cb577db4640e4297afc`
- Verified baseline ancestor: `41f9f0ed0bf2e57c3c55e762b9532f90d6511a0f`
- Packaged version: `v2026-07-25_18-30-20`
- Payload files: `410`
- Payload bytes: `1,155,958,954`
- Payload content hash: `089b581ef9fe829eca75929c3e8f692fb60cfd5adc880a5540ea224297682271`
- Payload manifest file SHA-256: `bdc638839581ba98cf2a7d901d5bbe10329be287187715312c4709bd5126bb91`
- Executable SHA-256: `95b64cae4b1a90f488113ce7f9d08e86a57037ff3fda31236af75541f8b9836f`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24390949`
- Depot manifest: `2951353221249853480`
- Assigned branch: `sector-continue-test`
- Previous test-branch rollback BuildID: `24389020`
- Post-upload branch verification:
  - `sector-continue-test`: `24390949`
  - `public`: `24389020`
  - `test-build`: `23782673`
- Steamworks store data, achievements, public/default branch, published patch notes, and release visibility were not changed.

## Included changes

- Fifty new Cabinet Wonders expand the collection from 10 to 60, each with original generated art and a distinct identity.
- Wonders can appear at a safe transition every third sector and avoid the 12 most recently seen variants.
- Every discovered Wonder is archived in a persistent Threat Codex category with original English history, field notes, discovery state, completion counts, and Steam Cloud merging.
- Non-English locales receive localized safe summaries and tips without silently falling back to the English long-form stories.
- Run Report Combat metrics use a clearer two-column layout with larger labels and values.
- The twelve-category Codex tab row retains positive label/count/divider clearance at supported viewports.

## Verification

- `check:cabinet-wonders`
- `check:cabinet-wonders-runtime`
- `check:threat-codex`
- `check:codex-lore-layout`
- `check:codex-tab-count-layout`
- `check:run-report`
- `check:steam-cloud-save`
- `check:i18n`
- `check:i18n-ui` for all eight supported languages
- `check:controller-flow`
- `check:steam-electron-bridge`
- `check:release-line`
- `check:boss-warning-popup`
- `check:debug-tools`
- `package:steam:win`
- `check:steam-package-runtime`
- `check:packaged-steam-runtime-gate`
- `desktop:smoke:packaged` in explicit local mode
- `desktop:controls:packaged`
- `desktop:perf:packaged` (`60.6` minimum and average FPS)
- `desktop:smoke:current`
- `check:desktop-package` in explicit local mode
- payload manifest and VDF scope verification

The broad browser smoke encountered different late wait timeouts on two runs under accumulated browser-test load. Its second run passed the first timed-out level transition, and the unchanged focused debug/level and boss-gate runtime checks passed. No assertion was removed, weakened, or masked.

## Upload proof

- SteamCMD: `[2026-07-25 19:01:14]: Successfully finished AppID 4765070 build (BuildID 24390949).`
- Depot: `[2026-07-25 19:01:13]: Success! New manifestID 2951353221249853480 created and 118 new chunks uploaded.`
- VDF `SetLive`: exactly `sector-continue-test`
