# Flicker Bug - Final Status (2026-01-21)

## TL;DR

**Status**: Game is stable with the original fix from commit `6715851` in place.  
**PropertyWriteTracer**: Removed - caused crashes and performance issues.  
**Current Fix**: PlayScene respects Player's alpha state during invulnerability/dodge/ghost.

---

## What Happened

### Attempt 1: Direct Fix (Commit `6715851`)
- **Issue**: PlayScene.update() was forcing `sprite.alpha = 1` every frame
- **Fix**: Added guard condition to only set alpha=1 when NOT invulnerable/dodging/ghost
- **Result**: Partial success, but flicker reportedly persisted

### Attempt 2: PropertyWriteTracer (Commits `db3e4eb`, `8c670fd`, `b33f87f`)
- **Goal**: Create deterministic debugging tool to find competing writers
- **Implementation**: Property change tracker with stack traces
- **Problems**:
  - Initial version (setter patching) caused `TypeError` and game freeze
  - Fixed version (polling) caused performance issues
  - Even with auto-enable disabled, added complexity without solving the problem
- **Result**: Removed entirely in commit `7f693aa`

---

## Current State

### Active Fix
The fix from commit `6715851` is still in place:

```javascript
// PlayScene.js lines 563-567
// FIX: Do NOT override alpha if player is in a special visual state
// Player.update() handles alpha for: invulnerable blink, dodge, ghost powerup
if (!this.player.invulnerable && !this.player.isDodging && this.player.activePowerup?.type !== 'ghost') {
    sprite.alpha = 1;
}
```

This prevents PlayScene from overriding the invulnerability blink animation that Player.update() creates.

### What Was Removed
- `src/utils/PropertyWriteTracer.js` - Deleted
- All `patchDisplayObject()` calls - Removed
- All `propertyWriteTracer` references - Removed
- Automatic high-attention mode after respawn - Removed

---

## If Flicker Still Occurs

If the flicker is still happening, the root cause is likely:

### 1. Additional Competing Writers
There may be other code paths writing to player.sprite.alpha besides PlayScene.update():
- Screen shake effects
- Overlay animations (toasts, lore banners, boss taunts)
- Ship intro animation
- Rank-up animations
- Death/respawn transitions

### 2. Different Properties
The issue might not be `alpha` at all, but:
- `visible` - Being toggled
- `renderable` - Being toggled  
- `scale` - Being changed
- `tint` - Being set to 0x000000 (black)

### 3. Container-Level Issues
The problem might be with `player.sprite` (container) vs `player.shipSprite` (actual ship visual):
- One might be visible while the other isn't
- Alpha might be set on the wrong object
- Z-index or parent issues

---

## Recommended Next Steps

### Option 1: Manual Code Audit
Search the codebase for all writes to player visual properties:

```bash
# Find all alpha writes
grep -r "\.alpha\s*=" src/

# Find all visible writes  
grep -r "\.visible\s*=" src/

# Find player sprite references
grep -r "player\.sprite" src/
grep -r "player\.shipSprite" src/
```

Then manually verify each one respects player state.

### Option 2: Add Targeted Logging
Instead of a complex tracer, add simple console.log at suspected locations:

```javascript
// In Player.update() invulnerability block
console.log('[Player] Setting alpha to', this.sprite.alpha, 'invuln:', this.invulnerable);

// In PlayScene.update() sprite check
console.log('[PlayScene] Player state - invuln:', this.player.invulnerable, 'alpha:', sprite.alpha);
```

Run the game, reproduce flicker, check console for the sequence of events.

### Option 3: Simplify Player Visual State
Ensure Player owns ALL visual state:
- Move ALL alpha/visible/renderable logic into Player class
- Remove ALL direct sprite property writes from PlayScene
- Use Player methods like `player.setVisible(true)` instead

---

## Files Changed (Final State)

| File | Status |
|------|--------|
| `src/scenes/PlayScene.js` | Modified - has guard condition for alpha |
| `src/utils/PropertyWriteTracer.js` | **DELETED** |
| `docs/flicker_investigation_20260121.md` | Outdated - refers to removed code |
| `docs/flicker_root_cause_20260121.md` | From earlier attempt |

---

## Commit History

| Commit | Description | Status |
|--------|-------------|--------|
| `7f693aa` | chore: remove PropertyWriteTracer | ✅ Current |
| `b33f87f` | fix: disable automatic PropertyWriteTracer | Superseded |
| `e837a3e` | docs: update flicker investigation | Outdated |
| `8c670fd` | fix: PropertyWriteTracer crash - use polling | Superseded |
| `db3e4eb` | feat: add PropertyWriteTracer | Superseded |
| `6715851` | **fix: stop post-respawn alpha flicker** | ✅ **Active Fix** |

---

## Rollback

To revert to the state before PropertyWriteTracer was attempted:

```bash
# Already done - we're back to the original fix
git log --oneline -n 10
# Shows: 7f693aa is current, 6715851 fix is still active
```

---

## Conclusion

The game is now in a **clean, stable state** with:
- ✅ Original alpha guard fix in place (commit `6715851`)
- ✅ No complex debugging code causing crashes
- ✅ Smaller bundle size (596KB vs 599KB)
- ✅ No performance overhead

If flicker persists, it requires a different investigation approach - likely a manual code audit to find other competing writers, or a fundamental redesign of who owns player visual state.
