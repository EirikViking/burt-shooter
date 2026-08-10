import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import {
  isMayhemPerformanceDiagnosticsActive,
  markMayhemPerformanceEvent,
  recordMayhemPerformanceDuration
} from '../debug/MayhemPerformanceDiagnostics.js';

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
      const speed = Math.max(0.1, Math.hypot(vx, vy));
      const shardLength = Math.max(3.2, Math.min(18, size * (1.5 + Math.min(1.65, speed * 0.17))));
      const shardWidth = Math.max(0.9, Math.min(6.5, size * 0.7));
      const curl = (Math.random() - 0.5) * shardWidth * 1.2;
      this.sprite.moveTo(-shardLength * 0.5, curl * 0.18);
      this.sprite.bezierCurveTo(
        -shardLength * 0.1, -shardWidth * 0.72,
        shardLength * 0.46, -shardWidth * 1.04 + curl,
        shardLength, -shardWidth * 0.08
      );
      this.sprite.bezierCurveTo(
        shardLength * 0.42, shardWidth * 0.38 + curl * 0.35,
        -shardLength * 0.06, shardWidth * 0.78,
        -shardLength * 0.5, curl * 0.18
      );
      this.sprite.fill({ color, alpha: 0.92 });
      this.sprite.moveTo(-shardLength * 0.08, curl * 0.1);
      this.sprite.bezierCurveTo(
        shardLength * 0.25, -shardWidth * 0.2,
        shardLength * 0.56, curl * 0.18,
        shardLength * 0.82, -shardWidth * 0.06
      );
      this.sprite.stroke({ color: 0xffffff, width: Math.max(0.55, shardWidth * 0.22), alpha: 0.72 });
      this.sprite.x = x;
      this.sprite.y = y;
      this.sprite.rotation = Math.atan2(vy, vx);
      this.sprite.alpha = 1;
      this.sprite.scale.set(1);
      this.sprite.blendMode = 'add';
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
      this.sprite.rotation = Math.atan2(this.vy, this.vx) + this.rotationSpeed * this.age * 0.08;
      this.sprite.alpha = Math.pow(1 - lifePercent, 1.35);
      this.sprite.scale.set(1 - lifePercent * 0.42, 1 - lifePercent * 0.68);
    }
  }
}

export class ParticleManager {
  constructor(container, onCap) {
    this.container = container;
    this.particles = [];
    this.pool = [];
    this.maxParticles = 640;
    this.softParticleBudget = 520;
    this.pressureSpawnCounter = 0;
    this.lastPressureTrimCount = 0;
    this.energyBlooms = [];
    this.energyBloomPool = [];
    this.maxEnergyBlooms = 18;
    this.lastEnergyBloomVariant = -1;
    this.energyBloomVariantCounts = [0, 0, 0, 0];
    this.onCap = onCap;
    GameAssets.ensurePlasmaBloomTextures?.().catch(() => {});
  }

  attachParticleDisplay(particle) {
    if (!particle) return;
    if (particle.sprite?.parent !== this.container) this.container.addChild(particle.sprite);
    if (particle.bitmap?.parent !== this.container) this.container.addChild(particle.bitmap);
  }

  prewarm(count = 0) {
    const safeCount = Math.max(0, Math.min(this.maxParticles, Math.floor(Number(count) || 0)));
    const existing = this.pool.length + this.particles.length;
    for (let i = existing; i < safeCount; i += 1) {
      const particle = new Particle();
      this.attachParticleDisplay(particle);
      this.pool.push(particle);
    }
  }

  spawnParticle(x, y, vx, vy, color, size, lifetime, texture = null) {
    if (this.particles.length >= this.maxParticles) {
      if (this.onCap) this.onCap('particles');
      return null;
    }
    if (this.shouldSkipPressureSpawn(texture)) {
      return null;
    }

    const particle = this.pool.pop() || new Particle();
    particle.reset(x, y, vx, vy, color, size, lifetime, texture);
    this.particles.push(particle);

    this.attachParticleDisplay(particle);

    return particle;
  }

