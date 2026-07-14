import { getGeneratedEnemyTypeForSpriteIndex } from './GeneratedEnemyProfiles.js';

// A contact should feel like a story players tell, not a routine wave modifier.
// 0.4% of eligible waves is roughly one appearance per fifty five-sector runs.
export const RARE_CHAOS_VISITOR_WAVE_CHANCE = 0.004;
export const RARE_CHAOS_VISITOR_VARIANT_COUNT = 99;

const HULLS = Object.freeze([
  { id: 'longboat', name: 'The Hollow Procession', spriteIndex: 6, tint: 0xb0083e, accent: 0xff315f, move: 'sweep', health: 1.08 },
  { id: 'taxi', name: 'Black Signal Cutter', spriteIndex: 19, tint: 0x4b0b67, accent: 0xff426f, move: 'feint', health: 0.98 },
  { id: 'fridge', name: 'Ossuary Carrier', spriteIndex: 33, tint: 0x7a001f, accent: 0xffb0c4, move: 'anchor', health: 1.28 },
  { id: 'goose', name: 'Carrion Interceptor', spriteIndex: 47, tint: 0x9d1237, accent: 0xff6b49, move: 'pincer', health: 1.04 },
  { id: 'choir', name: 'The Mourning Choir', spriteIndex: 61, tint: 0x48106f, accent: 0xdf5cff, move: 'orbit', health: 1.14 },
  { id: 'invoice', name: 'Redacted Collector', spriteIndex: 78, tint: 0x69002f, accent: 0xff3f72, move: 'needle', health: 1.2 },
  { id: 'teapot', name: 'Ashen Crucible', spriteIndex: 102, tint: 0x8a1609, accent: 0xff6948, move: 'split_sweep', health: 1.1 },
  { id: 'disco', name: 'The Siren Below', spriteIndex: 126, tint: 0x630b72, accent: 0xff2f8a, move: 'weave_wall', health: 1.02 },
  { id: 'accountant', name: 'The Final Auditor', spriteIndex: 151, tint: 0x311061, accent: 0xff4f70, move: 'ambush', health: 1.24 }
]);

const WEAPON_RIGS = Object.freeze([
  { id: 'laser_tantrum', name: 'Null Lance', shot: 'fan', action: 'telegraph_rail_lance', fire: 2.75, delay: 0.42, speed: 1.14 },
  { id: 'bullet_weather', name: 'Grief Storm', shot: 'net', action: 'pulse_ring_bloom', fire: 3.0, delay: 0.38, speed: 1.02 },
  { id: 'lane_ownership', name: 'Lane Erasure', shot: 'needle', action: 'lane_cutter', fire: 2.58, delay: 0.46, speed: 1.26 },
  { id: 'panic_fan', name: 'Maw Array', shot: 'fan', action: 'shotgun_fan_feint', fire: 2.88, delay: 0.4, speed: 1.1 },
  { id: 'mine_confetti', name: 'Wake Mines', shot: 'burst_pair', action: 'mine_drop', fire: 2.68, delay: 0.43, speed: 1.04 },
  { id: 'boomerang_receipts', name: 'Returning Ruin', shot: 'sweep', action: 'boomerang_crescent', fire: 2.78, delay: 0.41, speed: 1.12 },
  { id: 'crossfire_apology', name: 'Execution Crossfire', shot: 'crossfire', action: 'crossfire_pair', fire: 2.92, delay: 0.39, speed: 1.14 },
  { id: 'satellite_soup', name: 'Dead Orbit', shot: 'net', action: 'orbiting_satellites', fire: 2.62, delay: 0.45, speed: 1.04 },
  { id: 'dash_cannon', name: 'Coffin Dash', shot: 'needle', action: 'brake_dash_bolt', fire: 2.74, delay: 0.42, speed: 1.22 },
  { id: 'split_decision', name: 'Fracture Seed', shot: 'burst_pair', action: 'splitter_seed', fire: 2.96, delay: 0.37, speed: 1.1 },
  { id: 'everything_everywhere', name: 'Extinction Battery', shot: 'fan', action: 'pulse_ring_bloom', fire: 3.18, delay: 0.34, speed: 1.18 }
]);

function hashText(value) {
  let hash = 2166136261;
  const text = String(value || 'nova-swarm');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableUnit(seed, salt) {
  return (hashText(`${seed}:${salt}`) % 1000000) / 1000000;
}

export const RARE_CHAOS_VISITOR_VARIANTS = Object.freeze(HULLS.flatMap((hull, hullIndex) => (
  WEAPON_RIGS.map((weapon, weaponIndex) => {
    const number = hullIndex * WEAPON_RIGS.length + weaponIndex + 1;
    return Object.freeze({
      id: `rare_chaos_visitor_${String(number).padStart(2, '0')}`,
      number,
      displayName: hull.name,
      loadoutName: weapon.name,
      hullId: hull.id,
      weaponId: weapon.id,
      spriteIndex: hull.spriteIndex,
      enemyType: getGeneratedEnemyTypeForSpriteIndex(hull.spriteIndex),
      tint: hull.tint,
      accent: hull.accent,
      move: hull.move,
      shot: weapon.shot,
      threatActionId: weapon.action,
      healthScalar: hull.health * (1 + weaponIndex * 0.018),
      fireScalar: weapon.fire,
      fireDelayMult: weapon.delay,
      projectileSpeedScalar: weapon.speed,
      rewardPowerupType: ['shield', 'bomb', 'shockwave', 'row_core'][number % 4]
    });
  })
)));

export function getRareChaosVisitorVariant(idOrNumber) {
  const number = Number(idOrNumber);
  if (Number.isFinite(number)) {
    return RARE_CHAOS_VISITOR_VARIANTS[(Math.max(1, Math.floor(number)) - 1) % RARE_CHAOS_VISITOR_VARIANTS.length];
  }
  return RARE_CHAOS_VISITOR_VARIANTS.find((variant) => variant.id === idOrNumber) || null;
}

export function isRareChaosVisitorEligibleWave(config = {}) {
  return Boolean(
    config &&
    config.type &&
    config.type !== 'BOSS' &&
    config.type !== 'bonus_challenge' &&
    config.isChallenge !== true &&
    config.isMayhemReinforcement !== true &&
    config.isBossMayhemReinforcement !== true &&
    config.disableRareChaosVisitor !== true
  );
}

export function planRareChaosVisitorSpawn({ seed = 'nova-swarm', level = 1, waveIndex = 0, config = {}, force = false } = {}) {
  const eligible = isRareChaosVisitorEligibleWave(config);
  const salt = `${Math.max(1, Math.floor(Number(level) || 1))}:${Math.max(0, Math.floor(Number(waveIndex) || 0))}`;
  const roll = stableUnit(seed, `rare-chaos-roll:${salt}`);
  const variantRoll = stableUnit(seed, `rare-chaos-variant:${salt}`);
  const variantIndex = Math.min(RARE_CHAOS_VISITOR_VARIANTS.length - 1, Math.floor(variantRoll * RARE_CHAOS_VISITOR_VARIANTS.length));
  return Object.freeze({
    eligible,
    forced: force === true,
    chance: RARE_CHAOS_VISITOR_WAVE_CHANCE,
    roll,
    shouldSpawn: eligible && (force === true || roll < RARE_CHAOS_VISITOR_WAVE_CHANCE),
    variant: RARE_CHAOS_VISITOR_VARIANTS[variantIndex]
  });
}
