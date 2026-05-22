import { hashString } from './VisualVariantCatalog.js';
import { ENEMY_ATTACK_STYLE_DEFS, getEnemyAttackStyle } from './EnemyAttackStyles.js';
import { ENEMY_MOVEMENT_STYLE_DEFS } from './EnemyMovementStyles.js';

export const GENERATED_ENEMY_TOTAL = 120;
export const GENERATED_ENEMY_ASSET_COUNT = 50;
export const GENERATED_ENEMY_STARTER_COUNT = 10;
export const GENERATED_ENEMY_FULL_UNLOCK_LEVEL = 40;

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

export function getGeneratedEnemyTargetCountForLevel(level) {
  const safeLevel = clamp(Math.round(Number(level) || 1), 1, GENERATED_ENEMY_FULL_UNLOCK_LEVEL);
  if (safeLevel <= 1) return GENERATED_ENEMY_STARTER_COUNT;
  return Math.min(
    GENERATED_ENEMY_TOTAL,
    Math.ceil(
      GENERATED_ENEMY_STARTER_COUNT +
      (GENERATED_ENEMY_TOTAL - GENERATED_ENEMY_STARTER_COUNT) *
      ((safeLevel - 1) / (GENERATED_ENEMY_FULL_UNLOCK_LEVEL - 1))
    )
  );
}

function buildUnlockLevels() {
  const unlocks = Array(GENERATED_ENEMY_TOTAL).fill(GENERATED_ENEMY_FULL_UNLOCK_LEVEL);
  let cursor = 0;
  for (let level = 1; level <= GENERATED_ENEMY_FULL_UNLOCK_LEVEL; level += 1) {
    const target = getGeneratedEnemyTargetCountForLevel(level);
    while (cursor < target && cursor < unlocks.length) {
      unlocks[cursor] = level;
      cursor += 1;
    }
  }
  return unlocks;
}

const UNLOCK_LEVELS = buildUnlockLevels();
const UNLOCK_SLOT_BY_INDEX = UNLOCK_LEVELS.map((unlockLevel, index) =>
  UNLOCK_LEVELS.slice(0, index).filter((candidate) => candidate === unlockLevel).length
);

