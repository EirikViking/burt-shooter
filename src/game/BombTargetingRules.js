export const BOMB_ARMING_MS = 650;

function isActiveTarget(target) {
  return Boolean(target && target.active !== false && target.destroyed !== true);
}

function getTargetRadius(target) {
  return Math.max(0, Number(target?.radius) || 0);
}

function isAheadOfPlayer(player, target) {
  return (Number(target?.y) || 0) < (Number(player?.y) || 0) - 36;
}

function isInsideBombLane(player, target, blastRadius) {
  const laneHalfWidth = Math.max(72, Math.min(148, Math.max(1, Number(blastRadius) || 150) * 0.68));
  const horizontalGap = Math.abs((Number(target?.x) || 0) - (Number(player?.x) || 0));
  return horizontalGap <= laneHalfWidth + getTargetRadius(target) * 0.45;
}

export function findBombCommitTarget({
  player,
  enemies = [],
  boss = null,
  blastRadius = 150,
  shotDamage = 5
} = {}) {
  if (!player) return { target: null, reason: 'no_player', clusterCount: 0 };

  const safeBlastRadius = Math.max(40, Number(blastRadius) || 150);
  const activeEnemies = (Array.isArray(enemies) ? enemies : [])
    .filter((target) => isActiveTarget(target) && isAheadOfPlayer(player, target));

  if (isActiveTarget(boss) && isAheadOfPlayer(player, boss) && isInsideBombLane(player, boss, safeBlastRadius)) {
    return {
      target: boss,
      reason: 'boss',
      clusterCount: 1,
      horizontalGap: Math.abs((Number(boss.x) || 0) - (Number(player.x) || 0))
    };
  }

  const laneTargets = activeEnemies.filter((target) => isInsideBombLane(player, target, safeBlastRadius));
  const durableThreshold = Math.max(12, Math.max(1, Number(shotDamage) || 1) * 1.35);
  let best = null;

  for (const target of laneTargets) {
    const clusterCount = activeEnemies.filter((candidate) => {
      const dx = (Number(candidate.x) || 0) - (Number(target.x) || 0);
      const dy = (Number(candidate.y) || 0) - (Number(target.y) || 0);
      const combinedRadius = safeBlastRadius * 0.92 + getTargetRadius(candidate) * 0.35;
      return (dx * dx + dy * dy) <= combinedRadius * combinedRadius;
    }).length;
    const health = Math.max(0, Number(target.health) || 0);
    const durable = health >= durableThreshold;
    if (clusterCount < 2 && !durable) continue;

    const horizontalGap = Math.abs((Number(target.x) || 0) - (Number(player.x) || 0));
    const forwardGap = Math.max(0, (Number(player.y) || 0) - (Number(target.y) || 0));
    const score = clusterCount * 120 + (durable ? 90 : 0) - horizontalGap * 1.4 - forwardGap * 0.025;
    if (!best || score > best.score) {
      best = {
        target,
        reason: clusterCount >= 2 ? 'cluster' : 'durable',
        clusterCount,
        horizontalGap,
        score
      };
    }
  }

  return best || { target: null, reason: laneTargets.length ? 'weak_target' : 'no_target_in_lane', clusterCount: 0 };
}
