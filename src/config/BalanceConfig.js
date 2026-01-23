export const BalanceConfig = {
    // TASK 3: Global difficulty multiplier (0.85 = 15% easier)
    DIFFICULTY_MULTIPLIER: 0.85,

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

    // Difficulty (MUCH gentler curve - playable to level 10+)
    difficulty: {
        baseEnemyHealthMultiplier: 0.9, // Lower HP baseline
        hpScalePerLevel: 0.04, // HALVED from 0.08 - much gentler HP growth

        enemySpeedMultiplier: 0.88, // Lower global speed
        enemySpeedPerLevel: 0.01, // HALVED from 0.02 - much slower speed increase

        enemyFireDelayPerLevel: 0.02, // HALVED from 0.04 - slower fire rate increase
        enemyFireChance: 0.005, // Reduced from 0.006 - less frequent shooting
        enemyProjectileSpeed: 3.0, // Slower enemy bullets (from 3.2)

        waveCountBase: 3, // Base waves per level
        waveCountPerLevel: 5, // Add wave every 5 levels (was 4)
        waveCountMax: 5, // Cap waves

        waveEnemyBase: 6, // Reduced from 7
        waveEnemyPerLevel: 0.3, // HALVED from 0.6 - much slower enemy count growth
        waveEnemyRandom: 1, // Reduced from 2
        waveEnemyMax: 15, // Reduced cap from 18
        waveDelayMs: 2800, // Longer pause between waves (from 2400)

        bossBaseHealth: 120, // Reduced from 139
        bossHealthPerLevel: 35, // REDUCED from 60 - much slower boss HP growth
        bossShootDelayBase: 24, // AGGRESSIVE - shoots 25% more often
        bossShootDelayPhase2: 14, // VERY AGGRESSIVE - shoots 30% more often
        bossShootDelayPhase3: 10, // EXTREMELY AGGRESSIVE - shoots 29% more often
        bossProjectileSpeedPhase1: 4.0, // Slightly faster bullets
        bossProjectileSpeedPhase2: 4.5, // Faster spread shots
        bossProjectileSpeedPhase3: 5.0, // Very fast spiral bullets

        precisionPenalty: true, // If true, reduced score for missed shots (concept)
        sprayInefficiency: 0.8 // Damage multiplier if shooting blindly (concept, maybe skip to keep simple)
    },

    // Modifiers
    modifiers: {
        enabled: true,
        types: [
            'SHIELDED',   // Enemies have +50% HP (blue tint)
            'AGGRESSIVE', // Enemies shoot 30% faster (red tint)
            'SWIFT'       // Enemies move 40% faster (yellow tint)
        ]
    },

    // Levels
    level: {
        completionBonus: 1000,
        sequenceDuration: 2000 // ms
    }
};
