export const HULL_SURPLUS_BASE_LIVES = 3;

export function shouldTriggerHullSurplusCabinetLog({
  before = 0,
  after = 0,
  gained = null,
  baseLives = HULL_SURPLUS_BASE_LIVES
} = {}) {
  const safeBefore = Math.max(0, Number(before) || 0);
  const safeAfter = Math.max(0, Number(after) || 0);
  const safeGained = gained == null
    ? Math.max(0, safeAfter - safeBefore)
    : Math.max(0, Number(gained) || 0);
  const safeBaseLives = Math.max(1, Math.round(Number(baseLives) || HULL_SURPLUS_BASE_LIVES));
  return safeGained > 0 && safeAfter > safeBaseLives;
}
