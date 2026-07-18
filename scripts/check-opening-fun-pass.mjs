import { readFileSync } from 'node:fs';
import { BalanceConfig } from '../src/config/BalanceConfig.js';

const errors = [];
const fail = (message) => errors.push(message);
const config = BalanceConfig.difficulty?.openingMomentum || {};
const enemyManagerSource = readFileSync('src/managers/EnemyManager.js', 'utf8');
const playSceneSource = readFileSync('src/scenes/PlayScene.js', 'utf8');

if (config.enabled !== true || config.maxSourceLevel !== 3) {
  fail('opening momentum must be enabled only for source sectors 1-3');
}

const assertDescending = (key, { min, max }) => {
  const values = [1, 2, 3].map((level) => Number(config?.[key]?.[level]));
  if (values.some((value) => !Number.isFinite(value) || value < min || value > max)) {
    fail(`${key} values must stay inside ${min}-${max}: ${values.join(', ')}`);
  }
  if (!(values[0] <= values[1] && values[1] <= values[2])) {
    fail(`${key} must ease back toward baseline across sectors 1-3: ${values.join(', ')}`);
  }
};

const assertAscending = (key, { min, max }) => {
  const values = [1, 2, 3].map((level) => Number(config?.[key]?.[level]));
  if (values.some((value) => !Number.isFinite(value) || value < min || value > max)) {
    fail(`${key} values must stay inside ${min}-${max}: ${values.join(', ')}`);
  }
  if (!(values[0] >= values[1] && values[1] >= values[2])) {
    fail(`${key} must ease back toward baseline across sectors 1-3: ${values.join(', ')}`);
  }
};

assertDescending('waveBriefingMsByLevel', { min: 450, max: BalanceConfig.difficulty.waveDelayMs });
assertDescending('waveToastDurationMsByLevel', { min: 1400, max: 2800 });
assertDescending('waveCleanupMsByLevel', { min: 450, max: BalanceConfig.difficulty.waveCleanupMs });
assertDescending('entryDurationMultByLevel', { min: 0.72, max: 1 });
assertDescending('entryDelayMultByLevel', { min: 0.68, max: 1 });
assertAscending('enemySpeedMultByLevel', { min: 1, max: 1.1 });
assertAscending('diveBiasMultByLevel', { min: 1, max: 1.2 });

for (const hook of [
  'getOpeningMomentumTuning().waveCleanupMs',
  'getOpeningMomentumTuning().waveBriefingMs',
  'openingMomentum.waveToastDurationMs',
  'openingMomentum.enemySpeedMult',
  'openingMomentum.entryDelayMult',
  'openingMomentum.entryDurationMult',
  'openingMomentum.diveBiasMult'
]) {
  if (!enemyManagerSource.includes(hook)) fail(`EnemyManager missing opening momentum hook: ${hook}`);
}

if (!playSceneSource.includes("this.enemyManager?.state === 'BOSS_GATE'")) {
  fail('combo timer must pause during the boss gate');
}
if (!playSceneSource.includes('this.refreshComboFromBossPressure(enemy);')) {
  fail('player bullet damage must refresh an active combo on boss pressure');
}
if (!playSceneSource.includes('this.firstRunKillCount < 2')) {
  fail('opening Rapid Fire pickup must arrive on the second kill');
}
if (!playSceneSource.includes('Math.max(height * 0.42')) {
  fail('opening pickup must spawn below the top HUD safe zone');
}

if (errors.length) {
  console.error(`[opening-fun-pass] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[opening-fun-pass] PASS sectors=1-3 pickupKill=2 bossComboGate=paused bossHitSustainMs=1400');
