# Nova Swarm Second Production Polish Audit

Date: 2026-08-09
Branch: `codex/second-polish-20260809-4d2a`
Baseline: `f78f1f6ea6521245fbb5636a792d5fcec657e3b7`
Worktree: `D:\vibe-coding-e\codex\nova-swarm-second-polish-20260809-4d2a`

## Outcome

The requested second polish pass is implemented. The work fixes the Hangar mastery collision, makes fatal damage deterministic and readable, removes positive feedback from fatal frames, shortens the death-to-results path, reduces ordinary-enemy visual noise, and compacts transient objective/lore surfaces without changing gameplay rewards, enemy behavior, scoring, or Steam configuration.

No deployment, Steam upload, Steamworks edit, push, or publication was performed.

## Root causes and corrections

| Area | Root cause found | Correction implemented |
| --- | --- | --- |
| Hangar `CLEARS` badge | Medals, label, count, divider, and identity ornament shared one fixed-width horizontal lane. Text width growth pushed the count into the identity mark. | Added deterministic mobile and desktop badge layouts with separate medal, label, count, divider, and identity regions. All three medal slots remain structurally present, while the earned medal count remains truthful. Counts `0`, `1`, `9`, `10`, `99`, `100`, and `999` fit. |
| Final death clarity | The player sprite could remain renderable after the final hit, and the handoff did not identify the cause consistently. | The fatal event captures impact position and cause, disables input/fire, hides and deactivates the ship, clears deferred positive visuals, and drives a localized `FINAL HIT` line from the captured cause. |
| Fatal-frame ordering | Enemy bullets could be evaluated as near misses before collision resolution. The rest of the frame could continue after the accepted fatal hit. | Collision is resolved before near-miss scoring. An accepted fatal hit activates a frame barrier and returns from further gameplay progression. No near miss, score popup, reward toast, achievement, or deferred collision effect can be created afterward. |
| Damage wording | Life-loss presentation used the internal/debug phrase `HITBOX HIT!`, and different consumers formatted raw source enums independently. | Added `PlayerDamageCause.js` as the single source of truth. Bullet, contact, hazard, and fallback causes map to localized player-facing labels such as `HOSTILE FIRE`, `ENEMY CONTACT`, `HAZARD IMPACT`, and `CORE HIT`. |
| Death-to-results delay | The natural sequence was approximately 4.9 seconds and accepted only narrow skip inputs. | The authored destruction sequence now targets 2.32 seconds automatically. It becomes skippable after 600 ms and accepts keyboard, controller, or pointer input. Online leaderboard work remains asynchronous and does not hold the visual handoff. |
| Floating combat text | Popup placement did not know about the top HUD, side HUD, lower status rail, player safety radius, or active boss UI. Dense score events created redundant labels, including a second combo milestone competing with the persistent combo HUD. | Added protected placement zones, reusable offsets, dense nearby score aggregation, and persistent-combo-HUD ownership of combo milestones. |
| Cabinet Log | A full lore banner was used for a transient combat teaching event, obscuring play for several seconds. | Live presentation is now a compact two-line corner toast. The complete title, line, description, tip, and discovery state remain in the archive. |
| Ace Contract | The full action card remained for 2.7 seconds, and the compact objective waited behind an active tactical directive. | The full card now holds for 1.05 seconds and collapses to the compact Ace objective at 1.0 second. The Ace objective temporarily owns the compact rail while preserving the suspended directive state. |
| `LEVEL` / `SECTOR` semantics | `game.level` represents the current sector, but the no-wave HUD fallback displayed it as `LEVEL`. | The fallback now reads `SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}`. Existing wave numbering remains `WAVE n/N`; boss identity/phase behavior is preserved. |
| Ordinary enemy visual noise | Fast movers and ordinary enemies with threat actions inherited persistent frames and elaborate entry ornaments intended for exceptional enemies. | Ordinary enemies now use one restrained arrival ring with two inbound chevrons, no persistent threat frame, and no full-health bar. Durable, elite, late-mayhem, reinforcement, and other exceptional hierarchy remains visible. |
| Hangar prompts | The footer always showed keyboard instructions, even after controller input. | The Hangar now tracks the last meaningful input device and switches between keyboard/pointer and controller prompts. `X` opens Details as advertised. |
| Regression tests | Several older checks still asserted the superseded full Cabinet banner, elaborate ordinary-enemy ornaments, persistent ordinary threat-action frames, raw boss HP text, and an incomplete Ace placement list. | Updated those checks to assert the current authored contracts while retaining overlap, hierarchy, localization, and reserved-lane safeguards. |
| Final capture workflow | The existing overrun recorder assigned a synthetic high score without synchronizing live rank progression and assumed every ranked flow opened a tactical draft. Pure ranked mode correctly has no tactical draft, so the recorder waited on a screen that would never appear. | Synchronized the fixture's synthetic rank state and made the recorder accept either the optional tactical draft or direct Pure-mode continuation. The resulting 11.66-second VP9/Opus capture reaches Sector 11 with no browser errors. |
| Capture loudness | The recorder forced Master 0.90 and SFX 0.85, far above the shipped defaults, so its output was not valid evidence for the game's normal mix and decoded with a +1.78 dBTP overshoot. | Restored the capture to the actual default bus values. The replacement deterministic recording measures -19.96 LUFS integrated, -7.34 dBTP, and -7.4 dBFS sample peak. No game mixer or asset gain changed. |

