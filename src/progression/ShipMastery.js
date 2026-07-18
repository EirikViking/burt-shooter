const RANKED_RUN_MODES = new Set(['ranked', 'ranked_tactical']);

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

export function normalizeShipMasteryRecord(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const bestSector = Math.max(1, whole(source.bestSector ?? source.bestLevel, 1));
  const clears = whole(source.clears ?? source.runClears);
  return {
    ...source,
    runs: whole(source.runs),
    clears,
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

export function getShipMasteryView(record = {}) {
  const normalized = normalizeShipMasteryRecord(record);
  const tier = getShipMasteryTier(normalized);
  const nextGoal = getNextShipMasteryGoal(normalized);
  return {
    ...normalized,
    tier,
    nextGoal,
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

export function getShipMasteryTierById(tierId) {
  return TIER_ORDER.find((tier) => tier.id === tierId) || SHIP_MASTERY_TIERS.none;
}
