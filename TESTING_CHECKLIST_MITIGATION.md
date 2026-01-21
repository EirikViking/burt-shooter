# Flicker Mitigation V2 Testing Checklist

## Prerequisites
- Build passed: ✅
- Committed: ✅
- Pushed to GitHub: ✅

## Testing Steps

### 1. Enable Trace Mode
- [ ] Open game with `?trace=1` parameter
- [ ] Verify console shows: `[FlickerMitigation] ✅ Visual clamping ENABLED`
- [ ] Press **V** key and verify status dump appears in console

### 2. Baseline Gameplay
- [ ] Start a new game
- [ ] Observe player ship - should be fully visible and opaque
- [ ] Note: Invulnerability blink is DISABLED in trace mode (clamping overrides it)

### 3. Die and Respawn Test (Critical)
- [ ] Play until player dies
- [ ] Wait for respawn
- [ ] **Observe carefully**: Does flicker still occur?
  - [ ] If YES: Flicker is NOT caused by player alpha/visibility changes
  - [ ] If NO: Flicker was caused by competing visual state writers

### 4. Check Console for Diagnostics

#### Duplicate Player Visuals
- [ ] Check console for: `🚨 DUPLICATE PLAYER VISUALS DETECTED!`
- [ ] If detected, note the count (should be 1, not 2+)

#### Renderer Stability
- [ ] Check console for: `🚨 RENDERER STATE CHANGED!`
- [ ] Check console for: `🚨 WebGL context LOST!`
- [ ] If detected, this indicates renderer instability

### 5. Extended Play Test
- [ ] Continue playing for 5+ minutes
- [ ] Die and respawn 3-5 times
- [ ] Monitor console for any anomalies
- [ ] Note if flicker pattern changes with clamping enabled

## Expected Outcomes

### If Flicker Persists with Clamping
**Conclusion**: Flicker is NOT caused by:
- Player alpha changes
- Player visibility changes
- Player renderable state changes
- Invulnerability blink effects

**Next Steps**: Investigate other causes (renderer, texture, GPU)

### If Flicker Stops with Clamping
**Conclusion**: Flicker WAS caused by competing visual state writers

**Next Steps**: Identify and remove the competing writer

### If Duplicate Visuals Detected
**Conclusion**: Multiple player sprites exist in scene

**Next Steps**: Fix player instantiation/cleanup logic

### If Renderer Instability Detected
**Conclusion**: WebGL context loss or renderer state changes

**Next Steps**: Investigate GPU/driver issues or renderer configuration

## Notes
- Visual clamping runs every frame (near-zero overhead)
- Duplicate visual check runs once per second
- Renderer stability check runs once per second
- All checks only active when `?trace=1` is enabled
