import fs from 'node:fs';
import path from 'node:path';
import {
  ENEMY_MOVEMENT_STYLE_IDS,
  getEnemyMovementOffset
} from '../src/config/EnemyMovementStyles.js';

const root = process.cwd();
const errors = [];

function fail(message) {
  errors.push(message);
}

const sourceFiles = [
  'src/entities/Enemy.js',
  'src/config/EnemyMovementStyles.js'
];

for (const file of sourceFiles) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  if (/Math\.sign\s*\(\s*Math\.sin/.test(source)) {
    fail(`${file} should not use sign-based sine steps for parked enemy movement`);
  }
  if (/Math\.round\s*\(\s*Math\.sin/.test(source)) {
    fail(`${file} should not use rounded sine steps for parked enemy movement`);
  }
}

const maxAllowedStepPx = 3.2;
const sampleFrames = 720;
const framePhaseStep = 0.035;

for (const styleId of ENEMY_MOVEMENT_STYLE_IDS) {
  let previous = null;
  let maxStep = 0;
  for (let frame = 0; frame < sampleFrames; frame += 1) {
    const phase = frame * framePhaseStep;
    const offset = getEnemyMovementOffset(styleId, {
      phase,
      tacticalWave: phase * 1.15,
      side: -1,
      slot: 3,
      size: 9,
      x: 620,
      formationX: 620,
      playerX: 820
    });
    if (previous) {
      maxStep = Math.max(
        maxStep,
        Math.abs((offset.x || 0) - (previous.x || 0)),
        Math.abs((offset.y || 0) - (previous.y || 0))
      );
    }
    previous = offset;
  }
  if (maxStep > maxAllowedStepPx) {
    fail(`${styleId} parked movement steps ${maxStep.toFixed(2)}px/frame, above ${maxAllowedStepPx}px`);
  }
}

if (errors.length) {
  console.error(`[enemy-movement-smoothing] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[enemy-movement-smoothing] PASS ${ENEMY_MOVEMENT_STYLE_IDS.length} generated enemy movement styles stay smooth while parked`);
