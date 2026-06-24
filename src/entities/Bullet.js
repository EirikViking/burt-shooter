import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { getColorAssistEnabled } from '../config/AccessibilitySettings.js';

export class Bullet {
  constructor(x, y, vx, vy, damage, color, isPlayer, visualConfig = null) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.isPlayer = isPlayer;
    this.active = true;
    this.radius = isPlayer ? 7 : 5;
    // Store screen bounds (will be updated dynamically)
    this.screenWidth = 800;
    this.screenHeight = 600;

    // Pulse effect for enemy bullets
    this.pulseTimer = 0;
    this.age = 0;
    this.ageMs = 0;
    this.behaviorPhase = Math.random() * Math.PI * 2;

    this.sprite = new PIXI.Container();
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.zIndex = isPlayer ? 100 : 90;
    this.angle = Math.atan2(vy, vx);
    this.speed = Math.sqrt(vx * vx + vy * vy);
    this.trail = null;
    this.warningRing = null;
    this.core = null;
    this.visualConfig = visualConfig || {};
    this.coreAnimationStyle = !isPlayer ? (this.visualConfig.animationStyle || 'pulse') : 'none';
    this.coreAnimationRate = Number.isFinite(this.visualConfig.animationRate) ? this.visualConfig.animationRate : 1;
    this.coreAnimationAmp = Number.isFinite(this.visualConfig.animationAmp) ? this.visualConfig.animationAmp : 0.08;
    this.coreAlphaPulse = Number.isFinite(this.visualConfig.alphaPulse) ? this.visualConfig.alphaPulse : 0.08;
    this.weaponProfileId = this.visualConfig.weaponProfileId || null;
    this.weaponLabel = this.visualConfig.weaponLabel || null;
    this.sourceEnemyType = this.visualConfig.sourceEnemyType || null;
    this.sourceFireStyle = this.visualConfig.sourceFireStyle || null;
    this.threatActionId = this.visualConfig.threatActionId || null;
    this.threatActionKind = this.visualConfig.threatActionKind || null;
    this.splitAfterMs = Number.isFinite(this.visualConfig.splitAfterMs) ? this.visualConfig.splitAfterMs : null;
    this.maxLifetimeMs = Number.isFinite(this.visualConfig.maxLifetimeMs) ? this.visualConfig.maxLifetimeMs : null;
    this.releaseAfterMs = Number.isFinite(this.visualConfig.releaseAfterMs) ? this.visualConfig.releaseAfterMs : null;
    this.brakeMs = Number.isFinite(this.visualConfig.brakeMs) ? this.visualConfig.brakeMs : null;
    this.dashSpeed = Number.isFinite(this.visualConfig.dashSpeed) ? this.visualConfig.dashSpeed : null;
    this.orbitHost = this.visualConfig.orbitHost || null;
    this.orbitCenter = this.visualConfig.orbitCenter || null;
    this.orbitRadius = Number.isFinite(this.visualConfig.orbitRadius) ? this.visualConfig.orbitRadius : 34;
    this.orbitSpeed = Number.isFinite(this.visualConfig.orbitSpeed) ? this.visualConfig.orbitSpeed : 0.12;
    this.orbitAngle = Number.isFinite(this.visualConfig.orbitAngle) ? this.visualConfig.orbitAngle : this.angle;
    this.releaseAngle = Number.isFinite(this.visualConfig.releaseAngle) ? this.visualConfig.releaseAngle : this.angle;
    this.threatSplitTriggered = false;
    this.threatReleaseTriggered = false;
    this.baseAngle = this.angle;
    this.baseScale = 1;
    this.wobble = !isPlayer ? (this.visualConfig.wobble || 0) : 0;
    this.spin = !isPlayer ? (this.visualConfig.spin || 0) : 0;
    this.accel = !isPlayer ? (this.visualConfig.accel || 0) : 0;
    this.behavior = !isPlayer ? (this.visualConfig.behavior || 'straight') : 'straight';
    this.behaviorStrength = !isPlayer ? (this.visualConfig.behaviorStrength || 0) : 0;
    this.behaviorFrequency = !isPlayer ? (this.visualConfig.behaviorFrequency || 0.15) : 0.15;
    if (!isPlayer && Number.isFinite(this.visualConfig.radius)) {
      this.radius = this.visualConfig.radius;
    }
    if (!isPlayer && Number.isFinite(this.visualConfig.damageMult)) {
      this.damage *= this.visualConfig.damageMult;
    }

