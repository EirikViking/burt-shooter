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

const SHIP_TRAIT_PROFILES = {
  ion: {
    label: 'ION DASH',
    description: 'Quicker bolts and crisp handling.',
    speedMult: 1.04,
    bulletSpeedMult: 1.12,
    fireRateMult: 0.98
  },
  solar: {
    label: 'SOLAR HAMMER',
    description: 'Heavier shots with a slower trigger.',
    damageMult: 1.14,
    fireRateMult: 1.08,
    bulletSpeedMult: 1.03
  },
  violet: {
    label: 'VIOLET FEINT',
    description: 'Smaller hitbox and softer shots.',
    speedMult: 1.06,
    damageMult: 0.93,
    hitboxMult: 0.9
  },
  mint: {
    label: 'MINT BOOST',
    description: 'High-speed dodging with lighter damage.',
    speedMult: 1.14,
    damageMult: 0.9,
    bulletSpeedMult: 1.05
  },
  crimson: {
    label: 'CRIMSON BITE',
    description: 'Close-range punch, wider hull.',
    damageMult: 1.12,
    fireRateMult: 1.04,
    hitboxMult: 1.06
  },
  quartz: {
    label: 'QUARTZ NEEDLE',
    description: 'Tiny collision core, slower reload.',
    hitboxMult: 0.86,
    fireRateMult: 1.1,
    bulletSpeedMult: 1.07
  },
  cobalt: {
    label: 'COBALT GUARD',
    description: 'Steadier aim with a heavier frame.',
    speedMult: 0.94,
    damageMult: 1.08,
    hitboxMult: 1.04,
    spreadDelta: -0.025
  },
  ember: {
    label: 'EMBER BURST',
    description: 'Fast trigger, hotter but lighter shots.',
    fireRateMult: 0.9,
    damageMult: 0.94,
    spreadDelta: 0.018
  },
  circuit: {
    label: 'CIRCUIT TAP',
    description: 'Rapid rhythm with narrow damage.',
    fireRateMult: 0.86,
    damageMult: 0.88,
    bulletSpeedMult: 1.04
  },
  magenta: {
    label: 'MAGENTA FAN',
    description: 'Wider spread for lane coverage.',
    spreadDelta: 0.055,
    damageMult: 0.94,
    bulletSpeedMult: 1.05
  },
  auric: {
    label: 'AURIC CORE',
    description: 'Premium damage with deliberate timing.',
    damageMult: 1.18,
    fireRateMult: 1.12,
    speedMult: 0.97
  },
  glacier: {
    label: 'GLACIER SCOPE',
    description: 'Precise fast shots, calmer movement.',
    speedMult: 0.96,
    bulletSpeedMult: 1.16,
    spreadDelta: -0.035
  },
  plasma: {
    label: 'PLASMA SKATE',
    description: 'Fast strafe, brighter angled fire.',
    speedMult: 1.1,
    bulletSpeedMult: 1.08,
    spreadDelta: 0.025,
    damageMult: 0.95
  },
  verdant: {
    label: 'VERDANT FLOW',
    description: 'Smooth movement and steady fire.',
    speedMult: 1.08,
    fireRateMult: 0.94,
    damageMult: 0.94
  },
  neon: {
    label: 'NEON STUTTER',
    description: 'Very fast fire, weaker per hit.',
    fireRateMult: 0.82,
    damageMult: 0.84,
    bulletSpeedMult: 1.08
  },
  ruby: {
    label: 'RUBY SPIKE',
    description: 'Big damage with a bigger target.',
    damageMult: 1.2,
    fireRateMult: 1.14,
    hitboxMult: 1.08
  },
  spectral: {
    label: 'SPECTRAL SLIP',
    description: 'Tiny dodge profile, modest output.',
    speedMult: 1.05,
    damageMult: 0.9,
    hitboxMult: 0.84
  },
  obsidian: {
    label: 'OBSIDIAN PLATE',
    description: 'Heavy frame, heavy bolts.',
    speedMult: 0.9,
    damageMult: 1.16,
    hitboxMult: 1.09,
    fireRateMult: 1.05
  },
  arcade: {
    label: 'ARCADE SAW',
    description: 'Chaotic spread for swarm cleanup.',
    spreadDelta: 0.07,
    fireRateMult: 0.95,
    damageMult: 0.9
  },
  vector: {
    label: 'VECTOR LINE',
    description: 'Straight precision and fast projectiles.',
    bulletSpeedMult: 1.18,
    spreadDelta: -0.045,
    damageMult: 1.02
  },
  signal: {
    label: 'SIGNAL PING',
    description: 'Quick reload and nimble drift.',
    fireRateMult: 0.9,
    speedMult: 1.06,
    damageMult: 0.92
  },
  nova: {
    label: 'NOVA OVERDRIVE',
    description: 'Aggressive all-round pressure.',
    fireRateMult: 0.93,
    speedMult: 1.04,
    damageMult: 1.04,
    hitboxMult: 1.03
  },
  chrome: {
    label: 'CHROME RAIL',
    description: 'High-speed rounds, deliberate hands.',
    bulletSpeedMult: 1.2,
    fireRateMult: 1.06,
    spreadDelta: -0.04
  },
  hazard: {
    label: 'HAZARD RAM',
    description: 'Dangerous burst damage, bulky shape.',
    damageMult: 1.16,
    speedMult: 0.94,
    hitboxMult: 1.1,
    spreadDelta: 0.02
  }
};

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

