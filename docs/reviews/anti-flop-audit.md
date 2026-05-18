# Anti-Flop Ralph Audit

## Loop 1 - Quick Arcade Flow

### What Was Tested

- Inspected the current main menu and game-over flow from the perspective of a classic arcade score-chaser player.
- Confirmed the existing build already boots to the main menu with the story intro optional.
- Confirmed generated roster checks and prior smoke/playtest evidence existed before changing this loop.
- Ran `npm run build` on build `v2026-05-18_16-03-56`.
- Ran `npm run smoke` at `test-results/smoke-2026-05-18T14-04-37-510Z/` with zero console warnings, page errors, or bad responses.
- Ran a focused Chrome timing check at `test-results/anti-flop-quickstart-20260518-final/`.

### What Felt Slow, Confusing, Or Generic

- The primary menu button still sent players into ship selection instead of immediate gameplay, making the first action feel like browsing a collection rather than chasing a score.
- The large ship roster risked reading as menu bloat because ship select sat on the main play path.
- Game over explained only how to return to menu; it did not advertise or support the expected one-input "one more run" restart.

### What Changed

- Main menu primary action is now `PLAY NOW`, starting a run immediately with the last unlocked selected ship or the starter ship.
- Ship browsing moved to the secondary `SHIP HANGAR` action, so the collection supports the arcade loop instead of blocking it.
- Highscores remain on the main menu, while the optional story intro stays available through the Navigator card.
- Game over now supports `R` or `Space` for immediate restart and labels the shortcut on screen.

### Before And After Feel

Before: the fastest visible path encouraged menu browsing before play, and a failed run sent the player back through menu friction.

After: the player can boot, hit `PLAY NOW`, fail, and press one key for another run. Ship variety becomes a reward surface, not the first-run tax.

### Evidence Captured

- Build: `v2026-05-18_16-03-56`.
- Smoke: `test-results/smoke-2026-05-18T14-04-37-510Z/report.json`.
- Timing report: `test-results/anti-flop-quickstart-20260518-final/report.json`.
- Screenshot evidence: `01-menu-play-now.png`, `02-quickstart-gameplay.png`, `03-gameover-restart-prompt.png`, and `04-restarted-gameplay.png` in the focused timing folder.
- Result: `PLAY NOW` click to gameplay in 123 ms; `R` restart from game over to gameplay in 68 ms; zero console events.

### Remaining Top Risks

- Trailer and screenshot capture need a fresh current-build pass showing gameplay in the first frame.
- Boss telegraphs need continued screenshot-by-screenshot readability review after the new enemy roster changes.
- The ship hangar still needs human review to ensure 25 ships feel exciting rather than spreadsheet-like.
- Final Steam-client validation cannot be completed until real Steamworks app/depot IDs and upload/install evidence exist.
- Store copy must continue avoiding nostalgia-clone framing and content-count overpromising.
