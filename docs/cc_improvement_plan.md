# Claude Code Improvement Plan - Burt Shooter
**Date:** 2026-01-20
**Branch:** cc-improve-20260120

## Top 10 Improvements (Priority Order)

### P1: Polish & Juice (Low Risk)

#### 1. Enhanced Screen Shake & Impact Feel
**Priority:** HIGH | **Risk:** LOW
**Files:** `src/effects/ScreenShake.js`, `src/entities/Player.js`, `src/entities/Boss.js`
**Changes:**
- Add variable intensity screen shake on hit (player takes damage = strong, enemy death = subtle)
- Add screen shake to boss death sequence
- Implement brief freeze frames on critical hits (boss phase transitions)
- Add sprite flash/tint on damage (white flash for player, red for enemies)

**Assets:** None needed (using existing effects)

#### 2. Particle Effect Enhancements
**Priority:** HIGH | **Risk:** LOW
**Files:** `src/effects/ParticleManager.js`, `src/entities/Enemy.js`, `src/entities/Boss.js`
**Changes:**
- Add enemy-color-coded particle explosions (match enemy wave color)
- Add larger/more dramatic boss explosion particles
- Add trail particles for fast-moving enemies during dive attacks
- Add powerup collection particle burst
- Add muzzle flash particles for player weapon fire

**Assets:** Use existing sprite debris from assetManifest

#### 3. UI Polish & Visual Feedback
**Priority:** MEDIUM | **Risk:** LOW
**Files:** `src/scenes/PlayScene.js`, `src/ui/*.js`
**Changes:**
- Add score popup text on enemy kills (floats up and fades)
- Add combo counter display for rapid kills
- Add health bar color transitions (green→yellow→red)
- Add boss health bar with phase markers
- Add visual timer/progress bar for active powerups

**Assets:** None needed (PIXI.Graphics + Text)

---

### P2: Balance & Clarity (Low-Medium Risk)

#### 4. Enemy Movement Variety
**Priority:** HIGH | **Risk:** MEDIUM
**Files:** `src/entities/Enemy.js`, `src/managers/EnemyManager.js`
**Changes:**
- Add "spiral" dive pattern (corkscrew approach)
- Add "flanking" behavior (enemies approach from sides)
- Add occasional "kamikaze" rushes from random enemies
- Vary entry curves more dramatically (some enemies enter from bottom)
- Add subtle idle wobble to formation enemies

**Assets:** None needed

#### 5. Boss Attack Pattern Variants
**Priority:** HIGH | **Risk:** MEDIUM
**Files:** `src/entities/Boss.js`
**Changes:**
- Add "spiral" shot pattern (rotating spread)
- Add "aimed burst" (3-shot pattern at player)
- Add "sweep" attack (horizontal line of bullets)
- Add telegraphed "signature move" per boss type (visual windup)
- Randomize pattern selection within phases

**Assets:** None needed (or simple telegraph sprite from PIXI.Graphics)

#### 6. Difficulty Curve Refinement
**Priority:** MEDIUM | **Risk:** MEDIUM
**Files:** `src/config/BalanceConfig.js`
**Changes:**
- Adjust early game to be slightly easier (levels 1-3)
- Add "breathing room" between waves (extend waveDelayMs by 20%)
- Reduce boss phase 3 bullet speed slightly
- Increase powerup drop rate in early levels (scale down at high levels)
- Add score multiplier for "no damage" waves

**Assets:** None needed

---

### P3: Variety & Depth (Medium Risk)

#### 7. New Powerup: Shield Bubble
**Priority:** MEDIUM | **Risk:** MEDIUM
**Files:** `src/entities/PowerupTypes.js` (create), `src/managers/PowerupManager.js`, `src/entities/Player.js`
**Changes:**
- Add shield powerup that absorbs 1 hit
- Visual: blue glowing circle around player
- Duration: until hit or 15 seconds
- Drop chance: 10% (from balanced powerup pool)
- Audio cue on activation and depletion

**Assets:** Use existing shield sprites from `xtra-sprites/Parts/shield*.png`

#### 8. Environmental Hazards (Asteroids/Debris)
**Priority:** MEDIUM | **Risk:** MEDIUM
**Files:** `src/entities/Asteroid.js` (create), `src/managers/HazardManager.js` (create), `src/scenes/PlayScene.js`
**Changes:**
- Add slow-moving asteroids that drift from top to bottom
- Player and enemies can shoot them for score bonus
- Asteroids split into smaller pieces when damaged
- Appear randomly every 30-60 seconds
- Visual: use existing meteor sprites or create from PIXI.Graphics

