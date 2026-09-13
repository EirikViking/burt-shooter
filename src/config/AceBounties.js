const freezeEntries = (entries) => Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));

export const ACE_BOUNTY_CHASSIS = freezeEntries([
  { id: 'bulwark', label: 'BULWARK', healthMult: 1.65, speedMult: 0.90, radiusMult: 1.10, fireDelayMult: 1.00, projectileSpeedMult: 1.00, diveBiasMult: 0.92, color: 0xffd15c },
  { id: 'interceptor', label: 'INTERCEPTOR', healthMult: 1.20, speedMult: 1.24, radiusMult: 0.94, fireDelayMult: 0.96, projectileSpeedMult: 1.08, diveBiasMult: 1.22, color: 0x7df9ff },
  { id: 'gunship', label: 'GUNSHIP', healthMult: 1.38, speedMult: 0.98, radiusMult: 1.06, fireDelayMult: 0.82, projectileSpeedMult: 1.04, diveBiasMult: 0.94, color: 0xff8f5a },
  { id: 'lancer', label: 'LANCER', healthMult: 1.18, speedMult: 1.08, radiusMult: 0.96, fireDelayMult: 1.04, projectileSpeedMult: 1.24, diveBiasMult: 1.08, color: 0xff66ff },
  { id: 'bruiser', label: 'BRUISER', healthMult: 1.82, speedMult: 0.78, radiusMult: 1.18, fireDelayMult: 1.08, projectileSpeedMult: 0.96, diveBiasMult: 0.84, color: 0xff6174 },
  { id: 'skirmisher', label: 'SKIRMISHER', healthMult: 1.28, speedMult: 1.18, radiusMult: 0.98, fireDelayMult: 0.90, projectileSpeedMult: 1.02, diveBiasMult: 1.14, color: 0x66ff9d },
  { id: 'sentinel', label: 'SENTINEL', healthMult: 1.48, speedMult: 0.94, radiusMult: 1.08, fireDelayMult: 0.94, projectileSpeedMult: 1.12, diveBiasMult: 0.90, color: 0xffef7e },
  { id: 'corsair', label: 'CORSAIR', healthMult: 1.32, speedMult: 1.12, radiusMult: 1.02, fireDelayMult: 0.92, projectileSpeedMult: 1.06, diveBiasMult: 1.30, color: 0xb285ff },
  { id: 'warden', label: 'WARDEN', healthMult: 1.56, speedMult: 0.88, radiusMult: 1.12, fireDelayMult: 0.86, projectileSpeedMult: 1.00, diveBiasMult: 0.88, color: 0x7fffd8 },
  { id: 'phantom', label: 'PHANTOM', healthMult: 1.24, speedMult: 1.15, radiusMult: 0.90, fireDelayMult: 0.98, projectileSpeedMult: 1.18, diveBiasMult: 1.18, color: 0xcaa6ff }
]);

export const ACE_BOUNTY_FLIGHT_PATTERNS = freezeEntries([
  { id: 'sweep', label: 'SWEEP', moveStyle: 'sweep', diveBiasMult: 0.92, swayMult: 1.04 },
  { id: 'pincer', label: 'PINCER', moveStyle: 'pincer', diveBiasMult: 1.08, swayMult: 1.00 },
  { id: 'chain', label: 'CHAIN', moveStyle: 'chain', diveBiasMult: 1.18, swayMult: 1.06 },
  { id: 'pulse', label: 'PULSE', moveStyle: 'pulse', diveBiasMult: 0.86, swayMult: 1.10 },
  { id: 'orbit', label: 'ORBIT', moveStyle: 'orbit', diveBiasMult: 0.90, swayMult: 1.16 },
  { id: 'needle', label: 'NEEDLE', moveStyle: 'needle', diveBiasMult: 1.12, swayMult: 0.94 },
  { id: 'weave_wall', label: 'WEAVE WALL', moveStyle: 'weave_wall', diveBiasMult: 0.96, swayMult: 1.18 },
  { id: 'feint', label: 'FEINT', moveStyle: 'feint', diveBiasMult: 1.24, swayMult: 1.08 },
  { id: 'split_sweep', label: 'SPLIT SWEEP', moveStyle: 'split_sweep', diveBiasMult: 1.14, swayMult: 1.12 },
  { id: 'ambush', label: 'AMBUSH', moveStyle: 'ambush', diveBiasMult: 1.28, swayMult: 0.98 }
]);

