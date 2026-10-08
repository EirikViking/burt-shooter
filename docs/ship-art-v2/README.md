# Nova Sparrow art-direction prototype

Nova Sparrow has been redesigned and integrated into the existing Nova Swarm runtime. It remains a real draggable 3D GLB in the menu/hangar and a 2D render of the same Blender model in combat. **Prototype only: awaiting the owner's visual approval before any fleet work.**

Open [the visual comparison page](review.html). It separates genuine runtime captures, offline clay renders, and early concept blockouts. Screenshots are unretouched. The runtime video uses scripted QA input, not human play, and is silent.

## Provenance and safety

- Workspace: `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`.
- Branch: `codex/ship-art-direction-v2`.
- Baseline: `0439b1f1064416416d255bc1fef881412c568927`, from the user's current `codex/astra-visual-overhaul` checkout. Fetch/status/branch/log/worktree checks preceded changes.
- The two existing untracked Steam reply/review drafts were preserved. No reset, clean, stash, push, publication, Steam upload or deployment occurred. Steamworks settings were untouched.
- Only Sparrow's assets changed. Other fleet receipts and asset files were verified unchanged. Game rules, stats, hitboxes, firing origins, saves, progression, achievements, leaderboards, menu layout and localization files were untouched.
- Original geometry, panel maps and livery authored locally in Blender 4.5.13 using `bpy`. No downloaded models/textures, paid generation, external asset uploads, or third-party asset licenses. Blender, glTF Transform 4.2.1, Sharp and FFmpeg were used locally. No game dependency was added.

## What was wrong

The actual pipeline is `scripts/build-solid-fleet.py` → Blender → GLB plus PNG/WebP → Three `SolidShipView` → a canvas texture inside Pixi. Gameplay uses the 512px PNG through existing `GameAssets`/`Player` contracts.

**Geometry/design:** repeated thick wing layers, equipment blocks, exposed engine collars, oversized surface parts, a separate faceted canopy, and an unrelated lower keel dominated the design. These features were in the source mesh; changing lighting alone could not fix them.

**Materials/export:** the original `.blend` contains no image textures besides Render Result. Its white enamel uses metalness 0.48/roughness 0.27, colored trim 0.58/0.26, and glazing 0.68/0.13. Copper and titanium have procedural noise/bump; those nodes do not survive into the texture-free GLB. The main paint materials did not have that detail to begin with. See [source audit](source-audit.json).

**Runtime:** the bright cool key and room reflection emphasize every shiny collar and plate. Sparrow now uses a gentler cool key, warm opening light, cooler fill, and lower environment intensity. Other ships retain their original light settings. The backdrop, exposure, rotation controls and framing code are unchanged.

## Design and revision

Three local 3D blockouts explored swept-interceptor, cranked-arrow, and forward-sweep layouts. The swept interceptor best retained Sparrow's broad fighter role. The first rounded clay version looked molded, so the wings and nacelles were revised to controlled sectional surfaces.

The final model uses a continuous pressure hull, tapered wing sections, integrated nacelle shoulders, an elongated low canopy/coaming with framing, open intake ducts, deep contoured nozzles, ventral access panels and restrained service detail. The raised dorsal piece was replaced by painted livery after runtime review. It has white/cobalt paint, satin metal, graphite structure, smoked glazing and recessed ion material.

Four 1024px images supply two lighting-free base colors, shared roughness/metalness and a shallow tangent-space panel normal map. The GLB embeds them; explicit tangents avoid runtime-dependent normal reconstruction. No lighting/specular highlight is painted into the 3D base color. Lighting is intentionally baked into the separate 2D sprite render.

## Measured costs and behavior

| Property | Baseline | Prototype |
|---|---:|---:|
| GLB bytes | 2,216,520 | 1,856,220 |
| Triangles | 51,916 | 23,828 |
| Material primitives | 9 | 6 |
| Embedded images | 0 | 4 |
| Sprite frame | 512 × 512 | 512 × 512 |
| Alpha-bounds center | 255.5, 255.5 | 255.5, 255.5 |
| Horizontal alpha bounds | 47–464 | 47–464 |
| Vertical alpha bounds | 62–449 | 60–451 |

The four RGBA 1024 textures imply about 16 MiB uncompressed, or 21.3 MiB with full mip chains; this is an allocation estimate, not a measured GPU-memory total. The former texture-free asset has no equivalent map cost.

The actual runtime used Chrome/ANGLE Direct3D11 on **NVIDIA GeForce RTX 2060**, at 1920×1080, with a 1536px menu model canvas. During a 12-second scripted full yaw rotation (716 measured frame intervals), mean frame time was **16.667 ms**, p95 **16.80 ms**, max **17.30 ms**. JavaScript time for the Three render call plus canvas copy averaged **0.832 ms**, p95 **1.30 ms**. These timings include video recording and are not isolated GPU timings or a packaged-build performance claim. The local GLB resource fetch measured **181.6 ms** in that run; this is not total cold-start time.

Three menu/hangar/neighbor-return cycles retained **one** selected model. Sparrow held 6 geometries/8 reported textures; its neighbor held 9/4. Every return to Sparrow restored 6/8, and gameplay ended at 0 model geometries/2 retained renderer/environment textures. Render counters reported 12 calls/47,656 triangles for Sparrow, including its shadow pass. No full-fleet GLB preload was introduced. The neighboring model actually tested was **Pixel Needle (03.glb)**; the raw measurement file's legacy `hangar-courier` stage label refers to that neighbor, not the Courier asset.

