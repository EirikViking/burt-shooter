# Nova Swarm Codex Unread And Feedback Polish - 2026-06-22

## Problem Report

Player feedback called out that the main-menu Threat Codex glow could look stale or confusing. The intended behavior is: glow only for Codex discoveries added since the last Threat Codex view, clear when Threat Codex is opened, persist across restart until viewed, and remain isolated per Steam/profile.

This pass also adds small feedback polish for bonus drone rewards and a short How-to-Play reminder for graze/near-miss and tractor-beam ship behavior.

## Implementation Summary

- Threat Codex unread IDs remain stored in `nova.threatDiscovery.v1` as `category:id` markers.
- Runtime state normalization, renderer Steam Cloud merge, and Electron save sanitation now discard unread markers that do not correspond to discovered Codex items.
- Threat Codex open still calls `clearThreatCodexUnread()`, marking current discoveries read.
- New discoveries still add unread markers through the existing `recordThreatSeen` / defeat record paths.
- Bonus drone hazard destruction now queues a `BONUS +score` score popup through the existing collision side-effect queue while keeping the existing score award path.
- How-to-Play now includes a near-miss/graze row and clearer tractor-beam text.

## Storage And Profile Scope

Threat Codex unread state is profile-scoped with the existing `nova.threatDiscovery.v1` key. It is included in the profile-scoped storage list and Steam Cloud save payload, so one Steam profile's unread Codex marker does not leak into another.

No new save key, schema version bump, or profile rescue path was added.

## Screens And Checks Covered

- Main-menu Threat Codex glow semantics: `npm run check:threat-codex`
- Open Threat Codex clears unread markers: `npm run check:threat-codex`
- Restart persistence and later discovery glow return: `npm run check:threat-codex`
- Profile isolation: `npm run check:profile-isolation`
- Large Codex / no 500-cap regression: `npm run check:threat-codex`, `npm run check:scout-codex-persistence`
- How-to-Play menu/pause screenshots: `npm run check:how-to-play`
- Bonus drone visual-only reward cue and collision hotpath: `npm run check:mayhem-collision-hotpath-stress`

## Evidence Paths

- `test-results/how-to-play-2026-06-22T10-00-41-603Z/menu-how-to-play.png`
- `test-results/how-to-play-2026-06-22T10-00-41-603Z/pause-how-to-play.png`
- `test-results/how-to-play-2026-06-22T10-00-41-603Z/report.json`
- `test-results/mayhem-collision-hotpath-stress-2026-06-22T10-01-37-128Z/report.json`

## Known Limitations

- The unread marker is a compact count/marker, not a per-row "new" label inside the Threat Codex list.
- The bonus drone score popup uses the existing floating score text system, so it shares that system's active-popup cap during extreme bursts.
- This pass does not redesign the Codex, change reward amounts, or alter tractor/graze mechanics.
