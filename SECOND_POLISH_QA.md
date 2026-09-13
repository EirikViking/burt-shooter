# Nova Swarm Second Production Polish QA

Date: 2026-08-09
Branch: `codex/second-polish-20260809-4d2a`
Baseline: `f78f1f6ea6521245fbb5636a792d5fcec657e3b7`

## Acceptance results

| Requirement | Result | Runtime evidence |
| --- | --- | --- |
| Hangar readability for all 30 ships | PASS | 30/30 cards were overlap-free at 1280x720, 1280x800, 1920x1080, 2560x1440, and 3440x1440. Three-digit capacity passed for every card at every resolution. Boundary counts included `0`, `1`, `9`, `10`, `99`, `100`, and `999`. |
| Final ship destruction clarity | PASS | Fatal ship became inactive, invisible, and non-renderable. The captured final cause appeared as `FINAL HIT: HOSTILE FIRE`; normal life loss appeared as `SHIP DOWN / ENEMY CONTACT`. |
| Fatal-frame event barrier | PASS | A real colliding bullet produced one hit, zero near misses, unchanged score, no active/queued toast, no score popup, and no achievement. The bullet remained `nearMissed: false`. |
| Centralized damage causes | PASS | Bullet, contact, hazard, and fallback aliases passed source/runtime mapping checks and all-locale UI validation. No life-loss surface uses `HITBOX HIT!`. |
| Death-to-results timing | PASS | Natural transition: **2311 ms**. Keyboard skip pressed after the 600 ms debounce: **659 ms total**. Both are inside the requested <=3.0 s and <=1.5 s limits. |
| Any-input continue/skip | PASS | Keyboard, controller, and pointer paths are wired; the final prompt is `PRESS A / ANY KEY / CLICK TO CONTINUE`. |
| Combat text protected zones | PASS | Top HUD, side HUD, lower status, player radius, and boss UI exclusion logic passed. Four placements were adjusted in the dense runtime case; three score events coalesced to two popups. |
| Combo coalescing | PASS | Persistent combo HUD remained authoritative; no floating duplicate combo milestone was created. |
| Compact Cabinet Log | PASS | Live toast was two lines, 185x42 px in the captured 1280x720 case, duration 1450 ms. `fullTextArchived: true` preserved the complete archive entry. |
| Ace Contract collapse | PASS | Full card duration 1050 ms; compact objective ready at 1000 ms. Compact Ace rail suspended, but did not discard, the active tactical directive. |
| Sector semantics | PASS | Runtime fallback rendered `SECTOR 4 | HOSTILES 0 | THREATS 0`. Wave and boss identity/phase checks also passed. |
| Restrained ordinary enemies | PASS | Ordinary frame hidden, full-health bar hidden, one restrained cue with two chevrons. Durable frame and health bar remained visible with four pips and four warning brackets. |
| Last-used-device Hangar prompts | PASS | Keyboard/pointer and controller prompts switched at all five tested Hangar resolutions; separately named keyboard and controller screenshots were inspected at 1280x720. |
| Cabinet Wonder revelation audio | PASS | Dedicated MP3 exists, catalog mapping is intact, and three forced runtime variants verified the 1.5 s `audio_prelude` before reveal art. Reduced Motion also passed. |

## Timing evidence

Source: `test-results/gameover-ceremony-1786233845802/report.json`

| Path | Baseline | Final measured | Target | Result |
| --- | ---: | ---: | ---: | --- |
| Natural final death to results | 4900 ms authored path | 2311 ms | <=3000 ms | PASS |
| Skipped final death to results | 750 ms debounce, no measured baseline | 659 ms total | <=1500 ms | PASS |
| Skip debounce | 750 ms | 600 ms | 500-700 ms | PASS |

The old natural path is the deterministic baseline composition of its 1100 ms death hold plus 3800 ms ceremony. The final runtime measurement is 2311 ms, a 2589 ms / 52.8% reduction. The old suite did not instrument an end-to-end skipped time, so no false baseline measurement is claimed.

Additional authored timing contracts:

| Item | Target | Final | Result |
| --- | ---: | ---: | --- |
| Death hold | short, readable impact | 620 ms | PASS |
| Ace full card | about 0.8-1.2 s | 1050 ms | PASS |
| Ace compact readiness | about 0.8-1.2 s | 1000 ms | PASS |
| Cabinet Log live toast | compact transient | 1450 ms live duration; 1100 ms focus hold | PASS |

## Performance before and after

Both passes used `npm run check:gameplay-performance-analysis` with the same scripted scenario set.

| Scenario | Baseline FPS | Final FPS | Baseline p99 | Final p99 | Baseline frames >33.34 ms | Final frames >33.34 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Sector 1 opening wave | 59.2 | 60.1 | 33.3 ms | 17.4 ms | 2 | 0 |
| Sector 5 challenge entry | 60.1 | 60.1 | 17.1 ms | 17.2 ms | 0 | 0 |
| Sector 20 generated wave | 60.1 | 60.0 | 17.4 ms | 17.0 ms | 0 | 0 |

