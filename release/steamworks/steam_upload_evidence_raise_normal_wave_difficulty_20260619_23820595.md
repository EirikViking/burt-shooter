# Steam Upload Evidence - Raise Normal Wave Difficulty - 2026-06-19

## Source

- Branch: `codex/raise-normal-wave-difficulty-20260619`
- Starting commit: `8b381fac3bcee96ce47b00fb6bdf8aab848c3edc`
- Source commit: `a2d5a0c0eadeea4d3da2e3f4d10d733987ad8eb8`
- Packaged smoke gitSha: `a2d5a0c`
- Build version: `v2026-06-19_13-26-09`
- Pre-run snapshot: `snap/pre-raise-normal-wave-difficulty-20260619-20260619-124907`

## Balance Change

- Normal waves apply `normalWaveDifficultyLevelOffset: 9`.
- New Sector 1 normal waves map to old Sector 10 normal-wave difficulty.
- New Sector 2 maps to old Sector 11, Sector 5 maps to old Sector 14, and the late curve keeps the same shape.
- Boss sectors and boss metrics are unchanged. Targeted boss metric hash: `8a39603efe2e2bf49c421a2b4e419623d0b4842876d9261db18066449a49010d`.

## Package Verification

- `npm run package:steam:win`: passed from clean source after restoring unrelated achievement drift.
- `npm run package:steam:win:current`: passed.
- `npm run desktop:smoke:packaged`: passed, report `test-results/packaged-exe-smoke-2026-06-19T11-30-26-486Z/report.json`.
- `npm run desktop:smoke:current`: passed, report `test-results/electron-smoke-2026-06-19T11-31-10-995Z`.
- `npm run desktop:perf:current`: passed, average/min FPS 60, report `test-results/electron-perf-smoke-2026-06-19T11-31-20-737Z`.
- `npm run smoke`: passed, report `test-results/smoke-2026-06-19T11-32-34-103Z/report.json`.
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
  - files: 336
  - bytes: 879495058
  - manifestHash: `a421f2c9d2984e220cc98b2718393297c2811509b679e329d16848d5c402880b`
  - executable SHA-256: `0f769ec630a5d0fee02b4be6382a57384b122b7ff5d931e8d7b3512482db2890`

## VDF Inspection

- VDF: `release/steamworks/app_build_LOCAL.vdf`
- AppID: `4765070`
- DepotID: `4765071`
- ContentRoot: `..\\desktop\\win-unpacked`
- `SetLive` was exactly blank: `"SetLive" ""`
- No public/default branch assignment.
- No `sector-continue-test` branch assignment.
- No Steam branch assignment was made.

## Steam Upload

- SteamCMD path: `D:\vibe-coding-e\burt-shooter\tools\steamcmd\steamcmd.exe`
- Account: `gaunziman` cached credentials
- Command used: `+login gaunziman +run_app_build D:\vibe-coding-e\nova-swarm-sector-continue-prototype\release\steamworks\app_build_LOCAL.vdf +quit`
- Result: success
- Steam BuildID: `23820595`
- Depot manifest: `4782007101365519360`
- Baseline manifest: `2093552943102439710`
- Upload summary: 0 files added, 2 files changed, 0 files removed.

## Checks Run

- `git diff --check`
- `npm run check:normal-wave-difficulty-shift`
- `npm run check:i18n`
- `npm run check:i18n-ui`
- `npm run check:sector-challenge-selector`
- `npm run check:controller-flow`
- `npm run check:steam-electron-bridge`
- `npm run check:powerup-assets`
- `npm run check:powerup-visuals`
- `npm run check:codex-layout`
- `npm run check:threat-codex`
- `npm run build:current`
- `npm run package:steam:win`
- `npm run package:steam:win:current`
- `npm run desktop:smoke:packaged`
- `npm run desktop:smoke:current`
- `npm run desktop:perf:current`
- `npm run smoke`

## Manual Test Advice

In Steamworks, manually assign BuildID `23820595` to the intended private test branch. Do not use SetLive/default/public assignment. Then launch from Steam, start a fresh Launch Run, and compare Sector 1 normal waves against the previous Sector 10 feel while confirming the first boss behavior remains unchanged.

Rollback source:

```bash
git revert a2d5a0c0eadeea4d3da2e3f4d10d733987ad8eb8
```
