# Nova Swarm Release-Candidate Review - 2026-05-16

## Verdict

Nova Swarm is now a playable, visually coherent browser arcade shooter with a much stronger first impression than the recovered baseline. It is not Steam-ready yet, but it is a credible web release-candidate build: the main menu, settings, first combat beats, mobile HUD, pause flow, generated art direction, music state, wave transition, game-over flow, boss victory path, and a 10-minute no-debug survival run all hold together in the latest checks.

## Gameplay Analysis

The first minute is understandable: start game, survive enemy waves, shoot upward, watch lives/score/level, and move into wave 2 after clearing the first formation. The compact wave briefing helps pacing by giving the player a short reward/anticipation beat instead of instantly dumping the next wave. The stronger starter shots, wider player bullets, field repair, respawn shockwave, and last-stand repair make the game feel much less brittle without removing danger.

Boss gate and victory are now materially safer than the first recovery pass: a forced boss start reaches an active boss, boss defeat pays out and shows a clean victory beat, then the game advances into level 2 wave 1 with enemies spawned. A strict no-debug run now survives the full 10-minute gate, reaches the level 5 boss, and ends alive, which is a major balance improvement over the earlier level 3-4 death spirals.

## Visual Analysis

The arctic/aurora direction is coherent across menu, gameplay, and game over. The cockpit HUD is readable on desktop and mobile, and the wave-briefing screenshot is now clean enough to read at a glance. Bullets and enemies remain visible against the dark background. Lore/flyby surfaces now default to original generated crew portraits instead of local real-person portrait assets, which is cleaner for public presentation.

Historical note: this review originally called out competing toast moments around boss defeat, sector clear, combo, and repair messages. That focused UI clutter pass was completed on 2026-05-17 in build `v2026-05-17_19-42-24`; latest current-build screenshot evidence is tracked in `release/steam-screenshots/draft-2026-05-17-current/`.

## Audio, Music, And SFX

The repo has music, SFX, stock voice clips, and the generated mission-control pack wired through the asset manifest/catalog. Music routing is now context-specific: menu, scoreboard, gameplay, boss, victory, and game over draw from separate pools. The latest smoke report confirms music is enabled, ready, and playing after user gesture/autostart in menu/settings/gameplay states, with ducking state visible in `render_game_to_text()`. It also verifies the boss theme, boss-victory stinger, and return to gameplay music after level advancement.

The follow-up audio safety pass added central SFX/voice mix defaults, verified voice fallback mappings, and made audio catalog validation part of prebuild. This catches missing files, empty music contexts, invalid mix keys, and silent legacy voice paths such as the spawn-warning `war_look_out` event.

Remaining audio risk: smoke and catalog checks can verify routing and file health, not actual human-perceived mix quality. Manual listening is still needed for menu music, gameplay music, wave clear, incoming wave, low life, boss inbound, game over, and victory levels.

## UX And Onboarding

The menu, settings overlay, pause overlay, mobile controls, gamepad controls, intro text, and first-wave objective are understandable. The mission strip now says `INCOMING WAVE 2/3` during briefing instead of `HOSTILES 0`, which removes a confusing dead-air moment. Gamepad support now covers analog/D-pad movement, fire, dodge, and pause, with a smoke-tested virtual controller path.

Remaining UX risk: tutorial and joke density should be tuned against real first-time play. The game is clearer than before, but it can still over-talk.

## Performance And Stability

Latest verified commands:

- `npm run build`
- `npm run check:audio`
- `npm run smoke`
- `npm run playtest:release`

Latest smoke output: `test-results/smoke-2026-05-16T21-21-27-136Z/`
Latest strict release playtest: `test-results/release-playtest-final-20260516-225000/`

The smoke suite covers menu, settings, desktop gameplay, gamepad movement/fire/pause, pause, generated crew flyby, forced game over, Escape return to menu, mobile intro/gameplay, level 3 debug start, forced wave transition, forced boss victory into level 2, and music-context routing. It completed with no routine console output, console errors, page errors, bad responses, or fatal overlay.

The strict no-debug release playtest survived the full 10-minute run, reached the level 5 boss, ended alive with 3 lives and score 61,890, and reported no routine console events, console warnings/errors, page errors, bad responses, request failures, or fatal overlay.

## Strengths

- Stronger coherent art direction than the original prototype-feeling baseline.
- Useful automated smoke coverage with screenshots and structured state.
- Better first-wave pacing, shooting feel, reward feedback, respawn grace, and wave-to-wave survivability.
- Original generated crew portraits now replace real-person lore/flyby defaults.
- Audio pipeline is documented and avoids storing secrets.
- Mobile layout is actively tested rather than guessed.

## Weaknesses

- Runtime production logging is now much quieter by default; remaining log risk is mostly making sure future features keep using explicit debug mode for routine telemetry.
- Manual audio mix verification remains open.
- Boss/victory flow has automated coverage and survived a natural 10-minute bot run, but it still needs a normal-skill human playthrough.
- Steam readiness is blocked by polish, store-page copy/assets review, input feel, and longer-session balance.

## Steam Readiness Assessment

Not ready for Steam release. Much closer to a polished web release candidate. A credible next Steam-oriented milestone would require a human 10-15 minute playthrough review, audio mix pass, and a clear store positioning pass.

## Concrete Next Improvements

- Manual playtest a natural run through boss gate, boss defeat, level advance, game over, restart, and return-to-menu.
- Tune audio mix by ear on desktop speakers/headphones.
- Keep production routine console output at zero in smoke while preserving warnings/errors.
- Keep monitoring UI/text density during human playthrough; the automated focused clutter pass is complete, but first-time feel still needs human approval.
- Decide whether last-stand repair and wave repair are tuned generously enough for fun without making late survival feel automatic.
