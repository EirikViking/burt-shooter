import { readFileSync } from 'node:fs';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { RunPacingConfig, getPressureMultipliers, getRunPacingDebugState } from '../src/config/RunPacingConfig.js';

const errors = [];
const fail = (message) => errors.push(message);
const finite = (value) => Number.isFinite(Number(value));

const [minMinutes, maxMinutes] = RunPacingConfig.targetRunMinutesRange || [];
if (RunPacingConfig.targetRunSeconds < 1440 || RunPacingConfig.targetRunSeconds > 1800) fail(`targetRunSeconds must be 24-30 minutes, got ${RunPacingConfig.targetRunSeconds}`);
if (minMinutes < 24 || maxMinutes > 30) fail(`targetRunMinutesRange must be within 24-30, got ${RunPacingConfig.targetRunMinutesRange}`);
if (!Number.isInteger(RunPacingConfig.targetSectors) || RunPacingConfig.targetSectors < 8) fail(`targetSectors must exist and be meaningful, got ${RunPacingConfig.targetSectors}`);
if (!Array.isArray(RunPacingConfig.pressurePhases) || RunPacingConfig.pressurePhases.length < 5) fail('pressure director must expose at least five phases');

let lastFire = 0;
let lastSustain = Number.POSITIVE_INFINITY;
for (const phase of RunPacingConfig.pressurePhases) {
  for (const key of ['atSeconds', 'fireChanceMult', 'projectileSpeedMult', 'enemySpeedMult', 'eliteChanceMult', 'specialThreatMult', 'sustainMult', 'scoreMult']) {
    if (!finite(phase[key])) fail(`phase ${phase.label || phase.atSeconds} has non-finite ${key}`);
  }
  if (phase.fireChanceMult < lastFire) fail(`fire pressure regresses at ${phase.label}`);
  if (phase.sustainMult > lastSustain) fail(`sustain does not tighten at ${phase.label}`);
  lastFire = phase.fireChanceMult;
  lastSustain = phase.sustainMult;
}

const sustain = RunPacingConfig.sustain || {};
if ((sustain.bossRepairMaxLives || 99) > 3) fail('boss repair max lives must stay capped at 3');
if ((BalanceConfig.powerups.extraLifeChance || 0) > 0.08) fail(`extraLifeChance should be bounded, got ${BalanceConfig.powerups.extraLifeChance}`);
if ((BalanceConfig.powerups.maxDropChance || 0) > 0.09) fail(`maxDropChance should be bounded, got ${BalanceConfig.powerups.maxDropChance}`);

const early = getPressureMultipliers(0);
const late = getPressureMultipliers(RunPacingConfig.finalClimaxSeconds);
if (late.fireChanceMult <= early.fireChanceMult) fail('fire multiplier should increase by climax');
if (late.sustainMult >= early.sustainMult) fail('sustain multiplier should decrease by climax');

const debug = getRunPacingDebugState({
  level: 4,
  runStartedAtMs: Date.now() - 90000,
  scenes: { play: { gameTime: 90, wavesCleared: 12, bossKills: 2, enemyManager: { levelStartTime: Date.now() - 12000 } } }
});
for (const field of ['runElapsedSeconds', 'targetRunSeconds', 'currentSector', 'targetSectors', 'sectorElapsedSeconds', 'averageSectorSeconds', 'estimatedRunCompletionSeconds']) {
  if (!finite(debug[field])) fail(`debug field ${field} is not finite`);
}
if (!debug.pressurePhase || !debug.pressureMultipliers) fail('pacing debug fields are incomplete');

const gameSource = readFileSync('src/game/Game.js', 'utf8');
const enemySource = readFileSync('src/managers/EnemyManager.js', 'utf8');
if (!gameSource.includes('RunPressureDirector')) fail('Game must import/use RunPressureDirector');
if (!enemySource.includes('scaleEnemyFireChance')) fail('EnemyManager must scale fire chance through pressure director');
if (!enemySource.includes('scaleEnemySpeed')) fail('EnemyManager must scale enemy speed through pressure director');

if (errors.length) {
  console.error(`[run-pacing] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[run-pacing] PASS target=${RunPacingConfig.targetRunSeconds}s sectors=${RunPacingConfig.targetSectors} phases=${RunPacingConfig.pressurePhases.length}`);
