# Nova Swarm Combat HUD Polish - Private Test Upload

## Source and scope

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Task baseline: `2392e18703063ab8df51a6353362f8da58cdb329`
- HUD/VFX source commit: `4c459efedfbd33bd871d96a9f32ae84b067878c3`
- Package-readiness commit: `7efa9d6a295bfae5a3b0a944350fa0fb51e4ae64`
- Build: `v2026-07-21_11-06-14`; Electron smoke reported embedded `gitSha 4c459ef`.
- No gameplay, score, damage, timing, save, achievement, leaderboard, AppID, depot, or public-branch behavior changed.

## Implemented

- Flawless, Sector Clear, and Rank Up share one protected center-presentation lane. Flawless is deferred and shown after the transition rather than discarded.
- Cabinet taunts now use the prioritized toast queue instead of an untracked center overlay.
- Ace Contract measures the visible augment tray and clears it on desktop and compact layouts.
- Tactical augment cards use layered glass, restrained accent rails, framed emblems, stack badges, and a distinct fusion-prism treatment.
- Plain dot explosions were replaced by pooled directional energy shards with white-hot cores.
- Boss and common spectacle circles were replaced by broken scan arcs, faceted cores, angular sigils, and prismatic wave-clear glints.

Changed files:

- `src/ui/HUD.js`
- `src/scenes/PlayScene.js`
- `src/game/TauntDirector.js`
- `src/effects/ParticleManager.js`
- `src/effects/SpectacleDirector.js`
- `scripts/check-gameplay-message-overlap.mjs`
- `scripts/check-tactical-augment-tray.mjs`
- `scripts/check-wave-clear-effect.mjs`
- `scripts/smoke-playtest.mjs`
- `progress.md`
- `release/steamworks/desktop_package_review_report.json`
- This receipt

## Validation

Passed: release-line, i18n source and eight-language UI, build/current build, wave-clear VFX, desktop/compact augment and Ace clearance, gameplay-message overlap, browser smoke, controller-only flow, Steam/Electron bridge, boss-death voice runtime, sensory/VFX stress, Electron smoke/perf, Steam package runtime, packaged smoke, packaged keyboard/gamepad controls, packaged performance, desktop-package freshness, and packaged Steam runtime gate.

- Spectacle stress: p95 `18.90 ms`, no cap failure.
- Electron perf: minimum `59.52 FPS`, average `60.05 FPS`.
- Packaged perf: minimum `59.17 FPS`, average `60.31 FPS`, no warnings/errors.
- Generic develop-web-game client was attempted but its separate Playwright install lacks `chromium_headless_shell-1208`; repository-native Chrome/Electron checks passed.
- Existing non-blocking build advisories remain: five declared Ascendant fallback-art warnings and the Vite large-chunk advisory.
- No player-facing text was added, so no untranslated text remains from this change.

Visual evidence:

- Wave clear: `test-results/wave-clear-effect-2026-07-21T08-42-06-440Z/wave-clear-effect.png`
- Ace/augment clearance: `test-results/tactical-augment-tray-2026-07-21T08-43-48-440Z/ace-contract-augment-clearance-1920x1080.png`
- Boss impact: `test-results/smoke-2026-07-21T08-57-30-850Z/14a-boss-impact.png`

## Payload and Steam upload

- Path: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `955614623`
- Executable bytes: `226698752`
- AppID: `4765070`
- Windows depot: `4765071`
- VDF `SetLive`: `sector-continue-test`
- Previous private-branch BuildID: `24304833`
- New BuildID: `24311168`
- New depot manifest: `2950386247224146893`
- SteamCMD: `Successfully finished AppID 4765070 build (BuildID 24311168).`

Post-upload app info proves `sector-continue-test` points to `24311168`. Public/default remains `24295917`; `test-build` remains `23782673`. Exactly one build was uploaded. No patch notes, Git push, public/default deploy, new Steam branch, or other Steamworks settings change was performed.

## Rollback

- Source: `git revert 4c459efedfbd33bd871d96a9f32ae84b067878c3`
- Private test branch: reassign `sector-continue-test` to BuildID `24304833`.
