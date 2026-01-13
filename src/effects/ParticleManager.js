import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';

class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.color = 0xffffff;
    this.size = 1;
    this.lifetime = 0;
    this.age = 0;
    this.active = false;
    this.isDebris = false;

    this.sprite = new PIXI.Graphics();
    this.sprite.visible = false;

    this.bitmap = new PIXI.Sprite();
    this.bitmap.anchor.set(0.5);
    this.bitmap.visible = false;
  }

  reset(x, y, vx, vy, color, size, lifetime, texture = null) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.lifetime = lifetime;
    this.age = 0;
    this.active = true;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;

    if (texture) {
      this.isDebris = true;
      this.bitmap.texture = texture;
      this.bitmap.x = x;
      this.bitmap.y = y;
      this.bitmap.alpha = 1;

      // Scale debris to fit roughly 'size'
      const scale = (size * 5) / Math.max(texture.width, texture.height);
      this.bitmap.scale.set(scale);

      this.bitmap.visible = true;
      this.sprite.visible = false;
    } else {
      this.isDebris = false;
      this.sprite.clear();
      this.sprite.circle(0, 0, size);
      this.sprite.fill({ color: color });
      this.sprite.x = x;
      this.sprite.y = y;
      this.sprite.alpha = 1;
      this.sprite.scale.set(1);
      this.sprite.visible = true;
      this.bitmap.visible = false;
    }
  }

  update(delta) {
    this.age += delta;
    if (this.age >= this.lifetime) {
      this.active = false;
      this.sprite.visible = false;
      this.bitmap.visible = false;
      return;
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.vy += 0.1 * delta; // Gravity

    if (this.isDebris) {
      this.bitmap.x = this.x;
      this.bitmap.y = this.y;
      this.bitmap.rotation += this.rotationSpeed * delta;
      const lifePercent = this.age / this.lifetime;
      this.bitmap.alpha = 1 - lifePercent;
    } else {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      const lifePercent = this.age / this.lifetime;
      this.sprite.alpha = 1 - lifePercent;
      this.sprite.scale.set(1 - lifePercent * 0.5);
    }
  }
}

export class ParticleManager {
  constructor(container, onCap) {
    this.container = container;
    this.particles = [];
    this.pool = [];
    this.maxParticles = 400;
    this.onCap = onCap;
  }

  spawnParticle(x, y, vx, vy, color, size, lifetime, texture = null) {
    if (this.particles.length >= this.maxParticles) {
      if (this.onCap) this.onCap('particles');
      return null;
    }

    const particle = this.pool.pop() || new Particle();
    particle.reset(x, y, vx, vy, color, size, lifetime, texture);
    this.particles.push(particle);

    // Ensure both are added (safe to add if already added, PIXI handles parent checks)
    this.container.addChild(particle.sprite);
    this.container.addChild(particle.bitmap);

    return particle;
  }

  createExplosion(x, y, color) {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random() * 3;
      const lifetime = 30 + Math.random() * 30;

      if (!this.spawnParticle(x, y, vx, vy, color, size, lifetime)) {
        break;
      }
    }

    // Debris
    const debrisCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < debrisCount; i++) {
      const tex = GameAssets.getRandomPart();
      if (tex) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.spawnParticle(x, y, vx, vy, 0xffffff, 5, 60, tex);
      }
    }
  }

  createHitSpark(x, y) {
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 1 + Math.random() * 2;
      const lifetime = 15 + Math.random() * 15;

      if (!this.spawnParticle(x, y, vx, vy, 0xffff00, size, lifetime)) {
        break;
      }
    }
  }

  createPickupEffect(x, y, color) {
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 1 + Math.random() * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2; // Upward bias
      const size = 2 + Math.random() * 2;
      const lifetime = 40 + Math.random() * 20;

      if (!this.spawnParticle(x, y, vx, vy, color, size, lifetime)) {
        break;
      }
    }
  }

  createTrail(x, y, color) {
    this.spawnParticle(x, y, 0, 0, color, 2, 20);
  }

  update(delta) {
    this.particles = this.particles.filter(particle => {
      particle.update(delta);
      if (!particle.active) {
        this.container.removeChild(particle.sprite);
        this.container.removeChild(particle.bitmap);
        this.pool.push(particle);
        return false;
      }
      return true;
    });
  }
}
