# Forum 129 powerup ImageGen provenance

Date: 2026-08-22

Baseline: `103f397a751a49863370a775d98a6416d5fd4326`

Released reference: Steam BuildID `24861184`

## Historical-art decision

All twenty assets from `4eed7c6` were inspected before generation. Their central concepts were mechanically accurate and visually distinct, so they were retained as semantic and composition references. None was retained as final art.

The exact rejection reason applies to all twenty: the files were produced by `scripts/generate-powerup-icon-refresh-20260617.py` from simple Pillow lines, polygons, circles, and glow layers. At native and gameplay size they lacked the modeled materials, depth, lighting, surface detail, and premium finish of the released icon family. That made them materially below the game's current visual quality even though their concepts were useful.

## ImageGen method

Codex's internal ImageGen skill was used once per powerup. Each request used:

- the corresponding `4eed7c6` icon as the semantic/composition reference only;
- a released BuildID `24861184` powerup icon as the rendering-style reference only;
- a premium, high-detail, 3D sci-fi arcade collectible treatment;
- a strong unique silhouette and central symbol readable at 48 px;
- Nova Swarm metallic framing, cyan edge lighting, controlled mechanic-specific accent colors, safe padding, genuine transparency, and no text or letters.

Mechanic-specific prompt subjects:

| Powerup | Final central metaphor |
| --- | --- |
| Prism Splitter | A faceted prism splitting one beam into four lanes |
| Rail Surge | A coil-rail projectile punching through successive plates |
| Chrono Anchor | A mechanical anchor and chain fixing a clock ring in place |
| Blink Drive | One ship shown at two positions across a space fracture |
| Nano Patch | A cracked armored hull plate repaired by a luminous cross and nanites |
| Score Fever | An explosive gold score star surrounded by prize tokens |
| Gravity Well | A purple singularity pulling nearby objects inward |
| Drone Carousel | Exactly four cyan drones orbiting one control hub |
| Plasma Lance | A red-orange energy lance piercing an armored plate |
| Stasis Net | An icy hexagonal net freezing incoming projectiles |
| Aegis Burst | A shield actively intercepting multiple incoming shots |
| Jackpot Lens | A gold optic drawing prize tokens into its focal point |
| Ion Dash | A ship accelerating through green ion lanes and a shock cone |
| Saw Matrix | Exactly five energized saw blades in a coordinated matrix |
| Mirror Shots | Three bright parallel projectiles mirrored from a central emitter |
| Mercy Protocol | A winged rescue-heart and medical cross protected by an emergency shield |
| Target Paint | A magenta targeting reticle with converging tracer marks |
| Void Crown | An elaborate purple void-crystal crown with a singularity core |
| Swarm Contract | Exactly three linked lime/violet nodes pulling a nearby pickup inward |
| Pulse Refund | A mint pulse converting hostile bullets into gold score objects |

Thirteen first-pass generations contained a rendered transparency checkerboard. Each was corrected with a background-only ImageGen edit; the foreground design was kept unchanged. The selected generated bitmaps were then resized and centered on transparent 192x192 canvases with 10 px safe padding. ImageMagick performed only this mechanical resize/pad/metadata normalization. No Python or procedural drawing created final art.

## Final files

The twenty production assets retain their existing manifest paths under:

`public/art/generated/nova-swarm/powerups/nova-powerup-<powerup-id>-20260613.png`

The labelled final contact sheet is:

`public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260617-new-batch.png`

Runtime and comparison evidence is under:

`test-results/forum-129-final-evidence/`
