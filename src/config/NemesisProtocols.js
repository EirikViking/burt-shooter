const freezeEntries = (entries) => Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));

export const NEMESIS_OPENINGS = freezeEntries([
  { id: 'blitz', label: 'BLITZ', entryDurationMult: 0.72, healthMult: 1.00, speedMult: 1.12, radiusMult: 0.96, fireDelayMult: 0.92, projectileSpeedMult: 1.00, diveBiasMult: 1.12, swayMult: 1.00, accent: 0xffd15c },
  { id: 'siege', label: 'SIEGE', entryDurationMult: 0.96, healthMult: 1.12, speedMult: 0.92, radiusMult: 1.08, fireDelayMult: 0.88, projectileSpeedMult: 0.96, diveBiasMult: 0.88, swayMult: 0.94, accent: 0xff8f5a },
  { id: 'hunter', label: 'HUNTER', entryDurationMult: 0.84, healthMult: 1.04, speedMult: 1.08, radiusMult: 0.98, fireDelayMult: 0.96, projectileSpeedMult: 1.06, diveBiasMult: 1.24, swayMult: 1.04, accent: 0xff6174 },
  { id: 'phantom', label: 'PHANTOM ENTRY', entryDurationMult: 0.70, healthMult: 0.98, speedMult: 1.10, radiusMult: 0.92, fireDelayMult: 1.02, projectileSpeedMult: 1.08, diveBiasMult: 1.16, swayMult: 1.18, accent: 0xcaa6ff },
  { id: 'vanguard', label: 'VANGUARD', entryDurationMult: 0.82, healthMult: 1.08, speedMult: 1.05, radiusMult: 1.04, fireDelayMult: 0.94, projectileSpeedMult: 1.02, diveBiasMult: 1.06, swayMult: 1.02, accent: 0x7fffd8 },
  { id: 'anchor', label: 'ANCHOR', entryDurationMult: 1.08, healthMult: 1.18, speedMult: 0.86, radiusMult: 1.12, fireDelayMult: 0.98, projectileSpeedMult: 1.00, diveBiasMult: 0.82, swayMult: 0.90, accent: 0xffef7e },
  { id: 'spiral', label: 'SPIRAL', entryDurationMult: 0.88, healthMult: 1.02, speedMult: 1.02, radiusMult: 1.00, fireDelayMult: 0.96, projectileSpeedMult: 1.04, diveBiasMult: 1.08, swayMult: 1.30, accent: 0xff66ff },
  { id: 'needle', label: 'NEEDLE ENTRY', entryDurationMult: 0.74, healthMult: 0.96, speedMult: 1.14, radiusMult: 0.90, fireDelayMult: 1.04, projectileSpeedMult: 1.18, diveBiasMult: 1.18, swayMult: 0.96, accent: 0x7df9ff },
  { id: 'hammer', label: 'HAMMER', entryDurationMult: 0.90, healthMult: 1.10, speedMult: 0.94, radiusMult: 1.10, fireDelayMult: 0.90, projectileSpeedMult: 1.10, diveBiasMult: 0.94, swayMult: 0.98, accent: 0xff9d66 },
  { id: 'decoy', label: 'DECOY', entryDurationMult: 1.00, healthMult: 1.06, speedMult: 1.02, radiusMult: 0.94, fireDelayMult: 1.00, projectileSpeedMult: 1.02, diveBiasMult: 1.10, swayMult: 1.22, accent: 0x66ff9d }
]);

export const NEMESIS_DEFENSES = freezeEntries([
  { id: 'plating', label: 'REACTIVE PLATING', healthMult: 1.08, mode: 'flat', reductionMult: 0.88 },
  { id: 'veil', label: 'PHASE VEIL', healthMult: 1.04, mode: 'opening_hits', guardedHits: 3, reductionMult: 0.55 },
  { id: 'reactor', label: 'REACTIVE CORE', healthMult: 1.06, mode: 'periodic', period: 3, reductionMult: 0.45 },
  { id: 'damage_cap', label: 'ABLATIVE CAP', healthMult: 1.02, mode: 'damage_cap', maxHealthFraction: 0.22 },
  { id: 'high_guard', label: 'CROWN GUARD', healthMult: 1.06, mode: 'high_guard', threshold: 0.65, reductionMult: 0.62 },
  { id: 'low_guard', label: 'LAST STAND', healthMult: 1.04, mode: 'low_guard', threshold: 0.45, reductionMult: 0.62 },
  { id: 'pulse', label: 'PULSE ARMOR', healthMult: 1.05, mode: 'alternating', reductionMult: 0.65 },
  { id: 'kinetic', label: 'KINETIC SINK', healthMult: 1.03, mode: 'large_hit', threshold: 0.18, reductionMult: 0.55 },
  { id: 'swarm', label: 'SWARM SCREEN', healthMult: 1.03, mode: 'small_hit', threshold: 0.08, reductionMult: 0.78 },
  { id: 'reserve', label: 'RESERVE HULL', healthMult: 1.26, mode: 'reserve', reductionMult: 1.00 }
]);

