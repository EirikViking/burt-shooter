import {
  RunPacingConfig,
  getCurrentPressurePhase,
  getPressureMultipliers,
  getRunElapsedSeconds,
  getRunPacingDebugState
} from '../config/RunPacingConfig.js';
import {
  getNormalWaveDifficultyLevel,
  getNormalWaveDangerMoment as getNormalWaveDangerMomentForLevel,
  getNormalWavePressureTuning as getNormalWavePressureTuningForLevel
} from '../config/BalanceConfig.js';
import { getRunModeProfile } from './RunMode.js';

function finite(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export class RunPressureDirector {
  constructor(game) {
    this.game = game;
    this.lastDebugState = null;
  }

  get enabled() {
    return RunPacingConfig.enabled !== false;
  }

  getElapsedSeconds() {
    return getRunElapsedSeconds(this.game);
  }

  getCurrentPhase() {
    return getCurrentPressurePhase(this.getElapsedSeconds());
  }

  getMultipliers() {
    const profileMultipliers = this.getRunModeProfile().pressureMultipliers || {};
    if (!this.enabled) {
      return {
        fireChanceMult: finite(profileMultipliers.fireChanceMult),
        projectileSpeedMult: finite(profileMultipliers.projectileSpeedMult),
        enemySpeedMult: finite(profileMultipliers.enemySpeedMult),
        eliteChanceMult: finite(profileMultipliers.eliteChanceMult),
        specialThreatMult: finite(profileMultipliers.specialThreatMult),
        sustainMult: finite(profileMultipliers.sustainMult),
        scoreMult: finite(profileMultipliers.scoreMult),
        contentRarityMult: finite(profileMultipliers.contentRarityMult)
      };
    }
    const runtime = getPressureMultipliers(this.getElapsedSeconds());
    return Object.fromEntries(
      Object.entries(runtime).map(([key, value]) => [
        key,
        Number((finite(value) * finite(profileMultipliers[key])).toFixed(4))
      ])
    );
  }

  getRunModeProfile() {
    return this.game?.getRunModeProfile?.() || getRunModeProfile(this.game?.runMode);
  }

  getNormalWaveDifficultyLevel(level = this.game?.level || 1) {
    const base = getNormalWaveDifficultyLevel(level);
    const delta = Math.floor(Number(this.getRunModeProfile().normalWaveDifficultyLevelOffsetDelta) || 0);
    return Math.max(1, base + delta);
  }

  getNormalWavePressureTuning(level = this.getNormalWaveDifficultyLevel(this.game?.level || 1)) {
    return getNormalWavePressureTuningForLevel(level);
  }

  getNormalWaveDangerMoment(level = this.getNormalWaveDifficultyLevel(this.game?.level || 1), waveIndex = 0, waveCount = 0) {
    return getNormalWaveDangerMomentForLevel(level, waveIndex, waveCount);
  }

  scaleEnemyFireChance(chance, level) {
    return finite(chance, 0) *
      finite(this.getMultipliers().fireChanceMult) *
      finite(this.getNormalWavePressureTuning(level).fireChanceMult);
  }

  scaleProjectileSpeed(speed, level) {
    return finite(speed, 0) *
      finite(this.getMultipliers().projectileSpeedMult) *
      finite(this.getNormalWavePressureTuning(level).projectileSpeedMult);
  }

  scaleEnemySpeed(speed, level) {
    return finite(speed, 0) *
      finite(this.getMultipliers().enemySpeedMult) *
      finite(this.getNormalWavePressureTuning(level).enemySpeedMult);
  }

  scaleEliteChance(chance) {
    return finite(chance, 0) * finite(this.getMultipliers().eliteChanceMult);
  }

  scaleSpecialThreatChance(chance) {
    return finite(chance, 0) * finite(this.getMultipliers().specialThreatMult);
  }

  scaleSustainChance(chance) {
    return finite(chance, 0) * finite(this.getMultipliers().sustainMult);
  }

  getScoreMultiplier() {
    return finite(this.getMultipliers().scoreMult);
  }

  getSustainMultiplier() {
    return finite(this.getMultipliers().sustainMult);
  }

  getContentRarityMultiplier() {
    return finite(this.getMultipliers().contentRarityMult);
  }

  getDebugState() {
    this.lastDebugState = getRunPacingDebugState(this.game);
    return this.lastDebugState;
  }
}
