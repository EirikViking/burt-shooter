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
        dropChance: 0.02, // Base enemy-drop chance; kept sparse so pickups feel intentional
        chanceGrowthPerSecond: 0.002,
        maxDropChance: 0.12,
        cooldownMs: 18000,
        maxPerLevel: 2,
        minPerLevel: 1,
        extraLifeChance: 0.01,
        extraLifeGuaranteedEveryLevels: 4,
        guaranteeWindowStart: 0.2, // 20% progress
        guaranteeWindowEnd: 0.8, // 80% progress
        logDrops: true, // Dev toggle

        // Bonus core special powerup
        bonusCore: {
            spawnChance: 0.0005, // Very rare (approx 1 per 33 secs at 60fps unchecked, but logical checks apply)
            cooldown: 60000, // 60s global cooldown
            minTime: 20000, // No spawn in first 20s
            scoreBoostDuration: 10000, // 10s (8-12 avg)
            scoreMultiplier: 2
        }
    },

    // Difficulty: readable score-chaser tempo with boss pressure every level.
    difficulty: {
        // Slower motion, similar threat: fewer twitch spikes, more sustained pressure.
        pressureScalar: 0.96,
        baseEnemyHealthMultiplier: 0.96,
        hpScalePerLevel: 0.04,

        enemySpeedMultiplier: 0.76,
        enemySpeedPerLevel: 0.007,

        enemyFireDelayPerLevel: 0.018,
        enemyFireChance: 0.0057,
        enemyProjectileSpeed: 2.55,

        waveCountBase: 2, // Fast score-chaser cadence: two focused waves, then boss
        waveCountPerLevel: 99, // Keep level 10 on a normal-session path before adding filler waves
        waveCountMax: 2, // Boss-every-level stays the anchor, not late-wave padding

        waveEnemyBase: 4, // Boss remains the level anchor
        waveEnemyPerLevel: 0.25, // Controlled count growth
        waveEnemyRandom: 1, // Reduced from 2
        waveEnemyMax: 12, // Prevent late-level filler walls
        waveDelayMs: 1050, // Briefing duration between normal waves
        waveBriefingAnnounceMs: 350,
        waveCleanupMs: 950,
        enemyEntryDurationMs: 1620,
        enemyEntryDelayBaseMs: 128,
        bossGateMs: 760,
        challengeWaveChance: 0.02,
        challengeWaveCount: 14,

        bossBaseHealth: 92,
        bossHealthPerLevel: 16,
        bossShootDelayBase: 28,
        bossShootDelayPhase2: 19,
        bossShootDelayPhase3: 14,
        bossProjectileSpeedPhase1: 2.95,
        bossProjectileSpeedPhase2: 3.3,
        bossProjectileSpeedPhase3: 3.65,

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
        sequenceDuration: 1500 // ms between boss clear and next sector
    }
};
