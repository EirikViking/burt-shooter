const RANKED_RUN_MODES = new Set(['ranked', 'ranked_tactical']);
const OVERRUN_RUN_MODES = new Set(['overrun_pure', 'overrun_tactical']);
const OVERRUN_START_SECTOR = 51;
const OVERRUN_CLEAR_SECTOR = 60;

export const SHIP_MASTERY_TIERS = Object.freeze({
  none: Object.freeze({ id: 'none', rank: 0, label: 'NO MEDAL', color: 0x718096 }),
  bronze: Object.freeze({ id: 'bronze', rank: 1, label: 'BRONZE', color: 0xd58a52 }),
  silver: Object.freeze({ id: 'silver', rank: 2, label: 'SILVER', color: 0xc8e7f2 }),
  gold: Object.freeze({ id: 'gold', rank: 3, label: 'GOLD', color: 0xffd15c })
});

const TIER_ORDER = Object.freeze([
  SHIP_MASTERY_TIERS.none,
  SHIP_MASTERY_TIERS.bronze,
  SHIP_MASTERY_TIERS.silver,
  SHIP_MASTERY_TIERS.gold
]);

function whole(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function iso(value) {
  const text = String(value || '').trim();
  return Number.isFinite(Date.parse(text)) ? text : null;
}

function normalizeShipId(value) {
  return String(value || '').trim().slice(0, 120);
}

const MASTERY_IDENTITY_DEFAULT = Object.freeze({
  key: 'balanced',
  accent: 0x66f6ff,
  spokes: 6,
  satellites: 2,
  phase: 0
});

const MASTERY_IDENTITY_PROFILES = Object.freeze({
  viking: Object.freeze({ accent: 0xffd15c, spokes: 6, satellites: 2, phase: 0.18 }),
  seraph: Object.freeze({ accent: 0xc89bff, spokes: 8, satellites: 6, phase: 0.72 }),
  sovereign: Object.freeze({ accent: 0x7df9ff, spokes: 8, satellites: 6, phase: 0.28 }),
  railbreaker: Object.freeze({ accent: 0xff8a62, spokes: 4, satellites: 0, phase: 0 }),
  aegis: Object.freeze({ accent: 0x66ffdd, spokes: 8, satellites: 2, phase: 0.08 }),
  speed: Object.freeze({ accent: 0x52f6ff, spokes: 5, satellites: 4, phase: 0.58 }),
  pressure: Object.freeze({ accent: 0xffd86b, spokes: 7, satellites: 3, phase: 0.36 }),
  precision: Object.freeze({ accent: 0x9dff8a, spokes: 4, satellites: 1, phase: 0.02 }),
  heavy: Object.freeze({ accent: 0xff6174, spokes: 5, satellites: 1, phase: 0.12 })
});

function normalizeIdentityKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Returns a deterministic visual identity derived from the ship's existing
 * art/trait metadata. It is presentation-only: mastery saves and gameplay
 * stats remain untouched.
 */
export function getShipMasteryIdentity(ship = {}) {
  const artStyle = normalizeIdentityKey(ship?.art?.hangarSignature?.style);
  const traitSlug = normalizeIdentityKey(ship?.traitSlug || ship?.trait?.slug);
  const role = normalizeIdentityKey(ship?.role);
  const key = artStyle || traitSlug || role || MASTERY_IDENTITY_DEFAULT.key;
  const profile = MASTERY_IDENTITY_PROFILES[key]
    || (/(speed|runner|skater|feint|spectral|needle)/.test(`${key} ${role}`) ? MASTERY_IDENTITY_PROFILES.speed : null)
    || (/(rail|scope|precision|cannon)/.test(`${key} ${role}`) ? MASTERY_IDENTITY_PROFILES.precision : null)
    || (/(heavy|hammer|guard|bulwark)/.test(`${key} ${role}`) ? MASTERY_IDENTITY_PROFILES.heavy : null)
    || (/(pressure|burst|overdrive|fan|tempo)/.test(`${key} ${role}`) ? MASTERY_IDENTITY_PROFILES.pressure : null)
    || MASTERY_IDENTITY_DEFAULT;
  const variantAccent = Number(ship?.visuals?.variant?.accent);
  return {
    key,
    accent: Number.isFinite(variantAccent) ? variantAccent : profile.accent,
    spokes: profile.spokes,
    satellites: profile.satellites,
    phase: profile.phase
  };
}

export function normalizeShipMasteryRecord(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const bestSector = Math.max(1, whole(source.bestSector ?? source.bestLevel, 1));
  const clears = whole(source.clears ?? source.runClears);
  return {
    ...source,
    runs: whole(source.runs),
    clears,
    overrunClears: whole(source.overrunClears),
    bestSector,
    bestScore: whole(source.bestScore),
    bestCombo: whole(source.bestCombo),
    bestBosses: whole(source.bestBosses ?? source.bossesKilled),
    totalBosses: whole(source.totalBosses),
    totalDamage: number(source.totalDamage),
    lastRunAt: iso(source.lastRunAt ?? source.updatedAt)
  };
}

export function getShipMasteryTier(record = {}) {
  const normalized = normalizeShipMasteryRecord(record);
  if (normalized.clears >= 1) return SHIP_MASTERY_TIERS.gold;
  if (normalized.bestSector >= 6) return SHIP_MASTERY_TIERS.silver;
  if (normalized.bestSector >= 3) return SHIP_MASTERY_TIERS.bronze;
  return SHIP_MASTERY_TIERS.none;
}

export function getNextShipMasteryGoal(record = {}) {
  const normalized = normalizeShipMasteryRecord(record);
  const tier = getShipMasteryTier(normalized);
  if (tier.id === 'none') {
    return {
      id: 'reach_sector',
      targetTier: SHIP_MASTERY_TIERS.bronze,
      current: Math.min(3, normalized.bestSector),
      target: 3,
      complete: normalized.bestSector >= 3
    };
  }
  if (tier.id === 'bronze') {
    return {
      id: 'reach_sector',
      targetTier: SHIP_MASTERY_TIERS.silver,
      current: Math.min(6, normalized.bestSector),
      target: 6,
      complete: normalized.bestSector >= 6
    };
  }
  if (tier.id === 'silver') {
    return {
      id: 'clear_run',
      targetTier: SHIP_MASTERY_TIERS.gold,
      current: Math.min(1, normalized.clears),
      target: 1,
      complete: normalized.clears >= 1
    };
  }
  return {
    id: 'complete',
    targetTier: SHIP_MASTERY_TIERS.gold,
    current: 1,
    target: 1,
    complete: true
  };
}

export function getShipMasteryView(record = {}, ship = null) {
  const normalized = normalizeShipMasteryRecord(record);
  const tier = getShipMasteryTier(normalized);
  const nextGoal = getNextShipMasteryGoal(normalized);
  return {
    ...normalized,
    tier,
    nextGoal,
    identity: ship ? getShipMasteryIdentity(ship) : null,
    medalCount: tier.rank,
    maxed: tier.id === 'gold'
  };
}

export function normalizeShipMasteryMap(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(
    Object.entries(source)
      .map(([shipId, record]) => [normalizeShipId(shipId), normalizeShipMasteryRecord(record)])
      .filter(([shipId]) => shipId)
  );
}

export function mergeShipMasteryMaps(localMap = {}, cloudMap = {}) {
  const local = normalizeShipMasteryMap(localMap);
  const cloud = normalizeShipMasteryMap(cloudMap);
  const ids = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  const merged = {};
  for (const shipId of ids) {
    const a = normalizeShipMasteryRecord(local[shipId]);
    const b = normalizeShipMasteryRecord(cloud[shipId]);
    const aTime = Date.parse(a.lastRunAt || '') || 0;
    const bTime = Date.parse(b.lastRunAt || '') || 0;
    merged[shipId] = {
      ...(aTime >= bTime ? b : a),
      ...(aTime >= bTime ? a : b),
      runs: Math.max(a.runs, b.runs),
      clears: Math.max(a.clears, b.clears),
      overrunClears: Math.max(a.overrunClears, b.overrunClears),
      bestSector: Math.max(a.bestSector, b.bestSector),
      bestScore: Math.max(a.bestScore, b.bestScore),
      bestCombo: Math.max(a.bestCombo, b.bestCombo),
      bestBosses: Math.max(a.bestBosses, b.bestBosses),
      totalBosses: Math.max(a.totalBosses, b.totalBosses),
      totalDamage: Math.max(a.totalDamage, b.totalDamage),
      lastRunAt: aTime >= bTime ? a.lastRunAt : b.lastRunAt
    };
  }
  return merged;
}

export function recordShipMasteryRun(rawMap = {}, summary = {}, {
  completedAt = new Date().toISOString()
} = {}) {
  const milestones = normalizeShipMasteryMap(rawMap);
  const shipId = normalizeShipId(summary.shipId || summary.selectedShipSpriteKey);
  if (!shipId || !RANKED_RUN_MODES.has(String(summary.runMode || '').trim())) {
    return {
      milestones,
      shipId: shipId || null,
      previous: shipId ? getShipMasteryView(milestones[shipId]) : null,
      current: shipId ? getShipMasteryView(milestones[shipId]) : null,
      tierAdvanced: false,
      newTier: null,
      recorded: false
    };
  }

  const previousRecord = normalizeShipMasteryRecord(milestones[shipId]);
  const previous = getShipMasteryView(previousRecord);
  const nextRecord = normalizeShipMasteryRecord({
    ...previousRecord,
    runs: previousRecord.runs + 1,
    clears: previousRecord.clears + (summary.runCleared ? 1 : 0),
    bestSector: Math.max(previousRecord.bestSector, whole(summary.sectorReached ?? summary.levelReached, 1)),
    bestScore: Math.max(previousRecord.bestScore, whole(summary.finalScore ?? summary.score)),
    bestCombo: Math.max(previousRecord.bestCombo, whole(summary.bestComboCount)),
    bestBosses: Math.max(previousRecord.bestBosses, whole(summary.bossesKilled)),
    totalBosses: previousRecord.totalBosses + whole(summary.bossesKilled),
    totalDamage: Math.max(previousRecord.totalDamage, number(summary.combatTelemetry?.totalDamage)),
    lastRunAt: completedAt
  });
  milestones[shipId] = nextRecord;
  const current = getShipMasteryView(nextRecord);
  const tierAdvanced = current.tier.rank > previous.tier.rank;
  return {
    milestones,
    shipId,
    previous,
    current,
    tierAdvanced,
    newTier: tierAdvanced ? current.tier : null,
    recorded: true
  };
}

export function recordShipOverrunCompletion(rawMap = {}, summary = {}, {
  completedAt = new Date().toISOString()
} = {}) {
  const milestones = normalizeShipMasteryMap(rawMap);
  const shipId = normalizeShipId(summary.shipId || summary.selectedShipSpriteKey);
  const runMode = String(summary.runMode || '').trim();
  const startedAtOverrun = whole(summary.startSector, 1) === OVERRUN_START_SECTOR;
  const reachedFirstMilestone = whole(summary.sectorReached ?? summary.levelReached, 1) >= OVERRUN_CLEAR_SECTOR;
  const eligibleRun = summary.isDebugRun !== true
    && summary.runRewardsSuppressed !== true
    && summary.lateGameExperimentActive !== true
    && summary.quickStart !== true;
  const legitimateCompletion = Boolean(
    shipId
    && OVERRUN_RUN_MODES.has(runMode)
    && startedAtOverrun
    && reachedFirstMilestone
    && eligibleRun
    && summary.overrunCompletionEarned === true
    && summary.overrunCompletionRecorded !== true
  );
  const previousRecord = normalizeShipMasteryRecord(milestones[shipId]);
  const previous = getShipMasteryView(previousRecord);
  if (!legitimateCompletion) {
    return { milestones, shipId: shipId || null, previous, current: previous, recorded: false };
  }
  const nextRecord = normalizeShipMasteryRecord({
    ...previousRecord,
    overrunClears: previousRecord.overrunClears + 1,
    lastRunAt: completedAt
  });
  milestones[shipId] = nextRecord;
  return {
    milestones,
    shipId,
    previous,
    current: getShipMasteryView(nextRecord),
    recorded: true
  };
}

export function getShipMasteryTierById(tierId) {
  return TIER_ORDER.find((tier) => tier.id === tierId) || SHIP_MASTERY_TIERS.none;
}
