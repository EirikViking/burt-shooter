# Ship Selection Implementation

## Summary
Added ship selection screen before game starts. Players can choose from 9 different ships, each with unique stats and funny lore-based names.

## Files Created
1. **src/config/ShipMetadata.js** - Ship display metadata (names, descriptions, lore)
2. **src/scenes/ShipSelectScene.js** - Ship selection UI scene

## Files Modified
1. **src/utils/ShipRegistry.js** - Added 9 rank ships with stats
2. **src/game/Game.js** - Added showShipSelect() method and selectedShipId tracking
3. **src/scenes/MenuScene.js** - Start button now opens ship select
4. **src/scenes/PlayScene.js** - Uses selected ship when creating player
5. **src/entities/Player.js** - buildDefaultShipSprite() supports textureIndex

## Ship List (9 Ships)
1. **STOKMARKNES SKUTA** - Kurt Edgar's harbor cruiser
2. **ISBJØRN CLASSIC** - Powered by beer and late nights
3. **TUFSINGEN** - The party starter
4. **DEILI FETTA** - Greasy, fast, unforgettable
5. **ROLAND TURBO** - Engineered with precision
6. **GIGA GRIS** - Massive firepower, minimal grace
7. **MELBU EXPRESS** - Gets you there fast
8. **KJØTTDEIG SPECIAL** - Ground beef vibes
9. **BURT PROTOTYPE** - The original

## Persistence
- localStorage key: `burt.selectedShip.v1`
- Saves ship ID on selection
- Loads saved selection on next run
- Falls back to rank_ship_0 if saved ship invalid

## Controls
### Desktop
- Arrow keys to navigate
- Enter to confirm selection

### Mobile
- Touch cards to select
- Tap START button to confirm

## Flow
1. User clicks START SPILL on menu
2. Ship selection screen shows with grid of ships
3. User selects ship (keyboard/touch)
4. User confirms (Enter/START button)
5. Selection saved to localStorage
6. Game starts with selected ship

## Integration
- MenuScene: START button calls `game.showShipSelect()`
- ShipSelectScene: Confirm calls `game.startGame(shipId)`
- Game: Stores `selectedShipId`, passes to PlayScene
- PlayScene: Creates player with `game.selectedShipId`
- Player: Loads texture from GameAssets using textureIndex

## Ship Stats Variety
Ships have different stats for gameplay variety:
- Speed: 5.0 to 7.5
- Fire rate: 140ms to 180ms
- Bullet speed: 10 to 12
- Damage: 1 to 2
- Hitbox: 12 to 13 radius

## Build Status
✅ Build passed (v2026-01-19_09-42-00)
✅ No protected files modified
✅ No sprites touched
✅ All checks passed

## Manual Test Checklist
- [ ] Menu → START SPILL opens ship select
- [ ] All 9 ships display with sprites
- [ ] Arrow keys navigate selection
- [ ] Enter confirms selection
- [ ] Touch/mouse works on mobile
- [ ] Selection persists on reload
- [ ] Selected ship appears in game
- [ ] Ship stats affect gameplay
- [ ] All ships look different in-game
