# Overnight Steam Game Polish - 2026-05-20

Branch: `ralph/steam-game-polish-20260520`

Scope: game only. No Steam store copy, pricing, capsule art, publishing, or marketing changes were intentionally made for this pass.

## Starting State

- Started from `main` with an already-dirty worktree from a previous prompt.
- Old uncommitted game changes were inspected before use. The source-side leftovers around voice cadence, game-over timeout cleanup, and ship-intro cleanup were game-relevant and were verified in this run. Old release/trailer/store artifacts were left unstaged.
- Baseline build/smoke/audio/desktop/screenshot commands were run before new code changes. The strongest baseline red flags were menu start friction, first-run powerup delay, voice audit blind spots, starfield/boss-warning visual competition, an occasional level-complete stall, and early-boss survival volatility.

## Web Research Pre-Mortem

Sources reviewed:

- [Brotato negative reviews](https://steamcommunity.com/app/1942280/negativereviews/?browsefilter=toprated)
- [Brotato positive reviews](https://steamcommunity.com/app/1942280/positivereviews/?browsefilter=toprated)
- [Vampire Survivors reviews](https://steamcommunity.com/app/1794680/reviews/?browsefilter=toprated)
- [Nova Drift reviews/community page](https://steamcommunity.com/app/858210/reviews/?browsefilter=toprated)
- [Bullet Soul reviews](https://steamcommunity.com/app/544580/reviews/?browsefilter=toprated)

If Nova Swarm gets Mixed/Negative reviews, the most likely game-side reasons are:

- First session friction: unclear start inputs or too much pre-run UI before the player feels the ship.
- Fairness complaints: boss pressure or enemy spawns feeling like unavoidable one-hit chaos.
- Readability complaints: bullets, stars, telegraphs, score popups, and rewards competing in the same brightness band.
- "Samey run" complaints: the first minute failing to show a strong power moment or risk-reward hook.
- Straggler/stall complaints: a run waiting on a hidden or awkward leftover threat after the player already feels the wave is over.
- Audio fatigue: voice lines repeating before they feel like personality.
- Weak restart motivation: game-over messaging overpromising, confusing local/global boards, or failing to make the next run feel close.

Design lessons applied: keep controls immediate, show a treat quickly, make boss danger readable before damage, avoid empty waiting, use score-chase flavor without fake claims, and preserve the arcade "one more run" pulse over heavy systems.

## Baseline Scorecard

| Area | Baseline |
| --- | ---: |
| First click to gameplay speed | 7 |
| First 10 seconds clarity | 6 |
| First 45 seconds excitement | 6 |
| Control feel | 7 |
| Shooting feel | 7 |
| Enemy hit/death feedback | 7 |
| Player death fairness/readability | 6 |
| Powerup desirability | 5 |
| Boss anticipation and payoff | 6 |
| Visual readability at 1280x720 | 6 |
| Screenshot appeal | 6 |
| Audio/music energy | 7 |
| Announcer charm without repetition | 6 |
| Restart loop | 7 |
| High-score motivation | 6 |
| Controller/gamepad readiness | 6 |
| Desktop/Electron stability | 7 |
| Performance | 7 |
| Overall one-more-run pull | 6 |

## Changes Made

- Menu start flow: Enter, Space, and gamepad action now quick-launch from the main menu; button labels fit instead of clipping in screenshot capture.
- First-run hook: the first level now drops a curated `rapid_fire` core after three kills, with a short corner callout.
- First-run noise control: story/lore popups wait longer after appearing, so they do not pile onto the first danger.
- Dodge readability: PlayScene no longer forces player alpha back to `1` during dodge/invulnerability/ghost states.
- Visual readability: starfield specks are dimmer/bluer, reserving bright white-green attention for bullets, ships, and rewards.
- Boss readability/fairness: big boss telegraphs are less visually muddy, early boss projectile pressure ramps more gently, and regular attack warnings last longer through level 6.
- Boss clutch fairness: early bosses can grant one low-life clutch shield core per level, preventing abrupt first-session boss walls without adding meta-progression.
- Level-complete flow: bonus, boss-add, and hijacker/cabinet-core leftovers no longer block sector progression after the existing cleanup grace window.
- Audio cadence: launch/restart chatter is event-cooled, boss-inbound and victory lines can cut through the global cooldown, and the audio audit now verifies all manifest voice assets.
- Game-over truthfulness: an empty/offline global board now shows local-board status instead of fake "NUMBER ONE" celebration.
- QA gates: added first-30 polish check, voice cadence check, release-playtest dodge behavior, and a sector-clear stall detector.

## Final Scorecard

| Area | Final |
| --- | ---: |
| First click to gameplay speed | 9 |
| First 10 seconds clarity | 8 |
| First 45 seconds excitement | 8 |
| Control feel | 8 |
| Shooting feel | 8 |
| Enemy hit/death feedback | 7 |
| Player death fairness/readability | 8 |
| Powerup desirability | 8 |
| Boss anticipation and payoff | 8 |
| Visual readability at 1280x720 | 8 |
| Screenshot appeal | 8 |
| Audio/music energy | 8 |
| Announcer charm without repetition | 8 |
| Restart loop | 8 |
| High-score motivation | 7 |
| Controller/gamepad readiness | 8 |
| Desktop/Electron stability | 8 |
| Performance | 8 |
| Overall one-more-run pull | 8 |

Biggest scorecard movement: first 30 seconds, powerup desirability, visual readability, boss fairness, audio/personality cadence, restart/high-score honesty, and stability gates.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm install` | Pass | up to date; npm reported 5 moderate vulnerabilities |
| `npm run build` | Pass | final desktop-triggered build `v2026-05-20_01-51-39` |
| `npm run smoke` | Pass | `test-results/smoke-2026-05-19T23-50-24-360Z/report.json`; 0 console warnings/errors |
| `npm run playtest:release` | Pass | `test-results/release-playtest-2026-05-19T23-39-32-023Z/report.json`; 599878 ms survived, peak level 11, no sector-clear stalls, 0 page/console/request errors |
| `npm run check:audio` | Pass | 176 manifest assets, 99 catalog keys, 7 music contexts |
| `npm run audit:audio-mix` | Pass | 151 files measured; 26 music, 121 SFX, 51 voice rows; no warnings |
| `npm run check:announcer-voice` | Pass | 22 event pools, 51 manifest voice assets |
| `npm run check:voice-cadence` | Pass | `test-results/voice-cadence-2026-05-19T23-49-52-611Z/voice-cadence.png` |
| `npm run check:first-30-polish` | Pass | `test-results/first-30-polish-2026-05-19T23-49-52-605Z/report.json` |
| `npm run desktop:smoke` | Pass | `test-results/electron-smoke-2026-05-19T23-52-04-585Z/report.json`; Electron deprecation warning only |
| `npm run capture:steam-screenshots` | Pass | `release/steam-screenshots/draft-2026-05-20-01-52/` |

Notes:

- A parallel screenshot capture failed once while desktop smoke was rebuilding the app. Rerunning capture by itself passed.
- Release playtest initially exposed a sector-clear hijacker stall and intermittent level-6 boss death. Both were fixed, then the full 10-minute release playtest passed.
- No external audio generation or image generation was used in this pass. No new asset provenance issue was introduced.

## Artifacts

- Final screenshot set: `release/steam-screenshots/draft-2026-05-20-01-52/`
- Release playtest report: `test-results/release-playtest-2026-05-19T23-39-32-023Z/report.json`
- Smoke report: `test-results/smoke-2026-05-19T23-50-24-360Z/report.json`
- Desktop smoke report: `test-results/electron-smoke-2026-05-19T23-52-04-585Z/report.json`
- Voice cadence screenshot: `test-results/voice-cadence-2026-05-19T23-49-52-611Z/voice-cadence.png`

## Remaining Risks

- Human feel still needs a real 15-minute controller pass; automation proves stability, not taste.
- Electron smoke passes, but the existing Electron `console-message` deprecation warning should be cleaned later.
- The global leaderboard path should be tested against the real deployed API before launch because local preview now correctly treats empty/offline global data as local-only.
- Bosses are fairer early, but a human should confirm the clutch shield reads as exciting mercy rather than hidden hand-holding.
- Steam screenshot capture is good enough for QA, but final store-shot selection/copy remains intentionally out of scope for this game-only pass.

## 15-Minute Human Validation Checklist

1. Start from main menu using Enter, Space, click, and gamepad A.
2. Play one fresh keyboard run through the first boss; confirm the first rapid core feels like a treat.
3. Play one controller run through at least level 3; confirm dodge, pause, restart, and menu return feel first-class.
4. During a low-life boss, verify the clutch shield is understandable and does not feel cheap.
5. Die once before submitting a score; verify game-over says local/offline/global truthfully.
6. Restart immediately from game over three times; listen for announcer repetition or fatigue.
7. Inspect 1280x720 gameplay and boss screenshots for bullet/background readability.
8. Confirm no visible secret/debug text, broken art, clipped buttons, or stuck sector-clear state.

## Final Harsh Steam Reviewer Answer

Would I refund this after 10 minutes? Probably not now. The first run starts quickly, the ship reads, the first powerup arrives soon, bosses telegraph more fairly, and the restart/game-over loop is clearer. I would still complain if a controller pass feels second-class or if the clutch shield feels invisible, but the obvious "this is cheap/unfair/stuck" refund triggers from the baseline have been reduced.
