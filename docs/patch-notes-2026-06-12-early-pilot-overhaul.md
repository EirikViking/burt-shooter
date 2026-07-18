# Nova Swarm Early Pilot Overhaul Patch Notes

Draft date: 2026-06-12  
Status: repo draft only. Do not post publicly until Steamworks preview is explicitly approved.

## Headline

Nova Swarm got brighter, louder, stranger, and more replayable after early pilot feedback. The update keeps the fast arcade spine intact while adding more readable chaos, longer progression, stronger Codex coverage, and a much better runback loop.

## Gameplay

- Boss 1 is now Sonia and boss 3 is now KurtBossEdgar across UI, dialogue, Codex, announcements, and tests.
- Sector Start "One more run" restarts from the same Sector Start checkpoint instead of dropping back to Sector 1.
- Boss fights can spawn 111 distinct support ship profiles that help bosses survive.
- Boss support ships are readable, bright, and fair: they force priority decisions without cheap contact frustration.
- Added 1,423 additional unique generated enemy profiles available from level 1.
- Added 177 additional mayhem enemy profiles that enter after level 10 without directly increasing difficulty.
- The existing 58 dangerous mid-ship variants still appear after sector 8, between normal enemies and elites.
- Added ten lightweight in-run easter eggs with animated signal flybys and localized joke banners.
- Removed the duplicate combo score/readout from gameplay.
- Removed the Windows exit confirmation dialog.

## Progression

- Leaderboards support Top 40 everywhere. Top 10 results get stronger ceremony treatment, extra visual energy, and dedicated fanfare audio.
- Added 20 very hard ranks, extending the pilot ladder to 40 total ranks.
- Added rank lore and Codex coverage for every pilot rank.
- Pilot rank entries now hydrate correctly in the Codex from the live run state.
- Added the Early Pilot achievement with safe startup backfill for players who already have ranked-run progress.
- The Hangar recommends the best unlocked ship before Launch Run so new hulls are harder to miss.

## Audio And Visuals

- Replaced the jokey boss death voice pack with 100 ElevenLabs male agony death voices.
- Boss death runtime now picks a random `boss_death_agony_###.mp3` line.
- Added 200 randomized level-clear voice lines.
- Added new SFX coverage for fuel/support ships, dangerous mid-ships, Top 10 runs, boss deaths, menu animation polish, and easter-egg signals.
- Music was not replaced or altered.
- Added generated rank badge art for all 40 ranks.
- Added Early Pilot and hard-rank Steam achievement icons.
- The How to Play screen was rebuilt as a cleaner high-tech overlay with better spacing, readable cards, animation, and SFX.
- Menus now have broader sci-fi animation/SFX polish.
- The fullscreen option was removed from Settings.
- The main menu now explains Launch Run vs Sector Start.

## Codex

- Added Codex coverage for 111 boss support ship profiles.
- Added Codex coverage for the generated enemy expansion.
- Added live pilot-rank hydration so the Pilot Ranks tab does not appear empty when the player already has rank progress.
- Sonia has extended sci-fi romance lore.
- KurtBossEdgar has extended Jeppe paa Berget-inspired lore.

## Suggested Screenshot / Art Paths

- How to Play polish: `test-results/how-to-play-2026-06-12T16-35-06-026Z/menu-how-to-play.png`
- One More Run result screen: `test-results/gameover-motivation-2026-06-12T16-38-09-929Z/gameover-runback.png`
- Game Over motivation proof: `test-results/gameover-motivation-2026-06-12T16-38-09-929Z/gameover-motivation.png`
- Boss agony runtime proof: `test-results/boss-death-voice-runtime-2026-06-12T16-33-41-898Z/boss-death-voice-runtime.png`
- Sector Start menu explainer: `test-results/sector-start-menu-layout-2026-06-12T16-37-07-609Z/sector-start-menu-desktop.png`
- Top 40 leaderboard desktop: `test-results/leaderboard-visuals-2026-06-12T11-41-16-481Z/leaderboard-desktop.png`
- Top 40 leaderboard mobile legacy capture: `test-results/leaderboard-visuals-2026-06-12T11-41-16-481Z/leaderboard-mobile.png`
- Final rank badge: `public/art/generated/nova-swarm/ranks/nova-rank-badge-39-20260612.png`
- Early Pilot icon: `release/steamworks/achievement-icons/ACH_EARLY_PILOT-achieved.jpg`

## Notes

Steamworks achievement setup for `ACH_EARLY_PILOT` may require manual app-admin entry before live Steam unlock validation. See `docs/steam/early-pilot-achievement-steamworks-2026-06-12.md`.
