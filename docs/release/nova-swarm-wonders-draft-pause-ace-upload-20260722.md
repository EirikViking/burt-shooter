# Nova Swarm Wonders, Draft, Pause, and Ace - private test upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Starting HEAD: `85d126a48e8aeeb3cf985c8511a1fae5b8652908`
- Source commit: `e4a61a73d7bad768f42800de734870c080999c71`
- Package-readiness commit: `95bc45b109f20acc7fa78df752aab7924841d8d7`
- Build: `v2026-07-22_12-00-11`; embedded Git SHA `e4a61a7`

## Implemented

- Replaced the dominant procedural look of all ten Cabinet Wonders with ten distinct, text-free imagegen hero layers. The original procedural art remains only as a restrained animated accent.
- Enlarged and clarified Tactical Draft cards, stat previews, primary Choose actions, Active Build category modules, and the nearby Rescan/Hold/Ban controls.
- Prevented focus/blur noise while Tactical Draft owns the gameplay freeze, so confirming an augment returns directly to live combat rather than revealing Pause.
- Rebuilt the Pause information hierarchy into separate status, Pilot Orders, telemetry, build/directive, and navigation rows at desktop and compact resolutions.
- Replaced the Ace's large attached Destroy label and generic target rings with a compact localized identity plate and angular command signature. The full localized objective remains in the Ace dossier.
- Preserved gameplay, rarity, timing, score, saves, achievements, leaderboards, and Steamworks identity.

## Validation

- Passed: `check:release-line`, `check:i18n`, all-eight-language `check:i18n-ui`, `build:current`, `check:tactical-draft`, `check:cabinet-wonders-runtime`, `check:pause-context-chips`, `check:ace-bounty-runtime`, `check:steam-electron-bridge`, `check:controller-flow`, browser `smoke`, current Electron smoke/performance, Steam SDK/package runtime, packaged local-mode EXE smoke, packaged keyboard/gamepad controls, fresh-profile isolation, strict packaged runtime failure/opt-out behavior, desktop-package freshness, payload manifest, packaged performance, and `git diff --check`.
- Tactical Draft coverage includes first and late Drafts, stacks, dynamic effects, Fusion blueprint/completion, active Fusion, keyboard/gamepad/pointer, Rescan/Hold/Ban, 1920x1080, 760x640, and long German/Russian/Chinese layouts.
- All ten Wonder variants were staged and visually inspected. Pause was inspected at 1920x1080 and 760x640; Ace was checked in English and German.
- Packaged performance: 60.00 minimum/average FPS across 11 samples, no errors. One capture retry recovered after an `UnknownVizError`.
- The strict packaged Steam-mode launch correctly failed closed outside an active Steam-launched session with `steam_init_returned_false`; native-module loading, explicit local opt-out behavior, cached SteamCMD authentication, and every local packaged gate passed.
- Optional generic develop-web-game Playwright client was unavailable before navigation because its separate cache lacks `chromium_headless_shell-1208`; repository-native installed-Chrome and Electron validation passed.

## Visual evidence

- Draft before: `test-results/tactical-draft-2026-07-22T08-13-46-856Z/tactical-draft-first-1920x1080.png`
- Draft after: `test-results/tactical-draft-2026-07-22T09-24-31-890Z/tactical-draft-first-1920x1080.png`
- Late/compact Draft: `test-results/tactical-draft-2026-07-22T09-24-31-890Z/tactical-draft-late-1920x1080.png`, `test-results/tactical-draft-2026-07-22T09-24-31-890Z/tactical-draft-compact.png`
- Pause before: `test-results/pause-context-chips-2026-07-22T08-17-27-201Z/pause-context-chips.png`
- Pause after: `test-results/pause-context-chips-2026-07-22T09-07-28-326Z/pause-context-chips-1920x1080.png`, `test-results/pause-context-chips-2026-07-22T09-07-28-326Z/pause-context-chips-compact.png`
- Ace before/after: `test-results/ace-bounties-2026-07-22T08-17-34-802Z/ace-bounty-1920x1080.png`, `test-results/ace-bounties-2026-07-22T09-10-08-332Z/ace-bounty-1920x1080.png`
- Wonder before/after set: `test-results/cabinet-wonders-2026-07-22T08-14-41-124Z/`, `test-results/cabinet-wonders-2026-07-22T09-35-04-090Z/`

## Payload and Steam upload

- Payload: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `982977096`
- Payload manifest SHA-256: `53cb2c45708d52d79cb029ddb2da77f236b5cb75329d8849a1d91f9927861a5c`
- Executable SHA-256: `f89a24e765d0aa070118a01f128f5d9e70a79e106811983448bd75a62d3f6d3a`
- AppID: `4765070`
- Windows depot: `4765071`
- Existing private branch: `sector-continue-test`
- Previous private BuildID: `24329550`
- Previous depot manifest: `8138688569596131506`
- New BuildID: `24331832`
- New depot manifest: `7941892767995791817`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24331832).`

Read-only post-upload app info proves public/default remained `24311168`, `sector-continue-test` moved from `24329550` to `24331832`, and `test-build` remained `23782673`. Exactly one build was uploaded. No patch notes, forum post, Git push, public/default deploy, new Steam branch, or other Steamworks setting change was performed.

## Rollback

- Source: `git revert e4a61a7`
- Private Steam branch: reassign `sector-continue-test` to BuildID `24329550`.