  shouldSkipPressureSpawn(texture = null) {
    const activeCount = this.particles.length;
    const softBudget = Math.max(0, Math.floor(Number(this.softParticleBudget) || 0));
    if (softBudget <= 0 || activeCount < softBudget) return false;

    const hardBudget = Math.max(softBudget + 1, Math.floor(Number(this.maxParticles) || softBudget + 1));
    const pressure = Math.min(1, Math.max(0, (activeCount - softBudget) / (hardBudget - softBudget)));
    const stride = pressure >= 0.75 ? 3 : 2;
    this.pressureSpawnCounter = (this.pressureSpawnCounter + 1) % stride;

    if (texture && activeCount >= softBudget - 8) {
      return this.pressureSpawnCounter !== 0;
    }
    return pressure >= 0.75
      ? this.pressureSpawnCounter !== 0
      : this.pressureSpawnCounter === 0;
  }

  retireParticle(particle) {
    if (!particle) return;
    particle.active = false;
    if (particle.sprite) particle.sprite.visible = false;
    if (particle.bitmap) particle.bitmap.visible = false;
  }

  createEnergyBloom(x, y, intensity = 1, options = {}) {
    const textures = GameAssets.getPlasmaBloomTextures?.() || [];
    const variant = this.resolveEnergyBloomVariant(options.color, options.variant, textures.length);
    const texture = GameAssets.getPlasmaBloomTexture?.(variant);
    if (!GameAssets.isValidTexture(texture)) {
      GameAssets.ensurePlasmaBloomTextures?.().catch(() => {});
      return false;
    }
    if (this.energyBlooms.length >= this.maxEnergyBlooms) {
      const oldest = this.energyBlooms.shift();
      if (oldest?.sprite) {
        oldest.sprite.visible = false;
        this.energyBloomPool.push(oldest.sprite);
      }
    }
    const sprite = this.energyBloomPool.pop() || new PIXI.Sprite(texture);
    sprite.texture = texture;
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.rotation = Number(options.rotation) || Math.random() * Math.PI * 2;
    sprite.alpha = 0;
    sprite.tint = 0xffffff;
    sprite.blendMode = 'add';
    sprite.visible = true;
    if (sprite.parent !== this.container) this.container.addChild(sprite);

    const safeIntensity = Math.max(0.2, Math.min(3.2, Number(intensity) || 1));
    const targetPixels = Math.max(68, Number(options.size) || (92 + Math.sqrt(safeIntensity) * 68));
    const baseScale = targetPixels / Math.max(1, texture.width, texture.height);
    const aspect = Math.max(0.72, Math.min(1.34, Number(options.aspect) || (0.86 + Math.random() * 0.28)));
    sprite.scale.set(baseScale * 0.22 * aspect, baseScale * 0.22 / aspect);
    this.energyBlooms.push({
      sprite,
      variant,
      age: 0,
      lifetime: Math.max(22, Number(options.lifetime) || (34 + Math.sqrt(safeIntensity) * 18)),
      baseScale,
      aspect,
      alpha: Math.max(0.18, Math.min(0.9, Number(options.alpha) || (0.38 + safeIntensity * 0.12))),
      rotationSpeed: Number(options.rotationSpeed) || (Math.random() - 0.5) * 0.018
    });
    this.lastEnergyBloomVariant = variant;
    this.energyBloomVariantCounts[variant] = (this.energyBloomVariantCounts[variant] || 0) + 1;
    return true;
  }

  resolveEnergyBloomVariant(color = null, requestedVariant = null, textureCount = 0) {
    const count = Math.max(1, Number(textureCount) || GameAssets.getPlasmaBloomTextures?.().length || 1);
    const namedVariants = { nova: 0, ion: 1, solar: 2, void: 3 };
    if (typeof requestedVariant === 'string' && requestedVariant in namedVariants) {
      return namedVariants[requestedVariant] % count;
    }
    if (Number.isFinite(requestedVariant)) return Math.abs(Math.floor(requestedVariant)) % count;

    const numericColor = Number(color);
    let candidates = Array.from({ length: count }, (_, index) => index);
    if (Number.isFinite(numericColor) && count > 1) {
      const red = (numericColor >> 16) & 0xff;
      const green = (numericColor >> 8) & 0xff;
      const blue = numericColor & 0xff;
      if (red > blue * 1.12 && red > green * 1.05) candidates = [2, 0].filter((index) => index < count);
      else if (blue > red * 1.18 && red > green * 0.8) candidates = [3, 1, 0].filter((index) => index < count);
      else if (blue + green > red * 1.7) candidates = [1, 0, 3].filter((index) => index < count);
    }
    let choice = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
    if (count > 1 && choice === this.lastEnergyBloomVariant) {
      const alternatives = candidates.filter((index) => index !== choice);
      choice = alternatives.length
        ? alternatives[Math.floor(Math.random() * alternatives.length)]
        : (choice + 1) % count;
    }
    return choice;
  }