export const NEMESIS_ENRAGES = freezeEntries([
  { id: 'frenzy', label: 'FRENZY', threshold: 0.72, speedMult: 1.04, fireDelayMult: 0.78, projectileSpeedMult: 1.04, diveBiasMult: 1.08, swayMult: 1.04, moveStyle: null, shotPattern: null, volley: null, accent: 0xff6174 },
  { id: 'overdrive', label: 'OVERDRIVE', threshold: 0.65, speedMult: 1.25, fireDelayMult: 0.94, projectileSpeedMult: 1.06, diveBiasMult: 1.14, swayMult: 1.10, moveStyle: 'sweep', shotPattern: null, volley: null, accent: 0xff8f5a },
  { id: 'lance', label: 'LANCE MODE', threshold: 0.58, speedMult: 1.08, fireDelayMult: 0.96, projectileSpeedMult: 1.28, diveBiasMult: 1.12, swayMult: 0.94, moveStyle: 'needle', shotPattern: 'needle', volley: null, accent: 0x7df9ff },
  { id: 'hunt', label: 'HUNT MODE', threshold: 0.52, speedMult: 1.16, fireDelayMult: 0.92, projectileSpeedMult: 1.08, diveBiasMult: 1.45, swayMult: 1.08, moveStyle: 'ambush', shotPattern: null, volley: null, accent: 0xffd15c },
  { id: 'storm', label: 'STORM MODE', threshold: 0.45, speedMult: 1.06, fireDelayMult: 0.86, projectileSpeedMult: 1.15, diveBiasMult: 1.12, swayMult: 1.18, moveStyle: 'pulse', shotPattern: 'aimed', volley: 'pulse', accent: 0xcaa6ff },
  { id: 'weave', label: 'WEAVE SURGE', threshold: 0.68, speedMult: 1.10, fireDelayMult: 0.94, projectileSpeedMult: 1.04, diveBiasMult: 1.16, swayMult: 1.45, moveStyle: 'weave_wall', shotPattern: null, volley: null, accent: 0xff66ff },
  { id: 'crossfire', label: 'CROSSFIRE SURGE', threshold: 0.60, speedMult: 1.06, fireDelayMult: 0.90, projectileSpeedMult: 1.10, diveBiasMult: 1.10, swayMult: 1.08, moveStyle: 'pincer', shotPattern: 'crossfire', volley: 'crossfire', accent: 0xff9d66 },
  { id: 'trident', label: 'TRIDENT SURGE', threshold: 0.50, speedMult: 1.04, fireDelayMult: 0.90, projectileSpeedMult: 1.02, diveBiasMult: 1.12, swayMult: 1.12, moveStyle: 'split_sweep', shotPattern: 'fan', volley: null, accent: 0x66ff9d },
  { id: 'berserk', label: 'BERSERK', threshold: 0.35, speedMult: 1.15, fireDelayMult: 0.74, projectileSpeedMult: 1.12, diveBiasMult: 1.35, swayMult: 1.20, moveStyle: 'feint', shotPattern: null, volley: 'staggered', accent: 0xff315f },
  { id: 'orbit', label: 'ORBITAL SURGE', threshold: 0.42, speedMult: 1.12, fireDelayMult: 0.88, projectileSpeedMult: 1.10, diveBiasMult: 0.96, swayMult: 1.28, moveStyle: 'orbit', shotPattern: 'sweep', volley: null, accent: 0x7fffd8 }
]);

export const NEMESIS_BONUSES = freezeEntries([
  { id: 'shield', label: 'SHIELD', kind: 'powerup', powerupType: 'shield', accent: 0x7fffd8 },
  { id: 'bomb', label: 'BOMB', kind: 'powerup', powerupType: 'bomb', accent: 0xff8f5a },
  { id: 'orbital_strike', label: 'ORBITAL STRIKE', kind: 'powerup', powerupType: 'orbital_strike', accent: 0xffd15c },
  { id: 'point_defense', label: 'POINT DEFENSE', kind: 'powerup', powerupType: 'point_defense', accent: 0x9cfbff },
  { id: 'ghost', label: 'GHOST MODE', kind: 'powerup', powerupType: 'ghost', accent: 0xcaa6ff },
  { id: 'rapid_fire', label: 'RAPID FIRE', kind: 'powerup', powerupType: 'rapid_fire', accent: 0xff66ff },
  { id: 'speed_up', label: 'SPEED UP', kind: 'powerup', powerupType: 'speed_up', accent: 0x7df9ff },
  { id: 'magnet', label: 'MAGNET', kind: 'powerup', powerupType: 'magnet', accent: 0x66ffdd },
  { id: 'drones', label: 'DRONES', kind: 'powerup', powerupType: 'drones', accent: 0x66ff9d },
  { id: 'rescan', label: 'EXTRA RESCAN', kind: 'rescan', powerupType: null, accent: 0xffef7e }
]);

