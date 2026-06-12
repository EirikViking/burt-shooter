# Nova Swarm Early Pilot Overhaul Final Report

Generated: 2026-06-12  
Branch: `codex/hard-achievements-20260612`

## Heads

- Starting HEAD for this request: `bbb51d1042520860ef6dcda6886df3fd5f2d6c62`
- Recoverable pre-edit snapshot: `refs/backup/codex/pre-major-overhaul-20260612-130046`
- Recoverable stash snapshot: `45b52bcbe0233cb24f7811ede8870c53aa207212`
- Clean checkpoint before major edits: `a0a17840e46b55c3f4ef4b7d0d22e82508bdce7e`
- Final HEAD: `6fb26a19b8ec6d3a70f8a6fb76b24661ab52f3e5`

## Commits

- `16ed3285e713a2b13c1579ae5b959d40d442972b` - Upgrade Nova Swarm pilot feedback pass
- `25d1ff7f48aef2934afdb878e53b6de0dff3d626` - Add early pilot overhaul release copy
- `876294d8b125c70bb73a804db6f9481b0454df75` - Update milestone achievement guard for Early Pilot
- `6fb26a19b8ec6d3a70f8a6fb76b24661ab52f3e5` - Record early pilot Steam upload evidence

## What Changed

- Renamed boss 1 to Sonia and boss 3 to KurtBossEdgar across the boss roster, runtime copy, Codex-facing surfaces, and tests.
- Fixed Sector Run "One more run" so it restarts from the same Sector Start checkpoint.
- Removed the Windows exit confirmation dialog.
- Expanded leaderboard display and placement logic to Top 40, with special Top 10 treatment and a compact readable desktop Top 40 grid.
- Added boss Fuel Ships with readable movement, boss healing, intercept feedback, SFX, particles, and Codex coverage.
- Added 58 dangerous mid-ship variants after sector 8 with generated Codex entries.
- Added distinct boss death effects and ElevenLabs SFX per boss archetype.
- Added 20 very hard ranks, 40 rank badges, rank lore, rank Codex entries, and mirrored frontend/backend rank policy.
- Added Early Pilot achievement code, icons, manifest entries, and safe startup backfill for already-active pilots.
- Added patch notes, Steam announcement draft, Steam forum draft, and Steamworks manual achievement setup docs.

## Files Changed

Major code areas:

- `src/config/BossRoster.js`
- `src/config/DangerMidShips.js`
- `src/config/ThreatCodexCatalog.js`
- `src/managers/EnemyManager.js`
- `src/entities/Boss.js`
- `src/entities/Enemy.js`
- `src/scenes/PlayScene.js`
- `src/scenes/GameOverScene.js`
- `src/scenes/HighscoreScene.js`
- `src/scenes/ThreatCodexScene.js`
- `src/shared/RankPolicy.js`
- `functions/shared/RankPolicy.js`
- `src/achievements/AchievementCatalog.js`
- `src/game/Game.js`
- `src/assets/assetManifest.js`
- `src/audio/SoundCatalog.js`
- `src/i18n/locales/de.js`
- `src/i18n/locales/es.js`
- `src/i18n/locales/ja.js`
- `src/i18n/locales/ko.js`
- `src/i18n/locales/pt-BR.js`
- `src/i18n/locales/ru.js`
- `src/i18n/locales/zh-CN.js`
- `electron/main.cjs`
- `src/utils/ExitGame.js`

Major QA/docs/release areas:

- `scripts/check-achievements-catalog.mjs`
- `scripts/check-milestone-achievements.mjs`
- `scripts/check-gameover-ceremony.mjs`
- `scripts/check-leaderboard-visuals.mjs`
- `scripts/check-steam-leaderboard-mock.mjs`
- `scripts/check-menu-exit-focus-safety.mjs`
- `scripts/check-result-screen-flow.mjs`
- `scripts/check-result-screen-status.mjs`
- `scripts/check-steam-cloud-save.mjs`
- `scripts/check-unlock-rank-pacing.mjs`
- `scripts/qa-release-gauntlet.mjs`
- `scripts/generate-nova-swarm-sfx.mjs`
- `docs/patch-notes-2026-06-12-early-pilot-overhaul.md`
- `docs/steam/announcement-2026-06-12-early-pilot-overhaul.md`
- `docs/steam/forum-post-2026-06-12-early-pilot-overhaul.md`
- `docs/steam/early-pilot-achievement-steamworks-2026-06-12.md`
- `release/steamworks/steam_upload_evidence_early_pilot_overhaul_20260612.json`
- `release/steamworks/steam_payload_manifest.json`

Generated assets:

- `public/art/generated/nova-swarm/ranks/nova-rank-badge-00-20260612.png` through `nova-rank-badge-39-20260612.png`
- `release/steamworks/achievement-icons/ACH_RANK_20-*` through `ACH_RANK_39-*`
- `release/steamworks/achievement-icons/ACH_EARLY_PILOT-achieved.jpg`
- `release/steamworks/achievement-icons/ACH_EARLY_PILOT-locked.jpg`

Generated audio:

- `public/audio/sfx/nova-swarm/nova_top10_fanfare.mp3`
- `public/audio/sfx/nova-swarm/nova_fuel_ship_spawn.mp3`
- `public/audio/sfx/nova-swarm/nova_fuel_ship_heal.mp3`
- `public/audio/sfx/nova-swarm/nova_fuel_ship_pop.mp3`
- `public/audio/sfx/nova-swarm/nova_danger_mid_pop.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_sonia.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_forge.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_kurt.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_needle.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_vortex.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_jester.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_carrier.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_monolith.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_choir.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_death_clock.mp3`

