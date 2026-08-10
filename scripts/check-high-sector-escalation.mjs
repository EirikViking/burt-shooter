import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { BalanceConfig } from '../src/config/BalanceConfig.js';
import {
  HIGH_SECTOR_ENCOUNTER_BEATS,
  HIGH_SECTOR_PROTOCOLS,
  capHighSectorBossHealth,
  createHighSectorEscalationState,
  getHighSectorProtocolSchedule,
  shapeHighSectorWaves,
  validateHighSectorProtocolWindow
} from '../src/config/HighSectorEscalation.js';
import {
  applyAggregateHighSectorHazardBudget,
  getAggregateHighSectorHazardRatio
} from '../src/game/HighSectorHazardBudget.js';
import { getHighSectorSourceText } from '../src/i18n/highSectorSourceText.js';
import { translateTextForLocale } from '../src/i18n/index.js';
import {
  DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS,
  HIGH_SECTOR_PROTOTYPE_AWARD_SUPPRESSION_REASON,
  HIGH_SECTOR_PROTOTYPE_QUICK_START_SECTOR,
  HIGH_SECTOR_PROTOTYPE_SUPPRESSED_AWARDS,
  getHighSectorPrototypeSettings,
  migrateLegacyHighSectorPrototypeSettings
} from '../src/config/HighSectorPrototypeSettings.js';
import { createLateGamePressureExperimentRun } from '../src/game/LateGamePressureExperiment.js';

const config = BalanceConfig.difficulty.highSectorEscalation;
const seed = 'high-sector-fairness-seed-20260809';
const makeState = (sector, options = {}) => createHighSectorEscalationState({
  config,
  armed: true,
  sector,
  seed: options.seed || seed,
  runMode: options.runMode || 'ranked',
  reducedMotion: options.reducedMotion === true
});

assert.equal(config.enabled, false, 'the profile must stay disabled by default');
const prototypeStorageValues = new Map();
const prototypeStorage = {
  getItem: (key) => prototypeStorageValues.get(key) ?? null,
  setItem: (key, value) => prototypeStorageValues.set(key, value),
  removeItem: (key) => prototypeStorageValues.delete(key)
};
assert.deepEqual(getHighSectorPrototypeSettings({ storage: prototypeStorage }), DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS);
prototypeStorageValues.set('nova.highSectorPrototype.v1', JSON.stringify({ enabled: true, quickStart: true }));
assert.equal(migrateLegacyHighSectorPrototypeSettings({ storage: prototypeStorage }).removed, true);
assert.equal(prototypeStorageValues.has('nova.highSectorPrototype.v1'), false, 'legacy gameplay state must be removed');
assert.equal(createLateGamePressureExperimentRun({ scenario: 'standard' }), null, 'launch must require acknowledgement');
assert.equal(createLateGamePressureExperimentRun({ scenario: 'standard', acknowledged: true })?.startSector, 75);
assert.equal(HIGH_SECTOR_PROTOTYPE_QUICK_START_SECTOR, 75);
assert.equal(HIGH_SECTOR_PROTOTYPE_AWARD_SUPPRESSION_REASON, 'high_sector_prototype_no_awards');
assert.deepEqual(HIGH_SECTOR_PROTOTYPE_SUPPRESSED_AWARDS, [
  'rankings',
  'achievements',
  'codexDiscoveries',
  'unlocks',
  'careerProgress',
  'checkpoints',
  'personalBests',
  'pilotOrders',
  'shipUsage',
  'seasonProgress'
]);

for (const sector of [1, 25, 50]) {
  const state = makeState(sector);
  assert.equal(state.active, false, `armed profile must remain inert at Sector ${sector}`);
  assert.equal(state.protocol, null);
  assert.equal(state.caps, null);
  assert.equal(state.downtime, null);
  assert.equal(state.bossSupportEvent, null);
}
assert.equal(createHighSectorEscalationState({ config, armed: false, sector: 150, seed }).active, false);

