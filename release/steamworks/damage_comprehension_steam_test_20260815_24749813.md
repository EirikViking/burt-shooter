# Damage comprehension private Steam test deployment

- Date: 2026-08-15
- AppID: `4765070`
- Depot: `4765071`
- Source branch: `codex/damage-comprehension-20260815-4d6f`
- Source product commit: `b32316a`
- Release evidence commit before upload: `c76f8e7feb0012c6edb7748ce51dd1c40f0d43de`
- Build stamp: `v2026-08-15_11-22-35`
- Steam BuildID: `24749813`
- Steam depot manifest: `5473479516040756074`
- Assigned branch: `sector-continue-test`
- Previous private BuildID: `24748875`
- Public/default BuildID after upload: `24733684` (unchanged)
- Legacy `test-build` BuildID after upload: `23782673` (unchanged)

## Payload identity

- Payload root: `release/desktop/win-unpacked`
- Payload manifest hash: `e8405d696dc174f6e169a85ce0f3fe70889d28d9c08472439d01d9dc477ffe80`
- `Nova Swarm.exe` SHA-256: `023E349BFCC006D6835696B7BBA527CF97A5DF3A8390D73172E506E71A1045DD`
- SteamPipe mapped 470 files / 1,167,792,047 bytes.
- SteamPipe changed only `Nova Swarm.exe` and `resources/app.asar` relative to its public-manifest baseline.
- The uploaded payload contains no SteamCMD, Steam service binaries, `steam_appid.txt`, VDF, or SDK tools.

## Verification

- SteamCMD completed successfully and returned BuildID `24749813`.
- A fresh authenticated `app_info_update 1` / `app_info_print 4765070` confirmed:
  - `sector-continue-test`: `24749813`
  - `public`: `24733684`
  - `test-build`: `23782673`
  - depot manifest for `sector-continue-test`: `5473479516040756074`
- No public/default promotion, store-page publication, patch-note publication, or other Steamworks setting change was performed.

## Validation summary

- Player life-loss comprehension matrix: pass at 1280x720 and 960x640, normal and Reduced Motion.
- Projectile, contact, and boss-signature impact direction: pass.
- All eight locale UI sweep: pass with no missing, leaking, or overlapping player-facing text in the tested surfaces.
- Controller flow and input-state regression: pass.
- Normal-mode / late-game experiment isolation: pass.
- Browser smoke, current build, full release build, package runtime, Steam SDK readiness, packaged controls, and packaged performance: pass.
- Strict packaged Steam smoke reached the native Steam bridge and Tiny Foundry identity, but leaderboard availability failed because the local Steam client had been logged off with `Session Replaced`. This was reproduced as external client-session state; packaged controls and performance passed unchanged.

## Rollback

Reassign Steam BuildID `24748875` to `sector-continue-test`. Do not alter the public/default branch.
