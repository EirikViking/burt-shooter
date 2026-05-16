# Burt Shooter Release-Candidate Review - 2026-05-16

## Verdict

Burt Shooter is now a playable, visually coherent browser arcade shooter with a much stronger first impression than the recovered baseline. It is not Steam-ready yet, but it is moving into release-candidate territory for a web build: the main menu, settings, first combat beats, mobile HUD, pause flow, generated art direction, music state, wave transition, game-over flow, and boss victory path all hold together in the latest checks.

## Gameplay Analysis

The first minute is understandable: start game, survive enemy waves, shoot upward, watch lives/score/level, and move into wave 2 after clearing the first formation. The new compact wave briefing helps pacing by giving the player a short reward/anticipation beat instead of instantly dumping the next wave. The first-wave `+500` reward is a small but important morale fix.

Boss gate and victory are now materially safer than the first recovery pass: a forced boss start reaches an active boss, boss defeat pays out and shows a clean victory beat, then the game advances into level 2 wave 1 with enemies spawned. The current game still has enough systems that balance could become noisy if every joke, powerup, voice line, particle burst, and formation fires at once.

## Visual Analysis

The arctic/aurora direction is coherent across menu, gameplay, and game over. The cockpit HUD is readable on desktop and mobile, and the wave-briefing screenshot is now clean enough to read at a glance. Bullets and enemies remain visible against the dark background.

Remaining visual risk: some legacy text/toast moments still compete for attention, especially corner barks. Boss labels, level intro wording, game over, and wave transitions are cleaner now, but before a public release the game should still get one focused UI clutter pass with screenshots from the first five minutes.

## Audio, Music, And SFX

The repo has music, SFX, stock voice clips, and the generated mission-control pack wired through the asset manifest/catalog. Music routing is now context-specific: menu, scoreboard, gameplay, boss, victory, and game over draw from separate pools. The latest smoke report confirms music is enabled, ready, and playing after user gesture/autostart in menu/settings/gameplay states, with ducking state visible in `render_game_to_text()`. It also verifies the boss theme, boss-victory stinger, and return to gameplay music after level advancement.

Remaining audio risk: smoke can verify playback state, not actual human-perceived mix quality. Manual listening is still needed for menu music, gameplay music, wave clear, incoming wave, low life, boss inbound, game over, and victory levels.

## UX And Onboarding

The menu, settings overlay, pause overlay, mobile controls, intro text, and first-wave objective are understandable. The mission strip now says `INCOMING WAVE 2/3` during briefing instead of `HOSTILES 0`, which removes a confusing dead-air moment.

Remaining UX risk: tutorial and joke density should be tuned against real first-time play. The game is clearer than before, but it can still over-talk.

## Performance And Stability

Latest verified commands:

- `npm run build`
- `npm run smoke`

Latest smoke output: `test-results/smoke-2026-05-16T16-52-18-297Z/`

The smoke suite covers menu, settings, desktop gameplay, pause, mobile intro/gameplay, level 3 debug start, forced wave transition, forced boss victory into level 2, and music-context routing. It completed with no routine console output, console errors, page errors, bad responses, or fatal overlay. Separate manual automations forced game over and boss victory; game over returned to menu with Escape, and boss victory advanced to level 2 active gameplay with no console or page errors.

## Strengths

- Stronger coherent art direction than the original prototype-feeling baseline.
- Useful automated smoke coverage with screenshots and structured state.
- Better first-wave pacing and reward feedback.
- Audio pipeline is documented and avoids storing secrets.
- Mobile layout is actively tested rather than guessed.

## Weaknesses

- Runtime production logging is now much quieter by default; remaining log risk is mostly making sure future features keep using explicit debug mode for routine telemetry.
- Manual audio mix verification remains open.
- Boss/victory flow has automated coverage now, but it still needs a normal-skill human playthrough rather than only debug-forced defeat.
- Steam readiness is blocked by polish, store-page copy/assets review, input feel, and longer-session balance.

## Steam Readiness Assessment

Not ready for Steam release. Closer to a polished web release candidate. A credible next Steam-oriented milestone would require a full 10-15 minute playthrough review, audio mix pass, and a clear store positioning pass.

## Concrete Next Improvements

- Manual playtest a natural run through boss gate, boss defeat, level advance, game over, restart, and return-to-menu without debug-forced boss damage.
- Tune audio mix by ear on desktop speakers/headphones.
- Keep production routine console output at zero in smoke while preserving warnings/errors.
- Do one UI/text clutter pass across the first five minutes.
- Add one smoke scenario for game-over/restart once it can be made deterministic.
