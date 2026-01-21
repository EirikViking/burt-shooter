# Flicker Investigation - Implementation Summary

## Completed: Comprehensive Instrumentation Deployed

**Branch**: `fix/flicker-single-writer-2026-01-21`  
**Commit**: `c13bf7e`  
**Build**: ✅ Passed (`v2026-01-21_16-48-44`)

## What Was Implemented

### 1. Four Specialized Spy Tools

#### RenderCallSpy (`src/utils/RenderCallSpy.js`)
- **Detects**: Multiple render calls per frame
- **How**: Wraps `app.renderer.render()` and counts calls per frame bucket
- **Anomaly**: Flags when >1 render happens in same frame
- **Evidence**: Stack trace of extra render calls

#### TickerRegistry (`src/utils/TickerRegistry.js`)
- **Detects**: Duplicate or orphaned ticker callbacks
- **How**: Wraps `app.ticker.add/remove` with ID tracking
- **Anomaly**: Duplicate registrations, tickers not removed
- **Evidence**: Before/after respawn comparison shows new/duplicate tickers

#### MutationSpy (`src/utils/MutationSpy.js`)
- **Detects**: Rapid attach/detach cycles on containers
- **How**: Wraps `addChild/removeChild` on critical containers
- **Anomaly**: Same container mutated <50ms apart
- **Evidence**: Stack trace of rapid mutations

#### PropertyWriteTracer (Enhanced)
- **Detects**: Visual property toggles and competing writers
- **How**: Polls visual properties every frame, detects oscillation
- **Expanded tracking**: alpha, visible, renderable, tint, filters, texture, position, scale, parent
- **Anomaly**: Property changes direction multiple times in 200ms window
- **Evidence**: History of rapid toggles with writer attribution

### 2. Integration Points

**PlayScene.js**:
- Instrumentation enabled only with `?trace=1` query parameter
- All spy tools initialized in `init()`
- Containers wrapped for mutation tracking
- Ticker snapshot before/after respawn
- **T key** dumps comprehensive report from all spies
- **Y key** dumps crash report (existing)

### 3. Low-Overhead Design

- **Default**: All spies disabled (zero overhead)
- **With ?trace=1**: Minimal overhead
  - Simple counters and comparisons per frame
  - Stack traces captured only on anomalies
  - Ring buffers (300-500 events) prevent memory bloat
  - No console spam during gameplay
  - Dumps only on T key press

## Files Changed

**New Files**:
- `src/utils/RenderCallSpy.js` (117 lines)
- `src/utils/TickerRegistry.js` (164 lines)
- `src/utils/MutationSpy.js` (143 lines)
- `docs/flicker_root_cause_20260121.md` (comprehensive guide)

**Modified Files**:
- `src/scenes/PlayScene.js` (+40 lines)
  - Import spy tools
  - Enable with ?trace=1
  - Wrap containers
  - Snapshot tickers before/after respawn
  - Enhanced T key dump
- `src/utils/PropertyWriteTracer.js` (+8 properties tracked)

**Patch Files**:
- `00_before_ag_flicker_fix.patch` (baseline)
- `00_after_ag_flicker_fix.patch` (with instrumentation)

## How to Use

### Reproduce Flicker
1. Open game with `?trace=1`: `http://localhost:5173/?trace=1`
2. Play until death
3. Respawn (automatic)
4. Wait for flicker to start

### Capture Evidence
Press **T** immediately when flicker occurs.

### Analyze Console Output

Look for these specific patterns:

**Pattern A: Double Render**
```
[RenderCallSpy] Report
⚠️ Found X multi-render events!
```
→ **Root cause**: Extra render loop  
→ **Fix**: Remove duplicate render call

**Pattern B: Duplicate Ticker**
```
[TickerRegistry] Report
⚠️ X duplicate tickers detected!
New since respawn: Y
```
→ **Root cause**: Ticker not removed before re-adding  
→ **Fix**: Ensure cleanup or use registry guard

**Pattern C: Rapid Mutations**
```
[MutationSpy] Report
⚠️ Found X rapid mutation events!
Target: uiOverlay
```
→ **Root cause**: UI elements added/removed in tight loop  
→ **Fix**: Debounce or queue mutations

**Pattern D: Property Oscillation**
```
[PropertyTracer] FLICKER REPORT
FLICKER_DETECTED on player.sprite, prop: alpha
```
→ **Root cause**: Competing writers  
→ **Fix**: Enforce single-writer (already attempted)

## Next Steps

1. **You reproduce** flicker with `?trace=1`
2. **You press T** and share console output
3. **I analyze** which pattern matches
4. **I implement** targeted fix based on evidence
5. **We verify** fix eliminates anomaly

## Rollback Commands

If instrumentation causes issues:

```bash
# Reset to snapshot before instrumentation
git reset --hard a1b4b3d

# Or revert the instrumentation commit
git revert c13bf7e
```

## Deploy Notes

**Frontend (Cloudflare Pages)**:
- Auto-deploys on push to `main`
- Feature branch creates preview URL
- No backend changes in this commit

**To test on preview**:
1. Push branch (already done)
2. Wait for Cloudflare Pages build
3. Access preview URL with `?trace=1`

## Evidence Required Before Fix

**Do NOT apply a fix** until console dump shows one of:
- Multi-render events with stack
- Duplicate tickers with creation stacks
- Rapid mutations with timing
- Property oscillation with writer attribution

**The instrumentation provides deterministic evidence, not guesses.**
