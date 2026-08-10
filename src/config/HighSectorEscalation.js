const PROTOCOL_CADENCE = 5;
const PROTOCOL_START_SECTOR = 75;
const PROTOCOL_REPEAT_WINDOW_SECTORS = 15;
const AUTHORED_BEAT_COUNT = 5;
const CONDITION_READ_MS = 1200;

export const HIGH_SECTOR_ENCOUNTER_BEATS = Object.freeze([
  Object.freeze({
    id: 'opening_read',
    name: 'OPENING READ',
    objective: 'READ THE FORMATION',
    countScalar: 0.72,
    cadence: 0.94,
    fireScalar: 0.72,
    fireDelayMult: 1.24
  }),
  Object.freeze({
    id: 'priority_problem',
    name: 'PRIORITY PROBLEM',
    objective: 'BREAK THE PRIORITY TARGET',
    countScalar: 0.56,
    cadence: 0.98,
    fireScalar: 0.64,
    fireDelayMult: 1.3
  }),
  Object.freeze({
    id: 'coordinated_escalation',
    name: 'COORDINATED ESCALATION',
    objective: 'HOLD THE OPEN LANE',
    countScalar: 0.84,
    cadence: 1.08,
    fireScalar: 0.78,
    fireDelayMult: 1.18
  }),
  Object.freeze({
    id: 'conversion_relief',
    name: 'CONVERSION OR RELIEF',
    objective: 'RELIEF WINDOW // RESET POSITION',
    countScalar: 0.46,
    cadence: 0.86,
    fireScalar: 0.48,
    fireDelayMult: 1.52
  }),
  Object.freeze({
    id: 'climax_boss_lead_in',
    name: 'CLIMAX AND BOSS LEAD-IN',
    objective: 'MASTER THE RULE // BOSS NEXT',
    countScalar: 0.88,
    cadence: 1.1,
    fireScalar: 0.8,
    fireDelayMult: 1.16
  })
]);

const TACTICAL_DEPTH_PROFILES = Object.freeze([
  Object.freeze({
    id: 'sector_75_first_contact',
    minSector: 75,
    formations: Object.freeze(['STAGGERED_WING', 'V_SHAPE', 'DOUBLE_ARC', 'ARC', 'CROSS_STREAM']),
    tactics: Object.freeze(['comet_queue', 'mirror_zipper', 'lunar_turnpike', 'paperclip_parade', 'traffic_court']),
    reliefMs: 1800
  }),
  Object.freeze({
    id: 'sector_100_lane_relay',
    minSector: 100,
    formations: Object.freeze(['SIDEWINDER', 'SCREEN_DOOR', 'CROSS_STREAM', 'ARC', 'DOUBLE_ARC']),
    tactics: Object.freeze(['sidewinder_choir', 'traffic_court', 'forklift_lattice', 'comet_queue', 'lunar_turnpike']),
    reliefMs: 1600
  }),
  Object.freeze({
    id: 'sector_120_split_rhythm',
    minSector: 120,
    formations: Object.freeze(['DOUBLE_ARC', 'PINCER', 'STAGGERED_WING', 'V_SHAPE', 'SCREEN_DOOR']),
    tactics: Object.freeze(['orbit_receiving_line', 'neon_jury', 'mirror_zipper', 'paperclip_parade', 'traffic_court']),
    reliefMs: 1450
  }),
  Object.freeze({
    id: 'sector_150_frontier_rotation',
    minSector: 150,
    formations: Object.freeze(['ORBIT_RING', 'SIDEWINDER', 'CROSS_STREAM', 'ARC', 'PINCER']),
    tactics: Object.freeze(['receipt_spiral', 'sidewinder_choir', 'lunar_turnpike', 'comet_queue', 'neon_jury']),
    reliefMs: 1300
  })
]);

