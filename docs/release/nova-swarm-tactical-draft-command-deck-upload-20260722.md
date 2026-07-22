# Nova Swarm Tactical Draft command deck - private test upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Starting HEAD: `d95b882c3418b03b6c3792bd3b146131fc2b6bea`
- Source commit: `d4b162eb7b6f1df3010244549cf3e9da9831740f`
- Package-readiness commit: `c461789812b4ffca780a3247a8b2af958f972928`
- Build: `v2026-07-22_09-23-32`; embedded Git SHA `d4b162e`

## Implemented

- Expanded the shared organic plasma renderer from one material to four distinct variants: nova, ion shear, solar corona, and void collapse.
- Normal explosions select color-compatible materials and avoid immediate repeats. Boss deaths combine two distinct variants while preserving existing gameplay timing, particle limits, damage, and audio triggers.
- Rebuilt Tactical Draft as a generated command-deck presentation: full-screen material, textured chamfered cards, category plasma wells, segmented card rails, stronger Choose modules, and a four-category Active Build deck with existing doctrine/Fusion state.
- Replaced the Draft fallback circles and radial lock-in sparkle with angular modules, a tapered perimeter tracer, and asymmetric plasma fragments.
- Kept localized text, authoritative stat previews, input focus, telegraphs, collision state, saves, scoring, achievements, leaderboards, and Steamworks identity unchanged.
- Recorded the wider animation/imagegen review in `docs/reviews/nova-swarm-animation-imagegen-audit-20260722.md`.

## Validation

- Passed: `build:current`, `check:i18n`, all-eight-language `check:i18n-ui`, `check:tactical-draft`, `check:sensory-overhaul`, `check:controller-flow`, browser `smoke`, `check:steam-electron-bridge`, `check:release-line`, fresh-profile Steam isolation, current Electron smoke/performance, Steam SDK/runtime, packaged EXE smoke, packaged keyboard/gamepad controls, strict packaged runtime behavior, desktop package freshness, payload manifest, and packaged performance.
- Tactical Draft fixture covers first/late Draft, stacks, dynamic effects, Fusion blueprint/completion, active Fusion, 1920x1080, 760x640, keyboard, gamepad, pointer, Rescan, Hold, Ban, German, Russian, and Simplified Chinese.
- VFX fixture staged all four variants, found zero primitive circle/diamond explosion geometry, and held stress p95 at 18.40ms.
- Current desktop performance: minimum 58.48 FPS, average 59.89 FPS, 12 samples, no warnings/errors.
- Packaged performance: minimum 57.80 FPS, average 59.70 FPS, 12 samples, no warnings/errors.
- Existing non-blocking advisories remain the five Ascendant fallback-art warnings, Vite's large-chunk advisory, and Electron/Node deprecation notices.

## Visual evidence

- Previous first Draft: `test-results/tactical-draft-2026-07-22T05-59-53-688Z/tactical-draft-first-1920x1080.png`
- New first Draft: `test-results/tactical-draft-2026-07-22T07-08-40-690Z/tactical-draft-first-1920x1080.png`
- New late Draft: `test-results/tactical-draft-2026-07-22T07-08-40-690Z/tactical-draft-late-1920x1080.png`
- New compact Draft: `test-results/tactical-draft-2026-07-22T07-08-40-690Z/tactical-draft-compact.png`
- New active Fusion: `test-results/tactical-draft-2026-07-22T07-08-40-690Z/tactical-draft-active-fusion-1920x1080.png`
- Four explosion variants: `test-results/sensory-overhaul-2026-07-22T07-10-27-513Z/01-prismatic-combat-orchestra-desktop.png`
- New boss cascade: `test-results/sensory-overhaul-2026-07-22T07-10-27-513Z/02-boss-death-plasma-cascade-desktop.png`
- Reduced-motion VFX: `test-results/sensory-overhaul-2026-07-22T07-10-27-513Z/03-reduced-motion-compact.png`

## Payload and Steam upload

- Payload: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `963637315`
- Payload manifest SHA-256: `b9b0dadc68a860e5aaa73491faa115d14307b5a3a1313b1a45c7484730cea351`
- Executable SHA-256: `f52ff2942c8695451ea66476510bcc9653fed96dabdbbefb9575d25848a221bc`
- AppID: `4765070`
- Windows depot: `4765071`
- Existing private branch: `sector-continue-test`
- Previous private BuildID: `24328683`
- Previous depot manifest: `8963460960521347700`
- New BuildID: `24329550`
- New depot manifest: `8138688569596131506`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24329550).`

Read-only post-upload app info proves public/default remained `24311168`, `sector-continue-test` moved from `24328683` to `24329550`, and `test-build` remained `23782673`. Exactly one build was uploaded. No patch notes, forum post, Git push, public/default deploy, new Steam branch, or other Steamworks setting change was performed.

## Rollback

- Source: `git revert d4b162e`
- Private Steam branch: reassign `sector-continue-test` to BuildID `24328683`.

