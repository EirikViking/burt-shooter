# Nova Swarm Early Pilot Overhaul Patch Notes

Draft date: 2026-06-12  
Status: repo draft only. Do not post publicly until Steamworks preview is explicitly approved.

## Headline

Nova Swarm got meaner, brighter, louder, and smarter after early pilot feedback. The game keeps the same fast arcade spine, but the late run now has sharper threats, bigger boss payoffs, stronger leaderboards, and a much longer rank chase.

## Gameplay

- Boss 1 is now Sonia and boss 3 is now KurtBossEdgar across UI, dialogue, Codex, announcements, and tests.
- Sector Run "One more run" now restarts from the same Sector Start checkpoint instead of dropping back to Sector 1.
- Boss Fuel Ships can appear during boss fights. They are bright, unarmed, readable support ships that heal the boss if they reach it. Intercepting them pops cleanly and does not punish the player with cheap contact damage.
- Added 58 dangerous mid-ship variants that start appearing after sector 8, sitting between normal enemies and elites.
- Every boss death now has a more distinct celebration, with archetype-specific visuals and SFX.
- The Windows exit confirmation dialog was removed completely.

## Progression

- Leaderboards now support Top 40 everywhere. Top 10 results get stronger ceremony treatment, extra visual energy, and a dedicated fanfare.
- Added 20 very hard ranks, extending the rank ladder to 40 total ranks and ending at Heat-Death Champion.
- Added rank lore and Codex coverage for every pilot rank.
- Added the Early Pilot achievement with safe startup backfill for players who already have ranked-run progress.

## Audio And Visuals

- Added new ElevenLabs SFX for Top 10 fanfare, fuel ships, dangerous mid-ships, and unique boss-death moments.
- Music was not replaced or altered.
- Added generated rank badge art for all 40 ranks.
- Added Early Pilot and hard-rank Steam achievement icons.
- Tightened leaderboard UI into a readable desktop Top 40 grid while keeping mobile focused.

## Suggested Screenshot / Art Paths

- Top 40 leaderboard desktop: `test-results/leaderboard-visuals-2026-06-12T11-41-16-481Z/leaderboard-desktop.png`
- Top 40 leaderboard mobile: `test-results/leaderboard-visuals-2026-06-12T11-41-16-481Z/leaderboard-mobile.png`
- Number-one ceremony: `test-results/gameover-ceremony-1781264727339/number-one.png`
- Top-three ceremony: `test-results/gameover-ceremony-1781264727339/top-three.png`
- Global-slot ceremony: `test-results/gameover-ceremony-1781264727339/global-slot.png`
- Near-global ceremony: `test-results/gameover-ceremony-1781264727339/near-global.png`
- In-game final death transition: `test-results/gameover-ceremony-1781264727339/in-game-final-death.png`
- Final rank badge: `public/art/generated/nova-swarm/ranks/nova-rank-badge-39-20260612.png`
- Early Pilot icon: `release/steamworks/achievement-icons/ACH_EARLY_PILOT-achieved.jpg`

## Notes

Steamworks achievement setup for `ACH_EARLY_PILOT` may require manual app-admin entry before live Steam unlock validation. See `docs/steam/early-pilot-achievement-steamworks-2026-06-12.md`.