All eight final sector-20 transition variants stayed between 59.8 and 60.2 FPS with zero frames above 33.34 ms. The result supports the intended visual-noise reduction without evidence of a performance regression.

Reports:

- Baseline: `test-results/second-polish-baseline/gameplay-performance-analysis/report.json`
- Final: `test-results/second-polish-final/gameplay-performance-analysis/report.json`

## Audio validation

- `npm run qa:audio`: PASS.
- Audio catalog: 1475 manifest assets, 363 catalog keys, 7 music contexts.
- Mix audit: 1451 measured files, 0 errors. It reported 66 pre-existing raw-peak warnings, including the authored wonder source at 0 dB before in-game multipliers; this pass did not alter audio files or mix settings.
- `npm run check:cabinet-wonders`: PASS, 60 variants and cadence 3.
- `npm run check:cabinet-wonders-runtime`: PASS, three variants plus Reduced Motion.
- `wonder_revelation` remains configured at event volume 0.82, priority 9, 3000 ms priority hold, and 0.26 duck factor. Reveal visuals wait for the 1500 ms sacred prelude.

The first recorder probe exposed a capture-only mismatch: it forced Master 0.90 and SFX 0.85 instead of the shipped defaults. That probe measured -8.27 LUFS integrated and +1.78 dBTP after Opus decoding, so it was rejected as audio evidence. The capture harness now uses the real default mix:

| Bus | Controlled value |
| --- | ---: |
| Master | 0.30 |
| Music | 0.20 |
| SFX | 0.40 |
| UI | 0.40 |
| Voice | 0.45 |

The replacement deterministic boss-clear capture measured **-19.96 LUFS integrated**, **-7.34 dBTP**, and **-7.4 dBFS sample peak**, with one stereo Opus track and no clipping. The harness wires each audio element once through a `WeakSet`, and the recording contains continuous player fire, boss-fire/impact texture, boss defeat, clear rewards, music, and the Overrun handoff. Static/runtime suites separately cover menu confirmation, player damage/death, ordinary wave clear, UI, voice, and Wonder priority/ducking.

Automated validation confirms the correct file, mapping, event, timing, priority, gain path, and mix analysis. No in-game mixer or audio asset was changed. A subjective speaker/headphone listening signoff is outside headless automation and was not claimed.

## Visual evidence

Targeted second-polish runtime report: `test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/report.json`

| Hangar viewport | Cards checked | Overlap-free | Three-digit capacity | Input-device switch |
| --- | ---: | ---: | ---: | --- |
| 1280x720 | 30/30 | 30/30 | 30/30 | PASS |
| 1280x800 | 30/30 | 30/30 | 30/30 | PASS |
| 1920x1080 | 30/30 | 30/30 | 30/30 | PASS |
| 2560x1440 | 30/30 | 30/30 | 30/30 | PASS |
| 3440x1440 | 30/30 | 30/30 | 30/30 | PASS |

All seven boundary-count captures were visually inspected at 1280x720:

- `hangar-mastery-0-ship-01-1280x720.png`
- `hangar-mastery-1-ship-02-1280x720.png`
- `hangar-mastery-9-ship-03-1280x720.png`
- `hangar-mastery-10-ship-04-1280x720.png`
- `hangar-mastery-99-ship-05-1280x720.png`
- `hangar-mastery-100-ship-06-1280x720.png`
- `hangar-mastery-999-1280x720.png`

![Hangar mastery at 1280x720](test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/hangar-mastery-999-1280x720.png)

![Hangar mastery at 1920x1080](test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/hangar-mastery-999-1920x1080.png)

![Fatal-frame barrier and final-hit cause](test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/fatal-frame-barrier-1280x720.png)

![Protected combat-text placement](test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/combat-text-protected-zones-1280x720.png)

![Compact Cabinet Log](test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/cabinet-log-compact-toast-1280x720.png)

![Restrained ordinary-enemy signals](test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/ordinary-enemy-restrained-signals-1280x720.png)

![Keyboard-only Hangar footer](test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/hangar-footer-keyboard-1280x720.png)

![Controller-only Hangar footer](test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/hangar-footer-controller-1280x720.png)

Additional evidence:

- Ace card and compact objective: `test-results/ace-bounties-2026-08-09T00-09-57-884Z/`
- Natural death handoff: `test-results/gameover-ceremony-1786233845802/natural-death-results.png`
- Cabinet Wonder runtime: `test-results/cabinet-wonders-2026-08-09T00-37-23-208Z/`
- Responsive UI sweep (5 layouts, 50 screenshots): `test-results/tyrian-responsive-ui-2026-08-09T00-29-41-227Z/report.json`
- Full smoke flow: `test-results/smoke-2026-08-09T00-21-05-259Z/report.json`

Every targeted screenshot listed above was visually inspected. A second Chrome client also rendered active gameplay with one canvas, the player visible, and no fatal overlay; its warnings came only from an unrelated browser wallet extension.

Evidence checklist requested for the pass:

