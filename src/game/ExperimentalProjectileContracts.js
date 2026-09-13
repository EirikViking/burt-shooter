export const PROJECTILE_PIERCE_PROVENANCE = Object.freeze({
  NONE: 'none',
  TACTICAL_PERMANENT: 'tactical_permanent',
  TEMPORARY_POWERUP: 'temporary_powerup',
  SHIP_TRAIT: 'ship_trait',
  OTHER: 'other'
});

export const BOUNDED_TACTICAL_PIERCE_MAX_HITS = 2;
export const BOUNDED_TACTICAL_PIERCE_SECOND_HIT_MULT = 0.7;
export const SHIP_TRAIT_PIERCE_MAX_HITS = 3;

function getExperimentState(gameOrState) {
  const state = gameOrState?.lateGameExperiment || gameOrState;
  return state?.active === true ? state : null;
}

function getMetrics(state) {
  return state?.metrics && typeof state.metrics === 'object' ? state.metrics : null;
}

export function resolveProjectilePierceProvenance({
  piercing = false,
  temporaryPowerupPierce = false,
  shipTraitPierce = false,
  permanentTacticalPierce = false
} = {}) {
  if (!piercing) return PROJECTILE_PIERCE_PROVENANCE.NONE;
  if (temporaryPowerupPierce) return PROJECTILE_PIERCE_PROVENANCE.TEMPORARY_POWERUP;
  if (shipTraitPierce) return PROJECTILE_PIERCE_PROVENANCE.SHIP_TRAIT;
  if (permanentTacticalPierce) return PROJECTILE_PIERCE_PROVENANCE.TACTICAL_PERMANENT;
  return PROJECTILE_PIERCE_PROVENANCE.OTHER;
}

export function getExperimentalPierceContract(provenance, gameOrState) {
  const state = getExperimentState(gameOrState);
  if (!state) return { maxHits: null, secondHitDamageMult: 1 };
  if (provenance === PROJECTILE_PIERCE_PROVENANCE.SHIP_TRAIT) {
    return { maxHits: SHIP_TRAIT_PIERCE_MAX_HITS, secondHitDamageMult: 1 };
  }
  if (
    provenance === PROJECTILE_PIERCE_PROVENANCE.TACTICAL_PERMANENT
    && state.permanentPierceContract === 'bounded'
  ) {
    return {
      maxHits: BOUNDED_TACTICAL_PIERCE_MAX_HITS,
      secondHitDamageMult: BOUNDED_TACTICAL_PIERCE_SECOND_HIT_MULT
    };
  }
  return { maxHits: null, secondHitDamageMult: 1 };
}

export function stampProjectilePierceProvenance(bullet, sources = {}, gameOrState = null) {
  if (!bullet) return null;
  const provenance = resolveProjectilePierceProvenance({
    piercing: Boolean(bullet.piercing),
    temporaryPowerupPierce: sources.temporaryPowerupPierce === true,
    shipTraitPierce: sources.shipTraitPierce === true || bullet.isTraitPiercingShot === true,
    permanentTacticalPierce: sources.permanentTacticalPierce === true
  });
  const contract = getExperimentalPierceContract(provenance, gameOrState);
  bullet.pierceProvenance = provenance;
  bullet.pierceSource = provenance;
  bullet.maxPierceHits = contract.maxHits;
  bullet.pierceSecondHitDamageMult = contract.secondHitDamageMult;
  bullet.experimentalPierceHitCount = 0;
  bullet.chainLightningOriginConsumed = false;
  return provenance;
}

export function claimExperimentalProjectileHit(bullet, baseDamage, gameOrState = null) {
  const damage = Math.max(0, Number(baseDamage) || 0);
  const state = getExperimentState(gameOrState);
  if (!state || !bullet?.piercing) {
    return {
      allowed: true,
      damage,
      hitIndex: null,
      provenance: bullet?.pierceProvenance || PROJECTILE_PIERCE_PROVENANCE.NONE,
      shouldDeactivate: false
    };
  }

  const provenance = bullet.pierceProvenance || resolveProjectilePierceProvenance({
    piercing: true,
    shipTraitPierce: bullet.isTraitPiercingShot === true
  });
  const contract = getExperimentalPierceContract(provenance, state);
  const currentHits = Math.max(0, Math.floor(Number(bullet.experimentalPierceHitCount) || 0));
  if (Number.isFinite(contract.maxHits) && currentHits >= contract.maxHits) {
    return {
      allowed: false,
      damage: 0,
      hitIndex: currentHits + 1,
      provenance,
      shouldDeactivate: true
    };
  }

  const hitIndex = currentHits + 1;
  bullet.experimentalPierceHitCount = hitIndex;
  const damageMult = (
    provenance === PROJECTILE_PIERCE_PROVENANCE.TACTICAL_PERMANENT
    && state.permanentPierceContract === 'bounded'
    && hitIndex === 2
  ) ? contract.secondHitDamageMult : 1;
  const effectiveDamage = damage * damageMult;
  const metrics = getMetrics(state);
  if (metrics) {
    metrics.pierceHits = Math.max(0, Number(metrics.pierceHits) || 0) + 1;
    metrics.effectivePenetrationHits = Math.max(0, Number(metrics.effectivePenetrationHits) || 0)
      + (hitIndex > 1 ? 1 : 0);
    metrics.pierceDamage = Math.max(0, Number(metrics.pierceDamage) || 0) + effectiveDamage;
    if (!metrics.pierceHitsBySource || typeof metrics.pierceHitsBySource !== 'object') {
      metrics.pierceHitsBySource = {};
    }
    metrics.pierceHitsBySource[provenance] = Math.max(
      0,
      Number(metrics.pierceHitsBySource[provenance]) || 0
    ) + 1;
  }
  return {
    allowed: true,
    damage: effectiveDamage,
    damageMult,
    hitIndex,
    provenance,
    shouldDeactivate: Number.isFinite(contract.maxHits) && hitIndex >= contract.maxHits
  };
}

export function claimExperimentalChainLightningOrigin(bullet, gameOrState = null) {
  const state = getExperimentState(gameOrState);
  if (!state || !bullet) return true;
  if (bullet.chainLightningOriginConsumed === true) return false;
  bullet.chainLightningOriginConsumed = true;
  return true;
}

export function recordExperimentalChainLightningOrigin(gameOrState = null) {
  const state = getExperimentState(gameOrState);
  const metrics = getMetrics(state);
  if (!metrics) return 0;
  metrics.chainLightningOrigins = Math.max(0, Number(metrics.chainLightningOrigins) || 0) + 1;
  return metrics.chainLightningOrigins;
}