**Assets:** Check for meteor/asteroid in xtra-sprites, or generate procedurally

#### 9. Boss Minion Spawn Mechanic
**Priority:** LOW | **Risk:** MEDIUM
**Files:** `src/entities/Boss.js`, `src/managers/EnemyManager.js`
**Changes:**
- Phase 2/3 bosses occasionally spawn 1-2 weak enemies as support
- Minions have low HP but add pressure
- Max 3 minions active at once
- Spawn every 8-12 seconds during boss fight
- Clear all minions on boss death

**Assets:** Use existing enemy sprites (smaller/weaker variants)

---

### P4: Audio/Visual Expansion (Low-Medium Risk)

#### 10. Dynamic Audio Feedback
**Priority:** LOW | **Risk:** LOW
**Files:** Check for AudioManager, add sound triggers across entities
**Changes:**
- Add distinct SFX for each powerup type
- Add boss phase transition sound cues
- Add low-health warning beep for player (when 1 life left)
- Add combo/multi-kill sound effects
- Add ambient space background hum (very subtle)
- Verify all audio uses AudioManager pattern (guarded calls)

**Assets:** Use existing SFX from `/public/audio/sfx/` (check manifest), no new files

---

## Implementation Phases

### Phase 1: Polish & Juice (Items 1-3)
**Goal:** Make existing gameplay feel better
**Commits:**
1. Enhanced screen shake and impact feel
2. Particle effect enhancements
3. UI polish and visual feedback

**Milestone Test:** Build passes, game feels more responsive

---

### Phase 2: Balance & Clarity (Items 4-6)
**Goal:** Improve variety and pacing
**Commits:**
1. Enemy movement variety
2. Boss attack pattern variants
3. Difficulty curve refinement

**Milestone Test:** Build passes, gameplay feels more dynamic

---

### Phase 3: Variety (Items 7-9)
**Goal:** Add new mechanics without breaking balance
**Commits:**
1. Shield bubble powerup
2. Environmental hazards (if feasible)
3. Boss minion spawns (if time permits)

**Milestone Test:** Build passes, new features are fun and balanced

---

### Phase 4: Audio/Visual Expansion (Item 10)
**Goal:** Rich audio feedback
**Commits:**
1. Dynamic audio feedback system

**Milestone Test:** Build passes, all sounds work without crashes

---

### Phase 5: Stability & Polish
**Goal:** Fix any bugs, verify all systems
**Commits:**
1. Bug fixes and performance tuning
2. Final balance adjustments

**Milestone Test:** Clean build, smooth gameplay

---

## Safety Checklist

- [x] Baseline build passes
- [x] Branch created: `cc-improve-20260120`
- [x] Snapshot committed and pushed
- [ ] All protected files untouched (index.html, public/sw.js, public/version.json, public/_headers)
- [ ] All audio uses AudioManager with guards
- [ ] All lore uses phrasePool.js (no hardcoded text)
- [ ] All assets reference assetManifest.js
- [ ] Rank system remains at 20 ranks (0-19)
- [ ] Each phase builds and commits before next
- [ ] RESCUE diffs saved at key points
- [ ] Final push to branch

---

## Risk Assessment

**Low Risk Items (Safe):** 1, 2, 3, 10
**Medium Risk Items (Test Carefully):** 4, 5, 6, 7, 8, 9
**High Risk Items (None)**

**Rollback Strategy:** Each commit is reversible. Branch can be abandoned and main restored if needed.

---

## Notes

- **Lore:** All taunts/names use phrasePool.js patterns
- **Audio:** Check if AudioManager exists, otherwise add guarded getSfx() calls
- **Assets:** Prioritize using existing 1225 sprites before creating new ones
- **Balance:** Use BalanceConfig.DIFFICULTY_MULTIPLIER for scaling
- **Ranks:** Never exceed 19, use BalanceConfig.ranks constants

---

## Success Criteria

1. Build passes after each phase
2. Game feels more responsive and varied
3. No new crashes or errors
4. All changes reversible via git
5. Performance remains smooth (60fps target)
6. Lore/theme consistency maintained