    // Try Sprite First
    if (this.visualConfig) {
      const generatedTex = Number.isFinite(this.visualConfig.assetIndex)
        ? GameAssets.getEnemyWeaponTexture(this.visualConfig.assetIndex)
        : null;
      const tex = generatedTex || (() => {
        const c = this.visualConfig.color;
        const idx = this.visualConfig.index;
        return c && idx ? GameAssets.getXtraLaser(c, idx) : null;
      })();
      if (GameAssets.isValidTexture(tex)) {
        this.core = new PIXI.Sprite(tex);
        this.core.anchor.set(0.5);
        this.core.rotation = generatedTex ? this.angle : this.angle + Math.PI / 2;
        const spriteScale = this.visualConfig.spriteScale || (isPlayer ? 0.8 : 0.72);
        this.baseScale = spriteScale;
        this.core.scale.set(spriteScale);
        this.core.__novaProjectileSprite = true;
        this.core.label = this.weaponProfileId
          ? `projectile_core:${this.weaponProfileId}`
          : 'projectile_core';
      }
    }

    // Fallback to Graphics
    if (!this.core) {
      this.core = new PIXI.Graphics();

      if (!isPlayer) {
        const warningRad = this.radius;
        this.core.circle(0, 0, warningRad + 3);
        this.core.fill({ color: 0xff0000, alpha: 0.18 });
        this.core.circle(0, 0, warningRad);
        this.core.fill({ color: this.color, alpha: 1 });
        this.core.circle(0, 0, warningRad * 0.6);
        this.core.fill({ color: 0xffffff, alpha: 0.9 });
      } else {
        // Player bullets: original style
        // Draw glow first (behind)
        this.core.circle(0, 0, this.radius + 3);
        this.core.fill({ color: this.color, alpha: 0.4 });
        // Draw main bullet (on top)
        this.core.circle(0, 0, this.radius);
        this.core.fill({ color: this.color, alpha: 1 });
        // Add bright center
        this.core.circle(0, 0, this.radius * 0.5);
        this.core.fill({ color: 0xffffff, alpha: 0.8 });
      }
    }

