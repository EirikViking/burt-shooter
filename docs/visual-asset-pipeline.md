# Visual Asset Pipeline

This project keeps generated visual assets in `public/art/generated/` when they are used by the game. Keep the original generated source alongside the optimized runtime asset so later passes can crop, recompress, or replace it without hunting through local Codex caches.

## 2026-05-16 Storm Gameplay Backdrop

- Source: `public/art/generated/burt-shooter-storm-keyart-source.png`
- Runtime asset: `public/art/generated/burt-shooter-storm-gameplay-bg.webp`
- Optimization: ImageMagick resize/crop to `1920x1080`, WebP quality `82`.
- Usage: `src/scenes/PlayScene.js` crossfades this storm layer in from level 3 upward while keeping a dark shade over the playfield for bullet readability.

Prompt summary:

> Original 16:9 arctic space battle over a Norwegian fjord at night, red-magenta aurora storms, teal ion clouds, distant snowy mountains, edge sci-fi wreckage silhouettes, dark uncluttered center, no text, no logos, no UI.