export const HIGH_SECTOR_PROTOCOLS = Object.freeze([
  Object.freeze({
    id: 'tractor_intercept',
    name: 'TRACTOR INTERCEPT',
    cue: 'ONE TRACTOR // MARKED ESCAPE LANE',
    forcedThreatActionIds: Object.freeze(['brake_dash_bolt']),
    priorityEliteId: 'nova_elite_tractor_puller'
  }),
  Object.freeze({
    id: 'escort_debt',
    name: 'ESCORT DEBT',
    cue: 'BREAK THE TETHER // THEN THE FORMATION',
    forcedThreatActionIds: Object.freeze(['crossfire_pair']),
    priorityEliteId: 'nova_elite_shield_projector'
  }),
  Object.freeze({
    id: 'shifting_front',
    name: 'SHIFTING FRONT',
    cue: 'THE SAFE SIDE WILL SHIFT AFTER THE WARNING',
    forcedThreatActionIds: Object.freeze(['lane_cutter']),
    priorityEliteId: 'nova_elite_sniper_rail'
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

function getTacticalDepthProfile(sector) {
  const safeSector = Math.max(PROTOCOL_START_SECTOR, Math.floor(Number(sector) || PROTOCOL_START_SECTOR));
  return [...TACTICAL_DEPTH_PROFILES]
    .reverse()
    .find((profile) => safeSector >= profile.minSector) || TACTICAL_DEPTH_PROFILES[0];
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

function createAuthoredBossSupportEvent({ config, sector, seed }) {
  const formations = ['ARC', 'STAGGERED_WING', 'DOUBLE_ARC'];
  const tactics = ['comet_queue', 'paperclip_parade', 'sidewinder_choir'];
  const selection = Math.floor(seededUnit(seed, `boss-support:${sector}`) * formations.length) % formations.length;
  const safeSide = seededUnit(seed, `boss-support-safe-side:${sector}`) < 0.5 ? 'left' : 'right';
  return {
    id: 'authored_ordinary_support_intercept',
    name: 'BOSS SUPPORT INTERCEPT',
    cue: 'ORDINARY SUPPORT INBOUND // SAFE LANE: {side}',
    warningDelayMs: 900,
    warningLeadMs: Math.max(1400, Number(config.bossSupportWarningLeadMs) || 1600),
    count: 3,
    formation: formations[selection],
    tactic: tactics[selection],
    safeSide,
    safeCorridorRatio: 0.32,
    entryDurationMs: Math.max(1080, Number(config.minEntryDurationMs) || 1080),
    eventBudget: 1,
    ordinaryEnemiesOnly: true,
    suppressRandomBossSupport: true,
    allowHealing: false,
    allowLossOfControl: false,
    allowLaneDenial: false,
    bossHealthMultiplier: 1
  };
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
  const depthProfile = protocol ? getTacticalDepthProfile(safeSector) : null;
  const bossSupportEvent = active ? createAuthoredBossSupportEvent({ config, sector: safeSector, seed }) : null;

  return {
    profileId: config.id || 'high_sector_authored_v2',
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
    tacticalDepthProfile: depthProfile ? { ...depthProfile, formations: [...depthProfile.formations], tactics: [...depthProfile.tactics] } : null,
    bossSupportEvent,
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
    authoredEncounterLimit: protocol
      ? Math.max(AUTHORED_BEAT_COUNT, Math.floor(Number(config.authoredEncounterLimit) || AUTHORED_BEAT_COUNT))
      : null,
    authoredEncounterBeatCount: protocol ? AUTHORED_BEAT_COUNT : null,
    conditionReadMs: protocol ? CONDITION_READ_MS : null
  };
}

function clearGeneratedThreatPlans(wave) {
  const {
    eliteMiddleShipId: _eliteMiddleShipId,
    multiEliteMiddleShipIds: _multiEliteMiddleShipIds,
    multiEliteCompensation: _multiEliteCompensation,
    dangerMidShipIds: _dangerMidShipIds,
    ...clean
  } = wave || {};
  return clean;
}

function applyProtocolBeat(shaped, protocol, beat, beatIndex) {
  if (beat.id === 'priority_problem' || beat.id === 'climax_boss_lead_in') {
    shaped.eliteMiddleShipId = protocol.priorityEliteId;
    shaped.eliteHealthScalar = protocol.id === 'tractor_intercept' ? 0.54 : 0.68;
    shaped.eliteFireDelayMult = 1.34;
    shaped.eliteSpecialDelayMs = beat.id === 'priority_problem' ? 400 : 700;
    shaped.highSectorPriorityTargetXRatio = 0.5;
  }

  if (protocol.id === 'tractor_intercept' && shaped.eliteMiddleShipId === 'nova_elite_tractor_puller') {
    shaped.highSectorTractorContract = {
      id: 'single_locked_tractor_lane_v1',
      warningLeadMs: 1400,
      activeMs: 1100,
      recoveryMs: 7200,
      breakHoldMs: 260,
      beamHalfWidthPx: 42,
      escapeSide: protocol.initialSafeSide,
      escapeLaneRatio: 0.32,
      maxLossOfControlSources: 1,
      priorityTargetXRatio: 0.5,
      deterministic: true,
      appliesRandomDebuff: false,
      allowsMineLayer: false,
      allowsForcedLaneShift: false
    };
  }

  if (protocol.id === 'shifting_front' && (beatIndex === 0 || beatIndex === 4)) {
    shaped.highSectorShift = {
      warningAtMs: 1800,
      shiftAtMs: 3400,
      initialSafeSide: protocol.initialSafeSide,
      shiftedSafeSide: protocol.shiftedSafeSide
    };
  }

  return shaped;
}

export function shapeHighSectorWaves(waves, state) {
  if (!Array.isArray(waves) || !state?.active || !state.protocol) return waves;
  if (waves.length !== AUTHORED_BEAT_COUNT) {
    throw new Error(`High-sector authored encounters require exactly ${AUTHORED_BEAT_COUNT} preplanned waves; received ${waves.length}.`);
  }

  const depth = state.tacticalDepthProfile || getTacticalDepthProfile(state.sector);
  return waves.map((wave, index) => {
    const beat = HIGH_SECTOR_ENCOUNTER_BEATS[index];
    const baseCount = Math.max(1, Math.floor(Number(wave?.count) || 1));
    const clean = clearGeneratedThreatPlans(wave);
    const shaped = {
      ...clean,
      count: Math.max(3, Math.round(baseCount * beat.countScalar)),
      formation: depth.formations[index],
      tactic: depth.tactics[index],
      entry: index % 2 === 0 ? 'split' : 'alternating',
      cadence: beat.cadence,
      forcedThreatActionIds: [...state.protocol.forcedThreatActionIds],
      threatBudgetModifiers: {
        dangerBudgetBonus: 0,
        maxActiveBonus: 0,
        plannedActionBonus: 0
      },
      highSectorProtocolId: state.protocol.id,
      highSectorAuthoredEncounter: true,
      highSectorPressureBudget: state.pressureBudget,
      highSectorPressureStep: state.pressureStep,
      highSectorTacticalDepthProfile: depth.id,
      highSectorBeatIndex: index,
      highSectorBeatNumber: index + 1,
      highSectorBeatId: beat.id,
      highSectorBeatName: beat.name,
      highSectorObjective: beat.objective,
      highSectorConditionReadMs: CONDITION_READ_MS,
      highSectorBriefingAnnounceMs: index === 0 ? 1150 : 260,
      highSectorPreCombatReliefMs: beat.id === 'climax_boss_lead_in' ? depth.reliefMs : 0,
      highSectorNonPhaseEscapeSide: state.protocol.initialSafeSide,
      highSectorTacticOverrides: {
        fireScalar: beat.fireScalar,
        fireDelayMult: beat.fireDelayMult
      }
    };
    return applyProtocolBeat(shaped, state.protocol, beat, index);
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
