export const ENEMY_WEAPON_PROFILES = [
  {
    id: 'crimson_shard',
    label: 'Crimson Shard',
    assetIndex: 0,
    color: 0xff2f46,
    trailColor: 0xff6a3a,
    warningColor: 0xff3355,
    haloColor: 0xff2438,
    radius: 5,
    spriteScale: 0.15,
    trailLength: 38,
    trailWidth: 4,
    pulseRate: 1.55,
    spin: 0.004,
    behavior: 'straight',
    damageMult: 1,
    speedMult: 1.04
  },
  {
    id: 'amber_plasma_orb',
    label: 'Amber Plasma Orb',
    assetIndex: 1,
    color: 0xffb83d,
    trailColor: 0xff7b00,
    warningColor: 0xffd15c,
    haloColor: 0xff7b00,
    radius: 7,
    spriteScale: 0.17,
    trailLength: 26,
    trailWidth: 5,
    pulseRate: 1.2,
    spin: 0.012,
    behavior: 'drag',
    behaviorStrength: 0.002,
    damageMult: 1.18,
    speedMult: 0.84
  },
  {
    id: 'cyan_rail_needle',
    label: 'Cyan Rail Needle',
    assetIndex: 2,
    color: 0x6dfcff,
    trailColor: 0x37f5ff,
    warningColor: 0x8ffcff,
    haloColor: 0x37f5ff,
    radius: 4,
    spriteScale: 0.12,
    trailLength: 46,
    trailWidth: 3,
    pulseRate: 2.1,
    spin: 0,
    behavior: 'accelerate',
    behaviorStrength: 0.0024,
    damageMult: 0.9,
    speedMult: 1.22
  },
  {
    id: 'magenta_crescent',
    label: 'Magenta Crescent',
    assetIndex: 3,
    color: 0xff55d9,
    trailColor: 0xff75e7,
    warningColor: 0xff55d9,
    haloColor: 0x8a1aff,
    radius: 6,
    spriteScale: 0.15,
    trailLength: 34,
    trailWidth: 4,
    pulseRate: 1.7,
    spin: 0.018,
    wobble: 0.014,
    behavior: 'arc_left',
    behaviorStrength: 0.0018,
    damageMult: 1.04,
    speedMult: 0.98
  },
  {
    id: 'toxic_splinter_seed',
    label: 'Toxic Splinter Seed',
    assetIndex: 4,
    color: 0xa6ff2e,
    trailColor: 0x72ff42,
    warningColor: 0xc4ff5f,
    haloColor: 0x58d733,
    radius: 5,
    spriteScale: 0.14,
    trailLength: 30,
    trailWidth: 4,
    pulseRate: 1.45,
    spin: -0.01,
    wobble: 0.01,
    behavior: 'seed_sway',
    behaviorStrength: 0.16,
    behaviorFrequency: 0.18,
    damageMult: 1,
    speedMult: 0.94
  },
  {
    id: 'violet_star_mine',
    label: 'Violet Star Mine',
    assetIndex: 5,
    color: 0xb95cff,
    trailColor: 0xd57bff,
    warningColor: 0xd48cff,
    haloColor: 0x812dff,
    radius: 8,
    spriteScale: 0.17,
    trailLength: 20,
    trailWidth: 5,
    pulseRate: 1.05,
    spin: 0.028,
    behavior: 'mine_drift',
    behaviorStrength: 0.018,
    damageMult: 1.24,
    speedMult: 0.74
  },
  {
    id: 'white_comet_lance',
    label: 'White Comet Lance',
    assetIndex: 6,
    color: 0xdffcff,
    trailColor: 0x8ffcff,
    warningColor: 0xf6fbff,
    haloColor: 0x4cc9ff,
    radius: 4,
    spriteScale: 0.12,
    trailLength: 50,
    trailWidth: 3,
    pulseRate: 2.2,
    spin: 0,
    behavior: 'lance_blink',
    behaviorStrength: 0.018,
    damageMult: 1.08,
    speedMult: 1.14
  },
  {
    id: 'orange_molten_slug',
    label: 'Orange Molten Slug',
    assetIndex: 7,
    color: 0xff7b21,
    trailColor: 0xff3d00,
    warningColor: 0xff9f4a,
    haloColor: 0xff4b00,
    radius: 7,
    spriteScale: 0.17,
    trailLength: 28,
    trailWidth: 5,
    pulseRate: 1.32,
    spin: 0.008,
    behavior: 'slug_drop',
    behaviorStrength: 0.0016,
    damageMult: 1.16,
    speedMult: 0.82
  },
  {
    id: 'teal_fork_dart',
    label: 'Teal Fork Dart',
    assetIndex: 8,
    color: 0x37f5ff,
    trailColor: 0x20f4d4,
    warningColor: 0x8ffcff,
    haloColor: 0x20d8ff,
    radius: 5,
    spriteScale: 0.13,
    trailLength: 38,
    trailWidth: 4,
    pulseRate: 1.85,
    spin: 0.006,
    wobble: 0.012,
    behavior: 'fork_zig',
    behaviorStrength: 0.24,
    behaviorFrequency: 0.22,
    damageMult: 0.98,
    speedMult: 1.08
  },
  {
    id: 'pink_spiral_disruptor',
    label: 'Pink Spiral Disruptor',
    assetIndex: 9,
    color: 0xff5cd9,
    trailColor: 0xff8af0,
    warningColor: 0xff55d9,
    haloColor: 0xff2fb7,
    radius: 6,
    spriteScale: 0.15,
    trailLength: 32,
    trailWidth: 4,
    pulseRate: 1.62,
    spin: 0.02,
    wobble: 0.012,
    behavior: 'spiral_curve',
    behaviorStrength: 0.0022,
    damageMult: 1.04,
    speedMult: 0.96
  },
  {
    id: 'lime_saw_disc',
    label: 'Lime Saw Disc',
    assetIndex: 10,
    color: 0xcfff37,
    trailColor: 0xa6ff2e,
    warningColor: 0xdfff72,
    haloColor: 0x89f02a,
    radius: 7,
    spriteScale: 0.16,
    trailLength: 22,
    trailWidth: 5,
    pulseRate: 1.25,
    spin: 0.04,
    behavior: 'saw_orbit',
    behaviorStrength: 0.0028,
    damageMult: 1.12,
    speedMult: 0.88
  },
  {
    id: 'purple_boss_spear',
    label: 'Purple Boss Spear',
    assetIndex: 11,
    color: 0xa663ff,
    trailColor: 0xd083ff,
    warningColor: 0xc77dff,
    haloColor: 0x7d3cff,
    radius: 6,
    spriteScale: 0.16,
    trailLength: 44,
    trailWidth: 4,
    pulseRate: 1.92,
    spin: 0.004,
    behavior: 'spear_track',
    behaviorStrength: 0.0012,
    damageMult: 1.1,
    speedMult: 1.04
  }
];

