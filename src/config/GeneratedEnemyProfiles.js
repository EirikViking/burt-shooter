import { hashString } from './VisualVariantCatalog.js';
import { ENEMY_ATTACK_STYLE_DEFS, getEnemyAttackStyle } from './EnemyAttackStyles.js';
import { ENEMY_MOVEMENT_STYLE_DEFS } from './EnemyMovementStyles.js';
import { getNovaPerformanceFlags } from './PerformanceFlags.js';

export const GENERATED_ENEMY_LEGACY_TOTAL = 180;
export const GENERATED_ENEMY_EXTRA_TOTAL = 177;
export const GENERATED_ENEMY_EARLY_SURGE_TOTAL = 1423;
export const GENERATED_ENEMY_EARLY_SURGE_START_INDEX = GENERATED_ENEMY_LEGACY_TOTAL + GENERATED_ENEMY_EXTRA_TOTAL;
export const GENERATED_ENEMY_TOTAL = GENERATED_ENEMY_LEGACY_TOTAL + GENERATED_ENEMY_EXTRA_TOTAL + GENERATED_ENEMY_EARLY_SURGE_TOTAL;
export const GENERATED_ENEMY_LEGACY_ASSET_COUNT = 50;
export const GENERATED_ENEMY_EXTRA_ASSET_COUNT = GENERATED_ENEMY_EXTRA_TOTAL;
export const GENERATED_ENEMY_ASSET_COUNT = GENERATED_ENEMY_LEGACY_ASSET_COUNT + GENERATED_ENEMY_EXTRA_ASSET_COUNT;
export const GENERATED_ENEMY_STARTER_COUNT = 10;
export const GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL = 11;
export const GENERATED_ENEMY_FULL_UNLOCK_LEVEL = 40;
export const SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT = false;
export const SMALL_GENERATED_ENEMY_SPRITE_INDEXES = Object.freeze([
  51, 58, 60, 66, 68, 84, 85, 118
]);

const SMALL_GENERATED_ENEMY_SPRITE_INDEX_SET = new Set(SMALL_GENERATED_ENEMY_SPRITE_INDEXES);

const LEGACY_NAMES = [
  'Array Nibbler', 'Orbit Clerk', 'Needle Skiff', 'Union Saucer', 'Copper Mite',
  'Prism Skipper', 'Static Crab', 'Velvet Dart', 'Bracket Wasp', 'Signal Toad',
  'Chrome Peeler', 'Neon Gasket', 'Arc Mantis', 'Ticker Crown', 'Murmur Kite',
  'Frost Rivet', 'Plasma Flea', 'Bossling Intern', 'Quartz Claw', 'Comet Pin',
  'Zigzag Bishop', 'Hazard Limpet', 'Magnet Snail', 'Ruby Skewer', 'Mint Grumble',
  'Coil Button', 'Solar Sprocket', 'Glitch Minnow', 'Cobalt Fang', 'Ember Clerk',
  'Spectral Thumb', 'Pixel Baron', 'Wobble Taxman', 'Circuit Leech', 'Auric Rascal',
  'Drone Wrangler', 'Pattern Accountant', 'Shimmer Bracket', 'Turbo Pebble', 'Husher Saw',
  'Violet Needle', 'Crimson Shovel', 'Scanner Impulse', 'Royal Bolt', 'Crown Hopper',
  'Glooper Prime', 'Breaker Noodle', 'Overdrive Mote', 'Cabinet Menace', 'Final Formlet'
];

const NAME_PREFIXES = [
  'Static', 'Ion', 'Vector', 'Nova', 'Orbit', 'Mirror', 'Drift', 'Pulse', 'Chrome', 'Velvet',
  'Solar', 'Cinder', 'Frost', 'Signal', 'Arc', 'Prism', 'Lattice', 'Turbo', 'Quiet', 'Royal'
];

const NAME_NOUNS = [
  'Mite', 'Skiff', 'Wasp', 'Clerk', 'Rivet', 'Needle', 'Kite', 'Gasket', 'Sprocket', 'Leech',
  'Mantis', 'Crab', 'Minnow', 'Crown', 'Bolt', 'Courier', 'Dart', 'Limpet', 'Saw', 'Bracket'
];

