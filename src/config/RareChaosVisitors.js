import { getGeneratedEnemyTypeForSpriteIndex } from './GeneratedEnemyProfiles.js';

export const RARE_CHAOS_VISITOR_WAVE_CHANCE = 0.03;
export const RARE_CHAOS_VISITOR_VARIANT_COUNT = 99;

const HULLS = Object.freeze([
  { id: 'longboat', name: 'Longboat of Questionable Decisions', spriteIndex: 6, tint: 0xff4e91, accent: 0x66f7ff, move: 'sweep', health: 1.05 },
  { id: 'taxi', name: 'Laser Taxi With No Brakes', spriteIndex: 19, tint: 0xffd34e, accent: 0xff5b87, move: 'feint', health: 0.94 },
  { id: 'fridge', name: 'Armored Space Fridge', spriteIndex: 33, tint: 0xa8f7ff, accent: 0xffef7e, move: 'anchor', health: 1.22 },
  { id: 'goose', name: 'Unauthorized Battle Goose', spriteIndex: 47, tint: 0xffffff, accent: 0xff6b49, move: 'pincer', health: 0.98 },
  { id: 'choir', name: 'The Extremely Loud Choir', spriteIndex: 61, tint: 0xbf74ff, accent: 0x7dffcc, move: 'orbit', health: 1.08 },
  { id: 'invoice', name: 'Hostile Invoice Department', spriteIndex: 78, tint: 0x7dffcc, accent: 0xff5d7a, move: 'needle', health: 1.14 },
  { id: 'teapot', name: 'Interstellar Combat Teapot', spriteIndex: 102, tint: 0xff8f4e, accent: 0x66f7ff, move: 'split_sweep', health: 1.02 },
  { id: 'disco', name: 'Disco Emergency Vehicle', spriteIndex: 126, tint: 0xff58e6, accent: 0xffef72, move: 'weave_wall', health: 0.96 },
  { id: 'accountant', name: 'The Final Boss Accountant', spriteIndex: 151, tint: 0x6da8ff, accent: 0xff5f8e, move: 'ambush', health: 1.18 }
]);

const WEAPON_RIGS = Object.freeze([
  { id: 'laser_tantrum', name: 'Laser Tantrum', shot: 'fan', action: 'telegraph_rail_lance', fire: 2.5, delay: 0.44, speed: 1.08 },
  { id: 'bullet_weather', name: 'Bullet Weather', shot: 'net', action: 'pulse_ring_bloom', fire: 2.75, delay: 0.40, speed: 0.92 },
  { id: 'lane_ownership', name: 'Lane Ownership Dispute', shot: 'needle', action: 'lane_cutter', fire: 2.34, delay: 0.48, speed: 1.22 },
  { id: 'panic_fan', name: 'Panic Fan Deluxe', shot: 'fan', action: 'shotgun_fan_feint', fire: 2.64, delay: 0.42, speed: 1.02 },
  { id: 'mine_confetti', name: 'Mine Confetti', shot: 'burst_pair', action: 'mine_drop', fire: 2.42, delay: 0.45, speed: 0.96 },
  { id: 'boomerang_receipts', name: 'Boomerang Receipts', shot: 'sweep', action: 'boomerang_crescent', fire: 2.52, delay: 0.43, speed: 1.04 },
  { id: 'crossfire_apology', name: 'Crossfire Apology', shot: 'crossfire', action: 'crossfire_pair', fire: 2.62, delay: 0.41, speed: 1.08 },
  { id: 'satellite_soup', name: 'Satellite Soup', shot: 'net', action: 'orbiting_satellites', fire: 2.38, delay: 0.47, speed: 0.94 },
  { id: 'dash_cannon', name: 'Brake Check Cannon', shot: 'needle', action: 'brake_dash_bolt', fire: 2.48, delay: 0.44, speed: 1.18 },
  { id: 'split_decision', name: 'Poorly Split Decision', shot: 'burst_pair', action: 'splitter_seed', fire: 2.7, delay: 0.39, speed: 1.02 },
  { id: 'everything_everywhere', name: 'Everything Everywhere Battery', shot: 'fan', action: 'pulse_ring_bloom', fire: 2.9, delay: 0.36, speed: 1.12 }
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
