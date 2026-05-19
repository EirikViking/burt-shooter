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

        // Bonus core special powerup
        bonusCore: {
            spawnChance: 0.0005, // Very rare (approx 1 per 33 secs at 60fps unchecked, but logical checks apply)
            cooldown: 60000, // 60s global cooldown
            minTime: 20000, // No spawn in first 20s
            scoreBoostDuration: 10000, // 10s (8-12 avg)
            scoreMultiplier: 2
        }
    },

    // Difficulty: fast score-chaser tempo with boss pressure every level.
    difficulty: {
        // Global incoming-pressure scalar keeps faster progression readable.
        pressureScalar: 0.9,
        baseEnemyHealthMultiplier: 0.9, // Lower HP baseline
        hpScalePerLevel: 0.035, // Gentle HP growth so levels turn over briskly

        enemySpeedMultiplier: 0.88, // Lower global speed
        enemySpeedPerLevel: 0.01, // HALVED from 0.02 - much slower speed increase

        enemyFireDelayPerLevel: 0.02, // HALVED from 0.04 - slower fire rate increase
        enemyFireChance: 0.005, // Reduced from 0.006 - less frequent shooting
        enemyProjectileSpeed: 3.0, // Slower enemy bullets (from 3.2)

        waveCountBase: 2, // Fast score-chaser cadence: two focused waves, then boss
        waveCountPerLevel: 99, // Keep level 10 on a normal-session path before adding filler waves
        waveCountMax: 2, // Boss-every-level stays the anchor, not late-wave padding

        waveEnemyBase: 4, // Faster waves; boss remains the level anchor
        waveEnemyPerLevel: 0.25, // Controlled count growth
        waveEnemyRandom: 1, // Reduced from 2
        waveEnemyMax: 12, // Prevent late-level filler walls
        waveDelayMs: 950, // Briefing duration between normal waves
        waveBriefingAnnounceMs: 350,
        waveCleanupMs: 950,
        enemyEntryDurationMs: 1280,
        enemyEntryDelayBaseMs: 95,
        bossGateMs: 650,
        challengeWaveChance: 0.02,
        challengeWaveCount: 14,

        bossBaseHealth: 84,
        bossHealthPerLevel: 14,
        bossShootDelayBase: 30, // Fair first boss cadence
        bossShootDelayPhase2: 20, // Escalates without becoming instant bullet spam
        bossShootDelayPhase3: 15, // Still dangerous, but dodgeable
        bossProjectileSpeedPhase1: 3.4,
        bossProjectileSpeedPhase2: 3.8,
        bossProjectileSpeedPhase3: 4.2,

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
