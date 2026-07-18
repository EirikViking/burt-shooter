# Nova Swarm Space Tax Audit Removal - 2026-06-23

## Problem Report

Player feedback called out the `SPACE TAX AUDIT` ambient easter egg flyby as ridiculous and distracting. This pass removes that specific easter egg from runtime instead of redesigning its visuals or sound again.

## Removal Summary

- Removed `space_tax_audit` from `src/config/EasterEggCatalog.js`.
- Reduced the easter egg catalog total from 10 to 9.
- Removed the dedicated Space Tax Audit SFX key and MP3 manifest entry.
- Removed the generated Space Tax Audit flyby art manifest entry.
- Deleted the generated PNG and MP3 files.
- Removed localized Space Tax Audit title/body strings because the event can no longer occur.
- Removed the preload/fetch path for the deleted flyby art.
- Added a defensive runtime guard so stale forced `space_tax_audit` objects cannot spawn a flyby.

The generic ambient easter egg framework remains because the other non-Space-Tax easter eggs still use it.

## Evidence

- `npm run check:easter-eggs`
- `npm run check:easter-egg-flyby`
- Focused report: `test-results/space-tax-audit-removed-2026-06-23T14-54-25-013Z/report.json`

The focused check verifies:

- Space Tax Audit is not registered in the runtime easter egg catalog
- picker output cannot return `space_tax_audit`
- the generated PNG and MP3 no longer exist
- asset manifest and sound catalog do not reference deleted files or SFX keys
- locale files do not retain the removed player-facing strings
- PlayScene does not preload or fetch the deleted Space Tax Audit art
- stale forced Space Tax Audit objects are rejected before flyby creation

## Scope Guard

No gameplay balance, score formula, XP formula, leaderboard identity/behavior, achievements metadata/behavior, Steam Cloud settings, save format, Mayhem recalibration, boss behavior, enemy behavior beyond the decorative removal, AppID/depot, store visibility, or Steamworks metadata were changed.
