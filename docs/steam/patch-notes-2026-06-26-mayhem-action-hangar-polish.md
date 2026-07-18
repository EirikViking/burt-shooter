# Nova Swarm Patch Notes - Mayhem Action, Hangar Polish, Readability

Document timestamp: 2026-06-26 11:45 CEST

Status: draft for Steam news / community post. Do not publish until the final build containing source commit `9c01587a50ffd0ec4f85652e12995b8bbb078f74` or newer has been packaged, uploaded, and assigned to the intended Steam branch.

## Suggested Title

Nova Swarm Update - More Mayhem, Full Reinforcement Waves, Hangar Fixes

## Steam News Draft

Hi pilots,

This update is focused on making Nova Swarm feel more alive, louder, clearer, and meaner in the right places.

Mayhem now has much more dramatic reinforcement moments, boss fights can be interrupted by full enemy waves, the Hangar is safer about old profile data, enemy projectile readability has been sharpened, menu navigation has more personality, and a stack of stability/readability fixes from recent player feedback has landed.

## Headline Changes

- Mayhem reinforcements are now more exciting and more visible.
- Boss fights can now call in full reinforcement waves instead of tiny weak add groups.
- Normal Mayhem waves can now trigger a 3-wave reinforcement sweep, with an occasional 4-wave spike.
- Hangar unlock data is now much safer around old saves, repaired profiles, and legacy unlock history.
- Enemy projectile visuals were refreshed for better readability.
- Menu navigation now has randomized boss voice barks instead of the old robotic click feel.
- Several boss, Scout, UI, leaderboard, Codex, and performance issues were fixed or tightened.

## Mayhem Reinforcements

The reinforcement system has been rebuilt to create bigger "oh no" moments without changing Steam leaderboard identity, scoring identity, save format, or Steam Cloud paths.

- Normal non-boss Mayhem reinforcement chance is now 15%.
- When normal Mayhem reinforcements trigger from Sector 8 onward, they bring in 3 full wave groups.
- Some normal reinforcement events add a fourth wave group for an extra spike.
- Boss-fight reinforcements now use full generated enemy waves instead of small weakened support packs.
- Boss fights can usually get 1 full reinforcement wave, with a rare chance of 2 full waves.
- Reinforcements still use the existing incoming reinforcement warning and voice callout.
- Reinforcement entry timing and lanes were offset so multiple wave groups read as separate incoming threats instead of one messy overlap.

## Boss And Run Flow

Recent boss and run-flow work is aimed at keeping the game intense without creating cheap wipeouts.

- Boss reinforcements can now happen during boss fights after a warning window.
- Boss wipeout protection and early boss pressure tuning were improved in recent builds.
- Scout boss pressure was reduced so Scout remains a better practice mode.
- Boss support ship Codex destroyed counts now track correctly when those ships are actually destroyed.
- Several boss-fight and Mayhem transition checks were added to catch pacing or frame-time regressions.

## Hangar And Profile Safety

The Hangar got a substantial safety pass for old saves and repaired profile states.

- Fixed a profile repair path that could make old or rescued profiles appear to have far more ships unlocked than they really earned.
- Hangar unlock evidence is now clamped to real ranked-run progress instead of broad Codex discovery state.
- Ship unlock history/provenance is now tracked per ship.
- Hangar and Details screens now show clearer unlock and unlocked-reason text.
- Legacy unlocked ships are preserved, but profile repair no longer inflates sector/rank progress into endgame unlock status.
- The Hangar recommendation system still suggests a strong unlocked hull before launch.

## Readability And UI

Several player-facing surfaces were cleaned up for clarity.

- Enemy projectile art was refreshed so hostile shots are easier to distinguish from pickups and UI effects.
- Generated enemy projectile frames were cleaned up and scaled for better readability without changing hitboxes.
- Fast small enemy visuals were audited so their readable body better matches their collision footprint.
- How To Play screens received visual/input clarity improvements.
- UI scale and 4K layout behavior were polished across key menus.
- Near Miss feedback is clearer in-world while preserving the existing scoring behavior.
- The confusing ambient Space Tax Audit flyby was removed from active gameplay presentation.

## Audio And Personality

- Menu navigation now uses randomized boss voice barks for major menu actions.
- The old robotic menu-click feel has been reduced.
- Reinforcement warnings now use a larger mission-control voice pool.
- A local SFX refresh replaced many short effects with cleaner generated audio while keeping runtime audio local.
- Boss voice control remains available in Settings for players who prefer less voice drama.

## Performance And Stability

- Mayhem frame pacing was improved by reducing heavy summary work during active combat.
- Threat Codex persistence was adjusted to avoid heavy writes during gameplay.
- High-score chase HUD updates were throttled to reduce churn.
- Collision hot paths and diagnostics were tightened around Mayhem runs.
- Steam leaderboard retry behavior was improved for pending score submissions.
- Steam Cloud/profile checks were expanded around profile isolation, repaired saves, and packaged runtime behavior.

## Balance Notes

- Mayhem normal-wave score/XP opportunity was recalibrated in recent builds to better match the harder current ranked flow.
- Extra-life cap behavior was removed, so life pickups can keep helping beyond the old 6-life ceiling.
- Weapon powerup timers now drain while firing.
- Scout, Sector Run, and Mayhem remain separate run modes with separate pressure goals.

## Steam / Build Notes

- Steam AppID remains `4765070`.
- Windows depot remains `4765071`.
- Global leaderboard identity remains `nova_swarm_global_score_v2`.
- No save-format reset is intended.
- No achievement ID rename is intended.
- Steam Cloud profile paths are unchanged.

Thanks for all the sharp feedback. The reinforcement complaints in particular were useful: Mayhem should not feel polite. It should feel like the cabinet noticed you were getting comfortable.

Tiny Foundry

## Internal Checklist Before Publishing

- Package and upload a build from source commit `9c01587a50ffd0ec4f85652e12995b8bbb078f74` or newer before publishing this exact wording.
- Private SteamPipe BuildID `23929187` contains source commit `c3ecf49284197f72848669500631fc7c8354bb72`, including the final normal reinforcement correction back to 15%. It was uploaded with `SetLive` blank and still needs deliberate branch assignment before public release.
- Confirm the final VDF keeps `"SetLive" ""` unless intentionally assigning the build live.
- If publishing to Steam News, update the document timestamp and build note after branch assignment.
- Run at minimum `npm run check:release-line`, `npm run check:mayhem-reinforcement-waves`, `npm run build:current`, `npm run package:steam:win`, and one successful launch/smoke path for the exact package being assigned.
