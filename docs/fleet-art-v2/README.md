# Nova Swarm fleet art direction v2

The owner approved the Nova Sparrow benchmark and authorized extending the direction to all playable ships, then uploading a Steam test build. This continuation retains Sparrow's exact asset bytes and redesigns the other 29 ships. [Visual comparison](review.html).

**Delivered to Steam:** Build **25212721**, branch **sector-continue-test**, version **v2026-09-09_17-00-12**. Select that beta branch in Nova Swarm's Steam settings and allow the update. Authenticated post-upload verification confirms public remains **25203769**, the other test branch remains **23782673**, and Steam Cloud settings are unchanged. [Delivery receipt](steam-delivery.json).

## Scope and provenance

- Workspace: `D:\vibe-coding-e\nova-swarm-forum-129-improvements-20260822`.
- Branch: `codex/fleet-art-direction-v2`; approved baseline `e67fe3906950b2eb564e57e698deb3ff9913cf71`.
- Git fetch, status, branch, log and worktree ownership were checked before editing. The existing two Steam reply/review drafts remain untouched. No reset, clean, stash or push.
- The immediately preceding deployment receipt names `sector-continue-test`. Authenticated Steam preflight found public and that branch at `25203769`; the other test branch remained `23782673`. Public promotion is not authorized.
- All geometry and texture maps were authored locally using Blender 4.5.13 and the approved Sparrow construction helpers. No external models, images, paid services or external generation services were used. The only project-asset upload is the requested Steam test delivery. glTF Transform 4.2.1, Sharp and FFmpeg run locally; no game dependency was added.
- Stable 01–30 asset paths, ship identities, progression ordering and sprite frames remain unchanged. Real draggable GLB models remain in menu/hangar; 2D combat uses renders of those same models.

## Art and revisions

The redesign replaces stacked plates, repeated engine collars, oversized studs and unrelated blocks with sectional hulls, shaped lifting surfaces, integrated smoked canopies, intake ducts and deep expansion nozzles. Separate span profiles and structural features preserve each ship's role: narrow Needle/Scope/Rail hulls, forward-swept Skaters, broad Fan/Arc wings, heavy Guard/Siege shoulders, shield crescents, Seraph feathers and Sovereign launch bays. The approved Sparrow is unchanged.

Eirik retains red/gold and its powerful longship silhouette. Tapered gold prow structures grow from the hull; shield motifs are recessed surface boundaries instead of raised discs. Visual review removed floating shield facets and vent details that did not fit the shorter hulls. The original first-study sheets document intermediate offline designs, not delivered runtime captures.

The reopened-source/runtime comparison caught Blender remapping relative image paths to the preceding ship's folder during batch saves. The generator now disables that remapping, explicitly relinks each source to its own maps on reload, and regenerates GLBs and sprites. The final contract compares decoded hull/trim pixels embedded in each GLB with the corresponding authored PNGs, and the editable-source audit checks that all texture paths stay in that ship's folder. Earlier captures from the affected batch are superseded by the final capture pass.

Each new ship uses six materials and four 1024px texture images: hull and trim base colors, shared packed roughness/metalness, and a shallow normal map. Base colors contain no directional lighting or highlights. Paint is mostly dielectric, with satin metal, graphite machinery and smoked glazing differentiated. UV singularities at a few tiny bevel corners can produce zero MikkTSpace tangents; the export installer supplies deterministic normal-orthogonal tangent frames there and validates the resulting GLB. Repair counts are recorded per ship.

The shared renderer now uses Sparrow's approved warm opening/cool fill treatment. It disposes selected-model textures and depth materials on transition and retains one shared rendering context. Three r185's deprecated shadow enum was replaced with its actual PCF fallback. The reflection generator's normal-incidence GGX sampling uses the exact radius identity rather than subtracting squared trigonometric residuals; this resolves ANGLE shader precision warnings without disabling warnings or changing the sampling distribution. This narrowly scoped adaptation depends on the currently installed Three implementation and should be rechecked on a Three upgrade.

## Evidence

- `evidence/before`: actual running menu, hangar and early combat for all 30 ships, plus baseline sprite bytes.
- `evidence/after`: actual running game after the final asset installation.
- `evidence/combat-active`: all 30 ships firing during actual enemy waves after spawn protection; each receipt asserts the active player's ship key. The separate before/after combat pair is an early-run alignment comparison.
- `evidence/rotation`: actual runtime side, rear and underside captures; the complete silent rotation recording uses scripted QA input, not human play.
- `ships/NN/clay.png`, `before-clay.png`, `underside-clay.png`, `surfaced.png`: offline Blender renders. They are explicitly separated from runtime evidence.
- `ships/NN/source.blend`: editable objects and modifiers, referencing local `export/textures` maps.
- `contracts.json`, `runtime-verification.json` and per-ship `export-validation.log`: machine-checked contracts, practical measurements and export validation.

Screenshots are not retouched. The review page scales them for display and links to the originals. Combat effects and enemy positions vary between live runs. The 74.1px sprite comparison is Sparrow's measured benchmark frame; other ships retain their own existing scale rules.

## Reproduce

From the repository root:

```powershell
$fleetBlender = 'D:/vibe-coding-e/codex-blender-test/tools/blender-4.5.13-windows-x64/blender.exe'
& $fleetBlender -b --python scripts/build-fleet-art-v2.py
node scripts/install-fleet-art-v2.mjs
node scripts/check-fleet-art-v2.mjs
```

