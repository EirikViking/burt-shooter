export const ENEMY_ATTACK_STYLE_DEFS = [
  { id: 'single', unlockLevel: 1, tier: 'starter', label: 'Single', shotCount: 1, spread: 0, speedMult: 0.98, delayOffset: 8, weaponId: 'crimson_shard' },
  { id: 'double', unlockLevel: 1, tier: 'starter', label: 'Double', shotCount: 2, spread: 0.12, speedMult: 0.96, delayOffset: 12, weaponId: 'teal_fork_dart' },
  { id: 'wide', unlockLevel: 1, tier: 'starter', label: 'Wide', shotCount: 2, spread: 0.22, speedMult: 0.9, delayOffset: 14, weaponId: 'magenta_crescent' },
  { id: 'needle', unlockLevel: 2, tier: 'early', label: 'Needle', shotCount: 1, spread: 0, speedMult: 1.12, delayOffset: 0, weaponId: 'cyan_rail_needle' },
  { id: 'fan', unlockLevel: 4, tier: 'early', label: 'Fan', shotCount: 3, spread: 0.28, speedMult: 0.88, delayOffset: 22, weaponId: 'white_comet_lance' },
  { id: 'quickChip', unlockLevel: 5, tier: 'early', label: 'Quick Chip', shotCount: 1, spread: 0, speedMult: 0.94, delayOffset: -18, weaponId: 'toxic_splinter_seed' },
  { id: 'slowHeavy', unlockLevel: 6, tier: 'early', label: 'Slow Heavy', shotCount: 1, spread: 0, speedMult: 0.78, delayOffset: 36, damageMult: 1.18, weaponId: 'amber_plasma_orb' },
  { id: 'offsetPair', unlockLevel: 7, tier: 'early', label: 'Offset Pair', shotCount: 2, spread: 0.13, speedMult: 0.94, delayOffset: 14, weaponId: 'teal_fork_dart' },
  { id: 'triad', unlockLevel: 8, tier: 'early', label: 'Triad', shotCount: 3, spread: 0.2, speedMult: 0.9, delayOffset: 24, weaponId: 'purple_boss_spear' },
  { id: 'stutter', unlockLevel: 9, tier: 'early', label: 'Stutter', shotCount: 1, spread: 0, speedMult: 1, delayOffset: -10, jitter: 0.08, weaponId: 'pink_spiral_disruptor' },
  { id: 'laneShot', unlockLevel: 10, tier: 'early', label: 'Lane Shot', shotCount: 1, spread: 0, speedMult: 1.04, delayOffset: 8, weaponId: 'cyan_rail_needle' },
  { id: 'delayedBurst', unlockLevel: 11, tier: 'early', label: 'Delayed Burst', shotCount: 2, spread: 0.1, speedMult: 0.9, delayOffset: 22, weaponId: 'purple_boss_spear' },
  { id: 'crossShot', unlockLevel: 13, tier: 'mid', label: 'Cross Shot', shotCount: 2, spread: 0.16, speedMult: 0.94, delayOffset: 18, weaponId: 'magenta_crescent' },
  { id: 'fanPulse', unlockLevel: 15, tier: 'mid', label: 'Fan Pulse', shotCount: 3, spread: 0.24, speedMult: 0.84, delayOffset: 28, weaponId: 'white_comet_lance' },
  { id: 'slowOrb', unlockLevel: 17, tier: 'mid', label: 'Slow Orb', shotCount: 1, spread: 0, speedMult: 0.72, delayOffset: 38, damageMult: 1.1, weaponId: 'violet_star_mine' },
  { id: 'warningShot', unlockLevel: 19, tier: 'mid', label: 'Warning Shot', shotCount: 1, spread: 0, speedMult: 0.86, delayOffset: 30, weaponId: 'orange_molten_slug' },
  { id: 'arcVolley', unlockLevel: 21, tier: 'advanced', label: 'Arc Volley', shotCount: 3, spread: 0.18, speedMult: 0.9, delayOffset: 26, weaponId: 'magenta_crescent' },
  { id: 'splitLite', unlockLevel: 24, tier: 'advanced', label: 'Split Lite', shotCount: 2, spread: 0.19, speedMult: 0.92, delayOffset: 20, weaponId: 'teal_fork_dart' },
  { id: 'suppressiveLine', unlockLevel: 27, tier: 'advanced', label: 'Suppressive Line', shotCount: 3, spread: 0.09, speedMult: 0.82, delayOffset: 34, weaponId: 'orange_molten_slug' },
  { id: 'rotatingPair', unlockLevel: 30, tier: 'advanced', label: 'Rotating Pair', shotCount: 2, spread: 0.16, speedMult: 0.94, delayOffset: 18, weaponId: 'lime_saw_disc' },
  { id: 'chargeShot', unlockLevel: 34, tier: 'elite', label: 'Charge Shot', shotCount: 1, spread: 0, speedMult: 0.82, delayOffset: 46, damageMult: 1.2, weaponId: 'amber_plasma_orb' },
  { id: 'forkShot', unlockLevel: 37, tier: 'elite', label: 'Fork Shot', shotCount: 3, spread: 0.16, speedMult: 0.94, delayOffset: 26, weaponId: 'teal_fork_dart' },
  { id: 'predictiveShot', unlockLevel: 40, tier: 'elite', label: 'Predictive Shot', shotCount: 1, spread: 0, speedMult: 1.05, delayOffset: 18, weaponId: 'cyan_rail_needle' }
];

