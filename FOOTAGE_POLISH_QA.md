# Nova Swarm Footage Polish QA

Date: 2026-08-08

Baseline source: `20822a41f6d3cb1511605375c86f37c9be9a1c99`

Branch: `codex/footage-polish-20260808-7c4e`

## Result

The production build, source release gates, browser smoke, desktop smoke, eight-locale UI rendering, controller flow, combat/readability checks, result flow, progression, leaderboards, enemy variety, run contracts, audio catalog, and deterministic performance analysis pass.

No gameplay values, colliders, scoring rules, save IDs, progression IDs, achievements, or Steam leaderboard behavior were changed.

## Baseline evidence

- Exact footage frames: `test-results/footage-polish-baseline/`
- Baseline performance: `test-results/gameplay-performance-analysis-2026-08-08T16-24-39-154Z/report.json`
- Baseline release gauntlet: `test-results/release-qa-gauntlet-2026-08-08T16-12-54-916Z/report.json`
- Baseline audio catalog: 1,475 assets, 363 keys, 7 music contexts.
- Supplied-footage measurement: -38.5 LUFS integrated, 10.7 LU LRA, -18.2 dBFS true peak. This describes the supplied capture, not necessarily the game mixer.

## Resolution matrix

The responsive suite passed 55 runtime captures across all required resolutions:

| Layout | Result | Evidence |
| --- | --- | --- |
| 1280 x 720 | Pass | `test-results/tyrian-responsive-ui-2026-08-08T17-39-01-335Z/minimum-16x9-1280x720/` |
| 1280 x 800 | Pass | `test-results/tyrian-responsive-ui-2026-08-08T17-39-01-335Z/minimum-16x10-1280x800/` |
| 1920 x 1080 | Pass | `test-results/tyrian-responsive-ui-2026-08-08T17-39-01-335Z/standard-16x9-1920x1080/` |
| 2560 x 1440 | Pass | `test-results/tyrian-responsive-ui-2026-08-08T17-39-01-335Z/large-16x9-2560x1440/` |
| 3440 x 1440 ultrawide | Pass | `test-results/tyrian-responsive-ui-2026-08-08T17-39-01-335Z/ultrawide-3440x1440/` |

The suite covers gameplay HUD, boss warnings, Tactical Draft, notifications, Hangar, Ship Details, Settings, and keyboard bindings. Manual inspection was performed on the corrected 1280 x 800 and 1920 x 1080 Hangar captures, 1920 x 1080 menu, English/German Settings, Ace lane avoidance, combo lane, death, and branded result frames.

## Critical behavior checks

| Area | Result | Evidence |
| --- | --- | --- |
| Normal and final life loss, exact cause, one score snapshot, hazard cleanup, 750 ms skip | Pass | `test-results/gameover-ceremony-1786209964048/report.json` |
| Game Over and leaderboard immediate branded composition | Pass | `test-results/result-screen-flow-2026-08-08T17-26-48-959Z/report.json` |
| Game Over interlude | Pass | `test-results/gameover-interlude-2026-08-08T17-27-27-744Z/` |
| HUD hierarchy and collision reservations | Pass | `test-results/hud-readability-2026-08-08T17-23-30-968Z/report.json` |
| Ace identity and HUD-lane avoidance | Pass | `test-results/ace-bounties-2026-08-08T17-23-40-780Z/report.json` |
| Notification orchestration and two-surface contract | Pass | `test-results/notification-orchestration-2026-08-08T17-27-49-881Z/report.json` |
| Projectile visual taxonomy | Pass | `test-results/projectile-visuals-2026-08-08T17-24-27-717Z/` |
| Player projectile readability | Pass | `test-results/player-projectile-readability-2026-08-08T17-28-19-554Z/` |
| Enemy hit feedback and health-bar policy | Pass | `test-results/enemy-hit-feedback-2026-08-08T17-18-56-642Z/` |
| Sensory limits and reduced motion | Pass | `test-results/sensory-overhaul-2026-08-08T17-24-02-816Z/` |
| Menu launch panel | Pass | `test-results/cinematic-hangar-menu-2026-08-08T17-35-55-531Z/report.json` |
| Hangar recommendation, browse/active/launch contract | Pass | `npm run check:ship-recommendation` and responsive report above |
| Keyboard/controller onboarding, returning-pilot intro, Pilot Order route/report | Pass | `test-results/run-contracts-2026-08-08T18-11-11-691Z/report.json` |
| Controller-only navigation | Pass | `test-results/controller-only-flow-2026-08-08T17-32-02-875Z/` |
| All 40 normal-enemy attack actions and complete enemy-variety suite | Pass | `test-results/normal-enemy-attack-variety-2026-08-08T18-00-40-559Z/report.json` |
| Progression pacing and Game Over motivation | Pass | `test-results/gameover-motivation-2026-08-08T18-13-05-288Z/` |