const MAYHEM_PREFIXES = [
  'Neon', 'Panic', 'Turbo', 'Chrome', 'Quantum', 'Static', 'Disco', 'Hazard', 'Prism', 'Vector',
  'Laser', 'Invoice', 'Riot', 'Comet', 'Battery', 'Glitter', 'Crash', 'Mirror', 'Rocket', 'Fever',
  'Voltage', 'Sirensong', 'Afterburn', 'Arcade', 'Loud'
];

const MAYHEM_NOUNS = [
  'Receipt', 'Forklift', 'Warrant', 'Bugreport', 'Dividend', 'Trombone', 'Mailbox', 'Fusebox',
  'Candelabra', 'Briefcase', 'Siren', 'Radiator', 'Maraca', 'Anvil', 'Stapler', 'Kiosk',
  'Gavel', 'Toaster', 'Briefing', 'Monocle', 'Semaphore', 'Doorknob', 'Parade', 'Confession',
  'Trophy', 'Panic Button', 'Circuit Judge', 'Snack Machine', 'Tax Orbit', 'Laundry Cannon'
];

const MAYHEM_SFX = [
  'enemy_explode',
  'explosionCrunch',
  'nova_danger_mid_pop',
  'impactMetal',
  'spawn_special',
  'boss_damage_armor_crack',
  'nova_fuel_ship_pop',
  'elite_death'
];

const EARLY_SURGE_PREFIXES = [
  'Tiny', 'Illegal', 'Velcro', 'Snack', 'Turbo', 'Budget', 'Neon', 'Parking', 'Quantum', 'Wobbly',
  'Lunch', 'Chrome', 'Cursed', 'Friendly', 'Static', 'Emergency', 'Disco', 'Invoice', 'Pocket', 'Nervous',
  'Cosmic', 'Bureau', 'Laser', 'Panic', 'Spare', 'Royal', 'Half-Price', 'Astro', 'Certified', 'Noisy',
  'Polite', 'Maximum', 'Pocket-Size'
];

const EARLY_SURGE_NOUNS = [
  'Goblet', 'Forklift', 'Blinker', 'Cupholder', 'Skate', 'Stapler', 'Mugshot', 'Keytar', 'Wrench',
  'Doormat', 'Receipt', 'Fuse', 'Mailbox', 'Velcro Baron', 'Lunchbox', 'Sirenswitch', 'Oath', 'Ticket',
  'Bolt', 'Noodle', 'Alarm', 'Tax Form', 'Gasket', 'Bucket', 'Pancake', 'Monocle', 'Button', 'Spanner',
  'Beacon', 'Canoe', 'Badge', 'Doorbell', 'Sparkplug', 'Saucer', 'Clip', 'Relay', 'Crumb'
];

const EARLY_SURGE_CALLSIGNS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V',
  'W', 'X', 'Y', 'Z'
];

const EARLY_SURGE_ROLE_DEFS = [
  { id: 'micro_spark', hp: 0, speed: 0.03, fire: 34, radius: -1, score: 1, dive: 0.3 },
  { id: 'lane_confetti', hp: 0, speed: -0.01, fire: 42, radius: 0, score: 1, dive: 0.24 },
  { id: 'soft_scout', hp: 0, speed: 0.06, fire: 38, radius: -2, score: 2, dive: 0.36 },
  { id: 'bright_decoy', hp: 0, speed: 0.01, fire: 46, radius: 1, score: 2, dive: 0.2 },
  { id: 'paper_mender', hp: 0, speed: -0.03, fire: 50, radius: 0, score: 3, dive: 0.18 },
  { id: 'noise_intern', hp: 0, speed: 0.04, fire: 44, radius: -1, score: 3, dive: 0.28 },
  { id: 'glow_errand', hp: 0, speed: 0.02, fire: 48, radius: 1, score: 2, dive: 0.22 },
  { id: 'shy_vector', hp: 0, speed: 0.05, fire: 40, radius: -1, score: 3, dive: 0.32 }
];

const EARLY_SURGE_MOVEMENTS = ['sine', 'zigzag', 'circle', 'drunk'];
const EARLY_SURGE_ATTACKS = ['single', 'double', 'wide'];

