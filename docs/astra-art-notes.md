# Astra presentation

## Second pass

The second pass replaces the first pass's flat hulls with sculpted industrial
spacecraft: layered cast armor, recessed machinery, crystalline canopies, metallic
edges, hydraulic lines, separate turret hardware and animated exhaust. All 50 boss
presentations are rebuilt, with ten structural archetypes and five escalating tiers.
The original profile IDs, attacks and collision references remain authoritative.

Thirty player hulls (including five special unlocks), fifty enemy hulls and three
animated boss components are original Blender models. Forty-eight 2048x1152
planetary scenes change every five sectors through Sector 240, then cycle. These
use procedural continents, cloud decks, atmospheres, gas bands, rings and moons;
no satellite imagery or external textures are used. Boss and special-ship source
identities remain intact behind presentation mappings.

All thirty hangar ships also have dedicated 1024-pixel angled showroom renders,
packed into efficient 768-pixel previews with projected engine-light anchors.
The main-menu flagship uses a 1536-pixel render with additional pressure armor,
hydraulic pistons, avionics contacts, reactor containment and vectoring engine
irises. A menu-only material pass moves a restrained reflection across the metal;
small ignition arcs and glow use a shared texture and trigonometric animation.
Reduced motion stops the hover, banking, reflection sweep and electrical arcs.
Three modeled station interiors and shared machined console materials carry
the direction across menus, hangar, codex, settings, help, pause and rewards.

Destruction uses an original 24-frame Cycles volumetric combustion animation,
packed into one 2688x1792 WebP atlas. No stock explosion footage or external
textures are used. The runtime interpolates registered frames, caps concurrent
effects at 18, retains a brief reactor pressure front and throws fragments of the
actual boss hull. Reduced motion removes the pressure front and hull fragments.
The previous particle allocator and exact RNG stream remain intact underneath
the replaced visual layer; the regression compares them with commit 682264e.
Victory sparks and positive energy rewards remain distinct from destruction.

Regenerate the second pass with the same local Blender installation:

```
blender --background --python scripts/render-astra-v2.py -- player 30
blender --background --python scripts/render-astra-v2.py -- enemy 50
blender --background --python scripts/render-astra-showroom.py -- hero 1
blender --background --python scripts/render-astra-showroom.py -- showroom 30
blender --background --python scripts/render-astra-bosses.py -- boss 50
blender --background --python scripts/render-astra-components.py
blender --background --python scripts/render-astra-worlds.py -- world 48
blender --background --python scripts/render-astra-interfaces.py -- interface 3
node scripts/pack-astra-v2.mjs
blender --background --python scripts/render-astra-detonation.py
node scripts/pack-astra-detonation.mjs
```

Editable representative scenes are in `docs/astra-v2-models/`; regenerable raw
renders are ignored, and packed game assets remain under `public/art/astra/`.
The generator scripts carry GPL-3.0-or-later headers; their original rendered
outputs remain project artwork, with no external attribution requirement. The
free tools and unchanged font licenses listed below also apply to this pass.

The bug fixes in this pass synchronize debug-run policy, invalidate translated
menu tiles on language changes, load rank halos without missing-cache warnings,
restore the point-defense sound event and handle disconnected logging pipes.
The obsolete boss-animation test fixture now uses the existing warning-token API;
its motion/charge assertions have not been weakened.

## First-pass provenance

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
