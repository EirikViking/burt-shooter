const freezeEntries = (entries) => Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));

export const TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP = 50;
export const TACTICAL_DIRECTIVE_MAX_COMPLETIONS_PER_SECTOR = 1;
export const TACTICAL_DIRECTIVE_MINIMUM_FINAL_SECTOR = Math.ceil(
  TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP / TACTICAL_DIRECTIVE_MAX_COMPLETIONS_PER_SECTOR
);

export function getTacticalDirectiveTierCeiling(level = 1, completedCount = 0) {
  const campaignStage = Math.max(
    1,
    Math.floor(Number(level) || 1),
    Math.floor(Number(completedCount) || 0) + 1
  );
  return Math.max(1, Math.min(10, Math.ceil(campaignStage / 5)));
}

export function getNextTacticalDirectiveEligibleSector(history = [], currentSector = 1) {
  const safeSector = Math.max(1, Math.floor(Number(currentSector) || 1));
  const completionsThisSector = (Array.isArray(history) ? history : []).filter((entry) => (
    Math.max(1, Math.floor(Number(entry?.sector) || 1)) === safeSector
  )).length;
  return completionsThisSector >= TACTICAL_DIRECTIVE_MAX_COMPLETIONS_PER_SECTOR
    ? safeSector + 1
    : safeSector;
}

export const TACTICAL_DIRECTIVE_OBJECTIVES = freezeEntries([
  { id: 'hostile_quota', label: 'HOSTILE QUOTA', event: 'enemy_defeated', mode: 'count', targets: [10, 14, 18, 22, 26, 30, 36, 42, 50, 60], accent: 0xff8f5a },
  { id: 'graze_count', label: 'GRAZE COUNT', event: 'near_miss', mode: 'count', targets: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20], accent: 0x9cfbff },
  { id: 'danger_streak', label: 'DANGER STREAK', event: 'near_miss', mode: 'peak', valueKey: 'streak', targets: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12], accent: 0xffef7e },
  { id: 'combo_peak', label: 'COMBO PEAK', event: 'enemy_defeated', mode: 'peak', valueKey: 'comboCount', targets: [6, 8, 10, 12, 15, 18, 22, 26, 32, 40], accent: 0xff66ff },
  { id: 'powerup_claims', label: 'POWERUP CLAIMS', event: 'powerup_collected', mode: 'count', targets: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12], accent: 0x66ffdd },
  { id: 'phase_uses', label: 'PHASE USES', event: 'phase_used', mode: 'count', targets: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15], accent: 0x7df9ff },
  { id: 'support_hunts', label: 'SUPPORT HUNTS', event: 'boss_support_defeated', mode: 'count', targets: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12], accent: 0x7fffd8 },
  { id: 'boss_hunts', label: 'BOSS HUNTS', event: 'boss_defeated', mode: 'count', targets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], accent: 0xffd15c },
  { id: 'sector_reach', label: 'SECTOR REACH', event: 'sector_reached', mode: 'peak', valueKey: 'sector', targets: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], accent: 0xcaa6ff },
  { id: 'enemy_variety', label: 'ENEMY VARIETY', event: 'enemy_defeated', mode: 'unique', valueKey: 'enemyType', targets: [3, 4, 5, 6, 7, 8, 10, 12, 15, 20], accent: 0x66ff9d }
]);

