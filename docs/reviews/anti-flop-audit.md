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
- Production: deployed to Cloudflare Pages at `https://b01166ed.burt-game.pages.dev`; `https://burt.tinyfoundry.app/version.json` reports `v2026-05-18_16-03-56`.
- Live smoke: `test-results/smoke-live-anti-flop-2026-05-18T16-03/report.json`.
- Live deployment report: `release/steamworks/live_deployment_report.json`.

### Remaining Top Risks

- Trailer and screenshot capture need a fresh current-build pass showing gameplay in the first frame.
- Boss telegraphs need continued screenshot-by-screenshot readability review after the new enemy roster changes.
- The ship hangar still needs human review to ensure 25 ships feel exciting rather than spreadsheet-like.
- Final Steam-client validation cannot be completed until real Steamworks app/depot IDs and upload/install evidence exist.
- Store copy must continue avoiding nostalgia-clone framing and content-count overpromising.

## Loop 2 - Trailer First Seconds And RC Evidence

### What Was Tested

- Inspected the refreshed Steam trailer candidate contact sheet after the quick-play deployment.
- Ran `npm run check:provenance`.
- Ran full `npm run verify:steam-rc -- --full`.
- Regenerated `npm run check:full-rc`, `npm run steamworks:payload-manifest`, `npm run steamworks:human-review`, `npm run steamworks:client-preflight`, and `npm run steamworks:handoff`.
- Ran final `npm run audit:release-readiness`.

### What Felt Slow, Confusing, Or Generic

- The first trailer candidate technically started on gameplay, but the opening seconds were too quiet: player and HUD were visible before enemies and shots became exciting.
- Current-build screenshot and trailer evidence had been captured, but some release handoff pointers still referenced older "current" folders.

### What Changed

- Steam trailer visual capture now opens with gameplay beats before menu or ship-select beats.
- The trailer audio renderer trims the pre-wave visual setup so the candidate starts with visible enemies, player fire, HUD, and score pressure.
- The trailer candidate renderer now uses the latest draft automatically and keeps the candidate gameplay-first with only an end card.
- Release audit trailer rules now match the anti-flop trailer target: 30-45 seconds, H.264/AAC, gameplay-first, and no logo/lore/menu lead.
- Refreshed the current screenshot evidence folder and the 8-shot Steam upload shortlist from build `v2026-05-18_16-03-56`.

### Before And After Feel

Before: the trailer opened like valid footage but not like a sale-making arcade clip.

After: the first contact-sheet frame already shows active swarm pressure, player shots, score, HUD, and readable playfield action.

### Evidence Captured

- Screenshot capture: `release/steam-screenshots/draft-2026-05-18-16-21/report.json`.
- Current screenshot shortlist: `release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png`.
- Trailer visual draft: `release/steam-trailer/draft-2026-05-18-16-31/report.json`.
- Trailer candidate: `release/steam-trailer/candidate-2026-05-17-current/nova-swarm-steam-trailer-candidate.mp4`.
- Trailer contact sheet: `release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png`.
- Full RC verification: `test-results/steam-rc-verify-2026-05-18T14-39-30-815Z/report.json`.
- Release playtest: `test-results/release-playtest-2026-05-18T14-43-45-584Z/report.json`, survived 599,901 ms, reached level 7, ended alive with score 69,471, and reported zero console/page/network failures.
- Final release audit: `docs/reviews/release-readiness-audit-2026-05-17.json`, all automated gates pass; remaining blockers are Steamworks IDs, real Steam-client validation, and human approval.

### Remaining Top Risks

- Real Steamworks app/depot IDs and upload/install validation remain manual blockers.
- Human by-ear trailer/audio approval is still required before store upload.
- Steam screenshot shortlist is technically current and readable, but still needs human taste approval for the actual store page.
- The trailer is now anti-flop compliant on opening action, but a final human trailer edit could still improve punch and brand polish.
- Continued gameplay polish should focus on boss telegraph readability and first-run "one more run" feel rather than more content-count expansion.
