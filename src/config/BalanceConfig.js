export const MAX_PLAYER_LIVES = Number.POSITIVE_INFINITY;

export const BalanceConfig = {
    // Global pressure trim: below 1 keeps Nova Swarm readable while the wave count rises.
    DIFFICULTY_MULTIPLIER: 0.7524,

    // Rank System
    ranks: {
        NUM_RANKS: 40,
        MAX_RANK_INDEX: 39
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
        extraLifeChance: 0.06,
        superExtraLifeChance: 0.012,
        extraLifeGuaranteedEveryLevels: 8,
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
        pressureScalar: 0.72675,
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
        enemyProjectileSpeedPerLevel: 0.056,
        enemyProjectileSpeedMax: 2.95,

        MIN_WAVES_BETWEEN_BOSSES: 5,
        MIN_SECONDS_BETWEEN_BOSSES: 0,
        bossIntervalCatchupWaveMax: 0,
        wavesPerBossBase: 5,
        wavesPerBossPerLevel: 0.03,
        wavesPerBossMax: 7,
        bossTargetIntervalSeconds: { earlyMin: 60, earlyMax: 90 },
        estimatedWaveSeconds: 18,
        normalWaveDifficultyLevelOffset: 7,

        earlyWaveEnemyCounts: {
            1: [6, 7, 8, 8, 8, 9],
            2: [7, 8, 8, 9, 9, 10],
            3: [7, 8, 9, 9, 10, 10],
            4: [8, 9, 9, 10, 10, 11]
        },
        waveEnemyBase: 7,
        waveEnemyPerLevel: 0.35,
        waveEnemyPerWave: 0.45,
        waveEnemyRandom: 2,
        waveEnemyMax: 14,
        waveDelayMs: 740,
        waveBriefingAnnounceMs: 260,
        waveCleanupMs: 680,
        enemyEntryDurationMs: 1460,
        enemyEntryDelayBaseMs: 150,
        mayhemReinforcements: {
            enabled: true,
            chance: 0.20,
            bossFightChance: 0.20,
            bossFightMinAgeMs: 3500,
            bossFightCheckIntervalMs: 2600,
            bossFightCooldownMs: 9000,
            bossFightMaxEvents: 2,
            doubleWaveChance: 0.16,
            tripleWaveChance: 0.10,
            doubleWaveMinLevel: 8,
            doubleWaveRequiresPriorReinforcement: false,
            normalMinWaveCount: 3,
            normalMaxWaveCount: 3,
            normalMaxWaveChance: 0,
            normalMultiWaveMinLevel: 8,
            superStormChance: 0.05,
            superStormWaveCount: 3,
            superStormMinLevel: 8,
            superStormFirstPityMinLevel: 12,
            superStormFirstPityMaxLevel: 18,
            superStormFirstPityEligibleMisses: 16,
            superStormWarningMs: 2600,
            superStormEntryDelayMs: 220,
            superStormLaneOffsetPx: 58,
            reinforcementScoreMultiplier: 1.25,
            bossReinforcementScoreMultiplier: 1.35,
            firstPityEligibleMisses: 12,
            firstPityMinLevel: 8,
            firstPityMaxLevel: 10,
            repeatPityEligibleMisses: 18,
            minWaveAgeMs: 3600,
            minClearRatio: 0.32,
            maxActiveEnemies: 10,
            maxActiveEnemyBullets: 26,
            pityMinWaveAgeMs: 3200,
            pityMinClearRatio: 0.25,
            pityMaxActiveEnemies: 12,
            pityMaxActiveEnemyBullets: 30,
            warningMs: 2000,
            minNextWaveIndex: 1
        },
        bossGateMs: 950,
        challengeWaveChance: 0.015,
        challengeWaveCount: 8,
        normalWavePressureLadder: {
            bands: [
                {
                    id: 'opening_readable',
                    minLevel: 1,
                    maxLevel: 2,
                    targetIncreaseRange: [0.05, 0.075],
                    fireChanceMult: 1.032,
                    projectileSpeedMult: 1.018,
                    enemySpeedMult: 1.01,
                    tacticFireMult: 1.018,
                    tacticFireDelayMult: 0.994
                },
                {
                    id: 'early_movement_check',
                    minLevel: 3,
                    maxLevel: 5,
                    targetIncreaseRange: [0.15, 0.25],
                    fireChanceMult: 1.19,
                    projectileSpeedMult: 1.215,
                    enemySpeedMult: 1.032,
                    tacticFireMult: 1.16,
                    tacticFireDelayMult: 0.922,
                    multiEliteChanceMult: 1.2,
                    challengeChanceMult: 1.42,
                    challengeChanceBonus: 0.037,
                    challengeMinLevel: 5,
                    challengeFormation: 'SCREEN_DOOR',
                    challengeTactic: 'traffic_court',
                    dangerWaveCount: 1,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.155,
                    dangerWaveFireMult: 1.285,
                    dangerWaveFireDelayMult: 0.86,
                    dangerWaveProjectileSpeedMult: 1.17,
                    threatProjectileSpeedMult: 1.135,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.42,
                    threatInitialDelayMs: 700,
                    dangerWaveEliteMinLevel: 3,
                    dangerWaveEliteHealthScalar: 0.6,
                    dangerWaveEliteFireDelayMult: 1.08,
                    dangerWaveEliteSpecialDelayMs: 860,
                    diveBiasMult: 1.02,
                    entrySpeedMult: 0.94
                },
                {
                    id: 'early_kill_window',
                    minLevel: 6,
                    maxLevel: 10,
                    targetIncreaseRange: [0.25, 0.4],
                    fireChanceMult: 1.255,
                    projectileSpeedMult: 1.43,
                    enemySpeedMult: 1.045,
                    tacticFireMult: 1.245,
                    tacticFireDelayMult: 0.885,
                    challengeChanceMult: 1.68,
                    challengeChanceBonus: 0.05,
                    challengeWaveCountBonus: 1,
                    challengeFormation: 'CROSS_STREAM',
                    challengeTactic: 'lunar_turnpike',
                    multiEliteChanceMult: 1.18,
                    dangerWaveCount: 2,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.19,
                    dangerWaveFireMult: 1.375,
                    dangerWaveFireDelayMult: 0.83,
                    dangerWaveProjectileSpeedMult: 1.255,
                    threatProjectileSpeedMult: 1.24,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.37,
                    threatInitialDelayMs: 805,
                    dangerWaveEliteMinLevel: 5,
                    dangerWaveEliteHealthScalar: 0.68,
                    dangerWaveEliteFireDelayMult: 0.98,
                    dangerWaveEliteSpecialDelayMs: 700,
                    diveBiasMult: 1.05,
                    entrySpeedMult: 0.93
                },
                {
                    id: 'serious_run',
                    minLevel: 11,
                    maxLevel: 15,
                    targetIncreaseRange: [0.25, 0.45],
                    fireChanceMult: 1.225,
                    projectileSpeedMult: 1.455,
                    enemySpeedMult: 1.05,
                    tacticFireMult: 1.21,
                    tacticFireDelayMult: 0.905,
                    challengeChanceMult: 1.63,
                    challengeChanceBonus: 0.048,
                    challengeWaveCountBonus: 1,
                    challengeFormation: 'PINCER',
                    challengeTactic: 'mirror_zipper',
                    multiEliteChanceMult: 1.2,
                    dangerWaveCount: 3,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.19,
                    dangerWaveFireMult: 1.325,
                    dangerWaveFireDelayMult: 0.852,
                    dangerWaveProjectileSpeedMult: 1.195,
                    threatProjectileSpeedMult: 1.195,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.375,
                    threatInitialDelayMs: 805,
                    dangerWaveEliteMinLevel: 8,
                    dangerWaveEliteHealthScalar: 0.74,
                    dangerWaveEliteFireDelayMult: 0.94,
                    dangerWaveEliteSpecialDelayMs: 660,
                    diveBiasMult: 1.05,
                    entrySpeedMult: 0.93
                },
                {
                    id: 'early_late_bridge',
                    minLevel: 16,
                    maxLevel: 19,
                    targetIncreaseRange: [0.2, 0.35],
                    fireChanceMult: 1.267,
                    projectileSpeedMult: 1.59,
                    enemySpeedMult: 1.055,
                    tacticFireMult: 1.238,
                    tacticFireDelayMult: 0.89,
                    challengeChanceMult: 1.48,
                    challengeChanceBonus: 0.04,
                    challengeWaveCountBonus: 1,
                    challengeFormation: 'SIDEWINDER',
                    challengeTactic: 'sidewinder_choir',
                    multiEliteChanceMult: 1.18,
                    dangerWaveCount: 3,
                    dangerWaveCountBonus: 3,
                    dangerWaveCadenceMult: 1.2,
                    dangerWaveFireMult: 1.345,
                    dangerWaveFireDelayMult: 0.846,
                    dangerWaveProjectileSpeedMult: 1.215,
                    threatProjectileSpeedMult: 1.215,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 3,
                    threatInitialDelayMult: 0.355,
                    threatInitialDelayMs: 840,
                    dangerWaveEliteMinLevel: 10,
                    dangerWaveEliteHealthScalar: 0.82,
                    dangerWaveEliteFireDelayMult: 0.92,
                    dangerWaveEliteSpecialDelayMs: 640,
                    diveBiasMult: 1.04,
                    entrySpeedMult: 0.94
                },
                {
                    id: 'sector_twenty_gate',
                    minLevel: 20,
                    maxLevel: 20,
                    targetIncreaseRange: [0.1, 0.18],
                    fireChanceMult: 1.306,
                    projectileSpeedMult: 1.69,
                    enemySpeedMult: 1.06,
                    tacticFireMult: 1.248,
                    tacticFireDelayMult: 0.88,
                    waveEnemyCountBonus: 1,
                    waveEnemyMaxBonus: 1,
                    challengeChanceMult: 1.65,
                    challengeWaveCountBonus: 1,
                    multiEliteChanceMult: 1.34,
                    eliteSecondSlotChance: 0.42,
                    threatDangerBudgetBonus: 3,
                    threatMaxActiveBonus: 1,
                    threatPlannedActionBonus: 2,
                    dangerWaveCount: 3,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.19,
                    dangerWaveFireMult: 1.335,
                    dangerWaveFireDelayMult: 0.846,
                    dangerWaveProjectileSpeedMult: 1.215,
                    threatProjectileSpeedMult: 1.215,
                    dangerWaveThreatDangerBudgetBonus: 3,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 3,
                    threatInitialDelayMult: 0.35,
                    threatInitialDelayMs: 840,
                    dangerWaveEliteMinLevel: 15,
                    dangerWaveEliteHealthScalar: 0.84,
                    dangerWaveEliteFireDelayMult: 0.9,
                    dangerWaveEliteSpecialDelayMs: 620,
                    diveBiasMult: 1.06,
                    entrySpeedMult: 0.93
                },
                {
                    id: 'late_run_attrition',
                    minLevel: 21,
                    maxLevel: 29,
                    targetIncreaseRange: [0.08, 0.12],
                    fireChanceMult: 1.22,
                    projectileSpeedMult: 1.58,
                    enemySpeedMult: 1.055,
                    tacticFireMult: 1.18,
                    tacticFireDelayMult: 0.92,
                    waveEnemyCountBonus: 1,
                    waveEnemyMaxBonus: 1,
                    challengeChanceMult: 1.55,
                    challengeWaveCountBonus: 1,
                    multiEliteChanceMult: 1.28,
                    eliteSecondSlotChance: 0.34,
                    threatDangerBudgetBonus: 2,
                    threatMaxActiveBonus: 1,
                    threatPlannedActionBonus: 1,
                    dangerWaveCount: 3,
                    dangerWaveCountBonus: 1,
                    dangerWaveCadenceMult: 1.16,
                    dangerWaveFireMult: 1.22,
                    dangerWaveFireDelayMult: 0.9,
                    dangerWaveProjectileSpeedMult: 1.16,
                    threatProjectileSpeedMult: 1.15,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.4,
                    threatInitialDelayMs: 620,
                    dangerWaveEliteMinLevel: 15,
                    dangerWaveEliteHealthScalar: 0.82,
                    dangerWaveEliteFireDelayMult: 0.92,
                    dangerWaveEliteSpecialDelayMs: 650,
                    diveBiasMult: 1.05,
                    entrySpeedMult: 0.94
                },
                {
                    id: 'overrun_rising',
                    minLevel: 30,
                    maxLevel: 39,
                    targetIncreaseRange: [0.12, 0.16],
                    fireChanceMult: 1.26,
                    projectileSpeedMult: 1.7,
                    enemySpeedMult: 1.065,
                    tacticFireMult: 1.21,
                    tacticFireDelayMult: 0.91,
                    waveEnemyCountBonus: 2,
                    waveEnemyMaxBonus: 2,
                    challengeChanceMult: 1.75,
                    challengeWaveCountBonus: 1,
                    multiEliteChanceMult: 1.4,
                    eliteSecondSlotChance: 0.6,
                    threatDangerBudgetBonus: 2,
                    threatMaxActiveBonus: 1,
                    threatPlannedActionBonus: 1,
                    dangerWaveCount: 3,
                    dangerWaveCountBonus: 1,
                    dangerWaveCadenceMult: 1.18,
                    dangerWaveFireMult: 1.24,
                    dangerWaveFireDelayMult: 0.89,
                    dangerWaveProjectileSpeedMult: 1.17,
                    threatProjectileSpeedMult: 1.16,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.38,
                    threatInitialDelayMs: 660,
                    dangerWaveEliteMinLevel: 18,
                    dangerWaveEliteHealthScalar: 0.86,
                    dangerWaveEliteFireDelayMult: 0.9,
                    dangerWaveEliteSpecialDelayMs: 620,
                    diveBiasMult: 1.06,
                    entrySpeedMult: 0.93
                },
                {
                    id: 'overrun_plateau_break',
                    minLevel: 40,
                    maxLevel: 49,
                    targetIncreaseRange: [0.16, 0.22],
                    fireChanceMult: 1.32,
                    projectileSpeedMult: 1.84,
                    enemySpeedMult: 1.075,
                    tacticFireMult: 1.26,
                    tacticFireDelayMult: 0.89,
                    waveCountBonus: 1,
                    waveEnemyCountBonus: 2,
                    waveEnemyMaxBonus: 3,
                    challengeChanceMult: 2,
                    challengeWaveCountBonus: 2,
                    multiEliteChanceMult: 1.55,
                    multiEliteTriChance: 0.14,
                    eliteSecondSlotChance: 0.86,
                    threatDangerBudgetBonus: 3,
                    threatMaxActiveBonus: 1,
                    threatPlannedActionBonus: 2,
                    dangerWaveCount: 3,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.2,
                    dangerWaveFireMult: 1.26,
                    dangerWaveFireDelayMult: 0.88,
                    dangerWaveProjectileSpeedMult: 1.18,
                    threatProjectileSpeedMult: 1.17,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.36,
                    threatInitialDelayMs: 700,
                    dangerWaveEliteMinLevel: 20,
                    dangerWaveEliteHealthScalar: 0.9,
                    dangerWaveEliteFireDelayMult: 0.88,
                    dangerWaveEliteSpecialDelayMs: 580,
                    diveBiasMult: 1.08,
                    entrySpeedMult: 0.92
                },
                {
                    id: 'deep_overrun',
                    minLevel: 50,
                    maxLevel: 999,
                    targetIncreaseRange: [0.26, 0.38],
                    fireChanceMult: 1.36,
                    projectileSpeedMult: 1.95,
                    enemySpeedMult: 1.09,
                    tacticFireMult: 1.28,
                    tacticFireDelayMult: 0.88,
                    waveCountBonus: 1,
                    waveEnemyCountBonus: 2,
                    waveEnemyMaxBonus: 3,
                    challengeChanceMult: 2.2,
                    challengeWaveCountBonus: 2,
                    multiEliteChanceMult: 1.65,
                    multiEliteTriChance: 0.22,
                    eliteSecondSlotChance: 0.94,
                    threatDangerBudgetBonus: 3,
                    threatMaxActiveBonus: 1,
                    threatPlannedActionBonus: 2,
                    dangerWaveCount: 3,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.2,
                    dangerWaveFireMult: 1.26,
                    dangerWaveFireDelayMult: 0.88,
                    dangerWaveProjectileSpeedMult: 1.18,
                    threatProjectileSpeedMult: 1.17,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.36,
                    threatInitialDelayMs: 700,
                    dangerWaveEliteMinLevel: 20,
                    dangerWaveEliteHealthScalar: 0.92,
                    dangerWaveEliteFireDelayMult: 0.86,
                    dangerWaveEliteSpecialDelayMs: 560,
                    diveBiasMult: 1.08,
                    entrySpeedMult: 0.92
                }
            ]
        },

        bossBaseHealth: 40,
        bossHealthPerLevel: 3.6,
        bossMinHealth: 44,
        bossEarlyDifficultyMaxLevel: 11,
        bossEarlyDifficultyScalar: 0.9,
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
            signatureTelegraphEarlyMs: 1360,
            signatureRingTelegraphMs: 1340,
            signatureRingTelegraphEarlyMs: 1500,
            regularTelegraphEarlyMs: 1120,
            regularTelegraphMidMs: 960,
            regularTelegraphLateMs: 900,
            netSpeedMultiplier: 0.8,
            beamSpeedMultiplier: 0.78,
            wallSpeedMultiplier: 0.74,
            ringSafeWedgeEarly: 0.74,
            ringSafeWedge: 0.6,
            regularRingSafeWedge: 0.6,
            contactRadiusScalarEarly: 0.5,
            contactRadiusScalar: 0.62,
            beamHazardRadius: 11,
            coneHazardRadius: 23,
            hazardArmingMs: 320,
            profileRelief: {
                nova_boss_02: {
                    maxLevel: 2,
                    pressureScalarMult: 0.82,
                    openingAttackDelayMs: 2200,
                    regularAttackIntervalMult: 1.25,
                    regularTelegraphMult: 1.22,
                    signatureTelegraphMult: 1.18,
                    ringSafeWedgeBonus: 0.16,
                    burstShotsPhase2: 3,
                    burstShotsPhase3: 4
                },
                nova_boss_09: {
                    maxLevel: 9,
                    pressureScalarMult: 0.94,
                    openingAttackDelayMs: 1900,
                    regularAttackIntervalMult: 1.05,
                    regularTelegraphMult: 1.08,
                    signatureTelegraphMult: 1.06
                },
                nova_boss_15: {
                    maxLevel: 15,
                    pressureScalarMult: 0.94,
                    openingAttackDelayMs: 1850,
                    regularAttackIntervalMult: 1.04,
                    regularTelegraphMult: 1.07,
                    signatureTelegraphMult: 1.06,
                    ringSafeWedgeBonus: 0.04
                },
                nova_boss_18: {
                    maxLevel: 18,
                    pressureScalarMult: 0.95,
                    openingAttackDelayMs: 1850,
                    regularAttackIntervalMult: 1.04,
                    regularTelegraphMult: 1.06,
                    signatureTelegraphMult: 1.06,
                    ringSafeWedgeBonus: 0.04
                },
                nova_boss_19: {
                    maxLevel: 19,
                    pressureScalarMult: 0.92,
                    openingAttackDelayMs: 1950,
                    regularAttackIntervalMult: 1.05,
                    regularTelegraphMult: 1.08,
                    signatureTelegraphMult: 1.06
                },
                nova_boss_22: {
                    maxLevel: 22,
                    pressureScalarMult: 0.86,
                    openingAttackDelayMs: 2050,
                    regularAttackIntervalMult: 1.12,
                    regularTelegraphMult: 1.1,
                    signatureTelegraphMult: 1.1,
                    ringSafeWedgeBonus: 0.08,
                    burstShotsPhase2: 4,
                    burstShotsPhase3: 4
                }
            }
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
        blockedHitFeedbackCooldownMs: 600,
        lifeLossCap: {
            enabled: true,
            maxLives: 2,
            windowMs: 7000,
            fullWindowThroughLevel: 30,
            windowReductionMsPerLevel: 100,
            minimumWindowMs: 4000
        },
        wipeoutGuard: {
            enabled: true,
            recentDeathWindowMs: 14000,
            secondDeathRecoveryMs: 8500,
            thirdDeathRecoveryMs: 11500,
            thirdDeathControlMs: 10000,
            attackRunwayMs: 1800,
            secondDeathAttackRunwayMs: 3200,
            thirdDeathAttackRunwayMs: 4800,
            clearBossHazardsOnDeath: true
        }
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

const DEFAULT_NORMAL_WAVE_PRESSURE_TUNING = Object.freeze({
    id: 'baseline',
    targetIncreaseRange: [0, 0],
    fireChanceMult: 1,
    projectileSpeedMult: 1,
    enemySpeedMult: 1,
    tacticFireMult: 1,
    tacticFireDelayMult: 1,
    threatProjectileSpeedMult: 1,
    waveCountBonus: 0,
    waveEnemyCountBonus: 0,
    waveEnemyMaxBonus: 0,
    challengeChanceMult: 1,
    challengeChanceBonus: 0,
    challengeMinLevel: 1,
    challengeFormation: null,
    challengeTactic: null,
    challengeWaveCountBonus: 0,
    multiEliteChanceMult: 1,
    multiEliteTriChance: 0,
    eliteSecondSlotChance: null,
    threatDangerBudgetBonus: 0,
    threatMaxActiveBonus: 0,
    threatPlannedActionBonus: 0,
    diveBiasMult: 1,
    entrySpeedMult: 1,
    dangerWaveCount: 0,
    dangerWaveCountBonus: 0,
    dangerWaveCadenceMult: 1,
    dangerWaveFireMult: 1,
    dangerWaveFireDelayMult: 1,
    dangerWaveProjectileSpeedMult: 1,
    dangerWaveDiveBiasMult: 1,
    dangerWaveEntrySpeedMult: 1,
    dangerWaveThreatDangerBudgetBonus: 0,
    dangerWaveThreatMaxActiveBonus: 0,
    dangerWaveThreatPlannedActionBonus: 0,
    dangerWaveEliteMinLevel: 0,
    dangerWaveEliteHealthScalar: 1,
    dangerWaveEliteFireDelayMult: 1,
    dangerWaveEliteSpecialDelayMs: 0,
    threatInitialDelayMult: 1,
    threatInitialDelayMs: 0,
    forcedThreatActionIds: []
});

const NORMAL_WAVE_DANGER_PATTERNS = Object.freeze([
    { minLevel: 3, formation: 'DIAGONAL_RAID', tactic: 'dive_chain', entry: 'split', eliteId: 'nova_elite_tractor_puller', threatActionIds: ['brake_dash_bolt', 'crossfire_pair'] },
    { minLevel: 4, formation: 'PINCER', tactic: 'crossfire_pincer', entry: 'alternating', eliteId: 'nova_elite_tractor_puller', threatActionIds: ['lane_cutter', 'crossfire_pair'] },
    { minLevel: 5, formation: 'SCREEN_DOOR', tactic: 'traffic_court', entry: 'split', eliteId: 'nova_elite_shield_projector', threatActionIds: ['mine_drop', 'lane_cutter', 'crossfire_pair'] },
    { minLevel: 6, formation: 'CROSS_STREAM', tactic: 'lunar_turnpike', entry: 'alternating', eliteId: 'nova_elite_shield_projector', threatActionIds: ['telegraph_rail_lance', 'crossfire_pair', 'brake_dash_bolt'] },
    { minLevel: 8, formation: 'PINCER', tactic: 'forklift_lattice', entry: 'split', eliteId: 'nova_elite_drone_carrier', threatActionIds: ['shotgun_fan_feint', 'lane_cutter', 'crossfire_pair'] },
    { minLevel: 9, formation: 'ORBIT_RING', tactic: 'comet_queue', entry: 'single', eliteId: 'nova_elite_drone_carrier', threatActionIds: ['orbiting_satellites', 'splitter_seed', 'pulse_ring_bloom'] },
    { minLevel: 10, formation: 'SCREEN_DOOR', tactic: 'weave_wall', entry: 'alternating', eliteId: 'nova_elite_mine_layer', threatActionIds: ['mine_drop', 'orbiting_satellites', 'lane_cutter'] },
    { minLevel: 11, formation: 'PINCER', tactic: 'mirror_zipper', entry: 'split', eliteId: 'nova_elite_sniper_rail', threatActionIds: ['shotgun_fan_feint', 'lane_cutter', 'boomerang_crescent'] },
    { minLevel: 15, formation: 'SIDEWINDER', tactic: 'sidewinder_choir', entry: 'alternating', eliteId: 'nova_elite_jammer_disruptor', threatActionIds: ['boomerang_crescent', 'shotgun_fan_feint', 'brake_dash_bolt'] }
]);

export function getNormalWavePressureTuning(level = 1) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const bands = BalanceConfig.difficulty?.normalWavePressureLadder?.bands || [];
    const band = bands.find((entry) =>
        safeLevel >= (Number(entry.minLevel) || 1) &&
        safeLevel <= (Number(entry.maxLevel) || Number.POSITIVE_INFINITY)
    ) || {};
    return {
        ...DEFAULT_NORMAL_WAVE_PRESSURE_TUNING,
        ...band,
        level: safeLevel
    };
}

export function getNormalWaveDifficultyLevel(level = 1) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const offset = Math.max(0, Math.floor(Number(BalanceConfig.difficulty?.normalWaveDifficultyLevelOffset) || 0));
    return safeLevel + offset;
}

