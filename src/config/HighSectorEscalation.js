const PROTOCOL_CADENCE = 5;
const PROTOCOL_START_SECTOR = 75;
const PROTOCOL_REPEAT_WINDOW_SECTORS = 20;

export const HIGH_SECTOR_PROTOCOLS = Object.freeze([
  Object.freeze({
    id: 'crossfire_doctrine',
    name: 'CROSSFIRE DOCTRINE',
    cue: 'LINKED LANES // KEEP ONE EXIT OPEN',
    formation: 'CROSS_STREAM',
    tactic: 'lunar_turnpike',
    forcedThreatActionIds: Object.freeze(['crossfire_pair', 'lane_cutter'])
  }),
  Object.freeze({
    id: 'hunter_pair',
    name: 'HUNTER PAIR',
    cue: 'PAIRED HUNTERS // BREAK THE PINCER',
    formation: 'PINCER',
    tactic: 'mirror_zipper',
    forcedThreatActionIds: Object.freeze(['shotgun_fan_feint', 'brake_dash_bolt'])
  }),
  Object.freeze({
    id: 'escort_debt',
    name: 'ESCORT DEBT',
    cue: 'BREAK THE TETHER // THEN THE PRIORITY THREAT',
    formation: 'SCREEN_DOOR',
    tactic: 'traffic_court',
    forcedThreatActionIds: Object.freeze(['lane_cutter', 'crossfire_pair'])
  }),
  Object.freeze({
    id: 'shifting_front',
    name: 'SHIFTING FRONT',
    cue: 'THE SAFE SIDE WILL SHIFT AFTER THE WARNING',
    formation: 'STAGGERED_WING',
    tactic: 'weave_wall',
    forcedThreatActionIds: Object.freeze(['lane_cutter'])
  })
]);

const PROTOCOL_BY_ID = new Map(HIGH_SECTOR_PROTOCOLS.map((protocol) => [protocol.id, protocol]));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value ?? 'nova-swarm')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed, salt) {
  return hashString(`${seed}:${salt}`) / 0x100000000;
}

