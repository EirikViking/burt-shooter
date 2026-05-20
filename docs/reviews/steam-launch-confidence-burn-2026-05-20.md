# Steam Launch Confidence Burn - 2026-05-20

## Starting Point

- Phase: 2, Steam launch confidence burn, game-only.
- Isolated worktree: yes, `D:\vibe-coding-e\burt-shooter-phase2`.
- Branch: `ralph/steam-launch-confidence-burn-20260520`.
- Base commit: `98b2d05` (`Polish Nova Swarm first-session feel`).
- Original repo dirty state: quarantined. No original release/trailer/store leftovers were staged, cleaned, or committed.
- Push/deploy/PR: not performed.

## Baseline Status

Baseline build and focused checks were mostly healthy, but the long release playtest exposed the main Phase 2 blocker.

- `npm install`: pass.
- `npm run build`: pass.
- `npm run smoke`: pass, no console warnings/errors.
- `npm run check:first-30-polish`: pass before Phase 2 gameplay changes.
- `npm run check:voice-cadence`: pass before Phase 2 gameplay changes.
- `npm run check:audio`: pass.
- `npm run audit:audio-mix`: pass, warnings none.
- `npm run check:announcer-voice`: pass.
- `npm run playtest:release`: baseline fail, ended at level 6 boss after `378756ms`, no console/page/request errors.

## Top Refund Risks

1. Controller flow still felt second-class at game over and pause.
2. The boss clutch shield could read as hidden pity rather than an exciting emergency pickup.
3. Long-run boss pressure around level 6 could kill the automated release run just before the boss died.
4. Dodge/invulnerability alpha could make the player silhouette disappear during the moments where readability matters most.
5. Important death/low-life voice lines could be swallowed or ducked awkwardly by earlier chatter.
6. Challenge-wave novelty was effectively unreachable with the two-wave level structure.
7. There was no dedicated repeated-restart, controller, and fairness telemetry gate for Phase 2.

## Workstreams Attempted

- Controller and Steam Deck feel: implemented and tested synthetic gamepad pause, settings, game-over score save, and restart.
- Clutch shield readability and boss mercy: made the emergency shield visible, labeled, and magnetically forgiving after a short beat.
- Difficulty and fairness telemetry: added a repeated-run telemetry script and ran 5-run plus 20-run evidence batches.
- Visual readability: kept player, dodge, invulnerability, and ghost alpha readable in chaos.
- Audio fatigue and announcer cadence: protected critical game-over/low-life voice, preserved restart cooldown behavior, and improved music duck stacking.
- First 30 minutes and one-more-run: preserved first pickup timing, made challenge waves reachable, and added minimum pre-boss non-life/non-shield powerup exposure.
- Live deployed game check: both public domains load, but they are still on the older deployed build.

## Changes Made

- Game-over controller flow:
  - `A` saves a qualified score as default name `PILOT`.
  - `Start/Menu/RT` restarts.
  - `B` backs out of input mode.
  - Prompt copy now makes controller behavior explicit.

- Pause controller flow:
  - Pause overlay now has controller focus.
  - D-pad/stick up/down selects Resume, Settings, or Quit.
  - `A` activates selected item.
  - `B` closes settings or resumes.
  - A short pause-input guard prevents held Start from immediately pausing after a controller restart.

- Boss mercy/readability:
  - Clutch shield now says `EMERGENCY SHIELD: 1 PER BOSS`.
  - It spawns visibly above the player instead of directly under them.
  - After a short readable beat, it drifts toward the player so panic movement does not make the mercy feel random.

- Difficulty and novelty:
  - Boss HP scaling trimmed from `+16` to `+14` per level after repeated level 6 release-gate deaths with the boss nearly dead.
  - `minPerLevel: 1` now has a real pre-boss non-life/non-shield powerup path when the level has produced no pickup.
  - Bonus challenge wave injection can now occur after wave 1 on levels 2+.

