# Nova Swarm Premium Plasma VFX - Private Test Upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Task baseline: `6b4126be88eaabe4a50d1dfcdfd8231bb27d72e6`
- Source commit: `764a5ec`
- Package-readiness commit: `8592654`
- Build: `v2026-07-22_08-08-50`; embedded Git SHA `764a5ec`.

## Implemented

- Removed decorative star glints and target rings from Wave/Sector Clear, and removed the shared cabinet-toast celebration star burst.
- Replaced shared concentric-ring, spoke, diamond, pixel-debris, shockwave, and boss-sigil explosion language with pooled organic plasma blooms, asymmetric bezier tendrils, broken wavefronts, and tapered fragments.
- Added one image-generated Nova plasma bloom texture on a black additive background and bounded it to an 18-sprite pool.
- Rebuilt Rift Reprisal and the other three Fusion unlocks with unique protocol emblems, chamfered panels, and plasma ribbons.
- Rebuilt Tactical Draft's Active Build strip into category chips plus a doctrine/Fusion signature bay at desktop and compact resolutions.
- Gameplay, damage, scoring, timing, saves, achievements, leaderboards, Steam identity, and translations were not changed.

## Validation

Passed release-line, `build:current`, all-eight-language `check:i18n-ui`, Wave Clear, sensory/VFX, all four Fusion protocols, Tactical Draft desktop/compact, 48-sample gameplay-message overlap, boss-death voice runtime, controller-only, browser smoke, current Electron smoke/performance, Steam SDK/package runtime, Windows package, packaged local-mode EXE smoke, packaged keyboard/gamepad controls, desktop package integrity, payload manifest, and packaged performance.

- Packaged performance: minimum `59.88 FPS`, average `60.11 FPS`, 12 samples, no warnings or errors.
- The strict packaged Steam-client smoke failed closed with `steam_init_returned_false` because the EXE was not launched by Steam in this automation session. Native Steam modules/package gates passed; cached SteamCMD authentication succeeded without human action. Verify overlay/Steam identity in the human Steam-client test.
- Existing non-blocking advisories remain: five Ascendant fallback-art warnings and the Vite large-chunk advisory.

Visual evidence:

- Before Wave Clear: `test-results/wave-clear-effect-2026-07-22T05-33-24-865Z/wave-clear-effect.png`
- After Wave Clear: `test-results/wave-clear-effect-2026-07-22T05-59-16-117Z/wave-clear-effect.png`
- Before shared explosion language: `test-results/sensory-overhaul-2026-07-22T05-33-46-975Z/01-prismatic-combat-orchestra-desktop.png`
- After normal plasma explosions: `test-results/sensory-overhaul-2026-07-22T05-59-24-795Z/01-prismatic-combat-orchestra-desktop.png`
- After boss plasma cascade: `test-results/sensory-overhaul-2026-07-22T05-59-24-795Z/02-boss-death-plasma-cascade-desktop.png`
- Before Rift Reprisal: `test-results/tactical-fusions-2026-07-22T05-34-12-397Z/01-fusion-protocol-online.png`
- After Rift Reprisal: `test-results/tactical-fusions-2026-07-22T05-59-46-083Z/01-fusion-protocol-online.png`
- Before Active Build: `test-results/tactical-draft-2026-07-22T05-34-27-167Z/tactical-draft-active-fusion-1920x1080.png`
- After Active Build: `test-results/tactical-draft-2026-07-22T05-59-53-688Z/tactical-draft-active-fusion-1920x1080.png`

## Payload and Steam upload

- Path: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `957203427`
- Payload manifest SHA-256: `ca6830c4174597096ceef3141b64ed5fdc9f240bda1ef7c8d365b1bd7c99e58b`
- Executable SHA-256: `ad9cd4c41ab09ac6f6b41c952a94379e101dbe747a6f71a4e9c67e34dcd2cf92`
- AppID: `4765070`
- Windows depot: `4765071`
- VDF `SetLive`: `sector-continue-test`
- Previous private test BuildID: `24327765`
- New BuildID: `24328683`
- New depot manifest: `8963460960521347700`
- SteamCMD: `Successfully finished AppID 4765070 build (BuildID 24328683).`

Post-upload app info proves public/default remained `24311168`, `sector-continue-test` moved from `24327765` to `24328683`, and `test-build` remained `23782673`. Exactly one build was uploaded. No patch notes, forum post, Git push, public/default deploy, new Steam branch, or other Steamworks setting change was performed.

## Rollback

- Source: `git revert 764a5ec`
- Private test branch: reassign `sector-continue-test` to BuildID `24327765`.
