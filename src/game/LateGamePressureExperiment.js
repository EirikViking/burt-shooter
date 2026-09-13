import { RUN_MODES } from './RunMode.js';

export const LATE_GAME_PRESSURE_EXPERIMENT_VERSION = 'late-game-pressure-2026-08-10-a';
export const LATE_GAME_EXPERIMENT_LABEL = 'EXPERIMENTAL TEST // NO AWARDS';
export const LATE_GAME_EXPERIMENT_STANDARD_SECTORS = 10;
export const LATE_GAME_EXPERIMENT_START_SECTORS = Object.freeze([51, 60, 75, 100, 120, 150]);
export const LATE_GAME_EXPERIMENT_MATURE_LIVES = 12;
export const LATE_GAME_EXPERIMENT_PHASE_PULSE_MAX_RADIUS = 72;
export const LATE_GAME_EXPERIMENT_PHASE_PULSE_RECHARGE_MS = 2000;

export const LATE_GAME_EXPERIMENT_SCENARIOS = Object.freeze({
  STANDARD: 'standard',
  ENDURANCE: 'endurance'
});

export const LATE_GAME_EXPERIMENT_RULESETS = Object.freeze({
  PURE: 'pure',
  TACTICAL: 'tactical'
});

export const LATE_GAME_EXPERIMENT_LIFE_STOCKS = Object.freeze({
  THREE: 'three_lives',
  MATURE: 'mature_stock'
});

const FIXTURE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'pure_control',
    label: 'PURE CONTROL',
    ruleset: LATE_GAME_EXPERIMENT_RULESETS.PURE,
    description: 'Real Pure rules with zero Tactical augments.',
    baselineAugmentIds: Object.freeze([]),
    permanentPierceContract: 'none'
  }),
  Object.freeze({
    id: 'tactical_control_no_pierce',
    label: 'TACTICAL // NO PIERCE',
    ruleset: LATE_GAME_EXPERIMENT_RULESETS.TACTICAL,
    description: 'Mature Tactical control loadout without Pierce.',
    baselineAugmentIds: Object.freeze([
      'damage_up',
      'rapid_fire',
      'blink_drive',
      'focus_lens',
      'double_shot',
      'chain_lightning'
    ]),
    permanentPierceContract: 'none'
  }),
  Object.freeze({
    id: 'tactical_saturation_bounded',
    label: 'TACTICAL // BOUNDED PIERCE',
    ruleset: LATE_GAME_EXPERIMENT_RULESETS.TACTICAL,
    description: 'Mature saturation loadout with the two-hit Pierce comparison.',
    baselineAugmentIds: Object.freeze([
      'damage_up',
      'rapid_fire',
      'blink_drive',
      'focus_lens',
      'double_shot',
      'chain_lightning',
      'pierce'
    ]),
    permanentPierceContract: 'bounded'
  }),
  Object.freeze({
    id: 'tactical_saturation_unlimited',
    label: 'TACTICAL // UNLIMITED PIERCE',
    ruleset: LATE_GAME_EXPERIMENT_RULESETS.TACTICAL,
    description: 'Current unlimited permanent Pierce retained as a control fixture.',
    baselineAugmentIds: Object.freeze([
      'damage_up',
      'rapid_fire',
      'blink_drive',
      'focus_lens',
      'double_shot',
      'chain_lightning',
      'pierce'
    ]),
    permanentPierceContract: 'unlimited'
  })
]);

const FIXTURES_BY_ID = new Map(FIXTURE_DEFINITIONS.map((fixture) => [fixture.id, fixture]));

const PRESSURE_PROFILES = Object.freeze({
  51: Object.freeze({ id: 'sector_51_vocabulary_intro', elapsedSeconds: 900, tier: 'vocabulary_intro' }),
  60: Object.freeze({ id: 'sector_60_late_pressure', elapsedSeconds: 1200, tier: 'late_pressure' }),
  75: Object.freeze({ id: 'sector_75_canonical_overrun', elapsedSeconds: 1500, tier: 'overrun_pressure' }),
  100: Object.freeze({ id: 'sector_100_deep_control', elapsedSeconds: 1800, tier: 'deep_control' }),
  120: Object.freeze({ id: 'sector_120_deep_endurance', elapsedSeconds: 2100, tier: 'deep_endurance' }),
  150: Object.freeze({ id: 'sector_150_frontier', elapsedSeconds: 2400, tier: 'frontier' })
});