    this.createReadableProjectileShell();
  }

  createReadableProjectileShell() {
    const colorAssist = getColorAssistEnabled();
    const generatedProjectileCore = !this.isPlayer && Boolean(this.core?.__novaProjectileSprite);
    const drawProjectileFrame = !generatedProjectileCore || colorAssist || this.visualConfig.forceProjectileFrame === true;
    const trailColor = colorAssist
      ? (this.isPlayer ? 0xfff45c : 0xffffff)
      : (this.isPlayer ? this.color : (this.visualConfig.trailColor || 0xff6655));
    const trailLength = this.visualConfig.trailLength || Math.max(this.isPlayer ? 18 : 18, Math.min(this.isPlayer ? 34 : 34, this.speed * (this.isPlayer ? 5 : 5.5)));
    const trailWidth = this.visualConfig.trailWidth || (colorAssist ? (this.isPlayer ? 4 : 7) : (this.isPlayer ? 3 : 5));
    const backX = -Math.cos(this.angle) * trailLength;
    const backY = -Math.sin(this.angle) * trailLength;

    this.trail = new PIXI.Graphics();
    this.trail.moveTo(backX, backY);
    this.trail.lineTo(0, 0);
    this.trail.stroke({ color: trailColor, width: trailWidth, alpha: this.isPlayer ? 0.32 : 0.46 });
    if (!this.isPlayer && this.visualConfig.haloColor) {
      this.trail.moveTo(backX * 0.72, backY * 0.72);
      this.trail.lineTo(Math.cos(this.angle) * 4, Math.sin(this.angle) * 4);
      this.trail.stroke({ color: this.visualConfig.haloColor, width: trailWidth + 4, alpha: 0.1 });
    }
    this.sprite.addChild(this.trail);

    if (!this.isPlayer) {
      if (drawProjectileFrame) {
        this.warningRing = new PIXI.Graphics();
        this.warningRing.circle(0, 0, this.radius + (colorAssist ? 8 : 5));
        this.warningRing.stroke({ color: colorAssist ? 0xffffff : (this.visualConfig.warningColor || 0xff2f2f), width: colorAssist ? 3 : 2, alpha: colorAssist ? 0.9 : 0.75 });
        this.sprite.addChild(this.warningRing);
      }
      if (this.visualConfig.haloColor && (!generatedProjectileCore || colorAssist || this.visualConfig.forceProjectileHalo === true)) {
        const halo = new PIXI.Graphics();
        halo.circle(0, 0, this.radius + 9);
        halo.fill({ color: this.visualConfig.haloColor, alpha: 0.1 });
        this.sprite.addChildAt(halo, 0);
        this.halo = halo;
      }
      if (colorAssist) {
        const cross = new PIXI.Graphics();
        const r = this.radius + 12;
        cross.moveTo(-r, 0);
        cross.lineTo(r, 0);
        cross.moveTo(0, -r);
        cross.lineTo(0, r);
        cross.stroke({ color: 0x10131c, width: 2, alpha: 0.82 });
        this.sprite.addChild(cross);
      } else if (drawProjectileFrame) {
        const hazardMark = new PIXI.Graphics();
        const r = this.radius + 8;
        hazardMark.moveTo(-r, -r * 0.58);
        hazardMark.lineTo(-r * 0.58, -r);
        hazardMark.moveTo(r, -r * 0.58);
        hazardMark.lineTo(r * 0.58, -r);
        hazardMark.moveTo(-r, r * 0.58);
        hazardMark.lineTo(-r * 0.58, r);
        hazardMark.moveTo(r, r * 0.58);
        hazardMark.lineTo(r * 0.58, r);
        hazardMark.stroke({ color: this.visualConfig.warningColor || 0xff3030, width: 2.2, alpha: 0.86 });
        hazardMark.circle(0, 0, Math.max(1.5, this.radius * 0.22));
        hazardMark.fill({ color: 0xff3030, alpha: 0.74 });
        hazardMark.__novaHazardReadabilityMark = true;
        this.sprite.addChild(hazardMark);
      }
    }

    this.sprite.addChild(this.core);
  }

  setScreenBounds(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  update(delta) {
    if (!this.active) return;

    this.age += delta;
    this.ageMs += delta * 16.67;
    if (!this.isPlayer) this.applyEnemyWeaponBehavior(delta);

    this.x += this.vx * delta;
    this.y += this.vy * delta;
    if (this.accel) {
      const accelStep = 1 + this.accel * delta;
      this.vx *= accelStep;
      this.vy *= accelStep;
    }
    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.angle = Math.atan2(this.vy, this.vx);

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Pulse effect for enemy bullets (more visible)
    if (!this.isPlayer) {
      this.pulseTimer += delta * 0.1;
      const pulseRate = this.visualConfig.pulseRate || 1;
      const pulseScale = 1 + Math.sin(this.pulseTimer * pulseRate) * 0.1;
      this.sprite.scale.set(pulseScale);
      this.sprite.alpha = 0.9 + Math.sin(this.pulseTimer * 2 * pulseRate) * 0.1;
      if (this.spin && this.core) {
        this.core.rotation += this.spin * delta;
      }
      this.updateEnemyProjectileAnimation(delta);
      if (this.wobble) {
        const wobbleAngle = this.baseAngle + Math.sin(this.pulseTimer * 2.6) * this.wobble;
        this.sprite.rotation = (this.angle - this.baseAngle) + (wobbleAngle - this.baseAngle);
      } else {
        this.sprite.rotation = this.angle - this.baseAngle;
      }
      if (this.warningRing) {
        const warningPulse = 1.1 + Math.sin(this.pulseTimer * 1.7 * pulseRate) * 0.16;
        this.warningRing.scale.set(warningPulse);
        this.warningRing.alpha = 0.58 + Math.sin(this.pulseTimer * 2.2) * 0.22;
      }
    }

    this.handleTimedThreatBehavior();

    // Deactivate if off-screen (use dynamic bounds with padding)
    const padding = 30;
    if (
      this.y < -padding ||
      this.y > this.screenHeight + padding ||
      this.x < -padding ||
      this.x > this.screenWidth + padding
    ) {
      this.active = false;
    }
  }

  updateEnemyProjectileAnimation(delta) {
    if (this.isPlayer || !this.core?.__novaProjectileSprite) return;
    const phase = this.pulseTimer * (this.coreAnimationRate || 1);
    const wave = Math.sin(phase * 2.4);
    const wave2 = Math.cos(phase * 1.7 + this.behaviorPhase * 0.4);
    const amp = Math.max(0, Math.min(0.16, this.coreAnimationAmp || 0));
    const alphaPulse = Math.max(0, Math.min(0.22, this.coreAlphaPulse || 0));
    const base = this.baseScale || 1;
    let sx = base;
    let sy = base;
    let alpha = 1 - alphaPulse * 0.35 + Math.max(0, wave) * alphaPulse;

    switch (this.coreAnimationStyle) {
      case 'needle':
        sx = base * (1 + amp * 0.65 * Math.max(0, wave));
        sy = base * (1 - amp * 0.42 * Math.max(0, wave2));
        alpha = 0.9 + Math.max(0, wave) * alphaPulse;
        break;
      case 'orb':
        sx = base * (1 + amp * wave);
        sy = base * (1 + amp * wave);
        alpha = 0.88 + Math.max(0, wave2) * alphaPulse;
        break;
      case 'fireball':
        sx = base * (1 + amp * 0.8 * wave);
        sy = base * (1 + amp * 0.55 * wave2);
        alpha = 0.92 + Math.max(0, Math.sin(phase * 3.2)) * alphaPulse;
        break;
      case 'shard':
        sx = base * (1 + amp * 0.45 * wave);
        sy = base * (1 - amp * 0.35 * wave);
        alpha = 0.9 + Math.max(0, wave2) * alphaPulse;
        break;
      case 'boss':
        sx = base * (1 + amp * 0.72 * wave);
        sy = base * (1 + amp * 0.28 * wave2);
        alpha = 0.9 + Math.max(0, wave) * alphaPulse;
        this.core.rotation += Math.sin(phase) * 0.002 * delta;
        break;
      case 'marker':
        sx = base * (1 + amp * 0.5 * Math.max(0, wave));
        sy = base * (1 + amp * 0.5 * Math.max(0, wave));
        alpha = 0.86 + Math.max(0, wave) * alphaPulse;
        break;
      case 'pulse':
      default:
        sx = base * (1 + amp * 0.5 * wave);
        sy = base * (1 + amp * 0.5 * wave);
        break;
    }

    this.core.scale.set(Math.max(0.01, sx), Math.max(0.01, sy));
    this.core.alpha = Math.max(0.72, Math.min(1, alpha));
  }

  handleTimedThreatBehavior() {
    if (this.isPlayer || !this.active) return;
    if (this.maxLifetimeMs && this.ageMs >= this.maxLifetimeMs) {
      this.active = false;
      return;
    }
    if (this.splitAfterMs && !this.threatSplitTriggered && this.ageMs >= this.splitAfterMs) {
      this.threatSplitTriggered = true;
      if (typeof this.visualConfig.onThreatSplit === 'function') {
        this.visualConfig.onThreatSplit(this);
      }
      if (this.visualConfig.deactivateOnSplit !== false) {
        this.active = false;
      }
    }
  }

  rotateVelocity(radians) {
    if (!radians) return;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const vx = this.vx * cos - this.vy * sin;
    const vy = this.vx * sin + this.vy * cos;
    this.vx = vx;
    this.vy = vy;
  }

  applyPerpendicularForce(amount) {
    if (!amount) return;
    const speed = Math.max(0.0001, Math.sqrt(this.vx * this.vx + this.vy * this.vy));
    const nx = -this.vy / speed;
    const ny = this.vx / speed;
    this.vx += nx * amount;
    this.vy += ny * amount;
  }

  applyEnemyWeaponBehavior(delta) {
    const strength = this.behaviorStrength || 0;
    const phase = this.behaviorPhase + this.age * (this.behaviorFrequency || 0.15);
    switch (this.behavior) {
      case 'drag': {
        const drag = Math.max(0.965, 1 - strength * delta);
        this.vx *= drag;
        this.vy *= drag;
        break;
      }
      case 'accelerate':
        this.vx *= 1 + strength * delta;
        this.vy *= 1 + strength * delta;
        break;
      case 'arc_left':
        this.rotateVelocity(-strength * delta);
        break;
      case 'seed_sway':
        this.applyPerpendicularForce(Math.sin(phase) * strength * delta);
        break;
      case 'mine_drift':
        this.rotateVelocity(Math.sin(phase * 0.8) * strength * delta);
        this.vx *= 0.999;
        this.vy *= 0.999;
        break;
      case 'lance_blink':
        this.vx *= 1 + 0.0008 * delta;
        this.vy *= 1 + 0.0008 * delta;
        if (this.core) this.core.alpha = 0.78 + Math.max(0, Math.sin(phase * 2.2)) * 0.22;
        break;
      case 'slug_drop':
        this.vy += strength * delta;
        break;
      case 'fork_zig':
        this.applyPerpendicularForce(Math.sign(Math.sin(phase)) * strength * delta);
        break;
      case 'spiral_curve':
        this.rotateVelocity(Math.sin(phase) * strength * delta);
        break;
      case 'saw_orbit':
        this.rotateVelocity(strength * delta * (Math.sin(phase) > 0 ? 1 : -0.65));
        break;
      case 'spear_track':
        this.rotateVelocity(Math.sin(phase * 0.55) * strength * delta);
        break;
      case 'split_after_ms':
        this.applyPerpendicularForce(Math.sin(phase * 0.8) * 0.035 * delta);
        this.vx *= 0.997;
        this.vy *= 0.997;
        break;
      case 'mine_arming':
        this.vx *= 0.988;
        this.vy *= 0.992;
        if (this.core) this.core.alpha = 0.72 + Math.max(0, Math.sin(phase * 2.4)) * 0.28;
        break;
      case 'brake_then_accelerate':
        if (!this.threatReleaseTriggered && this.brakeMs && this.ageMs < this.brakeMs) {
          this.vx *= 0.9;
          this.vy *= 0.9;
          if (this.core) this.core.alpha = 0.58 + Math.max(0, Math.sin(phase * 3)) * 0.42;
        } else if (!this.threatReleaseTriggered) {
          this.threatReleaseTriggered = true;
          const angle = this.releaseAngle || this.baseAngle || Math.atan2(this.vy, this.vx);
          const speed = this.dashSpeed || Math.max(3.2, this.speed * 2.4);
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
        }
        break;
      case 'boomerang_arc': {
        const sign = this.visualConfig.arcSign || 1;
        const curve = this.ageMs < (this.visualConfig.arcReverseMs || 650) ? sign : -sign * 0.55;
        this.rotateVelocity(curve * (this.visualConfig.arcStrength || 0.006) * delta);
        break;
      }
      case 'orbit_then_release': {
        if (this.releaseAfterMs && this.ageMs < this.releaseAfterMs) {
          const host = this.orbitHost?.active !== false ? this.orbitHost : null;
          const centerX = host?.x ?? this.orbitCenter?.x ?? this.x;
          const centerY = host?.y ?? this.orbitCenter?.y ?? this.y;
          this.orbitAngle += this.orbitSpeed * delta;
          this.x = centerX + Math.cos(this.orbitAngle) * this.orbitRadius;
          this.y = centerY + Math.sin(this.orbitAngle) * this.orbitRadius;
          this.vx = 0;
          this.vy = 0;
        } else if (!this.threatReleaseTriggered) {
          this.threatReleaseTriggered = true;
          const angle = this.releaseAngle || this.orbitAngle || this.baseAngle;
          const speed = this.visualConfig.releaseSpeed || 2.45;
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
        }
        break;
      }
      default:
        break;
    }
  }
}