const sector60 = makeState(60);
const sector80 = makeState(80);
const sector150 = makeState(150);
assert.equal(sector60.active, true);
assert.equal(sector60.pressureBudget, 1);
assert.equal(sector60.protocol, null);
assert.equal(sector60.bossSupportEvent?.id, 'authored_ordinary_support_intercept');
assert.equal(sector60.bossSupportEvent?.eventBudget, 1);
assert.equal(sector60.bossSupportEvent?.ordinaryEnemiesOnly, true);
assert.equal(sector60.bossSupportEvent?.suppressRandomBossSupport, true);
assert.equal(sector60.bossSupportEvent?.allowHealing, false);
assert.equal(sector60.bossSupportEvent?.allowLossOfControl, false);
assert.equal(sector60.bossSupportEvent?.allowLaneDenial, false);
assert.equal(sector60.bossSupportEvent?.bossHealthMultiplier, 1);
assert.equal('bossModifier' in sector80, false, 'the redundant Sector-80 support modifier must be gone');
assert.equal(sector80.bossSupportEvent?.id, sector60.bossSupportEvent?.id);
assert.ok(sector150.pressureBudget <= config.pressureBudgetMax);
assert.ok(sector150.downtime.briefingMs >= config.minimumBriefingMs);
assert.ok(sector150.downtime.cleanupMs >= config.minimumCleanupMs);
assert.equal(sector150.caps.maxHostileProjectiles, 48);
assert.equal(sector150.caps.maxHazardAreaRatio, 0.42);
assert.equal(sector150.caps.maxBossHealth, 280);

assert.equal(HIGH_SECTOR_PROTOCOLS.length, 3, 'generic Crossfire belongs in formation vocabulary, not the protocol deck');
assert.equal(HIGH_SECTOR_PROTOCOLS.some((protocol) => protocol.id === 'crossfire_doctrine'), false);
assert.equal(HIGH_SECTOR_PROTOCOLS.some((protocol) => protocol.id === 'hunter_pair'), false);
assert.equal(HIGH_SECTOR_PROTOCOLS.some((protocol) => protocol.id === 'tractor_intercept'), true);
const scheduleSectors = Array.from({ length: 12 }, (_, index) => 75 + index * 5);
const schedule = getHighSectorProtocolSchedule(seed, scheduleSectors);
assert.equal(validateHighSectorProtocolWindow(schedule), true, 'protocols must not repeat within fifteen sectors');
assert.equal(new Set(schedule.slice(0, 3).map((entry) => entry.protocol.id)).size, 3);
assert.deepEqual(
  schedule.map((entry) => entry.protocol.id),
  getHighSectorProtocolSchedule(seed, scheduleSectors).map((entry) => entry.protocol.id),
  'same seed and sectors must reproduce the protocol schedule'
);
for (let index = 3; index < schedule.length; index += 1) {
  assert.equal(schedule[index].protocol.id, schedule[index - 3].protocol.id);
}

const runModes = ['ranked', 'ranked_tactical', 'overrun', 'overrun_tactical'];
for (const runMode of runModes) {
  assert.deepEqual(
    getHighSectorProtocolSchedule(makeState(75, { runMode }).seed, scheduleSectors),
    schedule,
    `run mode ${runMode} must use the same deterministic fairness schedule`
  );
}

const reduced = makeState(85, { reducedMotion: true });
const fullMotion = makeState(85, { reducedMotion: false });
assert.equal(reduced.reducedMotion, true);
assert.equal(reduced.protocol.id, fullMotion.protocol.id, 'Reduced Motion must not change gameplay selection');
assert.equal(reduced.protocol.initialSafeSide, fullMotion.protocol.initialSafeSide);
assert.deepEqual(reduced.caps, fullMotion.caps);

const baseWaves = Array.from({ length: 5 }, (_, index) => ({
  count: 12,
  formation: 'GRID',
  tactic: 'baseline',
  cadence: 1,
  eliteMiddleShipId: 'random_elite_must_be_replaced',
  dangerMidShipIds: [{ slot: 1, id: 'random_danger_must_be_replaced' }]
}));
const inactive = makeState(50);
assert.equal(shapeHighSectorWaves(baseWaves, inactive), baseWaves, 'Sector 50 shaping must be a strict no-op');
assert.equal(shapeHighSectorWaves(baseWaves, createHighSectorEscalationState({ config, sector: 150, seed })), baseWaves);

