# Nova Swarm Release QA Gauntlet

Generated: 2026-05-22

Backup before QA:

- Branch: `backup/pre-release-qa-gauntlet-20260522-1938`
- Commit: `ff76c4c2c28bccb78acfd3fdf0d0d956c52aca78`
- Working branch: `ralph/steam-game-polish-20260520`

## Summary

This pass focused on release-blocking bugs, polish issues, crashes, softlocks, progression regressions, score/leaderboard regressions, audio regressions, and UI overlap risks. It intentionally avoided broad gameplay rebalance.

New or updated repeatable QA entrypoints:

- `npm run qa:release`: static release gauntlet for enemy variety, progression pacing, score scale, name sanitization, seed leaderboard bounds, and Steam metadata encoding.
- `npm run qa:progression`: focused progression and game-over motivation checks.
- `npm run qa:leaderboard`: score normalization, local/cloud/Steam adapter, local/global split, and mock Steam checks.
- `npm run qa:enemy-variety`: normal enemy variety, enemy weapons, and wave-pattern checks.
- `npm run qa:audio`: audio catalog plus objective mix audit.
- `npm run qa:ui-flow`: menu/credits, game-over motivation, and full browser smoke.
- `npm run check:boss-mercy`: boss recovery-window regression check.
- `npm run check:ship-trait-explanations`: hangar trait explanation coverage check.

The deeper QA pass found no technical crash, fatal overlay, console error, page error, request failure, sector-clear stall, or known popup overlap in the main smoke run. It did find one gameplay endurance concern: the 10-minute default release playtest ended in game over at 498.764 seconds, peak level 5, score 13,595, with no technical failures.

Follow-up combat readability changes added a Boss Mercy System that prevents repeated boss-caused life loss during recovery windows. The window scales down with progression and exists to preserve player agency after a hit, not to make boss attacks harmless. Hangar ship details also now explain the actual trait mechanics, shot-based counters, visible effects, and tradeoffs before launch.

