import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CABINET_WONDER_BASE_CHANCE,
  CABINET_WONDER_CATALOG,
  CABINET_WONDER_MAX_CHANCE,
  CABINET_WONDER_VARIANT_COUNT,
  evaluateCabinetWonder,
  getCabinetWonderChance
} from '../src/game/CabinetWonders.js';

assert.equal(CABINET_WONDER_VARIANT_COUNT, 10, 'Cabinet Wonders must ship ten distinct rare moments');
assert.equal(new Set(CABINET_WONDER_CATALOG.map((entry) => entry.id)).size, 10, 'Cabinet Wonder IDs must be unique');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.palette.length === 3 && entry.pitchScale > 0), 'each wonder needs a visual palette and audio identity');

assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: false }).reason, 'no_safe_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: true, isChallenge: true }).reason, 'challenge_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: true, busyTransition: true }).reason, 'busy_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 1, waveNumber: 1, hasUpcomingWave: true }).reason, 'early_run');
assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: true, alreadyShown: true }).reason, 'already_shown');

const forced = evaluateCabinetWonder('test', {
  debugForce: true,
  forceVariantId: 'starwhale_constellation',
  sector: 1,
  waveNumber: 1
});
assert.equal(forced.triggered, true);
assert.equal(forced.variant.id, 'starwhale_constellation');
assert.equal(forced.scoreNeutral, true);
assert.equal(forced.gameplayNeutral, true);

assert.equal(getCabinetWonderChance({ sector: 2, eligibleChecks: 1 }), CABINET_WONDER_BASE_CHANCE);
assert.ok(getCabinetWonderChance({ sector: 8, eligibleChecks: 8 }) > CABINET_WONDER_BASE_CHANCE, 'rare chance should rise after a dry run');
assert.equal(getCabinetWonderChance({ sector: 99, eligibleChecks: 99 }), CABINET_WONDER_MAX_CHANCE, 'rare chance must stay bounded');

const originalRandom = Math.random;
let globalRandomCalls = 0;
Math.random = () => {
  globalRandomCalls += 1;
  return 0.5;
};
try {
  evaluateCabinetWonder('rng-isolation', {
    sector: 8,
    waveNumber: 4,
    eligibleChecks: 9,
    hasUpcomingWave: true
  });
} finally {
  Math.random = originalRandom;
}
assert.equal(globalRandomCalls, 0, 'Cabinet Wonder planning must not consume global gameplay RNG');

let triggered = null;
for (let index = 0; index < 500 && !triggered; index += 1) {
  const decision = evaluateCabinetWonder(`deterministic-${index}`, {
    sector: 8,
    waveNumber: 4,
    eligibleChecks: 9,
    hasUpcomingWave: true
  });
  if (decision.triggered) triggered = { seed: `deterministic-${index}`, decision };
}
assert.ok(triggered, 'deterministic rarity sweep should find a valid wonder');
assert.deepEqual(evaluateCabinetWonder(triggered.seed, {
  sector: 8,
  waveNumber: 4,
  eligibleChecks: 9,
  hasUpcomingWave: true
}), triggered.decision, 'wonder planning must be deterministic and must not consume gameplay RNG');

const enemyManagerSource = readFileSync(new URL('../src/managers/EnemyManager.js', import.meta.url), 'utf8');
assert.match(
  enemyManagerSource,
  /isChallenge:\s*Boolean\(clearedWave\?\.isChallenge \|\| this\.waves\[transitionWaveIndex \+ 1\]\?\.isChallenge\)/,
  'Cabinet Wonders must stay out of both completed and upcoming challenge-flight transitions'
);

const playSceneSource = readFileSync(new URL('../src/scenes/PlayScene.js', import.meta.url), 'utf8');
assert.match(
  playSceneSource,
  /const width = Math\.max\(320, Number\(this\.gameplayGame\?\.getWidth\?\.\(\)\)/,
  'Cabinet Wonders must use the scaled gameplay coordinate space instead of outer-window dimensions'
);
assert.match(
  playSceneSource,
  /const durationMs = reducedMotion \? 1400 : 2300;/,
  'Cabinet Wonders need a readable full-motion hold with a shorter Reduced Motion path'
);

console.log(`[cabinet-wonders] PASS variants=${CABINET_WONDER_VARIANT_COUNT} maxChance=${CABINET_WONDER_MAX_CHANCE}`);