export const ACE_BOUNTY_WEAPONS = freezeEntries([
  { id: 'precision', label: 'PRECISION', shotPattern: 'aimed', volley: null, fireDelayMult: 1.10, projectileSpeedMult: 1.25, fireScalarMult: 0.94, rewardId: 'shield', rewardLabel: 'SHIELD', rewardKind: 'powerup', rewardPowerupType: 'shield', accent: 0x7fffd8 },
  { id: 'crossfire', label: 'CROSSFIRE', shotPattern: 'crossfire', volley: 'crossfire', fireDelayMult: 1.00, projectileSpeedMult: 1.12, fireScalarMult: 1.02, rewardId: 'bomb', rewardLabel: 'BOMB', rewardKind: 'powerup', rewardPowerupType: 'bomb', accent: 0xff8f5a },
  { id: 'trident', label: 'TRIDENT', shotPattern: 'fan', volley: null, fireDelayMult: 1.18, projectileSpeedMult: 0.92, fireScalarMult: 0.92, rewardId: 'orbital_strike', rewardLabel: 'ORBITAL STRIKE', rewardKind: 'powerup', rewardPowerupType: 'orbital_strike', accent: 0xffd15c },
  { id: 'netcaster', label: 'NETCASTER', shotPattern: 'net', volley: null, fireDelayMult: 0.94, projectileSpeedMult: 0.88, fireScalarMult: 0.98, rewardId: 'point_defense', rewardLabel: 'POINT DEFENSE', rewardKind: 'powerup', rewardPowerupType: 'point_defense', accent: 0x9cfbff },
  { id: 'needle', label: 'NEEDLE', shotPattern: 'needle', volley: null, fireDelayMult: 1.12, projectileSpeedMult: 1.32, fireScalarMult: 0.90, rewardId: 'ghost', rewardLabel: 'GHOST MODE', rewardKind: 'powerup', rewardPowerupType: 'ghost', accent: 0xcaa6ff },
  { id: 'sweeper', label: 'SWEEPER', shotPattern: 'sweep', volley: null, fireDelayMult: 0.90, projectileSpeedMult: 1.04, fireScalarMult: 1.04, rewardId: 'rapid_fire', rewardLabel: 'RAPID FIRE', rewardKind: 'powerup', rewardPowerupType: 'rapid_fire', accent: 0xff66ff },
  { id: 'twin_burst', label: 'TWIN BURST', shotPattern: 'burst_pair', volley: 'staggered', fireDelayMult: 0.86, projectileSpeedMult: 0.96, fireScalarMult: 1.00, rewardId: 'speed_up', rewardLabel: 'SPEED UP', rewardKind: 'powerup', rewardPowerupType: 'speed_up', accent: 0x7df9ff },
  { id: 'pulse_driver', label: 'PULSE DRIVER', shotPattern: 'aimed', volley: 'pulse', fireDelayMult: 0.82, projectileSpeedMult: 1.08, fireScalarMult: 1.08, rewardId: 'magnet', rewardLabel: 'MAGNET', rewardKind: 'powerup', rewardPowerupType: 'magnet', accent: 0x66ffdd },
  { id: 'stagger_lance', label: 'STAGGER LANCE', shotPattern: 'crossfire', volley: 'staggered', fireDelayMult: 0.96, projectileSpeedMult: 1.16, fireScalarMult: 1.06, rewardId: 'drones', rewardLabel: 'DRONES', rewardKind: 'powerup', rewardPowerupType: 'drones', accent: 0x66ff9d },
  { id: 'suppressor', label: 'SUPPRESSOR', shotPattern: 'net', volley: 'crossfire', fireDelayMult: 0.78, projectileSpeedMult: 0.90, fireScalarMult: 1.10, rewardId: 'rescan', rewardLabel: 'EXTRA RESCAN', rewardKind: 'rescan', rewardPowerupType: null, accent: 0xffef7e }
]);

function defineAceBounty(chassis, flight, weapon, index) {
  return Object.freeze({
    id: `${chassis.id}_${flight.id}_${weapon.id}`,
    number: index + 1,
    chassisId: chassis.id,
    chassisLabel: chassis.label,
    flightId: flight.id,
    flightLabel: flight.label,
    weaponId: weapon.id,
    weaponLabel: weapon.label,
    rewardId: weapon.rewardId,
    rewardLabel: weapon.rewardLabel,
    rewardKind: weapon.rewardKind,
    rewardPowerupType: weapon.rewardPowerupType,
    color: chassis.color,
    accent: weapon.accent,
    effects: Object.freeze({
      healthMult: chassis.healthMult,
      speedMult: chassis.speedMult,
      radiusMult: chassis.radiusMult,
      fireDelayMult: Number((chassis.fireDelayMult * weapon.fireDelayMult).toFixed(5)),
      projectileSpeedMult: Number((chassis.projectileSpeedMult * weapon.projectileSpeedMult).toFixed(5)),
      fireScalarMult: weapon.fireScalarMult,
      diveBiasMult: Number((chassis.diveBiasMult * flight.diveBiasMult).toFixed(5)),
      swayMult: flight.swayMult,
      moveStyle: flight.moveStyle,
      shotPattern: weapon.shotPattern,
      volley: weapon.volley
    })
  });
}

