# Ship Select Polish

## Overview
This document describes the ship selection flow and recent improvements to scrolling and ship spawning.

## Ship Selection Flow

```
User selects ship in ShipSelectScene
  ↓
Click START button on card
  ↓
setSelectedShipKey(spriteKey) // e.g., 'ship_extract_1.png'
  ↓
game.startGame(spriteKey)
  ↓
PlayScene receives spriteKey
  ↓
Player constructor maps spriteKey to textureIndex
  ↓
Player loads correct ship texture
  ↓
Ship spawns with selected appearance
```

## Scrolling System

### Desktop
- Mouse wheel scrolling enabled
- Smooth scroll with `deltaY * 0.5` multiplier
- Scroll clamped to content bounds

### Mobile
- Touch drag scrolling
- Drag detection with 5px threshold to distinguish from taps
- Button clicks disabled during drag to prevent accidental activation

### Implementation
- Fixed header (title)
- Scrollable viewport with mask
- Fixed footer (instructions)
- Content height calculated from grid dimensions
- Scroll position clamped: `0` to `max(0, contentHeight - viewportHeight)`

## Debug Mode
Set `DEBUG = true` in ShipSelectScene.js to enable selection logging:
- Ship selection on DETAILS click
- Ship selection on START click

## Key Files
- `src/scenes/ShipSelectScene.js` - Selection UI with scrolling
- `src/utils/ShipSelectionState.js` - Single source of truth for selection
- `src/config/ShipMetadata.js` - Ship data and sprite key mappings
- `src/entities/Player.js` - Ship spawning and texture loading