export const TACTICAL_DIRECTIVE_REWARDS = freezeEntries([
  { id: 'rescan', label: 'EXTRA RESCAN', kind: 'rescan', accent: 0xffef7e },
  { id: 'shield', label: 'SHIELD', kind: 'powerup', powerupType: 'shield', accent: 0x7fffd8 },
  { id: 'bomb', label: 'BOMB', kind: 'powerup', powerupType: 'bomb', accent: 0xff8f5a },
  { id: 'orbital_strike', label: 'ORBITAL STRIKE', kind: 'powerup', powerupType: 'orbital_strike', accent: 0xffd15c },
  { id: 'point_defense', label: 'POINT DEFENSE', kind: 'powerup', powerupType: 'point_defense', accent: 0x9cfbff },
  { id: 'ghost', label: 'GHOST MODE', kind: 'powerup', powerupType: 'ghost', accent: 0xcaa6ff },
  { id: 'rapid_fire', label: 'RAPID FIRE', kind: 'powerup', powerupType: 'rapid_fire', accent: 0xff66ff },
  { id: 'speed_up', label: 'SPEED UP', kind: 'powerup', powerupType: 'speed_up', accent: 0x7df9ff },
  { id: 'magnet', label: 'MAGNET', kind: 'powerup', powerupType: 'magnet', accent: 0x66ffdd },
  { id: 'drones', label: 'DRONES', kind: 'powerup', powerupType: 'drones', accent: 0x66ff9d }
]);

function defineDirective(objective, tierIndex, reward) {
  const tier = tierIndex + 1;
  return Object.freeze({
    id: `${objective.id}_t${String(tier).padStart(2, '0')}_${reward.id}`,
    objectiveId: objective.id,
    objectiveLabel: objective.label,
    event: objective.event,
    mode: objective.mode,
    valueKey: objective.valueKey || null,
    target: objective.targets[tierIndex],
    tier,
    rewardId: reward.id,
    rewardLabel: reward.label,
    rewardKind: reward.kind,
    rewardPowerupType: reward.powerupType || null,
    accent: objective.accent,
    rewardAccent: reward.accent
  });
}

export const TACTICAL_DIRECTIVE_CATALOG = Object.freeze(
  TACTICAL_DIRECTIVE_OBJECTIVES.flatMap((objective) => (
    objective.targets.flatMap((_, tierIndex) => (
      TACTICAL_DIRECTIVE_REWARDS.map((reward) => defineDirective(objective, tierIndex, reward))
    ))
  ))
);

export const TACTICAL_DIRECTIVE_VARIANT_COUNT = TACTICAL_DIRECTIVE_CATALOG.length;

const DIRECTIVE_BY_ID = new Map(TACTICAL_DIRECTIVE_CATALOG.map((directive) => [directive.id, directive]));

export function getTacticalDirectiveById(id) {
  return DIRECTIVE_BY_ID.get(String(id || '')) || null;
}

export function pickTacticalDirective(seed = 'nova-swarm', sequence = 0, options = {}) {
  const maxTier = Math.max(1, Math.min(10, Math.floor(Number(options.maxTier) || 10)));
  const baseCatalog = maxTier >= 10
    ? TACTICAL_DIRECTIVE_CATALOG
    : TACTICAL_DIRECTIVE_CATALOG.filter((directive) => directive.tier <= maxTier);
  const excludedIds = new Set([
    ...(Array.isArray(options.excludeIds) ? options.excludeIds : []),
    options.excludeId
  ].map((value) => String(value || '')).filter(Boolean));
  const excludedObjectiveIds = new Set((Array.isArray(options.excludeObjectiveIds) ? options.excludeObjectiveIds : [])
    .map((value) => String(value || '')).filter(Boolean));
  const excludedRewardIds = new Set((Array.isArray(options.excludeRewardIds) ? options.excludeRewardIds : [])
    .map((value) => String(value || '')).filter(Boolean));
  const uniqueCatalog = baseCatalog.filter((directive) => !excludedIds.has(directive.id));
  const diverseCatalog = uniqueCatalog.filter((directive) => (
    !excludedObjectiveIds.has(directive.objectiveId)
    && !excludedRewardIds.has(directive.rewardId)
  ));
  const catalog = diverseCatalog.length > 0
    ? diverseCatalog
    : (uniqueCatalog.length > 0 ? uniqueCatalog : baseCatalog);
  const catalogSize = catalog.length;
  if (catalogSize === 0) return null;
  const index = hashString(`${seed}:directive:${Math.max(0, Math.floor(Number(sequence) || 0))}`) % catalogSize;
  return catalog[index] || null;
}