function nameFor(index) {
  if (LEGACY_NAMES[index]) return LEGACY_NAMES[index];
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

function profileFor(index) {
  const unlockLevel = UNLOCK_LEVELS[index];
  const slot = index % 10;
  const unlockSlot = UNLOCK_SLOT_BY_INDEX[index];
  const tier = Math.floor((unlockLevel - 1) / 8);
  const assetBand = Math.floor(index / GENERATED_ENEMY_ASSET_COUNT);
  const role = pickRole(unlockLevel, index, unlockSlot);
  const [tint, accent] = COLOR_PAIRS[(slot + tier + assetBand * 3) % COLOR_PAIRS.length];
  const movementStyle = pickStyleForUnlock(ENEMY_MOVEMENT_STYLE_DEFS, unlockLevel, unlockSlot, index, tier);
  const fireStyle = pickStyleForUnlock(ENEMY_ATTACK_STYLE_DEFS, unlockLevel, unlockSlot, index, tier * 2);
  const attack = getEnemyAttackStyle(fireStyle);
  const lateTier = Math.max(0, Math.floor((unlockLevel - 1) / 10));
  const heavy = fireStyle === 'slowHeavy' || fireStyle === 'slowOrb' || fireStyle === 'chargeShot';
  const quick = fireStyle === 'quickChip' || fireStyle === 'stutter' || role.id === 'fast_scout';

  return {
    id: `nova_enemy_${String(index + 1).padStart(3, '0')}`,
    type: `nova_enemy_${String(index + 1).padStart(3, '0')}`,
    legacyType: index < 50 ? `nova_enemy_${String(index + 1).padStart(2, '0')}` : null,
    spriteIndex: index % GENERATED_ENEMY_ASSET_COUNT,
    visualBand: assetBand,
    displayName: nameFor(index),
    role: role.id,
    tier: unlockLevel <= 1 ? 'starter' : unlockLevel <= 11 ? 'early' : unlockLevel <= 20 ? 'mid' : unlockLevel <= 30 ? 'advanced' : 'elite',
    unlockLevel,
    tint,
    accent,
    hullTint: assetBand === 0 ? 0xffffff : tint,
    spriteScale: round(0.92 + (slot % 4) * 0.035 + assetBand * 0.055 + (role.radius > 1 ? 0.04 : 0), 3),
    glowAlpha: round(0.15 + assetBand * 0.035 + (unlockLevel >= 30 ? 0.03 : 0), 3),
    health: Math.max(1, 1 + Math.floor((slot + lateTier) / 4) + role.hp + (heavy ? 1 : 0)),
    speed: round(0.6 + Math.min(0.28, unlockLevel * 0.009) + (slot % 5) * 0.055 + role.speed + (quick ? 0.05 : 0), 2),
    shootDelay: Math.round(138 - Math.min(24, unlockLevel * 0.65) - (quick ? 18 : 0) + (attack.delayOffset || 0) + role.fire + (slot % 3) * 6),
    radius: clamp(13 + (slot % 5) + role.radius + (heavy ? 2 : 0), 11, 24),
    scoreValue: 16 + Math.floor(unlockLevel * 1.3) + slot * 2 + role.score + (heavy ? 5 : 0),
    movementStyle,
    fireStyle,
    attackStyle: fireStyle,
    shotCount: attack.shotCount,
    spread: attack.spread,
    projectileSpeedMult: round((attack.speedMult || 1) + Math.min(0.18, unlockLevel * 0.004) + (slot % 4) * 0.018, 2),
    damageMult: round(attack.damageMult || 1, 2),
    idleAmpX: 8 + (slot % 5) * 3 + tier * 1.5 + (movementStyle === 'anchor' ? -4 : 0),
    idleAmpY: 4 + (slot % 4) * 1.5 + (movementStyle === 'pulseAdvance' ? 4 : 0),
    diveBias: round(role.dive + (slot % 6) * 0.035 + Math.min(0.28, unlockLevel * 0.006), 2),
    targetWidth: Math.round(38 + (slot % 5) * 3 + assetBand * 4 + Math.min(8, unlockLevel / 8))
  };
}

export const GENERATED_ENEMY_PROFILES = Array.from({ length: GENERATED_ENEMY_TOTAL }, (_, index) => profileFor(index));
export const GENERATED_ENEMY_TYPES = GENERATED_ENEMY_PROFILES.map((profile) => profile.type);

const PROFILE_BY_TYPE = new Map();
for (const profile of GENERATED_ENEMY_PROFILES) {
  PROFILE_BY_TYPE.set(profile.type, profile);
  if (profile.legacyType) PROFILE_BY_TYPE.set(profile.legacyType, profile);
}

export function getGeneratedEnemyProfilesForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return GENERATED_ENEMY_PROFILES.filter((profile) => profile.unlockLevel <= safeLevel);
}

export function getGeneratedEnemyTypesForLevel(level) {
  return getGeneratedEnemyProfilesForLevel(level).map((profile) => profile.type);
}

export function getGeneratedEnemyPoolStats(level) {
  const profiles = getGeneratedEnemyProfilesForLevel(level);
  return {
    level: Math.max(1, Number(level) || 1),
    availableProfiles: profiles.length,
    totalProfiles: GENERATED_ENEMY_PROFILES.length,
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
  const weighted = [];
  for (const profile of pool) {
    const age = safeLevel - profile.unlockLevel;
    const copies = age <= 0 ? 5 : age <= 2 ? 3 : age <= 5 ? 2 : 1;
    for (let i = 0; i < copies; i += 1) weighted.push(profile.type);
  }
  return weighted[Math.floor(random() * weighted.length)] || pool[0].type;
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
