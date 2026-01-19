# Ship Selection and Intro Animation

## Ship Selection Flow

### Storage
- **localStorage key**: `burt.selectedShip.v1`
- **Stored value**: spriteKey (e.g., `'ship_extract_1.png'`)

### Selection to Gameplay Flow
```
ShipSelectScene
  ↓ User clicks START button
  ↓ setSelectedShipKey(spriteKey)
  ↓ localStorage.setItem('burt.selectedShip.v1', spriteKey)
  ↓ game.startGame(spriteKey)
  ↓
Game.startGame(spriteKey)
  ↓ this.selectedShipSpriteKey = spriteKey
  ↓ switchScene('play')
  ↓
PlayScene.init()
  ↓ spriteKey = this.game.selectedShipSpriteKey
  ↓ new Player(x, y, inputManager, game, spriteKey)
  ↓
Player constructor
  ↓ Maps spriteKey → textureIndex
  ↓ Loads ship texture via GameAssets.getRankShipTexture(textureIndex)
  ↓ this.selectedShipSpriteKey = spriteKey (preserved)
  ↓ this.selectedShipTextureIndex = textureIndex
  ↓ createSprite() uses selectedShipTextureIndex
  ↓
Player.setRank(initialRank, 'init')
  ↓ Checks if this.selectedShipSpriteKey exists
  ↓ If yes, preserves ship sprite (doesn't swap)
  ↓ Rank only affects HUD, stats, difficulty
```

## Ship Intro Animation

### Overview
When a new game starts, a fly-in animation plays before gameplay begins:
- Player ship flies in from below screen
- Ship name displayed in large retro text
- Ship tagline shown below name
- Duration: 900ms
- SFX: `ui_open` sound effect

### Implementation Details

**Location**: `src/scenes/PlayScene.js`

**State Variables**:
- `introActive` - true during animation
- `introComplete` - true after first intro
- `introOverlay` - PIXI container for text
- `introStartTime` - timestamp of intro start

**Methods**:
- `startShipIntro(spriteKey)` - Initiates animation
- `completeShipIntro()` - Cleanup and enable gameplay

### Animation Timeline
```
0ms     - Player ship at y = height + 100 (below screen)
0-300ms - Text fades in
300-700ms - Text fully visible
700-900ms - Text fades out
900ms   - Player ship at y = height - 100 (gameplay position)
900ms   - Intro complete, gameplay enabled
```

### Gameplay Gating
During intro (`introActive === true`):
- ✅ Player shooting disabled
- ✅ Enemy spawning delayed
- ✅ Player movement allowed
- ✅ Animation runs via requestAnimationFrame

After intro (`introComplete === true`):
- ✅ Player can shoot
- ✅ Enemy waves start
- ✅ Normal gameplay

### Tweaking Duration
To adjust intro duration, modify in `startShipIntro()`:
```javascript
const introDuration = 900; // Change this value (milliseconds)
```

Recommended range: 700-1200ms
- < 700ms: Too fast, players miss ship name
- > 1200ms: Too slow, delays gameplay start

### Text Fade Timing
Fade in: 0-30% of duration
Hold: 30-70% of duration
Fade out: 70-100% of duration

To adjust, modify progress checks in `animateIntro()`:
```javascript
if (progress < 0.3) {        // Fade in duration
  // ...
} else if (progress > 0.7) { // Fade out start
  // ...
}
```

## Debugging

### Enable Debug Logs
Set `DEBUG = true` in `ShipSelectScene.js` to see:
- Ship selection on DETAILS click
- Ship selection on START click

### Console Logs
- `[ShipSelect] Opening details for: <spriteKey>`
- `[ShipSelect] Starting game with: <spriteKey>`
- `[Game] starting new game spriteKey=<spriteKey>`
- `[PlayScene] Assets ready, creating player with spriteKey=<spriteKey>`
- `[Player] init selectedShipSpriteKey=<spriteKey> activeSpriteKey=<spriteKey>`
- `[Player] setRank initial, preserving selected ship: <spriteKey>`
- `[PlayScene] Ship intro complete, gameplay enabled`

## Key Files
- `src/scenes/ShipSelectScene.js` - Ship selection UI
- `src/scenes/PlayScene.js` - Intro animation
- `src/entities/Player.js` - Ship sprite loading
- `src/config/ShipMetadata.js` - Ship data (name, description, stats)
- `src/utils/ShipSelectionState.js` - Selection state management
- `src/game/Game.js` - Game flow coordination