const ROLE_DEFS = [
  { id: 'basic_fodder', unlockLevel: 1, hp: 0, speed: -0.02, fire: 12, radius: -1, score: 0, dive: 0.62 },
  { id: 'fast_scout', unlockLevel: 1, hp: 0, speed: 0.14, fire: 6, radius: -2, score: 1, dive: 0.82 },
  { id: 'simple_shooter', unlockLevel: 1, hp: 0, speed: 0.03, fire: -4, radius: 0, score: 2, dive: 0.72 },
  { id: 'slow_tank', unlockLevel: 5, hp: 1, speed: -0.1, fire: 20, radius: 3, score: 6, dive: 0.55 },
  { id: 'sniper', unlockLevel: 8, hp: 0, speed: 0.02, fire: 10, radius: -1, score: 5, dive: 0.68 },
  { id: 'spread_shooter', unlockLevel: 10, hp: 0, speed: 0.01, fire: 16, radius: 0, score: 6, dive: 0.7 },
  { id: 'formation_anchor', unlockLevel: 12, hp: 1, speed: -0.05, fire: 18, radius: 2, score: 7, dive: 0.48 },
  { id: 'space_denial', unlockLevel: 16, hp: 1, speed: -0.03, fire: 20, radius: 2, score: 8, dive: 0.5 },
  { id: 'charger', unlockLevel: 20, hp: 0, speed: 0.12, fire: 12, radius: 0, score: 8, dive: 0.95 },
  { id: 'evasive', unlockLevel: 24, hp: 0, speed: 0.1, fire: 6, radius: -1, score: 9, dive: 0.78 },
  { id: 'escort', unlockLevel: 28, hp: 1, speed: 0.02, fire: 14, radius: 1, score: 10, dive: 0.65 },
  { id: 'disruptor', unlockLevel: 32, hp: 1, speed: 0.04, fire: 10, radius: 1, score: 11, dive: 0.72 },
  { id: 'elite_fodder', unlockLevel: 36, hp: 1, speed: 0.12, fire: 4, radius: 0, score: 12, dive: 0.86 },
  { id: 'elite_tactical', unlockLevel: 40, hp: 2, speed: 0.06, fire: 0, radius: 2, score: 14, dive: 0.82 }
];

