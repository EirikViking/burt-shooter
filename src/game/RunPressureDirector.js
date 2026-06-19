import {
  RunPacingConfig,
  getCurrentPressurePhase,
  getPressureMultipliers,
  getRunElapsedSeconds,
  getRunPacingDebugState
} from '../config/RunPacingConfig.js';
import {
  getNormalWaveDifficultyLevel,
  getNormalWavePressureTuning as getNormalWavePressureTuningForLevel
} from '../config/BalanceConfig.js';

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
    if (!this.enabled) {
      return {
        fireChanceMult: 1,
        projectileSpeedMult: 1,
        enemySpeedMult: 1,
        eliteChanceMult: 1,
        specialThreatMult: 1,
        sustainMult: 1,
        scoreMult: 1,
        contentRarityMult: 1
      };
    }
    return getPressureMultipliers(this.getElapsedSeconds());
  }

  getNormalWavePressureTuning(level = getNormalWaveDifficultyLevel(this.game?.level || 1)) {
    return getNormalWavePressureTuningForLevel(level);
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