  createExplosion(x, y, color, intensity = 1) {
    const startedAt = isMayhemPerformanceDiagnosticsActive()
      ? (globalThis.performance?.now?.() || 0)
      : 0;
    const visualIntensity = Math.max(0.2, Number(intensity) || 1);
    const bloomIntensity = Math.min(2.2, visualIntensity);
    this.createEnergyBloom(x, y, bloomIntensity, {
      size: 78 + Math.sqrt(bloomIntensity) * 58,
      alpha: Math.min(0.62, 0.34 + Math.sqrt(bloomIntensity) * 0.16),
      color
    });
    const particleCount = Math.min(64, Math.max(5, Math.floor(18 * visualIntensity)));
    const speedMult = Math.min(2.35, 0.72 + Math.sqrt(visualIntensity) * 0.52);
    const sizeMult = Math.min(1.7, 0.72 + Math.sqrt(visualIntensity) * 0.38);

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.62 - 0.31);
      const speed = (1.6 + Math.random() * 4.2) * speedMult;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = (2 + Math.random() * 3) * sizeMult;
      const lifetime = 22 + Math.random() * 34;

      if (!this.spawnParticle(x, y, vx, vy, color, size, lifetime)) {
        break;
      }
    }
    markMayhemPerformanceEvent('gameplay.particle_burst', {
      type: 'explosion',
      requestedParticles: particleCount,
      activeParticles: this.particles.length,
      intensity: visualIntensity
    });
    if (startedAt > 0) {
      recordMayhemPerformanceDuration('vfx.particle_burst_creation', performance.now() - startedAt);
    }
  }

  async prewarmEnergyBlooms(count = this.maxEnergyBlooms) {
    const target = Math.max(0, Math.min(this.maxEnergyBlooms, Math.floor(Number(count) || 0)));
    await GameAssets.ensurePlasmaBloomTextures?.();
    const texture = GameAssets.getPlasmaBloomTexture?.(0);
    if (!GameAssets.isValidTexture(texture)) return 0;
    const existing = this.energyBloomPool.length + this.energyBlooms.length;
    for (let index = existing; index < target; index += 1) {
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      sprite.blendMode = 'add';
      this.container.addChild(sprite);
      this.energyBloomPool.push(sprite);
    }
    return this.energyBloomPool.length;
  }

  createRadialBurst(x, y, color, options = {}) {
    const count = Math.max(1, Math.floor(options.count ?? 24));
    const intensity = Math.max(0.1, Number(options.intensity) || 1);
    const minSpeed = Math.max(0, Number(options.minSpeed) || 1.4);
    const maxSpeed = Math.max(minSpeed, Number(options.maxSpeed) || 4.2);
    const baseSize = Math.max(0.5, Number(options.size) || 2.4);
    const lifetime = Math.max(4, Number(options.lifetime) || 38);
    const angleOffset = Number(options.angleOffset) || Math.random() * Math.PI * 2;
    const arc = Math.max(0.05, Number(options.arc) || Math.PI * 2);
    const alternateColor = Number.isFinite(options.alternateColor) ? options.alternateColor : null;
    const upwardBias = Number(options.upwardBias) || 0;

    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / count;
      const jitter = (Math.random() - 0.5) * (options.jitter ?? 0.22);
      const angle = angleOffset + t * arc + jitter;
      const speed = (minSpeed + Math.random() * (maxSpeed - minSpeed)) * intensity;
      const size = baseSize * (0.75 + Math.random() * 0.7) * intensity;
      const life = lifetime * (0.75 + Math.random() * 0.65);
      const particleColor = alternateColor !== null && i % 3 === 1 ? alternateColor : color;
      if (!this.spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - upwardBias,
        particleColor,
        size,
        life
      )) {
        break;
      }
    }
  }

  createBossEntranceBurst(x, y, color, accent = 0xffffff) {
    this.createRadialBurst(x, y, color, {
      count: 38,
      intensity: 1.05,
      minSpeed: 1.8,
      maxSpeed: 5.4,
      size: 2.9,
      lifetime: 48,
      alternateColor: accent
    });
    this.createRadialBurst(x, y + 18, accent, {
      count: 22,
      intensity: 0.82,
      minSpeed: 0.8,
      maxSpeed: 2.6,
      size: 2,
      lifetime: 54,
      arc: Math.PI,
      angleOffset: Math.PI,
      upwardBias: 0.8,
      alternateColor: 0xffffff
    });
  }

  createBossChargeSparks(x, y, color, intensity = 1) {
    const count = Math.max(5, Math.floor(9 * Math.max(0.5, intensity)));
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 42 * Math.max(0.65, intensity);
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance * 0.7;
      const speed = 0.6 + Math.random() * 1.6;
      this.spawnParticle(
        px,
        py,
        -Math.cos(angle) * speed,
        -Math.sin(angle) * speed * 0.6,
        i % 3 === 0 ? 0xffffff : color,
        1.4 + Math.random() * 2.2,
        16 + Math.random() * 18
      );
    }
  }

  // Massive explosion for boss deaths
  createBossExplosion(x, y, color) {
    const primaryVariant = this.resolveEnergyBloomVariant(color, null, GameAssets.getPlasmaBloomTextures?.().length);
    const secondaryVariant = (primaryVariant + 1 + Math.floor(Math.random() * 2)) % Math.max(1, GameAssets.getPlasmaBloomTextures?.().length || 1);
    this.createEnergyBloom(x, y, 2.8, {
      size: 310,
      lifetime: 76,
      alpha: 0.82,
      aspect: 1.12,
      color,
      variant: primaryVariant
    });
    this.createEnergyBloom(x - 16, y + 8, 1.9, {
      size: 220,
      lifetime: 64,
      alpha: 0.52,
      aspect: 0.78,
      color,
      variant: secondaryVariant,
      rotation: Math.random() * Math.PI * 2
    });
    this.createRadialBurst(x, y, color, {
      count: 52,
      intensity: 1.45,
      minSpeed: 2.2,
      maxSpeed: 7.8,
      size: 2.8,
      lifetime: 54,
      jitter: 0.34,
      alternateColor: 0xffffff
    });
    this.createRadialBurst(x, y, color, {
      count: 28,
      intensity: 0.88,
      minSpeed: 0.65,
      maxSpeed: 2.6,
      size: 3.7,
      lifetime: 82,
      angleOffset: Math.PI / 28,
      jitter: 0.42,
      alternateColor: 0xfff4b0
    });
  }

  createLayeredBossExplosion(x, y, color, accent = 0xffffff, intensity = 1) {
    const scale = Math.max(0.75, Number(intensity) || 1);
    this.createBossExplosion(x, y, color);
    this.createRadialBurst(x, y, accent, {
      count: Math.floor(34 * scale),
      intensity: 1.25 * scale,
      minSpeed: 2.4,
      maxSpeed: 7.2,
      size: 2.2,
      lifetime: 52,
      alternateColor: 0xffffff
    });
    this.createRadialBurst(x, y, color, {
      count: Math.floor(28 * scale),
      intensity: 0.92 * scale,
      minSpeed: 0.7,
      maxSpeed: 2.4,
      size: 4.2,
      lifetime: 76,
      alternateColor: accent
    });
  }

  // Muzzle flash burst
  createMuzzleFlash(x, y, angle, color = 0xffff00) {
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const spread = 0.3;
      const particleAngle = angle + (Math.random() - 0.5) * spread;
      const speed = 3 + Math.random() * 2;
      const vx = Math.cos(particleAngle) * speed;
      const vy = Math.sin(particleAngle) * speed;
      const size = 2 + Math.random();
      const lifetime = 8 + Math.random() * 8;
      this.spawnParticle(x, y, vx, vy, color, size, lifetime);
    }
  }

  createHitSpark(x, y, color = 0xffff00, intensity = 1) {
    const particleCount = Math.max(3, Math.floor(5 * Math.max(0.6, intensity)));
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1 + Math.random() * 2) * Math.max(0.75, intensity);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = (1 + Math.random() * 2) * Math.max(0.75, intensity);
      const lifetime = 15 + Math.random() * 15;

      if (!this.spawnParticle(x, y, vx, vy, color, size, lifetime)) {
        break;
      }
    }
  }

  createNearMissEffect(x, y, streak = 1) {
    const count = Math.min(18, 6 + Math.max(0, streak) * 3);
    const color = streak >= 4 ? 0xff66ff : 0xffcc00;
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const angle = -Math.PI / 2 + side * (0.45 + Math.random() * 0.65);
      const speed = 2.4 + Math.random() * 3.8 + Math.min(3, streak) * 0.35;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 1.4 + Math.random() * 2.4;
      const lifetime = 18 + Math.random() * 18;

      if (!this.spawnParticle(x + side * 18, y + 4, vx, vy, color, size, lifetime)) {
        break;
      }
    }

    const ringCount = Math.min(12, 4 + Math.max(0, streak));
    for (let i = 0; i < ringCount; i++) {
      const angle = (Math.PI * 2 * i) / ringCount;
      const speed = 1.2 + Math.random() * 1.4;
      this.spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0xffffff,
        1 + Math.random() * 1.5,
        14 + Math.random() * 14
      );
    }
  }

  createPickupEffect(x, y, color) {
    // Enhanced powerup collection burst
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 3; // Strong upward bias
      const size = 3 + Math.random() * 3;
      const lifetime = 50 + Math.random() * 30;

      if (!this.spawnParticle(x, y, vx, vy, color, size, lifetime)) {
        break;
      }
    }

    // Add sparkle particles
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random();
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 1;
      const size = 1 + Math.random();
      const lifetime = 30 + Math.random() * 20;
      this.spawnParticle(x, y, vx, vy, 0xffffff, size, lifetime);
    }
  }

  createTrail(x, y, color) {
    this.spawnParticle(x, y, 0, 0, color, 2, 20);
  }

  update(delta) {
    for (let index = this.energyBlooms.length - 1; index >= 0; index -= 1) {
      const bloom = this.energyBlooms[index];
      bloom.age += delta;
      const t = Math.min(1, bloom.age / bloom.lifetime);
      const intro = Math.min(1, t / 0.11);
      const expansion = 0.24 + intro * 0.74 + Math.pow(t, 0.72) * 0.9;
      bloom.sprite.scale.set(
        bloom.baseScale * expansion * bloom.aspect,
        bloom.baseScale * expansion / bloom.aspect
      );
      bloom.sprite.alpha = bloom.alpha * intro * Math.pow(1 - t, 1.08);
      bloom.sprite.rotation += bloom.rotationSpeed * delta;
      if (t >= 1) {
        bloom.sprite.visible = false;
        this.energyBloomPool.push(bloom.sprite);
        this.energyBlooms.splice(index, 1);
      }
    }

    const softBudget = Math.max(0, Math.floor(Number(this.softParticleBudget) || 0));
    const overflow = softBudget > 0 ? Math.max(0, this.particles.length - softBudget) : 0;
    const trimTarget = overflow > 0 ? Math.min(overflow, Math.ceil(this.particles.length * 0.18)) : 0;
    let trimmed = 0;
    if (trimTarget > 0) {
      for (const particle of this.particles) {
        if (trimmed >= trimTarget) break;
        const lifetime = Math.max(1, Number(particle?.lifetime) || 1);
        const lifePercent = Math.max(0, Math.min(1, (Number(particle?.age) || 0) / lifetime));
        if (lifePercent < 0.42) continue;
        this.retireParticle(particle);
        trimmed += 1;
      }
      for (const particle of this.particles) {
        if (trimmed >= trimTarget) break;
        if (!particle?.active || particle?.isDebris) continue;
        this.retireParticle(particle);
        trimmed += 1;
      }
    }
    this.lastPressureTrimCount = trimmed;

    let writeIndex = 0;
    for (const particle of this.particles) {
      if (!particle.active) {
        this.pool.push(particle);
        continue;
      }
      particle.update(delta);
      if (!particle.active) {
        this.pool.push(particle);
        continue;
      }
      this.particles[writeIndex] = particle;
      writeIndex += 1;
    }
    this.particles.length = writeIndex;
  }
}
