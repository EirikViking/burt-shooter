// Velocities and projectile speed use pixels per simulation frame.
export function predictIntercept(origin, target, speed, maxLeadFrames = 60) {
  const x = Number(target?.x) || 0, y = Number(target?.y) || 0;
  const vx = Number(target?.aimVelocityX) || 0, vy = Number(target?.aimVelocityY) || 0;
  const dx = x - origin.x, dy = y - origin.y;
  const a = vx * vx + vy * vy - speed * speed;
  const b = 2 * (dx * vx + dy * vy), c = dx * dx + dy * dy;
  let time = Math.hypot(dx, dy) / Math.max(.001, speed);
  if (Math.abs(a) < .000001) {
    if (b < -.000001) time = -c / b;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const roots = [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)].filter(t => t >= 0);
      if (roots.length) time = Math.min(...roots);
    }
  }
  time = Math.max(0, Math.min(maxLeadFrames, time));
  return { x: x + vx * time, y: y + vy * time, time };
}
