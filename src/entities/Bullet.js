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
    this.sprite.label = isPlayer ? 'player_projectile_visual' : 'enemy_projectile_visual';
    this.sprite.__novaManagedProjectile = true;
    this.sprite.__novaProjectileKind = isPlayer ? 'player' : 'enemy';
    this.sprite.__novaProjectileOwner = this;
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.zIndex = isPlayer ? 100 : 90;
    this.angle = Math.atan2(vy, vx);
    this.speed = Math.sqrt(vx * vx + vy * vy);
    this.trail = null;
    this.warningRing = null;
    this.dangerGlint = null;
    this.dangerWakeBeads = null;
    this.enemySpectacleBack = null;
    this.enemySpectacleFront = null;
    this.threatArmingLayer = null;
    this.friendlyGlint = null;
    this.friendlyWingTrace = null;
    this.friendlySpeedRibbon = null;
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
        this.trail.circle(0, 0, this.radius + 9);
        this.trail.fill({ color: this.visualConfig.haloColor, alpha: 0.1 });
        this.trail.__novaProjectileHalo = true;
        this.halo = this.trail;
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
        const hazardMark = this.warningRing || new PIXI.Graphics();
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
        if (hazardMark !== this.warningRing) this.sprite.addChild(hazardMark);
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
      this.dangerGlint.__novaProjectileWakeBeads = true;
      const wakeColor = colorAssist ? 0xffffff : (this.visualConfig.warningColor || this.visualConfig.trailColor || 0xff6655);
      const beadCount = 3;
      this.dangerGlint.__novaProjectileWakeBeadCount = beadCount;
      for (let i = 0; i < beadCount; i += 1) {
        const distance = this.radius + 8 + i * 7;
        const x = -Math.cos(this.angle) * distance;
        const y = -Math.sin(this.angle) * distance;
        const beadRadius = colorAssist ? 2.6 - i * 0.24 : 2.15 - i * 0.22;
        this.dangerGlint.circle(x, y, Math.max(1.3, beadRadius));
        this.dangerGlint.fill({ color: wakeColor, alpha: Math.max(0.22, 0.48 - i * 0.1) });
      }
      this.dangerWakeBeads = this.dangerGlint;
      this.sprite.addChild(this.dangerGlint);

      this.createEnemyProjectileSpectacle({ colorAssist, trailLength, trailWidth });

      this.createThreatArmingCue();
    } else {
      const leadDistance = this.radius + 7;
      const forwardX = Math.cos(this.angle);
      const forwardY = Math.sin(this.angle);
      const leadX = forwardX * leadDistance;
      const leadY = forwardY * leadDistance;
      const normalX = -Math.sin(this.angle);
      const normalY = Math.cos(this.angle);
      const playerRadius = Math.max(5, Number(this.radius) || 7);
      const backDistance = Math.max(10, this.radius + 5);
      const wingBackX = -Math.cos(this.angle) * backDistance;
      const wingBackY = -Math.sin(this.angle) * backDistance;

      this.friendlyWingTrace = new PIXI.Graphics();
      this.friendlyWingTrace.label = 'playerProjectileWingTrace';
      this.friendlyWingTrace.__novaPlayerProjectileWingTrace = true;
      let friendlyWingTraceLaneCount = 0;
      let friendlyTailChevronCount = 0;
      let friendlyRibbonCount = 0;
      let friendlyBeadCount = 0;
      this.friendlyWingTrace.moveTo(wingBackX + normalX * 5, wingBackY + normalY * 5);
      this.friendlyWingTrace.lineTo(-normalX * 2, -normalY * 2);
      this.friendlyWingTrace.moveTo(wingBackX - normalX * 5, wingBackY - normalY * 5);
      this.friendlyWingTrace.lineTo(normalX * 2, normalY * 2);
      friendlyWingTraceLaneCount += 2;
      for (let i = 0; i < 3; i += 1) {
        const lane = i - 1;
        const start = backDistance + i * 5;
        const end = Math.max(3, backDistance * 0.25 + i * 2);
        this.friendlyWingTrace.moveTo(-forwardX * start + normalX * lane * 3.4, -forwardY * start + normalY * lane * 3.4);
        this.friendlyWingTrace.lineTo(-forwardX * end + normalX * lane * 1.2, -forwardY * end + normalY * lane * 1.2);
        friendlyWingTraceLaneCount += 1;
      }
      this.friendlyWingTrace.stroke({ color: 0x9ff8ff, width: 1.6, alpha: 0.58 });
      for (let i = 0; i < 2; i += 1) {
        const center = backDistance + 8 + i * 7;
        const wing = 3.5 + i;
        this.friendlyWingTrace.moveTo(-forwardX * center + normalX * wing, -forwardY * center + normalY * wing);
        this.friendlyWingTrace.lineTo(-forwardX * (center + 5), -forwardY * (center + 5));
        this.friendlyWingTrace.lineTo(-forwardX * center - normalX * wing, -forwardY * center - normalY * wing);
        friendlyTailChevronCount += 1;
      }
      this.friendlyWingTrace.stroke({ color: 0xffffff, width: 1, alpha: 0.34 });

      for (let i = 0; i < 2; i += 1) {
        const side = i === 0 ? -1 : 1;
        const start = -backDistance * 0.9;
        const mid = -backDistance * 0.28;
        this.friendlyWingTrace.moveTo(forwardX * start + normalX * side * 8, forwardY * start + normalY * side * 8);
        this.friendlyWingTrace.lineTo(forwardX * mid + normalX * side * 4, forwardY * mid + normalY * side * 4);
        this.friendlyWingTrace.lineTo(forwardX * (playerRadius * 0.3) + normalX * side * 6, forwardY * (playerRadius * 0.3) + normalY * side * 6);
        friendlyRibbonCount += 1;
      }
      this.friendlyWingTrace.stroke({ color: 0x66ffff, width: 1.05, alpha: 0.34 });
      for (let i = 0; i < 3; i += 1) {
        const beadDistance = -backDistance - 5 - i * 5.5;
        this.friendlyWingTrace.circle(forwardX * beadDistance, forwardY * beadDistance, Math.max(1.4, 2.3 - i * 0.3));
        friendlyBeadCount += 1;
      }
      this.friendlyWingTrace.fill({ color: 0xffffff, alpha: 0.28 });
      this.friendlyWingTrace.__novaPlayerProjectileWingTraceLaneCount = friendlyWingTraceLaneCount;
      this.friendlyWingTrace.__novaPlayerProjectileTailChevronCount = friendlyTailChevronCount;
      this.friendlyWingTrace.__novaPlayerProjectileRibbonCount = friendlyRibbonCount;
      this.friendlyWingTrace.__novaPlayerProjectileBeadCount = friendlyBeadCount;
      this.sprite.addChild(this.friendlyWingTrace);

      this.friendlyGlint = new PIXI.Graphics();
      this.friendlyGlint.label = 'playerProjectileFriendlyGlint';
      this.friendlyGlint.__novaPlayerProjectileFriendlyGlint = true;
      this.friendlyGlint.circle(leadX, leadY, 2.7);
      this.friendlyGlint.fill({ color: 0xffffff, alpha: 0.88 });
      this.friendlyGlint.moveTo(leadX - normalX * 4, leadY - normalY * 4);
      this.friendlyGlint.lineTo(leadX + normalX * 4, leadY + normalY * 4);
      this.friendlyGlint.stroke({ color: 0x9ff8ff, width: 1.2, alpha: 0.66 });
      this.friendlyGlint.moveTo(leadX - forwardX * 5, leadY - forwardY * 5);
      this.friendlyGlint.lineTo(leadX + forwardX * 6, leadY + forwardY * 6);
      this.friendlyGlint.stroke({ color: 0xffffff, width: 0.9, alpha: 0.42 });
      this.sprite.addChild(this.friendlyGlint);
    }

    this.sprite.addChild(this.core);
    this.refreshPlayerProjectileIntentMarkers();
    this.sprite._debugProjectileReadability = {
      isPlayer: this.isPlayer,
      friendlyGlint: Boolean(this.friendlyGlint),
      friendlyWingTrace: Boolean(this.friendlyWingTrace),
      friendlySpeedRibbon: Boolean(this.friendlyWingTrace),
      friendlyWingTraceLaneCount: this.friendlyWingTrace?.__novaPlayerProjectileWingTraceLaneCount || 0,
      friendlyTailChevronCount: this.friendlyWingTrace?.__novaPlayerProjectileTailChevronCount || 0,
      friendlyRibbonCount: this.friendlyWingTrace?.__novaPlayerProjectileRibbonCount || 0,
      friendlyBeadCount: this.friendlyWingTrace?.__novaPlayerProjectileBeadCount || 0,
      playerIntentMarkers: Boolean(this.playerIntentLayer),
      playerIntentActive: Boolean(this.playerIntentLayer?._debugIntentMarkers?.active),
      dangerGlint: Boolean(this.dangerGlint),
      dangerWakeBeadCount: this.dangerWakeBeads?.__novaProjectileWakeBeadCount || (this.dangerWakeBeads ? 3 : 0),
      enemySpectacle: Boolean(this.enemySpectacleBack && this.enemySpectacleFront),
      enemySpectacleStyle: this.enemySpectacleFront?._debugEnemyProjectileSpectacle?.style || null,
      enemySpectacleRenderMode: this.enemySpectacleFront?._debugEnemyProjectileSpectacle?.renderMode || null,
      enemySpectacleWakeEchoCount: this.enemySpectacleBack?._debugEnemyProjectileSpectacle?.wakeEchoCount || 0,
      enemySpectacleAuraEchoCount: this.enemySpectacleFront?._debugEnemyProjectileSpectacle?.auraEchoCount || 0,
      enemySpectacleSignatureEchoCount: this.enemySpectacleFront?._debugEnemyProjectileSpectacle?.signatureEchoCount || 0,
      threatArmingPipCount: this.threatArmingLayer?._debugThreatArming?.pipCount || 0,
      threatArmingKind: this.threatArmingLayer?._debugThreatArming?.kind || null,
      trailLength: Number(trailLength.toFixed?.(2) || trailLength),
      trailWidth
    };
  }

  createEnemyProjectileSpectacle({ colorAssist = false, trailLength = 32 } = {}) {
    if (this.isPlayer || !this.core?.__novaProjectileSprite || !this.core?.texture) return;

    const profileId = this.weaponProfileId || 'fallback_enemy_projectile';
    const style = this.coreAnimationStyle || 'pulse';
    const variant = Number.isFinite(this.visualConfig.assetIndex) ? this.visualConfig.assetIndex : 0;
    const primary = colorAssist ? 0xffffff : (this.visualConfig.trailColor || this.color || 0xff6655);
    const secondary = colorAssist ? 0xfff45c : (this.visualConfig.haloColor || this.visualConfig.warningColor || primary);
    const hot = colorAssist ? 0xffffff : (this.visualConfig.warningColor || 0xffffff);
    const radius = Math.max(4, Number(this.radius) || 5);
    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);
    const normalX = -Math.sin(this.angle);
    const normalY = Math.cos(this.angle);
    const baseScale = Math.max(0.01, Number(this.baseScale) || 1);

    let wakeEchoCount = 3;
    let wakeSpacing = Math.max(9, trailLength * 0.27);
    let wakeLateral = 2.5;
    let auraScale = 1.5;
    let flareRotation = 0.16;
    switch (profileId) {
      case 'amber_plasma_orb':
        wakeLateral = 5;
        auraScale = 1.72;
        flareRotation = Math.PI / 2;
        break;
      case 'cyan_rail_needle':
        wakeEchoCount = 4;
        wakeSpacing = Math.max(13, trailLength * 0.29);
        wakeLateral = 0.8;
        auraScale = 1.3;
        flareRotation = 0;
        break;
      case 'magenta_crescent':
        wakeLateral = 4;
        auraScale = 1.56;
        flareRotation = 0.34;
        break;
      case 'toxic_splinter_seed':
        wakeLateral = 5;
        auraScale = 1.42;
        flareRotation = -0.45;
        break;
      case 'violet_star_mine':
        wakeEchoCount = 2;
        wakeSpacing = 9;
        wakeLateral = 7;
        auraScale = 1.86;
        flareRotation = Math.PI / 4;
        break;
      case 'white_comet_lance':
        wakeEchoCount = 4;
        wakeSpacing = Math.max(14, trailLength * 0.3);
        wakeLateral = 0;
        auraScale = 1.48;
        flareRotation = 0;
        break;
      case 'orange_molten_slug':
        wakeLateral = 3;
        auraScale = 1.66;
        flareRotation = -0.18;
        break;
      case 'teal_fork_dart':
        wakeEchoCount = 4;
        wakeLateral = 5;
        auraScale = 1.42;
        flareRotation = 0.22;
        break;
      case 'pink_spiral_disruptor':
        wakeLateral = 6;
        auraScale = 1.58;
        flareRotation = 0.54;
        break;
      case 'lime_saw_disc':
        wakeEchoCount = 2;
        wakeSpacing = 9;
        wakeLateral = 4;
        auraScale = 1.72;
        flareRotation = 0.31;
        break;
      case 'purple_boss_spear':
        wakeEchoCount = 4;
        wakeSpacing = Math.max(12, trailLength * 0.28);
        wakeLateral = 3;
        auraScale = 1.82;
        flareRotation = 0;
        break;
      default:
        break;
    }

    const configureEcho = (sprite, {
      x = 0,
      y = 0,
      scale = baseScale,
      alpha = 0.2,
      tint = primary,
      rotation = this.core.rotation
    } = {}) => {
      sprite.anchor.set(0.5);
      sprite.position.set(x, y);
      sprite.scale.set(scale);
      sprite.alpha = alpha;
      sprite.tint = tint;
      sprite.rotation = rotation;
      sprite.blendMode = 'add';
      sprite.eventMode = 'none';
      return sprite;
    };

    const back = new PIXI.Container();
    back.label = `enemyProjectileSpectacleBack:${profileId}`;
    back.__novaEnemyProjectileSpectacle = true;
    for (let i = 0; i < wakeEchoCount; i += 1) {
      const distance = radius + 10 + (i + 1) * wakeSpacing;
      const lateral = Math.sin((i + 1) * 1.72 + variant * 0.43) * wakeLateral;
      const fade = Math.max(0.055, 0.2 - i * 0.038);
      const scale = baseScale * Math.max(0.48, 1.02 - i * 0.13);
      back.addChild(configureEcho(new PIXI.Sprite(this.core.texture), {
        x: -forwardX * distance + normalX * lateral,
        y: -forwardY * distance + normalY * lateral,
        scale,
        alpha: fade,
        tint: i === 0 ? hot : primary
      }));
    }

    const front = new PIXI.Container();
    front.label = `enemyProjectileSpectacleFront:${profileId}`;
    front.__novaEnemyProjectileSpectacle = true;
    front.addChild(configureEcho(new PIXI.Sprite(this.core.texture), {
      scale: baseScale * auraScale,
      alpha: colorAssist ? 0.2 : 0.16,
      tint: secondary
    }));
    front.addChild(configureEcho(new PIXI.Sprite(this.core.texture), {
      scale: baseScale * (auraScale + 0.32),
      alpha: colorAssist ? 0.12 : 0.075,
      tint: hot,
      rotation: this.core.rotation + flareRotation
    }));

    const debug = {
      profileId,
      style,
      variant,
      renderMode: 'batched_sprite_echoes',
      wakeEchoCount,
      auraEchoCount: 2,
      signatureEchoCount: 2,
      collisionRadius: radius,
      wakeLength: Number((wakeEchoCount * wakeSpacing).toFixed(2))
    };
    back._debugEnemyProjectileSpectacle = debug;
    front._debugEnemyProjectileSpectacle = debug;
    this.enemySpectacleBack = back;
    this.enemySpectacleFront = front;
    this.sprite.addChildAt(back, 0);
    this.sprite.addChild(front);
  }

  getThreatArmingInfo() {
    if (this.isPlayer || !this.active) return null;
    if (this.splitAfterMs && !this.threatSplitTriggered) {
      return { kind: 'split', durationMs: this.splitAfterMs, progress: Math.max(0, Math.min(1, this.ageMs / Math.max(1, this.splitAfterMs))) };
    }
    if (this.behavior === 'brake_then_accelerate' && this.brakeMs && !this.threatReleaseTriggered) {
      return { kind: 'dash', durationMs: this.brakeMs, progress: Math.max(0, Math.min(1, this.ageMs / Math.max(1, this.brakeMs))) };
    }
    if (this.behavior === 'orbit_then_release' && this.releaseAfterMs && !this.threatReleaseTriggered) {
      return { kind: 'release', durationMs: this.releaseAfterMs, progress: Math.max(0, Math.min(1, this.ageMs / Math.max(1, this.releaseAfterMs))) };
    }
    return null;
  }

  createThreatArmingCue() {
    const info = this.getThreatArmingInfo();
    if (!info) return;
    this.threatArmingLayer = new PIXI.Graphics();
    this.threatArmingLayer.label = 'enemyProjectileThreatArming';
    this.threatArmingLayer.__novaProjectileThreatArming = true;
    this.threatArmingLayer.blendMode = 'add';
    this.sprite.addChild(this.threatArmingLayer);
    this.updateThreatArmingCue();
  }

  updateThreatArmingCue() {
    if (!this.threatArmingLayer) return;
    const layer = this.threatArmingLayer;
    const info = this.getThreatArmingInfo();
    layer.clear();
    if (!info) {
      layer.visible = false;
      layer._debugThreatArming = { visible: false, pipCount: 0, kind: null, progress: 1 };
      if (this.sprite?._debugProjectileReadability) {
        this.sprite._debugProjectileReadability.threatArmingPipCount = 0;
        this.sprite._debugProjectileReadability.threatArmingKind = null;
      }
      return;
    }

    const progress = Math.max(0, Math.min(1, info.progress));
    const radius = Math.max(12, this.radius + 12);
    const color = this.visualConfig.warningColor || this.visualConfig.trailColor || 0xffd166;
    const hotAlpha = 0.24 + progress * 0.36;
    const pipCount = 4;
    const activePips = Math.max(1, Math.ceil((1 - progress) * pipCount));
    layer.visible = true;
    layer.circle(0, 0, radius);
    layer.stroke({ color, width: 1.2, alpha: 0.18 + progress * 0.18 });
    for (let i = 0; i < pipCount; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / pipCount;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const active = i < activePips;
      layer.circle(x, y, active ? 2.2 : 1.4);
      layer.fill({ color, alpha: active ? hotAlpha : 0.16 });
    }
    const forward = radius + 4;
    layer.moveTo(Math.cos(this.angle) * (radius * 0.48), Math.sin(this.angle) * (radius * 0.48));
    layer.lineTo(Math.cos(this.angle) * forward, Math.sin(this.angle) * forward);
    layer.stroke({ color: 0xffffff, width: 1, alpha: 0.18 + progress * 0.22 });
    layer._debugThreatArming = {
      visible: true,
      kind: info.kind,
      pipCount,
      activePips,
      progress: Number(progress.toFixed(3))
    };
    if (this.sprite?._debugProjectileReadability) {
      this.sprite._debugProjectileReadability.threatArmingPipCount = pipCount;
      this.sprite._debugProjectileReadability.threatArmingKind = info.kind;
      this.sprite._debugProjectileReadability.threatArmingProgress = Number(progress.toFixed(3));
    }
  }

  ensurePlayerIntentLayer() {
    if (this.playerIntentLayer) return this.playerIntentLayer;
    this.playerIntentLayer = new PIXI.Graphics();
    this.playerIntentLayer.label = 'playerProjectileIntentMarkers';
    this.playerIntentLayer.__novaPlayerProjectileIntentMarkers = true;
    this.playerIntentLayer.blendMode = 'add';
    this.playerIntentLayer.visible = false;
    this.sprite.addChild(this.playerIntentLayer);
    return this.playerIntentLayer;
  }

  refreshPlayerProjectileIntentMarkers() {
    if (!this.isPlayer) return;
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
      const emptyDebug = {
        active: false,
        intents,
        markerCount: 0,
        orbitBeadCount: 0,
        chargeRingCount: 0,
        lanceStripeCount: 0,
        chordCount: 0
      };
      if (this.playerIntentLayer) {
        this.playerIntentLayer.clear();
        this.playerIntentLayer.visible = false;
        this.playerIntentLayer._debugIntentMarkers = emptyDebug;
      }
      if (this.sprite?._debugProjectileReadability) {
        this.sprite._debugProjectileReadability.playerIntentActive = false;
        this.sprite._debugProjectileReadability.intentMarkers = emptyDebug;
      }
      return;
    }

    const layer = this.ensurePlayerIntentLayer();
    layer.clear();

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
    let orbitBeadCount = 0;
    let chargeRingCount = 0;
    let lanceStripeCount = 0;
    let chordCount = 0;

    const chargeRadius = radius + 12 + Math.min(6, activeKeys.length * 1.4);
    layer.circle(0, 0, chargeRadius);
    layer.stroke({ color: primary, width: 0.9, alpha: 0.22 });
    chargeRingCount += 1;

    const orbitCount = Math.max(3, Math.min(7, activeKeys.length + 3));
    for (let i = 0; i < orbitCount; i += 1) {
      const a = angle + (Math.PI * 2 * i) / orbitCount + activeKeys.length * 0.18;
      const r = chargeRadius + (i % 2) * 2.5;
      layer.circle(Math.cos(a) * r, Math.sin(a) * r, i % 2 ? 1.8 : 2.35);
      orbitBeadCount += 1;
    }
    layer.fill({ color: accent, alpha: 0.28 });

    for (let i = 0; i < Math.min(3, activeKeys.length); i += 1) {
      const lane = i - (Math.min(3, activeKeys.length) - 1) / 2;
      const yOff = lane * 4;
      layer.moveTo(forwardX * (-radius - 10) + normalX * yOff, forwardY * (-radius - 10) + normalY * yOff);
      layer.lineTo(forwardX * (radius + 12) + normalX * yOff * 0.36, forwardY * (radius + 12) + normalY * yOff * 0.36);
      chordCount += 1;
    }
    layer.stroke({ color: accent, width: 0.85, alpha: 0.2 + activeKeys.length * 0.04 });

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
      for (let i = 0; i < (intents.plasma ? 3 : 2); i += 1) {
        const lane = i - ((intents.plasma ? 3 : 2) - 1) / 2;
        const offset = lane * 3.4;
        layer.moveTo(forwardX * (tail * 0.72) + normalX * offset, forwardY * (tail * 0.72) + normalY * offset);
        layer.lineTo(forwardX * (nose + 5) + normalX * offset * 0.22, forwardY * (nose + 5) + normalY * offset * 0.22);
        lanceStripeCount += 1;
      }
      layer.stroke({ color: intents.plasma ? 0xffffff : primary, width: 0.8, alpha: intents.plasma ? 0.36 : 0.24 });
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
      orbitBeadCount,
      chargeRingCount,
      lanceStripeCount,
      chordCount,
      radius,
      primary
    };
    if (this.sprite?._debugProjectileReadability) {
      this.sprite._debugProjectileReadability.playerIntentMarkers = true;
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
      if (this.dangerWakeBeads) {
        if (this.dangerWakeBeads !== this.dangerGlint) {
          this.dangerWakeBeads.alpha = 0.62 + Math.sin(this.pulseTimer * 2.1 * pulseRate) * 0.16;
        }
      }
      this.updateEnemyProjectileSpectacle(delta);
      this.updateThreatArmingCue();
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

  updateEnemyProjectileSpectacle() {
    if (this.isPlayer || !this.enemySpectacleBack || !this.enemySpectacleFront) return;
    const rate = this.coreAnimationRate || 1;
    const phase = this.pulseTimer * rate + this.behaviorPhase * 0.16;
    const wave = Math.sin(phase * 2.15);
    const wave2 = Math.cos(phase * 1.42 + 0.65);
    const style = this.coreAnimationStyle || 'pulse';

    this.enemySpectacleBack.alpha = 0.8 + wave * 0.12;
    this.enemySpectacleBack.scale.set(1 + Math.max(0, wave2) * 0.026, 1 + wave * 0.018);

    const frontPulse = style === 'orb' || style === 'fireball' ? 0.09 : 0.055;
    const frontScale = 1 + wave * frontPulse;
    this.enemySpectacleFront.scale.set(frontScale);
    this.enemySpectacleFront.alpha = 0.76 + wave2 * 0.2;

    const debug = this.enemySpectacleFront._debugEnemyProjectileSpectacle;
    if (debug) {
      debug.animated = true;
      debug.backAlpha = Number(this.enemySpectacleBack.alpha.toFixed(3));
      debug.frontAlpha = Number(this.enemySpectacleFront.alpha.toFixed(3));
      debug.frontRotation = Number(this.enemySpectacleFront.rotation.toFixed(4));
    }
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
