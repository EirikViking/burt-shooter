# Tyrian Overrun records and roadmap Steam test

- Source branch: `codex/tyrian-feedback-program-20260724`
- Tested source commit: `9a7f676534b92eaea13f357bd88c195faa3edd67`
- Product commits:
  - `94308b9` — Add Overrun personal records and fix launch life
  - `9a7f676` — Clarify Overrun menu and extend sector roadmap
- Packaged version: `v2026-07-25_08-16-40`
- Package files: `410`
- Package bytes: `1,058,811,641`
- Payload manifest SHA-256: `d3e6c63976fca260fafa7287ec683c4547a130612ee4380edd2951842c85b46e`
- Executable SHA-256: `e2e40911b15e127a4f47692613f65dfdb147786ec4b869008dcdf1891abfcb64`
- Steam AppID / DepotID: `4765070` / `4765071`
- Uploaded BuildID: `24386654`
- Assigned branch: `sector-continue-test`
- Previous private rollback BuildID: `24383575`
- Post-upload branch verification:
  - `sector-continue-test`: `24386654`
  - `public`: `24339078` (unchanged by this upload)
  - `test-build`: `23782673` (unchanged)
- Steamworks store data, achievements, public/default branch, patch notes, and release visibility were not changed.

## Gates

- `check:overrun-mode`
- `check:steam-cloud-save`
- `check:sector-challenge-selector`
- `check:run-modes`
- `check:tactical-draft`
- `check:overrun-confirmation`
- `check:run-contract-mode-eligibility`
- `check:controller-flow`
- `check:i18n`
- `build:current`
- `check:i18n-ui` (all eight languages)
- `check:release-line`
- `package:steam:win`
- `check:packaged-steam-runtime-gate`
- `desktop:smoke:packaged`
- `desktop:controls:packaged`
- `desktop:perf:packaged` (`60.0` minimum and average FPS)
- `desktop:smoke:current`
- `check:desktop-package`
