# Nova Swarm Cabinet Wonders spectacle Steam upload

Date: 2026-07-20

Source folder: `C:\tmp\nova-swarm-cabinet-wonders-20260720`

Branch: `codex/cabinet-wonders-spectacle-20260720`

Locked stable ancestor: `ae1d2e82accf20859da172f636907a11c965cf3d`

Latest published-build evidence baseline: `44c43af566ebeb75c0c64720f15713bc362cb4d9`

Packaged source commit: `3686bf634813bcbfcf29634c094bc81eaaed8191`

Pre-upload package evidence commit: `8b13f592fdd6c931c2dab8fd98314114ed602619`

Package version: `v2026-07-20_14-43-17`

Package folder: `E:\Codex\nova-swarm-steam-package-cabinet-wonders-20260720\desktop\win-unpacked`

Payload files: `417`

Payload bytes: `958436871`

Payload manifest hash: `2c392c22dff9a43ce6a18d6344b4051945384c405c798da58cc27f49f843ccd5`

Packaged executable SHA-256: `9b23b32d8657acd2dbab88ca4eb11af966040d32aba94f74614b6ef771cac2be`

Steam AppID: `4765070`

Windows depot: `4765071`

Steam BuildID: `24295917`

Depot manifest: `932713604018215419`

Steam branch assignment: none

VDF `SetLive`: `""`

Upload description: `Nova Swarm Cabinet Wonders v2026-07-20_14-43-17`

SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24295917).`

Upload log: `test-results/steam-upload-cabinet-wonders-20260720/steamcmd.stdout.log`

## Changes

- Cabinet Wonders expand from three to ten with Singularity Bloom, Celestial Koi Procession, Prismatic Supernova, Warp Cathedral, Quantum Eclipse, Nebula Jellyfish, and Phoenix Comet.
- All ten Wonders gain a restrained drifting star field. Ghost Fleet Salute gains a fleet halo, and Starwhale Constellation gains luminous breath trails.
- Wonder presentation now uses the actual gameplay coordinate space, so the spectacles are centered and correctly scaled at every supported window size instead of being compressed toward the upper-left.
- Full-motion Wonders hold for 2.3 seconds with variant-specific procedural animation and pitch. Reduced Motion uses a calmer 1.4-second path.
- Existing safe-transition eligibility, deterministic selection, rarity curve, one-per-run limit, score neutrality, gameplay neutrality, challenge-flight exclusions, and background/HUD layering are unchanged.
- No external art or music asset was added. The ten variants use the existing procedural mysterious accent with distinct pitch identities, preserving the selected soundtrack and existing audio controls.

No player-facing text or localization changed. Score formulas, leaderboard identities and stored scores, achievement IDs and unlock requirements, save format, Steam Cloud paths, AppID and depot IDs, Steam screenshot/Game Recording capture, and Steamworks settings remain unchanged.

## Verification

- `npm run check:cabinet-wonders` passed ten unique deterministic variants, bounded rarity, gameplay RNG isolation, safe-transition exclusions, gameplay coordinate-space sizing, and full/reduced duration contracts.
- `npm run check:cabinet-wonders-runtime` passed all ten forced live variants at 1280x720 and 1920x1080, including score neutrality, one-per-run behavior, background layering, Reduced Motion, cleanup, and zero page or console errors.
- The inspected ten-variant contact sheet is `test-results/cabinet-wonders-2026-07-20T12-25-06-872Z/cabinet-wonders-contact-sheet.png`.
- `npm run check:sensory-overhaul` passed at 21.1 ms p95; player-projectile readability and boss-hazard arming readability passed.
- `npm run build:current`, the release `npm run build`, all-eight-language `npm run check:i18n-ui`, browser smoke, controller-only flow, Steam-backed current Electron smoke, and `npm run check:release-line` passed.
- Exact-package Steam runtime, launch smoke, keyboard/gamepad controls, fresh-profile Steam isolation, and desktop package review passed.
- Exact-package performance held 58.82 minimum / 59.81 average FPS across 11 samples with zero warnings and zero errors.
- The exact packaged menu screenshot was inspected at `test-results/packaged-exe-smoke-2026-07-20T12-47-27-506Z/01-electron-menu.png`.

BuildID `24295917` is private and unassigned because `SetLive` remained empty. The upload did not move a Steam branch, alter Steamworks settings, change leaderboards or achievements, or modify production data.
