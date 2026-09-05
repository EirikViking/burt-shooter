# Astra V5 art sources

Original task art for Nova Swarm. Fleet/drone sheets were created with the built-in OpenAI image generator, using original descriptions, without imported third-party ship designs. Source sheets and prompts are retained here. Runtime cutouts and larger Codex portraits are produced by `scripts/pack-astra-fleet-v5.mjs`; registration receipts compare each replacement with its prior canvas and alpha bounds.

The maintenance tug is an original Blender mesh with layered armor, cooling fins, hydraulic arms and navigation optics. `dock-tug.blend` and `scripts/render-astra-dock-tug-v5.py` retain the editable source; `scripts/pack-astra-dock-v5.mjs` packs 32 rendered views into one shared 4.5 MiB atlas. The game uses Pixi sprites, not a 3D runtime. `fleet-master.blend` and its generator are earlier exploratory meshes, not the final integrated enemy art.

Tools: local Blender 4.5.4, Node/Sharp, existing PixiJS/Electron/Vite, built-in ImageGen, existing Playwright/Chrome, FFmpeg for capture work. No purchased assets, external paid generation API, new fonts, or ElevenLabs charges in this pass. Existing font and audio licenses remain in place.

Rights checked 2026-09-06: [Blender license](https://www.blender.org/about/license/) permits use of produced artwork and blend data; Blender itself is GPL, and the bpy regeneration scripts carry GPL-3.0-or-later notices. [OpenAI terms](https://openai.com/policies/eu-terms-of-use/) assign output ownership to the user as between the parties, subject to applicable law and terms. This is generated artwork, not a claim of exclusive copyright or human authorship. No third-party asset attribution was introduced. Keep the game's existing AI-content disclosure accurate.

QA evidence is actual game capture under `test-results/astra-v5-slice`, with baseline packaged captures under `test-results/astra-desktop-v5-baseline` and `test-results/astra-packaged-menus-v5-baseline`. Sprite sheets and Blender renders themselves are production sources, not gameplay evidence. Fleet expansion and full packaged validation are still in progress.
