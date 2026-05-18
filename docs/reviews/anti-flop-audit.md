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

## Loop 3 - Store Screenshot First Impression

### What Was Tested

- Reviewed the Steam screenshot upload candidate contact sheet as a store-page first impression.
- Visually inspected `release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png`.
- Ran `npm run audit:release-readiness`.

### What Felt Slow, Confusing, Or Generic

- The screenshot shortlist still led with story intro and ship select. Those are useful supporting shots, but they make the store page feel lore/menu-first instead of action-first.

### What Changed

- Reordered the 8-shot Steam upload shortlist to lead with actual gameplay, midgame swarm pressure, boss fight, boss warning, boss victory, and score-flow evidence.
- Moved ship select and story intro to the last two supporting slots.
- Regenerated the upload contact sheet and updated the README candidate order.

### Before And After Feel

Before: the first two screenshot impressions were cinematic/menu context.

After: the first screenshot impression is readable shooting, enemies, score, HUD, and arcade motion.

### Evidence Captured

- Updated screenshot sheet: `release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png`.
- Candidate README: `release/steam-screenshots/steam-upload-candidates-2026-05-17/README.md`.
- Release audit: `docs/reviews/release-readiness-audit-2026-05-17.json`, automated gates pass with only the three known manual blockers.

### Remaining Top Risks

- Final human screenshot approval is still needed.
- Steam page capsule/trailer/screenshot ordering should be reviewed together before upload.
- The first gameplay screenshot is readable, but a future capture could be even more explosive if it catches a pickup/explosion within the same frame.

## Loop 4 - Store Copy And Tag Focus

### What Was Tested

- Reviewed `release/steamworks/store_metadata_draft.json` against the anti-flop positioning rules.
- Compared current tags against `docs/steam/anti-flop-store-plan.md`.
- Ran `npm run check:steam-store`.

### What Felt Slow, Confusing, Or Generic

- The Steam tag list still included broad identity-diluting tags like `Casual`, `Colorful`, `Family Friendly`, `Sci-fi`, and `Old School`.
- Store copy mentioned "generated key art", which is accurate internally but a weak public-facing signal for a Steam page.
- The short description did not lead with the preferred "fast modern arcade score-chaser" positioning.

### What Changed

- Short and long Steam descriptions now lead with "fast modern arcade score-chaser".
- Store-facing copy now avoids generated/AI-ish wording, clone references, and lore-first framing.
- Tags are restricted to the focused arcade/action set: Arcade, Shoot 'Em Up, Space, Bullet Hell, Action, Singleplayer, Controller, 2D, Score Attack, Retro, Indie.
- The Steam metadata checker now rejects diluted tags, unsupported tags, over-broad tag counts, and forbidden public marketing terms.

### Before And After Feel

Before: the store draft sounded polished but a bit broad, with tags that could bury the game under generic nostalgia/casual signals.

After: the store draft sells a focused score-chaser with bosses, readable swarms, quick restarts, and arcade flow.

### Evidence Captured

- Store metadata draft: `release/steamworks/store_metadata_draft.json`.
- Store validator: `scripts/check-steam-store-metadata.mjs`.
- Store plan: `docs/steam/anti-flop-store-plan.md`.
- Steam store check: `npm run check:steam-store` passed with 11 tags, 8 bullets, and Partial Controller Support.

### Remaining Top Risks

- Final human store-copy approval is still required.
- Bullet Hell remains in the tag set only while captured patterns stay fair/readable; if later boss patterns get noisier, remove that tag.
- Steam client validation still needs the real uploaded build before controller-support wording can be upgraded.

## Loop 5 - Close-Dodge Score Feel

### What Was Tested

- Played the current build through the focused danger-dodge automation.
- Ran the standard local smoke path after the gameplay change.
- Visually inspected `test-results/danger-dodge-2026-05-18T15-30-48-705Z/danger-dodge.png`.

### What Felt Slow, Confusing, Or Generic

- Near-miss dodges were worth points, but the feedback was too modest for a modern score-chaser.
- Repeated near-miss score popups reused the kill-combo renderer, so the screen could show `COMBO!` when the player had actually chained dodges.

### What Changed