The first resource test exposed a stale albedo upload in the shared shadow pass when moving to an untextured ship. Sparrow now owns an opaque depth material with no albedo sampler; model maps, that depth material, and image bitmaps are released on disposal. [Final measured evidence](evidence/runtime/measurements.json) and [allocation trace](resource-diagnosis.json) are included.

The gameplay sprite's frame measured **74.1×74.1 screen pixels** (visible hull about 60.5px wide), scale 0.1447265625, anchor 0.5/0.5, and local position 0/0. Combat captures show live firing, enemies, effects and the unchanged focus ring. The renderer's existing three-plume convention is preserved; it is a stylized gameplay effect, not a physical nozzle simulation.

## Validation

- `node scripts/check-sparrow-contract.mjs`: passed. Sparrow-only asset changes, unchanged gameplay/text paths, unchanged remaining fleet receipts, sprite frame/padding/centering, required UV/normal/tangent attributes.
- glTF Transform `validate`: **zero errors, warnings, infos or hints** on the delivered GLB.
- `node scripts/verify-sparrow-runtime.mjs`: passed drag rotation, complete yaw, side/rear/underside inspection, three selection/menu-return cycles, combat return, resource stability, and no page exceptions.
- `npm run check:i18n`: passed. No new or changed player-facing text; remaining new untranslated text: **none**.
- `npm run check:i18n-ui`: passed all eight locales, no page errors, placeholder hits or detected English leaks. Raw locale screenshots are in `output/playwright/ship-art-v2/i18n`.
- `npm run check:steam-electron-bridge`: passed. This is a local code check; no Steamworks setting was changed.
- `npm run build:current`: **failed on a pre-existing baseline asset**. `row_core` expects a 192×192 PNG; the unchanged file is 1254×1254. [Byte-identical baseline proof](baseline-build-failure.json). That unrelated artwork and validator were not changed.
- Separate direct Vite compilation passed (966 modules). The existing large-chunk warning remains. Public assets were copied locally, then compilation used `emptyOutDir:false, copyPublicDir:false`; no Steam package or upload was made.
- `npm run check:controller-flow`: passed against the newly compiled local build.
- `npm run smoke`: **failed** at the Settings voice audition assertion (`lastVoiceEvent === mission_control_launch`, 3500ms timeout). The script did not complete its later checks. No audio code was changed; this failure was not reproduced on a separately rebuilt baseline, so it is not claimed as proven pre-existing.
- `npm run desktop:smoke:current`: the native menu loaded and reported ready, but the smoke gate **failed** on two renderer console warnings: ANGLE shader precision warning X4122 and the existing `PCFSoftShadowMap` deprecation/fallback. This is not a clean desktop smoke pass. Neither warning was suppressed. The test read Steam bridge/leaderboard state; it reported no achievement sync requests. No settings or cloud content were changed.

## Reproduce

From the repository root, with the installed Blender executable:

```powershell
$sparrowBlender = 'D:/vibe-coding-e/codex-blender-test/tools/blender-4.5.13-windows-x64/blender.exe'
& $sparrowBlender -b --python scripts/build-sparrow-v2.py -- final
& $sparrowBlender -b --python scripts/render-sparrow-sprites.py
npx --yes @gltf-transform/cli@4.2.1 tangents docs/ship-art-v2/export/nova-sparrow.glb docs/ship-art-v2/export/nova-sparrow-tangent.glb
npx --yes @gltf-transform/cli@4.2.1 optimize docs/ship-art-v2/export/nova-sparrow-tangent.glb docs/ship-art-v2/export/nova-sparrow-runtime.glb --compress false --simplify false --palette false --texture-compress false
node scripts/install-sparrow-v2.mjs
node scripts/check-sparrow-contract.mjs
```

The first npm cache attempt encountered host cache errors. This run succeeded with `--cache C:/Users/cromk/AppData/Local/Temp/sparrow-gltf-cache-0909`. No project package file was modified.

`build-sparrow-v2.py -- studies` creates blockout studies. The editable final source is [nova-sparrow-v2.blend](nova-sparrow-v2.blend), with relative image references under [export/textures](export/textures). The final runtime GLB and sprite are installed only into the existing `01` asset paths. `install-sparrow-v2.mjs` updates only that ship's manifest receipt. Do not run the legacy full-fleet generator/finalizer over the prototype: it is the old art pipeline and can overwrite this benchmark.

For runtime evidence, start `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5199 --strictPort`, then run `node scripts/capture-sparrow-art.mjs after` and `node scripts/verify-sparrow-runtime.mjs`. Tests use isolated browser profiles and the existing local-only maintainer hooks. They do not touch the user's Steam saves.

## Changed files and limits

Runtime changes: `src/ui/SolidShipView.js`; the `01.glb`, `player/01.png`, `showroom/01.png`, `01.webp` and `01.json` assets; Sparrow's row in `docs/solid-fleet-20260908/assets.json`. Supporting authoring/export/capture/validation scripts, this source/evidence folder, and one narrowly scoped raw-output ignore rule were added.

The clean surface treatment still shows deliberate facets on the engine shoulders. It is not a heavily weathered hero model. At the existing small hangar display size, much of the fine detail is intentionally invisible. The fixed shared background remains a 2D scene, so reflection matching is approximate; no scene-specific HDR panorama or new environment was introduced. Browser runtime and local desktop smoke are distinct evidence from a Steam-packaged build. Long-run gameplay/performance and every fleet member were not exhaustively tested. **No claim of visual approval or a quality score is made.**

Approval is required before extending this direction beyond Sparrow. Rollback after the prototype commit: `git revert <prototype-commit>`; this preserves the inherited untracked drafts. The exact commit is recorded in the task's final response.