function defineProtocol(opening, defense, enrage, bonus, index) {
  return Object.freeze({
    id: `${opening.id}_${defense.id}_${enrage.id}_${bonus.id}`,
    number: index + 1,
    openingId: opening.id,
    openingLabel: opening.label,
    defenseId: defense.id,
    defenseLabel: defense.label,
    enrageId: enrage.id,
    enrageLabel: enrage.label,
    bonusId: bonus.id,
    bonusLabel: bonus.label,
    bonusKind: bonus.kind,
    bonusPowerupType: bonus.powerupType,
    color: opening.accent,
    accent: enrage.accent,
    bonusAccent: bonus.accent,
    opening,
    defense,
    enrage
  });
}

const protocols = [];
for (const opening of NEMESIS_OPENINGS) {
  for (const defense of NEMESIS_DEFENSES) {
    for (const enrage of NEMESIS_ENRAGES) {
      for (const bonus of NEMESIS_BONUSES) {
        protocols.push(defineProtocol(opening, defense, enrage, bonus, protocols.length));
      }
    }
  }
}

export const NEMESIS_PROTOCOL_CATALOG = Object.freeze(protocols);
export const NEMESIS_PROTOCOL_VARIANT_COUNT = NEMESIS_PROTOCOL_CATALOG.length;
const PROTOCOL_BY_ID = new Map(NEMESIS_PROTOCOL_CATALOG.map((entry) => [entry.id, entry]));

export function getNemesisProtocolById(id) {
  return PROTOCOL_BY_ID.get(String(id || '')) || null;
}

export function pickNemesisProtocol(seed = 'nova-swarm', sequence = 0, options = {}) {
  if (!NEMESIS_PROTOCOL_CATALOG.length) return null;
  let index = hashString(`${seed}:nemesis:${Math.max(0, Math.floor(Number(sequence) || 0))}`) % NEMESIS_PROTOCOL_CATALOG.length;
  const excludeId = String(options.excludeId || '');
  if (NEMESIS_PROTOCOL_CATALOG.length > 1 && NEMESIS_PROTOCOL_CATALOG[index]?.id === excludeId) {
    index = (index + 7919) % NEMESIS_PROTOCOL_CATALOG.length;
  }
  return NEMESIS_PROTOCOL_CATALOG[index] || null;
}

export function applyNemesisProtocolToEnemy(enemy, protocolOrId) {
  const protocol = typeof protocolOrId === 'string' ? getNemesisProtocolById(protocolOrId) : protocolOrId;
  if (!enemy?.isAce || !protocol || enemy.nemesisProtocol) return null;
  const opening = protocol.opening;
  const defense = protocol.defense;
  const scoreValue = Number(enemy.scoreValue) || 0;
  const healthMult = opening.healthMult * defense.healthMult;
  const health = Math.max(3, Math.ceil(Math.max(1, Number(enemy.health) || 1) * healthMult));
  enemy.health = health;
  enemy.maxHealth = health;
  enemy.speed = Math.max(0.1, (Number(enemy.speed) || 1) * opening.speedMult);
  enemy.radius = Math.max(8, (Number(enemy.radius) || 15) * opening.radiusMult);
  enemy.shootDelay = Math.max(38, (Number(enemy.shootDelay) || 120) * opening.fireDelayMult);
  enemy.tacticalProjectileSpeedScalar = Math.max(0.5, (Number(enemy.tacticalProjectileSpeedScalar) || 1) * opening.projectileSpeedMult);
  enemy.tacticalDiveBias = Math.max(0.1, (Number(enemy.tacticalDiveBias) || 1) * opening.diveBiasMult);
  enemy.tacticalSwayScalar = Math.max(0.5, (Number(enemy.tacticalSwayScalar) || 1) * opening.swayMult);
  enemy.nemesisOpeningEntryDurationMult = opening.entryDurationMult;
  enemy.nemesisProtocol = protocol;
  enemy.nemesisDamageHitCount = 0;
  enemy.nemesisEnraged = false;
  enemy.nemesisBonusRewardClaimed = false;
  enemy.nemesisLastDamageResolution = null;
  enemy.scoreValue = scoreValue;
  return protocol;
}