| Requested state | Evidence |
| --- | --- |
| Hangar CLEARS before | `test-results/second-polish-baseline/tyrian-responsive-ui/standard-16x9-1920x1080/08-hangar-eirik-recommendation-mastery.png` |
| Hangar CLEARS after, all 30 and six-plus hulls | Targeted report above plus the seven named boundary captures and five-resolution matrix |
| Normal death | `test-results/gameover-ceremony-1786233845802/in-game-normal-life-loss.png` |
| Final death | `test-results/gameover-ceremony-1786233845802/in-game-final-death.png` |
| Fatal near-miss/graze opportunity | `test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/fatal-frame-barrier-1280x720.png` and report counters |
| Dense floating combat text | `test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/combat-text-protected-zones-1280x720.png` |
| Cabinet Log | `test-results/second-polish-runtime-2026-08-09T01-00-49-963Z/cabinet-log-compact-toast-1280x720.png` |
| Ace full / collapsed | `test-results/ace-bounties-2026-08-09T00-09-57-884Z/ace-bounty-1920x1080.png` and `ace-bounty-compact-objective-1920x1080.png` |
| Results transition | `test-results/gameover-ceremony-1786233845802/natural-death-results.png` |
| Keyboard / controller Hangar footer | The two separately named footer captures above |
| Main menu / broader flow | `test-results/smoke-2026-08-09T00-21-05-259Z/01-menu.png` and its passing report |

## Final gameplay recording

The repository-supported capture workflow completed successfully:

- Video: `test-results/overrun-clear-2026-08-09T01-04-09-583Z/sector10-clear-into-overrun.webm`
- Final frame: `test-results/overrun-clear-2026-08-09T01-04-09-583Z/sector11-overrun-frame.png`
- Contact sheet: `test-results/overrun-clear-2026-08-09T01-04-09-583Z/recording-contact-sheet.png`
- Report: `test-results/overrun-clear-2026-08-09T01-04-09-583Z/report.json`

The 11.66-second 1280x720 recording contains VP9 video and 48 kHz stereo Opus audio. It shows the Sector 10 boss-clear impact, clear bonuses, and the `OVERRUN UNLOCKED` handoff into Sector 11. The capture report records `ok: true`, one video track, one audio track, final level 11, three lives, zero page errors, zero failed responses, and zero console errors. The final frame and four-frame contact sheet were visually inspected.

## Regression suite

The following checks passed after the final source changes:

- `node scripts/check-second-polish-rules.mjs`
- `node scripts/check-second-polish-runtime.mjs`
- `npm run check:gameover-ceremony`
- `npm run check:ace-bounty-runtime`
- `npm run check:mission-progress-hud`
- `npm run check:enemy-spawn-cue`
- `npm run check:enemy-threat-readability`
- `npm run check:notification-orchestration`
- `npm run check:i18n`
- `npm run check:i18n-ui`
- `npm run check:controller-flow`
- `npm run check:steam-electron-bridge`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run check:tyrian-responsive-ui`
- `npm run check:gameplay-performance-analysis`
- `npm run qa:audio`
- `npm run check:cabinet-wonders`
- `npm run check:cabinet-wonders-runtime`
- `node scripts/capture-overrun-clear.mjs`
- `npm run qa:release`
- `npm run check:release-line`
- `npm run build:current`

The final production build transformed 881 modules. The only build advisory was the existing Rollup large-chunk warning.

## Save, score, and online regression status

- Final-score locking and post-fatal score rejection passed. Hazard death retained exactly 12,345 points, and the real fatal-bullet probe retained exactly 777 points.
- Natural and skipped results both reached the interactive Game Over scene while online rank state was still allowed to be `checking`, `submitting`, `submitted`, `offline`, or `steam_ready`; the visual handoff did not wait for a network result.
- The browser smoke covered new run, gameplay, pause/controller, Cabinet Log, Game Over, return to menu, boss defeat, Tactical Draft, and next-sector start with no duplicate-flow failure.
- `check:steam-electron-bridge`, `check:release-line`, the release gauntlet, and desktop smoke passed, preserving Steam Cloud preference sanitization, achievement identifiers, leaderboard bridge contracts, and the existing once-only submission path.
- The focused pass changed no save keys, unlock rules, achievement IDs, leaderboard names, score values, or submission logic.
- A live production Steam submission was intentionally not performed because this task forbids production-data changes. Native packaged bridge behavior was therefore validated by contract and isolated desktop smoke rather than by writing a live score.

## Localization and external-state status

- Supported languages checked: English, German, Spanish, Russian, Simplified Chinese, Brazilian Portuguese, Korean, and Japanese.
- `check:i18n-ui` found no placeholder hits, English leaks, page errors, or console errors.
- Remaining untranslated player-facing text introduced by this pass: none.
- Steamworks settings changed: no.
- Steam upload/deploy performed: no.
- Git push performed: no.

## Known limitations

- The isolated worktree does not contain Valve's redistributable DLL, so Electron smoke used the expected local/offline profile. The native preload/renderer bridge contract passed independently.
- Automated audio checks cannot replace a subjective listening signoff.
- The existing production bundle-size advisory remains; no new runtime performance regression was measured.
