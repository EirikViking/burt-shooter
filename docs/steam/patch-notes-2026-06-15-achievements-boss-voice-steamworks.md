# Nova Swarm Patch Notes Draft - Achievements, Boss Voices, Steamworks

Draft timestamp: 2026-06-15 16:23 CEST

Status: draft only. Do not publish until publisher approval and a final Steam-client refresh check.

## Suggested Title

Nova Swarm Update: 81 Achievements, Boss Voice Control, Cleaner Boss Runs

## Steam News Draft

Hi pilots,

This update wraps several post-launch cleanup threads into one sharper build: the achievement chase is bigger, Steamworks now knows about the full achievement list, boss voices can now be turned off in Settings, and the first boss has a little more breathing room without turning the game into a different game.

## What Changed

- Steam achievements have been expanded to 81 configured rows in Steamworks.
- Added 10 new ultra-hard legendary achievements for deep-run, high-score, no-hit, boss-clear, combo, danger-dodge, Graze Break, and full-hangar mastery.
- Added achieved and locked badge art for the new ultra-hard achievements.
- Added a Settings option for Boss Voices, defaulting ON.
- Turning Boss Voices OFF disables boss voice lines only. Music, SFX, UI sounds, alerts, achievement sounds, and normal gameplay audio are unchanged.
- Boss Voice preference persists through restart, profile reload, and Steam profile/cloud save paths.
- First-boss pressure was adjusted surgically so the first boss remains readable and survivable without broadly rebalancing the run.
- Boss death voice playback now respects the Boss Voices setting.
- The boss-death voice pack was regenerated with the Misfit Galaxy voice direction.
- Late-run enemy and boss-support ship visuals were sharpened so support ships read more like ships and less like flat UI badges.
- Achievement validation, Steam achievement mock coverage, localization checks, controller flow, release hardening, and Steam package/runtime checks were updated around the new catalog.

## Achievement Chase

The new ultra-hard set is aimed at players who already have the basics handled and want something meaner to hunt:

- Two-Million Reactor
- Sector 30 Blackout
- Sector 50 Endless
- Ten-Boss Tribunal
- Clean Ten Statute
- Thirty-Wave Ghost
- Two-Hundred Hit Comet
- Danger Dodge Prophet
- Graze Storm Crown
- Full Hangar Omega

Steamworks App Admin has now been updated and published to the full 81 achievement rows. If the Steam client still shows the older count immediately after the update, restart Steam or give the client cache a little time to refresh.

## Boss Voices

Boss death voice lines are now a separate setting. If you like the drama, leave Boss Voices ON. If you want the arcade chaos without boss voice lines, turn Boss Voices OFF in Settings.

This does not mute:

- Music
- SFX
- UI sounds
- Alerts
- Achievement sounds
- Other gameplay audio

## Boss And Enemy Readability

The first boss got a narrow pacing adjustment in later phases so the automated guard and normal play both have a cleaner survival path. This is not a broad difficulty rebalance.

Late-run enemy and boss-support ship art also received a readability pass: darker hulls, sharper outlines, smaller cores, cleaner accents, and less baked-in glow. The goal is the same chaos, but easier to parse when the screen gets busy.

## Steam / Build Notes

- Latest private SteamPipe upload for this work: BuildID `23743524`.
- Steamworks achievement rows were published after that upload and now verify as 81 rows in App Admin.
- No Steam live branch was changed by automation.
- AppID remained `4765070`.
- Windows depot remained `4765071`.
- Global leaderboard identity remains `nova_swarm_global_score_v2`.
- Achievement icon upload in Steamworks still needs a manual visual pass; the generated JPG assets are staged in `release/steamworks/achievement-icons/`.

Thanks for the fast feedback and the sharp eyes on the Steam achievement count. Keep breaking the cabinet in public; it keeps making the next build better.

Tiny Foundry

## Internal Checklist Before Publishing

- Confirm the Steam client shows 81 achievements after cache refresh/restart.
- Upload/verify achievement icons in Steamworks if the public announcement mentions badge art.
- Confirm BuildID `23743524` is assigned to the intended Steam branch, or update the build note before publishing.
- Re-run a quick Steam-client launch check if this note is published alongside a branch promotion.
