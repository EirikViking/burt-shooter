# Menu and combat material pass — 10 September 2026

Baseline: `8c9a22a`; branch: `codex/menu-and-energy-art-20260910`.

Original imagegen production artwork, created for Nova Swarm: stacked titanium/white/cyan wordmark, blank manufactured launch-control faceplate, and four monochromatic plasma materials (shield membrane, rift, pressure front, corona). No external project assets were uploaded. No third-party stock assets or paid audio generation were used in this pass. The original PNGs are in `source/`; runtime WebP exports are in `public/art/menu-energy/`.

The first energy atlas had poor margins; the second painted a checkerboard and was rejected. Neither is shipped. Accepted source: `exec-f56ea17d-56ab-48aa-9e5f-44357a1462c2.png`. Wordmark source: `exec-3137b44d-0337-4aa8-852c-e19a81f27c3b.png`. Control source: `exec-f6576ec0-02d4-449b-9b5d-67938ddc08e6.png`.

Reproduce the exports with `python scripts/pack-menu-energy-art.py`; existing source files are preferred over the original tool output directory. Normalization performs deterministic alpha-preserving crops, four-texel edge guarding on atlas cells, padding and Lanczos resizing. No screenshot is retouched.

`AstraEnergyMaterial` maps those surfaces into existing Pixi effects. `EliteEnergyVfx` gives all 50 elite profiles family-specific presentation. Tractor fields retain their original physics-derived mesh, lane windows and forces. The pass also replaces decorative orbit overlays, shield/phase/status shells, hijack filaments, boss charge/discharge ornamentation and pressure bursts. Attack boundary lines, countdown arcs, the optional hitbox marker, and HUD counters remain functional indicators. No gameplay sprite, hitbox, weapon origin, damage, stats, progression or save format is changed.

The main-menu wordmark and controls preserve layout, live localized text, navigation and real 3D ships. The controls use nine-slice artwork with restrained surface illumination and focus/press response; the synthetic floor rings were removed.

Runtime checks: `node scripts/check-energy-art-runtime.mjs` (fresh Vite server recommended), `node scripts/check-tractor-fleet-runtime.mjs`, existing phase/invulnerability and hangar transition checks, plus i18n/build/controller/release checks. `CHECK_URL` selects the local server for the energy check. Screenshots under `test-results/energy-art/` are genuine runtime captures with controlled QA staging, not representative random combat encounters. No new video was produced.

Four shared 512px combat textures and two menu images are cached once. Graphics owners retain their original clear/destroy lifecycle; the shockwave ticker now also stops on scene exit. Test profiles are isolated and offline. Steam delivery is limited to the explicitly authorized `sector-continue-test` branch. Public Steam, Steamworks settings, Cloud and other branches must remain unchanged.

The final compiled check is `node scripts/check-energy-final-runtime.mjs` with `CHECK_URL` set to a local preview. It exercises current Colossus ring/wall/lance warnings and measures controlled 1080p tractor rendering. On the available RTX 2060, baseline, Helix and Prism each had a 16.7 ms median frame interval and 16.9–17.0 ms 95th percentile across 240 measured frames per case. World scheduling was frozen; this is not a worst-case combat claim. No build or unrelated capture ran concurrently with that measurement.

Runtime implementation commit: `cffeba8`. Existing combat sprites, showcase models, audio, configuration, localization catalogs and Electron integration remain unchanged from the baseline. There are no new untranslated strings; the artwork uses the existing Nova Swarm proper name and the controls retain live localized labels. Source rollback: `git revert cffeba8` from a clean checkout. Steam test rollback target: Build `25231618`.
