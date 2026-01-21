# Flicker Mitigation V2

## Purpose
Production mitigation to eliminate player visual flicker through hard visual clamping and anomaly detection.

## How to Enable
Add `?trace=1` to the URL:
```
https://burt-game.pages.dev/?trace=1
```

## What It Does
1. **Hard Visual Clamping**: Forces `player.sprite.alpha=1`, `visible=true`, `renderable=true` every frame
2. **Duplicate Visual Detection**: Scans scene for multiple player sprites (should be exactly 1)
3. **Renderer Stability Monitoring**: Detects WebGL context loss and renderer state changes

## Hotkeys
- **V key**: Dump current mitigation status to console

## What Logs Mean

### Duplicate Player Visuals
```
🚨 DUPLICATE PLAYER VISUALS DETECTED!
```
**Meaning**: Multiple player sprites exist in scene (should be 1)  
**Action**: Check player instantiation/cleanup logic

### Renderer State Changed
```
🚨 RENDERER STATE CHANGED!
```
**Meaning**: Renderer resolution, DPR, or WebGL type changed mid-game  
**Action**: Investigate GPU/driver issues or renderer configuration

### WebGL Context Lost
```
🚨 WebGL context LOST!
```
**Meaning**: GPU driver crashed or browser lost WebGL context  
**Action**: Check GPU health, driver updates, or browser issues

## Rollback
```bash
# Option 1: Using stash
git stash pop stash@{0}

# Option 2: Using diff
git apply --reverse RESCUE_mitig2_after.diff

# Option 3: Git reset
git reset --hard dd0a94a
```
