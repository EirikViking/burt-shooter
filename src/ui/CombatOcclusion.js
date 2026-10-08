export function overlapsCombatPoint(bounds, point) {
  if (point.bounds) return bounds.x < point.bounds.x + point.bounds.width && bounds.x + bounds.width > point.bounds.x
    && bounds.y < point.bounds.y + point.bounds.height && bounds.y + bounds.height > point.bounds.y;
  const radius = Math.max(12, Number(point.radius) || 0);
  return point.x + radius >= bounds.x && point.x - radius <= bounds.x + bounds.width
    && point.y + radius >= bounds.y && point.y - radius <= bounds.y + bounds.height;
}

export function getCombatScreenPoints(play) {
  const points = [];
  if (play?.hud) play.hud.combatScreenPoints = points;
  if (!play || play.isPaused || play.introActive) return [];
  const transform = play.gameContainer?.worldTransform;
  if (!transform) return [];
  const add = actor => {
    if (!actor?.active || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return;
    points.push({ x: transform.a * actor.x + transform.c * actor.y + transform.tx,
      y: transform.b * actor.x + transform.d * actor.y + transform.ty,
      radius: Math.max(12, Number(actor.radius) || 12) * Math.max(Math.abs(transform.a), Math.abs(transform.d)) });
  };
  add(play.player);
  for (const enemy of play.enemyManager?.enemies || []) add(enemy);
  for (const bullet of play.bulletManager?.enemyBullets || []) add(bullet);
  add(play.enemyManager?.boss);
  for (const hazard of play.bossHazards || []) {
    if (!Number.isFinite(hazard.sourceX) || !Number.isFinite(hazard.sourceY)) continue;
    const radius = Number(hazard.outerRadius ?? hazard.radius) || 16;
    const endX = hazard.sourceX + Math.cos(hazard.angle || 0) * (hazard.length || 0);
    const endY = hazard.sourceY + Math.sin(hazard.angle || 0) * (hazard.length || 0);
    const xs = [hazard.sourceX, endX, ...(hazard.columns || [])];
    const ys = [hazard.sourceY, endY, hazard.startY ?? hazard.sourceY, hazard.endY ?? endY];
    const x = Math.min(...xs) - radius, y = Math.min(...ys) - radius;
    points.push({ bounds: { x: transform.a * x + transform.tx, y: transform.d * y + transform.ty,
      width: (Math.max(...xs) - x + radius) * transform.a, height: (Math.max(...ys) - y + radius) * transform.d } });
  }
  return points;
}
