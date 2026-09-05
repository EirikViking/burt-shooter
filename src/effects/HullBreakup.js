import * as PIXI from 'pixi.js';
import { getReducedMotionEnabled } from '../config/AccessibilitySettings.js';

// Bounded visual-only fragments. No Math.random, game clock writes, collisions,
// event callbacks, scoring or extra calls to the ordinary particle allocator.
export class HullBreakup {
  constructor(container) {
    this.container = container;
    this.active = [];
    this.pool = [];
    this.frames = new WeakMap();
    this.seen = new WeakSet();
    this.maxFragments = 40;
    this.bossPieces = [];
    const perimeter = [[0, 0], [.39, 0], [1, 0], [1, .42], [1, 1], [.57, 1], [0, 1], [0, .64]];
    for (let i = 0; i < 8; i++) {
      const vertices = [[.48, .52], perimeter[i], perimeter[(i + 1) % 8]];
      const cx = vertices.reduce((sum, p) => sum + p[0], 0) / 3;
      const cy = vertices.reduce((sum, p) => sum + p[1], 0) / 3;
      const geometry = new PIXI.MeshGeometry({
        positions: new Float32Array(vertices.flatMap(([x, y]) => [x - cx, y - cy])),
        uvs: new Float32Array(vertices.flat()), indices: new Uint32Array([0, 1, 2])
      });
      const mesh = new PIXI.Mesh({ geometry, texture: PIXI.Texture.EMPTY });
      mesh.visible = false; mesh.eventMode = 'none';
      container.addChild(mesh);
      this.bossPieces.push({ mesh, cx, cy, index: i });
    }
  }
  emit(enemy) {
    if (!enemy || this.seen.has(enemy) || getReducedMotionEnabled()) return;
    this.seen.add(enemy);
    const body = enemy.body?.texture ? enemy.body : enemy.hitboxRef;
    const texture = body?.texture;
    if (enemy.kind === 'boss' && texture?.source) {
      this.emitBoss(enemy, body);
      return;
    }
    if (!texture?.source || this.active.length > this.maxFragments - 4) return;
    let frames = this.frames.get(texture);
    if (!frames) {
      const w = texture.width / 2, h = texture.height / 2;
      frames = [0, 1, 2, 3].map(i => new PIXI.Texture({ source: texture.source, frame: new PIXI.Rectangle(texture.frame.x + (i % 2) * w, texture.frame.y + Math.floor(i / 2) * h, w, h) }));
      this.frames.set(texture, frames);
    }
    const boss = enemy.kind === 'boss';
    const size = Math.max(18, Math.min(boss ? 260 : 160, boss ? enemy.radius * 2 : enemy.radius * 2.5));
    const angle = (body.rotation || 0) + (enemy.sprite?.rotation || 0);
    for (let i = 0; i < 4; i++) {
      const dx = i % 2 ? 1 : -1, dy = i < 2 ? -1 : 1;
      const sx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const sy = dx * Math.sin(angle) + dy * Math.cos(angle);
      const sprite = this.pool.pop() || new PIXI.Sprite();
      sprite.texture = frames[i]; sprite.anchor.set(0.5);
      sprite.position.set(enemy.x + sx * size * 0.15, enemy.y + sy * size * 0.15);
      sprite.width = size * 0.5; sprite.height = size * 0.5;
      sprite.rotation = angle; sprite.alpha = 0.9; sprite.tint = 0xd9d9d9; sprite.visible = true;
      sprite.eventMode = 'none';
      if (!sprite.parent) this.container.addChild(sprite);
      this.active.push({ sprite, age: 0, sx, sy, speed: boss ? 4.6 : 1.25, lifetime: boss ? 68 : 38 });
    }
  }
  emitBoss(enemy, body) {
    // Preserve the complete rendered hull transform, including parent scale.
    // The previous quarter sprites used collision radius and shrank bosses.
    const transform = body.getGlobalTransform();
    const local = this.container.getGlobalTransform().clone().invert().append(transform);
    const width = body.texture.width, height = body.texture.height;
    const angle = Math.atan2(local.b, local.a);
    const sx = Math.hypot(local.a, local.b) * width;
    const sy = Math.hypot(local.c, local.d) * height;
    for (const p of this.bossPieces) {
      const px = (p.cx - body.anchor.x) * width, py = (p.cy - body.anchor.y) * height;
      p.x = local.a * px + local.c * py + local.tx;
      p.y = local.b * px + local.d * py + local.ty;
      p.angle = angle; p.sx = sx; p.sy = sy; p.age = 0; p.active = true;
      const direction = Math.atan2(p.cy - .52, p.cx - .48) + angle;
      p.vx = Math.cos(direction) * (2.1 + p.index % 3 * .65);
      p.vy = Math.sin(direction) * (1.8 + p.index % 3 * .45);
      p.mesh.texture = body.texture;
      p.mesh.position.set(p.x, p.y); p.mesh.scale.set(sx, sy);
      p.mesh.rotation = angle; p.mesh.alpha = 1; p.mesh.tint = 0xffffff; p.mesh.visible = true;
    }
  }
  update(delta) {
    for (const p of this.bossPieces) {
      if (!p.active) continue;
      p.age += delta;
      if (p.age >= 108) { p.active = false; p.mesh.visible = false; continue; }
      const t = p.age / 108;
      const travel = (1 - Math.exp(-p.age * .028)) / .028;
      p.mesh.position.set(p.x + p.vx * travel, p.y + p.vy * travel + t * t * 28);
      p.mesh.rotation = p.angle + (p.index % 2 ? -1 : 1) * t * (.45 + p.index * .06);
      p.mesh.scale.set(p.sx * (1 - t * .12), p.sy * (1 - t * .22));
      const light = Math.round(255 * (1 - .65 * Math.min(1, t * 2)));
      p.mesh.tint = (light << 16) | (Math.min(255, light + 5) << 8) | Math.min(255, light + 12);
      p.mesh.alpha = Math.min(1, (1 - t) * 2.1);
    }
    let write = 0;
    for (const f of this.active) {
      f.age += delta;
      if (f.age >= f.lifetime) { f.sprite.visible = false; this.pool.push(f.sprite); continue; }
      const drag = Math.exp(-f.age * 0.04);
      f.sprite.x += f.sx * f.speed * drag * delta;
      f.sprite.y += (f.sy * f.speed * drag + 0.25) * delta;
      f.sprite.rotation += f.sx * f.sy * 0.024 * delta;
      f.sprite.alpha = 0.85 * Math.pow(1 - f.age / f.lifetime, 1.4);
      this.active[write++] = f;
    }
    this.active.length = write;
  }
}
