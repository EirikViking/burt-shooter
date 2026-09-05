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
  }
  emit(enemy) {
    if (!enemy || this.seen.has(enemy) || getReducedMotionEnabled()) return;
    this.seen.add(enemy);
    const body = enemy.body?.texture ? enemy.body : enemy.hitboxRef;
    const texture = body?.texture;
    if (!texture?.source || this.active.length > this.maxFragments - 4) return;
    let frames = this.frames.get(texture);
    if (!frames) {
      const w = texture.width / 2, h = texture.height / 2;
      frames = [0, 1, 2, 3].map(i => new PIXI.Texture({ source: texture.source, frame: new PIXI.Rectangle((i % 2) * w, Math.floor(i / 2) * h, w, h) }));
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
  update(delta) {
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
