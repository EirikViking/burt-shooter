export const RunPacingConfig = {
  enabled: true,
  contentDirectorEnabled: true,
  threatCodexEnabled: true,
  shipUnlockProgressionEnabled: true,
  pilotRankProgressionEnabled: true,
  enemyThreatActionsEnabled: true,

  targetRunSeconds: 1500,
  targetRunMinutesRange: [24, 30],
  softClimaxSeconds: 1200,
  finalClimaxSeconds: 1500,
  intendedGoodPlayerClearSeconds: 1500,
  targetSectors: 10,
  sectorTargetSeconds: 150,
  postTargetEscalationEnabled: true,
  currentRunLabel: 'Arcade Run',

  pressurePhases: [
    {
      atSeconds: 0,
      label: 'opening',
      fireChanceMult: 1.00,
      projectileSpeedMult: 1.00,
      enemySpeedMult: 1.00,
      eliteChanceMult: 1.00,
      specialThreatMult: 1.00,
      sustainMult: 1.00,
      scoreMult: 1.00,
      contentRarityMult: 1.00
    },
    {
      atSeconds: 300,
      label: 'first_pressure',
      fireChanceMult: 1.15,
      projectileSpeedMult: 1.06,
      enemySpeedMult: 1.04,
      eliteChanceMult: 1.20,
      specialThreatMult: 1.18,
      sustainMult: 0.90,
      scoreMult: 1.05,
      contentRarityMult: 1.10
    },
    {
      atSeconds: 600,
      label: 'skill_check',
      fireChanceMult: 1.35,
      projectileSpeedMult: 1.12,
      enemySpeedMult: 1.08,
      eliteChanceMult: 1.45,
      specialThreatMult: 1.40,
      sustainMult: 0.78,
      scoreMult: 1.12,
      contentRarityMult: 1.25
    },
    {
      atSeconds: 900,
      label: 'late_pressure',
      fireChanceMult: 1.60,
      projectileSpeedMult: 1.20,
      enemySpeedMult: 1.12,
      eliteChanceMult: 1.75,
      specialThreatMult: 1.70,
      sustainMult: 0.65,
      scoreMult: 1.20,
      contentRarityMult: 1.45
    },
    {
      atSeconds: 1200,
      label: 'climax',
      fireChanceMult: 1.95,
      projectileSpeedMult: 1.30,
      enemySpeedMult: 1.16,
      eliteChanceMult: 2.20,
      specialThreatMult: 2.10,
      sustainMult: 0.52,
      scoreMult: 1.35,
      contentRarityMult: 1.75
    },
    {
      atSeconds: 1500,
      label: 'overrun_pressure',
      fireChanceMult: 2.35,
      projectileSpeedMult: 1.42,
      enemySpeedMult: 1.22,
      eliteChanceMult: 2.80,
      specialThreatMult: 2.70,
      sustainMult: 0.40,
      scoreMult: 1.55,
      contentRarityMult: 2.20
    }
  ],

  sustain: {
    bossRepairMaxLives: 3,
    bossRepairOnlyAtOrBelowLives: 1,
    controlledRecoveryWindowStartSeconds: 600,
    controlledRecoveryWindowEndSeconds: 1100,
    controlledRecoveryMaxPerRun: 1
  },

  discovery: {
    firstSeenBonus: 500,
    firstDefeatBonus: 750,
    firstBossDefeatBonus: 2000,
    firstRunThemeBonus: 800,
    cabinetLogBonus: 300,
    toastDurationMs: 1800
  },

  pilotXp: {
    scoreDivisor: 300,
    sectorReachedBase: 90,
    waveClear: 12,
    bossDefeat: 110,
    codexDiscovery: 28,
    newThreatDefeat: 80,
    runThemeDiscovery: 60,
    noHitWave: 70,
    noHitSector: 220,
    runClear: 900,
    clearWithLivesRemaining: 250
  }
};

