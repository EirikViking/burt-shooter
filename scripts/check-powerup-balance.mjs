import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { RunPacingConfig } from '../src/config/RunPacingConfig.js';

const powerups = BalanceConfig.powerups || {};
const sustain = RunPacingConfig.sustain || {};
const errors = [];

if ((powerups.dropChance ?? 1) > 0.02) {
  errors.push(`dropChance should stay at or below 0.02, got ${powerups.dropChance}`);
}
if ((powerups.maxDropChance ?? 1) > 0.12) {
  errors.push(`maxDropChance should stay at or below 0.12, got ${powerups.maxDropChance}`);
}
if ((powerups.cooldownMs ?? 0) < 18000) {
  errors.push(`cooldownMs should stay at or above 18000, got ${powerups.cooldownMs}`);
}
if ((powerups.maxPerLevel ?? 99) > 2) {
  errors.push(`maxPerLevel should stay at or below 2, got ${powerups.maxPerLevel}`);
}
if (powerups.extraLifeDropsEnabled !== true) {
  errors.push('extraLifeDropsEnabled should be true so rare life powerups can drop');
}
if (Number(powerups.extraLifeFinalSector) !== 100) {
  errors.push(`extraLifeFinalSector should end endurance life drops after Sector 100, got ${powerups.extraLifeFinalSector}`);
}
if ((powerups.extraLifeChance ?? 99) > 0.08) {
  errors.push(`extraLifeChance should stay at or below 0.08, got ${powerups.extraLifeChance}`);
}
if ((powerups.extraLifeChance ?? -1) < 0.025) {
  errors.push(`extraLifeChance should stay at or above 0.025 so rare life drops can appear, got ${powerups.extraLifeChance}`);
}
const guaranteedCadence = Number(powerups.extraLifeGuaranteedEveryLevels ?? 0);
const controlledRecoveryConfigured = Number(sustain.controlledRecoveryMaxPerRun ?? 0) >= 1
  && Number(sustain.controlledRecoveryWindowStartSeconds ?? 0) > 0
  && Number(sustain.controlledRecoveryWindowEndSeconds ?? 0) > Number(sustain.controlledRecoveryWindowStartSeconds ?? 0);
if (guaranteedCadence !== 0 && (guaranteedCadence < 6 || guaranteedCadence > 8)) {
  errors.push(`extraLifeGuaranteedEveryLevels should be disabled or kept rare at 6-8, got ${powerups.extraLifeGuaranteedEveryLevels}`);
}
if (guaranteedCadence === 0 && !controlledRecoveryConfigured) {
  errors.push('extraLifeGuaranteedEveryLevels is disabled, so RunPacingConfig.sustain must define a controlled recovery window');
}
if (BalanceConfig.survival?.lastStandRepairEnabled === true) {
  errors.push('lastStandRepairEnabled should stay false for Steam score-chaser fairness');
}
if ((BalanceConfig.rewards?.waveClearRepairTargetLives ?? 0) !== 0) {
  errors.push(`waveClearRepairTargetLives should be 0, got ${BalanceConfig.rewards?.waveClearRepairTargetLives}`);
}
if ((BalanceConfig.rewards?.levelClearRepairTargetLives ?? 0) !== 0) {
  errors.push(`levelClearRepairTargetLives should be 0, got ${BalanceConfig.rewards?.levelClearRepairTargetLives}`);
}

if (errors.length) {
  console.error('[powerup-balance] failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[powerup-balance] PASS sparse drops, max 2 per level, pressure-bounded extra lives, no level-clear life grants');
