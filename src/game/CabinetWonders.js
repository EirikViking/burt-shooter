const freezeEntries = (entries) => Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));

export const CABINET_WONDER_CATALOG = freezeEntries([
  {
    id: 'ghost_fleet_salute',
    palette: Object.freeze([0x7df9ff, 0xb6a1ff, 0xff70d7]),
    pitchScale: 0.92
  },
  {
    id: 'starwhale_constellation',
    palette: Object.freeze([0xe8fbff, 0x7df9ff, 0xffef9a]),
    pitchScale: 1.08
  },
  {
    id: 'aurora_crown',
    palette: Object.freeze([0x66ffd1, 0x7a8cff, 0xff62d8]),
    pitchScale: 1.2
  },
  {
    id: 'singularity_bloom',
    palette: Object.freeze([0x9a7dff, 0xff65d8, 0x63f4ff]),
    pitchScale: 0.74
  },
  {
    id: 'celestial_koi_procession',
    palette: Object.freeze([0xffd36a, 0xff6fcf, 0x75f7ff]),
    pitchScale: 1.14
  },
  {
    id: 'prismatic_supernova',
    palette: Object.freeze([0xffffff, 0x73efff, 0xff78d7]),
    pitchScale: 1.32
  },
  {
    id: 'warp_cathedral',
    palette: Object.freeze([0x61f7ff, 0x8d7cff, 0xffd86b]),
    pitchScale: 0.84
  },
  {
    id: 'quantum_eclipse',
    palette: Object.freeze([0xffc86b, 0xff5ec9, 0x79eaff]),
    pitchScale: 0.68
  },
  {
    id: 'nebula_jellyfish',
    palette: Object.freeze([0x8c7dff, 0x67ffe0, 0xff78dc]),
    pitchScale: 0.98
  },
  {
    id: 'phoenix_comet',
    palette: Object.freeze([0xffee8a, 0xff7a57, 0xff59cb]),
    pitchScale: 1.26
  }
]);

export const CABINET_WONDER_VARIANT_COUNT = CABINET_WONDER_CATALOG.length;
export const CABINET_WONDER_BASE_CHANCE = 0.055;
export const CABINET_WONDER_MAX_CHANCE = 0.22;

function hashUint32(value) {
  let hash = 2166136261;
  const input = String(value || 'nova-swarm');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(value) {
  return hashUint32(value) / 0x100000000;
}

export function getCabinetWonderById(id) {
  return CABINET_WONDER_CATALOG.find((entry) => entry.id === id) || null;
}

export function getCabinetWonderChance({ sector = 1, eligibleChecks = 0 } = {}) {
  const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
  const safeChecks = Math.max(0, Math.floor(Number(eligibleChecks) || 0));
  const sectorLift = Math.min(0.045, Math.max(0, safeSector - 2) * 0.0045);
  const droughtLift = Math.min(0.12, Math.max(0, safeChecks - 1) * 0.012);
  return Number(Math.min(CABINET_WONDER_MAX_CHANCE, CABINET_WONDER_BASE_CHANCE + sectorLift + droughtLift).toFixed(4));
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

  if (context.alreadyShown) return { ...base, reason: 'already_shown' };
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
  if (sector < 2 || waveNumber < 2) return { ...base, reason: 'early_run' };

  const chance = getCabinetWonderChance({ sector, eligibleChecks });
  const rollKey = `${seed}:cabinet-wonder:${sector}:${waveNumber}:${eligibleChecks}:roll`;
  const roll = Number(hashUnit(rollKey).toFixed(6));
  if (roll >= chance) {
    return { ...base, eligible: true, reason: 'roll_missed', chance, roll };
  }
  const variantIndex = hashUint32(`${seed}:cabinet-wonder:${sector}:${waveNumber}:${eligibleChecks}:variant`) % CABINET_WONDER_VARIANT_COUNT;
  return {
    ...base,
    eligible: true,
    triggered: true,
    reason: 'rare_window',
    chance,
    roll,
    variant: CABINET_WONDER_CATALOG[variantIndex]
  };
}