const COLOR_PAIRS = [
  [0x66f7ff, 0x16b8ff],
  [0xffd166, 0xff7b00],
  [0xc77dff, 0x7b2cff],
  [0x7cffcb, 0x20e38a],
  [0xff5c8a, 0xff2458],
  [0xf7f7ff, 0x9be7ff],
  [0xa6ff4d, 0x38d430],
  [0xff9f4a, 0xff3d00],
  [0xff7ad9, 0x5dfcff],
  [0xffef6e, 0xf4a300],
  [0x84a8ff, 0x2f5dff],
  [0xff86c8, 0xff3f8f],
  [0x8ef7a7, 0x39d868],
  [0xffc27a, 0xff6a2a],
  [0xd4f8ff, 0x63d9ff],
  [0xe8ff7a, 0xa6d833]
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getLegacyEnemyTargetCountForLevel(level) {
  const safeLevel = clamp(Math.round(Number(level) || 1), 1, GENERATED_ENEMY_FULL_UNLOCK_LEVEL);
  if (safeLevel <= 1) return GENERATED_ENEMY_STARTER_COUNT;
  return Math.min(
    GENERATED_ENEMY_LEGACY_TOTAL,
    Math.ceil(
      GENERATED_ENEMY_STARTER_COUNT +
      (GENERATED_ENEMY_LEGACY_TOTAL - GENERATED_ENEMY_STARTER_COUNT) *
      ((safeLevel - 1) / (GENERATED_ENEMY_FULL_UNLOCK_LEVEL - 1))
    )
  );
}

function getExtraEnemyTargetCountForLevel(level) {
  const safeLevel = clamp(Math.round(Number(level) || 1), 1, GENERATED_ENEMY_FULL_UNLOCK_LEVEL);
  if (safeLevel < GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL) return 0;
  const progress = (safeLevel - (GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL - 1)) /
    (GENERATED_ENEMY_FULL_UNLOCK_LEVEL - (GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL - 1));
  return Math.min(GENERATED_ENEMY_EXTRA_TOTAL, Math.ceil(GENERATED_ENEMY_EXTRA_TOTAL * progress));
}

export function getGeneratedEnemyTargetCountForLevel(level) {
  return GENERATED_ENEMY_EARLY_SURGE_TOTAL +
    getLegacyEnemyTargetCountForLevel(level) +
    getExtraEnemyTargetCountForLevel(level);
}

function buildUnlockLevels() {
  const unlocks = Array(GENERATED_ENEMY_TOTAL).fill(GENERATED_ENEMY_FULL_UNLOCK_LEVEL);
  let legacyCursor = 0;
  for (let level = 1; level <= GENERATED_ENEMY_FULL_UNLOCK_LEVEL; level += 1) {
    const target = getLegacyEnemyTargetCountForLevel(level);
    while (legacyCursor < target && legacyCursor < GENERATED_ENEMY_LEGACY_TOTAL) {
      unlocks[legacyCursor] = level;
      legacyCursor += 1;
    }
  }
  let extraCursor = 0;
  for (let level = GENERATED_ENEMY_EXTRA_UNLOCK_LEVEL; level <= GENERATED_ENEMY_FULL_UNLOCK_LEVEL; level += 1) {
    const target = getExtraEnemyTargetCountForLevel(level);
    while (extraCursor < target && extraCursor < GENERATED_ENEMY_EXTRA_TOTAL) {
      unlocks[GENERATED_ENEMY_LEGACY_TOTAL + extraCursor] = level;
      extraCursor += 1;
    }
  }
  for (let index = GENERATED_ENEMY_EARLY_SURGE_START_INDEX; index < GENERATED_ENEMY_TOTAL; index += 1) {
    unlocks[index] = 1;
  }
  return unlocks;
}

const UNLOCK_LEVELS = buildUnlockLevels();
const UNLOCK_SLOT_BY_INDEX = UNLOCK_LEVELS.map((unlockLevel, index) =>
  UNLOCK_LEVELS.slice(0, index).filter((candidate) => candidate === unlockLevel).length
);

function nameFor(index) {
  if (LEGACY_NAMES[index]) return LEGACY_NAMES[index];
  if (index >= GENERATED_ENEMY_EARLY_SURGE_START_INDEX) {
    const surgeIndex = index - GENERATED_ENEMY_EARLY_SURGE_START_INDEX;
    const prefix = EARLY_SURGE_PREFIXES[(surgeIndex * 17 + Math.floor(surgeIndex / 19)) % EARLY_SURGE_PREFIXES.length];
    const noun = EARLY_SURGE_NOUNS[(surgeIndex * 23 + Math.floor(surgeIndex / 11)) % EARLY_SURGE_NOUNS.length];
    const call = EARLY_SURGE_CALLSIGNS[(surgeIndex * 5 + Math.floor(surgeIndex / 7)) % EARLY_SURGE_CALLSIGNS.length];
    const mark = Math.floor(surgeIndex / EARLY_SURGE_NOUNS.length) + 1;
    return `${prefix} ${noun} ${call}-${mark}`;
  }
  if (index >= GENERATED_ENEMY_LEGACY_TOTAL) {
    const extraIndex = index - GENERATED_ENEMY_LEGACY_TOTAL;
    const prefix = MAYHEM_PREFIXES[(extraIndex * 11 + Math.floor(extraIndex / 7)) % MAYHEM_PREFIXES.length];
    const noun = MAYHEM_NOUNS[(extraIndex * 13 + Math.floor(extraIndex / 5)) % MAYHEM_NOUNS.length];
    const mark = Math.floor(extraIndex / MAYHEM_NOUNS.length) + 1;
    return `${prefix} ${noun} ${mark}`;
  }
  const prefix = NAME_PREFIXES[(index * 7) % NAME_PREFIXES.length];
  const noun = NAME_NOUNS[(index * 11 + Math.floor(index / 3)) % NAME_NOUNS.length];
  const mark = Math.floor(index / NAME_NOUNS.length) + 1;
  return `${prefix} ${noun} ${mark}`;
}

function pickStyleForUnlock(defs, unlockLevel, slot, index, offset = 0) {
  const exact = defs.filter((style) => style.unlockLevel === unlockLevel);
  if (slot < exact.length) return exact[slot].id;
  const available = defs.filter((style) => style.unlockLevel <= unlockLevel);
  return available[(index + offset + slot) % available.length].id;
}

function pickRole(unlockLevel, index, slot) {
  const available = ROLE_DEFS.filter((role) => role.unlockLevel <= unlockLevel);
  return available[(index + slot * 2) % available.length] || ROLE_DEFS[0];
}

function pickEarlySurgeRole(surgeIndex, slot) {
  return EARLY_SURGE_ROLE_DEFS[(surgeIndex * 3 + slot) % EARLY_SURGE_ROLE_DEFS.length];
}

function buildMayhemProfile(extraIndex, unlockLevel, slot, tint, accent) {
  const thirdColor = COLOR_PAIRS[(extraIndex * 5 + slot * 3) % COLOR_PAIRS.length][extraIndex % 2];
  return {
    lateMayhem: true,
    mayhemClass: [
      'neon_receipt_storm',
      'panic_laser_parade',
      'tax_audit_afterburn',
      'disco_voltage_court',
      'glitter_engine_misfire',
      'quantum_siren_invoice',
      'rocket_warranty_breach',
      'chrome_snack_uprising'
    ][extraIndex % 8],
    mayhemTier: 1 + Math.floor(extraIndex / 59),
    deathSfx: MAYHEM_SFX[extraIndex % MAYHEM_SFX.length],
    deathBurstCount: 1 + (extraIndex % 3),
    deathBurstRadius: 12 + (extraIndex % 5) * 4,
    deathSparkCount: 8 + (extraIndex % 6) * 2,
    profileFireScalar: 0.74 + (extraIndex % 5) * 0.025,
    profileDiveScalar: 0.64 + (extraIndex % 4) * 0.04,
    mayhemSpin: (extraIndex % 2 ? -1 : 1) * (0.45 + (extraIndex % 7) * 0.08),
    palette: [tint, accent, thirdColor],
    readableNote: `Late mayhem visual ${extraIndex + 1} unlocks at sector ${unlockLevel}.`
  };
}

function buildEarlySurgeProfile(surgeIndex, slot, tint, accent) {
  const thirdColor = COLOR_PAIRS[(surgeIndex * 7 + slot * 5) % COLOR_PAIRS.length][surgeIndex % 2];
  return {
    earlySurge: true,
    surgeClass: [
      'harmless_alarm_cluster',
      'color_noise_squadron',
      'budget_arcade_riot',
      'tiny_invoice_fleet',
      'training_wheel_swarm',
      'sparkle_decoy_union',
      'wobbly_laser_circus',
      'soft_contact_theater',
      'neon_errand_patrol',
      'paperwork_afterburn'
    ][surgeIndex % 10],
    surgeIndex,
    behaviorSeed: 100000 + surgeIndex,
    deathSfx: MAYHEM_SFX[(surgeIndex * 3 + slot) % MAYHEM_SFX.length],
    deathBurstCount: 1 + (surgeIndex % 2),
    deathBurstRadius: 8 + (surgeIndex % 4) * 2,
    deathSparkCount: 4 + (surgeIndex % 5),
    profileFireScalar: 0.58 + (surgeIndex % 7) * 0.015,
    profileDiveScalar: 0.42 + (surgeIndex % 6) * 0.018,
    palette: [tint, accent, thirdColor],
    readableNote: `Level-one mayhem decal ${surgeIndex + 1}: loud hull, gentle teeth.`
  };
}

function getReadableFastTargetRadius(baseRadius, targetWidth, spriteScale, roleId, movementStyle) {
  const safeBaseRadius = Math.max(1, Number(baseRadius) || 1);
  const isFastTarget = roleId === 'fast_scout' || movementStyle === 'fastNeedle';
  if (!isFastTarget) return safeBaseRadius;

  const apparentRadius = (Math.max(1, Number(targetWidth) || 1) * Math.max(0.1, Number(spriteScale) || 1)) / 2;
  const visualFloor = Math.ceil(apparentRadius * 0.5);
  return clamp(Math.max(safeBaseRadius, Math.min(safeBaseRadius + 3, visualFloor)), safeBaseRadius, 24);
}

function profileFor(index) {
  const unlockLevel = UNLOCK_LEVELS[index];
  const isLateMayhem = index >= GENERATED_ENEMY_LEGACY_TOTAL && index < GENERATED_ENEMY_EARLY_SURGE_START_INDEX;
  const isEarlySurge = index >= GENERATED_ENEMY_EARLY_SURGE_START_INDEX;
  const extraIndex = isLateMayhem ? index - GENERATED_ENEMY_LEGACY_TOTAL : -1;
  const surgeIndex = isEarlySurge ? index - GENERATED_ENEMY_EARLY_SURGE_START_INDEX : -1;
  const slot = isLateMayhem ? extraIndex % 17 : isEarlySurge ? surgeIndex % 37 : index % 10;
  const unlockSlot = UNLOCK_SLOT_BY_INDEX[index];
  const tier = Math.floor((unlockLevel - 1) / 8);
  const assetBand = isLateMayhem
    ? 4 + Math.floor(extraIndex / 35)
    : isEarlySurge
      ? 1 + ((surgeIndex * 5 + Math.floor(surgeIndex / 41)) % 7)
      : Math.floor(index / GENERATED_ENEMY_LEGACY_ASSET_COUNT);
  const role = isEarlySurge ? pickEarlySurgeRole(surgeIndex, slot) : pickRole(unlockLevel, index, unlockSlot);
  const [tint, accent] = COLOR_PAIRS[(slot + tier + assetBand * 3 + (isLateMayhem ? extraIndex : 0) + (isEarlySurge ? surgeIndex * 2 : 0)) % COLOR_PAIRS.length];
  const movementStyle = isEarlySurge
    ? EARLY_SURGE_MOVEMENTS[(surgeIndex + slot + Math.floor(surgeIndex / 13)) % EARLY_SURGE_MOVEMENTS.length]
    : pickStyleForUnlock(ENEMY_MOVEMENT_STYLE_DEFS, unlockLevel, unlockSlot, index, tier);
  const fireStyle = isEarlySurge
    ? EARLY_SURGE_ATTACKS[(surgeIndex * 2 + slot + Math.floor(surgeIndex / 17)) % EARLY_SURGE_ATTACKS.length]
    : pickStyleForUnlock(ENEMY_ATTACK_STYLE_DEFS, unlockLevel, unlockSlot, index, tier * 2);
  const attack = getEnemyAttackStyle(fireStyle);
  const lateTier = Math.max(0, Math.floor((unlockLevel - 1) / 10));
  const heavy = fireStyle === 'slowHeavy' || fireStyle === 'slowOrb' || fireStyle === 'chargeShot';
  const quick = fireStyle === 'quickChip' || fireStyle === 'stutter' || role.id === 'fast_scout';
  const mayhem = isLateMayhem ? buildMayhemProfile(extraIndex, unlockLevel, slot, tint, accent) : null;
  const surge = isEarlySurge ? buildEarlySurgeProfile(surgeIndex, slot, tint, accent) : null;
  const healthBase = isEarlySurge
    ? 1 + (surgeIndex % 97 === 0 ? 1 : 0)
    : 1 + Math.floor((slot + lateTier) / 4) + role.hp + (heavy ? 1 : 0) - (isLateMayhem ? 1 : 0);
  const speedBase = isEarlySurge
    ? 0.52 + (surgeIndex % 17) * 0.011 + role.speed + ((surgeIndex % 5) * 0.006)
    : 0.6 + Math.min(0.28, unlockLevel * 0.009) + (slot % 5) * 0.055 + role.speed + (quick ? 0.05 : 0) - (isLateMayhem ? 0.04 : 0);
  const shootDelay = isEarlySurge
    ? Math.round(174 + role.fire + (surgeIndex % 23) * 5 + (slot % 4) * 7 + (attack.delayOffset || 0))
    : Math.round(
      138 -
      Math.min(24, unlockLevel * 0.65) -
      (quick ? 18 : 0) +
      (attack.delayOffset || 0) +
      role.fire +
      (slot % 3) * 6 +
      (isLateMayhem ? 18 + (extraIndex % 5) * 4 : 0)
    );
  const spriteScale = round(
    isEarlySurge
      ? 0.94 + (surgeIndex % 9) * 0.01 + (assetBand % 3) * 0.014
      : 0.92 + (slot % 4) * 0.035 + assetBand * 0.026 + (role.radius > 1 ? 0.04 : 0),
    3
  );
  const targetWidth = isEarlySurge
    ? Math.round(58 + (surgeIndex % 11) * 2 + (assetBand % 4) * 4)
    : Math.round(38 + (slot % 5) * 3 + assetBand * (isLateMayhem ? 1.7 : 4) + Math.min(8, unlockLevel / 8));
  const baseRadius = isEarlySurge
    ? clamp(11 + (surgeIndex % 6) + role.radius, 10, 18)
    : clamp(13 + (slot % 5) + role.radius + (heavy ? 2 : 0), 11, 24);
  const radius = getReadableFastTargetRadius(baseRadius, targetWidth, spriteScale, role.id, movementStyle);

  return {
    id: `nova_enemy_${String(index + 1).padStart(3, '0')}`,
    type: `nova_enemy_${String(index + 1).padStart(3, '0')}`,
    legacyType: index < 50 ? `nova_enemy_${String(index + 1).padStart(2, '0')}` : null,
    spriteIndex: isLateMayhem
      ? GENERATED_ENEMY_LEGACY_ASSET_COUNT + extraIndex
      : isEarlySurge
        ? (surgeIndex * 37 + Math.floor(surgeIndex / 5) * 11 + (surgeIndex % 13)) % GENERATED_ENEMY_LEGACY_ASSET_COUNT
        : index % GENERATED_ENEMY_LEGACY_ASSET_COUNT,
    visualBand: assetBand,
    displayName: nameFor(index),
    role: role.id,
    tier: isEarlySurge ? 'starter-surge' : unlockLevel <= 1 ? 'starter' : unlockLevel <= 11 ? 'early' : unlockLevel <= 20 ? 'mid' : unlockLevel <= 30 ? 'advanced' : 'elite',
    unlockLevel,
    tint,
    accent,
    hullTint: isLateMayhem || isEarlySurge ? 0xffffff : assetBand === 0 ? 0xffffff : tint,
    spriteScale,
    glowAlpha: round((isLateMayhem ? 0.28 : isEarlySurge ? 0.2 : 0.15) + Math.min(0.18, assetBand * 0.022) + (unlockLevel >= 30 ? 0.03 : 0), 3),
    health: Math.max(1, healthBase),
    speed: round(Math.max(0.42, speedBase), 2),
    shootDelay,
    radius,
    scoreValue: isEarlySurge
      ? 10 + role.score + (surgeIndex % 9) + Math.floor(surgeIndex / 240)
      : 16 + Math.floor(unlockLevel * 1.3) + slot * 2 + role.score + (heavy ? 5 : 0) + (isLateMayhem ? 4 + (extraIndex % 6) : 0),
    movementStyle,
    fireStyle,
    attackStyle: fireStyle,
    shotCount: attack.shotCount,
    spread: attack.spread,
    projectileSpeedMult: round(
      isEarlySurge
        ? Math.max(0.72, Math.min(0.94, (attack.speedMult || 1) - 0.18 + (surgeIndex % 8) * 0.012))
        : Math.max(0.82, (attack.speedMult || 1) + Math.min(0.18, unlockLevel * 0.004) + (slot % 4) * 0.018 - (isLateMayhem ? 0.05 : 0)),
      2
    ),
    damageMult: round((attack.damageMult || 1) * (isLateMayhem ? 0.94 : isEarlySurge ? 0.68 : 1), 2),
    idleAmpX: isEarlySurge
      ? 5 + (surgeIndex % 11) + (movementStyle === 'circle' ? 4 : 0)
      : 8 + (slot % 5) * 3 + tier * 1.5 + (movementStyle === 'anchor' ? -4 : 0) + (isLateMayhem ? 5 + (extraIndex % 4) : 0),
    idleAmpY: isEarlySurge
      ? 3 + (surgeIndex % 7) * 0.9 + (movementStyle === 'drunk' ? 2 : 0)
      : 4 + (slot % 4) * 1.5 + (movementStyle === 'pulseAdvance' ? 4 : 0) + (isLateMayhem ? 2 + (extraIndex % 3) : 0),
    diveBias: round(
      isEarlySurge
        ? (role.dive + (surgeIndex % 9) * 0.012) * (surge?.profileDiveScalar || 1)
        : (role.dive + (slot % 6) * 0.035 + Math.min(0.28, unlockLevel * 0.006)) * (mayhem?.profileDiveScalar || 1),
      2
    ),
    targetWidth,
    ...(mayhem || {}),
    ...(surge || {})
  };
}

export const GENERATED_ENEMY_PROFILES = Array.from({ length: GENERATED_ENEMY_TOTAL }, (_, index) => profileFor(index));
export const GENERATED_ENEMY_TYPES = GENERATED_ENEMY_PROFILES.map((profile) => profile.type);

const PROFILE_BY_TYPE = new Map();
const FIRST_PROFILE_BY_SPRITE_INDEX = new Map();
for (const profile of GENERATED_ENEMY_PROFILES) {
  PROFILE_BY_TYPE.set(profile.type, profile);
  if (profile.legacyType) PROFILE_BY_TYPE.set(profile.legacyType, profile);
  if (!FIRST_PROFILE_BY_SPRITE_INDEX.has(profile.spriteIndex)) {
    FIRST_PROFILE_BY_SPRITE_INDEX.set(profile.spriteIndex, profile);
  }
}

const PROFILE_POOL_BY_LEVEL = new Map();

export function isSmallGeneratedEnemyProfile(profile) {
  return Boolean(profile?.lateMayhem === true && SMALL_GENERATED_ENEMY_SPRITE_INDEX_SET.has(profile.spriteIndex));
}

function shouldIncludeSmallGeneratedEnemies(flags) {
  if (flags.enableSmallEnemyShips) return true;
  if (flags.disableSmallEnemyShips) return false;
  return SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT;
}

export function getGeneratedEnemyProfilesForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const flags = getNovaPerformanceFlags();
  const disableNewEnemyRoster = flags.disableNewEnemyRoster;
  const includeSmallEnemyShips = shouldIncludeSmallGeneratedEnemies(flags);
  const cacheKey = `${safeLevel}:${disableNewEnemyRoster ? 'legacy' : 'full'}:${includeSmallEnemyShips ? 'small-on' : 'small-off'}`;
  if (PROFILE_POOL_BY_LEVEL.has(cacheKey)) return PROFILE_POOL_BY_LEVEL.get(cacheKey);
  const pool = GENERATED_ENEMY_PROFILES.filter((profile) =>
    profile.unlockLevel <= safeLevel &&
    (!disableNewEnemyRoster || profile.lateMayhem !== true) &&
    (includeSmallEnemyShips || !isSmallGeneratedEnemyProfile(profile))
  );
  PROFILE_POOL_BY_LEVEL.set(cacheKey, pool);
  return pool;
}

