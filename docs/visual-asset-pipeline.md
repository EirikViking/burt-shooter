# Visual Asset Pipeline

This project keeps generated visual assets in `public/art/generated/` when they are used by the game. Keep the original generated source alongside the optimized runtime asset so later passes can crop, recompress, or replace it without hunting through local Codex caches.

## 2026-05-16 Storm Gameplay Backdrop

- Source: `public/art/generated/burt-shooter-storm-keyart-source.png`
- Runtime asset: `public/art/generated/burt-shooter-storm-gameplay-bg.webp`
- Optimization: ImageMagick resize/crop to `1920x1080`, WebP quality `82`.
- Usage: `src/scenes/PlayScene.js` crossfades this storm layer in from level 3 upward while keeping a dark shade over the playfield for bullet readability.

Prompt summary:

> Original 16:9 arctic space battle over a Norwegian fjord at night, red-magenta aurora storms, teal ion clouds, distant snowy mountains, edge sci-fi wreckage silhouettes, dark uncluttered center, no text, no logos, no UI.

## 2026-05-16 Boss Threat Dossier

- Source: `public/art/generated/burt-shooter-boss-dossier-source.png`
- Runtime asset: `public/art/generated/burt-shooter-boss-dossier.png`
- Optimization: ImageMagick resize to `640x640`, stripped PNG metadata.
- Usage: `src/scenes/PlayScene.js` uses this original generated art inside the boss inbound dossier card instead of random lore photos.
- Cleanup: removed the tracked `public/donaldtru.jpg` celebrity/third-party-looking asset from shipped public assets.

Prompt summary:

> Original square boss threat dossier UI illustration for a retro arcade sci-fi shooter, fictional enemy battleship silhouette over arctic aurora, red/cyan holographic scan accents, no real people, no celebrities, no logos, no text.

## 2026-05-16 Crew Comms Portraits

- Sources: `public/art/generated/burt-shooter-crew-navigator-source.png`, `public/art/generated/burt-shooter-crew-pilot-source.png`
- Runtime assets: `public/art/generated/burt-shooter-crew-navigator.png`, `public/art/generated/burt-shooter-crew-pilot.png`
- Optimization: ImageMagick resize to `512x512`, stripped PNG metadata.
- Usage: `src/utils/GameAssets.js` loads these original generated crew portraits for comms banners and legendary flybys, and `src/scenes/MenuScene.js` reuses them in the main-menu mission-console comm cards. Real-person photos are not shipped.

Prompt summary:

> Original square pixel-adjacent radio crew portrait for a retro arcade sci-fi shooter, headset and flight jacket inside a cockpit, aurora outside, coherent with the Nova Swarm comms-console art direction, no real people, no celebrities, no logos, no text.

## 2026-05-16 Menu Mission Console

- Runtime assets reused: `public/art/generated/burt-shooter-crew-navigator.png`, `public/art/generated/burt-shooter-crew-pilot.png`
- No new generated files were added in this pass because `OPENAI_API_KEY` was not present in the local environment.
- Usage: `src/scenes/MenuScene.js` layers a non-interactive holographic radar, scan blips, and generated crew comm cards behind the menu controls while keeping the settings overlay and buttons above the decorative layer.

## 2026-05-17 Nova Swarm Cinematic Intro And Hangar

- Sources: `public/art/generated/nova-swarm/nova-swarm-intro-launch-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-formations-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-hero-run-source.png`, `public/art/generated/nova-swarm/nova-swarm-intro-boss-arena-source.png`, `public/art/generated/nova-swarm/nova-swarm-ship-hangar-source.png`
- Runtime assets: matching `.webp` files in `public/art/generated/nova-swarm/`
- Optimization: ImageMagick resize/crop to `1920x1080`, WebP quality `84`, method `6`.
- Usage: `src/scenes/IntroScene.js` presents the four intro panels with narration, stingers, skip/next controls, and first-run persistence; `src/scenes/ShipSelectScene.js` uses the hangar art as the ship-select backdrop.
- Verification: `magick identify public\art\generated\nova-swarm\*.webp` confirms all runtime assets are `1920x1080`; smoke screenshots live in `test-results/smoke-nova-intro-20260517-1022/`, and manual panel/hangar captures live in `test-results/manual-nova-visuals-20260517-1027/`.

Prompt summary:

> Original cinematic 16:9 retro arcade space-shooter key art for Nova Swarm, luminous cabinet-era sci-fi colors, crisp readable composition, heroic pilot ship, comedic alien formations and boss arena energy, no text, no logos, no real people, no existing game branding.