The result transition test deliberately delays leaderboard data by 900 ms. The branded Game Over placeholder was present synchronously and remained composed for the entire 986 ms wait; the leaderboard placeholder remained composed for its entire 1,120 ms wait. Therefore the measured unintended fully black interval is 0 ms, below the 150 ms limit.

## Performance comparison

Final evidence: `test-results/gameplay-performance-analysis-2026-08-08T18-14-13-133Z/report.json`

| Scenario | Baseline avg | Final avg | Avg delta | Baseline p99 | Final p99 | p99 delta | Final frames >33 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Sector 1 opening | 16.64 ms | 16.63 ms | -0.06% | 17.3 ms | 17.4 ms | +0.58% | 0 |
| Sector 5 challenge entry | 16.62 ms | 16.63 ms | +0.06% | 17.1 ms | 17.3 ms | +1.17% | 0 |
| Sector 20 generated wave | 16.63 ms | 16.67 ms | +0.24% | 17.2 ms | 17.2 ms | 0.00% | 0 |
| Sector 20 full transition | 16.64 ms | 16.63 ms | -0.06% | 17.3 ms | 17.1 ms | -1.16% | 0 |

Worst average regression is +0.24% and worst p99 regression is +1.17%, both below the 5% limit. No new particles, combat-time full-screen blur, or gameplay-time allocation system was introduced.

## Audio validation

Controlled analysis: `test-results/footage-polish-audio-after.json` and `test-results/footage-polish-audio-after.md`

- 1,451 audio files measured; 0 analysis errors.
- Catalog still passes with 1,475 assets, 363 keys, and 7 music contexts.
- Defaults: Master 0.30, Music 0.20, SFX 0.40, UI 0.40, Voice 0.45.
- Effective defaults: Music 0.06, SFX 0.12, UI 0.12, Voice 0.135.
- Loudest effective peak: Voice -17.7 dBFS; SFX -19.3 dBFS; Music -24.8 dBFS.
- No effective clipping was found.
- The 66 warnings are raw source files close to 0 dBFS before the game's bus gains. They are retained in the report and do not imply output clipping.

The supplied capture was quiet, but the controlled mixer audit did not justify raising game gain. UI events now have an independent persisted bus while preserving their prior effective default gain.

## Build and regression gates

Passing gates include:

- `npm run check:i18n`
- `npm run build:current`
- `npm run check:i18n-ui` for all eight locales
- `npm run check:steam-electron-bridge`
- `npm run check:release-line`
- `npm run smoke`
- `npm run desktop:smoke:current`
- `npm run qa:release`
- `npm run qa:balance`
- `npm run qa:leaderboard`
- `npm run qa:enemy-variety`
- `npm run qa:progression`
- `npm run check:run-contracts`
- `npm run check:gameplay-performance-analysis`
- `npm run check:footage-polish-accessibility`
- `npm run check:audio`

Latest major evidence:

- Browser smoke: `test-results/smoke-2026-08-08T17-48-30-891Z/`
- Desktop smoke: `test-results/electron-smoke-2026-08-08T17-51-25-748Z/`
- Release gauntlet: `test-results/release-qa-gauntlet-2026-08-08T17-51-40-682Z/report.json`
- Eight-locale UI: `test-results/i18n-ui-2026-08-08T17-29-41-974Z/`
- Final run-contract check: `test-results/run-contracts-2026-08-08T18-11-11-691Z/report.json`
- Final performance check: `test-results/gameplay-performance-analysis-2026-08-08T18-14-13-133Z/report.json`

The isolated worktree does not contain the licensed Steam SDK DLL. Desktop smoke correctly used the application's supported local/offline fallback; the Steam/Electron bridge contract passed separately. No Steam upload was attempted.

## Before and after visual evidence

| Requested state | Before | After |
| --- | --- | --- |
| Final-death seam | `test-results/footage-polish-baseline/footage-042_5-final-death-vignette.png` | `test-results/gameover-ceremony-1786209964048/in-game-final-death.png` |
| Final-death delay | `test-results/footage-polish-baseline/footage-043_5-final-death-delay.png` | `test-results/gameover-ceremony-1786209964048/in-game-final-signal.png` |
| Normal life loss | `test-results/footage-polish-baseline/footage-138_0-combo-life-loss.png` | `test-results/gameover-ceremony-1786209964048/in-game-normal-life-loss.png` |
| Dense combat/toast | `test-results/footage-polish-baseline/footage-114_0-dense-combat.png` and `footage-132_0-ace-stack.png` | `test-results/notification-orchestration-2026-08-08T17-27-49-881Z/combo-left-lane-1920x1080.png` and `test-results/ace-bounties-2026-08-08T17-23-40-780Z/ace-bounty-hud-lane-avoidance-1920x1080.png` |
| Results transition | `test-results/footage-polish-baseline/footage-048_0-results-gap.png` | `test-results/result-screen-flow-2026-08-08T17-26-48-959Z/gameOver-branded-transition.png` |
| Leaderboard transition | `test-results/footage-polish-baseline/footage-060_3-leaderboard-transition.png` | `test-results/result-screen-flow-2026-08-08T17-26-48-959Z/highscore-branded-transition.png` |
| Main-menu launch panel | `test-results/footage-polish-baseline/footage-104_5-menu-overrun.png` | `test-results/cinematic-hangar-menu-2026-08-08T17-35-55-531Z/menu-current-1920x1080.png` |
| Hangar 1920 x 1080 | `test-results/footage-polish-baseline/footage-070_5-hangar-truncation.png` | `test-results/tyrian-responsive-ui-2026-08-08T17-39-01-335Z/standard-16x9-1920x1080/08-hangar-eirik-recommendation-mastery.png` |
| Hangar 1280 x 800 | Same footage baseline | `test-results/tyrian-responsive-ui-2026-08-08T17-39-01-335Z/minimum-16x10-1280x800/08-hangar-eirik-recommendation-mastery.png` |
| Ship Details backdrop | `test-results/footage-polish-baseline/footage-077_5-ship-details-backdrop.png` | `test-results/tyrian-responsive-ui-2026-08-08T17-39-01-335Z/standard-16x9-1920x1080/09-ship-details-hangar-context.png` |

The vertical spear in `in-game-final-signal.png` is authored Game Over signal art. It appears only in that composition and is not the red boss-wall seam from the footage.

## Remaining risks

- A final human ear check on a representative Steam-packaged capture is still useful because file-level loudness analysis cannot judge subjective mix masking. No gain defect or clipping was found in controlled analysis.
- Steam runtime itself was not launched in this isolated worktree because its licensed redistributable is absent. Bridge contracts, save/cloud serialization, leaderboard mocks, and local desktop fallback all pass.
- Test artifacts are local evidence and are intentionally not part of the production payload.

No known acceptance-blocking issue remains in the implemented scope.
