import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CABINET_WONDER_CATALOG,
  CABINET_WONDER_SECTOR_CADENCE,
  CABINET_WONDER_VARIANT_COUNT,
  evaluateCabinetWonder,
  getCabinetWonderChance
} from '../src/game/CabinetWonders.js';

assert.equal(CABINET_WONDER_VARIANT_COUNT, 60, 'Cabinet Wonders must ship sixty distinct discoveries');
assert.equal(new Set(CABINET_WONDER_CATALOG.map((entry) => entry.id)).size, 60, 'Cabinet Wonder IDs must be unique');
assert.equal(new Set(CABINET_WONDER_CATALOG.map((entry) => entry.title)).size, 60, 'Cabinet Wonder titles must be unique');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.palette.length === 3 && entry.pitchScale > 0), 'each wonder needs a visual palette and audio identity');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.history.length >= 500), 'each wonder needs a substantial authored Codex history');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.fieldNote.length >= 40), 'each wonder needs a useful field note');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.art?.includes('/cabinet-wonders/')), 'each wonder needs dedicated generated art');
assert.ok(
  CABINET_WONDER_CATALOG.every((entry) => existsSync(path.resolve('public', entry.art.replace(/^\/+/, '')))),
  'every Cabinet Wonder art path must resolve to a packaged file'
);

assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: false }).reason, 'no_safe_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: true, isChallenge: true }).reason, 'challenge_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: true, busyTransition: true }).reason, 'busy_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 1, waveNumber: 1, hasUpcomingWave: true }).reason, 'early_run');
assert.equal(evaluateCabinetWonder('test', { sector: 3, waveNumber: 3, hasUpcomingWave: true, sectorAlreadyShown: true }).reason, 'already_shown_this_sector');

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

assert.equal(CABINET_WONDER_SECTOR_CADENCE, 3, 'Cabinet Wonders should arrive every third sector');
assert.equal(getCabinetWonderChance({ sector: 2, eligibleChecks: 1 }), 0);
assert.equal(getCabinetWonderChance({ sector: 3, eligibleChecks: 1 }), 1);
assert.equal(getCabinetWonderChance({ sector: 6, eligibleChecks: 99 }), 1);
assert.equal(getCabinetWonderChance({ sector: 7, eligibleChecks: 99 }), 0);

const originalRandom = Math.random;
let globalRandomCalls = 0;
Math.random = () => {
  globalRandomCalls += 1;
  return 0.5;
};
try {
  evaluateCabinetWonder('rng-isolation', {
    sector: 6,
    waveNumber: 4,
    eligibleChecks: 9,
    hasUpcomingWave: true
  });
} finally {
  Math.random = originalRandom;
}
assert.equal(globalRandomCalls, 0, 'Cabinet Wonder planning must not consume global gameplay RNG');

const triggered = evaluateCabinetWonder('deterministic-cadence', {
  sector: 6,
  waveNumber: 4,
  eligibleChecks: 9,
  hasUpcomingWave: true,
  recentVariantIds: CABINET_WONDER_CATALOG.slice(0, 12).map((entry) => entry.id)
});
assert.ok(triggered.triggered, 'cadence sector should produce a valid wonder');
assert.ok(!CABINET_WONDER_CATALOG.slice(0, 12).some((entry) => entry.id === triggered.variant.id), 'wonder planner should avoid recent variants');
assert.deepEqual(evaluateCabinetWonder('deterministic-cadence', {
  sector: 6,
  waveNumber: 4,
  eligibleChecks: 9,
  hasUpcomingWave: true,
  recentVariantIds: CABINET_WONDER_CATALOG.slice(0, 12).map((entry) => entry.id)
}), triggered, 'wonder planning must be deterministic and must not consume gameplay RNG');

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

console.log(`[cabinet-wonders] PASS variants=${CABINET_WONDER_VARIANT_COUNT} cadence=${CABINET_WONDER_SECTOR_CADENCE}`);
