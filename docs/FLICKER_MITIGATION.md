# Flicker Mitigation

## Purpose
Hard mitigation to eliminate player visual flicker by enforcing single player visual instance and clamping visual properties.

## What It Does
1. **Hard Visual Clamping**: Forces player sprite to `alpha=1`, `visible=true`, `renderable=true` every frame
2. **Duplicate Visual Detection**: Scans scene for multiple player sprites (should be exactly 1)
3. **Renderer Stability Monitoring**: Detects WebGL context loss and renderer state changes

## How to Enable
Add `?trace=1` to the URL:
```
https://burt-game.pages.dev/?trace=1
```

When enabled, visual clamping activates automatically and overrides invulnerability blink effects.

## What to Expect
- **If flicker persists**: Flicker is NOT caused by player alpha/visibility changes
- **If flicker stops**: Flicker was caused by competing visual state writers
- **Console errors**: Check for duplicate player visuals or renderer instability

## Rollback

### Option 1: Using stash
```bash
git stash pop stash@{0}
```

### Option 2: Using diff file
```bash
git apply --reverse RESCUE_mitig_after.diff
```

### Option 3: Git reset
```bash
git reset --hard 5e9ae5c
```
