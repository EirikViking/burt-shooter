# Implementation Plan: Leaderboard, UI, Popups, Ship, and Audio Fixes

## Snapshot
- Commit: `b9a0726` (HEAD -> main)
- Working tree: Clean
- Build: ✅ Passing

## Work Order

### A) Leaderboard Correctness, Speed, and Deduplication

**Issues:**
1. Duplicate entries (EAM logged twice)
2. Slow loading and 500 errors
3. Pending entries survive refresh
4. Name prompt shown even when not qualified

**Fixes:**
1. **Client (`src/api/API.js`, `src/scenes/GameOverScene.js`):**
   - Generate `submissionId` (UUID) per run
   - Reuse `submissionId` across retries
   - Disable resubmit while in flight
   - Show transient "Submitting..." banner instead of pending entry
   - Only prompt for name if score qualifies for top 10

2. **Worker (`functions/api/highscores.js`):**
   - Accept `submissionId` in POST
   - Add `submission_id` column to D1 (if migration system exists)
   - Enforce UNIQUE constraint on `submission_id`
   - Return existing row if duplicate `submissionId`
   - Add Cache-Control headers (15-30s TTL)
   - Optimize GET query with proper indexing

### B) Ranking Sprite Rendering

**Issue:** Rank icons don't show correctly on leaderboard

**Fix:**
- Check `HighscoreScene.js` rank icon rendering
- Verify asset keys match sprite catalog
- Fix alignment and visibility

### C) Popup Overlap Resolution

**Issue:** Multiple mid-screen popups overlap

**Fix:**
- Implement slot-based layout manager
- Slots: top-center, top-left, top-right, mid-left, mid-right, bottom-center
- Assign popup types to slots
- Queue or downgrade if slot occupied

### D) WAVE CLEARED Size Reduction

**Issue:** WAVE CLEARED popup too big

**Fix:**
- Locate creation in `PlayScene.js`
- Reduce scale and font size by 40%

### E) Portrait Under SCORE Enhancement

**Issue:** Small portrait popup under SCORE is pointless

**Fix:**
- Increase size by 50%
- Add headline, trigger tag, and one lore line
- Tie to triggers: wave cleared, boss spawn, rank up, combo milestone, powerup, near death
- Add cooldown (8-12s minimum)
- Use existing LoreBank

### F) Double Ship Firing Fix

**Issue:** Ship appears double but doesn't fire double

**Fix:**
- In `Player.js` constructor, initialize `this.multiShot` from `this.weaponProfile.bullets`
- Currently hardcoded to `1`, should be set from weapon config

### G) Remove Blip Blop Sound

**Issue:** Annoying `computerNoise` SFX fires in leaderboard and gameplay

**Fix:**
- Remove or replace `computerNoise` calls
- Add cooldown if kept
- Check: `PlayScene.js` line 2508, `PowerupManager.js`, `HighscoreScene.js`

## Flicker Safety

**Regression Guard (Dev Only):**
- Add dev-only guard to block writes to `stage.alpha` or world root `alpha`
- Log warning and block write
- Disabled in production builds

## Verification Checklist

- [ ] Leaderboard name prompt only for top 10
- [ ] No 500 errors on submit
- [ ] No duplicate entries
- [ ] Retry doesn't create duplicates
- [ ] Highscores load fast
- [ ] Ranking icons render correctly
- [ ] Popup overlaps resolved
- [ ] WAVE CLEARED 40% smaller
- [ ] Portrait under SCORE 50% larger with lore
- [ ] Double ship fires double
- [ ] Blip blop removed
- [ ] Flicker regression test passes
- [ ] `npm run build` passes

## Files to Modify

### Frontend
1. `src/api/API.js` - Add submissionId, caching
2. `src/scenes/GameOverScene.js` - Name gating, submissionId
3. `src/scenes/HighscoreScene.js` - Rank icons, remove pending logic
4. `src/scenes/PlayScene.js` - Popup slots, WAVE CLEARED size, portrait, remove computerNoise
5. `src/entities/Player.js` - Fix multiShot initialization
6. `src/managers/PowerupManager.js` - Remove computerNoise reference

### Backend (Worker)
7. `functions/api/highscores.js` - submissionId, deduplication, caching

### Migration (If Safe)
8. `migrations/` - Add submission_id column with UNIQUE constraint

## Deployment

1. Commit all changes
2. Push to GitHub once
3. Frontend auto-deploys via Pages
4. **Manually deploy Worker** after push (if Worker changed)

## Rollback

```bash
git reset --hard b9a0726
git push origin main --force-with-lease
```
