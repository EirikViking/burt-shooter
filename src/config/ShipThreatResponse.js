const STARTER_SUSTAINED_DPS = 17.949;
const APEX_SUSTAINED_DPS_RATIO = 2.71;
const RESPONSE_START_DPS_RATIO = 1.15;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function calculateSustainedShipDps(ship = {}, volleys = 240) {
  const stats = ship.stats || {};
  const weapon = ship.weapon || {};
  const combat = ship.trait?.effects?.combat || {};
  const bulletCount = Math.max(1, Number(weapon.bullets) || 1);
  const baseDamage = Math.max(0, Number(stats.damage) || 0);
  const fireRate = Math.max(1, Number(stats.fireRate) || 140);
  let totalDamage = 0;

  for (let shot = 1; shot <= volleys; shot += 1) {
    for (let index = 0; index < bulletCount; index += 1) {
      let damage = baseDamage;
      if (combat.pierceEvery && shot % Number(combat.pierceEvery) === 0) {
        damage = Math.max(0.5, damage * (Number(combat.pierceDamageMult) || 0.72));
      }
      if (combat.critEvery && shot % Number(combat.critEvery) === 0) {
        damage = Math.max(1, damage * (Number(combat.critDamageMult) || 1.38));
      }
      totalDamage += damage;
    }

    if (combat.wingShotEvery && shot % Number(combat.wingShotEvery) === 0) {
      totalDamage += Math.max(0.35, baseDamage * (Number(combat.wingShotDamageMult) || 0.42)) * 2;
    }
    if (combat.bonusShotEvery && shot % Number(combat.bonusShotEvery) === 0) {
      totalDamage += Math.max(0.45, baseDamage * (Number(combat.bonusShotDamageMult) || 0.5));
    }
  }

  return (totalDamage / Math.max(1, volleys)) * (1000 / fireRate);
}

export function buildShipThreatResponse(ship = {}, tacticalPickCount = 0) {
  const sustainedDps = calculateSustainedShipDps(ship);
  const dpsRatio = sustainedDps / STARTER_SUSTAINED_DPS;
  const hullPressure = clamp(
    (dpsRatio - RESPONSE_START_DPS_RATIO) / (APEX_SUSTAINED_DPS_RATIO - RESPONSE_START_DPS_RATIO),
    0,
    1
  );
  const picks = Math.max(0, Math.floor(Number(tacticalPickCount) || 0));
  const draftPressure = clamp(picks, 0, 10);
  const responseLevel = hullPressure >= 0.82
    ? 'APEX'
    : hullPressure >= 0.48
      ? 'HIGH'
      : hullPressure > 0
        ? 'ELEVATED'
        : 'STANDARD';

  return Object.freeze({
    version: 1,
    shipId: ship.id || ship.baseId || ship.spriteKey || 'unknown',
    shipName: ship.name || 'UNKNOWN SHIP',
    responseLevel,
    sustainedDps: round(sustainedDps),
    dpsRatio: round(dpsRatio),
    hullPressure: round(hullPressure),
    tacticalPickCount: picks,
    enemyCountMult: 1,
    // Preserve the fantasy of earning a stronger hull. Response adds enough
    // resistance to keep encounters interactive, but never matches hull DPS
    // one-for-one. Most of the added danger comes from tempo, not health sponges.
    hardenedFodderChance: round(clamp(hullPressure * 0.5 + draftPressure * 0.006, 0, 0.58)),
    hardenedFodderHealth: 2,
    durableHealthMult: round(1 + hullPressure * 0.16 + draftPressure * 0.008),
    enemySpeedMult: round(1 + hullPressure * 0.035),
    enemyFireDelayMult: round(1 - hullPressure * 0.12 - draftPressure * 0.006),
    projectileSpeedMult: round(1 + hullPressure * 0.08 + draftPressure * 0.003),
    bossHealthMult: round(1 + hullPressure * 0.65 + draftPressure * 0.018),
    bossAttackDangerMult: round(1 + hullPressure * 0.1 + draftPressure * 0.004)
  });
}

export function applyThreatResponseToEnemyHealth(baseHealth, response = null, accumulator = 0) {
  const safeHealth = Math.max(1, Math.round(Number(baseHealth) || 1));
  if (!response || response.responseLevel === 'STANDARD') {
    return { health: safeHealth, accumulator: clamp(Number(accumulator) || 0, 0, 0.999), hardened: false };
  }

  if (safeHealth === 1) {
    const nextAccumulator = (Number(accumulator) || 0) + Math.max(0, Number(response.hardenedFodderChance) || 0);
    const hardened = nextAccumulator >= 1;
    return {
      health: hardened ? Math.max(2, Math.round(Number(response.hardenedFodderHealth) || 2)) : 1,
      accumulator: hardened ? nextAccumulator - 1 : nextAccumulator,
      hardened
    };
  }

  const scaled = Math.max(safeHealth, Math.round(safeHealth * Math.max(1, Number(response.durableHealthMult) || 1)));
  return { health: scaled, accumulator: Number(accumulator) || 0, hardened: scaled > safeHealth };
}

export const SHIP_THREAT_RESPONSE_TARGETS = Object.freeze({
  starterSustainedDps: STARTER_SUSTAINED_DPS,
  responseStartDpsRatio: RESPONSE_START_DPS_RATIO,
  apexSustainedDpsRatio: APEX_SUSTAINED_DPS_RATIO,
  maxDirectDraftOutputMult: 1.45,
  secondStackEffectiveness: 0.55,
  minApexFodderPowerRetention: 1.65,
  minApexBossPowerRetention: 1.55
});
