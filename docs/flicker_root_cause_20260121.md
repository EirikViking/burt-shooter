# Flicker Root Cause Investigation - 2026-01-21

## Status: INSTRUMENTATION DEPLOYED

Comprehensive, low-overhead instrumentation has been deployed to deterministically identify the flicker root cause.

## Instrumentation Tools

### 1. RenderCallSpy
**Purpose**: Detect multiple render calls per frame (double-render bug)

**What it tracks**:
- Counts render calls per frame
- Flags anomalies when >1 render per frame
- Captures stack trace of extra render calls

**Anomaly indicator**: If flicker is caused by double-rendering, you'll see `MULTI_RENDER` events.

### 2. TickerRegistry
**Purpose**: Detect duplicate or orphaned tickers after respawn

**What it tracks**:
- All ticker.add() calls with creation stack
- Duplicate ticker registrations
- Snapshot before/after respawn comparison

**Anomaly indicator**: If flicker is caused by duplicate update loops, you'll see:
- Duplicate ticker warnings
- New tickers added during respawn that shouldn't exist

### 3. MutationSpy
**Purpose**: Detect rapid attach/detach cycles on containers

**What it tracks**:
- addChild, removeChild, removeChildren on critical containers
- Rapid mutations (<50ms apart)

**Anomaly indicator**: If flicker is caused by UI elements being added/removed rapidly, you'll see `RAPID_MUTATION` events.

### 4. PropertyWriteTracer (Enhanced)
**Purpose**: Track all visual property changes on player sprites

**What it tracks** (expanded from before):
- alpha, visible, renderable, worldAlpha
- tint, filters, texture, position, scale, parent
- Oscillation detection (property toggling direction)

**Anomaly indicator**: If flicker is caused by competing writers or rapid toggles, you'll see `FLICKER_DETECTED` events.

## How to Reproduce and Capture

### Step 1: Enable Tracing
Open the game with `?trace=1` parameter:
```
http://localhost:5173/?trace=1
```

Or on deployed preview:
```
https://[preview-url].pages.dev/?trace=1
```

### Step 2: Reproduce Flicker
1. Play the game normally
2. **Die** (let an enemy hit you)
3. **Respawn** (happens automatically after death)
4. **Wait** for flicker to start (usually within 1-5 seconds after respawn)

### Step 3: Capture Diagnostic Report
**Immediately** when you see the flicker, press **`T`** key.

This will dump a comprehensive report to the browser console with:
- RenderCallSpy report
- TickerRegistry report (including before/after respawn comparison)
- MutationSpy report
- PropertyWriteTracer report

### Step 4: Analyze the Report

Look for these specific indicators:

#### A) Double Render Bug
```
[RenderCallSpy] Report
⚠️ Found X multi-render events!
```
**Root cause**: Something is calling `renderer.render()` multiple times per frame.
**Fix**: Find the extra render call in the stack trace and remove it.

#### B) Duplicate Ticker Bug
```
[TickerRegistry] Report
⚠️ X duplicate tickers detected!
New since respawn: Y
```
**Root cause**: Ticker callbacks are being added multiple times or not removed on respawn.
**Fix**: Ensure tickers are removed before re-adding, or use a registry to prevent duplicates.

#### C) Rapid Mutation Bug
```
[MutationSpy] Report
⚠️ Found X rapid mutation events!
Target: uiOverlay, operation: addChild/removeChild
```
**Root cause**: UI elements (toasts, banners, overlays) are being added and removed rapidly.
**Fix**: Debounce or queue UI mutations, ensure cleanup happens properly.

#### D) Property Toggle Bug
```
[PropertyTracer] FLICKER REPORT
FLICKER_DETECTED on player.sprite, prop: alpha
Rapid oscillation detected
```
**Root cause**: Multiple systems are writing to the same property (e.g., PlayScene forcing alpha=1 while Player is blinking).
**Fix**: Enforce single-writer pattern (already attempted, but may need refinement).

## Expected Outcome

**Before Fix**: One or more of the above anomalies will be present in the T dump.

**After Fix**: 
- ✅ No multi-render events
- ✅ No duplicate tickers
- ✅ No rapid mutations
- ✅ No flicker detection events (or only intentional animations like invulnerability blink)

## Overhead

All instrumentation is **disabled by default**. Only enabled with `?trace=1`.

When enabled:
- Minimal per-frame overhead (simple counters and comparisons)
- Stack traces captured only on anomalies (not every frame)
- Ring buffers prevent memory bloat
- No console spam during gameplay (only on T key dump)

## Rollback

If instrumentation causes issues:
```bash
git reset --hard a1b4b3d  # Snapshot before instrumentation
```

Or revert specific commit:
```bash
git revert [commit-hash]
```

## Next Steps

1. **Reproduce** flicker with `?trace=1`
2. **Press T** when flicker occurs
3. **Share** the console output (screenshot or copy/paste)
4. **Analyze** which anomaly is present
5. **Apply** targeted fix based on evidence
