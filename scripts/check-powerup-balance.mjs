import { BalanceConfig } from '../src/config/BalanceConfig.js';

const powerups = BalanceConfig.powerups || {};
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
if ((powerups.extraLifeChance ?? 1) > 0.01) {
  errors.push(`extraLifeChance should stay at or below 0.01, got ${powerups.extraLifeChance}`);
}
if ((powerups.extraLifeGuaranteedEveryLevels ?? 0) < 4) {
  errors.push(`extraLifeGuaranteedEveryLevels should stay at or above 4, got ${powerups.extraLifeGuaranteedEveryLevels}`);
}

if (errors.length) {
  console.error('[powerup-balance] failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[powerup-balance] PASS sparse drops, max 2 per level, extra lives reduced by 50%');
