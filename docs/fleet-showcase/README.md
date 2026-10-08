# Full-fleet showcase production

This pass extends the approved Sparrow work at `43dc8c7` to all 30 playable ships. It changes the interactive menu/hangar models only. The original Sparrow source and GLB, legacy fleet, combat sprites, gameplay code, progression, saves, leaderboards, achievements, ship ordering and localization are preserved.

## Visual evidence

Open [review.html](review.html) through the local development server. Final evidence contains each ship in the actual main menu (hero, side, rear, underside) and hangar, a representative runtime rotation video, and an all-fleet contact sheet made from the game's transparent ship buffers. Blender clay/surfaced inspection renders are separately labelled. Screenshots are unretouched. Timing from capture sessions is not performance evidence.

## Construction and materials

Thirty editable Blender sources preserve the original silhouette plans and characteristic palettes. The pipeline reuses Sparrow's coherent pressure cabin, framed glazing and export lessons, with individually dimensioned lifting structures, fairings and class features. Compact round, general-purpose petal and flattened heavy propulsion families use recessed interiors. Eirik uses long conformal gold armor and a red/brown central prow; shield ships have curved structural arcs; the carrier has recessed equipment bays.

Sparrow retains its approved construction with a modest finish/glazing pass. All ships use mapped painted armor, controlled roughness and normal variation, localized service staining, nozzle discoloration, dark internal machinery and restrained fasteners. These are maintained vehicles, not wrecks. The maps contain no directional illumination or baked highlights. Glass uses tint, transparency and reflections over suggested interiors; it does not simulate optical refraction.

The warm opening/cool fill and reflection field from the approved showcase now serve the entire fleet. Glass reflection strength is adjusted separately from paint. Selected hangar framing prefers 1.25 times the existing sprite scale, capped at a 420-pixel canvas on desktop and 230 on mobile before the scene's viewport scaling. This bounds oversized prestige ships without changing the surrounding UI.

## Editable assets and reproduction

- `ships/NN/source.blend`: editable source; relative paths to the adjacent export textures.
- `ships/NN/export/textures/`: five authored PNG maps, 1024 or 1536 square according to design.
- `ships/NN/export/model.glb`: Blender export.
- `../../public/art/fleet-showcase/NN.glb`: installed game-ready asset.
- `ships/NN/design.json` and `asset-cost.json`: identity, construction family and measured export costs.

Run from the repository root with Blender 4.5.13, Python/numpy available to Blender, Node and the repository dependencies:

```powershell
& 'D:/vibe-coding-e/codex-blender-test/tools/blender-4.5.13-windows-x64/blender.exe' -b --python scripts/build-fleet-showcase.py -- --ids 1,2,3
node scripts/install-fleet-showcase.mjs 1,2,3
node scripts/check-fleet-showcase.mjs
node scripts/verify-fleet-showcase.mjs --capture
node scripts/verify-fleet-showcase.mjs
node scripts/verify-fleet-showcase.mjs 1,3,7,17,27,28,30 --capture --video
node scripts/build-fleet-showcase-review.mjs
```

Use IDs 1 through 30 for a complete rebuild. The installer uses glTF Transform 4.2.1 from the existing local tool cache; see its `cli` path if reproducing on another machine. It creates tangents, optimizes without mesh decimation or texture format substitution, repairs numerical degeneracies, and validates the GLB. Combat sprite generation is absent from this pipeline. The checker hashes original assets and compares decoded authored/runtime albedo pixels, guarding against the earlier texture-path issue.

Run the performance command alone, with Blender, builds and recording stopped. The harness uses an isolated local QA profile to unlock/select ships; it does not alter the user's saves or submit scores.

## Provenance and limits

Geometry and maps are locally authored using the project's own Sparrow construction helpers and existing fleet design/palette definitions. No paid service, new third-party artwork or external asset upload was used. Existing environment artwork is unchanged. Blender and glTF Transform are processing tools, not external asset sources.

Several ships deliberately share pressure-cabin and propulsion manufacturing families. This is visible in the fleet overview and remains the main limitation in individuality. Interiors are selective suggestions and fine wear is restrained at normal viewing size. Rear and underside construction is present, but not every small service fitting is independently modeled. The result should be judged in the actual game; polygon counts and validators are not an art-quality score.

## Delivery validation

Fleet contracts, isolated performance, packaged asset hashes and Steam branch receipts are recorded alongside this report as their checks complete. No new untranslated player-facing strings were introduced. Steam delivery is restricted to the existing `sector-continue-test` branch; the public build and Steam Cloud configuration must remain unchanged.