- Close dodges now chain into a short `DANGER DODGE` streak with escalating score rewards.
- The active ship trait's near-miss multiplier is included in the danger-dodge score.
- Near misses create a dedicated spark/ring effect at the player, with stronger color on higher streaks.
- The score popup manager now supports non-combo score popups, so dodge bonuses render as readable bonus points instead of fake kill combos.
- `render_game_to_text` exposes danger-dodge score/streak telemetry for future checks.
- Added `npm run check:danger-dodge`.

### Before And After Feel

Before: dodging close to bullets was lightly acknowledged and easy to miss.

After: close dodges create visible score pressure and a clearer "one more run" skill expression without adding menu friction or visual clutter.

### Evidence Captured

- Focused danger-dodge check: `test-results/danger-dodge-2026-05-18T15-30-48-705Z/`.
- Local smoke: `test-results/smoke-2026-05-18T15-32-38-023Z/`.
- Current build: `v2026-05-18_17-25-21`.

### Remaining Top Risks

- Danger-dodge feedback should be watched during real play so it does not distract from hazards.
- The first 10 seconds are stronger, but movement/shooting/audio punch can still be polished further.
- Current build still needs deployment and refreshed release evidence before it can replace the prior release-candidate evidence.

## Loop 6 - Steam Hit Gap Research And Game-Over Motivation

### What Was Tested

- Live Steam comparable research for fixed shooters, retro shmups, score-attack shooters, and modern arcade hybrids.
- Store/page critique from the current Steam metadata, screenshot shortlist, trailer report, and marketing site.
- Game-feel audit focused on first-session compulsion, readability, boss proof, and controller expectations.
- Fresh local and live smoke paths after the gameplay/copy changes.

### What Felt Slow, Confusing, Or Generic

- The strongest market lesson is that "retro homage" is not enough. The game needs a visible modern compulsion engine.
- The game-over screen did not clearly cash out next-ship progress or make gamepad retry obvious.
- HUD mission text used `SHOTS` for active enemy bullets, which could be mistaken for player shots.
- The Steam metadata still carried `Bullet Hell`, a risky tag while boss/bullet footage is not yet dense-pattern proof.
- The marketing proof strip said `Controller Ready`, which was louder than the current Steam-client validation evidence.

### What Changed

- Added `docs/steam/galaga-space-invaders-failure-research.md` with a 30-title Steam comparable matrix and Nova Swarm implications.
- Added `docs/reviews/steam-hit-gap-audit.md` with blunt 0-10 scores and the top five highest-impact changes.
- Game over now shows new/next ship unlock motivation, exact remaining score/rank need, and `GAMEPAD A` retry copy.
- Game over now accepts gamepad A/right trigger as a restart input.
- `render_game_to_text` exposes game-over score, level, prompt, state, and unlock summary for automation.
- HUD mission status now says `THREATS` for active enemy bullets.
- Removed `Bullet Hell` from the first Steam metadata tag set.
- Marketing site proof strip now says `Gamepad-Friendly` instead of `Controller Ready`.
- Added `npm run check:gameover-motivation`.

### Before And After Feel

Before: death was functional, but it did not make the next run feel materially tempting unless the player already understood unlock thresholds.

After: death now creates a concrete "one more run" reason: unlock the next ship, retry instantly, or go to the hangar from the menu.

### Evidence Captured

- Focused game-over check: `test-results/gameover-motivation-2026-05-18T16-57-59-839Z/`.
- Local smoke: `test-results/smoke-2026-05-18T16-58-04-809Z/`.
- Live smoke: `test-results/smoke-2026-05-18T17-00-26-121Z/`.
- Full Steam RC: `test-results/steam-rc-verify-2026-05-18T17-22-27-089Z/report.json`.
- Packaged controls: `test-results/packaged-control-smoke-2026-05-18T17-24-33-047Z/report.json`.
- Final release audit: `docs/reviews/release-readiness-audit-2026-05-17.json`.
- Live deployment: `https://burt.tinyfoundry.app`, build `v2026-05-18_18-57-39`.
- Marketing site remains live at `https://burt.tinyfoundry.app/nova-swarm/`.

### Remaining Top Risks

- The first 10 seconds of the trailer still need earlier boss proof.
- Boss regular attack telegraphs need a stronger readability pass.
- Steam client validation and human approvals remain manual blockers.
