export const BalanceConfig = {
    // Rank System
    ranks: {
        NUM_RANKS: 20,
        MAX_RANK_INDEX: 19
    },

    // Powerups
    powerups: {
        dropChance: 0.05, // Lowered base chance since we have guarantees
        cooldownMs: 15000, // ~15 seconds global cooldown (12-18s range implemented in logical check)
        maxPerLevel: 3,
        minPerLevel: 2,
        guaranteeWindowStart: 0.2, // 20% progress
        guaranteeWindowEnd: 0.8, // 80% progress
        logDrops: true, // Dev toggle

        // White Beer Can (Special Powerup)
        whiteCan: {
            spawnChance: 0.0005, // Very rare (approx 1 per 33 secs at 60fps unchecked, but logical checks apply)
            cooldown: 60000, // 60s global cooldown
            minTime: 20000, // No spawn in first 20s
            scoreBoostDuration: 10000, // 10s (8-12 avg)
            scoreMultiplier: 2
        }
    },

    // Difficulty
    difficulty: {
        baseEnemyHealthMultiplier: 1.25, // +25% HP start
        hpScalePerLevel: 0.15, // stronger scaling

        baseEnemyCount: 20, // Reduced from previous hardcoded values to be cleaner
        countScalePerLevel: 6, // +6 per level

        fireRateScale: 0.05, // 5% faster firing per level
        projectileSpeed: 3.2, // Kept moderate

        precisionPenalty: true, // If true, reduced score for missed shots (concept)
        sprayInefficiency: 0.8 // Damage multiplier if shooting blindly (concept, maybe skip to keep simple)
    },

    // Modifiers
    modifiers: {
        enabled: true,
        types: [
            'DRIFT',      // Enemies drift slowly
            'SHIELDED',   // One enemy type has +HP / Armor
            'AGGRESSIVE', // Higher shoot rate
            'WIND'        // Bullets drift
        ]
    },

    // Levels
    level: {
        completionBonus: 1000,
        sequenceDuration: 2000 // ms
    }
};