export const DEFAULT_LATE_GAME_EXPERIMENT_DRAFT = Object.freeze({
  scenario: LATE_GAME_EXPERIMENT_SCENARIOS.STANDARD,
  ruleset: LATE_GAME_EXPERIMENT_RULESETS.TACTICAL,
  fixtureId: 'tactical_saturation_bounded',
  startSector: 75,
  lifeStock: LATE_GAME_EXPERIMENT_LIFE_STOCKS.THREE,
  phasePulseAvailable: true
});

function normalizeEnum(value, values, fallback) {
  return values.includes(value) ? value : fallback;
}

function normalizeStartSector(value) {
  const candidate = Math.floor(Number(value) || 75);
  return LATE_GAME_EXPERIMENT_START_SECTORS.includes(candidate) ? candidate : 75;
}

export function getLateGameExperimentFixtures(ruleset = null) {
  const normalized = ruleset == null
    ? null
    : normalizeEnum(
        ruleset,
        Object.values(LATE_GAME_EXPERIMENT_RULESETS),
        LATE_GAME_EXPERIMENT_RULESETS.TACTICAL
      );
  return FIXTURE_DEFINITIONS
    .filter((fixture) => normalized == null || fixture.ruleset === normalized)
    .map((fixture) => ({ ...fixture, baselineAugmentIds: [...fixture.baselineAugmentIds] }));
}

export function getLateGameExperimentFixture(fixtureId) {
  const fixture = FIXTURES_BY_ID.get(fixtureId) || null;
  return fixture ? { ...fixture, baselineAugmentIds: [...fixture.baselineAugmentIds] } : null;
}

export function createDefaultLateGameExperimentDraft(overrides = {}) {
  return normalizeLateGameExperimentDraft({
    ...DEFAULT_LATE_GAME_EXPERIMENT_DRAFT,
    ...(overrides && typeof overrides === 'object' ? overrides : {})
  });
}

export function normalizeLateGameExperimentDraft(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  const scenario = normalizeEnum(
    raw.scenario,
    Object.values(LATE_GAME_EXPERIMENT_SCENARIOS),
    DEFAULT_LATE_GAME_EXPERIMENT_DRAFT.scenario
  );
  const requestedRuleset = normalizeEnum(
    raw.ruleset,
    Object.values(LATE_GAME_EXPERIMENT_RULESETS),
    DEFAULT_LATE_GAME_EXPERIMENT_DRAFT.ruleset
  );
  const compatibleFixtures = getLateGameExperimentFixtures(requestedRuleset);
  const fixture = compatibleFixtures.find((candidate) => candidate.id === raw.fixtureId)
    || compatibleFixtures.find((candidate) => candidate.id === DEFAULT_LATE_GAME_EXPERIMENT_DRAFT.fixtureId)
    || compatibleFixtures[0];
  const startSector = scenario === LATE_GAME_EXPERIMENT_SCENARIOS.STANDARD
    ? 75
    : normalizeStartSector(raw.startSector);
  const lifeStock = scenario === LATE_GAME_EXPERIMENT_SCENARIOS.STANDARD
    ? LATE_GAME_EXPERIMENT_LIFE_STOCKS.THREE
    : normalizeEnum(
        raw.lifeStock,
        Object.values(LATE_GAME_EXPERIMENT_LIFE_STOCKS),
        DEFAULT_LATE_GAME_EXPERIMENT_DRAFT.lifeStock
      );
  return {
    scenario,
    ruleset: requestedRuleset,
    fixtureId: fixture.id,
    startSector,
    lifeStock,
    phasePulseAvailable: requestedRuleset === LATE_GAME_EXPERIMENT_RULESETS.TACTICAL
      && raw.phasePulseAvailable !== false
  };
}

