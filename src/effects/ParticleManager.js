import * as PIXI from 'pixi.js';

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

    this.sprite = new PIXI.Graphics();
    this.sprite.visible = false;
  }

  reset(x, y, vx, vy, color, size, lifetime) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.lifetime = lifetime;
    this.age = 0;
    this.active = true;

    this.sprite.clear();
    this.sprite.circle(0, 0, size);
    this.sprite.fill({ color: color });
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.alpha = 1;
    this.sprite.scale.set(1);
    this.sprite.visible = true;
  }

  update(delta) {
    this.age += delta;
    if (this.age >= this.lifetime) {
      this.active = false;
      this.sprite.visible = false;
      return;
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.vy += 0.1 * delta; // Gravity

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Fade out
    const lifePercent = this.age / this.lifetime;
    this.sprite.alpha = 1 - lifePercent;
    this.sprite.scale.set(1 - lifePercent * 0.5);
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

  spawnParticle(x, y, vx, vy, color, size, lifetime) {
    if (this.particles.length >= this.maxParticles) {
      if (this.onCap) this.onCap('particles');
      return null;
    }

    const particle = this.pool.pop() || new Particle();
    particle.reset(x, y, vx, vy, color, size, lifetime);
    this.particles.push(particle);
    this.container.addChild(particle.sprite);
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
        this.pool.push(particle);
        return false;
      }
      return true;
    });
  }
}