## Implementation ownership

Core runtime changes:

- `src/scenes/PlayScene.js`: fatal barrier, destruction handoff, timing/skip input, Cabinet Log presentation, Ace collapse timing, collision suppression.
- `src/scenes/ShipSelectScene.js`: mastery badge integration and last-used-device prompts.
- `src/ui/ScorePopup.js`: protected zones, placement, and aggregation.
- `src/ui/HUD.js`: sector semantics and compact Ace rail priority.
- `src/entities/Enemy.js`: restrained ordinary cues and persistent-frame hierarchy.
- `src/game/RunReport.js`: centralized final-damage presentation.
- `src/text/phrasePool.js`: removal of debug hitbox wording from life-loss copy.
- `scripts/capture-overrun-clear.mjs`: deterministic final boss-clear and overrun recording flow.

New focused modules:

- `src/game/PlayerDamageCause.js`
- `src/ui/ShipMasteryBadgeLayout.js`
- `src/i18n/secondPolishSourceText.js`

Localization was added for German, Spanish, Russian, Simplified Chinese, Brazilian Portuguese, Korean, and Japanese through the normal locale files under `src/i18n/locales/`.

## Preserved contracts

- Scoring, enemy health, enemy movement, attack selection, threat actions, drops, rewards, progression, and unlock rules are unchanged.
- All 30 ships and all three mastery medal slots remain present.
- Complete Cabinet Log archive content remains available.
- Active tactical directives resume after a compact Ace objective is gone.
- Durable, elite, late-mayhem, boss, and reinforcement threat hierarchy remains distinct.
- The dedicated Cabinet Wonder revelation sound remains mapped to `wonder_revelation`, with its sacred prelude and high-priority ducking behavior.
- Steam leaderboard/cloud/achievement bridge code is unchanged by this pass.

## Applicability and compromises

- `LEVEL` and `SECTOR` were the same `game.level` progression value in the affected live-HUD fallback. The duplicate `LEVEL` label was therefore removed there; true `WAVE n/N`, boss identity, and boss phase remain distinct.
- Hazard, contact, and projectile deaths are applicable. The Game Over runtime covers fatal boss-wall hazard, fatal enemy contact, and fatal enemy bullet paths; the collision-order probe additionally uses a real colliding projectile with a simultaneous near-miss opportunity.
- The Hangar received last-used-device prompts because it was the reported mixed-prompt owner and already had a clean input seam. No broad menu rewrite was attempted.
- Controlled analysis did not justify changing in-game audio gain. The only loudness fault was the recorder's non-default bus override, which was corrected in the capture harness.
- Live Steam score submission was not performed because production mutation is explicitly prohibited. The unchanged bridge, once-only score lock, asynchronous results state, local/offline desktop profile, release line, and release gauntlet all pass.
- Subjective speaker/headphone listening remains a human signoff item; automated evidence covers source peaks, runtime routing, deterministic capture loudness/true peak, event priority, ducking, and audio-track presence.

## Evidence summary

Detailed commands, timings, performance measurements, screenshots, and known limitations are recorded in [SECOND_POLISH_QA.md](SECOND_POLISH_QA.md).
