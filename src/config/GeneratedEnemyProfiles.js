import { hashString } from './VisualVariantCatalog.js';

const NAMES = [
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

const MOVE_STYLES = [
  'sine', 'zigzag', 'circle', 'drunk', 'aggressive',
  'flutter', 'pincer', 'orbit', 'snap', 'weave'
];

const FIRE_STYLES = [
  'single', 'double', 'wide', 'needle', 'fan',
  'slowHeavy', 'quickChip', 'offsetPair', 'triad', 'stutter'
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
  [0xffef6e, 0xf4a300]
];

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function profileFor(index) {
  const tier = Math.floor(index / 10);
  const slot = index % 10;
  const [tint, accent] = COLOR_PAIRS[slot];
  const fireStyle = FIRE_STYLES[(slot + tier * 2) % FIRE_STYLES.length];
  const movementStyle = MOVE_STYLES[(index + tier) % MOVE_STYLES.length];
  const shotCount = fireStyle === 'fan' ? 3 : ['double', 'offsetPair'].includes(fireStyle) ? 2 : fireStyle === 'triad' ? 3 : 1;
  const spread = fireStyle === 'wide' ? 0.22 : fireStyle === 'fan' ? 0.32 : fireStyle === 'triad' ? 0.2 : fireStyle === 'offsetPair' ? 0.13 : 0;
  const heavy = fireStyle === 'slowHeavy';
  const quick = fireStyle === 'quickChip' || fireStyle === 'stutter';

  return {
    id: `nova_enemy_${String(index + 1).padStart(2, '0')}`,
    type: `nova_enemy_${String(index + 1).padStart(2, '0')}`,
    spriteIndex: index,
    displayName: NAMES[index],
    tint,
    accent,
    health: Math.max(1, 1 + Math.floor((slot + tier) / 3) + (heavy ? 1 : 0)),
    speed: round(0.62 + tier * 0.09 + (slot % 5) * 0.07 + (quick ? 0.08 : 0), 2),
    shootDelay: Math.round(132 - tier * 6 - (quick ? 24 : 0) + (heavy ? 34 : 0) + (slot % 3) * 8),
    radius: 13 + (slot % 5) + (heavy ? 3 : 0),
    scoreValue: 16 + tier * 12 + slot * 3 + (heavy ? 10 : 0),
    movementStyle,
    fireStyle,
    shotCount,
    spread,
    projectileSpeedMult: round(0.86 + tier * 0.04 + (slot % 4) * 0.035 + (fireStyle === 'needle' ? 0.18 : 0), 2),
    idleAmpX: 8 + (slot % 5) * 4 + tier,
    idleAmpY: 4 + (slot % 4) * 2,
    diveBias: round(0.75 + (slot % 6) * 0.08 + tier * 0.06, 2),
    targetWidth: 39 + (slot % 5) * 4 + tier * 2
  };
}

export const GENERATED_ENEMY_PROFILES = Array.from({ length: 50 }, (_, index) => profileFor(index));
export const GENERATED_ENEMY_TYPES = GENERATED_ENEMY_PROFILES.map(profile => profile.type);

export function getGeneratedEnemyProfile(type, seed = '') {
  if (typeof type === 'string' && type.startsWith('nova_enemy_')) {
    return GENERATED_ENEMY_PROFILES.find(profile => profile.type === type) || null;
  }
  if (type === 'generated' || type === 'nova_enemy') {
    return GENERATED_ENEMY_PROFILES[hashString(seed || Date.now()) % GENERATED_ENEMY_PROFILES.length];
  }
  return null;
}
