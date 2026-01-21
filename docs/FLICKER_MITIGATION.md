# Flicker Mitigation V2 (Enhanced)

## Purpose
Production mitigation to eliminate player visual flicker through hard visual clamping and anomaly detection.

## How to Enable
Add `?trace=1` to the URL:
```
https://burt-game.pages.dev/?trace=1
```

## What It Does
1. **Hard Visual Clamping**: Forces `player.sprite.alpha=1`, `visible=true`, `renderable=true` using the authoritative player reference.
2. **Duplicate Visual Detection**: Scans entire stage tree for player sprites using robust markers (`__isPlayerVisual`).
3. **Missing Visual Recovery**: If player sprite is detached from scene, it attempts to re-mount it to the game container.
4. **Renderer Stability Monitoring**: Detects WebGL context loss and renderer state changes.

## Hotkeys
- **V key**: Dump current mitigation status and last sample to console.

## What Logs Mean

### Duplicate Player Visuals
```
🚨 DUPLICATE PLAYER VISUALS DETECTED!
```
**Meaning**: Multiple player sprites exist in scene (should be 1).
**Action**: Check player instantiation/cleanup logic.

### Missing Player Visual
```
🚨 MISSING PLAYER VISUAL!
```
**Meaning**: Zero player sprites found in stage traversal.
**Recovery**: Use **V** dump to check if `Authoritative Ref` has a parent. If `spriteParent` is `null`, the sprite was detached. The mitigation will attempt to re-attach it.

### Renderer State Changed
```
🚨 RENDERER STATE CHANGED!
```
**Meaning**: Renderer resolution, DPR, or WebGL type changed mid-game.
**Action**: Investigate GPU/driver issues.

## Rollback
```bash
git apply --reverse RESCUE_player_visual_after.diff
```
