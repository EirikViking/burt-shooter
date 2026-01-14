# Burt Shooter Asset Manifest V2

## Overview
This document serves as the human-readable registry of all game assets found in the project. The single source of truth for code is `src/assets/assetManifest.js`.

**Statistics:**
- **Images/Sprites**: ~500+ files
- **Audio Files**: ~250+ files (Voice, SFX, Music in mp3/ogg)

## Directory Structure & Categories

### 1. Root Public Assets (`/public`)
**Lore & Characters**:
- `eirik1.jpg`, `kurt2.jpg` ... (Main character photos)
- `burtelurt.jpg` (The Legend)
- `wieik_shorts.jpg`, `morten_whale.jpg` ... (Extended lore)

### 2. Sprites (`/public/sprites`)
**Core Ships**: `spaceShips_001.png` - `spaceShips_009.png`
**Player**: `player/player_01.png`

**Xtra-Sprites (`/public/sprites/xtra-sprites`)**:
- **Enemies**: Color variants (Black, Blue, Green, Red) x 5 types each.
- **Lasers**: 16 variants per color (Blue, Green, Red).
- **Damage**: 3 stages of damage for 3 ship types.
- **Effects**: Fire, Shields, Stars, Speed lines.
- **UI**: Life icons, buttons, numerals.

**Missiles**: 40 distinct missile types (`spaceMissiles_001` - `040`).
**Effects**: 18 generic space effects (`spaceEffects_001` - `018`).
**Ranks**: 20 rank icons (`rank000` - `rank019`). Only these 20 are used in-game.

### 3. Audio (`/public/audio`)
**Voice** (`/voice`):
- Tactical callouts (`war_sniper`, `war_rpg`)
- Game state (`game_over`, `level_up`, `you_win`)
- Annoucer (`ready`, `go`, `bgm_v2`?)

**Music** (`/music`):
- 11 Tracks including "Battle in the Stars", "Space Heroes", "SkyFire".
- Available in MP3 (primary) and OGG.

**SFX** (`/sfx`):
- Explosions (`explosionCrunch`)
- Lasers (`laserLarge`, `laserRetro`, `laserSmall`)
- UI (`computerNoise`)
- Engines (`spaceEngine`)

## Usage Protocols

1.  **Code Reference**: Always import `AssetManifest` from `src/assets/assetManifest.js`.
2.  **Audio Loading**: The `AudioManager` or `GameAssets` loader should iterate over `AssetManifest.audio` categories.
3.  **Visual Consistency**: Use `AssetManifest.enemyWeaponMap` to ensure enemies use consistent projectiles and colors.
4.  **No Placeholders**: If an asset exists here, use it. Do not generate `PIXI.Graphics` rects if a sprite exists.
