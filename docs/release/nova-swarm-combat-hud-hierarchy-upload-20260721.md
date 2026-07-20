# Nova Swarm Combat HUD Hierarchy - Private Test Upload

## Scope and source

- Authorized worktree: `D:\vibe-coding-e\nova-swarm-authoritative-post-stable-20260720`
- Branch: `codex/post-stable-authoritative-20260720`
- Baseline: `a5f2b9c98fa6a24a7d13022b16d5e38f075472c2`
- HUD source commit: `a794ceaaf2f646f64fea3ae557e2b45d5eb980a2`
- Pre-upload evidence commit: `c4ded48e498944e109917ec78049c305d66f2ef1`
- Build: `v2026-07-21_01-33-37`
- Packaged executable reported `gitSha a794cea` through Steam-backed smoke.

## Independent video evidence

- Clip 2 at `01:28`: boss warning directly beneath mission/boss status produced a dense top-center stack.
- Clip 5 at `05:20`: the large `NEON WARDEN` identity card covered the boss body and central firing lane while boss HP and side HUD remained active.
- Clip 5 at `07:38`: the centered boss-music card covered the active combat lane beneath boss HP.
- Clip 5 at `08:38-08:42`: sector-clear spectacle, dossier, and the next boss identity signal competed in a short transition sequence.
- Clip 6 at `02:58-03:02`: fuel-ship/boss-phase signals stacked beneath boss HP while boss geometry remained active.

## Implemented hierarchy

- Critical lives, active objective, immediate danger, and boss state use the strongest contrast.
- Powerup and trait remain readable at support weight.
- Score, rank, record chase, tactical augment, and directive details recede visually.
- The existing prioritized, deduplicated toast queues remain intact.
- On desktop, the critical boss identity card is compact and left-edge aligned, outside the protected central firing/dodge lane; compact layouts retain centered placement.
- No gameplay, score, damage, timing, save format, achievement, leaderboard, AppID, or depot identity changed.

## Files changed

- `src/ui/HUD.js`
- `src/scenes/PlayScene.js`
- `scripts/check-hud-readability.mjs`
- `scripts/check-gameplay-message-overlap.mjs`
- `progress.md`
- `release/steamworks/desktop_package_review_report.json` (generated validation evidence)
- This upload receipt

## Validation

Passed:

- `npm run check:release-line`
- `npm run check:i18n`
- `npm run check:i18n-ui` for all eight supported languages, with no placeholder or English-leak hits
- `npm run build:current` and final `npm run build`
- `npm run check:hud-readability`
- `npm run check:gameplay-message-overlap`
- `npm run check:mission-progress-hud`
- `npm run check:boss-healthbar-readability`
- `npm run check:danger-dodge`
- `npm run check:powerup-hud-affordances`
- `npm run check:trait-hud`
- `npm run check:player-projectile-readability`
- `npm run check:boss-hazard-arming-readability`
- `npm run check:boss-warning-popup`
- `npm run check:steam-electron-bridge`
- `npm run check:controller-flow`
- `npm run check:keyboard-launches`
- `npm run smoke`
- `npm run package:steam:win:current`
- Steam-backed source and packaged smoke
- Packaged keyboard/gamepad controls
- Fresh-profile Steam isolation
- Desktop/package/runtime integrity gates
- Packaged 12-sample performance: minimum `57.14 FPS`, average `60.07 FPS`, no warnings or errors

The generic `develop-web-game` client was attempted but could not launch because its separate Playwright install lacks `chromium_headless_shell-1208`. Repository-native Chrome/Electron checks supplied the visual and runtime evidence.

Known pre-existing non-blocking build warnings remain: five Ascendant ships use declared temporary fallback art, and the main Vite chunk exceeds the configured size advisory. No new player-facing text was added, so there is no untranslated text in this change.

## Payload

- Path: `release/desktop/win-unpacked`
- Files: `410`
- Bytes: `955611465`
- Manifest SHA-256: `84ac64ddead3a6ba7c34b22287295f342110ee11d41768b3442d17a5406142f3`
- `Nova Swarm.exe` SHA-256: `f539e6fe138dd095044cd53b04750dff999b10daa0f1b0a91044dea5511c8846`

## Steam upload

- AppID: `4765070`
- Windows depot: `4765071`
- VDF `SetLive`: `sector-continue-test`
- Previous test-branch BuildID: `24262740`
- New BuildID: `24304833`
- New depot manifest: `8303566425249997180`
- SteamCMD result: `Successfully finished AppID 4765070 build (BuildID 24304833).`
- Upload log: `test-results/steam-upload-hud-hierarchy-20260721/steamcmd.stdout.log`
- Post-upload app-info log: `test-results/steam-upload-hud-hierarchy-20260721/app-info-after.stdout.log`

Independent post-upload app info proves `sector-continue-test` points to `24304833`. Public/default remains stable BuildID `24295917`; `test-build` remains `23782673`. Exactly one build was uploaded. No patch notes were published, no Git push or web deploy was performed, and no Steamworks setting changed beyond moving the explicitly requested existing private test branch.

## Rollback

- HUD source: `git revert a794ceaaf2f646f64fea3ae557e2b45d5eb980a2`
- Test branch: reassign `sector-continue-test` to BuildID `24262740`.
