# QUICK START: Flicker Investigation

## 🎯 Goal
Capture deterministic evidence of what causes the screen flicker.

## ⚡ Quick Steps

### 1. Open with Tracing
```
http://localhost:5173/?trace=1
```

### 2. Reproduce
- Play game
- Die (get hit by enemy)
- Respawn (automatic)
- **Wait for flicker**

### 3. Capture
Press **`T`** key when flicker occurs

### 4. Share
Copy console output and share with developer

## 🔍 What to Look For

The T key dump will show one of these:

### ❌ Multi-Render Bug
```
[RenderCallSpy] ⚠️ Found X multi-render events!
```
**Means**: Game is rendering multiple times per frame

### ❌ Duplicate Ticker Bug
```
[TickerRegistry] ⚠️ X duplicate tickers detected!
```
**Means**: Update loop is running multiple times

### ❌ Rapid Mutation Bug
```
[MutationSpy] ⚠️ Found X rapid mutation events!
```
**Means**: UI elements being added/removed too fast

### ❌ Property Toggle Bug
```
[PropertyTracer] FLICKER_DETECTED on player.sprite
```
**Means**: Visual properties toggling rapidly

## ✅ Expected After Fix
All reports should show:
- ✅ No multi-render events
- ✅ No duplicate tickers  
- ✅ No rapid mutations
- ✅ No flicker detection

## 📋 Full Documentation
See `docs/flicker_root_cause_20260121.md` for complete details.
