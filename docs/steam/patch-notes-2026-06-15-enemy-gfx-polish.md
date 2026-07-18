# Nova Swarm Patch Notes - Enemy Readability Pass

Document timestamp: 2026-06-15 09:31 CEST

Pilots called out a few support ships and late-wave enemies that looked too soft, too flat, and too much like little glowing badges. Fair hit. This update sharpens that whole visual family.

## What Changed

- Reworked the full late-mayhem enemy sprite set: 177 enemy/support silhouettes now use darker metal hulls, sharper outlines, smaller cores, and cleaner neon accents.
- Improved boss-support ship readability in the Codex and in combat. Ships like Weld Barge, Union Courier, Fuel Canoe, and the other support craft should now read as ships first, not pastel UI tokens.
- Removed the oversized baked circular glow look from that asset family. Runtime effects still add energy, but the base art is now crisp enough to survive busy combat.
- Preserved enemy counts, names, unlock timing, balance, Codex identity, and performance budget. This is a visual polish pass, not a difficulty bump.
- Added an internal imagegen visual reference for the new direction, then regenerated the deterministic SVG asset set so the shipped files stay reproducible.

## Screenshot Suggestions

- Codex enemy/support view after the update: `test-results/late-mayhem-visual-check-2026-06-15T07-12-36-020Z/late-mayhem-contact-sheet.png`
- Imagegen reference sheet: `public/art/generated/nova-swarm/references/enemy-ship-readable-style-reference-20260615.png`
- In-game Sector 14+ combat with support ships visible.

## Build Notes

This update is intended for a private Steam build first. Steam live branch remains untouched unless manually promoted later.
