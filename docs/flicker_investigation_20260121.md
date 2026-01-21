# Flicker Investigation - PropertyWriteTracer Implementation

## Date: 2026-01-21

## Status: Instrumentation Added, Root Cause Investigation In Progress

## What Was Done

### 1. Created PropertyWriteTracer (`src/utils/PropertyWriteTracer.js`)
A low-overhead property write tracking system that:
- Intercepts `alpha`, `visible`, `renderable`, and `scale.set` writes
- Records to in-memory ring buffer (500 entries max)
- Throttles to 100 writes/second to minimize timing impact
- Captures minimal stack traces for each write
- Provides runtime controls via `window.__trace*` functions

### 2. Integrated into PlayScene
- Patches `player.sprite` and `player.shipSprite` on creation
- Automatically enables "high-attention" mode for 5 seconds after respawn
- Supports `?trace=1` query parameter for always-on tracking
- Keyboard shortcut: Press **T** to dump trace buffer to console

### 3. Runtime Controls
```javascript
// Enable/disable tracking
window.__traceEnable(true);

// Dump current buffer
window.__traceDump();

// Clear buffer
window.__traceClear();

// Set property filter (regex)
window.__traceFilter(/alpha|visible/);

// Only record rapid toggles (flicker pattern)
window.__traceOnlyWhenFlicker(true);

// Enable high-attention mode for N milliseconds
window.__traceHighAttention(5000);
```

## How to Use

### Method 1: Automatic (Recommended)
1. Run `npm run dev`
2. Play game until death
3. After respawn, high-attention mode activates automatically for 5 seconds
4. When flicker occurs, press **T** key
5. Check console for grouped property writes showing:
   - Which object (player.sprite, player.shipSprite, etc.)
   - Which property (alpha, visible, etc.)
   - Old → New values
   - Stack trace showing caller

### Method 2: Manual Query Param
1. Run `npm run dev`
2. Open `http://localhost:5173/?trace=1`
3. Tracer is always enabled
4. Press **T** anytime to dump

### Method 3: Console Commands
1. Run `npm run dev`
2. Open DevTools console
3. Enable: `window.__traceEnable(true)`
4. Play and die/respawn
5. Dump: `window.__traceDump()`

## Expected Output

When you dump the trace, you'll see:
```
=== PROPERTY WRITE TRACE ===
Total entries: 47
Filter: /alpha|visible|renderable/
Only when flicker: false

▼ player.sprite.alpha (23 writes)
  time    target         property  old  new  stack
  1234.5  player.sprite  alpha     1    0.7  Player.update@Player.js:698 → PlayScene.update@PlayScene.js:548
  1250.2  player.sprite  alpha     0.7  1    PlayScene.update@PlayScene.js:556
  ...
```

This will reveal:
- **WHO** is writing (function name + file:line)
- **WHAT** object and property
- **WHEN** (timestamp in ms)
- **VALUES** (old → new)

## Next Steps

1. **Reproduce flicker** with tracer enabled
2. **Press T** immediately when flicker occurs
3. **Analyze output** to find:
   - Competing writers (two different functions setting same property)
   - Rapid toggles (same property changing multiple times within 16ms)
   - Unexpected writers (code that shouldn't touch player visuals)

4. **Fix based on findings**:
   - If PlayScene.update() is overriding Player.update(): Add guard conditions
   - If multiple tickers are active: Ensure old tickers are stopped
   - If overlays are touching player: Isolate visual ownership

## Files Changed
- `src/utils/PropertyWriteTracer.js` (new)
- `src/scenes/PlayScene.js` (integrated tracer, removed old debug tools)

## Rollback
```bash
git stash pop  # Restore stashed changes if needed
# Or revert specific files:
git checkout HEAD -- src/scenes/PlayScene.js
git rm src/utils/PropertyWriteTracer.js
```
