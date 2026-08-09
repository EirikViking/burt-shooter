import assert from 'node:assert/strict';

import { BalanceConfig } from '../src/config/BalanceConfig.js';
import {
  HIGH_SECTOR_PROTOCOLS,
  capHighSectorBossHealth,
  createHighSectorEscalationState,
  getHighSectorProtocolSchedule,
  shapeHighSectorWaves,
  validateHighSectorProtocolWindow
} from '../src/config/HighSectorEscalation.js';
import { getHighSectorSourceText } from '../src/i18n/highSectorSourceText.js';
import { translateTextForLocale } from '../src/i18n/index.js';
import {
  DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS,
  HIGH_SECTOR_PROTOTYPE_QUICK_START_SECTOR,
  getHighSectorPrototypeSettings,
  saveHighSectorPrototypeSettings
} from '../src/config/HighSectorPrototypeSettings.js';

const config = BalanceConfig.difficulty.highSectorEscalation;
const seed = 'high-sector-fairness-seed-20260809';
const makeState = (sector, options = {}) => createHighSectorEscalationState({
  config,
  armed: true,
  sector,
  seed,
  runMode: options.runMode || 'ranked',
  reducedMotion: options.reducedMotion === true
});

assert.equal(config.enabled, false, 'the profile must stay disabled by default');
const prototypeStorageValues = new Map();
const prototypeStorage = {
  getItem: (key) => prototypeStorageValues.get(key) ?? null,
  setItem: (key, value) => prototypeStorageValues.set(key, value)
};
assert.deepEqual(getHighSectorPrototypeSettings({ storage: prototypeStorage }), DEFAULT_HIGH_SECTOR_PROTOTYPE_SETTINGS);
assert.deepEqual(
  saveHighSectorPrototypeSettings({ quickStart: true }, { storage: prototypeStorage, dispatch: false }),
  { enabled: true, quickStart: true },
  'Quick Start must arm the prototype'
);
assert.deepEqual(
  saveHighSectorPrototypeSettings({ enabled: false }, { storage: prototypeStorage, dispatch: false }),
  { enabled: false, quickStart: false },
  'disabling the prototype must also disable Quick Start'
);
assert.equal(HIGH_SECTOR_PROTOTYPE_QUICK_START_SECTOR, 75);
for (const sector of [1, 25, 50]) {
  const state = makeState(sector);
  assert.equal(state.active, false, `armed profile must remain inert at Sector ${sector}`);
  assert.equal(state.protocol, null);
  assert.equal(state.caps, null);
  assert.equal(state.downtime, null);
}
assert.equal(createHighSectorEscalationState({ config, armed: false, sector: 130, seed }).active, false);

const sector60 = makeState(60);
const sector80 = makeState(80);
const sector130 = makeState(130);
assert.equal(sector60.active, true);
assert.equal(sector60.pressureBudget, 1);
assert.equal(sector80.bossModifier?.id, 'ascendant_support_formation');
assert.equal(sector80.bossModifier?.healthMultiplier, 1, 'support modifier must not inflate boss health');
assert.equal(sector130.bossModifier, null, 'the first-slice boss modifier is Sector 80 only');
assert.ok(sector130.pressureBudget <= config.pressureBudgetMax);
assert.ok(sector130.downtime.briefingMs >= config.minimumBriefingMs);
assert.ok(sector130.downtime.cleanupMs >= config.minimumCleanupMs);
assert.equal(sector130.caps.maxHostileProjectiles, 48);
assert.equal(sector130.caps.maxHazardAreaRatio, 0.42);

