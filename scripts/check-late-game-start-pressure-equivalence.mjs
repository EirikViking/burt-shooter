import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BalanceConfig,
  getNormalWaveDifficultyLevel,
  getNormalWavePressureTuning
} from '../src/config/BalanceConfig.js';
import {
  HIGH_SECTOR_ENCOUNTER_BEATS,
  createHighSectorEscalationState,
  shapeHighSectorWaves
} from '../src/config/HighSectorEscalation.js';

const config = BalanceConfig.difficulty.highSectorEscalation;

function getNativeWaveCount(sector) {
  const level = getNormalWaveDifficultyLevel(sector);
  const tuning = getNormalWavePressureTuning(level);
  const difficulty = BalanceConfig.difficulty;
  const base = difficulty.wavesPerBossBase ?? difficulty.waveCountBase ?? 4;
  const perLevel = difficulty.wavesPerBossPerLevel ?? 0;
  const max = difficulty.wavesPerBossMax ?? difficulty.waveCountMax ?? 6;
  const min = difficulty.MIN_WAVES_BETWEEN_BOSSES ?? difficulty.minWavesBetweenBosses ?? 1;
  const bonus = Math.max(0, Number(tuning.waveCountBonus) || 0);
  const planned = Math.round(base + Math.max(0, level - 1) * perLevel) + bonus;
  return Math.max(min, Math.min(max + bonus, planned));
}

function makeBaselineWaves(sector) {
  return Array.from({ length: getNativeWaveCount(sector) }, (_, index) => ({
    type: `native_enemy_${index}`,
    count: 17,
    formation: 'PINCER',
    tactic: 'neon_jury',
    entry: index % 2 === 0 ? 'split' : 'alternating',
    cadence: 1.35,
    eliteMiddleShipId: `native_elite_${index}`,
    dangerMidShipIds: [{ slot: 1, id: `native_danger_${index}` }],
    forcedThreatActionIds: ['native_pressure_action'],
    threatBudgetModifiers: {
      dangerBudgetBonus: 3,
      maxActiveBonus: 1,
      plannedActionBonus: 2
    }
  }));
}

for (const sector of [75, 100, 120, 150]) {
  const baseline = makeBaselineWaves(sector);
  const state = createHighSectorEscalationState({
    config,
    armed: true,
    sector,
    seed: `start-pressure-${sector}`,
    preserveNativePressure: true
  });
  assert.equal(state.preserveNativePressure, true,
    `Sector ${sector} experiment state must request the native pressure floor`);
  const shaped = shapeHighSectorWaves(baseline, state);
  const authored = shaped.filter((wave) => wave.highSectorAuthoredEncounter === true);
  const bridges = shaped.filter((wave) => wave.highSectorAuthoredEncounter !== true);

  assert.equal(shaped.length, baseline.length,
    `Sector ${sector} must keep the native ${baseline.length}-wave pressure envelope`);
  assert.equal(authored.length, HIGH_SECTOR_ENCOUNTER_BEATS.length,
    `Sector ${sector} must layer five authored beats onto the native wave plan`);
  assert.equal(bridges.length, baseline.length - HIGH_SECTOR_ENCOUNTER_BEATS.length,
    `Sector ${sector} must retain its remaining native pressure waves`);
  assert.deepEqual(authored.map((wave) => wave.highSectorBeatId), HIGH_SECTOR_ENCOUNTER_BEATS.map((beat) => beat.id));
  assert.ok(shaped.every((wave, index) => wave.count >= baseline[index].count),
    `Sector ${sector} must not reduce native enemy counts`);
  assert.ok(shaped.every((wave, index) => wave.cadence >= baseline[index].cadence),
    `Sector ${sector} must not slow native entry cadence`);
  assert.ok(authored.every((wave) => wave.highSectorTacticOverrides.fireScalar >= 1),
    `Sector ${sector} authored beats must not reduce native fire pressure`);
  assert.ok(authored.every((wave) => wave.highSectorTacticOverrides.fireDelayMult <= 1),
    `Sector ${sector} authored beats must not lengthen native fire delays`);
  assert.ok(shaped.every((wave) => Array.isArray(wave.dangerMidShipIds) && wave.dangerMidShipIds.length > 0),
    `Sector ${sector} must preserve native danger plans`);
  assert.ok(shaped.every((wave) => wave.forcedThreatActionIds.includes('native_pressure_action')),
    `Sector ${sector} must preserve native threat actions`);
}

const legacyState = createHighSectorEscalationState({
  config,
  armed: true,
  sector: 75,
  seed: 'legacy-diagnostic-contract'
});
assert.equal(legacyState.preserveNativePressure, false,
  'the native pressure floor must be opt-in and experiment-only');
const legacyWaves = Array.from({ length: 5 }, () => ({
  type: 'legacy',
  count: 12,
  formation: 'GRID',
  tactic: 'baseline',
  cadence: 1,
  dangerMidShipIds: [{ slot: 1, id: 'legacy-danger' }]
}));
const legacyShaped = shapeHighSectorWaves(legacyWaves, legacyState);
assert.equal(legacyShaped.length, 5);
assert.ok(legacyShaped.every((wave) => !wave.dangerMidShipIds),
  'existing non-experiment authored diagnostics must retain their prior isolation contract');

const managerSource = await readFile(new URL('../src/managers/EnemyManager.js', import.meta.url), 'utf8');
assert.match(managerSource, /preserveNativePressure:\s*this\.game\?\.lateGameExperiment\?\.active\s*===\s*true/,
  'only the acknowledged late-game experiment may enable the native pressure floor');
assert.match(managerSource, /highSectorEscalationState\?\.preserveNativePressure/,
  'wave-count selection must honor the experiment-only native pressure floor');

console.log('Late-game start pressure equivalence contract passed.');