- Readability:
  - Dodge alpha raised from `0.3` to `0.68`.
  - Invulnerability low strobe raised from `0.25` to `0.65`.
  - Ghost alpha raised from `0.4` to `0.65`.

- Audio:
  - Game-over voice bypasses global cooldown and stops softer active voice.
  - Low-life voice bypasses global cooldown and stops softer active voice.
  - Failed score-entry prompts no longer consume the restart voice line.
  - Music ducking now preserves the strongest active duck and latest release time instead of shortening long ceremony ducks.

- QA scripts:
  - Added `npm run check:controller-flow`.
  - Added `npm run check:fairness-telemetry`.
  - Updated `check:first-30-polish` to assert readable dodge alpha instead of near-invisibility.

## Changes Considered But Rejected

- Full controller remapping UI: too large for this pass.
- New voice generation: not necessary; cadence and priority logic were enough.
- New progression/economy/unlocks: out of scope and too risky.
- Big boss-pattern rewrite: the evidence pointed to HP/pickup/mercy tuning, not a pattern rewrite.
- Store/trailer/marketing changes: explicitly out of scope.
- Deploying local Phase 2: explicitly not allowed.

## Tests Run

| Command | Result | Notes |
| --- | --- | --- |
| `npm install` | Pass | 5 moderate npm audit vulnerabilities reported, no install failure. |
| `npm run build` | Pass | Final build ID `v2026-05-20_09-31-11`. |
| `npm run smoke` | Pass | `test-results/smoke-2026-05-20T07-20-31-027Z`; no console events, page errors, or bad responses. |
| `npm run playtest:release` | Pass | Final run survived `599938ms`, peak level 10, peak score 60538, no errors/stalls. |
| `npm run check:first-30-polish` | Pass | `test-results/first-30-polish-2026-05-20T07-21-49-472Z`. |
| `npm run check:voice-cadence` | Pass | Restart/launch cadence preserved. |
| `npm run check:controller-flow` | Pass | `A` score save, Start restart, pause/settings/controller flow verified. One non-blocking browser warning recorded, no errors. |
| `npm run check:fairness-telemetry` | Pass | 5 x 45s runs, 0 restart failures, 0 sector-clear stalls, 0 early deaths. |
| `FAIRNESS_RUNS=20 FAIRNESS_RUN_MS=15000 npm run check:fairness-telemetry` | Report OK, wrapper timeout | Wrote complete `ok: true` report with 20/20 restart success and no stalls; shell wrapper timed out at completion. |
| `npm run check:audio` | Pass | 176 manifest assets, 99 catalog keys, 7 music contexts. |
| `npm run audit:audio-mix` | Pass | 151 files measured; warnings none. Generated timestamp-only audit report changes were not committed. |
| `npm run check:announcer-voice` | Pass | 22 event pools, 51 manifest voice assets. |
| `npm run desktop:smoke` | Pass | Electron smoke succeeded; Electron emitted a deprecation warning after the JSON report. |
| `npm run capture:steam-screenshots` | Pass | 12 screenshots written to `release/steam-screenshots/draft-2026-05-20-09-32`. |
| `npm run check:live-deployment` | Expected fail | Live domains are still `v2026-05-19_23-47-45`, not local `v2026-05-20_09-31-11`; no deploy performed. The script also hit a Node assertion after reporting mismatch. |
| `curl.exe https://novaswarm.tinyfoundry.app/version.json` | Pass | Live version reachable: `v2026-05-19_23-47-45`. |
| `curl.exe https://burt.tinyfoundry.app/version.json` | Pass | Live version reachable: `v2026-05-19_23-47-45`. |

## Telemetry Summary

- Baseline release playtest failed at level 6 boss after `378756ms`.
- A second pre-HP-tuning long run failed at level 6 boss with only 8 boss HP remaining.
- Final release playtest passed full duration:
  - Survived `599938ms`.
  - Peak level 10.
  - Peak score 60538.
  - Final state: play, level 10, 1 life.
  - Console/page/bad-response/request failures: 0.
  - Sector-clear stalls: 0.

