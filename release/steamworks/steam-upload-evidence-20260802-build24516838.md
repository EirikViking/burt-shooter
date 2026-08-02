# Nova Swarm Eirik rank-up scale hotfix Steam upload

- Uploaded: 2026-08-02 10:05 Europe/Oslo
- Steam AppID: `4765070`
- Windows depot: `4765071`
- Steam BuildID: `24516838`
- Tested and packaged source: `963496558edce19e4c90278ce325a3412d5cf0c7`
- Gameplay hotfix commit: `1c8fbb6eff378b61a4433b1d7a8bf2f6522ad321`
- Build version: `v2026-08-02_09-39-33`
- Payload manifest hash: `e915f0e4f3998a55214e051c84e9fe9710ecd5da6c41e0e7e50efa452455f5f9`
- Payload: 861 files, 1,362,095,429 bytes
- VDF: `release/steamworks/app_build_LOCAL.vdf` (ignored local file)
- VDF `SetLive`: blank (`"SetLive" ""`)
- Result: uploaded successfully and left unassigned; no Steam branch, public/default assignment, or Steamworks setting was changed.

## Product source

This candidate retains the complete 21-item Tyrian #93/#94 implementation, all subsequent ship-identity art, and the detailed Eirik Viking flagship. The hotfix corrects the live Rank 27 failure where overlapping catch-up rank celebrations multiplied the entire player container scale and could grow Eirik exponentially even though the inner texture-scale guard was valid.

Rank-up celebration now pulses from a fixed 1.18 baseline, never multiplies the current scale, invalidates stale reset timers, and independently repairs unsafe parent-container scale to 1. The automated runtime regression stacks 30 pulses and injects an 8x parent scale before proving the compact 70-80 px combat footprint is restored. Gameplay timing, collision, balance, Hangar showcase size, Viking art, and inscriptions are unchanged.

## Verification

- `git diff --check`
- `npm run build:current`
- `npm run check:tyrian-responsive-ui` (3 layouts, 27 screenshots; 30 stacked rank pulses plus forced 8x parent-scale repair)
- Visual inspection of `test-results/tyrian-responsive-ui-2026-08-02T07-16-29-326Z/standard-16x9-1920x1080/01-wave-hud-compatible-timers.png`
- `npm run check:i18n`
- `npm run check:i18n-ui` (8 languages)
- `npm run check:controller-flow`
- `npm run check:steam-electron-bridge`
- `npm run smoke` (zero console warnings/errors, page errors, bad responses, or scenario failures)
- `npm run desktop:smoke:current`
- `npm run desktop:perf:current` (58.14 minimum, 59.76 average FPS)
- `npm run check:release-line`
- `npm run build`
- `npm run package:steam:win:current`
- `npm run desktop:smoke:packaged`
- `npm run desktop:controls:packaged`
- `npm run desktop:perf:packaged` (60.0 minimum and average FPS)
- `npm run check:packaged-steam-runtime-gate`
- `npm run check:fresh-profile-steam-isolation`
- `npm run steamworks:write-vdf`
- `npm run steamworks:payload-manifest`

The generic develop-web-game client was attempted but its bundled Chromium headless shell is not installed. The repository-native Playwright suite used installed Chrome successfully and supplied the passing runtime regression and screenshots.

## SteamPipe proof and caveat

SteamCMD exited `0` and reported: `Successfully finished AppID 4765070 build (BuildID 24516838).`

The established native-runtime staging script copied the full ignored `steam_sdk` tree into the package. SteamCMD warned that `steam_appid.txt`, `steamservice.exe`, `steamclient.dll`, `steamclient64.dll`, and `steamcmd.exe` should not be included in a depot. This did not fail packaging, packaged runtime verification, or upload. A future packaging-only cleanup should narrow the staged SDK payload to runtime redistributables before any live assignment.

## Provenance and rollback

The isolated branch remains based on authoritative local baseline `55560f4b15c9904a92a2d1077d8fdb8526d63dd3`, whose upstream ancestor is `17b4a0195b9f47648b1ae2f239e59aad9152979d`. Intentional inherited commits `1b0166d` and `55560f4` remain preserved. No existing commit was reset, rebased, rewritten, discarded, or force-pushed.

No Steam branch rollback is required because BuildID `24516838` is unassigned. If it is manually assigned later, restore that branch to its prior desired BuildID in Steamworks. Source rollback is `git revert 963496558edce19e4c90278ce325a3412d5cf0c7` from this isolated branch; do not rewrite inherited history.
