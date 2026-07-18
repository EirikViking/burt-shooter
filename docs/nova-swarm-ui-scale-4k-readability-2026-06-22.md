# Nova Swarm UI Scale 4K Readability - 2026-06-22

## Problem Report

A player reported that Nova Swarm text is unreadable on a 4K monitor. Changing resolution is not a good workaround because it asks the player to trade desktop/game clarity for UI readability.

## Implementation Summary

- Added a Display -> UI Scale option in Settings.
- Persisted the value in local storage as `nova_ui_scale_v1`.
- Included `uiScale` in renderer display settings, Steam Cloud renderer state, Electron display settings, and Electron Steam Cloud sanitization.
- Exposed the active value through `render_game_to_text().display.uiScale` and `render_game_to_text().layout.uiScale`.
- Applied scale to menu/layout text, Settings controls, HUD panels/text, active powerup HUD, and pause menu deck/buttons.
- Shared PIXI text surfaces get a capped readability boost so dense list screens such as Threat Codex and Achievements grow without clipping their custom layouts.
- Kept gameplay world dimensions, camera behavior, collision, scoring, leaderboard, achievements, progression, balance, and Steamworks metadata untouched.

## Settings Values

Explicit values implemented:

- `100%`
- `125%`
- `150%`
- `175%`
- `200%`

`Auto` is not implemented in this pass. It would require per-monitor DPI and distance heuristics that are riskier than explicit player control without real 4K hardware QA.

## Screens Covered

Automated screenshot coverage from `npm run check:ui-scale-4k`:

- Main menu / Launch Deck / Mission Briefing
- Settings / Display menu showing UI Scale
- HUD during gameplay
- Pause menu
- Threat Codex
- Achievements
- Result screen

## 4K Screenshot Evidence Paths

Generated evidence is written under:

- `test-results/ui-scale-4k-2026-06-22T07-20-24-013Z/report.json`
- `test-results/ui-scale-4k-2026-06-22T07-20-24-013Z/3840x2160-scale100/*.png`
- `test-results/ui-scale-4k-2026-06-22T07-20-24-013Z/3840x2160-scale150/*.png`
- `test-results/ui-scale-4k-2026-06-22T07-20-24-013Z/3840x2160-scale200/*.png`

The screenshots are intentionally not committed.

## Known Limitations

- The check uses simulated 4K browser viewports because no physical 4K monitor is available.
- Visual assertions are bounded layout checks plus saved screenshots for human review; they are not OCR.
- Dense list surfaces use a capped text readability boost instead of full 200% text expansion to preserve row fit and scroll behavior.
- Some highly decorative animation text may still rely on screen-local fit logic, but the main player-facing menu, settings, HUD, pause, Codex, achievements, and result surfaces are covered.
