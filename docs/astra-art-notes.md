# Astra presentation

Orbital foundry: cool machined hulls, ceramic armor, restrained fleet markings,
planetary depth and quiet central space. Colored enemy attacks and pickups remain
the strongest small signals. Existing bosses and special ships retain their identities.

The 25 player and 50 enemy meshes, three orbital scenes, menu spacecraft and UI
plates are original work made for this project. No purchased or third-party visual
assets were imported. Existing Orbitron/Rajdhani and locale fonts are unchanged;
their bundled license files remain under `public/fonts/`.

Blender 4.5.4 Windows portable was obtained from the official free distribution:
https://download.blender.org/release/Blender4.5/blender-4.5.4-windows-x64.zip
Blender is GPL software; its license does not impose GPL on rendered artwork:
https://www.blender.org/about/license/ . No artwork attribution is required by Blender.
The Blender Python generator is provided under GPL-3.0-or-later. Original rendered
assets remain project artwork. Sharp, PixiJS, Electron and Vite use the repository's
existing dependencies; no runtime engine or paid API was added.

Regenerate from this repository root with a local Blender 4.5 executable:

```
blender --background --factory-startup --python scripts/render-astra-fleet.py -- player 25
blender --background --factory-startup --python scripts/render-astra-fleet.py -- enemy 50
blender --background --factory-startup --python scripts/render-astra-fleet.py -- scenery 3
blender --background --factory-startup --python scripts/render-astra-fleet.py -- hero 1
node scripts/pack-astra-art.mjs
```

Editable first-variant `.blend` scenes and source renders are in `docs/astra-models/`.
The Python source regenerates every variant. UI SVG sources are in
`public/art/astra/source/`. The packer fits each flight sprite to the corresponding
starting artwork's alpha footprint and canvas dimensions. Its registration receipt
is checked by `node scripts/check-astra-visual-integrity.mjs` against the running
development server. Ship indices, gameplay configuration, collision radii, ranked
policy and saved identities are unchanged.

The legacy hull material pass is cached once per texture and preserves every alpha
byte. Hull breakup has a separate 40-sprite pool, fixed mathematical motion and no
gameplay RNG calls. It respects reduced motion. Existing attack telegraphs, focus
and hitbox markers remain in their original positions.

Evidence under `test-results/astra-*` is from the running game. Boss/death/reward
captures use explicit offline staging. General scene comparisons share resolution
and scenario, not an identical replay; the general `seed` URL parameter is not a
supported seeded-run contract. Performance conclusions must use equivalent final
measurement runs rather than screenshots or render times.