Music was not replaced or altered.

## QA Results

Passed:

- `npm run check:i18n`
- `npm run check:achievements`
- `npm run check:milestone-achievements`
- `npm run check:steam-achievements-mock`
- `npm run check:audio`
- `npm run check:rank-progression`
- `npm run check:unlock-rank-pacing`
- `npm run check:steam-cloud-save`
- `npm run check:sector-start-result-flow`
- `npm run check:steam-leaderboard-mock`
- `npm run check:leaderboard-visuals`
- `npm run check:menu-exit-focus-safety`
- `npm run check:threat-codex`
- `npm run check:codex-revamp`
- `npm run check:codex-tab-count-layout`
- `npm run build:current`
- `npm run check:i18n-ui`
- `npm run check:steam-electron-bridge`
- `npm run check:controller-flow`
- `npm run check:result-screen-status`
- `npm run check:result-screen-flow`
- `npm run check:gameover-ceremony`
- `npm run qa:release`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run check:release-line`
- `npm run package:steam:win`
- `npm run check:steam-package-runtime`
- `npm run steamworks:payload-manifest`

Not completed:

- `npm run steamworks:handoff` was not committed because the helper rejected stale historical evidence and wrote a stale-failure packet. The generated changes were restored.
- Steam client install validation from the newly uploaded private BuildID was not run.

## Screenshot Evidence

- Top 40 leaderboard desktop: `test-results/leaderboard-visuals-2026-06-12T11-41-16-481Z/leaderboard-desktop.png`
- Top 40 leaderboard mobile: `test-results/leaderboard-visuals-2026-06-12T11-41-16-481Z/leaderboard-mobile.png`
- Number-one ceremony: `test-results/gameover-ceremony-1781264727339/number-one.png`
- Top-three ceremony: `test-results/gameover-ceremony-1781264727339/top-three.png`
- Global-slot ceremony: `test-results/gameover-ceremony-1781264727339/global-slot.png`
- Near-global ceremony: `test-results/gameover-ceremony-1781264727339/near-global.png`
- In-game final death transition: `test-results/gameover-ceremony-1781264727339/in-game-final-death.png`
- General smoke screenshots: `test-results/smoke-2026-06-12T11-49-28-899Z/`
- Electron smoke report: `test-results/electron-smoke-2026-06-12T11-51-04-550Z/`

## Steam Upload

- Package version: `v2026-06-12_13-52-15`
- AppID: `4765070`
- DepotID: `4765071`
- Steam BuildID: `23699052`
- Depot manifest: `6663215867113728413`
- VDF: `release/steamworks/app_build_LOCAL.vdf`
- Build output logs: `release/steam-build-output/app_build_4765070.log` and `release/steam-build-output/depot_build_4765071.log`
- `SetLive`: empty string
- Result: private build uploaded. No live branch was set.

SteamCMD returned exit code 1 after self-update/login prompt noise, but SteamPipe ContentBuilder logs record successful AppID build completion and depot manifest upload. Evidence is recorded in `release/steamworks/steam_upload_evidence_early_pilot_overhaul_20260612.json`.

## Manual Steamworks Steps

1. Confirm private BuildID `23699052` in Steamworks.
2. Do not set a live branch unless explicitly approved.
3. Configure `ACH_EARLY_PILOT` in Steamworks if missing:
   - API Name: `ACH_EARLY_PILOT`
   - Display Name: `Early Pilot`
   - Description: `Play one ranked run during the early pilot window.`
   - Hidden: `false`
   - Icons: `release/steamworks/achievement-icons/ACH_EARLY_PILOT-achieved.jpg` and `ACH_EARLY_PILOT-locked.jpg`
4. Publish the Steamworks achievement admin change through the normal Steamworks preview/review flow.
5. Install BuildID `23699052` through Steam client and run live achievement/leaderboard/cloud smoke before any branch promotion.

## Protected Steamworks State

- Steam AppID unchanged: `4765070`
- DepotID unchanged: `4765071`
- Leaderboard identity unchanged: `nova_swarm_global_score_v2`
- Store metadata untouched
- Pricing untouched
- Release visibility untouched
- Live branches untouched

## Known Remaining Issues

- Early Pilot live unlock validation depends on the Steamworks achievement entry existing.
- Steam client install validation for BuildID `23699052` is still pending.
- The release handoff helper still sees older stale evidence files from prior release packets.
- Vite still warns that the main JS chunk is larger than 700 kB after minification.
- Steam announcement/forum copy is repo-drafted only; nothing was posted publicly.

## Rollback

Code rollback to the request starting point:

```bash
git revert --no-edit 6fb26a19b8ec6d3a70f8a6fb76b24661ab52f3e5 876294d8b125c70bb73a804db6f9481b0454df75 25d1ff7f48aef2934afdb878e53b6de0dff3d626 16ed3285e713a2b13c1579ae5b959d40d442972b a0a17840e46b55c3f4ef4b7d0d22e82508bdce7e
```

Steam rollback:

- No live branch was changed, so no public rollback is required.
- If BuildID `23699052` is later promoted by mistake, use Steamworks branch management to set that branch back to the previous approved BuildID.
