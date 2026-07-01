# Nova Swarm Achievements

Steam App ID: `4765070`

The canonical achievement list is `src/achievements/AchievementCatalog.js`. The Steam launch set currently contains 81 source/runtime achievements:

- 39 pilot-rank achievements generated from `src/shared/RankPolicy.js`.
- 2 leaderboard achievements for global qualification and global #1.
- 40 milestone achievements for sector progress, run clears, clean play, score mastery, boss wins, Codex discovery, hangar growth, First Ranked Run participation, and ultra-hard legendary mastery goals.

Generate the Steamworks setup list from code with:

```bash
node scripts/export-steam-achievements.mjs --json
```

## Runtime Flow

- Local achievement state remains stored in localStorage under `nova_swarm_achievements_v1`.
- Electron exposes a narrow Steam achievement bridge through `window.__novaSteamBridge.achievements` and `window.__novaSteamAchievements`.
- Local unlocks attempt Steam unlocks with `steamworks-ffi-node` via the shared Steamworks client already used by the leaderboard bridge.
- Steam unavailable, missing App ID, missing stats, or logged-out states are returned as diagnostics and never block gameplay.
- Failed Steam unlocks are queued under `nova_swarm_steam_achievement_queue_v1` and retried on startup/sync.
- Startup sync mirrors local unlocked achievements to Steam and imports already-unlocked Steam achievements locally without duplicate toast popups.
- Milestone achievements are evaluated once the run progression summary is committed, so career totals, newly unlocked ships, and the run's latest score/sector/lives all agree.

## Steamworks Setup

Create or verify every Steamworks achievement from the generated catalog list:

- API Name: exact `achievement.id`
- Display Name: `achievement.name`
- Description: `achievement.description`
- Hidden: `false` unless the catalog says otherwise

Achievement icon assets are staged in `release/steamworks/achievement-icons/`. The manifest maps every API name to achieved and locked 256x256 JPG icons. The current milestone icons were generated with Codex imagegen from the 2026-05-26 3x3 milestone sheet and can be replaced later without changing API names.

The 2026-06-12 pass added hard-rank icons `ACH_RANK_20` through `ACH_RANK_39` and First Ranked Run icons `ACH_EARLY_PILOT-achieved.jpg` / `ACH_EARLY_PILOT-locked.jpg`. The 2026-06-15 pass added ultra-hard legendary achievements and replaced the duplicated milestone badge art with unique achieved/locked icon pairs generated with internal Codex imagegen.

Current Steamworks App Admin evidence showed only 30 configured Steam achievements before the 2026-06-15 source update. On 2026-06-15, the missing achievement rows were added and published in Steamworks; final browser verification showed `Antall prestasjoner: 81` with no missing or extra API names. Achievement icon uploads remain a separate Steamworks visual-polish step because the browser automation surface could not set file inputs.

## Local Testing

```bash
npm run check:achievements
npm run check:milestone-achievements
npm run check:steam-achievements-mock
npm run build
npm run desktop:smoke
```

## Live Checklist

1. Launch the packaged build through Steam with App ID `4765070`.
2. Confirm the Steam overlay/session is active.
3. Unlock a rank achievement in a ranked, non-debug run.
4. Verify Steam shows the unlocked achievement.
5. Export hidden Steam diagnostics with `Ctrl+Alt+Shift+D` and confirm achievement status appears beside leaderboard status.

Known limitations: the runtime never clears Steam achievements except through explicit external/debug Steam tooling, and live unlock validation still depends on Steamworks approval/account state for App ID `4765070`.
Live Steam client validation also requires the official Steamworks SDK redistributables at `steam_sdk/sdk/redistributable_bin/` or `steamworks_sdk/redistributable_bin/`; they are intentionally not committed.