const variants = [];
for (const chassis of ACE_BOUNTY_CHASSIS) {
  for (const flight of ACE_BOUNTY_FLIGHT_PATTERNS) {
    for (const weapon of ACE_BOUNTY_WEAPONS) {
      variants.push(defineAceBounty(chassis, flight, weapon, variants.length));
    }
  }
}

export const ACE_BOUNTY_CATALOG = Object.freeze(variants);
export const ACE_BOUNTY_VARIANT_COUNT = ACE_BOUNTY_CATALOG.length;

const ACE_BY_ID = new Map(ACE_BOUNTY_CATALOG.map((entry) => [entry.id, entry]));

export function getAceBountyById(id) {
  return ACE_BY_ID.get(String(id || '')) || null;
}

export function pickAceBounty(seed = 'nova-swarm', sequence = 0, options = {}) {
  if (!ACE_BOUNTY_CATALOG.length) return null;
  let index = hashString(`${seed}:ace:${Math.max(0, Math.floor(Number(sequence) || 0))}`) % ACE_BOUNTY_CATALOG.length;
  const excludeId = String(options.excludeId || '');
  if (ACE_BOUNTY_CATALOG.length > 1 && ACE_BOUNTY_CATALOG[index]?.id === excludeId) {
    index = (index + 317) % ACE_BOUNTY_CATALOG.length;
  }
  return ACE_BOUNTY_CATALOG[index] || null;
}

export function planAceBountyEncounter(seed = 'nova-swarm', sector = 1, waveCount = 5, options = {}) {
  const sequence = Math.max(0, Math.floor(Number(options.sequence) || 0));
  const variant = options.variantId
    ? getAceBountyById(options.variantId)
    : pickAceBounty(seed, sequence, { excludeId: options.excludeId });
  if (!variant) return null;
  const safeWaveCount = Math.max(1, Math.floor(Number(waveCount) || 5));
  const forcedWaveIndex = Number(options.targetWaveIndex);
  const targetWaveIndex = Number.isFinite(forcedWaveIndex)
    ? Math.max(0, Math.min(safeWaveCount - 1, Math.floor(forcedWaveIndex)))
    : hashString(`${seed}:ace-wave:${Math.max(1, Math.floor(Number(sector) || 1))}`) % safeWaveCount;
  return {
    ...variant,
    sector: Math.max(1, Math.floor(Number(sector) || 1)),
    targetWaveIndex,
    spawned: false,
    completed: false
  };
}

export function applyAceBountyToEnemy(enemy, variantOrId) {
  const variant = typeof variantOrId === 'string' ? getAceBountyById(variantOrId) : variantOrId;
  if (!enemy || !variant || enemy.isAce) return null;
  const effects = variant.effects;
  const baseScoreValue = Number(enemy.scoreValue) || 0;
  const nextHealth = Math.max(2, Math.ceil(Math.max(1, Number(enemy.health) || 1) * effects.healthMult));
  enemy.health = nextHealth;
  enemy.maxHealth = nextHealth;
  enemy.speed = Math.max(0.1, (Number(enemy.speed) || 1) * effects.speedMult);
  enemy.radius = Math.max(8, (Number(enemy.radius) || 15) * effects.radiusMult);
  enemy.shootDelay = Math.max(42, (Number(enemy.shootDelay) || 120) * effects.fireDelayMult);
  enemy.tacticalProjectileSpeedScalar = Math.max(0.5, (Number(enemy.tacticalProjectileSpeedScalar) || 1) * effects.projectileSpeedMult);
  enemy.tacticalFireScalar = Math.max(0.1, (Number(enemy.tacticalFireScalar) || 1) * effects.fireScalarMult);
  enemy.tacticalDiveBias = Math.max(0.1, (Number(enemy.tacticalDiveBias) || 1) * effects.diveBiasMult);
  enemy.tacticalSwayScalar = Math.max(0.5, (Number(enemy.tacticalSwayScalar) || 1) * effects.swayMult);
  enemy.tacticalMoveStyle = effects.moveStyle;
  enemy.tacticalShotPattern = effects.shotPattern;
  enemy.waveTactic = {
    ...(enemy.waveTactic || {}),
    move: effects.moveStyle,
    shot: effects.shotPattern,
    volley: effects.volley
  };
  enemy.threatActionDefinition = null;
  enemy.currentThreatAction = null;
  enemy.isAce = true;
  enemy.aceVariant = variant;
  enemy.aceRewardClaimed = false;
  enemy.scoreValue = baseScoreValue;
  return variant;
}

export function getAceBountyMechanicalSignature(variantOrId) {
  const variant = typeof variantOrId === 'string' ? getAceBountyById(variantOrId) : variantOrId;
  if (!variant) return null;
  return JSON.stringify({ effects: variant.effects, rewardId: variant.rewardId });
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