export function getLateGameExperimentPressureProfile(startSector = 75) {
  const sector = normalizeStartSector(startSector);
  return { ...PRESSURE_PROFILES[sector] };
}

export function createLateGamePressureExperimentRun(request = {}) {
  if (!request || typeof request !== 'object' || request.acknowledged !== true) return null;
  const draft = normalizeLateGameExperimentDraft(request);
  const fixture = getLateGameExperimentFixture(draft.fixtureId);
  if (!fixture) return null;
  const lives = draft.lifeStock === LATE_GAME_EXPERIMENT_LIFE_STOCKS.MATURE
    ? LATE_GAME_EXPERIMENT_MATURE_LIVES
    : 3;
  const pressureProfile = getLateGameExperimentPressureProfile(draft.startSector);
  const underlyingRunMode = draft.ruleset === LATE_GAME_EXPERIMENT_RULESETS.PURE
    ? RUN_MODES.RANKED
    : RUN_MODES.MAYHEM_TACTICAL;
  const baselineAugmentIds = [
    ...fixture.baselineAugmentIds,
    ...(draft.phasePulseAvailable && !fixture.baselineAugmentIds.includes('phase_wake')
      ? ['phase_wake']
      : [])
  ];
  const seed = [
    LATE_GAME_PRESSURE_EXPERIMENT_VERSION,
    draft.scenario,
    draft.startSector,
    draft.ruleset,
    draft.fixtureId,
    draft.lifeStock,
    draft.phasePulseAvailable ? 'pulse' : 'no-pulse'
  ].join(':');
  return {
    active: true,
    version: LATE_GAME_PRESSURE_EXPERIMENT_VERSION,
    label: LATE_GAME_EXPERIMENT_LABEL,
    scenario: draft.scenario,
    ruleset: draft.ruleset,
    underlyingRunMode,
    fixtureId: fixture.id,
    fixtureLabel: fixture.label,
    fixtureDescription: fixture.description,
    baselineAugmentIds,
    permanentPierceContract: fixture.permanentPierceContract,
    phasePulseAvailable: draft.phasePulseAvailable,
    phasePulse: {
      available: draft.phasePulseAvailable,
      maxRadius: LATE_GAME_EXPERIMENT_PHASE_PULSE_MAX_RADIUS,
      rechargeMs: LATE_GAME_EXPERIMENT_PHASE_PULSE_RECHARGE_MS
    },
    startSector: draft.startSector,
    endSectorExclusive: draft.scenario === LATE_GAME_EXPERIMENT_SCENARIOS.STANDARD
      ? draft.startSector + LATE_GAME_EXPERIMENT_STANDARD_SECTORS
      : null,
    lifeStock: draft.lifeStock,
    lives,
    pressureProfile,
    escalationActivationSector: 51,
    draftMode: draft.ruleset === LATE_GAME_EXPERIMENT_RULESETS.TACTICAL ? 'enabled' : 'disabled',
    seed,
    launchedAtMs: Date.now(),
    metrics: {
      sectorsCompleted: 0,
      deaths: 0,
      damageTaken: 0,
      pierceHits: 0,
      effectivePenetrationHits: 0,
      pierceDamage: 0,
      pierceHitsBySource: {},
      chainLightningOrigins: 0,
      pulseActivations: 0,
      pulseClears: 0,
      pulseRechargeBlocks: 0,
      pulseUnavailableDodges: 0,
      tractorPulls: 0,
      tractorBreaks: 0,
      tractorBreakTimeMs: 0,
      tractorRecoveryMs: 0,
      projectilePeak: 0,
      hazardPeak: 0,
      significantStalls: 0,
      waveSegments: []
    }
  };
}

export function isLateGamePressureExperimentActive(gameOrState) {
  const state = gameOrState?.lateGameExperiment || gameOrState;
  return state?.active === true && state?.version === LATE_GAME_PRESSURE_EXPERIMENT_VERSION;
}