for (const entry of schedule.slice(0, HIGH_SECTOR_PROTOCOLS.length)) {
  const state = makeState(entry.sector);
  const shaped = shapeHighSectorWaves(baseWaves, state);
  assert.equal(shaped.length, 5);
  assert.deepEqual(shaped.map((wave) => wave.highSectorBeatId), HIGH_SECTOR_ENCOUNTER_BEATS.map((beat) => beat.id));
  assert.deepEqual(shaped.map((wave) => wave.highSectorBeatNumber), [1, 2, 3, 4, 5]);
  assert.ok(shaped.every((wave) => wave.highSectorProtocolId === entry.protocol.id));
  assert.ok(shaped.every((wave) => wave.highSectorConditionReadMs >= 1200));
  assert.ok(shaped.every((wave) => wave.highSectorNonPhaseEscapeSide === entry.protocol.initialSafeSide));
  assert.ok(shaped.every((wave) => !wave.multiEliteMiddleShipIds), 'authored beats must never inherit a random multi-elite plan');
  assert.ok(shaped.every((wave) => !wave.dangerMidShipIds), 'authored beats must clear random danger-mid plans');
  assert.ok(shaped[3].count < shaped[2].count, 'beat four must create a real relief window');
  assert.ok(shaped[4].highSectorPreCombatReliefMs >= 1200);
  assert.equal(shaped[1].eliteMiddleShipId, entry.protocol.priorityEliteId);
  assert.equal(shaped[4].eliteMiddleShipId, entry.protocol.priorityEliteId);
  if (entry.protocol.id === 'tractor_intercept') {
    for (const wave of [shaped[1], shaped[4]]) {
      assert.equal(wave.eliteMiddleShipId, 'nova_elite_tractor_puller');
      assert.equal(wave.highSectorTractorContract.warningLeadMs, 1400);
      assert.equal(wave.highSectorTractorContract.maxLossOfControlSources, 1);
      assert.equal(wave.highSectorTractorContract.appliesRandomDebuff, false);
      assert.equal(wave.highSectorTractorContract.allowsMineLayer, false);
      assert.equal(wave.highSectorTractorContract.allowsForcedLaneShift, false);
      assert.equal(wave.highSectorPriorityTargetXRatio, 0.5);
    }
    assert.ok(shaped.every((wave) => wave.eliteMiddleShipId !== 'nova_elite_mine_layer'));
  }
  if (entry.protocol.id === 'shifting_front') {
    assert.ok(shaped[0].highSectorShift.shiftAtMs > shaped[0].highSectorShift.warningAtMs);
    assert.ok(shaped[4].highSectorShift.shiftAtMs > shaped[4].highSectorShift.warningAtMs);
  }
}

const depthProof = [75, 100, 120, 150].map((sector) => {
  const state = makeState(sector, { seed: `depth-proof-${sector}` });
  const shaped = shapeHighSectorWaves(baseWaves, state);
  return {
    sector,
    profile: state.tacticalDepthProfile.id,
    formations: shaped.map((wave) => wave.formation),
    tactics: shaped.map((wave) => wave.tactic),
    counts: shaped.map((wave) => wave.count),
    reliefMs: shaped[4].highSectorPreCombatReliefMs
  };
});
assert.equal(new Set(depthProof.map((entry) => entry.profile)).size, 4);
assert.equal(new Set(depthProof.map((entry) => entry.formations.join('|'))).size, 4);
assert.equal(new Set(depthProof.map((entry) => entry.tactics.join('|'))).size, 4);
assert.deepEqual(depthProof[0].counts, depthProof[3].counts, 'depth presets must not add raw entities');

await assert.rejects(
  async () => shapeHighSectorWaves([...baseWaves, { ...baseWaves[0] }], makeState(75)),
  /exactly 5 preplanned waves/,
  'the planner must reject a longer list instead of trimming it'
);
const escalationSource = await readFile(new URL('../src/config/HighSectorEscalation.js', import.meta.url), 'utf8');
assert.equal(/slice\(\s*0\s*,\s*5\s*\)/.test(escalationSource), false, 'authored planning must not use slice(0, 5)');

