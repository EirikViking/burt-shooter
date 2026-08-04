# Steam upload evidence: keyboard rebinding and combat readability

- Date: 2026-08-04 (Europe/Oslo)
- Worktree: `D:\vibe-coding-e\codex\nova-swarm-game-improvements-20260802-c3f9`
- Branch: `codex/tyrian-99-20260802-f44a`
- Uploaded source: `2bbea07`
- Build: `v2026-08-04_15-19-00`
- Steam AppID / DepotID: `4765070` / `4765071`
- Steam BuildID: `24552921`
- Depot manifest: `2794816507068655357`

## Changes in this build

- Settings now exposes localized keyboard assignments for movement, focus, fire, dodge, and pause.
- Shift can be rebound directly from the settings capture panel. Bindings persist locally and through the existing Steam Cloud settings payload, and Reset Keyboard restores defaults.
- The new action resolver preserves controller support, legacy keyboard queries, and the existing diagnostic keyboard override contract.
- Aegis Comet, Railbreaker, and Drone Sovereign authored art is centered inside its transparent frame so the player focus ring and collision center remain aligned.
- Existing combat readability, wonder revelation audio, mastery identities, Eirik scale protection, reinforcement smoothing, Scout tie resolution, and result-card spacing work remain included from the inherited local continuation.

## Verification

- `npm run check:release-hardening` — PASS, 40/40 checks.
- `npm run smoke` — PASS with zero failures, console errors, page errors, or bad responses.
- `npm run check:i18n-ui` — PASS for en, de, zh-CN, ru, es, pt-BR, ko, and ja.
- `npm run check:controller-flow` — PASS.
- `npm run check:keyboard-bindings` and `npm run check:keyboard-bindings-runtime` — PASS, including Shift capture and a custom dodge key in live gameplay.
- `npm run check:player-ring-alignment` — PASS for all 30 hulls.
- `npm run package:steam:win:current` — PASS.
- Packaged smoke and controls — PASS.
- Packaged performance — PASS, 58.82 FPS minimum and 59.95 FPS average.
- `npm run check:steam-package-runtime` and `npm run check:desktop-package` — PASS.

## SteamPipe boundary

- VDF: `release/steamworks/app_build_LOCAL.vdf`
- `SetLive`: empty string
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24552921).`
- Depot log: `release/steam-build-output/depot_build_4765071.log`
- App build log: `release/steam-build-output/app_build_4765070.log`
- The upload did not assign a public/default or private branch. Steamworks configuration, store metadata, achievements, leaderboards, and cloud settings were not changed.

## Remaining manual checks

The automated release hardening report still lists the normal post-upload human checklist in `release/steamworks/release_hardening_manual_test_checklist_20260605.md`, including by-ear audio review, later-boss readability, high-level stuck-sprite review, and a real ranked leaderboard run. No dummy score or leaderboard write was performed.
