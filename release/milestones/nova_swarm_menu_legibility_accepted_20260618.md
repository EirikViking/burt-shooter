# Nova Swarm Menu Legibility Accepted Milestone — 2026-06-18

Manual test status: accepted by user.

## Accepted Steam Test

- Accepted private Steam BuildID: 23809188
- Depot manifest: 2093552943102439710
- Source commit packaged: 8b0d5609c41b686979446a8e88d902f5ca89afa5
- Evidence commit before milestone doc: b07272b13f0549fbdaabd8e7447e6f3802863312
- Branch: codex/cinematic-hangar-menu-button-legibility-goal-20260618
- Evidence file path: release/steamworks/steam_upload_evidence_dock_icon_safe_area_20260618_23809188.md
- Visual artifact folder: test-results/menu-button-legibility-goal-2026-06-18T19-02-38-141Z/

## Accepted State

- Cinematic Hangar main menu accepted.
- Derived glyph menu default.
- Dock icons have left safe-area breathing room.
- Sector Challenge text contained.
- Compact top-right Exit.
- No big Exit dock tile.
- No Sector Challenge arrows.
- Select Start Point overlay preserved.
- Sector 5 starts at Sector 5.
- Checkpoint 10 starts at Sector 11.
- Checkpoint 20 starts at Sector 21.
- Checkpoint 30 starts at Sector 31.
- No immediate Overrun reward on checkpoint starts.
- Threat Codex unread marker preserved.
- Prism Splitter and powerup visuals preserved.
- Steam bridge preserved.
- Leaderboard identity remains nova_swarm_global_score_v2.

## Checks Summary

- All requested packaging, menu, powerup, and build checks passed.
- `npm run smoke` hit only the known allowed flaky timeout at `scripts/smoke-playtest.mjs:764:26` after `10-level3-gameplay.png`.
- Packaged/current smoke and perf passed.
- Packaged gitSha was `8b0d560`.

## Steam Upload Safety

- SetLive blank, exactly `"SetLive" ""`.
- No public/default assignment.
- No sector-continue-test assignment.
- No Steam branch assignment by Codex.

## Rollback

- Steam rollback: manually reassign private branch to previous known-good BuildID.
- Git rollback to accepted milestone: checkout accepted tag once created.
- Source revert if needed: `git revert 8b0d5609c41b686979446a8e88d902f5ca89afa5`.

## Future Work Rule

Build forward from the accepted milestone and forward branch, not from older menu/icon branches.