assert.equal(capHighSectorBossHealth(450, sector80), config.maxBossHealth);
assert.equal(capHighSectorBossHealth(220, sector80), 220, 'boss cap must never increase health');
assert.equal(capHighSectorBossHealth(450, inactive), 450);

const screen = { width: 1000, height: 1000 };
const activeHazards = [
  { id: 'existing-a', kind: 'cone', length: 1000, spread: 0.18, elapsedMs: 100, durationMs: 1000 },
  { id: 'existing-b', kind: 'beam', length: 1000, radius: 45, elapsedMs: 100, durationMs: 1000 }
];
assert.ok(getAggregateHighSectorHazardRatio(activeHazards, screen.width, screen.height) > 0.17);
const candidate = { id: 'candidate', kind: 'ring', outerRadius: 420, innerRadius: 120, safeWedge: 0.5 };
const aggregateResult = applyAggregateHighSectorHazardBudget({
  hazard: candidate,
  activeHazards,
  ...screen,
  maxRatio: 0.42
});
assert.equal(aggregateResult.accepted, true);
assert.ok(aggregateResult.aggregateAfterRatio <= 0.42);
assert.equal(candidate.highSectorAreaCap.safeCorridorPreserved, true);
const exhaustedResult = applyAggregateHighSectorHazardBudget({
  hazard: { id: 'too-small', kind: 'beam', length: 1000, radius: 20 },
  activeHazards: [
    { id: 'full', kind: 'cone', length: 1000, spread: 0.84, elapsedMs: 0, durationMs: 1000 }
  ],
  ...screen,
  maxRatio: 0.42
});
assert.equal(exhaustedResult.accepted, false);
assert.equal(exhaustedResult.rejectedReason, 'aggregate_budget_exhausted');

const sourceKeys = [
  'DEEP SPACE PROTOCOL',
  ...HIGH_SECTOR_PROTOCOLS.flatMap((protocol) => [protocol.name, protocol.cue]),
  ...HIGH_SECTOR_ENCOUNTER_BEATS.flatMap((beat) => [beat.name, beat.objective]),
  'BEAT {current}/{total} // {objective}',
  'FRONT SHIFT INBOUND // SAFE SIDE: {side}',
  'FRONT SHIFT // SAFE SIDE: {side}',
  'BOSS SUPPORT INTERCEPT',
  'ORDINARY SUPPORT INBOUND // SAFE LANE: {side}',
  'LEFT',
  'RIGHT'
];
for (const locale of ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
  const entries = getHighSectorSourceText(locale);
  for (const key of sourceKeys) {
    assert.ok(entries[key], `${locale} missing high-sector translation: ${key}`);
    assert.notEqual(entries[key], key, `${locale} left source English untranslated: ${key}`);
  }
  const interpolated = translateTextForLocale(locale, 'ORDINARY SUPPORT INBOUND // SAFE LANE: {side}', {
    side: translateTextForLocale(locale, 'LEFT')
  });
  assert.equal(interpolated.includes('{side}'), false, `${locale} must interpolate the boss-support safe side`);
  const beat = translateTextForLocale(locale, 'BEAT {current}/{total} // {objective}', {
    current: 2,
    total: 5,
    objective: translateTextForLocale(locale, 'BREAK THE PRIORITY TARGET')
  });
  assert.equal(beat.includes('{objective}'), false, `${locale} must interpolate the compact objective strip`);
}

console.log('High-sector escalation contract check passed.');
console.log(JSON.stringify({
  enabledByDefault: config.enabled,
  inertThroughSector: sector60.inertThroughSector,
  protocols: HIGH_SECTOR_PROTOCOLS.map((protocol) => protocol.id),
  schedule: schedule.slice(0, 6).map(({ sector, protocol }) => ({ sector, protocol: protocol.id })),
  depthProof,
  sector150: {
    pressureBudget: sector150.pressureBudget,
    downtime: sector150.downtime,
    caps: sector150.caps,
    authoredEncounterBeatCount: sector150.authoredEncounterBeatCount
  },
  aggregateHazardProof: candidate.highSectorAreaCap,
  locales: ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']
}, null, 2));
