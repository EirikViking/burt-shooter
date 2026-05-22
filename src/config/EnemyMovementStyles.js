export const ENEMY_MOVEMENT_STYLE_DEFS = [
  { id: 'sine', unlockLevel: 1, tier: 'starter', label: 'Sine Drift' },
  { id: 'zigzag', unlockLevel: 1, tier: 'starter', label: 'Zigzag Step' },
  { id: 'circle', unlockLevel: 1, tier: 'starter', label: 'Circle Bob' },
  { id: 'drunk', unlockLevel: 1, tier: 'starter', label: 'Loose Drift' },
  { id: 'aggressive', unlockLevel: 2, tier: 'early', label: 'Aggressive Lean' },
  { id: 'flutter', unlockLevel: 3, tier: 'early', label: 'Flutter' },
  { id: 'pincer', unlockLevel: 4, tier: 'early', label: 'Pincer Lean' },
  { id: 'orbit', unlockLevel: 5, tier: 'early', label: 'Orbit Bob' },
  { id: 'snap', unlockLevel: 6, tier: 'early', label: 'Snap Step' },
  { id: 'weave', unlockLevel: 7, tier: 'early', label: 'Weave' },
  { id: 'strafe', unlockLevel: 8, tier: 'early', label: 'Strafe' },
  { id: 'laneSwap', unlockLevel: 9, tier: 'early', label: 'Lane Swap' },
  { id: 'dashPause', unlockLevel: 10, tier: 'early', label: 'Dash Pause' },
  { id: 'anchor', unlockLevel: 11, tier: 'early', label: 'Anchor Hold' },
  { id: 'feint', unlockLevel: 12, tier: 'mid', label: 'Feint' },
  { id: 'boomerang', unlockLevel: 14, tier: 'mid', label: 'Boomerang Arc' },
  { id: 'corkscrew', unlockLevel: 16, tier: 'mid', label: 'Corkscrew' },
  { id: 'turretDrift', unlockLevel: 18, tier: 'mid', label: 'Turret Drift' },
  { id: 'sweep', unlockLevel: 20, tier: 'mid', label: 'Broad Sweep' },
  { id: 'escortOrbit', unlockLevel: 22, tier: 'advanced', label: 'Escort Orbit' },
  { id: 'baitRetreat', unlockLevel: 24, tier: 'advanced', label: 'Bait Retreat' },
  { id: 'spiralIn', unlockLevel: 26, tier: 'advanced', label: 'Spiral In' },
  { id: 'crossCut', unlockLevel: 28, tier: 'advanced', label: 'Cross Cut' },
  { id: 'waveDive', unlockLevel: 30, tier: 'advanced', label: 'Wave Dive' },
  { id: 'mirrorWeave', unlockLevel: 32, tier: 'elite', label: 'Mirror Weave' },
  { id: 'pulseAdvance', unlockLevel: 34, tier: 'elite', label: 'Pulse Advance' },
  { id: 'hookTurn', unlockLevel: 37, tier: 'elite', label: 'Hook Turn' },
  { id: 'fastNeedle', unlockLevel: 40, tier: 'elite', label: 'Fast Needle' }
];

export const ENEMY_MOVEMENT_STYLE_IDS = ENEMY_MOVEMENT_STYLE_DEFS.map((style) => style.id);

const STYLE_BY_ID = new Map(ENEMY_MOVEMENT_STYLE_DEFS.map((style) => [style.id, style]));

export function getEnemyMovementStyle(id) {
  return STYLE_BY_ID.get(id) || STYLE_BY_ID.get('sine');
}

export function getEnemyMovementStylesForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return ENEMY_MOVEMENT_STYLE_DEFS.filter((style) => style.unlockLevel <= safeLevel);
}

