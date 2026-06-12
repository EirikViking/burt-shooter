# Steam Forum Draft: Early Pilot Overhaul Notes

Status: draft only. Do not post publicly without explicit Steamworks preview approval.

## Subject

Early Pilot Overhaul feedback thread

## Post

Thanks to everyone who played early and sent notes. This build is focused on making the run feel bigger without turning the screen into unreadable soup.

Main changes:

- Top 40 leaderboards are now supported throughout the game.
- Top 10 placements get stronger ceremony visuals and a new fanfare.
- Boss fights can spawn Fuel Ships. They are bright support ships that heal the boss if they reach it.
- Fuel Ships are intentionally unarmed and readable; intercepting them is the skill check.
- 58 dangerous mid-ship variants now appear after sector 8.
- Boss deaths now have more distinct visuals and audio by archetype.
- Boss 1 is now Sonia. Boss 3 is now KurtBossEdgar.
- Sector Run "One more run" now restarts from the same sector.
- The Windows exit confirmation dialog was removed.
- 20 new hard ranks were added, for 40 total ranks.
- The Codex now covers Fuel Ships, dangerous mid-ships, and pilot ranks.
- A new Early Pilot achievement is implemented in code with safe backfill for existing players.

Known setup note:

The Early Pilot achievement requires the Steamworks app-admin achievement entry before live Steam unlock validation can be considered complete. The game code and icon assets are ready.

Feedback I am especially watching for:

- Are Fuel Ships fair under boss pressure?
- Do the dangerous mid-ships feel readable after sector 8?
- Does Top 40 feel dense but still clean?
- Do any localized screens clip or show untranslated text?

Suggested screenshot paths for forum/media review:

- `test-results/leaderboard-visuals-2026-06-12T11-41-16-481Z/leaderboard-desktop.png`
- `test-results/leaderboard-visuals-2026-06-12T11-41-16-481Z/leaderboard-mobile.png`
- `test-results/gameover-ceremony-1781264727339/top-three.png`
- `test-results/gameover-ceremony-1781264727339/global-slot.png`
