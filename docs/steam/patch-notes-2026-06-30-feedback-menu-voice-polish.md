# Nova Swarm Patch Notes - Feedback Polish And Menu Voice Cleanup

Document timestamp: 2026-06-30 16:05 CEST

Status: draft for Steam News / Community post. Do not publish until approved. This draft is based on changes after the latest public Steam note, `Nova Swarm Patch Notes: Focus Drift Control` / BuildID `23965036`.

Candidate build for approval: private unassigned Steam BuildID `23984664`, packaged from source commit `af6b8760ffc341abdb6903cd02ba94dc06e3af3f` as `v2026-06-30_15-24-41`.

## Suggested Title

Nova Swarm Patch Notes: Cleaner Dodging, Better Rewards, Calmer Menu Voices

## Steam News Draft

Hi pilots,

This update is a focused feedback pass based on recent player notes. The goal is simple: make dodging easier to read, make near-miss rewards feel more intentional, keep reward text out of the danger zone, and let the menu keep its personality without the voices stacking on top of each other.

[h2]What Changed[/h2]

[list]
[*]Added a clearer danger-point / hitbox visibility option in Settings.
[*]Made the danger point pulse during Focus Drift, phasing, near misses, and Graze Break moments without covering the ship art.
[*]Changed Graze Break so a newly armed special shot waits for an intentional fire release/re-press if you were already holding shoot.
[*]Moved lower-priority reward and clear text out of the middle of the playfield during active combat pressure.
[*]Reduced menu voice spam with a short hover/focus delay and cooldown.
[*]Fixed the remaining hover-then-click overlap case so click barks cut menu hover barks cleanly instead of layering voices.
[*]Adjusted a couple of menu voice lines to avoid awkward "live/lives" pronunciation.
[*]Retuned Blink Drive so it is still fast and useful, but easier to fight with instead of overshooting every problem at maximum drama.
[*]Added more feedback punch for near-miss streaks, combo milestones, multiplier jumps, and powerup pickups.
[/list]

[h2]Readability And Control[/h2]

Hitbox readability came up a lot in recent feedback, especially during dense bullet patterns. There is now an extra `HITBOX` visibility option, and the danger point gets contextual pulses when it matters most: Focus Drift, phasing, near misses, and Graze Break arming/priming.

Graze Break should also feel less wasteful now. If it arms while you are already holding shoot, it waits for you to release and fire intentionally before marking the next shot. The reward is still earned through risky near-miss play; it just should not disappear into a shot you were already holding.

[h2]Cleaner Combat Messages[/h2]

Some clear-bonus and reward text could hang in the middle of the playfield after the fight resumed. Lower-priority reward text now moves up and out of the danger zone while enemies or bullets are active. Important boss and run-clear messages still get their moment.

[h2]Menu Voice Cleanup[/h2]

The boss menu barks are meant to give the cabinet personality, not turn every menu move into an audio traffic jam. Hover/focus barks now wait briefly and cool down, and the hover-then-click overlap bug is fixed so activation lines can take over cleanly.

[h2]Small Feel Wins[/h2]

This patch also adds more arcade feedback to the good moments: near-miss streak surges, combo milestone bursts, multiplier celebration, and stronger pickup feedback. Blink Drive was tuned toward controlled repositioning instead of pure speed, so it should be easier to use in real fights.

[h2]Build Notes[/h2]

Steam AppID, depot, leaderboard identity, score identity, save format, achievements metadata, and Steam Cloud paths are unchanged.

Thanks for the sharp feedback. These small feel/readability details matter a lot in a bullet-heavy arcade game, and the swarm is better when the danger is readable for the right reasons.

Tiny Foundry

## Suggested Screenshot/Art Paths

- `test-results/menu-voice-overlap-2026-06-30T13-17-30-894Z/menu-voice-overlap.png`
- `test-results/low-hanging-fun-2026-06-29T16-02-42-514Z/low-hanging-fun.png`
- `test-results/i18n-ui-2026-06-30T13-18-37-732Z/01-english-hud.png`

## Internal Checklist Before Publishing

- Approval required before publishing this note.
- Latest public Steam note verified externally as `Nova Swarm Patch Notes: Focus Drift Control`, BuildID `23965036`, published June 29, 2026.
- This draft covers private builds after that note: `23969179`, `23983678`, and current candidate `23984664`.
- Candidate build `23984664` was uploaded with `SetLive ""`, so no Steam public/default branch was assigned by the VDF.
- Steamworks metadata, AppID, depot ID, leaderboard identity, achievements metadata, Steam Cloud settings, save format, score identity, and store metadata were unchanged in the recorded evidence.
- Before posting, confirm the intended Steam branch has been deliberately assigned to BuildID `23984664` or newer.
- If a newer package supersedes `23984664`, update the candidate build line before publishing.

## Verification Evidence

- `git diff --check`
- `npm run check:menu-boss-barks`
- `npm run check:menu-voice-overlap`
- `npm run check:i18n`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `npm run check:steam-electron-bridge`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run build:current`
- `npm run check:release-line`
- `npm run package:steam:win`
- `npm run desktop:smoke:packaged`
- `npm run desktop:controls:packaged`
- `npm run desktop:perf:packaged`
- `npm run steamworks:payload-manifest`
- `STEAM_APP_ID=4765070 STEAM_DEPOT_ID=4765071 STEAM_SET_LIVE= npm run steamworks:write-vdf`
- SteamCMD private upload: BuildID `23984664`