export function getEnemyMovementOffset(styleId, context = {}) {
  const phase = Number(context.phase) || 0;
  const tacticalWave = Number(context.tacticalWave) || phase;
  const side = Number(context.side) || 1;
  const slot = Number(context.slot) || 0;
  const size = Math.max(1, Number(context.size) || 1);
  const enemyX = Number(context.x) || 0;
  const playerX = Number(context.playerX) || enemyX;
  const slotPhase = (slot / size) * Math.PI * 2;
  const playerSide = playerX >= enemyX ? 1 : -1;

  switch (styleId) {
    case 'sine':
      return { x: Math.sin(phase) * 8, y: Math.cos(phase * 0.7) * 3 };
    case 'zigzag':
      return { x: Math.sign(Math.sin(phase)) * 10, y: Math.cos(phase * 0.6) * 4 };
    case 'circle':
      return { x: Math.cos(phase) * 12, y: Math.sin(phase) * 8 };
    case 'drunk':
      return { x: Math.sin(phase * 2.3) * 8, y: Math.cos(phase * 1.7) * 5 };
    case 'aggressive':
      return { x: playerSide * Math.max(0, Math.sin(phase * 0.8)) * 12, y: Math.sin(phase * 1.1) * 6 };
    case 'flutter':
      return { x: Math.sin(phase * 2.8) * 10, y: Math.sin(phase * 3.6) * 6 };
    case 'pincer':
      return { x: Math.sin(phase) * (enemyX < playerX ? 12 : -12), y: Math.cos(phase * 1.2) * 6 };
    case 'orbit':
      return { x: Math.cos(phase) * 15, y: Math.sin(phase) * 10 };
    case 'snap':
      return { x: Math.round(Math.sin(phase) * 2) * 6, y: Math.round(Math.cos(phase * 0.7) * 1.5) * 4 };
    case 'weave':
      return { x: Math.sin(phase * 1.4) * 14, y: Math.cos(phase * 0.8) * 7 };
    case 'strafe':
      return { x: Math.sin(phase * 0.72) * 24, y: Math.cos(phase * 0.45) * 4 };
    case 'laneSwap':
      return { x: Math.round(Math.sin(phase * 0.5)) * 18, y: Math.sin(phase * 0.9) * 5 };
    case 'dashPause': {
      const dash = Math.sign(Math.sin(phase)) * Math.max(0, Math.abs(Math.sin(phase)) - 0.52);
      return { x: dash * 36, y: Math.cos(phase * 0.8) * 4 };
    }
    case 'anchor':
      return { x: Math.sin(phase * 0.55) * 5, y: Math.cos(phase * 0.42) * 3 };
    case 'feint':
      return { x: playerSide * Math.max(0, Math.sin(phase * 0.8)) * 15 - side * Math.cos(phase * 0.45) * 8, y: -Math.max(0, Math.cos(phase)) * 7 };
    case 'boomerang':
      return { x: Math.sin(phase * 0.55) * 24, y: -Math.abs(Math.cos(phase * 0.55)) * 10 + Math.sin(phase) * 6 };
    case 'corkscrew':
      return { x: Math.cos(phase * 1.7) * 18, y: Math.sin(phase * 1.7) * 10 };
    case 'turretDrift':
      return { x: Math.sin(phase * 0.35) * 8, y: Math.cos(phase * 0.48) * 5 };
    case 'sweep':
      return { x: Math.sin(phase * 0.62) * 32, y: Math.cos(phase * 0.76) * 6 };
    case 'escortOrbit':
      return { x: Math.cos(phase + slotPhase) * 20, y: Math.sin(phase + slotPhase) * 12 };
    case 'baitRetreat':
      return { x: Math.sin(phase * 0.9) * 12, y: -Math.max(0, Math.sin(phase * 0.85)) * 14 };
    case 'spiralIn': {
      const scale = 0.48 + (0.5 + Math.sin(phase * 0.22) * 0.5) * 0.52;
      return { x: Math.cos(phase * 1.25) * 26 * scale, y: Math.sin(phase * 1.25) * 15 * scale };
    }
    case 'crossCut':
      return { x: side * Math.sin(phase * 0.75) * 28, y: Math.cos(phase * 1.08) * 8 };
    case 'waveDive':
      return { x: Math.sin(phase * 1.08) * 18, y: Math.max(0, Math.sin(phase * 0.82)) * 16 };
    case 'mirrorWeave':
      return { x: (slot % 2 ? -1 : 1) * Math.sin(phase * 1.2) * 22, y: Math.cos(phase * 1.1 + slotPhase) * 8 };
    case 'pulseAdvance':
      return { x: Math.sin(phase * 0.95 + slotPhase) * 10, y: Math.max(0, Math.sin(phase * 1.6 + slotPhase)) * 18 };
    case 'hookTurn':
      return { x: side * (Math.sin(phase * 0.72) * 18 + Math.max(0, Math.cos(phase * 0.72)) * 14), y: Math.sin(phase * 1.05) * 9 };
    case 'fastNeedle':
      return { x: Math.sign(Math.sin(tacticalWave * 1.7 + slotPhase)) * 16, y: Math.cos(tacticalWave * 1.1) * 5 };
    default:
      return { x: 0, y: 0 };
  }
}
