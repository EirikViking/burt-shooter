# Flicker Root Cause Analysis - 2026-01-21

## Summary
Post-respawn screen flicker was caused by **two competing writers setting player.sprite.alpha every frame**.

## Root Cause
In `PlayScene.update()` at line 553, there was unconditional code:
```javascript
sprite.alpha = 1;
```

This ran **after** `Player.update()` which sets alpha for invulnerability blink:
```javascript
if (this.invulnerable) {
    const pulse = Math.sin(time * 8) * 0.5 + 0.5;
    this.sprite.alpha = 0.4 + pulse * 0.6; // 0.4 to 1.0
}
```

**Result:** Every frame, Player set alpha to ~0.4-1.0 (pulsing), then PlayScene immediately reset it to 1.0. This created visible flicker as the renderer alternated between the two values.

## Why It Only Occurred After Respawn
Before respawn, `player.invulnerable = false`, so Player.update() didn't touch alpha.
After respawn, `forceRespawn()` sets `this.invulnerable = true; this.invulnerableTime = 3000;`
This triggered the alpha pulse loop in Player.update(), which then conflicted with PlayScene's override.

## Why Debug Logging "Fixed" It
Heavy console.log calls add ~1-5ms I/O overhead per frame, which:
1. Changed frame delta timing
2. Potentially reordered microtask queues
3. Made the visual difference between 0.4 and 1.0 less noticeable due to frame skip

This masked the underlying timing bug, making it a classic "Heisenbug".

## The Fix
In `PlayScene.update()`, only force alpha=1 if player is NOT in a special visual state:
```javascript
if (!this.player.invulnerable && !this.player.isDodging && this.player.activePowerup?.type !== 'ghost') {
    sprite.alpha = 1;
}
```

This respects Player.update()'s ownership of alpha during:
- Invulnerability blink (after respawn or damage)
- Dodge roll (semi-transparent)
- Ghost powerup (0.4 alpha)

## Files Changed
- `src/scenes/PlayScene.js` - Added guard condition around alpha assignment

## Verification
1. `npm run build` passes
2. Respawn no longer causes flicker
3. Invulnerability pulse animation works correctly
4. Ghost and dodge states still function properly

## Rollback
```bash
git checkout HEAD~1 -- src/scenes/PlayScene.js
```
Or apply the patch file: `00_before_ag_flicker_fix.patch`
