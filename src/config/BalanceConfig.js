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
                    projectileSpeedMult: 1.014,
                    enemySpeedMult: 1.01,
                    tacticFireMult: 1.018,
                    tacticFireDelayMult: 0.994
                },
                {
                    id: 'early_movement_check',
                    minLevel: 3,
                    maxLevel: 5,
                    targetIncreaseRange: [0.15, 0.25],
                    fireChanceMult: 1.09,
                    projectileSpeedMult: 1.035,
                    enemySpeedMult: 1.026,
                    tacticFireMult: 1.075,
                    tacticFireDelayMult: 0.973,
                    multiEliteChanceMult: 1.2,
                    challengeChanceMult: 1.35,
                    challengeChanceBonus: 0.035,
                    challengeMinLevel: 5,
                    challengeFormation: 'SCREEN_DOOR',
                    challengeTactic: 'traffic_court',
                    dangerWaveCount: 1,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.14,
                    dangerWaveFireMult: 1.18,
                    dangerWaveFireDelayMult: 0.91,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.5,
                    threatInitialDelayMs: 520,
                    dangerWaveEliteMinLevel: 3,
                    dangerWaveEliteHealthScalar: 0.6,
                    dangerWaveEliteFireDelayMult: 1.08,
                    dangerWaveEliteSpecialDelayMs: 900,
                    diveBiasMult: 1.02,
                    entrySpeedMult: 0.94
                },
                {
                    id: 'early_kill_window',
                    minLevel: 6,
                    maxLevel: 10,
                    targetIncreaseRange: [0.25, 0.4],
                    fireChanceMult: 1.095,
                    projectileSpeedMult: 1.038,
                    enemySpeedMult: 1.028,
                    tacticFireMult: 1.075,
                    tacticFireDelayMult: 0.968,
                    challengeChanceMult: 1.55,
                    challengeChanceBonus: 0.045,
                    challengeWaveCountBonus: 1,
                    challengeFormation: 'CROSS_STREAM',
                    challengeTactic: 'lunar_turnpike',
                    multiEliteChanceMult: 1.18,
                    dangerWaveCount: 2,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.16,
                    dangerWaveFireMult: 1.2,
                    dangerWaveFireDelayMult: 0.9,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.46,
                    threatInitialDelayMs: 580,
                    dangerWaveEliteMinLevel: 5,
                    dangerWaveEliteHealthScalar: 0.68,
                    dangerWaveEliteFireDelayMult: 1.02,
                    dangerWaveEliteSpecialDelayMs: 780,
                    diveBiasMult: 1.05,
                    entrySpeedMult: 0.93
                },
                {
                    id: 'serious_run',
                    minLevel: 11,
                    maxLevel: 15,
                    targetIncreaseRange: [0.25, 0.45],
                    fireChanceMult: 1.095,
                    projectileSpeedMult: 1.038,
                    enemySpeedMult: 1.028,
                    tacticFireMult: 1.08,
                    tacticFireDelayMult: 0.965,
                    challengeChanceMult: 1.55,
                    challengeChanceBonus: 0.045,
                    challengeWaveCountBonus: 1,
                    challengeFormation: 'PINCER',
                    challengeTactic: 'mirror_zipper',
                    multiEliteChanceMult: 1.2,
                    dangerWaveCount: 2,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.15,
                    dangerWaveFireMult: 1.18,
                    dangerWaveFireDelayMult: 0.91,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.45,
                    threatInitialDelayMs: 620,
                    dangerWaveEliteMinLevel: 8,
                    dangerWaveEliteHealthScalar: 0.74,
                    dangerWaveEliteFireDelayMult: 0.96,
                    dangerWaveEliteSpecialDelayMs: 700,
                    diveBiasMult: 1.05,
                    entrySpeedMult: 0.93
                },
                {
                    id: 'early_late_bridge',
                    minLevel: 16,
                    maxLevel: 19,
                    targetIncreaseRange: [0.2, 0.35],
                    fireChanceMult: 1.09,
                    projectileSpeedMult: 1.038,
                    enemySpeedMult: 1.026,
                    tacticFireMult: 1.075,
                    tacticFireDelayMult: 0.968,
                    challengeChanceMult: 1.35,
                    challengeChanceBonus: 0.035,
                    challengeWaveCountBonus: 1,
                    challengeFormation: 'SIDEWINDER',
                    challengeTactic: 'sidewinder_choir',
                    multiEliteChanceMult: 1.18,
                    dangerWaveCount: 2,
                    dangerWaveCountBonus: 2,
                    dangerWaveCadenceMult: 1.12,
                    dangerWaveFireMult: 1.14,
                    dangerWaveFireDelayMult: 0.93,
                    dangerWaveThreatDangerBudgetBonus: 2,
                    dangerWaveThreatMaxActiveBonus: 1,
                    dangerWaveThreatPlannedActionBonus: 2,
                    threatInitialDelayMult: 0.48,
                    threatInitialDelayMs: 560,
                    dangerWaveEliteMinLevel: 10,
                    dangerWaveEliteHealthScalar: 0.78,
                    dangerWaveEliteFireDelayMult: 0.96,
                    dangerWaveEliteSpecialDelayMs: 720,
                    diveBiasMult: 1.04,
                    entrySpeedMult: 0.95
                },
                {
                    id: 'late_run_attrition',
                    minLevel: 20,
                    maxLevel: 29,
                    targetIncreaseRange: [0.08, 0.12],
                    fireChanceMult: 1.056,
                    projectileSpeedMult: 1.024,
                    enemySpeedMult: 1.018,
                    tacticFireMult: 1.032,
                    tacticFireDelayMult: 0.99,
                    challengeChanceMult: 1.15,
                    multiEliteChanceMult: 1.12
                },
                {
                    id: 'overrun_rising',
                    minLevel: 30,
                    maxLevel: 39,
                    targetIncreaseRange: [0.12, 0.16],
                    fireChanceMult: 1.048,
                    projectileSpeedMult: 1.022,
                    enemySpeedMult: 1.016,
                    tacticFireMult: 1.03,
                    tacticFireDelayMult: 0.992,
                    waveEnemyCountBonus: 1,
                    waveEnemyMaxBonus: 1,
                    challengeChanceMult: 1.35,
                    multiEliteChanceMult: 1.18,
                    eliteSecondSlotChance: 0.42,
                    threatDangerBudgetBonus: 1
                },
                {
                    id: 'overrun_plateau_break',
                    minLevel: 40,
                    maxLevel: 49,
                    targetIncreaseRange: [0.16, 0.22],
                    fireChanceMult: 1.064,
                    projectileSpeedMult: 1.028,
                    enemySpeedMult: 1.022,
                    tacticFireMult: 1.044,
                    tacticFireDelayMult: 0.99,
                    waveEnemyCountBonus: 1,
                    waveEnemyMaxBonus: 2,
                    challengeChanceMult: 1.55,
                    multiEliteChanceMult: 1.28,
                    eliteSecondSlotChance: 0.78,
                    threatDangerBudgetBonus: 1
                },
                {
                    id: 'deep_overrun',
                    minLevel: 50,
                    maxLevel: 999,
                    targetIncreaseRange: [0.26, 0.38],
                    fireChanceMult: 1.18,
                    projectileSpeedMult: 1.08,
                    enemySpeedMult: 1.06,
                    tacticFireMult: 1.1,
                    tacticFireDelayMult: 0.956,
                    waveCountBonus: 1,
                    waveEnemyCountBonus: 2,
                    waveEnemyMaxBonus: 3,
                    challengeChanceMult: 2.2,
                    challengeWaveCountBonus: 2,
                    multiEliteChanceMult: 1.65,
                    multiEliteTriChance: 0.22,
                    eliteSecondSlotChance: 0.94,
                    threatDangerBudgetBonus: 2,
                    threatMaxActiveBonus: 1,
                    threatPlannedActionBonus: 1,
                    diveBiasMult: 1.06,
                    entrySpeedMult: 0.96
                }
            ]
        },

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

const DEFAULT_NORMAL_WAVE_PRESSURE_TUNING = Object.freeze({
    id: 'baseline',
    targetIncreaseRange: [0, 0],
    fireChanceMult: 1,
    projectileSpeedMult: 1,
    enemySpeedMult: 1,
    tacticFireMult: 1,
    tacticFireDelayMult: 1,
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
