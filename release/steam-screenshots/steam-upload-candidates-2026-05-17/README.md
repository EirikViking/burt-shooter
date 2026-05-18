# Nova Swarm Steam Screenshot Upload Candidates

Curated on 2026-05-18 from the current release-build capture in `release/steam-screenshots/draft-2026-05-17-current/`.

Source deployment:
- `https://burt.tinyfoundry.app`

Candidate set:
- `01-first-wave-gameplay.png` - readable active wave combat from the release build.
- `02-midgame-swarm-escalation.png` - denser level-three swarm action and combo feedback.
- `03-boss-fight.png` - active boss pattern and HUD readability.
- `04-boss-inbound.png` - boss warning/arcade-comedy setup.
- `05-boss-victory.png` - boss defeat payoff and score reward.
- `06-game-over-score-flow.png` - restart/high-score flow.
- `07-ship-select-variety.png` - ship selection, hangar backdrop, and variant breadth.
- `08-story-intro-cinematic.png` - optional story intro art and public arcade premise.

Excluded from this upload shortlist:
- `02-main-menu.png` - useful identity proof, but less valuable as a Steam screenshot than actual play.
- `05-wave-clear-briefing.png` - representative, but less valuable than the denser midgame and boss shots.

Review evidence:
- `steam_upload_candidate_sheet.png`

Notes:
- All candidates are `1280x720`.
- Source `report.json` had zero console events, page errors, and bad network responses.
- Source `report.json` records build `v2026-05-18_21-29-14`, matching `public/version.json` at capture time.
- Boss and wave-transition captures include the quieter message-focus timing, later score-flow/reward cleanup, generated hijacker art, tractor-beam mechanic, and the current arcade typography pass.
- The midgame and boss shots use deterministic debug routes for repeatable store-candidate capture; they still render the actual runtime UI, sprites, backgrounds, and effects.
- Final upload still needs user approval inside Steamworks.