The generator accepts `-- --ids 2,3,27` for bounded revisions. Asset 1 is rejected to protect the approved Sparrow. `-- --refine` reopens existing editable sources for the recorded cleanup/export pass. Set `GLTF_TRANSFORM_CLI` to a local glTF Transform 4.2.1 `bin/cli.js` path if the documented cache path in the installer is unavailable. Tangents, lossless structural optimization and validation precede installation; no mesh simplification or texture compression is applied to the GLB.

`-- --relink` refreshes each existing source's own image paths and regenerates surfaced/export/sprite outputs without changing its geometry. `scripts/audit-fleet-source-paths.py` verifies source dependencies in Blender. For overlapping independent export batches, `install-fleet-art-v2.mjs --wait-for-refinement` can wait for completion records from comma-separated log paths in `FLEET_READY_LOG`; it never installs an incomplete asset.

Start the existing Vite server on port 5199, then run `node scripts/capture-fleet-v2.mjs after` and `node scripts/verify-fleet-runtime-v2.mjs`. QA uses isolated browser profiles and existing local developer hooks; it does not unlock or edit the owner's Steam profile. Do not run the old full-fleet generator over the delivered assets.

## Validation and delivery status

Production and packaged validation passed; see `tests.json`. The candidate is build `v2026-09-09_17-00-12`, compiled from `c7e88e4`. The packaged Steam bridge and leaderboard both report ready. The 60-second packaged performance run measured 59.52 minimum / 59.95 average FPS, with no runtime warnings or errors. All 150 packaged model/sprite/showroom files match the reviewed assets. Steam delivery and branch verification are recorded in `steam-delivery.json`.

The fleet contract passes for all 30 assets: Sparrow is byte-identical, sprite bounds/pivots remain within the existing contract, and all GLBs have UVs, normals, tangents and supported material maps. All 29 editable sources reference their own four textures. Local exports pass glTF validation.

The fleet contains 51,107,764 bytes of GLBs (48.74 MiB), with 18,488–23,828 triangles and six materials per model. The runtime traversal retained one resident model; revisiting Sparrow restored six geometries and eight renderer textures, with no growth after the complete selection cycle. Texture-map storage including mipmaps is estimated at 21.33 MiB per model; this is not a measured VRAM allocation.

The 1920×1080 Chrome rotation capture on the NVIDIA RTX 2060 recorded per-ship mean frame times of 16.67–20.78 ms, worst per-ship 95th percentile 33.8 ms, and mean render/copy CPU times of 0.55–2.36 ms. Video recording, the production build and combat capture ran concurrently, so these are practical observed costs rather than an isolated hardware benchmark. There were zero runtime warnings/errors. Per-ship timings and resource-load durations are in `runtime-verification.json`.

The standard production build passed. Its existing large-chunk advisory remains; the Windows packaging tool also emits a Node child-process deprecation warning, separate from runtime console checks. The first production browser smoke timed out during its second live game while concurrent visual QA was active; the result is retained and the subsequent rerun is recorded separately.

Two existing test assumptions required repair: Row Core's previously approved 1254px artwork was still checked as 192px, and the browser smoke expected menu voice playback while menu voices defaulted OFF. The image validator now checks that existing native size while retaining alpha, border and perceptual checks; the smoke explicitly enables menu voices through the Settings control. No audio behavior or powerup artwork was changed.

## Limits and rollback

The surfaces are deliberately clean and retain visible facets. Fine detail is restrained for arcade readability; the fixed 2D hangar background provides approximate reflection matching rather than a physical 3D lighting environment. Automated captures do not establish human aesthetic preference or gameplay feel. No exhaustive campaign or Steam-client human playtest is claimed.

No player-facing text was added or changed; new untranslated strings: none. Changed runtime files are the 29 GLB/sprite/showroom asset sets and `src/ui/SolidShipView.js`; support includes authoring/export/QA scripts, receipts, evidence and the build stamp. Gameplay, stats, hitboxes, weapons, saves, leaderboard rules, achievements and menu layout are unchanged.

Source rollback: `git revert c7e88e4 677eb69` reverses the texture correction and fleet implementation in order, retaining the approved Sparrow baseline. Later evidence/QA-only commits do not change the shipped game. Steam rollback would reassign test build `25203769` to `sector-continue-test`; that is a separate action, not performed here.

Packaged smoke setup: start the signed-in Steam client and set `SteamAppId=4765070` and `SteamGameId=4765070` for direct executable test launches. Earlier attempts with Steam unavailable are retained in the logs; the final Steam-connected smoke and performance commands passed. The current native dependency emits an existing Node fs.Stats deprecation on process output, but the measured renderer warnings/errors arrays are empty.

## Steam delivery

SteamPipe succeeded with depot manifest `2158365288715815294`; its comparison found two changed package files (95.15 MiB changed) and no additions/removals. SteamCMD emitted a transient connection assertion during transfer but completed successfully with exit code 0; authenticated post-upload app info independently verified the new test build. Public promotion and web deployment were not performed. Store settings were not edited. The owner's two inherited Steam reply drafts remain untracked and untouched; all task changes are committed locally, with no push.

Exact upload command used, with no password or token arguments:

```powershell
& 'C:/steamcmd/steamcmd.exe' +login gaunziman +run_app_build 'D:/vibe-coding-e/nova-swarm-forum-129-improvements-20260822/release/steamworks/app_build_LOCAL.vdf' +quit
```
