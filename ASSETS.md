# Nova Swarm Asset Guide

This file is a human-readable guide. The runtime source of truth is `src/assets/assetManifest.js`; release provenance is tracked in `release/provenance/asset_provenance_manifest.json`.

## Runtime Asset Families

- Generated arcade art: `public/art/generated/nova-swarm/`
- Sprites and projectiles: `public/sprites/`
- Rank icons: `public/sprites/ranks/PNG/Default size/Gold/`
- Music: `public/audio/music/`
- SFX: `public/audio/sfx/`
- Voice and narration: `public/audio/voice/`
- Steam screenshots, capsules, and trailers: `release/steam-*`

## Release Asset Rules

- No real-person photos or private joke images.
- No private person names, private place names, or old internal lore in filenames, captions, prompts, or player-facing surfaces.
- No existing arcade-shooter brand names in store-facing art or copy.
- Generated images should be original, inspectable, and useful to the actual game surface they support.
- Steam capsules and library art must be text-readable at their target sizes.
- Screenshots and trailers must reflect truthful runtime gameplay and current build metadata.

## Implementation Rules

- Prefer `AssetManifest` keys over hardcoded file paths.
- Keep fallback graphics simple, temporary, and non-player-facing where possible.
- Run `npm run check:provenance` after adding, deleting, or moving assets.
- Run `npm run check:audio` and `npm run audit:audio-mix` after audio changes.
- Run `npm run audit:release-readiness` before treating an asset milestone as release evidence.