export function getNormalWaveDangerMoment(level = 1, waveIndex = 0, waveCount = 0) {
    const tuning = getNormalWavePressureTuning(level);
    const dangerWaveCount = Math.max(0, Math.floor(Number(tuning.dangerWaveCount) || 0));
    const totalWaves = Math.max(1, Math.floor(Number(waveCount) || 1));
    const safeWaveIndex = Math.max(0, Math.floor(Number(waveIndex) || 0));
    if (dangerWaveCount <= 0 || totalWaves < 3) return null;

    const maxThreatIndex = Math.max(1, totalWaves - 2);
    const candidates = [
        Math.min(maxThreatIndex, Math.max(1, Math.round(totalWaves * 0.55))),
        Math.min(maxThreatIndex, Math.max(2, Math.round(totalWaves * 0.78))),
        Math.min(maxThreatIndex, Math.max(1, Math.round(totalWaves * 0.35)))
    ];
    const indices = [...new Set(candidates)].slice(0, dangerWaveCount);
    const dangerSlot = indices.indexOf(safeWaveIndex);
    if (dangerSlot < 0) return null;

    const patternPool = NORMAL_WAVE_DANGER_PATTERNS.filter((pattern) => pattern.minLevel <= tuning.level);
    const pattern = patternPool[
        Math.abs((tuning.level * 5 + safeWaveIndex * 3 + dangerSlot * 11) % Math.max(1, patternPool.length))
    ] || NORMAL_WAVE_DANGER_PATTERNS[0];

    return {
        id: `${tuning.id}_danger_${dangerSlot + 1}`,
        bandId: tuning.id,
        dangerSlot,
        waveIndex: safeWaveIndex,
        formation: pattern.formation,
        tactic: pattern.tactic,
        entry: pattern.entry,
        countBonus: Number(tuning.dangerWaveCountBonus) || 0,
        cadenceMult: tuning.dangerWaveCadenceMult || 1,
        fireMult: tuning.dangerWaveFireMult || 1,
        fireDelayMult: tuning.dangerWaveFireDelayMult || 1,
        projectileSpeedMult: tuning.dangerWaveProjectileSpeedMult || 1,
        threatProjectileSpeedMult: tuning.dangerWaveThreatProjectileSpeedMult || tuning.dangerWaveProjectileSpeedMult || 1,
        diveBiasMult: tuning.dangerWaveDiveBiasMult || 1,
        entrySpeedMult: tuning.dangerWaveEntrySpeedMult || 1,
        threatDangerBudgetBonus: Number(tuning.dangerWaveThreatDangerBudgetBonus) || 0,
        threatMaxActiveBonus: Number(tuning.dangerWaveThreatMaxActiveBonus) || 0,
        threatPlannedActionBonus: Number(tuning.dangerWaveThreatPlannedActionBonus) || 0,
        eliteMiddleShipId: tuning.level >= (Number(tuning.dangerWaveEliteMinLevel) || Number.POSITIVE_INFINITY)
            ? pattern.eliteId
            : null,
        eliteHealthScalar: tuning.dangerWaveEliteHealthScalar || 1,
        eliteFireDelayMult: tuning.dangerWaveEliteFireDelayMult || 1,
        eliteSpecialDelayMs: Number(tuning.dangerWaveEliteSpecialDelayMs) || 0,
        threatInitialDelayMult: tuning.threatInitialDelayMult || 1,
        threatInitialDelayMs: Number(tuning.threatInitialDelayMs) || 0,
        forcedThreatActionIds: pattern.threatActionIds || tuning.forcedThreatActionIds || []
    };
}