Fairness telemetry:

- 5 x 45s report: `test-results/fairness-telemetry-2026-05-20T06-48-02-667Z`.
  - Restart failures: 0.
  - Sector-clear stalls: 0.
  - Early deaths: 0.
  - Peak levels: 1, 1, 1, 2, 2.
  - Boss-death samples: 9.
  - Clutch-shield visible samples: 17.

- 20 x 15s report: `test-results/fairness-telemetry-2026-05-20T07-22-27-489Z`.
  - Report `ok: true`.
  - Restart failures: 0.
  - Sector-clear stalls: 0.
  - Early deaths: 0.
  - Technical issues: 0.
  - Note: command wrapper timed out as the report completed; artifact is intact.

## Artifacts

- `test-results/release-playtest-2026-05-20T07-09-59-996Z/report.json`
- `test-results/smoke-2026-05-20T07-20-31-027Z/report.json`
- `test-results/controller-flow-2026-05-20T07-21-49-528Z/report.json`
- `test-results/fairness-telemetry-2026-05-20T06-48-02-667Z/report.json`
- `test-results/fairness-telemetry-2026-05-20T07-22-27-489Z/report.json`
- `release/steam-screenshots/draft-2026-05-20-09-32/`

## Remaining Risks

- Physical Steam Deck/controller validation is still needed; synthetic gamepad coverage is good but not a real device.
- Controller score entry uses default `PILOT`; it is functional, but not a full controller text-entry UI.
- Live deployments are older than local Phase 2; do not judge Phase 2 by the public URLs until a deliberate deploy happens.
- The 20-run telemetry batch produced a valid report but exceeded the shell timeout at completion.
- Electron smoke passes, but Electron logs a `console-message` deprecation warning.
- Steam screenshot capture remains staged/sanitized evidence; use live play/video for chaos readability too.

## Harsh Review

Would I refund after 30 minutes? Probably not. The game now restarts fast, reads better during defensive states, controller basics no longer feel abandoned, and the long run no longer faceplants at the level 6 boss. The negative-review risk I would still watch is not "broken"; it is "I wanted fuller controller name entry and more proof this stays fair past the first 10 minutes."

## Human Validation Checklist

1. On a physical controller or Steam Deck, start from menu, pause, open settings, close settings, die, save a score as `PILOT`, restart, and confirm no accidental pause.
2. Play one honest keyboard run for 10 minutes and note whether level 6-10 bosses feel fair, not soft.
3. Intentionally lose lives on an early boss and confirm `EMERGENCY SHIELD: 1 PER BOSS` reads as a pickup, not invisible mercy.
4. Watch three start-death-restart cycles with audio on and confirm announcer charm does not repeat annoyingly.
5. Inspect the 12 screenshot captures at full size and thumbnail size, especially boss fight and game-over shots.
6. Before deploy, compare local build ID against live build ID and rerun smoke on the deployed URL.

## Files Intended For Commit

- `docs/reviews/steam-launch-confidence-burn-2026-05-20.md`
- `package.json`
- `scripts/check-controller-flow.mjs`
- `scripts/check-fairness-telemetry.mjs`
- `scripts/check-first-30-polish.mjs`
- `src/audio/AudioManager.js`
- `src/config/BalanceConfig.js`
- `src/entities/Player.js`
- `src/managers/EnemyManager.js`
- `src/managers/PowerupManager.js`
- `src/scenes/GameOverScene.js`
- `src/scenes/PlayScene.js`

## Intentionally Uncommitted / Generated

- `release/steam-screenshots/draft-2026-05-20-09-32/`
- `test-results/*` artifacts from smoke, release playtest, controller flow, first-30, voice cadence, telemetry, and Electron smoke.
- Timestamp-only audio audit rewrites from `npm run audit:audio-mix`.
- Generated build/header churn from `npm run build` and `npm run desktop:smoke`.
- Live deployment report rewrite from `npm run check:live-deployment`.
