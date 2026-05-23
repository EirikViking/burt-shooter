export const TRACTOR_DEBUFF_IMMUNITY_MS = 5500;

export const TRACTOR_DEBUFFS = [
  {
    id: 'engine_drag',
    label: 'ENGINE DRAG',
    category: 'mobility',
    durationMs: 3800,
    severity: 'mild',
    color: 0x7cff72,
    iconType: 'speed_up',
    movementSpeedMult: 0.62,
    detail: 'SPEED'
  },
  {
    id: 'weapon_jam',
    label: 'WEAPON JAM',
    category: 'weapon',
    durationMs: 900,
    severity: 'strong',
    color: 0xff6b7a,
    iconType: 'rapid_fire',
    blocksShooting: true,
    detail: 'NO FIRE'
  },
  {
    id: 'fire_rate_drain',
    label: 'FIRE DRAIN',
    category: 'weapon',
    durationMs: 3600,
    severity: 'mild',
    color: 0xff9966,
    iconType: 'rapid_cabinet',
    fireDelayMult: 1.48,
    detail: 'SLOW FIRE'
  },
  {
    id: 'powerup_nullification',
    label: 'PWR NULL',
    category: 'systems',
    durationMs: 2300,
    severity: 'strong',
    color: 0xe6e6ff,
    iconType: 'overdrive_core',
    suppressPowerups: true,
    detail: 'SUPPRESS'
  },
  {
    id: 'control_drift',
    label: 'CONTROL DRIFT',
    category: 'mobility',
    durationMs: 3800,
    severity: 'mild',
    color: 0x88ddff,
    iconType: 'vector_boost',
    driftStrength: 0.34,
    detail: 'INERTIA'
  },
  {
    id: 'shield_flicker',
    label: 'SHIELD FLICKER',
    category: 'defense',
    durationMs: 2500,
    severity: 'strong',
    color: 0x66ffff,
    iconType: 'shield',
    shieldSuppressed: true,
    detail: 'DEFENSE'
  },
  {
    id: 'target_scramble',
    label: 'TARGET SCRAMBLE',
    category: 'weapon',
    durationMs: 3400,
    severity: 'mild',
    color: 0xff8af0,
    iconType: 'double_shot',
    shotSpreadMult: 1.42,
    shotJitter: 0.09,
    detail: 'SPREAD'
  },
  {
    id: 'cooldown_spike',
    label: 'COOLDOWN SPIKE',
    category: 'systems',
    durationMs: 2600,
    severity: 'mild',
    color: 0xffd166,
    iconType: 'point_defense',
    dodgeDelayMult: 1.45,
    instantDodgeDelayMs: 850,
    instantShootDelayMs: 240,
    detail: 'COOLDOWN'
  },
  {
    id: 'energy_leak',
    label: 'ENERGY LEAK',
    category: 'weapon',
    durationMs: 3300,
    severity: 'mild',
    color: 0xffee66,
    iconType: 'damage_up',
    damageMult: 0.78,
    bulletSpeedMult: 0.9,
    detail: 'POWER'
  },
  {
    id: 'sensor_glitch',
    label: 'SENSOR GLITCH',
    category: 'visual',
    durationMs: 2200,
    severity: 'strong',
    color: 0xc77dff,
    iconType: 'magnet',
    hudGlitch: true,
    detail: 'HUD'
  }
];

const TRACTOR_DEBUFF_BY_ID = new Map(TRACTOR_DEBUFFS.map((effect) => [effect.id, effect]));

export function getTractorDebuff(id) {
  return TRACTOR_DEBUFF_BY_ID.get(id) || null;
}

export function pickTractorDebuff(random = Math.random) {
  const index = Math.max(0, Math.min(
    TRACTOR_DEBUFFS.length - 1,
    Math.floor((typeof random === 'function' ? random() : Math.random()) * TRACTOR_DEBUFFS.length)
  ));
  return TRACTOR_DEBUFFS[index] || TRACTOR_DEBUFFS[0];
}
