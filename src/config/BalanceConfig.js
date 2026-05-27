export const MAX_PLAYER_LIVES = 6;

export const BalanceConfig = {
    // Global pressure trim: below 1 keeps Nova Swarm readable while the wave count rises.
    DIFFICULTY_MULTIPLIER: 0.88,

    // Rank System
    ranks: {
        NUM_RANKS: 20,
        MAX_RANK_INDEX: 19
    },

    // Powerups
    powerups: {
        dropChance: 0.018, // Base enemy-drop chance; kept sparse so pickups feel intentional
        chanceGrowthPerSecond: 0.0014,
        maxDropChance: 0.08,
        cooldownMs: 18000,
        maxPerLevel: 2,
        minPerLevel: 1,
        extraLifeDropsEnabled: true,
        extraLifeChance: 0.03,
        extraLifeGuaranteedEveryLevels: 0,
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

    // Difficulty: six-wave early sectors, then a steady linear climb.
    difficulty: {
        pressureScalar: 0.85,
        earlyLevelDifficultyBoost: {
            maxLevel: 5,
            scalar: 1.27
        },
        baseEnemyHealthMultiplier: 0.62,
        hpScalePerLevel: 0.035,
        enemyHealthMaxMultiplier: 1.8,

        enemySpeedMultiplier: 0.78,
        enemySpeedPerLevel: 0.011,
        enemySpeedMaxMultiplier: 1.08,

        enemyFireDelayMultiplier: 1.32,
        enemyFireDelayPerLevel: -0.012,
        enemyFireDelayMinMultiplier: 0.9,
        enemyFireChance: 0.0042,
        enemyFireChancePerLevel: 0.00022,
        enemyFireChanceMax: 0.0095,
        enemyProjectileSpeed: 1.65,
        enemyProjectileSpeedPerLevel: 0.05,
        enemyProjectileSpeedMax: 2.55,

        MIN_WAVES_BETWEEN_BOSSES: 6,
        MIN_SECONDS_BETWEEN_BOSSES: 0,
        bossIntervalCatchupWaveMax: 0,
        wavesPerBossBase: 6,
        wavesPerBossPerLevel: 0.03,
        wavesPerBossMax: 7,
        bossTargetIntervalSeconds: { earlyMin: 60, earlyMax: 90 },
        estimatedWaveSeconds: 18,

        earlyWaveEnemyCounts: {
            1: [8, 9, 10, 10, 11, 12],
            2: [9, 10, 10, 11, 12, 13],
            3: [9, 10, 11, 12, 13, 13],
            4: [10, 11, 12, 13, 13, 14],
            5: [11, 12, 13, 13, 14, 15]
        },
        waveEnemyBase: 7,
        waveEnemyPerLevel: 0.35,
        waveEnemyPerWave: 0.45,
        waveEnemyRandom: 2,
        waveEnemyMax: 18,
        waveDelayMs: 660,
        waveBriefingAnnounceMs: 220,
        waveCleanupMs: 560,
        enemyEntryDurationMs: 1240,
        enemyEntryDelayBaseMs: 118,
        bossGateMs: 950,
        challengeWaveChance: 0.015,
        challengeWaveCount: 8,

        bossBaseHealth: 40,
        bossHealthPerLevel: 3.6,
        bossMinHealth: 44,
        bossPostFirstDifficultyStartsAt: 2,
        bossPostFirstDifficultyScalar: 0.8,
        bossShootDelayBase: 46,
        bossShootDelayPhase2: 42,
        bossShootDelayPhase3: 38,
        bossProjectileSpeedPhase1: 1.45,
        bossProjectileSpeedPhase2: 1.52,
        bossProjectileSpeedPhase3: 1.68,
        bossProjectileSpeedPerLevel: 0.022,
        bossProjectileSpeedMax: 2.8,

        bossFairness: {
            signatureTelegraphMs: 1240,
            signatureRingTelegraphMs: 1340,
            regularTelegraphEarlyMs: 1040,
            regularTelegraphMidMs: 960,
            regularTelegraphLateMs: 900,
            netSpeedMultiplier: 0.8,
            beamSpeedMultiplier: 0.78,
            wallSpeedMultiplier: 0.74,
            ringSafeWedgeEarly: 0.58,
            ringSafeWedge: 0.6,
            regularRingSafeWedge: 0.6,
            beamHazardRadius: 11,
            coneHazardRadius: 23,
            hazardArmingMs: 320
        },

        precisionPenalty: true, // If true, reduced score for missed shots (concept)
        sprayInefficiency: 0.8 // Damage multiplier if shooting blindly (concept, maybe skip to keep simple)
    },

    rewards: {
        waveClearScoreBase: 500,
        levelClearScore: 1000,
        waveClearRepairTargetLives: 0,
        levelClearRepairTargetLives: 0,
        bossClearRepairLives: 1,
        bossClearRepairMaxLives: 3,
        bossClearRepairInvulnerabilityMs: 1000,
        repairInvulnerabilityMs: 0
    },

    survival: {
        maxLives: MAX_PLAYER_LIVES,
        lastStandRepairEnabled: false
    },

    bossMercy: {
        enabled: true,
        maxProtectedLevel: 10,
        earlyCooldownMs: 7000,
        lateCooldownMs: 5000,
        minimumCooldownMs: 2500,
        levelReductionMs: 250,
        contactPushbackPx: 72,
        blockedHitFeedbackCooldownMs: 600
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
