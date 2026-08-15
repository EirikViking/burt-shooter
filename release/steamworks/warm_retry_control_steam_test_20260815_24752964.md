# Warm retry control private Steam test deployment

- Date: 2026-08-15
- AppID: `4765070`
- Depot: `4765071`
- Source branch: `codex/first-pilot-cue-20260815-e27a`
- Source product commit: `c7b85e05d7133e849c09db992b6b10aa153ad329`
- Validation-harness commit: `35f2b7b1833ecb9a4e12049a91b1038de9e64b6c`
- Source baseline: `5f0d0ecee4fb0280b6c1154254d5a0361e7d7871`
- Build stamp: `v2026-08-15_17-31-22`
- Steam BuildID: `24752964`
- Steam depot manifest: `6099644689361603967`
- Assigned branch: `sector-continue-test`
- Previous private BuildID: `24751372`
- Public/default BuildID after upload: `24733684` (unchanged)
- Legacy `test-build` BuildID after upload: `23782673` (unchanged)

## Included product change

- `ONE MORE RUN` now returns an already-loaded ship to control through a focused 420 ms arrival instead of replaying the longer returning-pilot intro.
- The ship's exact texture is required before the arrival begins. While it is pending, the hull is hidden and movement, firing, action watchers, and onboarding cannot advance.
- Player agency changes explicitly from pending to active to complete, and becomes available exactly once after the arrival completes.
- Gameplay-clock semantics are unchanged. A deliberately delayed texture still uses the safe full-duration arrival after the exact hull is ready.
- ChatGPT Pro approved the implementation boundary, exact source captures, and the packaged warm-run measurement boundary.

## Payload identity

- Payload root: `release/desktop/win-unpacked`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Payload manifest hash: `cd65daafcc6bb77dce1c855d100063ae4a9c003337b5cbb5f113ac913c2c267e`
- Payload files: `410`
- Payload bytes: `1167795062`
- `Nova Swarm.exe` SHA-256: `9c8b253d4697dd40ca42d6e7dc0e737bd3d99393ef5734ab3b11be7c1d71ad42`
- The payload contains the required native Steam API DLLs only. It contains no SteamCMD, Steam service binaries, `steam_appid.txt`, Steam client DLLs, VDF, or loose SDK tools.

## Validation

- Source runback lifecycle: pass for cached warm retry and a deliberate 900 ms uncached fallback; zero pre-complete movement, firing, action-watcher, or onboarding leaks; exact hull verified; no intermediate Menu or Hangar scene.
- Packaged runback matrix: pass for first-flight and ordinary results with keyboard, mouse, and controller. Control-ready timings were 497-641 ms against a 750 ms budget; all movement and firing began at or after arrival completion; no console or page errors.
- First-run retention: pass, six scenarios.
- Controller-only flow: pass.
- Retention presentation, localization source checks, full build, release line, Steam SDK readiness, native-runtime staging, and package-runtime checks: pass.
- All-language UI sweep: pass in all eight locales with zero console errors, page errors, placeholders, or English leaks.
- Explicit local packaged smoke: pass.
- Strict packaged Steam smoke loaded the native bridge and Tiny Foundry identity, but the leaderboard was unavailable because the standalone executable reported `steam_user_not_logged_on`. This is the same external Steam-client session limitation documented for the preceding private build; it is reported as a strict-smoke failure, not a pass.
- Packaged performance: the first run had one isolated 6.7 FPS sample at 11 seconds while every other sample was 59-61 FPS. The unchanged immediate repeat passed with 59.99 average FPS, 59.17 minimum FPS, zero warnings, and zero errors.
- The wrapper around Electron packaging reached its 15-minute watchdog while Electron was still copying the package. The Electron child completed and exited; native staging, package integrity, packaged launch, timing, and performance checks then validated the resulting payload.

## Steam verification

- SteamCMD completed successfully and returned BuildID `24752964`.
- A fresh authenticated `app_info_update 1` / `app_info_print 4765070` confirmed:
  - `sector-continue-test`: BuildID `24752964`, manifest `6099644689361603967`
  - `public`: BuildID `24733684`, manifest `8364117419507757365`
  - `test-build`: BuildID `23782673`, manifest `2965226270349795820`
- No public/default promotion, store-page publication, patch-note publication, or other Steamworks setting change was performed.

## Rollback

Reassign Steam BuildID `24751372` to `sector-continue-test`. Do not alter the public/default branch.