const MULTIPLIER_KEYS = [
  'fireChanceMult',
  'projectileSpeedMult',
  'enemySpeedMult',
  'eliteChanceMult',
  'specialThreatMult',
  'sustainMult',
  'scoreMult',
  'contentRarityMult'
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getRunElapsedSeconds(game) {
  const playScene = game?.scenes?.play;
  if (Number.isFinite(playScene?.gameTime)) return Math.max(0, playScene.gameTime);
  if (Number.isFinite(game?.runElapsedSeconds)) return Math.max(0, game.runElapsedSeconds);
  if (Number.isFinite(game?.runStartedAtMs) && game.runStartedAtMs > 0) {
    return Math.max(0, (Date.now() - game.runStartedAtMs) / 1000);
  }
  return 0;
}

export function getCurrentPressurePhase(elapsedSeconds = 0) {
  const seconds = Math.max(0, finiteNumber(elapsedSeconds));
  const phases = RunPacingConfig.pressurePhases;
  let current = phases[0];
  for (const phase of phases) {
    if (seconds >= phase.atSeconds) current = phase;
  }
  return current;
}

export function getPressurePhasePair(elapsedSeconds = 0) {
  const seconds = Math.max(0, finiteNumber(elapsedSeconds));
  const phases = RunPacingConfig.pressurePhases;
  let current = phases[0];
  let next = phases[phases.length - 1];
  for (let i = 0; i < phases.length; i += 1) {
    if (seconds >= phases[i].atSeconds) {
      current = phases[i];
      next = phases[Math.min(phases.length - 1, i + 1)];
    }
  }
  return { current, next };
}

export function getPressureMultipliers(elapsedSeconds = 0) {
  const { current, next } = getPressurePhasePair(elapsedSeconds);
  const span = Math.max(1, next.atSeconds - current.atSeconds);
  const progress = current === next
    ? 0
    : clamp((Math.max(0, finiteNumber(elapsedSeconds)) - current.atSeconds) / span, 0, 1);
  const multipliers = {};
  for (const key of MULTIPLIER_KEYS) {
    multipliers[key] = Number(lerp(
      finiteNumber(current[key], 1),
      finiteNumber(next[key], finiteNumber(current[key], 1)),
      progress
    ).toFixed(4));
  }
  return multipliers;
}

export function getRunPacingDebugState(game) {
  const elapsedSeconds = getRunElapsedSeconds(game);
  const playScene = game?.scenes?.play;
  const enemyManager = playScene?.enemyManager;
  const currentSector = Math.max(1, Math.floor(finiteNumber(game?.level, 1)));
  const sectorElapsedSeconds = enemyManager?.levelStartTime
    ? Math.max(0, (Date.now() - enemyManager.levelStartTime) / 1000)
    : 0;
  const completedSectors = Math.max(0, currentSector - 1);
  const averageSectorSeconds = completedSectors > 0
    ? elapsedSeconds / completedSectors
    : sectorElapsedSeconds;
  return {
    enabled: Boolean(RunPacingConfig.enabled),
    runElapsedSeconds: Number(elapsedSeconds.toFixed(2)),
    targetRunSeconds: RunPacingConfig.targetRunSeconds,
    targetRunMinutesRange: [...RunPacingConfig.targetRunMinutesRange],
    currentSector,
    targetSectors: RunPacingConfig.targetSectors,
    sectorElapsedSeconds: Number(sectorElapsedSeconds.toFixed(2)),
    averageSectorSeconds: Number((averageSectorSeconds || 0).toFixed(2)),
    estimatedRunCompletionSeconds: Number(((averageSectorSeconds || RunPacingConfig.sectorTargetSeconds) * RunPacingConfig.targetSectors).toFixed(2)),
    wavesCleared: Number(playScene?.wavesCleared) || 0,
    bossesKilled: Number(playScene?.bossKills) || 0,
    pressurePhase: getCurrentPressurePhase(elapsedSeconds).label,
    pressureMultipliers: getPressureMultipliers(elapsedSeconds),
    postTargetEscalation: Boolean(
      RunPacingConfig.postTargetEscalationEnabled &&
      elapsedSeconds >= RunPacingConfig.finalClimaxSeconds
    )
  };
}
