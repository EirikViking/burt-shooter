# Nova Swarm How To Play Clarity - 2026-06-22

## Problem

A player reported that the How To Play screen was confusing, especially the `Dodge` card. The current mechanic is not a movement dash: it is a short phase/invulnerability burst triggered by Shift or Gamepad B.

## Verified Mechanics

- `Phase Burst`: Shift / Gamepad B starts a short protected phase window. It sets temporary invulnerability and visual alpha/ring feedback, but it does not add ship movement.
- `Near Miss`: passing close to enemy shots without contact awards near-miss score and can build danger-dodge/graze reward windows.
- `Tractor Ships`: destroying a tractor ship while its beam is active breaks the pull, clears nearby shots, and can hijack nearby enemies for bonus score.
- `Combos`: fast enemy kills maintain the kill chain; tough targets can slow or break the rhythm.

## Implementation Summary

- Renamed the How To Play `DODGE` card to `PHASE BURST`.
- Changed the short in-game active phase label from `DODGE` to `PHASE`.
- Replaced the joke-heavy How To Play copy with concise tactical guidance for movement, shooting, Phase Burst, combos, near misses, tractor ships, pickups/bonus drones, and run modes.
- Added all new How To Play strings to supported locale files.
- Fixed the How To Play card layout so the final full-width `RUN MODES` card no longer overlaps the `PICKUPS & BONUS` card.
- Expanded `npm run check:how-to-play` to simulate:
  - `1920x1080` at `100%`, `150%`, `175%`, and `200%`
  - `3840x2160` at `100%`, `150%`, `175%`, and `200%`
  - Main-menu and pause-menu How To Play screenshots in each scenario
  - Missing/old card labels, NaN/missing text, off-screen text, card/footer/button overlap, and card-to-card overlap

## Player-Facing Sections

- Move
- Shoot
- Phase Burst
- Combos
- Near Miss
- Tractor Ships
- Pickups & Bonus
- Run Modes

## Screenshot Evidence

Current focused evidence:

- `test-results/how-to-play-2026-06-22T21-11-03-471Z/report.json`
- `test-results/how-to-play-2026-06-22T21-11-03-471Z/3840x2160-scale200/menu-how-to-play.png`
- `test-results/how-to-play-2026-06-22T21-11-03-471Z/3840x2160-scale200/pause-how-to-play.png`

## Scope

No gameplay mechanics, balance, score formula, XP formula, progression, save format, leaderboard identity, achievements metadata, Steam Cloud settings, AppID, depot IDs, or Steamworks metadata were changed.

## Private Steam Build

- Source commit: `24dc7bf56f2ff06c2db687226c5c21c19479556a`
- Packaged version: `v2026-06-22_23-22-17`
- Packaged gitSha proof: `24dc7bf` in `test-results/packaged-exe-smoke-2026-06-22T21-25-48-560Z/report.json` and `test-results/packaged-perf-smoke-2026-06-22T21-26-27-604Z/report.json`
- VDF proof: AppID `4765070`, depot `4765071`, and `"SetLive" ""`
- Private unassigned Steam BuildID: `23863622`
- Upload evidence: `release/steamworks/steam_upload_evidence_how_to_play_phase_burst_20260622_23863622.json`
