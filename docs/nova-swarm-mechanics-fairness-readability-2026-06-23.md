# Nova Swarm Mechanics Fairness And Readability Pass - 2026-06-23

## Scope

This pass investigated three player complaints without redesigning the game:

- Fast rhombus / fast target enemies feel impossible to hit.
- Boss invulnerability windows can feel like waiting.
- Combo chains can feel brittle against tanky enemies and wave cleanup.

No Steamworks metadata, AppID, depot ID, leaderboard identity, achievement metadata, Steam Cloud settings, save format, score formula, XP formula, Mayhem recalibration values, Scout boss tuning, Sector Run rules, or live profile data were changed.

## Fast Target Enemies

The report maps the fast-rhombus complaint to generated normal enemies with `role: fast_scout` and the `fastNeedle` movement profile. These enemies are intended to be killable: they have normal HP, score values, generated Codex IDs, encounter tracking, and destroyed tracking through the regular enemy kill path.

The problem found was visual readability rather than an explicit speed or HP bug. Several generated fast targets had a collision radius much smaller than their displayed body size, so lined-up shots could appear visually valid while passing outside the actual hit circle.

Safe fix implemented:

- Fast generated targets now get a bounded hitbox readability floor when their visible body is clearly larger than the existing collision radius.
- The adjustment applies only to generated `fast_scout` profiles and the `fastNeedle` movement profile.
- The increase is capped at +3 px and cannot exceed the existing generated enemy radius cap.
- Speed, HP, score values, spawn sectors, movement patterns, weapons, Codex IDs, Codex encounter tracking, and Codex destroyed tracking are unchanged.

Evidence:

- `test-results/fast-target-readability-2026-06-24T09-22-06-859Z/report.json`

## Boss Invulnerability

Bosses have three relevant no-damage or damage-gating behaviors:

- Spawn invulnerability: 800 ms after boss creation.
- Phase changes: visual/signature transition only; they do not directly set `invulnerableUntilMs`.
- Finish gate: if lethal damage would kill a boss before its minimum fight time, the boss is held at a small HP floor until `minimumFightMs` elapses.

The likely source of the "waiting near death" feeling is the finish gate, not phase transitions. The audit found that the gate ranges from 9400 ms to 12600 ms by boss level, and it can pause regular boss attacks while lethal damage is rejected. That can create a wait-state for very high-damage runs.

No boss behavior was changed in this pass because shortening the gate or changing attack behavior during the gate is a boss balance change. Recommended follow-up: if this complaint persists, make a boss-only decision on either reducing the finish gate duration or making the gate more active/clearly telegraphed.

Evidence:

- `test-results/boss-invulnerability-audit-2026-06-24T09-22-06-808Z/report.json`

## Combo Flow

The score combo system is kill-chain based:

- Kills start and increment the score combo.
- Kills refresh `comboTimerMs` back to `COMBO_WINDOW_MS`.
- Damage-only hits do not refresh the score combo timer.
- Wave cleanup can force-clear leftover regular enemies without awarding combo kill credit or score.

This confirms the player feeling: tanky targets can break combo flow if the player spends the whole timer damaging one enemy, and cleanup can remove remaining opportunities after the wave objective is complete.

No combo mechanic was changed in this pass. Hit-refresh, partial hit-refresh, longer combo timers, or cleanup kill-credit would affect scoring and leaderboard behavior and should be approved as an explicit design/balance change before implementation.

Evidence:

- `test-results/combo-flow-mechanics-2026-06-24T09-22-06-817Z/report.json`

## Recommendations Not Implemented

- Consider a separate boss-only pass for the near-death finish gate if players still report waiting.
- Consider an explicit score/leaderboard design decision for combo hit-refresh or tanky-enemy combo grace.
- Consider a future Codex or How To Play wording pass for fast-target counterplay if screenshots or playtests show players still miss the intended read after the hitbox readability fix.
