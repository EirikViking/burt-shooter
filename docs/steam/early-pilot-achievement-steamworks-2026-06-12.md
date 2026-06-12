# Early Pilot Achievement Steamworks Checklist

Status: code and assets implemented. Manual Steamworks app-admin setup may still be required.

## Achievement

- API Name: `ACH_EARLY_PILOT`
- Display Name: `Early Pilot`
- Description: `Play one ranked run during the early pilot window.`
- Hidden: `false`
- Achieved icon: `release/steamworks/achievement-icons/ACH_EARLY_PILOT-achieved.jpg`
- Locked icon: `release/steamworks/achievement-icons/ACH_EARLY_PILOT-locked.jpg`

## Runtime Logic

- The catalog entry lives in `src/achievements/AchievementCatalog.js`.
- Normal unlock condition: milestone metric `totalRuns >= 1`.
- Safe backfill: `src/game/Game.js` checks existing hangar progress on startup and unlocks Early Pilot if the player already has ranked-run activity, best score, boss defeats, or wave clears.
- Existing achievement IDs were not changed.

## Manual Steamworks Steps

1. Open Steamworks app `4765070`.
2. Go to App Admin > Stats & Achievements > Achievements.
3. Add or verify achievement API name `ACH_EARLY_PILOT`.
4. Set display name, description, hidden flag, and both icon files exactly as listed above.
5. Publish the Steamworks admin change through the normal Steamworks preview/review flow.
6. Launch the packaged build through Steam and confirm an existing pilot profile receives the achievement without resetting any other achievement.

## Verification Commands

```bash
npm run check:achievements
npm run check:steam-achievements-mock
npm run build:current
```

Do not rename existing achievement API IDs. Do not clear live player achievements except through explicit external Steam debugging tools.
