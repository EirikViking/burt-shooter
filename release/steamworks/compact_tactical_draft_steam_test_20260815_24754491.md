# Compact Tactical Draft private Steam test deployment

- Date: 2026-08-15
- AppID: `4765070`
- Depot: `4765071`
- Source branch: `codex/first-pilot-cue-20260815-e27a`
- Source HEAD: `8390e8ba6d39b5f22be1342d6b4b2cfb0d504d77`
- Product commit: `5eac02188f9b353e7ee2b5afa9ec82d084cda1ef`
- Source baseline: `5f0d0ecee4fb0280b6c1154254d5a0361e7d7871`
- Build stamp: `v2026-08-15_20-45-29`
- Steam BuildID: `24754491`
- Steam depot manifest: `2030128425257880730`
- Assigned branch: `sector-continue-test`
- Previous private BuildID: `24752964`
- Public/default BuildID after upload: `24733684` (unchanged)
- Legacy `test-build` BuildID after upload: `23782673` (unchanged)

## Included product change

- Compact Tactical Draft cards now render the primary gameplay consequence at 13 px instead of 11 px.
- The redundant compact `PERMANENT THIS RUN` pill is hidden because the Draft subtitle already establishes permanence.
- This removes the measured doctrine/permanence badge collision on all three cards while preserving desktop layout, offered cards, copy, stats, art, focus, full-card hitboxes, controls, tap/hold behavior, RNG, timing, balance, saves, scoring, and progression.
- ChatGPT Pro approved the exact compact-only implementation and final 1280/960/controller/German captures at `APPROVED 100%`.

## Payload identity

- Payload root: `release/desktop/win-unpacked`
- Payload manifest: `release/steamworks/steam_payload_manifest.json`
- Payload manifest hash: `348ea8922e40adf2f0b1c3c0721d9d032cb344f0f0b1b5fcf0066ebf26ae4841`
- Payload files: `410`
- Payload bytes: `1167795168`
- `Nova Swarm.exe` SHA-256: `6da891348e52cebec03eadc90c7cf18f00b7fe8f7f60fb233a19d10dbce18e14`
- VDF SHA-256: `814cc1f6427d1ab050b4cc528c2a07d8c216975e86a222ac5c05fd2200a7a5b8`
- The payload contains only the two required Steam API redistributable DLLs under the SDK-named path. It contains no SteamCMD, Steam service/client binary, `steam_appid.txt`, VDF, or loose SDK tooling.

## Validation

- First Tactical Draft readability audit: pass, 11 scenarios and zero findings at 1920x1080, 1280x720, and 960x640; all eight locales; max UI scale; Reduced Motion; mouse hover; controller focus.
- Baseline audit before the fix found 54 concrete compact-layout findings: three doctrine/permanence badge overlaps and three 11 px primary-effect lines in each compact locale/layout scenario.
- Broad Tactical Draft behavior: pass, including controller hold-to-lock behavior.
- Controller-only flow: pass.
- Localization source and all-language rendered UI: pass in all eight locales with zero console errors, page errors, placeholders, or English leaks.
- Responsive UI: pass, five layouts and 50 screenshots after correcting the test fixture to use logical gameplay coordinates and exempting only fully off-screen entering enemy identity plates.
- Guarded full build, release line, Steam SDK readiness, native-runtime staging, package-runtime integrity, and strict runtime gate: pass.
- Explicit local packaged smoke: pass.
- Strict packaged Steam smoke loaded the native bridge but failed because the standalone executable reported the Steam leaderboard unavailable. This is the same external Steam-client session limitation documented for BuildID `24752964`; it is reported as a failure, not a pass.
- Packaged performance: pass, 12 samples, 59.52 minimum FPS, 60.24 average FPS, zero warnings, and zero errors.
- Post-Draft combat re-entry audit: pass, 11 scenarios, zero milliseconds of confirmation/actionable-hostile overlap.
- First boss clear to first Draft audit: pass, 11 scenarios; no product change recommended because meaningful Rank Up presentation owns the transition and Draft input arms within the established safe gate.

## Steam verification

- SteamCMD completed successfully and returned BuildID `24754491`.
- Fresh authenticated `app_info_update 1` / `app_info_print 4765070` confirmed:
  - `sector-continue-test`: BuildID `24754491`, manifest `2030128425257880730`
  - `public`: BuildID `24733684`, manifest `8364117419507757365`
  - `test-build`: BuildID `23782673`, manifest `2965226270349795820`
- No public/default promotion, store-page publication, patch-note publication, or other Steamworks setting change was performed.

## Rollback

Reassign Steam BuildID `24752964` to `sector-continue-test`. Do not alter the public/default branch.