## Checks Run

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run qa:release` | Pass | `test-results/release-qa-gauntlet-2026-05-22T17-45-17-387Z/report.json` |
| `npm run check:generated-rosters` | Pass | ships 25, enemies 120 |
| `npm run check:normal-enemy-variety` | Pass | level 1 = 10, level 11 = 39, level 40 = 120 |
| `npm run check:enemy-weapons` | Pass | 12 profiles, 12 assets, 12 behaviors |
| `npm run check:enemy-wave-patterns` | Pass | `test-results/enemy-wave-patterns-2026-05-22T17-45-28-351Z/` |
| `npm run check:boss-roster` | Pass | 50 profiles, 10 archetypes |
| `npm run check:boss-contact` | Pass | `test-results/boss-contact-2026-05-22T17-45-28-372Z/` |
| `npm run check:boss-telegraph` | Pass | `test-results/boss-telegraph-2026-05-22T17-45-28-348Z/` |
| `npm run check:boss-special-hazards` | Pass | `test-results/boss-special-hazards-2026-05-22T17-45-54-203Z/` |
| `npm run check:powerup-balance` | Pass | sparse drops, max 2 per level |
| `npm run check:score-normalization` | Pass | 100000 -> 10000, 553006 -> 55301 |
| `npm run check:unlock-rank-pacing` | Pass | level 1 Cadet, level 11 Combo Courier, level 60 Arcade Legend |
| `npm run check:leaderboard-adapter` | Pass | Eirik regression and mock Steam covered |
| `npm run check:leaderboard-split` | Pass | `test-results/leaderboard-split-2026-05-22T17-46-17-163Z/report.json` |
| `npm run check:steam-leaderboard-mock` | Pass | `test-results/steam-leaderboard-mock-2026-05-22T17-46-17-181Z/report.json` |
| `npm run check:audio` | Pass | 236 manifest assets, 169 catalog keys |
| `npm run audit:audio-mix` | Pass with warnings | 211 measured files, 6 raw peak warnings |
| `npm run check:gameover-motivation` | Pass | `test-results/gameover-motivation-2026-05-22T17-46-47-038Z/` |
| `npm run check:menu-credits-layout` | Pass | `test-results/menu-credits-layout-2026-05-22T17-46-47-092Z/` |
| `npm run check:ship-selector-start` | Pass | `test-results/ship-selector-start-2026-05-22T17-46-47-038Z/` |
| `npm run build:current` | Pass with warning | main app chunk 711.04 kB, above 700 kB warning |
| `npm run check:gameover-ceremony` | Pass after QA script score-scale fix | `test-results/gameover-ceremony-1779472277314/report.json` |
| `npm run check:leaderboard-visuals` | Pass | `test-results/leaderboard-visuals-2026-05-22T17-49-06-474Z/` |
| `npm run check:voice-cadence` | Pass on rerun | `test-results/voice-cadence-2026-05-22T17-51-17-332Z/` |
| `npm run smoke` | Pass | `test-results/smoke-2026-05-22T17-53-12-377Z/report.json` |
| `npm run playtest:release` default 10 min | Failed playthrough survival only | `test-results/release-playtest-qa-default-10min/report.json` |
| selected fastest ship 2 min | Pass technical, wave 1 not cleared | `test-results/release-playtest-qa-fastest-2min/report.json` |
| selected tankiest ship 2 min | Pass | `test-results/release-playtest-qa-tankiest-2min/report.json` |
| selected highest-damage ship 2 min | Pass technical, wave 1 not cleared | `test-results/release-playtest-qa-highdamage-2min/report.json` |
| selected late-unlock ship 2 min | Pass | `test-results/release-playtest-qa-lateunlock-2min/report.json` |

`git diff --check` still needs to be run after this report is finalized.

## Playtest Summary

- Release playtest runs: 5
- Full-duration default runs attempted: 1
- Short selected-ship probes: 4
- Longest survival: 498.764 seconds
- Highest natural automation level reached: level 5
- Highest simulated level covered by static progression/enemy checks: level 60 for ships/ranks, level 40 for normal enemies
- Full requested 3 x 10-minute default, 3 x 10-minute random, and 1 x 20-minute suite was not run because the first 10-minute default run ended at 8m19s and this pass prioritized documenting the finding over broad rebalance.

Selected ship probes:

| Ship role | Ship key | Duration | Result |
| --- | --- | ---: | --- |
| Fastest | `nova-player-ship-16.png` | 119.815s | Technically stable, stayed level 1 wave 1 |
| Tankiest | `nova-player-ship-23.png` | 119.982s | Stable, reached level 2, score 3,091, 4 lives |
| Highest damage | `nova-player-ship-15.png` | 119.969s | Technically stable, stayed level 1 wave 1 |
| Late unlock | `nova-player-ship-25.png` | 119.935s | Stable, reached level 2, score 4,751, 3 lives |

The fastest/highest-damage results appear to be an automation aiming limitation against far-lane starter enemies, not a confirmed player-facing softlock. Screenshots show live enemies still separated at the top corners while the automated player fires a narrow lane.

## Findings

| Severity | Area | Finding | Reproduction | Suggested fix | Fixed in this pass |
| --- | --- | --- | --- | --- | --- |
| High | Combat endurance | Default 10-minute release playtest ended in game over at 498.764s, level 5 wave 3, score 13,595. No crash, no softlock, no console/page/network failures. | Run `npm run playtest:release` with default 10-minute settings. | Human-playtest level 4-5 pressure. If humans also die too abruptly, tune only the specific level/wave pressure after separate approval. | No |
| Medium | Progression UX | Game over can show `REACHED LEVEL: 5`, `NEXT SHIP: VIOLET FEINT NEED REACH LEVEL 23`, and `NEXT GOAL: REACH LEVEL 22` when stored career best is level 21. This is correct career progression but unclear copy. | Have career best 21, finish a lower-level run. | Label next ship/next goal as career progress when based on saved best level. | No |
| Medium | Selected-ship automation | Fastest and highest-damage 2-minute probes did not clear wave 1 under automation. | Run `playtest:release` with `RELEASE_PLAYTEST_SHIP_KEY=nova-player-ship-16.png` or `nova-player-ship-15.png`. | Add aiming-aware automation for narrow weapons, then retest by hand. Do not rebalance ships from this evidence alone. | No |
| Low | Audio headroom | Six boss/tractor SFX files raw-peak at 0.0 dB, although effective mixed peaks are around -20 dB. | Run `npm run audit:audio-mix`. | By-ear pass and optionally normalize source files with more headroom. | No |
| Low | Build/performance | Vite reports the main app chunk at 711.04 kB after minification. | Run `npm run build:current`. | Consider code splitting after release-critical work. | No |
| Low | QA tooling | Audio mix audit missed 50 CTA voice assets because they are catalogued voice files without explicit `VOICE_MIX` entries. | Run previous `npm run audit:audio-mix -- --fail-on-warnings`. | Count catalogued `/audio/voice/` files even when they use default voice mix. | Yes |
| Low | QA tooling | Game-over ceremony live cue check used pre-score-scale values through `game.addScore()`, so near-global cues did not arm after 0.1 score normalization. | Run previous `npm run check:gameover-ceremony`. | Multiply injected score deltas by 10 so applied normalized score reaches the intended thresholds. | Yes |
| Low | Runtime QA limitation | Production global backend reset/write was not performed in this pass. Local and mock/adapter paths were tested. | N/A | Use explicit admin reset tooling only with environment confirmation. | No |
| Low | Steam QA limitation | Real Steam leaderboard writes were not exercised. Mock Steam path passed. | N/A | Real Steam client/App Admin validation remains a separate manual gate. | No |
| Polish | Manual coverage | Controller disconnect, real mobile device, and true 20-minute survival were not covered. | N/A | Add or schedule dedicated manual pass. | No |

## Area Coverage

### Startup And Menu Flow

Covered by `npm run smoke`, `npm run check:menu-credits-layout`, and `npm run check:ship-selector-start`.

Result:

- Main menu rendered cleanly.
- Settings opened and audio audition telemetry updated.
- Credits opened and fit the checked layout.
- Ship hangar launch/back/menu overlay flows passed with mouse and keyboard.
- Gamepad override registered movement, fire, and pause in smoke.
- Exit-game fallback notice for browser/desktop context was exercised in ship selector check.

### Game Start Flow

Covered by smoke, ship selector start, and selected-ship release probes.

Result:

- Default ship autostart worked.
- Selected ship release harness now supports `RELEASE_PLAYTEST_SHIP_KEY`.
- Tankiest and late-unlock selected probes progressed into level 2.
- Fastest and highest-damage selected probes were technically stable but did not clear wave 1 under automation.

### Combat Stability

Covered by smoke, one 10-minute default release playtest attempt, and four selected 2-minute probes.

Result:

- No fatal overlays, page errors, console errors, HTTP errors, or request failures in the release playtest reports.
- No sector-clear stalls.
- Default run ended by normal game over at 498.764 seconds.
- Highest natural automation level was level 5.

### Progression QA

Covered by `qa:release`, `check:unlock-rank-pacing`, and `check:gameover-motivation`.

Result:

- Level 1: 1 ship, rank `Cadet`.
- Level 11: 8 ships, rank `Combo Courier`.
- Level 60: all 25 ships and max rank `Arcade Legend`.
- The screenshot behavior where Violet Feint requires level 23 is correct if the saved career best is level 21. The confusing part is copy: `REACHED LEVEL` is this run, while `NEXT SHIP` and `NEXT GOAL` are based on saved career progress.

### Normal Enemy Variety QA

Covered by `qa:release`, `check:normal-enemy-variety`, `check:generated-rosters`, `check:enemy-weapons`, and `check:enemy-wave-patterns`.

Result:

- Profiles: 120.
- Movement families: 28.
- Attack families: 23.
- Level 1 available profiles: 10.
- Level 5 available profiles: 22.
- Level 10 available profiles: 36.
- Level 11 available profiles: 39.
- Level 20 available profiles: 64.
- Level 30 available profiles: 92.
- Level 40 available profiles: 120.
- Level 11 does not expose all profiles, movement families, or attack families.
- Level 40 exposes the full normal enemy pool.

### Boss QA

Covered by boss roster, contact, telegraph, special hazards, smoke boss gate, and smoke boss victory.

Result:

- Boss roster and archetype metadata valid.
- Boss contact damage worked.
- Boss telegraphs rendered and exposed telemetry.
- Boss special hazards damaged only after telegraph/arming rules.
- Smoke boss victory advanced to level 2 and restored gameplay music.
- Known popup overlap cases did not reappear in smoke screenshots.

### Score And Leaderboard QA

Covered by score normalization, leaderboard adapter, leaderboard split, mock Steam, qa release, game-over motivation, and game-over ceremony.

Result:

- Score scale factor: 0.1.
- Rounding: `Math.round`.
- Before/after examples: 100,000 -> 10,000; 553,006 -> 55,301.
- Local seed leaderboard range: 500 to 7,900.
- Seed names: `NOVAROOK`, `VOIDCADET`, `PIXELPILOT`, `ORBITKID`, `COMETACE`, `NEONRIDER`, `STARRUNNER`, `QUANTUMQ`, `SIGNALACE`, `ARCADEZERO`.
- `Eirik` validates as `EIRIK` and does not fall back to `PILOT06`.
- Blank name fallback remains intentional, for example score seed 553006 -> `PILOT06`.
- Mock Steam global/friends/local tabs passed.
- Real Steam migration/write was not needed or tested here because Steam writes have not started.

### Audio QA

Covered by `check:audio`, `audit:audio-mix`, smoke settings audition, game-over ceremony, and voice cadence.

Result:

- Audio catalog passed with 236 manifest assets and 169 catalog keys.
- Mix audit measured 211 files: 26 music rows, 131 SFX rows, 101 voice rows.
- CTA voice clips are now included in mix audit coverage.
- Voice cadence passed after rerun.
- Remaining audio follow-up: six boss/tractor SFX have raw peaks at 0.0 dB.

### Popup, Toast, And UI QA

Covered by smoke and screenshot inspection.

Result:

- Menu, game-over, wave briefing, boss gate, and post-boss screenshots were inspected.
- `WAVE CLEARED` did not overlap boss gate in the smoke artifact.
- `SECTOR CLEAR` did not overlap level intro in the smoke artifact.
- Game-over screen was readable in the checked desktop viewport.
- Mobile smoke reached play scene and exposed wave state.
- Rank-up card can appear over active gameplay after boss victory; this is expected ceremony behavior in current smoke but should be watched in manual play.

### Save And Persistence

Covered partially by localStorage-backed progression checks, leaderboard split checks, game-over motivation checks, and ship selector checks.

Result:

- Career best and ship unlock progress paths were exercised through localStorage.
- Local leaderboard persists and can be cleared/seeded intentionally.
- Settings persistence was exercised enough to open settings and use audio toggles/auditions.
- Corrupted-save recovery was not directly fuzzed in this pass.

### Performance QA

Covered by smoke and release playtest telemetry.

Result:

- Smoke and release playtests completed without fatal performance warnings.
- Vite build emitted a chunk size warning for the main app bundle at 711.04 kB.
- Long memory-growth profiling was not performed.

### Edge Cases

Covered:

- Immediate restart after game over through game-over motivation and voice cadence checks.
- Return to menu after death through smoke.
- Escape/menu overlay paths in ship select.
- Pause/gamepad pause in smoke.
- Mobile-ish viewport in smoke.
- Very long player name capped at 14 characters.
- Empty/fallback and invalid-name sanitization at policy level.
- High score submission failure/offline local fallback in leaderboard split.

Not covered:

- Physical controller disconnect.
- Real mobile browser/device.
- Real app-owned production global backend reset/write.
- Real Steam leaderboard write.
- 20-minute survival.

## Manual Playtest Checklist

1. Start a fresh run.
2. Play levels 1-3 and confirm early game still feels readable and fair.
3. Confirm new enemies do not appear too early.
4. Play or simulate level 5 and confirm more variety but no chaos.
5. Play or simulate level 11 and confirm not all normal enemy profiles, movement styles, or attack styles are available.
6. Simulate level 20 and confirm new mid-game enemy content appears.
7. Simulate level 30 and confirm advanced enemy content appears.
8. Simulate level 40 and confirm the full normal enemy pool is available.
9. Confirm after level 40 the game continues using the full pool.
10. Confirm no boss behavior changed unexpectedly.
11. Confirm no scoring, leaderboard, unlock, or rank behavior changed unexpectedly.
12. Play a real 10-minute default-ship run and compare against the automation death at level 5.
13. Try `Spectral Slip` and `Ruby Spike` by hand to verify their narrow weapon lanes do not create wave-clear frustration.
14. Listen specifically for boss/tractor SFX headroom and harshness.
15. Recheck game-over career copy when a lower-level run follows a higher saved career best.

## Follow-up: first boss manual difficulty regression

Manual finding: after the release QA gauntlet, a human test reported that the game felt much harder again and that the first boss had become a wall. That manual report was treated as higher priority than the earlier automation result.

Root cause found:

- Pre-boss attrition was too high: the current branch required six curated normal waves, plus optional timing spacer waves, before the first boss. This contradicted older release-ready tempo evidence where levels 1-10 used two focused normal waves before each boss.
- Boss 1 also had an extra damaging aimed hazard layer on top of the visible boss shot pattern. The first-boss probe reproduced a three-life loss from `boss_hazard:signature:cone`, `enemy_bullet`, and `boss_contact`.
- Active boss-combat notices could still use large boss dossier overlays, making phase and hit feedback heavier than intended during combat.

Exact changes:

- `BalanceConfig.difficulty.MIN_WAVES_BETWEEN_BOSSES` changed from `6` to `2`.
- `BalanceConfig.difficulty.MIN_SECONDS_BETWEEN_BOSSES` changed from `75` to `0`, removing extra spacer waves before the first boss.
- `BalanceConfig.difficulty.wavesPerBossBase` changed from `6` to `2`; levels 1-10 now stay at two focused waves, then later levels scale upward.
- Curated level 1-4 scripts are sliced to the configured normal-wave count instead of always playing all six waves.
- Boss 1 aimed regular/signature cone/fan/fakeout hazard registrations are suppressed; the first boss still fires its actual shot pattern.
- Boss phase/half/life-lost combat notices now use compact top-lane toasts during active boss combat instead of large dossier overlays.
- Boss spawn waits for the dossier/focus window to finish before combat begins.

Values confirmed still present:

- Boss HP: `44 + 4 per level`, min `44`.
- Boss shoot delays: `44 / 42 / 38`.
- Boss projectile speeds: `1.45 / 1.52 / 1.68`.
- Boss telegraph/fairness values remain increased, including safe wedge `0.6`, hazard arming `320ms`, boss-clear repair `+1` capped at `6`, and repair invulnerability `1000ms`.

New first-boss evidence:

- `npm run check:first-boss-balance` passed at `test-results/first-boss-balance-2026-05-22T21-55-46-098Z/report.json`.
- Result: lives `3 -> 4`, duration `25s`, damage `{}`.
- Expected effect: boss 1 should feel tense but should no longer drain most lives through stacked cone/fan hazard damage or long pre-boss attrition.

Remaining manual checklist:

1. Start a fresh default-ship run.
2. Confirm the first boss is reached after two readable normal waves.
3. Fight boss 1 without relying on extra-life drops.
4. Confirm strong play can clear it without life loss and average play loses no more than one life.
5. Confirm the boss still feels tense and visually readable.

## Follow-up: level 5 endurance failure

Original failure: the QA gauntlet default 10-minute release playtest ended by normal game over at `498.764s`, peak level `5`, score `13,595`.

Root cause found:

- The old six-wave-plus-spacer early pacing caused too much pre-boss and pre-midgame attrition.
- New high-pressure wave tactics were available too early for the release endurance path.
- The release automation did not model boss hazard lanes and hugged the bottom edge too often, creating false contact/hazard losses.

Exact changes:

- Early boss pacing restored to two focused normal waves through level 10.
- Harsh wave tactics are now gated later:
  - `crossfire_pincer`: level 4
  - `rush_feint`: level 7
  - `orbit_snare`: level 8
  - `weave_wall`: level 10
  - `split_sweep`: level 12
  - `ambush_lattice`: level 16
- `release-playtest.mjs` now reads active boss hazards and scores candidate lanes against beams, cones, rings, and wall columns.
- The release bot now avoids the very bottom edge more deliberately.

New release playtest result:

- `npm run playtest:release` passed at `test-results/release-playtest-followup-default-10min-tactic-gate/report.json`.
- Survival: `599.926s`.
- Final state: alive in play scene, level `13`, score `14,235`, lives `1`.
- Console/page/network/request failures: `0`.

Status: the 600s gate now passes. The final level is higher than the human target of "around level 10", so manual play should still judge whether the midgame feels too accelerated for humans.

## Follow-up: selected-ship wave-1 probes

Original finding: the fastest and highest-damage selected-ship probes were technically stable but did not clear wave 1 under the first QA harness.

Root cause found:

- This was a harness and pacing issue, not a confirmed ship bug. The bot could fire between far-lane enemies and the old long pre-boss wave plan made the issue more visible.

New probe results:

- Fastest ship `nova-player-ship-16.png`: passed 120s at `test-results/release-playtest-followup-fastest-2min-final/report.json`, reached level `4`, score `2,391`, lives `5`.
- Highest-damage ship `nova-player-ship-15.png`: passed 120s at `test-results/release-playtest-followup-highdamage-2min-final/report.json`, reached level `4`, score `2,984`, lives `5`.

Status: fixed in automation. No ship stats, weapons, traits, or wave-1 enemy stats were changed.

## Follow-up: game-over progression copy

Problem: the end screen could read like a level 5 run was expected to reach level 22/23, because this-run results and saved career-best milestones were visually mixed.

Exact changes:

- The post-run copy now separates `THIS RUN`, `CAREER BEST`, `NEXT CAREER GOAL`, and `NEXT SHIP`.
- Regression coverage now checks `thisRunLevel=5` with saved career best `21`, and expects `NEXT SHIP: VIOLET FEINT` plus `CAREER LEVEL 21/23 - 2 LEVELS TO GO`.

Validation:

- `npm run check:gameover-motivation` passed at `test-results/gameover-motivation-2026-05-22T21-55-46-010Z/`.
- `npm run check:gameover-ceremony` passed at `test-results/gameover-ceremony-1779486946095/report.json`.

## Follow-up: audio peak warnings

Original finding: six boss/tractor SFX raw-peaked at `0.0 dB`.

Files reduced by 2 dB:

- `public/audio/sfx/nova-swarm/nova_tractor_break_bloom.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_beam_telegraph.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_beam_fire.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_web_telegraph.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_web_snap.mp3`
- `public/audio/sfx/nova-swarm/nova_boss_hazard_impact.mp3`

Validation:

- `npm run audit:audio-mix` passed with warnings: none.
- Latest audit measured 211 files across 26 music, 131 SFX, and 101 voice rows.

## Follow-up: Vite chunk warning

Status: still present.

- Latest `npm run build:current` passed, with main app chunk `712.74 kB`.
- Pixi is already split into `vendor-pixi`; further code-splitting did not look like a safe release-follow-up change.
- This remains low severity and should be handled after release-critical playability and QA gates.

## Follow-up Release Readiness

The follow-up pass moves the game materially closer to release-ready:

- First-boss regression is understood and has a targeted probe.
- The default 600s release playtest now passes.
- Selected-ship probes no longer fail wave 1.
- Game-over career copy is clearer.
- Audio peak warnings are resolved.
- Normal enemy variety expansion remains intact: 120 profiles, 28 movement families, 23 attack families, level 11 still exposes only 39/120 profiles, and level 40 exposes the full pool.

Remaining risks:

- Manual human play should verify that the level-13 automation outcome does not mean the game now progresses too fast for real players.
- Real production global backend reset/write and real Steam leaderboard write are still outside this local pass.
- The Vite chunk warning remains a known low-risk build warning.
- Physical controller disconnect, real mobile device, and 20-minute survival remain untested.