export function resolveNemesisDamage(enemy, amount) {
  const protocol = enemy?.nemesisProtocol;
  const rawAmount = Math.max(0, Number(amount) || 0);
  if (!protocol || rawAmount <= 0) return rawAmount;
  const defense = protocol.defense;
  const maxHealth = Math.max(1, Number(enemy.maxHealth) || 1);
  const healthRatio = Math.max(0, Number(enemy.health) || 0) / maxHealth;
  const hit = Math.max(1, Math.floor(Number(enemy.nemesisDamageHitCount) || 0) + 1);
  enemy.nemesisDamageHitCount = hit;
  let resolved = rawAmount;
  let guarded = false;
  if (defense.mode === 'flat') {
    resolved *= defense.reductionMult;
    guarded = true;
  } else if (defense.mode === 'opening_hits' && hit <= defense.guardedHits) {
    resolved *= defense.reductionMult;
    guarded = true;
  } else if (defense.mode === 'periodic' && hit % defense.period === 0) {
    resolved *= defense.reductionMult;
    guarded = true;
  } else if (defense.mode === 'damage_cap' && resolved > maxHealth * defense.maxHealthFraction) {
    resolved = maxHealth * defense.maxHealthFraction;
    guarded = true;
  } else if (defense.mode === 'high_guard' && healthRatio > defense.threshold) {
    resolved *= defense.reductionMult;
    guarded = true;
  } else if (defense.mode === 'low_guard' && healthRatio < defense.threshold) {
    resolved *= defense.reductionMult;
    guarded = true;
  } else if (defense.mode === 'alternating' && hit % 2 === 1) {
    resolved *= defense.reductionMult;
    guarded = true;
  } else if (defense.mode === 'large_hit' && rawAmount > maxHealth * defense.threshold) {
    resolved *= defense.reductionMult;
    guarded = true;
  } else if (defense.mode === 'small_hit' && rawAmount < maxHealth * defense.threshold) {
    resolved *= defense.reductionMult;
    guarded = true;
  }
  enemy.nemesisLastDamageResolution = {
    hit,
    mode: defense.mode,
    rawAmount,
    resolvedAmount: resolved,
    guarded
  };
  return resolved;
}

export function maybeActivateNemesisEnrage(enemy) {
  const protocol = enemy?.nemesisProtocol;
  if (!protocol || enemy.nemesisEnraged || Number(enemy.health) <= 0) return null;
  const maxHealth = Math.max(1, Number(enemy.maxHealth) || 1);
  if ((Number(enemy.health) || 0) / maxHealth > protocol.enrage.threshold) return null;
  const enrage = protocol.enrage;
  enemy.nemesisEnraged = true;
  enemy.speed = Math.max(0.1, (Number(enemy.speed) || 1) * enrage.speedMult);
  enemy.shootDelay = Math.max(34, (Number(enemy.shootDelay) || 120) * enrage.fireDelayMult);
  enemy.tacticalProjectileSpeedScalar = Math.max(0.5, (Number(enemy.tacticalProjectileSpeedScalar) || 1) * enrage.projectileSpeedMult);
  enemy.tacticalDiveBias = Math.max(0.1, (Number(enemy.tacticalDiveBias) || 1) * enrage.diveBiasMult);
  enemy.tacticalSwayScalar = Math.max(0.5, (Number(enemy.tacticalSwayScalar) || 1) * enrage.swayMult);
  if (enrage.moveStyle) enemy.tacticalMoveStyle = enrage.moveStyle;
  if (enrage.shotPattern) enemy.tacticalShotPattern = enrage.shotPattern;
  enemy.waveTactic = {
    ...(enemy.waveTactic || {}),
    move: enrage.moveStyle || enemy.waveTactic?.move || enemy.tacticalMoveStyle,
    shot: enrage.shotPattern || enemy.waveTactic?.shot || enemy.tacticalShotPattern,
    volley: enrage.volley || enemy.waveTactic?.volley || null
  };
  return enrage;
}

export function getNemesisProtocolMechanicalSignature(protocolOrId) {
  const protocol = typeof protocolOrId === 'string' ? getNemesisProtocolById(protocolOrId) : protocolOrId;
  if (!protocol) return null;
  return JSON.stringify({
    opening: protocol.opening,
    defense: protocol.defense,
    enrage: protocol.enrage,
    bonusId: protocol.bonusId
  });
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
