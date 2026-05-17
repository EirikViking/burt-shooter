const SHIP_VARIANT_SETS = [
  ['Ion', 0x66f7ff, 0x16b8ff, 'ION'],
  ['Solar', 0xffd166, 0xff6b35, 'SOL'],
  ['Violet', 0xc77dff, 0x7b2cff, 'VLT'],
  ['Mint', 0x7cffcb, 0x20e38a, 'MNT'],
  ['Crimson', 0xff5c8a, 0xff2458, 'CRM'],
  ['Quartz', 0xf7f7ff, 0x9be7ff, 'QTZ'],
  ['Cobalt', 0x74a7ff, 0x2c5cff, 'CBL'],
  ['Ember', 0xff9f4a, 0xff3d00, 'EMB'],
  ['Circuit', 0xa6ff4d, 0x38d430, 'CRC'],
  ['Magenta', 0xff6bff, 0xb51dff, 'MGN'],
  ['Auric', 0xffef6e, 0xf4a300, 'AUR'],
  ['Glacier', 0xb8f7ff, 0x33ccff, 'GLC'],
  ['Plasma', 0xff7ad9, 0x5dfcff, 'PLS'],
  ['Verdant', 0x69ff9a, 0x17a85e, 'VRD'],
  ['Neon', 0x39ff14, 0x00e7ff, 'NEO'],
  ['Ruby', 0xff405d, 0xffb000, 'RBY'],
  ['Spectral', 0xd7b8ff, 0x62fff2, 'SPC'],
  ['Obsidian', 0x88aaff, 0x0f1b44, 'OBS'],
  ['Arcade', 0x00ffcc, 0xfff200, 'ARC'],
  ['Vector', 0xffffff, 0x00e5ff, 'VEC'],
  ['Signal', 0xfff7a8, 0x2affea, 'SIG'],
  ['Nova', 0xff8cff, 0x6cf6ff, 'NVA'],
  ['Chrome', 0xdce7ff, 0xff5efc, 'CHR'],
  ['Hazard', 0xffcc00, 0x111111, 'HZD']
];

export const SHIP_VISUAL_VARIANTS = SHIP_VARIANT_SETS.map(([name, tint, accent, code], index) => ({
  slug: name.toLowerCase(),
  name,
  code,
  tint,
  accent,
  engine: accent,
  glow: tint,
  index
}));

const ENEMY_VARIANT_SETS = [
  ['zapper', 0x8ffcff, 0x00d9ff, 0.95],
  ['clanker', 0xffd166, 0xff7b00, 1.08],
  ['sneaker', 0xc77dff, 0x6b2cff, 0.88],
  ['bouncer', 0x7cffcb, 0x16e37f, 1.0],
  ['pincher', 0xff6b8a, 0xff2148, 0.98],
  ['drifter', 0xe8f6ff, 0x8edfff, 1.12],
  ['sparker', 0xffff66, 0xff35bd, 0.92],
  ['wobbler', 0x69ff9a, 0x00c25d, 1.04],
  ['screecher', 0xff8d4a, 0xff2d00, 0.96],
  ['orbiter', 0x74a7ff, 0x245cff, 1.02],
  ['prism', 0xff9cff, 0x5dfcff, 0.94],
  ['crusher', 0xffffff, 0xffcc00, 1.18],
  ['ticker', 0x00ffcc, 0xf8ff42, 0.9],
  ['snipper', 0xb8f7ff, 0x338dff, 0.86],
  ['bruiser', 0xff477e, 0x731dff, 1.15],
  ['heckler', 0xfff1a8, 0xff5a00, 0.98],
  ['static', 0xdce7ff, 0x00ff66, 1.0],
  ['mimic', 0xff75f6, 0x64ffda, 0.97],
  ['dart', 0xa6ff4d, 0x35d430, 0.84],
  ['magnet', 0xffb3c6, 0x00a8ff, 1.06],
  ['splitter', 0xffef6e, 0xff2d75, 1.02],
  ['flare', 0xff9f4a, 0xffff66, 0.95],
  ['glitch', 0x39ff14, 0x00e5ff, 0.91],
  ['bossling', 0xff405d, 0xffd000, 1.2],
  ['pixel', 0xffffff, 0xff4fd8, 0.93],
  ['coil', 0x66f7ff, 0xc77dff, 1.05],
  ['rivet', 0xf7f7ff, 0xff9f4a, 1.1],
  ['buzzer', 0xffff90, 0x00ffcc, 0.89],
  ['comet', 0x8ae6ff, 0xff5c8a, 0.96],
  ['gasket', 0x9be7ff, 0x38d430, 1.13],
  ['mote', 0xffd6ff, 0xff6b35, 0.82],
  ['shifter', 0xb4ffea, 0x7b2cff, 1.01],
  ['rascal', 0xffc857, 0xff2458, 0.97],
  ['jumper', 0x7cffcb, 0xf4a300, 0.9],
  ['scanner', 0xcde7ff, 0x16b8ff, 1.0],
  ['breaker', 0xff7070, 0xffee66, 1.16],
  ['twister', 0xd7b8ff, 0x62fff2, 0.98],
  ['shimmer', 0xffffff, 0x33ccff, 0.92],
  ['husher', 0x88aaff, 0x101833, 1.04],
  ['rasp', 0xff6bff, 0xffef6e, 0.94],
  ['blinker', 0x00ff99, 0xfff200, 0.87],
  ['glooper', 0xffafcc, 0x20e38a, 1.08],
  ['warden', 0xe8f6ff, 0xff405d, 1.14],
  ['pebble', 0xc8fffa, 0xff8a00, 0.85],
  ['needler', 0x74ffea, 0xff4fd8, 0.88],
  ['sprocket', 0xffdf7d, 0x00d9ff, 1.09],
  ['kite', 0xb4ff6b, 0x6b2cff, 0.91],
  ['crown', 0xfff7a8, 0xff35bd, 1.17]
];

export const ENEMY_VISUAL_VARIANTS = ENEMY_VARIANT_SETS.map(([slug, tint, accent, scale], index) => ({
  slug,
  tint,
  accent,
  scale,
  wobble: 0.8 + (index % 7) * 0.08,
  alpha: 0.16 + (index % 4) * 0.035,
  index
}));

export function hashString(value = '') {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickVariant(seed, variants) {
  if (!variants?.length) return null;
  return variants[hashString(String(seed)) % variants.length];
}

export function buildSelectableShipVariants(baseShips) {
  return baseShips.flatMap(base => SHIP_VISUAL_VARIANTS.map(variant => ({
    ...base,
    id: `${base.id}_${variant.slug}`,
    baseId: base.id,
    baseSpriteKey: base.spriteKey,
    spriteKey: `${base.spriteKey}::${variant.slug}`,
    name: `${base.name} ${variant.code}`,
    description: `${variant.name} trim. ${base.description}`,
    loreShort: `${base.loreShort}-${variant.slug}`,
    loreLong: `${base.loreLong} This ${variant.name.toLowerCase()} cabinet variant adds a distinct glow profile for pilots who enjoy looking excellent while dodging nonsense.`,
    stats: { ...base.stats },
    weapon: { ...base.weapon },
    visuals: {
      ...base.visuals,
      variant: { ...variant }
    },
    hitbox: { ...base.hitbox },
    variantSlug: variant.slug,
    variantCode: variant.code,
    variantIndex: variant.index
  })));
}

export function getEnemyVisualVariant(type, level, waveColor, x, y) {
  return pickVariant(`${type}|${level}|${waveColor || 'none'}|${Math.round(x)}|${Math.round(y)}`, ENEMY_VISUAL_VARIANTS);
}