const TYPE_WEAPON_IDS = {
  chaser: 'crimson_shard',
  bruiser: 'orange_molten_slug',
  turret: 'cyan_rail_needle',
  striker: 'magenta_crescent',
  trickster: 'pink_spiral_disruptor',
  juggernaut: 'violet_star_mine',
  bonus_challenge: 'lime_saw_disc'
};

const FIRE_STYLE_WEAPON_IDS = {
  single: 'crimson_shard',
  double: 'teal_fork_dart',
  wide: 'magenta_crescent',
  needle: 'cyan_rail_needle',
  fan: 'white_comet_lance',
  slowHeavy: 'amber_plasma_orb',
  quickChip: 'toxic_splinter_seed',
  offsetPair: 'teal_fork_dart',
  triad: 'purple_boss_spear',
  stutter: 'pink_spiral_disruptor'
};

const BOSS_ATTACK_WEAPON_IDS = {
  fan: 'magenta_crescent',
  burst: 'purple_boss_spear',
  fakeout: 'pink_spiral_disruptor',
  spiral: 'lime_saw_disc',
  clock: 'violet_star_mine',
  chord: 'white_comet_lance',
  split: 'teal_fork_dart',
  sniper: 'cyan_rail_needle',
  wall: 'orange_molten_slug',
  summon: 'amber_plasma_orb',
  aimed: 'purple_boss_spear'
};

const SIGNATURE_WEAPON_IDS = {
  cone: 'purple_boss_spear',
  mirror: 'teal_fork_dart',
  lance: 'cyan_rail_needle',
  ring: 'lime_saw_disc',
  adds: 'violet_star_mine'
};

const PROFILE_BY_ID = new Map(ENEMY_WEAPON_PROFILES.map((profile) => [profile.id, profile]));

export function getEnemyWeaponProfileById(id) {
  return PROFILE_BY_ID.get(id) || ENEMY_WEAPON_PROFILES[0];
}

export function getEnemyWeaponProfileForEnemy(enemy) {
  const generated = enemy?.generatedProfile;
  const id = generated
    ? FIRE_STYLE_WEAPON_IDS[generated.fireStyle] || ENEMY_WEAPON_PROFILES[generated.spriteIndex % ENEMY_WEAPON_PROFILES.length].id
    : TYPE_WEAPON_IDS[enemy?.type] || ENEMY_WEAPON_PROFILES[(enemy?.xtraType || 1) % ENEMY_WEAPON_PROFILES.length].id;
  return getEnemyWeaponProfileById(id);
}

export function getBossWeaponProfile(attack = 'aimed', phase = 1) {
  const id = BOSS_ATTACK_WEAPON_IDS[attack] || (phase >= 3 ? 'purple_boss_spear' : 'crimson_shard');
  return getEnemyWeaponProfileById(id);
}

export function getBossSignatureWeaponProfile(type = 'cone') {
  return getEnemyWeaponProfileById(SIGNATURE_WEAPON_IDS[type] || 'purple_boss_spear');
}

export function toBulletVisualConfig(profile, overrides = {}) {
  const resolved = typeof profile === 'string' ? getEnemyWeaponProfileById(profile) : profile;
  return {
    ...resolved,
    ...overrides,
    weaponProfileId: resolved.id,
    weaponLabel: resolved.label
  };
}
