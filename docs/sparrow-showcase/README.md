# Nova Sparrow showcase realism prototype

Open [the visual review](review.html) through the local game server. Before/after menu and hangar screenshots are genuine 1920×1080 game captures, with matching turntable pose and camera. `renders/` contains explicitly offline neutral Blender inspection renders. `runtime-rotation.webm` records the real game model and transitions. Intermediate work in `iterations/` is not final evidence.

Scope: Nova Sparrow's interactive main-menu/hangar model only. Branch `codex/sparrow-showcase-realism`, baseline `dd16b81030a092e7a8942a69e80753f65f2fbaf8`. Existing inherited Steam reply/review drafts remain untouched. No Steamworks settings, upload, publishing, deployment, gameplay code, progression, saves, text/layout or other ship assets were changed.

## What changed and why

The corrected baseline GLB already contained its useful authored paint maps. The primary bottlenecks were faceted engine housings, a closed opaque canopy, sparse construction detail and generic bright room reflections. This was not another texture-path repair.

The new dedicated asset has custom curved pressure hull/cowls and tapered wing surfaces, fitted panel boundaries, hollow inlet ducts with vanes, formed exhaust petals and recessed liners, a cabin with seat/consoles, framed transparent glazing, recessed cooling louvers, underside service hatches and rear equipment closures. Four render/inspection iterations refined panel thickness/shading, removed raised radiator bars, closed open rear ends and replaced blank dark bulkheads with painted service closures.

Paint is predominantly dielectric with small manufacturing variation, fine normal detail and varied roughness. Titanium fittings, sooted liners, oxidised exhaust alloy and glazing have separate materials. The five 2048px maps contain no directional lighting or specular highlights. The installed GLB's decoded albedo pixels match the authored maps exactly.

Sparrow alone gets locally constructed warm-opening/cool-wall reflections and scene-specific light direction. Shared tone mapping and exposure remain unchanged. Other ships retain their prior lights, environment and files. A single shared renderer still loads only the selected model; the extra reflection texture is a fixed shared cache, not one cache per selection.

## Reproduce

Use Blender 4.5 LTS, Node with the repository dependencies, and glTF Transform CLI 4.2.1. Run from the repository root:

```powershell
& '<Blender executable>' --background --python scripts/build-sparrow-showcase.py
$env:GLTF_TRANSFORM_CLI='<path to @gltf-transform/cli/bin/cli.js>'
node scripts/install-sparrow-showcase.mjs
node scripts/check-sparrow-showcase.mjs
& '<Blender executable>' --background --python scripts/render-sparrow-showcase-before.py
```

The Blender generator writes only this documentation/source directory. The installer writes only `public/art/sparrow-showcase/model.glb`. Neither has a combat-sprite generation/install path. The editable `.blend` retains construction objects/modifiers and uses relative paths to `export/textures/`. The raw export is retained alongside it; optimized intermediates are reproducible and ignored by git. Export applies/triangulates construction geometry, generates MikkTSpace tangents, repairs only degenerate tangent frames, then validates the final GLB. Texture compression was attempted but the local CLI's image-library colourspace conversion failed; the delivered asset retains exact PNG maps instead.

Start the local server on port 5201 for the supplied capture scripts:

```powershell
node scripts/capture-sparrow-showcase.mjs after
node scripts/verify-sparrow-showcase.mjs --video
# Run separately, after all builds, Blender and capture jobs finish:
node scripts/verify-sparrow-showcase.mjs
```

These scripts use isolated browser profiles. The QA profile unlocks only the comparison ship for selection tests; it does not alter the user's save. Runtime pose captures use the real model's full yaw and existing ±1.4 pitch limits. Full screenshots are not retouched. Browser video timing is excluded from performance claims.

## Costs and validation

See [asset costs](asset-cost.json), [isolated performance](performance.json), [runtime checks](rotation-verification.json), [gameplay contracts](contracts.json), and [export validation](export-validation.log). The model is 37,426,400 bytes (35.69 MiB), 331,876 triangles, nine materials, five 2048px maps. These are measured counts, not a visual quality score.

Measured in isolated 1920×1080 Chrome/ANGLE on the NVIDIA RTX 2060, with no Blender, build or video capture running: both 15-second rotation samples averaged 16.67 ms per frame (approximately 60 fps); p95 was 16.8 ms in the menu and 16.9 ms in the hangar. CPU render/canvas-copy wall time averaged 0.85/0.71 ms respectively; this is not a GPU timer. The ship buffers were 1536px/768px. Fresh-profile game readiness was 6.96 seconds including game startup. Twelve repeated selections returned to 11 geometries/10 textures and one resident ship; combat returned to zero model geometries, three shared textures and zero resident ships. No browser errors or warnings occurred. These are short browser measurements, not a long-session packaged Electron benchmark.

- All 150 existing fleet assets, including all 30 combat sprites, are byte-identical to baseline. Gameplay/config/scene/progression/save-facing source files are unchanged.
- Dedicated showcase contract and existing fleet contract pass. The latter now explicitly describes its retained Sparrow bytes as legacy/fallback protection rather than the new art ceiling.
- `npm run check:release-line` passes localization/marketing prerequisites.
- `npm run build:current` passes, including its existing validation suite and i18n checks. Existing large-chunk warnings remain. The final rear-panel-only GLB revision was copied into the completed `dist` output and hash checked. After reducing reflection pre-blur to the supported sampling range, the final production JavaScript bundles were rebuilt while retaining the already-copied public assets (`final-bundle.log`).
- `npm run check:i18n-ui` passes for English and German; no page errors, placeholders or English UI leaks. No UI strings were added. Tiny manufacturing stencils on the model are English asset markings, not translated menu text.
- `npm run check:controller-flow` passes against the production bundle.
- Runtime evidence records pointer dragging, menu/hangar transitions, comparison-ship selection, return to combat and model/resource counts. See the JSON for exact results and any measurement limitations.

## Remaining weaknesses and provenance

This is still a clean aerospace design. The underside has less secondary construction detail than the dorsal surface, and the cockpit is a restrained interior suggestion rather than a complete cabin. Glazing uses transparent surfaces and environment response, without optical refraction. The existing hangar layout presents the model relatively small; its layout was intentionally preserved. The GLB validator reports no errors or warnings, but flags 25 collapsed bevel triangles as informational degenerate faces; they have no visible area. Film-prop credibility is a visual acceptance decision for the user, not a validator result. No fleet expansion is included.

All new geometry and texture pixels were authored locally for Nova Swarm. No external meshes, scanned assets, paid tools, AI service uploads or third-party artwork were used. Blender, NumPy and glTF Transform are production tools, not embedded asset content. Existing game backgrounds remain unchanged.

Changed files: two runtime UI renderer components, the fleet-check clarification, `.gitignore`, six dedicated source/export/capture/check scripts, this source/evidence folder and the dedicated public GLB. Rollback after the scoped implementation commit: `git revert <that commit>`; this preserves unrelated work and the original assets.