const scheduleSectors = Array.from({ length: 12 }, (_, index) => 75 + index * 5);
const schedule = getHighSectorProtocolSchedule(seed, scheduleSectors);
assert.equal(validateHighSectorProtocolWindow(schedule), true, 'protocols must not repeat within twenty sectors');
assert.equal(new Set(schedule.slice(0, 4).map((entry) => entry.protocol.id)).size, 4);
assert.deepEqual(
  schedule.map((entry) => entry.protocol.id),
  getHighSectorProtocolSchedule(seed, scheduleSectors).map((entry) => entry.protocol.id),
  'same seed and sectors must reproduce the protocol schedule'
);
for (let index = 4; index < schedule.length; index += 1) {
  assert.equal(schedule[index].protocol.id, schedule[index - 4].protocol.id);
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

const baseWaves = Array.from({ length: 8 }, (_, index) => ({
  count: 8 + index,
  formation: 'GRID',
  tactic: 'baseline',
  cadence: 1
}));
const inactive = makeState(50);
assert.equal(shapeHighSectorWaves(baseWaves, inactive), baseWaves, 'Sector 50 shaping must be a strict no-op');
assert.equal(shapeHighSectorWaves(baseWaves, createHighSectorEscalationState({ config, sector: 130, seed })), baseWaves);

for (const entry of schedule.slice(0, HIGH_SECTOR_PROTOCOLS.length)) {
  const state = makeState(entry.sector);
  const shaped = shapeHighSectorWaves(baseWaves, state);
  assert.equal(shaped.length, entry.sector > 80 ? config.authoredEncounterLimit : baseWaves.length);
  const focal = shaped[Math.floor(shaped.length / 2)];
  assert.equal(focal.highSectorProtocolId, entry.protocol.id);
  assert.equal(focal.highSectorNonPhaseEscapeSide, entry.protocol.initialSafeSide);
  if (entry.protocol.id === 'hunter_pair') {
    assert.equal(focal.multiEliteMiddleShipIds.length, 2);
    assert.ok(focal.count < baseWaves[Math.floor(baseWaves.length / 2)].count);
  }
  if (entry.protocol.id === 'shifting_front') {
    assert.ok(focal.highSectorShift.shiftAtMs > focal.highSectorShift.warningAtMs);
  }
}

assert.equal(capHighSectorBossHealth(450, sector80), config.maxBossHealth);
assert.equal(capHighSectorBossHealth(220, sector80), 220, 'boss cap must never increase health');
assert.equal(capHighSectorBossHealth(450, inactive), 450);

const sourceKeys = ['DEEP SPACE PROTOCOL', ...HIGH_SECTOR_PROTOCOLS.flatMap((protocol) => [protocol.name, protocol.cue]),
  'FRONT SHIFT INBOUND // SAFE SIDE: {side}', 'FRONT SHIFT // SAFE SIDE: {side}',
  'ASCENDANT SUPPORT FORMATION', 'SUPPORT FORMATION INBOUND // BREAK THE TETHER', 'LEFT', 'RIGHT',
  'GENERAL', 'PLAYBACK', 'VOLUME', 'INTENSITY', 'VISUAL ASSISTS', 'PROTOTYPE',
  'LATE-GAME PROTOTYPE', 'ENABLE PROTOTYPE', 'JUMP TO SECTOR 75', 'WHAT TO EXPECT',
  'In Mayhem and Overrun, prototype pressure starts at Sector 60. Deep Space Protocols begin at Sector 75.',
  'Quick Start launches Sector {sector} with five fixed upgrades.',
  'Prototype runs are unranked. Leaderboards, achievements, checkpoints, and career progress are disabled.'];
const identityTranslations = new Set(['es:GENERAL', 'pt-BR:VOLUME']);
for (const locale of ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
  const entries = getHighSectorSourceText(locale);
  for (const key of sourceKeys) {
    assert.ok(entries[key], `${locale} missing high-sector translation: ${key}`);
    if (!identityTranslations.has(`${locale}:${key}`)) {
      assert.notEqual(entries[key], key, `${locale} left source English untranslated: ${key}`);
    }
  }
  const interpolated = translateTextForLocale(locale, 'FRONT SHIFT INBOUND // SAFE SIDE: {side}', {
    side: translateTextForLocale(locale, 'LEFT')
  });
  assert.equal(interpolated.includes('{side}'), false, `${locale} must interpolate the safe-side cue`);
}

console.log('High-sector escalation contract check passed.');
console.log(JSON.stringify({
  enabledByDefault: config.enabled,
  inertThroughSector: sector60.inertThroughSector,
  schedule: schedule.slice(0, 8).map(({ sector, protocol }) => ({ sector, protocol: protocol.id })),
  sector130: {
    pressureBudget: sector130.pressureBudget,
    downtime: sector130.downtime,
    caps: sector130.caps,
    authoredEncounterLimit: sector130.authoredEncounterLimit
  },
  locales: ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']
}, null, 2));
