import { CABINET_WONDER_DEFINITIONS } from '../config/CabinetWonderLore.js';

export const CABINET_WONDER_CATALOG = CABINET_WONDER_DEFINITIONS;

export const CABINET_WONDER_VARIANT_COUNT = CABINET_WONDER_CATALOG.length;
export const CABINET_WONDER_SECTOR_CADENCE = 3;

function hashUint32(value) {
  let hash = 2166136261;
  const input = String(value || 'nova-swarm');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getCabinetWonderById(id) {
  return CABINET_WONDER_CATALOG.find((entry) => entry.id === id) || null;
}

export function getCabinetWonderChance({ sector = 1, eligibleChecks = 0 } = {}) {
  const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
  return safeSector >= CABINET_WONDER_SECTOR_CADENCE && safeSector % CABINET_WONDER_SECTOR_CADENCE === 0 ? 1 : 0;
}

function pickFreshVariant(seed, sector, waveNumber, recentVariantIds = []) {
  const recent = new Set((recentVariantIds || []).map(String));
  const startIndex = hashUint32(`${seed}:cabinet-wonder:${sector}:${waveNumber}:variant`) % CABINET_WONDER_VARIANT_COUNT;
  for (let offset = 0; offset < CABINET_WONDER_VARIANT_COUNT; offset += 1) {
    const candidate = CABINET_WONDER_CATALOG[(startIndex + offset) % CABINET_WONDER_VARIANT_COUNT];
    if (!recent.has(candidate.id)) return candidate;
  }
  return CABINET_WONDER_CATALOG[startIndex];
}

export function evaluateCabinetWonder(seed, context = {}) {
  const sector = Math.max(1, Math.floor(Number(context.sector) || 1));
  const waveNumber = Math.max(1, Math.floor(Number(context.waveNumber) || 1));
  const eligibleChecks = Math.max(0, Math.floor(Number(context.eligibleChecks) || 0));
  const forcedVariant = context.forceVariantId ? getCabinetWonderById(context.forceVariantId) : null;
  const base = {
    eligible: false,
    triggered: false,
    reason: 'ineligible',
    sector,
    waveNumber,
    eligibleChecks,
    chance: 0,
    roll: null,
    variant: null,
    scoreNeutral: true,
    gameplayNeutral: true
  };

  if (context.sectorAlreadyShown) return { ...base, reason: 'already_shown_this_sector' };
  if (context.debugForce === true) {
    const variant = forcedVariant || CABINET_WONDER_CATALOG[hashUint32(`${seed}:debug:${sector}:${waveNumber}`) % CABINET_WONDER_VARIANT_COUNT];
    return {
      ...base,
      eligible: true,
      triggered: true,
      reason: 'debug_force',
      chance: 1,
      roll: 0,
      variant
    };
  }
  if (context.hasUpcomingWave !== true) return { ...base, reason: 'no_safe_transition' };
  if (context.isChallenge === true) return { ...base, reason: 'challenge_transition' };
  if (context.busyTransition === true) return { ...base, reason: 'busy_transition' };
  if (sector < CABINET_WONDER_SECTOR_CADENCE || waveNumber < 2) return { ...base, reason: 'early_run' };

  const chance = getCabinetWonderChance({ sector, eligibleChecks });
  if (chance === 0) return { ...base, reason: 'between_cadence_sectors' };
  const variant = pickFreshVariant(seed, sector, waveNumber, context.recentVariantIds);
  return {
    ...base,
    eligible: true,
    triggered: true,
    reason: 'sector_cadence',
    chance,
    roll: 0,
    variant
  };
}
