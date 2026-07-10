const TAU = Math.PI * 2;

export const GAMEPLAY_BACKDROP_PROFILES = Object.freeze({
  base: Object.freeze({
    alphas: Object.freeze({ base: 0.42, storm: 0, boss: 0, shade: 0.46 }),
    maxOffsetX: 10,
    maxOffsetY: 6,
    periodXMs: 43000,
    periodYMs: 31000,
    phase: 0.35
  }),
  storm: Object.freeze({
    alphas: Object.freeze({ base: 0.26, storm: 0.34, boss: 0, shade: 0.5 }),
    maxOffsetX: 14,
    maxOffsetY: 8,
    periodXMs: 37000,
    periodYMs: 27000,
    phase: 1.1
  }),
  boss: Object.freeze({
    alphas: Object.freeze({ base: 0.18, storm: 0.16, boss: 0.4, shade: 0.54 }),
    maxOffsetX: 18,
    maxOffsetY: 10,
    periodXMs: 29000,
    periodYMs: 24000,
    phase: 2.05
  })
});

export function getGameplayBackdropProfile(mode = 'base') {
  return GAMEPLAY_BACKDROP_PROFILES[mode] || GAMEPLAY_BACKDROP_PROFILES.base;
}

export function resolveGameplayBackdropMode(level = 1, context = {}) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const enemyState = String(context.enemyState || '').toUpperCase();
  const bossActive = Boolean(
    context.bossActive
    || enemyState === 'BOSS'
    || enemyState === 'BOSS_GATE'
    || enemyState === 'BOSS_ACTIVE'
  );
  if (bossActive || safeLevel % 5 === 0) return 'boss';
  if (safeLevel >= 3) return 'storm';
  return 'base';
}

export function sampleGameplayBackdropMotion(mode, elapsedMs = 0, options = {}) {
  const profile = getGameplayBackdropProfile(mode);
  if (options.reducedMotion) return { x: 0, y: 0 };
  const time = Math.max(0, Number(elapsedMs) || 0);
  return {
    x: Math.sin((time / profile.periodXMs) * TAU + profile.phase) * profile.maxOffsetX,
    y: Math.sin((time / profile.periodYMs) * TAU + profile.phase + Math.PI * 0.5) * profile.maxOffsetY
  };
}

export function getGameplayBackdropCoverScale({
  textureWidth,
  textureHeight,
  width,
  height,
  mode = 'base',
  edgePadding = 4,
  reducedMotion = false
} = {}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const safeTextureWidth = Math.max(1, Number(textureWidth) || safeWidth);
  const safeTextureHeight = Math.max(1, Number(textureHeight) || safeHeight);
  const profile = getGameplayBackdropProfile(mode);
  const padding = Math.max(0, Number(edgePadding) || 0);
  const offsetX = reducedMotion ? 0 : profile.maxOffsetX;
  const offsetY = reducedMotion ? 0 : profile.maxOffsetY;
  return Math.max(
    (safeWidth + (offsetX + padding) * 2) / safeTextureWidth,
    (safeHeight + (offsetY + padding) * 2) / safeTextureHeight
  );
}
