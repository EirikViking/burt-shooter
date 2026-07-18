# Nova Swarm Green Flyby Readability - 2026-06-23

## Problem report

A player screenshot showed the `SPACE TAX AUDIT` easter egg flyby as a large bright green diamond/eye shape crossing the playfield. It looked like a hazard, pickup, or target even though the event is only ambient flavor.

The follow-up audio report was that the old reused SFX was annoying.

## What the object is

`SPACE TAX AUDIT` is an ambient easter egg from `src/config/EasterEggCatalog.js`. The gameplay path is:

- `PlayScene.updateEasterEgg()`
- `PlayScene.spawnAmbientEasterEgg()`
- `showLoreBanner(...)`
- `spawnEasterEggFlyby(...)`
- optional easter egg SFX

It is decorative/lore-only. It does not collide, damage the player, give score, give XP, act as a pickup, become shootable, or change run rules.

## Implementation summary

- Replaced the vector target-like flyby with a generated transparent PNG craft: `public/art/generated/nova-swarm/easter-eggs/nova-space-tax-audit-flyby-20260623.png`.
- Moved the flyby from the foreground UI overlay to a dedicated non-interactive decorative overlay under the HUD.
- Removed the old ring/target visual language and kept only a faint wake behind the generated craft.
- Added debug metadata exposed through `render_game_to_text().arcadeRun.activeEasterEgg` so automated checks can prove the object is decorative and non-interactive.
- Added a dedicated ElevenLabs-generated SFX: `public/audio/sfx/nova-swarm/nova_space_tax_audit_flyby.mp3`.
- Changed `space_tax_audit` from the reused `computerNoise` SFX to `space_tax_audit_flyby`.

## New SFX

The new SFX is a short sci-fi audit-drone flyby with a soft whoosh, scanner sweep, and small data chirps. It is intentionally non-alarm, non-voice, and mixed quieter than combat/gameplay cues.

No API keys or generation credentials are stored in the repo.

## Evidence

- Focused screenshot and report: `test-results/easter-egg-flyby-2026-06-23T09-30-45-369Z/`
- Screenshot: `test-results/easter-egg-flyby-2026-06-23T09-30-45-369Z/space-tax-audit-flyby.png`
- Automated harness: `npm run check:easter-egg-flyby`
- Static easter egg/SFX check: `npm run check:easter-eggs`

The focused harness verifies:

- `space_tax_audit` active flyby uses the generated art path.
- visual intent is `decorative_lore_signal`.
- parent layer is `decorativeOverlay`, not the foreground UI overlay.
- z-index is the decorative overlay depth, under HUD surfaces.
- event mode is `none`.
- it is not tracked as ambient bonus drone, enemy, enemy bullet, or player bullet.
- collision, shootable, damage, and reward flags are all false.
- the dedicated SFX play path does not fail.

## Known limitations

The easter egg still has no gameplay payoff. That is intentional for this pass because changing rewards, score, pickups, damage, unlocks, or run rules would be a separate design/balance decision.
