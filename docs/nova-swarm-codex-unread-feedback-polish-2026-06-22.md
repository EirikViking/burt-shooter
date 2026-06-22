# Nova Swarm Codex Unread And Feedback Polish - 2026-06-22

## Problem Report

Player feedback called out that the main-menu Threat Codex glow could look stale or confusing. The intended behavior is: glow only for Codex discoveries added since the last Threat Codex view, clear when Threat Codex is opened, persist across restart until viewed, and remain isolated per Steam/profile.

This pass also adds small feedback polish for bonus drone rewards and a short How-to-Play reminder for graze/near-miss and tractor-beam ship behavior.

Follow-up player testing found one remaining stale-glow case: after opening Threat Codex, leaving, exiting, and restarting, the bottom-dock glow could return even though no new Codex entries had been discovered.

This follow-up also adds a requested `Confirm Exit` setting so players who preferred the old instant-quit behavior can opt out of the main-menu quit confirmation.

## Implementation Summary

- Threat Codex unread IDs remain stored in `nova.threatDiscovery.v1` as `category:id` markers.
- Runtime state normalization, renderer Steam Cloud merge, and Electron save sanitation now discard unread markers that do not correspond to discovered Codex items.
- Root cause of the restart glow was stale merge behavior: `clearThreatCodexUnread()` emptied `unreadIds`, but renderer/Electron Steam Cloud merges unioned older unread IDs back into the save.
- Threat Codex open now stores `lastViewedCodexDiscoverySignature`, `lastViewedCodexDiscoveryCount`, and `lastViewedCodexAt` alongside `unreadIds`.
- The signature is derived from the canonical sorted set of currently discovered `category:id` Codex IDs. It is used only for menu notification state and does not change actual discoveries.
- If the viewed signature matches the current discovered set, menu glow stays cleared even if stale unread IDs are restored by an older cloud/local snapshot.
- New discoveries still add unread markers through the existing `recordThreatSeen` / defeat record paths and change the canonical discovered-set signature, making the glow return.
- Settings now includes `Display -> Confirm Exit` with `ON`/`OFF`, default `ON`.
- `Confirm Exit ON` keeps the current safe quit confirmation for main-menu Esc and the top-right Exit button.
- `Confirm Exit OFF` makes main-menu Esc and top-right Exit request quit-to-desktop immediately without showing a stale modal. Gameplay Esc still pauses/opens gameplay menus.
- Bonus drone hazard destruction now queues a `BONUS +score` score popup through the existing collision side-effect queue while keeping the existing score award path.
- How-to-Play now includes a near-miss/graze row and clearer tractor-beam text.

## Storage And Profile Scope

Threat Codex unread state is profile-scoped with the existing `nova.threatDiscovery.v1` key. It is included in the profile-scoped storage list and Steam Cloud save payload, so one Steam profile's unread Codex marker does not leak into another.

The read marker lives in the same profile-scoped Codex payload:

- `lastViewedCodexDiscoverySignature`
- `lastViewedCodexDiscoveryCount`
- `lastViewedCodexAt`

`Confirm Exit` is stored as `nova_confirm_exit_v1` and included in the existing settings save payload as `settings.menu.confirmExit`.

No schema version bump, profile rescue path, Steam Cloud setting, or Steamworks metadata change was added.

## Screens And Checks Covered

- Main-menu Threat Codex glow semantics: `npm run check:threat-codex`
- Open Threat Codex clears unread markers: `npm run check:threat-codex`
- Restart persistence and later discovery glow return: `npm run check:threat-codex`
- Stale/lower cloud restore does not relight viewed current entries: `npm run check:steam-cloud-save`, `npm run check:scout-codex-persistence`
- Profile isolation: `npm run check:profile-isolation`
- Large Codex / no 500-cap regression: `npm run check:threat-codex`, `npm run check:scout-codex-persistence`
- Confirm Exit default/persistence/main-menu Esc/top-right Exit/gameplay Esc safety: `npm run check:display-settings`, `npm run check:menu-exit-focus-safety`
- How-to-Play menu/pause screenshots: `npm run check:how-to-play`
- Bonus drone visual-only reward cue and collision hotpath: `npm run check:mayhem-collision-hotpath-stress`

## Evidence Paths

- `test-results/how-to-play-2026-06-22T10-00-41-603Z/menu-how-to-play.png`
- `test-results/how-to-play-2026-06-22T10-00-41-603Z/pause-how-to-play.png`
- `test-results/how-to-play-2026-06-22T10-00-41-603Z/report.json`
- `test-results/mayhem-collision-hotpath-stress-2026-06-22T10-01-37-128Z/report.json`
- `test-results/menu-exit-focus-safety-1782125137450/report.json`
- `test-results/menu-exit-focus-safety-1782125137450/native-blur-pause.png`

## Known Limitations

- The unread marker is a compact count/marker, not a per-row "new" label inside the Threat Codex list.
- The viewed signature is a compact deterministic hash plus count of the discovered ID set. It is for notification state only, not for reconstructing discoveries.
- The bonus drone score popup uses the existing floating score text system, so it shares that system's active-popup cap during extreme bursts.
- This pass does not redesign the Codex, change reward amounts, or alter tractor/graze mechanics.
- `Confirm Exit OFF` only changes quit-to-desktop actions from the main menu. In-run pause, abandon run, and quit-to-menu flows are intentionally unchanged.