export function getGeneratedEnemyTypesForLevel(level) {
  return getGeneratedEnemyProfilesForLevel(level).map((profile) => profile.type);
}

export function getGeneratedEnemyTypeForSpriteIndex(spriteIndex) {
  const safeIndex = Math.max(0, Math.floor(Number(spriteIndex) || 0));
  return FIRST_PROFILE_BY_SPRITE_INDEX.get(safeIndex)?.type || GENERATED_ENEMY_TYPES[0];
}

export function getGeneratedEnemyPoolStats(level) {
  const profiles = getGeneratedEnemyProfilesForLevel(level);
  return {
    level: Math.max(1, Number(level) || 1),
    availableProfiles: profiles.length,
    totalProfiles: GENERATED_ENEMY_PROFILES.length,
    smallProfiles: profiles.filter(isSmallGeneratedEnemyProfile).length,
    totalSmallProfiles: GENERATED_ENEMY_PROFILES.filter(isSmallGeneratedEnemyProfile).length,
    movementFamilies: new Set(profiles.map((profile) => profile.movementStyle)).size,
    totalMovementFamilies: new Set(GENERATED_ENEMY_PROFILES.map((profile) => profile.movementStyle)).size,
    attackFamilies: new Set(profiles.map((profile) => profile.fireStyle)).size,
    totalAttackFamilies: new Set(GENERATED_ENEMY_PROFILES.map((profile) => profile.fireStyle)).size
  };
}

