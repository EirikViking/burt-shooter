# Nova Swarm Bomb direction Steam upload

Date: 2026-07-19

Source folder: `C:\tmp\nova-swarm-post-stable-development-20260718`

Branch: `codex/bomb-direction-fix-20260719`

Locked stable baseline: `ae1d2e82accf20859da172f636907a11c965cf3d`

Development baseline: `8fb58eaf7784dbc2685f01f4296bfc7e6ae88f42`

Source commit: `664f5dbfc59758cb7d95ccbd67335e7ef97bd0a6`

Package version: `v2026-07-19_11-12-29`

Package folder: `E:\Codex\nova-swarm-steam-package-bomb-direction-20260719\desktop\win-unpacked`

Packaged executable SHA-256: `B57CAFDC9E0AE75A9DB03B5C53810DE8DED0CC92B0DC8B669CAF5D691FEACE33`

Payload manifest SHA-256: `3b0e551bf00844dadde40c02adff6601fd841a8d3d81d299389d0109428e372f`

Steam AppID: `4765070`

Windows depot: `4765071`

Steam BuildID: `24281734`

Steam branch assignment: none

VDF `SetLive`: `""`

Upload description: `Nova Swarm Bomb direction fix v2026-07-19_11-12-29`

SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24281734).`

Upload log: `test-results/steam-upload-bomb-direction-20260719/steamcmd.stdout.log`

The upload did not move a Steam branch, call SetLive, change Steamworks settings, alter leaderboard or achievement data, change Steam Cloud paths, or modify production data.

## Fix

Bomb targeting already selected only valid enemies above the player, but the projectile received positive vertical velocity. Nova Swarm uses positive Y for downward movement, so the Bomb traveled away from its selected target. The fix reverses only that velocity sign so the projectile travels upward as designed.

Bomb charge count, fresh-press firing rule, target eligibility, projectile speed, damage, blast radius, score opportunity, HUD behavior, and persistence remain unchanged.

## Exact-package verification

- `npm run check:release-line` passed.
- `npm run check:powerup-effects` passed all 44 powerup types, including real Bomb travel and detonation.
- `npm run check:player-projectile-readability` passed.
- `npm run check:bomb-charge-indicator-readability` passed.
- `npm run check:powerup-hud-affordances` passed.
- `npm run check:gameplay-followups` passed.
- `npm run check:projectile-lifecycle` passed.
- `npm run check:i18n` passed.
- `npm run build:current` passed.
- `npm run check:i18n-ui` passed for all eight supported locales.
- `npm run check:steam-electron-bridge` passed.
- `npm run check:controller-flow` passed.
- `npm run smoke` passed.
- `npm run desktop:smoke:current` passed against `v2026-07-19_11-12-29`.
- `npm run check:steam-package-runtime` passed.
- `npm run desktop:smoke:packaged` passed.
- `npm run desktop:controls:packaged` passed.
- `npm run desktop:perf:packaged` passed at 60.0 minimum and average FPS across 11 samples.
- `npm run check:fresh-profile-steam-isolation` passed.
- `npm run check:desktop-package` passed.
- The payload manifest contains 417 files and 958,420,502 bytes.
