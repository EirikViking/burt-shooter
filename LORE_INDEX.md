# Burt Shooter – Lore Index

## Primary Lore Source
- src/text/phrasePool.js

## Secondary Lore Locations (Legacy / To Be Phased Out)
- src/scenes/MenuScene.js
  - Hardcoded story text
- src/scenes/HighscoreScene.js
  - lorePhrases array for floating text

## Asset-Based Lore
- src/assets/assetManifest.js
  - loreImages
  - enemy lore keys (gris, mongo, rolp, etc.)

## Usage
Agents should:
- Search phrasePool.js first
- Reuse existing phrases and generators
- Avoid duplicating lore text across scenes