const ENEMY_PALETTE_MODES = [
  ['cabinet', null, null, 0, 0],
  ['neon', 0x00fff0, 0xff3df2, -0.03, 0.018],
  ['hazard', 0xfff200, 0xff3d00, 0.04, 0.028],
  ['frost', 0xb9f7ff, 0x4d8dff, -0.06, 0.014],
  ['royal', 0xb88cff, 0x5dffbf, 0.02, 0.024],
  ['overdrive', 0xff5c8a, 0xffef6e, 0.07, 0.034]
];

function mixChannel(a, b, amount) {
  return Math.round(a + (b - a) * amount);
}

function mixColor(color, target, amount) {
  if (!Number.isFinite(target)) return color;
  const r = mixChannel((color >> 16) & 0xff, (target >> 16) & 0xff, amount);
  const g = mixChannel((color >> 8) & 0xff, (target >> 8) & 0xff, amount);
  const b = mixChannel(color & 0xff, target & 0xff, amount);
  return (r << 16) | (g << 8) | b;
}

function clampScale(value) {
  return Math.max(0.76, Math.min(1.28, value));
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundStat(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildTraitCombatEffects(traitProfile) {
  const speedMult = traitProfile.speedMult ?? 1;
  const fireRateMult = traitProfile.fireRateMult ?? 1;
  const damageMult = traitProfile.damageMult ?? 1;
  const bulletSpeedMult = traitProfile.bulletSpeedMult ?? 1;
  const spreadDelta = traitProfile.spreadDelta ?? 0;
  const hitboxMult = traitProfile.hitboxMult ?? 1;
  const projectileRadiusMult = roundStat(clampNumber(
    1 + (damageMult - 1) * 0.48 + Math.max(0, spreadDelta) * 1.8 - Math.max(0, 1 - damageMult) * 0.18,
    0.86,
    1.32
  ), 2);
  const dodgeCooldownMult = roundStat(clampNumber(
    1 - Math.max(0, speedMult - 1) * 0.7 - Math.max(0, 1 - hitboxMult) * 0.55 + Math.max(0, hitboxMult - 1) * 0.42,
    0.74,
    1.16
  ), 2);
  const bonusShotEvery = fireRateMult <= 0.9 || spreadDelta >= 0.055 ? (spreadDelta >= 0.055 ? 4 : 5) : 0;
  const pierceEvery = bulletSpeedMult >= 1.16 || spreadDelta <= -0.035 ? (bulletSpeedMult >= 1.18 ? 4 : 5) : 0;

  return {
    projectileRadiusMult,
    dodgeCooldownMult,
    dodgeDurationMult: roundStat(clampNumber(1 + Math.max(0, speedMult - 1) * 0.55 + Math.max(0, 1 - hitboxMult) * 0.45, 1, 1.18), 2),
    bonusShotEvery,
    bonusShotDamageMult: bonusShotEvery ? 0.5 : 0,
    pierceEvery,
    pierceDamageMult: pierceEvery ? 0.72 : 0
  };
}

function applyShipTrait(base, variant) {
  const traitProfile = SHIP_TRAIT_PROFILES[variant.slug] || {};
  const baseStats = base.stats || {};
  const baseWeapon = base.weapon || {};
  const baseHitbox = base.hitbox || { radius: 12 };
  const stats = {
    speed: roundStat(clampNumber((baseStats.speed ?? 6) * (traitProfile.speedMult ?? 1), 4.8, 8.6), 2),
    fireRate: Math.round(clampNumber((baseStats.fireRate ?? 150) * (traitProfile.fireRateMult ?? 1), 82, 245)),
    damage: roundStat(clampNumber((baseStats.damage ?? 1) * (traitProfile.damageMult ?? 1), 0.58, 3.05), 2),
    bulletSpeed: roundStat(clampNumber((baseStats.bulletSpeed ?? 10) * (traitProfile.bulletSpeedMult ?? 1), 8.5, 14.8), 2)
  };
  const weapon = {
    ...baseWeapon,
    spread: roundStat(clampNumber((baseWeapon.spread ?? 0) + (traitProfile.spreadDelta ?? 0), 0, 0.34), 3)
  };
  const hitbox = {
    ...baseHitbox,
    radius: Math.round(clampNumber((baseHitbox.radius ?? 12) * (traitProfile.hitboxMult ?? 1), 10, 15))
  };
  const effects = {
    speedMult: traitProfile.speedMult ?? 1,
    fireRateMult: traitProfile.fireRateMult ?? 1,
    damageMult: traitProfile.damageMult ?? 1,
    bulletSpeedMult: traitProfile.bulletSpeedMult ?? 1,
    spreadDelta: traitProfile.spreadDelta ?? 0,
    hitboxMult: traitProfile.hitboxMult ?? 1,
    combat: buildTraitCombatEffects(traitProfile)
  };
  return {
    stats,
    weapon,
    hitbox,
    trait: {
      slug: variant.slug,
      label: traitProfile.label || `${variant.name.toUpperCase()} TUNE`,
      description: traitProfile.description || 'Balanced arcade handling.',
      effects
    }
  };
}

export const ENEMY_VISUAL_VARIANTS = ENEMY_VARIANT_SETS.flatMap(([slug, tint, accent, scale], baseIndex) =>
  ENEMY_PALETTE_MODES.map(([mode, tintTarget, accentTarget, scaleDelta, alphaBoost], modeIndex) => {
    const index = baseIndex * ENEMY_PALETTE_MODES.length + modeIndex;
    return {
      slug: mode === 'cabinet' ? slug : `${slug}-${mode}`,
      tint: mixColor(tint, tintTarget, 0.42),
      accent: mixColor(accent, accentTarget, 0.5),
      scale: clampScale(scale + scaleDelta),
      wobble: 0.78 + (index % 11) * 0.055,
      alpha: Math.min(0.34, 0.145 + (baseIndex % 4) * 0.032 + alphaBoost),
      index,
      baseSlug: slug,
      paletteMode: mode
    };
  })
);

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
  return baseShips.flatMap(base => SHIP_VISUAL_VARIANTS.map(variant => {
    const tuned = applyShipTrait(base, variant);
    return {
      ...base,
      id: `${base.id}_${variant.slug}`,
      baseId: base.id,
      baseSpriteKey: base.spriteKey,
      spriteKey: `${base.spriteKey}::${variant.slug}`,
      name: `${base.name} ${variant.code}`,
      baseDescription: base.description,
      description: `${tuned.trait.label}: ${tuned.trait.description} ${base.description}`,
      loreShort: `${base.loreShort}-${variant.slug}`,
      loreLong: `${base.loreLong} The ${variant.name.toLowerCase()} cabinet trim changes the actual flight profile: ${tuned.trait.description.toLowerCase()}`,
      stats: tuned.stats,
      weapon: tuned.weapon,
      visuals: {
        ...base.visuals,
        variant: { ...variant },
        trait: { ...tuned.trait }
      },
      hitbox: tuned.hitbox,
      trait: tuned.trait,
      variantSlug: variant.slug,
      variantCode: variant.code,
      variantIndex: variant.index
    };
  }));
}

export function getEnemyVisualVariant(type, level, waveColor, x, y) {
  return pickVariant(`${type}|${level}|${waveColor || 'none'}|${Math.round(x)}|${Math.round(y)}`, ENEMY_VISUAL_VARIANTS);
}
