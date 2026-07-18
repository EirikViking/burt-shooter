export const POINT_DEFENSE_RADIUS = 104;

export function isWithinPointDefenseRadius(player, projectile, radius = POINT_DEFENSE_RADIUS) {
  if (!player || !projectile) return false;
  const dx = (Number(projectile.x) || 0) - (Number(player.x) || 0);
  const dy = (Number(projectile.y) || 0) - (Number(player.y) || 0);
  const safeRadius = Math.max(1, Number(radius) || POINT_DEFENSE_RADIUS);
  return (dx * dx + dy * dy) <= safeRadius * safeRadius;
}

export function claimPiercingTargetHit(bullet, target) {
  if (!bullet?.piercing || !target) return true;
  if (!bullet.pierceHitTargets) bullet.pierceHitTargets = new WeakSet();
  if (bullet.pierceHitTargets.has(target)) return false;
  bullet.pierceHitTargets.add(target);
  return true;
}