export const ENEMY_ATTACK_STYLE_IDS = ENEMY_ATTACK_STYLE_DEFS.map((style) => style.id);

const STYLE_BY_ID = new Map(ENEMY_ATTACK_STYLE_DEFS.map((style) => [style.id, style]));

export function getEnemyAttackStyle(id) {
  return STYLE_BY_ID.get(id) || STYLE_BY_ID.get('single');
}

export function getEnemyAttackStylesForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return ENEMY_ATTACK_STYLE_DEFS.filter((style) => style.unlockLevel <= safeLevel);
}

function patternFromOffsets(baseAngle, offsets, speedMult = 1, damage = 1) {
  return offsets.map((offset) => ({ angle: baseAngle + offset, speedMult, damage }));
}

export function getEnemyAttackPattern(styleId, context = {}) {
  const style = getEnemyAttackStyle(styleId);
  const baseAngle = Number(context.baseAngle) || 0;
  const side = Number(context.side) || 1;
  const slot = Number(context.slot) || 0;
  const now = Number(context.now) || Date.now();
  const playerX = Number(context.playerX) || 0;
  const enemyX = Number(context.enemyX) || 0;
  const baseSpeed = style.speedMult || 1;
  const baseDamage = style.damageMult || 1;

  switch (style.id) {
    case 'single':
      return patternFromOffsets(baseAngle, [0], baseSpeed, baseDamage);
    case 'double':
      return patternFromOffsets(baseAngle, [-0.08, 0.08], baseSpeed, baseDamage);
    case 'wide':
      return patternFromOffsets(baseAngle, [-0.18, 0.18], baseSpeed, baseDamage);
    case 'needle':
      return patternFromOffsets(baseAngle, [0], baseSpeed, baseDamage);
    case 'fan':
      return patternFromOffsets(baseAngle, [-0.22, 0, 0.22], baseSpeed, baseDamage);
    case 'quickChip':
      return patternFromOffsets(baseAngle, [0], baseSpeed, baseDamage * 0.92);
    case 'slowHeavy':
      return patternFromOffsets(baseAngle, [0], baseSpeed, baseDamage);
    case 'offsetPair':
      return patternFromOffsets(baseAngle, [-0.11, 0.11], baseSpeed, baseDamage);
    case 'triad':
      return patternFromOffsets(baseAngle, [-0.16, 0, 0.16], baseSpeed, baseDamage * 0.95);
    case 'stutter': {
      const jitter = Math.sin(now * 0.013 + slot) * 0.045;
      return patternFromOffsets(baseAngle, [jitter], baseSpeed, baseDamage);
    }
    case 'laneShot': {
      const laneLean = enemyX < playerX ? 0.06 : -0.06;
      return patternFromOffsets(baseAngle, [laneLean], baseSpeed, baseDamage);
    }
    case 'delayedBurst': {
      const pulse = Math.sin(now * 0.006 + slot) > 0 ? 0.08 : -0.08;
      return patternFromOffsets(baseAngle, [pulse, -pulse], baseSpeed, baseDamage * 0.9);
    }
    case 'crossShot':
      return patternFromOffsets(baseAngle, [side * 0.16, -side * 0.09], baseSpeed, baseDamage * 0.9);
    case 'fanPulse': {
      const pulse = Math.sin(now * 0.006 + slot) * 0.06;
      return patternFromOffsets(baseAngle, [-0.2 + pulse, pulse, 0.2 + pulse], baseSpeed, baseDamage * 0.88);
    }
    case 'slowOrb':
      return patternFromOffsets(baseAngle, [0], baseSpeed, baseDamage);
    case 'warningShot': {
      const warnOffset = Math.sin(now * 0.004 + slot) * 0.05;
      return patternFromOffsets(baseAngle, [warnOffset], baseSpeed, baseDamage);
    }
    case 'arcVolley':
      return patternFromOffsets(baseAngle, [-0.16, 0.04, 0.21], baseSpeed, baseDamage * 0.88);
    case 'splitLite':
      return patternFromOffsets(baseAngle, [-0.19, 0.19], baseSpeed, baseDamage * 0.9);
    case 'suppressiveLine':
      return patternFromOffsets(baseAngle, [-0.08, 0, 0.08], baseSpeed, baseDamage * 0.82);
    case 'rotatingPair': {
      const rotation = Math.sin(now * 0.005 + slot) * 0.12;
      return patternFromOffsets(baseAngle, [-0.12 + rotation, 0.12 + rotation], baseSpeed, baseDamage * 0.9);
    }
    case 'chargeShot':
      return patternFromOffsets(baseAngle, [0], baseSpeed, baseDamage);
    case 'forkShot':
      return patternFromOffsets(baseAngle, [-0.15, 0, 0.15], baseSpeed, baseDamage * 0.86);
    case 'predictiveShot': {
      const lead = Math.max(-0.11, Math.min(0.11, (playerX - enemyX) / 3600));
      return patternFromOffsets(baseAngle + lead, [0], baseSpeed, baseDamage);
    }
    default:
      return patternFromOffsets(baseAngle, [0], baseSpeed, baseDamage);
  }
}
