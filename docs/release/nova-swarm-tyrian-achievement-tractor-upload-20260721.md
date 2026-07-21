# Nova Swarm Tyrian Achievement and Tractor - Private Test Upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Task baseline: `7a24c2da21289438824fbe22e28eacca8b20edde`
- Source commit: `655a4899659163d5cd43a42c9c83f1f6effe4fd2`
- Package-readiness commit: `41944c8`
- Build: `v2026-07-21_17-28-45`; embedded Git SHA `655a489`.

## Implemented

- No Repair Receipts now states that every life must be kept until both Sector 10 is cleared and 250,000 points are reached. The achievement logic and ID are unchanged.
- Updated the achievement description in English and all seven supported translations.
- Preserved Hijacker health through Sector 5, then reduced late scaling to +2 per sector with an 85-health cap from Sector 20 onward.
- Replaced additive Tractor whiteout with restrained normal-composite layers, fewer beam lanes/rings, and lower alpha while keeping hostile projectiles above the beam.
- Stabilized focused Tractor and Tractor-hijack fixtures and added health/copy/VFX assertions.

## Validation

Passed release-line, i18n source and eight-language UI, current production build, milestone achievements, Tractor VFX/debuff/chain-lightning/runtime/hijack, 48-sample gameplay-message overlap, browser smoke, controller-only flow, Steam/Electron bridge, current isolated Electron smoke, Steam SDK/package runtime, packaged executable smoke, packaged keyboard/gamepad controls, packaged Steam runtime, desktop-package freshness, payload manifest, and packaged performance.

- Packaged performance: minimum `59.17 FPS`, average `59.35 FPS`, 11 samples, no warnings/errors.
- The first packaged performance attempt inherited a paused fixture state and produced no report; the standalone rerun passed.
- The generic develop-web-game client was attempted but its separate Playwright runtime lacks `chromium_headless_shell-1208`; repository-native installed-Chrome and Electron suites passed.
- Existing non-blocking build advisories remain: five Ascendant fallback-art warnings and the Vite large-chunk advisory.

Visual evidence:

- Before: `test-results/hijacker-tractor-2026-07-21T15-00-50-191Z/hijacker-tractor-active.png`
- After: `test-results/hijacker-tractor-2026-07-21T15-12-48-526Z/hijacker-tractor-sector20-active.png`

## Payload and Steam upload

- Path: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `955615992`
- Payload manifest SHA-256: `732ab4c0e8c9b41535051d0dd772048d467027a81d1b1ff8cac9be72ef1ae198`
- Executable SHA-256: `3bfe20bb799425a98c10fe1336b95de0619ed69c9e918ae042263c211f6328ba`
- AppID: `4765070`
- Windows depot: `4765071`
- VDF `SetLive`: `sector-continue-test`
- Previous test-branch BuildID: `24311168`
- New BuildID: `24317498`
- New depot manifest: `410195413635755475`
- SteamCMD: `Successfully finished AppID 4765070 build (BuildID 24317498).`

Pre-upload app info exposed external drift: public/default was already on `24311168`, contrary to the prior local receipt. Post-upload app info proves public/default remained `24311168`, `sector-continue-test` moved to `24317498`, and `test-build` remained `23782673`. Exactly one build was uploaded. No patch notes, forum reply, Git push, public/default deploy, new Steam branch, or other Steamworks setting change was performed.

## Rollback

- Source: `git revert 655a4899659163d5cd43a42c9c83f1f6effe4fd2`
- Private test branch: reassign `sector-continue-test` to BuildID `24311168`.