function getSeededProtocolDeck(seed) {
  const deck = HIGH_SECTOR_PROTOCOLS.map((protocol) => protocol.id);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(seededUnit(seed, `protocol-deck:${index}`) * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

export function isHighSectorProtocolSector(sector) {
  const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
  return safeSector >= PROTOCOL_START_SECTOR && (safeSector - PROTOCOL_START_SECTOR) % PROTOCOL_CADENCE === 0;
}

export function getHighSectorProtocolForSector(seed, sector) {
  const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
  if (!isHighSectorProtocolSector(safeSector)) return null;
  const deck = getSeededProtocolDeck(seed);
  const sequenceIndex = Math.floor((safeSector - PROTOCOL_START_SECTOR) / PROTOCOL_CADENCE);
  const id = deck[sequenceIndex % deck.length];
  const protocol = PROTOCOL_BY_ID.get(id);
  const initialSafeSide = seededUnit(seed, `safe-side:${safeSector}:${id}`) < 0.5 ? 'left' : 'right';
  return protocol ? {
    ...protocol,
    forcedThreatActionIds: [...protocol.forcedThreatActionIds],
    sequenceIndex,
    initialSafeSide,
    shiftedSafeSide: initialSafeSide === 'left' ? 'right' : 'left',
    repeatDistanceSectors: PROTOCOL_REPEAT_WINDOW_SECTORS
  } : null;
}

export function getHighSectorProtocolSchedule(seed, sectors = [75, 80, 85, 90, 95, 100]) {
  return sectors.map((sector) => ({
    sector,
    protocol: getHighSectorProtocolForSector(seed, sector)
  }));
}

export function createHighSectorEscalationState({
  config = {},
  armed = false,
  sector = 1,
  seed = 'nova-swarm',
  reducedMotion = false,
  runMode = 'ranked'
} = {}) {
  const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
  const activationSector = Math.max(51, Math.floor(Number(config.activationSector) || 60));
  const active = Boolean(armed && safeSector >= activationSector);
  const pressureStep = active ? Math.max(0, Math.floor((safeSector - activationSector) / 5)) : 0;
  const pressureBudget = active
    ? clamp(1 + pressureStep * (Number(config.pressureBudgetPerFiveSectors) || 0.05), 1, Number(config.pressureBudgetMax) || 1.45)
    : 1;
  const protocol = active ? getHighSectorProtocolForSector(seed, safeSector) : null;
  const bossModifier = active && safeSector === 80
    ? {
      id: 'ascendant_support_formation',
      name: 'ASCENDANT SUPPORT FORMATION',
      cue: 'SUPPORT FORMATION INBOUND // BREAK THE TETHER',
      supportCount: Math.max(1, Math.min(3, Math.floor(Number(config.ascendantSupportCount) || 2))),
      healthMultiplier: 1,
      warningLeadMs: Math.max(1200, Number(config.ascendantWarningLeadMs) || 1800),
      nonPhaseEscapeSide: protocol?.initialSafeSide || (seededUnit(seed, 'ascendant-safe-side:80') < 0.5 ? 'left' : 'right')
    }
    : null;

  return {
    profileId: config.id || 'high_sector_first_slice_v1',
    enabledByDefault: config.enabled === true,
    armed: Boolean(armed),
    active,
    inertThroughSector: activationSector - 1,
    activationSector,
    sector: safeSector,
    seed: String(seed),
    runMode,
    reducedMotion: Boolean(reducedMotion),
    pressureStep,
    pressureBudget,
    protocol,
    bossModifier,
    caps: active ? {
      maxHostileProjectiles: Math.max(24, Math.floor(Number(config.maxHostileProjectiles) || 48)),
      maxHazardAreaRatio: clamp(config.maxHazardAreaRatio || 0.42, 0.2, 0.7),
      minEntryDurationMs: Math.max(900, Math.floor(Number(config.minEntryDurationMs) || 1080)),
      maxBossHealth: Math.max(180, Math.floor(Number(config.maxBossHealth) || 280))
    } : null,
    downtime: active ? {
      briefingMs: Math.max(
        Number(config.minimumBriefingMs) || 520,
        Math.round((Number(config.baseBriefingMs) || 740) - pressureStep * (Number(config.briefingCompressionPerStepMs) || 18))
      ),
      cleanupMs: Math.max(
        Number(config.minimumCleanupMs) || 460,
        Math.round((Number(config.baseCleanupMs) || 680) - pressureStep * (Number(config.cleanupCompressionPerStepMs) || 16))
      ),
      announceMs: Math.max(220, Math.floor(Number(config.minimumAnnouncementMs) || 260))
    } : null,
    authoredEncounterLimit: active && safeSector > 80
      ? Math.max(4, Math.floor(Number(config.authoredEncounterLimit) || 5))
      : null
  };
}

function focalWaveIndex(waves) {
  return Math.max(0, Math.min(waves.length - 1, Math.floor(waves.length / 2)));
}

function shapeProtocolWave(wave, protocol, state) {
  if (!protocol) return wave;
  const pressureBonus = Math.max(1, state.pressureBudget);
  const shaped = {
    ...wave,
    formation: protocol.formation,
    tactic: protocol.tactic,
    cadence: clamp((Number(wave.cadence) || 1) * Math.min(1.16, 1 + (pressureBonus - 1) * 0.32), 0.82, 1.55),
    forcedThreatActionIds: [...protocol.forcedThreatActionIds],
    threatBudgetModifiers: {
      ...(wave.threatBudgetModifiers || {}),
      dangerBudgetBonus: Math.min(4, 1 + Math.floor(state.pressureStep / 2)),
      maxActiveBonus: Math.min(2, Math.floor(state.pressureStep / 3)),
      plannedActionBonus: Math.min(3, 1 + Math.floor(state.pressureStep / 3))
    },
    highSectorProtocolId: protocol.id,
    highSectorAuthoredEncounter: true,
    highSectorNonPhaseEscapeSide: protocol.initialSafeSide
  };

  if (protocol.id === 'hunter_pair') {
    shaped.count = Math.max(4, Math.round((Number(wave.count) || 8) * 0.62));
    shaped.multiEliteMiddleShipIds = ['nova_elite_tractor_puller', 'nova_elite_mine_layer'];
    shaped.multiEliteCompensation = {
      normalCountBefore: Number(wave.count) || 8,
      normalCountAfter: shaped.count,
      normalFireScalar: 0.56,
      normalFireDelayMult: 1.28,
      eliteHealthScalar: 0.56,
      eliteFireDelayMult: 1.62,
      eliteTacticFireScalar: 0.46,
      specialDelayStepMs: 2800
    };
  } else if (protocol.id === 'escort_debt') {
    shaped.eliteMiddleShipId = 'nova_elite_shield_projector';
    shaped.eliteHealthScalar = 0.74;
    shaped.eliteFireDelayMult = 1.18;
    shaped.dangerMidShipIds = [{ slot: Math.max(0, Math.floor((Number(shaped.count) || 6) / 2)), id: 'danger_mid_001' }];
  } else if (protocol.id === 'shifting_front') {
    shaped.highSectorShift = {
      warningAtMs: 3100,
      shiftAtMs: 5000,
      initialSafeSide: protocol.initialSafeSide,
      shiftedSafeSide: protocol.shiftedSafeSide
    };
  }
  return shaped;
}

export function shapeHighSectorWaves(waves, state) {
  if (!Array.isArray(waves) || !state?.active) return waves;
  const limited = state.authoredEncounterLimit && waves.length > state.authoredEncounterLimit
    ? waves.slice(0, state.authoredEncounterLimit)
    : [...waves];
  const focus = focalWaveIndex(limited);
  return limited.map((wave, index) => {
    const pressureBudgetModifiers = {
      ...(wave.threatBudgetModifiers || {}),
      dangerBudgetBonus: Math.max(0, Math.min(3, Math.floor(state.pressureStep / 2))),
      maxActiveBonus: Math.max(0, Math.min(2, Math.floor(state.pressureStep / 4))),
      plannedActionBonus: Math.max(0, Math.min(2, Math.floor(state.pressureStep / 3)))
    };
    const base = {
      ...wave,
      highSectorPressureBudget: state.pressureBudget,
      highSectorPressureStep: state.pressureStep,
      highSectorAuthoredEncounter: state.sector > 80,
      threatBudgetModifiers: pressureBudgetModifiers
    };
    return index === focus ? shapeProtocolWave(base, state.protocol, state) : base;
  });
}

export function capHighSectorBossHealth(health, state) {
  const safeHealth = Math.max(1, Math.round(Number(health) || 1));
  if (!state?.active || !state.caps) return safeHealth;
  return Math.min(safeHealth, state.caps.maxBossHealth);
}

export function validateHighSectorProtocolWindow(schedule) {
  const lastSectorById = new Map();
  for (const entry of schedule || []) {
    const id = entry?.protocol?.id;
    if (!id) continue;
    const previous = lastSectorById.get(id);
    if (Number.isFinite(previous) && entry.sector - previous < PROTOCOL_REPEAT_WINDOW_SECTORS) return false;
    lastSectorById.set(id, entry.sector);
  }
  return true;
}
