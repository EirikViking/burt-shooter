# First-flight UX private Steam test deployment

- Date: 2026-08-15
- AppID: `4765070`
- Depot: `4765071`
- Source branch: `codex/first-pilot-cue-20260815-e27a`
- Source product commit: `03c0b841d707ede1c6126b0568a63444d99c25e5`
- Source baseline: `5f0d0ecee4fb0280b6c1154254d5a0361e7d7871`
- Build stamp: `v2026-08-15_14-51-18`
- Steam BuildID: `24751372`
- Steam depot manifest: `574045867723650974`
- Assigned branch: `sector-continue-test`
- Previous private BuildID: `24749813`
- Public/default BuildID after upload: `24733684` (unchanged)
- Legacy `test-build` BuildID after upload: `23782673` (unchanged)

## Included product changes

- Critical bundled UI fonts now settle before the game constructs its PIXI menu text. Font failure or timeout pins one stable fallback for the whole session instead of allowing a late font swap to corrupt labels.
- The in-run Rival Target panel is presentation-suppressed only during the canonical first flight. Rival computation, leaderboard reads, scoring, saves, achievements, and Steam payloads remain active and unchanged; the existing panel returns on run two.
- Both visual changes received final ChatGPT Pro approval against exact current-build captures.

## Payload identity

- Payload root: `release/desktop/win-unpacked`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Payload manifest hash: `545f06cb9867898a7431f7a106cc3612a2ec4a3018355bfcd9d6db9c4ead55f4`
- Payload files: `410`
- Payload bytes: `1167793536`
- `Nova Swarm.exe` SHA-256: `BCF683DD3FE6942877C15CF08A505D1B6224CC34D702886326D9BC37BAD2E3CC`
- The payload contains only the required Steam runtime API DLLs at the package root and in the unpacked native-runtime directory. It contains no SteamCMD, Steam service binaries, `steam_appid.txt`, Steam client DLLs, VDF, or SDK tools.

## Validation

- Critical-font cold-start matrix: pass for delayed success, timeout, explicit failure, all eight locales, 1280x720, and 960x640.
- First-flight Rival Target matrix: pass at score 0 and 100, after onboarding, after life loss, first Game Over, and run two; all eight locales; keyboard and controller; 1280x720 and 960x640.
- First-run retention: pass, six scenarios.
- Menu overlap audit: pass across 13 menu states at 1920x1080, 1280x720, and 960x640.
- All-language UI sweep: pass in all eight locales with no console errors, page errors, placeholders, or English leaks.
- Controller-only flow and browser smoke: pass.
- Full build and release-line checks: pass; 900 modules.
- Steam package runtime and narrow SDK-content checks: pass.
- Packaged launch/menu and packaged keyboard/controller checks: pass.
- Packaged 60-second performance: 59.99 average FPS, 59.52 minimum FPS, zero warnings, zero errors.
- Strict packaged Steam smoke loaded the native bridge and Tiny Foundry identity but could not make the leaderboard ready because the local Steam desktop client had been logged off by Valve with `Session Replaced` at 09:40. The same external session state reproduced twice; the repository's explicit local packaged-smoke mode passed on the canonical package.

## Steam verification

- SteamCMD completed successfully and returned BuildID `24751372`.
- A fresh authenticated `app_info_update 1` / `app_info_print 4765070` confirmed:
  - `sector-continue-test`: BuildID `24751372`, manifest `574045867723650974`
  - `public`: BuildID `24733684`, manifest `8364117419507757365`
  - `test-build`: BuildID `23782673`, manifest `2965226270349795820`
- No public/default promotion, store-page publication, patch-note publication, or other Steamworks setting change was performed.

## Rollback

Reassign Steam BuildID `24749813` to `sector-continue-test`. Do not alter the public/default branch.
