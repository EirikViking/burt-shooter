# Nova Swarm Tactical Draft - Private Test Upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Task baseline: `2f2e0e8413de6e1445db0b658a35bf6449afa531`
- Source commit: `7ed98e7286286220e18e35a8027380b0d2261eb1`
- Package-readiness commit: `3635714`
- Build: `v2026-07-22_01-29-17`; embedded Git SHA `7ed98e7`.

## Implemented

- Reworked Tactical Draft card hierarchy around name, existing category, plain-language effect, and primary Choose action.
- Added authoritative current-value before-to-after previews for safe direct-stat augments by reusing `Player.recalculateStats`; contextual effects keep precise text instead of fabricated numbers.
- Added compact current stacks, permanence/evolution, doctrine synergy, Fusion, and Draft-only active-build context.
- Kept Rescan, Hold, and Ban available but visually secondary, retained keyboard/gamepad semantics, and replaced the prior recommendation heuristic with neutral middle focus.
- Added the interface copy in all eight supported languages without changing balance, RNG, Fusion/doctrine rules, scoring, saves, achievements, leaderboards, or Steam identity.

## Validation

Passed `check:i18n`, `build:current`, all-eight-language `check:i18n-ui`, Tactical Draft, Fusion, doctrine, augment tray, score-route, controller-only, browser smoke, release-line, Steam/Electron bridge contract, Steam SDK/package runtime, Windows package, packaged keyboard/gamepad controls, payload manifest, and packaged performance.

- Packaged performance: minimum `60.0 FPS`, average `60.0 FPS`, 11 samples, no errors.
- Packaged runtime smoke passed in explicit local mode. The strict live-Steam mode was also attempted and correctly failed closed with `steam_init_returned_false` because the ordinary Steam client session would not initialize in this automation session. Native Steam modules were present, package/runtime gates passed, and cached SteamCMD authentication succeeded without human action. This is an environment limitation to verify in the human Steam-client test, not a claimed pass.
- The generic develop-web-game client was attempted but its separate Playwright cache lacks `chromium_headless_shell-1208`; repository-native installed-Chrome and Electron suites passed.
- Existing non-blocking advisories remain: five Ascendant fallback-art warnings, the Vite large-chunk advisory, and one recovered packaged-performance screenshot retry.

Visual evidence:

- Before first Draft: `test-results/tactical-draft-2026-07-21T22-44-10-703Z/tactical-draft-desktop.png`
- After first Draft: `test-results/tactical-draft-2026-07-21T23-12-59-087Z/tactical-draft-first-1920x1080.png`
- Before late Draft: `test-results/tactical-draft-2026-07-21T22-44-10-703Z/tactical-draft-compact.png`
- After late Draft: `test-results/tactical-draft-2026-07-21T23-12-59-087Z/tactical-draft-late-1920x1080.png`
- Compact 760x640: `test-results/tactical-draft-2026-07-21T23-12-59-087Z/tactical-draft-compact.png`
- Active Fusion: `test-results/tactical-draft-2026-07-21T23-12-59-087Z/tactical-draft-active-fusion-1920x1080.png`

## Payload and Steam upload

- Path: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `955632404`
- Payload manifest SHA-256: `d9acd48aec3dbc88475ddd1f70bd4197662111f435e94008dbd33ca14b4dc13b`
- Executable SHA-256: `1173d07b301de7aec751b4f989bb095ba08d0a1911232a71005127cdf49fb663`
- AppID: `4765070`
- Windows depot: `4765071`
- VDF `SetLive`: `sector-continue-test`
- Previous private test BuildID: `24317498`
- New BuildID: `24327765`
- New depot manifest: `6468446666308017283`
- SteamCMD: `Successfully finished AppID 4765070 build (BuildID 24327765).`

Post-upload app info proves public/default remained `24311168`, `sector-continue-test` moved from `24317498` to `24327765`, and `test-build` remained `23782673`. Exactly one build was uploaded. No patch notes, forum post, Git push, public/default deploy, new Steam branch, or other Steamworks setting change was performed.

## Rollback

- Source: `git revert 7ed98e7286286220e18e35a8027380b0d2261eb1`
- Private test branch: reassign `sector-continue-test` to BuildID `24317498`.
