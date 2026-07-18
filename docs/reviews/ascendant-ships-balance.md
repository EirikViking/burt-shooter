# Ascendant Ships Balance Review

Date: 2026-06-24

## Summary

- Current normal ship count: 25.
- New Ascendant Tier ship count: 5.
- New player-facing ship total: 30.
- Unlock model: soft progression through reached sector/level milestones.
- Existing leaderboard names, achievements, score formula, XP formula, Steam AppID, depot IDs, and Steam Cloud settings are unchanged.

## Effective Power Index

The new `scripts/check-ascendant-ships.mjs` uses a simple Effective Power Index from existing ship fields:

`damage * lanes * cadence * projectile speed * mobility * survivability * special uptime * control utility`

This is a guardrail, not a full simulator. It is intended to catch accidental weak ships, non-monotonic progression, and absurd outliers.

| Ship | Unlock | Role | Weakness | Intended sector band | Target vs best normal | Measured vs best normal |
| --- | ---: | --- | --- | --- | ---: | ---: |
| Aegis Comet | Level 30 | Survival bridge | Slower movement and less boss burst than cannon hulls | 30-34 | 1.25-1.35x | 1.31x |
| Railbreaker | Level 35 | Boss killer | Tight lanes and slower handling make dense swarms harder | 35-39 | 1.45-1.55x | 1.50x |
| Drone Sovereign | Level 40 | Swarm clearer | Boss damage relies on staying on target | 40-44 | 1.65-1.80x | 1.77x |
| Phase Seraph | Level 45 | Bullet-hell specialist | Lower raw boss pressure than Railbreaker or Eirik the Viking | 45-49 | 1.90-2.10x | 2.01x |
| Eirik the Viking | Level 50 | Apex late-game ship | Large core and high-output windows demand clean positioning | 50+ | 2.25-2.50x | 2.38x |

The strongest normal ship remains the baseline. Aegis Comet is more than 20% above it, and Eirik the Viking is more than 100% above it while staying below the check's safety ceiling.

## Art

No `nova-player-ship-26.png` through `nova-player-ship-30.png` files exist yet. The Ascendant ships therefore use explicit temporary fallback art:

- Aegis Comet: `nova-player-ship-21.png`
- Railbreaker: `nova-player-ship-22.png`
- Drone Sovereign: `nova-player-ship-23.png`
- Phase Seraph: `nova-player-ship-24.png`
- Eirik the Viking: `nova-player-ship-25.png`

Final unique Ascendant ship art is still needed. The fallbacks are valid loaded assets and are tinted through the existing trait/variant path.

## Migration

Existing profiles automatically recalculate unlocks from `ShipUnlockConfig` when hangar progress is read. Players who already reached sectors 30, 35, 40, 45, or 50 will meet the corresponding requirements. The credits easter egg adds backward-compatible optional progress fields for the Eirik attempt count and found state.

## Credits Easter Egg

Eirik the Viking also has a rare credits-screen easter egg path. The credits cabinet seal rolls a 0.2% chance after the seal is warmed up, capped at 25 profile attempts, and marks the unlock as a secret if it hits. Normal level-50 progression remains unchanged.

## Leaderboard And Fairness

The Steam leaderboard API names and score encoding are unchanged. Run summaries and leaderboard metadata now preserve `shipTier` and `shipPowerRating` locally so Ascendant usage can be shown or audited without creating a new leaderboard.

Daily/challenge behavior was not changed. Ascendant ships are late-game progression rewards, not hard gates; normal ships can still theoretically reach deep sectors with exceptional play.

## Files Changed

- `src/config/ShipData.js`
- `src/config/VisualVariantCatalog.js`
- `src/config/ShipMetadata.js`
- `src/config/ShipUnlockConfig.js`
- `src/progression/HangarProgressState.js`
- `src/ui/ShipStatPanel.js`
- `src/ui/SettingsOverlay.js`
- `src/scenes/ShipSelectScene.js`
- `src/scenes/ShipDetailsScene.js`
- `src/entities/Player.js`
- `src/game/Game.js`
- `src/leaderboard/LeaderboardTypes.js`
- `src/main.js`
- `scripts/check-ascendant-ships.mjs`
- `scripts/check-credits-ascendant-easter-egg.mjs`
- `scripts/check-easter-eggs.mjs`
- `scripts/check-menu-credits-layout.mjs`
- `scripts/check-controller-only-flow.mjs`
- `scripts/check-ship-traits.mjs`
- `scripts/check-generated-rosters.mjs`
- `scripts/check-unlock-rank-pacing.mjs`
- `scripts/check-codex-revamp.mjs`
- `scripts/qa-release-gauntlet.mjs`
- `scripts/rescue-profile-progress.mjs`
- `package.json`

## Future Tuning

- Replace temporary fallback art with five unique Ascendant PNGs.
- Run longer manual deep-sector playtests for actual survivability, especially Phase Seraph dodge-pulse value.
- Revisit Eirik the Viking if level-50 players consistently trivialize bosses rather than merely reaching deeper sectors.

## Rollback

```bash
git revert <source commit>
```