export function getGeneratedEnemyTypeAtLevelProgress(level, progress = 0) {
  const pool = getGeneratedEnemyProfilesForLevel(level);
  if (!pool.length) return GENERATED_ENEMY_TYPES[0];
  const index = clamp(Math.floor(progress * pool.length), 0, pool.length - 1);
  return pool[index].type;
}

export function pickGeneratedEnemyTypeForLevel(level, random = Math.random) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const pool = getGeneratedEnemyProfilesForLevel(safeLevel);
  if (!pool.length) return GENERATED_ENEMY_TYPES[0];
  let totalWeight = 0;
  for (const profile of pool) {
    const age = safeLevel - profile.unlockLevel;
    totalWeight += age <= 0 ? 5 : age <= 2 ? 3 : age <= 5 ? 2 : 1;
  }
  let roll = Math.max(0, Math.min(0.999999, Number(random()) || 0)) * totalWeight;
  for (const profile of pool) {
    const age = safeLevel - profile.unlockLevel;
    const weight = age <= 0 ? 5 : age <= 2 ? 3 : age <= 5 ? 2 : 1;
    roll -= weight;
    if (roll <= 0) return profile.type;
  }
  return pool[pool.length - 1]?.type || pool[0].type;
}

export function getGeneratedEnemyProfile(type, seed = '') {
  if (typeof type === 'string' && PROFILE_BY_TYPE.has(type)) {
    return PROFILE_BY_TYPE.get(type);
  }
  if (type === 'generated' || type === 'nova_enemy') {
    return GENERATED_ENEMY_PROFILES[hashString(seed || Date.now()) % GENERATED_ENEMY_PROFILES.length];
  }
  return null;
}