export function createTacticalDirectiveSession(directiveOrId) {
  const directive = typeof directiveOrId === 'string'
    ? getTacticalDirectiveById(directiveOrId)
    : directiveOrId;
  if (!directive) return null;
  return {
    directiveId: directive.id,
    progress: 0,
    target: directive.target,
    uniqueValues: [],
    completed: false,
    completedAtEvent: null,
    eventCount: 0,
    milestonesShown: [],
    calibrationCount: 0,
    eligibleFromSector: 1,
    lastProgressSector: null,
    lastCalibrationSector: null
  };
}

export function applyTacticalDirectiveEvent(session, event = {}) {
  const directive = getTacticalDirectiveById(session?.directiveId);
  const eventSector = Math.max(1, Math.floor(Number(event.sector) || 1));
  const eligibleFromSector = Math.max(1, Math.floor(Number(session?.eligibleFromSector) || 1));
  if (!directive || !session || session.completed || event.type !== directive.event || eventSector < eligibleFromSector) {
    return { session: session ? { ...session, uniqueValues: [...(session.uniqueValues || [])] } : null, completed: false, changed: false };
  }

  const next = {
    ...session,
    uniqueValues: [...(session.uniqueValues || [])],
    eventCount: Math.max(0, Math.floor(Number(session.eventCount) || 0)) + 1
  };
  const previousProgress = Math.max(0, Number(session.progress) || 0);
  const adaptiveTarget = Math.max(1, Number(session.target) || directive.target);

  if (directive.mode === 'count') {
    next.progress = previousProgress + Math.max(1, Math.floor(Number(event.count) || 1));
  } else if (directive.mode === 'peak') {
    next.progress = Math.max(previousProgress, Math.max(0, Number(event[directive.valueKey]) || 0));
  } else if (directive.mode === 'unique') {
    const value = String(event[directive.valueKey] || '').trim();
    if (value && !next.uniqueValues.includes(value)) next.uniqueValues.push(value);
    next.progress = next.uniqueValues.length;
  }

  next.progress = Math.min(adaptiveTarget, Math.max(0, next.progress));
  next.target = adaptiveTarget;
  if (next.progress > previousProgress) {
    next.lastProgressSector = Math.max(1, Math.floor(Number(event.sector) || Number(session.startedInSector) || 1));
  }
  next.completed = next.progress >= adaptiveTarget;
  next.completedAtEvent = next.completed ? String(event.type || directive.event) : null;
  return {
    session: next,
    completed: next.completed && !session.completed,
    changed: next.progress !== previousProgress
  };
}

export function getTacticalDirectiveState(session) {
  const directive = getTacticalDirectiveById(session?.directiveId);
  if (!directive || !session) return null;
  const adaptiveTarget = Math.max(1, Number(session.target) || directive.target);
  const progress = Math.max(0, Math.min(adaptiveTarget, Number(session.progress) || 0));
  return {
    ...directive,
    target: adaptiveTarget,
    progress,
    progressLabel: `${Math.floor(progress)}/${adaptiveTarget}`,
    ratio: adaptiveTarget > 0 ? Math.max(0, Math.min(1, progress / adaptiveTarget)) : 0,
    completed: Boolean(session.completed),
    eventCount: Math.max(0, Math.floor(Number(session.eventCount) || 0)),
    milestonesShown: [...(session.milestonesShown || [])],
    calibrationCount: Math.max(0, Math.floor(Number(session.calibrationCount) || 0)),
    eligibleFromSector: Math.max(1, Math.floor(Number(session.eligibleFromSector) || 1)),
    lastProgressSector: session.lastProgressSector != null && Number.isFinite(Number(session.lastProgressSector))
      ? Number(session.lastProgressSector)
      : null,
    lastCalibrationSector: session.lastCalibrationSector != null && Number.isFinite(Number(session.lastCalibrationSector))
      ? Number(session.lastCalibrationSector)
      : null
  };
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
