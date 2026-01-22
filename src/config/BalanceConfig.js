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

    // Difficulty (gentler curve and reduced pressure)
    difficulty: {
        baseEnemyHealthMultiplier: 0.95, // Slightly lower HP baseline
        hpScalePerLevel: 0.08, // gentler scaling per level

        enemySpeedMultiplier: 0.92, // Global speed reduction
        enemySpeedPerLevel: 0.02, // Gentle speed scaling

        enemyFireDelayPerLevel: 0.04, // Slower firing per level
        enemyFireChance: 0.006, // Lower shooting chance per tick
        enemyProjectileSpeed: 3.2, // Slightly slower enemy bullets

        waveCountBase: 3, // Base waves per level
        waveCountPerLevel: 4, // Add wave every N levels
        waveCountMax: 5, // Cap waves

        waveEnemyBase: 7, // Base enemies per wave
        waveEnemyPerLevel: 0.6, // Gentle scaling per level
        waveEnemyRandom: 2, // Small random add
        waveEnemyMax: 18, // Cap enemies per wave
        waveDelayMs: 2400, // Slower pacing between waves

        bossBaseHealth: 139, // Balanced boss baseline HP
        bossHealthPerLevel: 60, // Moderate scaling (Level 2 = 259 HP)
        bossShootDelayBase: 32, // Faster, more dangerous firing
        bossShootDelayPhase2: 20, // Much faster in phase 2
        bossShootDelayPhase3: 14, // Very aggressive in phase 3
        bossProjectileSpeedPhase1: 3.8, // Faster bullets for challenge
        bossProjectileSpeedPhase2: 4.2, // Even faster
        bossProjectileSpeedPhase3: 4.8, // Maximum threat

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
