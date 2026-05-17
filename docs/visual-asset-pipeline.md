# Visual Asset Pipeline

This project keeps generated visual assets in `public/art/generated/` when they are used by the game. Keep the original generated source alongside the optimized runtime asset so later passes can crop, recompress, or replace it without hunting through local Codex caches.

## 2026-05-16 Storm Gameplay Backdrop

- Source: `public/art/generated/nova-swarm/nova-swarm-storm-keyart-source.png`
- Runtime asset: `public/art/generated/nova-swarm/nova-swarm-storm-gameplay-backdrop.webp`
- Optimization: ImageMagick resize/crop to `1920x1080`, WebP quality `82`.
- Usage: `src/scenes/PlayScene.js` crossfades this storm layer in from level 3 upward while keeping a dark shade over the playfield for bullet readability.

Prompt summary:

> Original 16:9 arctic space battle over a Norwegian fjord at night, red-magenta aurora storms, teal ion clouds, distant snowy mountains, edge sci-fi wreckage silhouettes, dark uncluttered center, no text, no logos, no UI.

## 2026-05-16 Boss Threat Dossier

- Source: `public/art/generated/nova-swarm/nova-swarm-boss-dossier-source.png`
- Runtime asset: `public/art/generated/nova-swarm/nova-swarm-boss-dossier.png`
- Optimization: ImageMagick resize to `640x640`, stripped PNG metadata.
- Usage: `src/scenes/PlayScene.js` uses this original generated art inside the boss inbound dossier card instead of legacy portrait assets.
- Cleanup: removed the tracked `public/donaldtru.jpg` celebrity/third-party-looking asset from shipped public assets.

Prompt summary:

> Original square boss threat dossier UI illustration for a retro arcade sci-fi shooter, fictional enemy battleship silhouette over arctic aurora, red/cyan holographic scan accents, no real people, no celebrities, no logos, no text.

## 2026-05-16 Crew Comms Portraits

- Sources: `public/art/generated/nova-swarm/nova-swarm-comms-navigator-source.png`, `public/art/generated/nova-swarm/nova-swarm-comms-pilot-source.png`
- Runtime assets: `public/art/generated/nova-swarm/nova-swarm-comms-navigator.png`, `public/art/generated/nova-swarm/nova-swarm-comms-pilot.png`
- Optimization: ImageMagick resize to `512x512`, stripped PNG metadata.
- Usage: `src/utils/GameAssets.js` loads these original generated crew portraits for comms banners and legendary flybys, and `src/scenes/MenuScene.js` reuses them in the main-menu mission-console comm cards. Real-person portrait assets are not shipped.

Prompt summary:

> Original square pixel-adjacent radio crew portrait for a retro arcade sci-fi shooter, headset and flight jacket inside a cockpit, aurora outside, coherent with the Nova Swarm comms-console art direction, no real people, no celebrities, no logos, no text.

## 2026-05-16 Menu Mission Console

- Runtime assets reused: `public/art/generated/nova-swarm/nova-swarm-comms-navigator.png`, `public/art/generated/nova-swarm/nova-swarm-comms-pilot.png`
- No new generated files were added in this pass because `OPENAI_API_KEY` was not present in the local environment.
- Usage: `src/scenes/MenuScene.js` layers a non-interactive holographic radar, scan blips, and generated crew comm cards behind the menu controls while keeping the settings overlay and buttons above the decorative layer.

## 2026-05-17 Nova Swarm Asset Path Cleanup

- Public runtime art paths now live under `public/art/generated/nova-swarm/`.
- Legacy-generated menu, storm, boss-dossier, and comms portrait files were copied to Nova Swarm filenames, and `src/assets/assetManifest.js` now references only the Nova Swarm paths.
- This was a path/provenance cleanup, not a visual regeneration pass, because `OPENAI_API_KEY` was not present in the current shell for the local imagegen CLI.

## 2026-05-17 Nova Swarm Cinematic Intro And Hangar

- Sources: `public/art/generated/nova-swarm/nova-swarm-intro-launch-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-formations-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-hero-run-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-boss-arena-source.png`, `public/art/generated/nova-swarm/nova-swarm-ship-hangar-source.png`
- Runtime assets: matching `.webp` files in `public/art/generated/nova-swarm/`
- Optimization: ImageMagick resize/crop to `1920x1080`, WebP quality `84`, method `6`.
- Usage: `src/scenes/IntroScene.js` presents the four intro panels with narration, stingers, skip/next controls, and first-run persistence; `src/scenes/ShipSelectScene.js` uses the hangar art as the ship-select backdrop.
- Verification: `magick identify public\art\generated\nova-swarm\*.webp` confirms all runtime assets are `1920x1080`; smoke screenshots live in `test-results/smoke-nova-intro-20260517-1022/`, and manual panel/hangar captures live in `test-results/manual-nova-visuals-20260517-1027/`.

Prompt summary:

> Original cinematic 16:9 retro arcade space-shooter key art for Nova Swarm, luminous cabinet-era sci-fi colors, crisp readable composition, heroic pilot ship, comedic alien formations and boss arena energy, no text, no logos, no real people, no existing game branding.

## 2026-05-17 Steam Store Art Refresh

- Source: `release/steam-assets/draft-2026-05-17-nova-swarm/key_art_source.png`
- Draft outputs: `release/steam-assets/draft-2026-05-17-nova-swarm/`
- Review outputs: `release/steam-assets/draft-2026-05-17-nova-swarm/review/`
- Cleanup: removed the tracked `release/steam-assets/draft-2026-05-16/` capsule set because those images still showed the old private-era title and were unsafe as release candidates.
- Verification: `npm run check:steam-assets` validates 9 asset dimensions, checks `library_logo_1280x720.png` transparency, and regenerates contact sheets for visual review.

Prompt summary:

> Magnificent original key art for an arcade space shooter called Nova Swarm, no text or logos, deep space arcade battlefield with a luminous coin-slot portal, neon starfield, colorful swarm formations, stylized enemy drones, a heroic player ship firing clean laser streams, and a huge boss silhouette in the far background. Polished high-end 2D/3D hybrid game key art, cinematic arcade poster, varied neon arcade palette, no real people, no existing game branding, no internal jokes, no private-name references.

## 2026-05-17 Generated Bonus Core Drone

- Source: `public/art/generated/nova-bonus-core-drone-source-20260517.png`
- Runtime asset: `public/sprites/generated/nova-bonus-core-drone-20260517.png`
- Optimization: built-in Codex imagegen source on a green chroma-key background, local chroma-key removal, ImageMagick trim/resize to `256x256` PNG with alpha.
- Usage: `src/assets/assetManifest.js` now points the bonus core sprite to this generated sci-fi pickup so menu decorations, highscore background drones, hazard drones, and collectible power cores share a more polished original visual.

Prompt summary:

> Polished 2D arcade collectible sprite for Nova Swarm: glowing golden bonus core drone, star-shaped energy inside a rounded sci-fi capsule, cyan rim lights, tiny thrusters, high contrast, readable at small size, chroma-key background, no text, no logos, no people.
