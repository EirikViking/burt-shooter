import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { getColorAssistEnabled } from '../config/AccessibilitySettings.js';

const GENERATED_PROJECTILE_UNFRAMED_SCALE_MULT = 1.32;

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
    this.dangerGlint = null;
    this.friendlyGlint = null;
    this.friendlyWingTrace = null;
    this.playerIntentLayer = null;
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
        const scaleBoost = !isPlayer && generatedTex && !getColorAssistEnabled() && this.visualConfig.forceProjectileFrame !== true
          ? (Number.isFinite(this.visualConfig.unframedScaleBoost)
            ? this.visualConfig.unframedScaleBoost
            : GENERATED_PROJECTILE_UNFRAMED_SCALE_MULT)
          : 1;
        this.baseScale = spriteScale * scaleBoost;
        this.core.scale.set(this.baseScale);
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

      const leadDistance = this.radius + (generatedProjectileCore ? 7 : 6);
      const leadX = Math.cos(this.angle) * leadDistance;
      const leadY = Math.sin(this.angle) * leadDistance;
      const normalX = -Math.sin(this.angle);
      const normalY = Math.cos(this.angle);
      this.dangerGlint = new PIXI.Graphics();
      this.dangerGlint.label = 'enemyProjectileDangerGlint';
      this.dangerGlint.__novaProjectileDangerGlint = true;
      this.dangerGlint.circle(leadX, leadY, colorAssist ? 3.4 : 2.5);
      this.dangerGlint.fill({ color: colorAssist ? 0xffffff : 0xfff3a1, alpha: colorAssist ? 0.94 : 0.88 });
      this.dangerGlint.moveTo(leadX - normalX * 4.5, leadY - normalY * 4.5);
      this.dangerGlint.lineTo(leadX + normalX * 4.5, leadY + normalY * 4.5);
      this.dangerGlint.stroke({ color: colorAssist ? 0x10131c : 0xffffff, width: colorAssist ? 1.8 : 1.4, alpha: colorAssist ? 0.86 : 0.44 });
      this.sprite.addChild(this.dangerGlint);
    } else {
      const leadDistance = this.radius + 7;
      const leadX = Math.cos(this.angle) * leadDistance;
      const leadY = Math.sin(this.angle) * leadDistance;
      const normalX = -Math.sin(this.angle);
      const normalY = Math.cos(this.angle);
      const backDistance = Math.max(10, this.radius + 5);
      const wingBackX = -Math.cos(this.angle) * backDistance;
      const wingBackY = -Math.sin(this.angle) * backDistance;

      this.friendlyWingTrace = new PIXI.Graphics();
      this.friendlyWingTrace.label = 'playerProjectileWingTrace';
      this.friendlyWingTrace.__novaPlayerProjectileWingTrace = true;
      this.friendlyWingTrace.moveTo(wingBackX + normalX * 5, wingBackY + normalY * 5);
      this.friendlyWingTrace.lineTo(-normalX * 2, -normalY * 2);
      this.friendlyWingTrace.moveTo(wingBackX - normalX * 5, wingBackY - normalY * 5);
      this.friendlyWingTrace.lineTo(normalX * 2, normalY * 2);
      this.friendlyWingTrace.stroke({ color: 0x9ff8ff, width: 1.6, alpha: 0.58 });
      this.sprite.addChild(this.friendlyWingTrace);

      this.friendlyGlint = new PIXI.Graphics();
      this.friendlyGlint.label = 'playerProjectileFriendlyGlint';
      this.friendlyGlint.__novaPlayerProjectileFriendlyGlint = true;
      this.friendlyGlint.circle(leadX, leadY, 2.7);
      this.friendlyGlint.fill({ color: 0xffffff, alpha: 0.88 });
      this.friendlyGlint.moveTo(leadX - normalX * 4, leadY - normalY * 4);
      this.friendlyGlint.lineTo(leadX + normalX * 4, leadY + normalY * 4);
      this.friendlyGlint.stroke({ color: 0x9ff8ff, width: 1.2, alpha: 0.66 });
      this.sprite.addChild(this.friendlyGlint);
      this.playerIntentLayer = new PIXI.Graphics();
      this.playerIntentLayer.label = 'playerProjectileIntentMarkers';
      this.playerIntentLayer.__novaPlayerProjectileIntentMarkers = true;
      this.playerIntentLayer.blendMode = 'add';
      this.playerIntentLayer.visible = false;
      this.sprite.addChild(this.playerIntentLayer);
    }

    this.sprite.addChild(this.core);
    this.refreshPlayerProjectileIntentMarkers();
    this.sprite._debugProjectileReadability = {
      isPlayer: this.isPlayer,
      friendlyGlint: Boolean(this.friendlyGlint),
      friendlyWingTrace: Boolean(this.friendlyWingTrace),
      playerIntentMarkers: Boolean(this.playerIntentLayer),
      playerIntentActive: Boolean(this.playerIntentLayer?._debugIntentMarkers?.active),
      dangerGlint: Boolean(this.dangerGlint),
      trailLength: Number(trailLength.toFixed?.(2) || trailLength),
      trailWidth
    };
  }

  refreshPlayerProjectileIntentMarkers() {
    if (!this.isPlayer || !this.playerIntentLayer) return;
    const layer = this.playerIntentLayer;
    layer.clear();
    const intents = {
      bomb: Boolean(this.isBomb || this.powerupType === 'bomb'),
      critical: Boolean(this.isTraitCriticalShot),
      piercing: Boolean(this.isTraitPiercingShot || this.piercing),
      wing: Boolean(this.isTraitWingShot),
      bonus: Boolean(this.isTraitBonusShot),
      plasma: Boolean(this.isPlasmaLance || this.powerupType === 'plasma_lance')
    };
    const activeKeys = Object.entries(intents).filter(([, active]) => active).map(([key]) => key);
    if (!activeKeys.length) {
      layer.visible = false;
      layer._debugIntentMarkers = {
        active: false,
        intents,
        markerCount: 0
      };
      if (this.sprite?._debugProjectileReadability) {
        this.sprite._debugProjectileReadability.playerIntentActive = false;
        this.sprite._debugProjectileReadability.intentMarkers = layer._debugIntentMarkers;
      }
      return;
    }

    const angle = this.angle;
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const normalX = -Math.sin(angle);
    const normalY = Math.cos(angle);
    const radius = Math.max(5, Number(this.radius) || 7);
    let markerCount = 0;
    const primary = intents.bomb ? 0xffaa00
      : intents.critical ? 0xfff45c
        : intents.piercing ? 0xffffff
          : intents.wing ? 0x66ffff
            : intents.bonus ? 0x7dffcc
              : 0x9ff8ff;
    const accent = intents.bomb ? 0xffef7e
      : intents.critical ? 0xffffff
        : intents.piercing ? 0x9ff8ff
          : intents.wing ? 0xffffff
            : intents.bonus ? 0xffef7e
              : 0xffffff;

    if (intents.bomb) {
      const ring = radius + 8;
      layer.circle(0, 0, ring);
      layer.stroke({ color: primary, width: 2.4, alpha: 0.82 });
      layer.moveTo(0, -ring - 2);
      layer.lineTo(ring + 2, 0);
      layer.lineTo(0, ring + 2);
      layer.lineTo(-ring - 2, 0);
      layer.lineTo(0, -ring - 2);
      layer.stroke({ color: accent, width: 1.3, alpha: 0.46 });
      markerCount += 2;
    }

    if (intents.critical) {
      const r = radius + 9;
      for (let i = 0; i < 4; i += 1) {
        const a = angle + i * Math.PI * 0.5;
        layer.moveTo(Math.cos(a) * (r * 0.48), Math.sin(a) * (r * 0.48));
        layer.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      layer.stroke({ color: primary, width: 1.8, alpha: 0.82 });
      markerCount += 4;
    }

    if (intents.piercing || intents.plasma) {
      const nose = radius + (intents.plasma ? 15 : 10);
      const tail = -radius - 8;
      layer.moveTo(forwardX * tail, forwardY * tail);
      layer.lineTo(forwardX * nose, forwardY * nose);
      layer.stroke({ color: accent, width: intents.plasma ? 2.5 : 1.6, alpha: intents.plasma ? 0.74 : 0.62 });
      [-1, 1].forEach((side) => {
        layer.moveTo(forwardX * (tail * 0.35) + normalX * side * 5, forwardY * (tail * 0.35) + normalY * side * 5);
        layer.lineTo(forwardX * (nose * 0.72) + normalX * side * 2, forwardY * (nose * 0.72) + normalY * side * 2);
      });
      layer.stroke({ color: primary, width: 1.1, alpha: 0.48 });
      markerCount += 3;
    }

    if (intents.wing) {
      [-1, 1].forEach((side) => {
        const x = normalX * side * (radius + 8);
        const y = normalY * side * (radius + 8);
        layer.circle(x, y, 2.8);
        layer.fill({ color: primary, alpha: 0.82 });
        layer.moveTo(x - forwardX * 7, y - forwardY * 7);
        layer.lineTo(x + forwardX * 4, y + forwardY * 4);
      });
      layer.stroke({ color: accent, width: 1.1, alpha: 0.5 });
      markerCount += 4;
    }

    if (intents.bonus) {
      for (let i = 0; i < 3; i += 1) {
        const a = angle + (i - 1) * 0.74 + Math.PI;
        layer.circle(Math.cos(a) * (radius + 6), Math.sin(a) * (radius + 6), 2);
        layer.fill({ color: i === 1 ? accent : primary, alpha: 0.74 });
      }
      markerCount += 3;
    }

    layer.visible = true;
    layer._debugIntentMarkers = {
      active: true,
      intents,
      activeKeys,
      markerCount,
      radius,
      primary
    };
    if (this.sprite?._debugProjectileReadability) {
      this.sprite._debugProjectileReadability.playerIntentActive = true;
      this.sprite._debugProjectileReadability.intentMarkers = layer._debugIntentMarkers;
    }
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

    this.pulseTimer += delta * 0.1;

    // Pulse effect for enemy bullets (more visible)
    if (!this.isPlayer) {
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
      if (this.dangerGlint) {
        const glintPulse = 1 + Math.sin(this.pulseTimer * 2.9 * pulseRate) * 0.18;
        this.dangerGlint.scale.set(glintPulse);
        this.dangerGlint.alpha = 0.72 + Math.sin(this.pulseTimer * 3.4 * pulseRate) * 0.2;
      }
    } else if (this.friendlyGlint) {
      const friendlyPulse = 1 + Math.sin(this.pulseTimer * 3.2) * 0.12;
      this.friendlyGlint.scale.set(friendlyPulse);
      this.friendlyGlint.alpha = 0.7 + Math.sin(this.pulseTimer * 3.6) * 0.16;
      if (this.friendlyWingTrace) {
        this.friendlyWingTrace.alpha = 0.5 + Math.sin(this.pulseTimer * 2.4) * 0.16;
      }
      if (this.playerIntentLayer?.visible) {
        const intentPulse = 1 + Math.sin(this.pulseTimer * 2.8) * 0.08;
        this.playerIntentLayer.scale.set(intentPulse);
        this.playerIntentLayer.alpha = 0.7 + Math.sin(this.pulseTimer * 3.1) * 0.18;
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
