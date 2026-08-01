import { BalanceConfig, MAX_PLAYER_LIVES } from '../config/BalanceConfig.js';
import { GameAssets } from '../utils/GameAssets.js';
import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';
import { hideMicroSignals, presentDirectionalSignal } from '../effects/MicroSignalVfx.js';
import { ALL_POWERUP_TYPES, getPowerupMeta } from '../config/PowerupCatalog.js';

const POWERUP_CODEX_NAMES = Object.freeze(Object.fromEntries(
  ALL_POWERUP_TYPES.map((type) => [type, getPowerupMeta(type)?.name || String(type).replace(/_/g, ' ').toUpperCase()])
));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createSeededRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed || 'nova-swarm-pickup')) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  state >>>= 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const MAJOR_POWERUP_TYPES = new Set([
  'bomb',
  'orbital_strike',
  'shockwave',
  'stasis_net',
  'row_core',
  'plasma_lance',
  'void_crown',
  'mercy_protocol',
  'super_extra_life',
  'nova_miracle'
]);

const BASE_PICKUP_ASSIST_RADIUS = 24;
const MAJOR_PICKUP_ASSIST_RADIUS = 28;

function getPowerupIntentProfile(type, effect = {}) {
  const major = MAJOR_POWERUP_TYPES.has(type);
  if (effect?.shield || effect?.pointDefense || effect?.ghost || effect?.grantLives || effect?.repairLives || type === 'life') {
    return { category: 'defense', color: 0x66fff0, accent: 0x1cff9c, major };
  }
  if (effect?.slowTime || type === 'stasis_net' || type === 'pulse_refund') {
    return { category: 'control', color: 0x69f4ff, accent: 0xb486ff, major };
  }
  if (effect?.movementBoostMult || effect?.speedMult || effect?.dodgeDelayMult || effect?.magnetRadius || effect?.scoreMultiplier) {
    return { category: 'utility', color: 0xffdf58, accent: 0x7df9ff, major };
  }
  return { category: 'offense', color: 0xff8a38, accent: 0xff3f73, major };
}

function drawRadialTick(graphics, angle, innerRadius, outerRadius) {
  graphics.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
  graphics.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
}

class Powerup {
  constructor(x, y, type, options = {}) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.spawnId = options.spawnId || null;
    this.spawnKey = options.spawnKey || null;
    this.spawnSource = options.source || null;
    this.rewardClaim = options.rewardClaim === true;
    this.rngIsolated = Boolean(options.visualSeed);
    this.randomUnit = this.rngIsolated ? createSeededRandom(options.visualSeed) : Math.random;
    this.bundledPowerupTypes = Array.from(new Set(
      (Array.isArray(options.bundledPowerupTypes) ? options.bundledPowerupTypes : [])
        .map((entry) => String(entry || ''))
        .filter((entry) => entry && entry !== type)
    ));
    this.active = true;
    this.radius = 12;
    this.vy = 1;
    this.createdAt = Date.now();
    this.collectibleAt = Math.max(this.createdAt, Number(options.collectibleAt) || this.createdAt);
    this.lifeTime = 26000;

    const data = getPowerupMeta(type) || getPowerupMeta('triple_beam');
    this.color = data.color;
    this.label = data.shortLabel || data.name || 'POWER';
    this.effect = data.effect || {};
    this.movement = data.movement || {};
    this.magnetImmune = this.movement.magnetImmune === true;
    if (Number.isFinite(Number(this.movement.pickupRadius))) {
      this.radius = Math.max(6, Number(this.movement.pickupRadius));
    }
    const configuredPickupAssistRadius = Number(this.movement.pickupAssistRadius);
    const pickupAssistFloor = MAJOR_POWERUP_TYPES.has(type)
      ? MAJOR_PICKUP_ASSIST_RADIUS
      : BASE_PICKUP_ASSIST_RADIUS;
    this.pickupAssistRadius = Number.isFinite(configuredPickupAssistRadius)
      ? Math.max(this.radius, configuredPickupAssistRadius)
      : Math.max(this.radius, pickupAssistFloor);
    this.collectionRadius = this.pickupAssistRadius;
    if (Number.isFinite(Number(this.movement.verticalSpeed))) {
      this.vy = Number(this.movement.verticalSpeed);
    }
    if (Number.isFinite(Number(this.movement.lifeTimeMs))) {
      this.lifeTime = Math.max(4000, Number(this.movement.lifeTimeMs));
    }
    if (Number.isFinite(Number(options.pickupAssistRadius))) {
      this.pickupAssistRadius = Math.max(this.radius, Number(options.pickupAssistRadius));
      this.collectionRadius = this.pickupAssistRadius;
    }
    if (Number.isFinite(Number(options.verticalSpeed))) {
      this.vy = Number(options.verticalSpeed);
    }
    if (Number.isFinite(Number(options.lifeTimeMs))) {
      this.lifeTime = Math.max(4000, Number(options.lifeTimeMs));
    }
    this.evasiveConfig = this.movement.evasive ? this.movement : null;
    this.evasiveVx = (this.randomUnit() < 0.5 ? -1 : 1) * this.randomBetween(2.8, 5.8);
    this.evasiveTargetX = x;
    this.nextEvasiveJumpAt = this.randomBetween(70, 180);

    // TASK A: Idle animation state
    this.bobPhase = this.randomUnit() * Math.PI * 2;
    this.pulsePhase = 0;
    this.sparkleTimer = 0;
    this.baseY = y;
    this.particleCount = 0; // Track particles per powerup

    this.createSprite();
  }

  randomBetween(min, max) {
    return min + this.randomUnit() * Math.max(0, max - min);
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // TASK A: Create breathing aura ring
    this.aura = new PIXI.Graphics();
    this.aura.label = 'aura';
    this.sprite.addChild(this.aura);
    this.readabilityHalo = new PIXI.Graphics();
    this.readabilityHalo.label = 'readabilityHalo';
    this.sprite.addChild(this.readabilityHalo);
    this.intentCue = new PIXI.Graphics();
    this.intentCue.label = 'intentCue';
    this.sprite.addChild(this.intentCue);
    this.pickupGuide = new PIXI.Graphics();
    this.pickupGuide.label = 'pickupGuide';
    this.pickupGuide.visible = false;
    this.sprite.addChild(this.pickupGuide);
    this.expiryCue = new PIXI.Graphics();
    this.expiryCue.label = 'expiryCue';
    this.expiryCue.visible = false;
    this.sprite.addChild(this.expiryCue);

    try {
      const texture = GameAssets.getPowerupTexture(this.type) || GameAssets.getBonusCoreTexture();

      if (GameAssets.isValidTexture(texture)) {
        const iconSprite = new PIXI.Sprite(texture);
        iconSprite.anchor.set(0.5);
        iconSprite.label = 'mainSprite';
        const maxIconSize = this.type === 'nova_miracle'
          ? 60
          : (['orbital_strike', 'shockwave', 'bomb', 'super_extra_life'].includes(this.type) ? 52 : 48);
        const scale = maxIconSize / Math.max(texture.width, texture.height);
        iconSprite.scale.set(scale);

        this.sprite.addChild(iconSprite);
        this.mainSprite = iconSprite;

        // Store base scale to prevent runaway pulsing.
        this.baseScale = iconSprite.scale.x;

        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 25);
        glow.fill({
          color: this.color,
          alpha: this.type === 'nova_miracle' ? 0.68 : (this.type === 'super_extra_life' ? 0.48 : 0.34)
        });
        this.sprite.addChildAt(glow, 1);
        if (this.type === 'super_extra_life') {
          this.createSuperLifeOverlays();
        } else if (this.type === 'nova_miracle') {
          this.createNovaMiracleOverlays();
        }
      } else {
        this.createFallbackSprite();
      }
    } catch (e) {
      console.warn('Powerup sprite creation failed', e);
      this.createFallbackSprite();
    }
  }

  createFallbackSprite() {
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, this.radius + 2);
    glow.fill({ color: this.color, alpha: 0.25 });
    this.sprite.addChild(glow);

    const circle = new PIXI.Graphics();
    circle.circle(0, 0, this.radius);
    circle.fill({ color: this.color });
    circle.stroke({ color: 0xffffff, width: 2 });
    this.sprite.addChild(circle);

    const text = createText(this.label[0], {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 14,
      fill: '#ffffff',
      fontWeight: 'bold'
    });
    text.anchor.set(0.5);
    this.sprite.addChild(text);
  }

  createSuperLifeOverlays() {
    this.evasiveTrail = new PIXI.Graphics();
    this.evasiveTrail.label = 'superExtraLifeTrail';
    this.sprite.addChildAt(this.evasiveTrail, 0);

    this.superLifeOrbit = new PIXI.Graphics();
    this.superLifeOrbit.label = 'superExtraLifeOrbit';
    this.sprite.addChild(this.superLifeOrbit);
  }

  createNovaMiracleOverlays() {
    this.novaMiracleHalo = new PIXI.Graphics();
    this.novaMiracleHalo.label = 'novaMiracleHalo';
    this.sprite.addChildAt(this.novaMiracleHalo, 0);

    this.novaMiracleCrown = new PIXI.Graphics();
    this.novaMiracleCrown.label = 'novaMiracleCrown';
    this.sprite.addChild(this.novaMiracleCrown);
  }

  scheduleNextEvasiveJump(age) {
    const minMs = Number(this.evasiveConfig?.jumpIntervalMinMs) || 260;
    const maxMs = Math.max(minMs, Number(this.evasiveConfig?.jumpIntervalMaxMs) || 620);
    this.nextEvasiveJumpAt = age + this.randomBetween(minMs, maxMs);
  }

  updateEvasiveMovement(delta, scene, age) {
    if (!this.evasiveConfig) return false;
    const screenWidth = Math.max(
      320,
      Number(scene?.gameplayGame?.getWidth?.()) ||
      Number(scene?.game?.getGameplayWidth?.()) ||
      Number(scene?.game?.getWidth?.()) ||
      Number(scene?.game?.app?.screen?.width) ||
      Number(scene?.game?.width) ||
      800
    );
    const margin = Math.max(42, Number(this.evasiveConfig.edgeMarginPx) || 56);
    const minX = margin;
    const maxX = Math.max(minX, screenWidth - margin);
    const player = scene?.player;
    const playerX = Number(player?.x);
    const playerY = Number(player?.y);
    const hasPlayer = Number.isFinite(playerX) && Number.isFinite(playerY);
    const dt = clamp(Number(delta) || 1, 0.25, 2.5);

    if (age >= this.nextEvasiveJumpAt) {
      const away = hasPlayer && playerX > this.x ? -1 : 1;
      const jumpMin = Number(this.evasiveConfig.jumpDistanceMinPx) || 92;
      const jumpMax = Math.max(jumpMin, Number(this.evasiveConfig.jumpDistanceMaxPx) || 188);
      const jitter = this.randomBetween(
        -(Number(this.evasiveConfig.horizontalJitterPx) || 48),
        Number(this.evasiveConfig.horizontalJitterPx) || 48
      );
      const fakeoutChance = clamp(Number(this.evasiveConfig.fakeoutChance) || 0, 0, 0.5);
      const jumpDirection = this.randomUnit() < fakeoutChance ? -away : away;
      const requestedTarget = this.x + jumpDirection * this.randomBetween(jumpMin, jumpMax) + jitter;
      const boundaryDirection = requestedTarget <= minX || requestedTarget >= maxX ? -jumpDirection : jumpDirection;
      this.evasiveTargetX = clamp(this.x + boundaryDirection * this.randomBetween(jumpMin, jumpMax) + jitter, minX, maxX);
      this.evasiveVx += boundaryDirection * this.randomBetween(3.8, 7.2);
      this.scheduleNextEvasiveJump(age);
    }

    let acceleration = (this.evasiveTargetX - this.x) * (Number(this.evasiveConfig.targetEase) || 0.18);
    if (hasPlayer) {
      const dx = this.x - playerX;
      const dy = this.y - playerY;
      const dodgeRadius = Number(this.evasiveConfig.dodgeRadius) || 190;
      const verticalPressure = Math.max(0, 1 - Math.abs(dy) / 270);
      const horizontalPressure = Math.max(0, 1 - Math.abs(dx) / dodgeRadius);
      if (horizontalPressure > 0 && verticalPressure > 0) {
        const direction = dx >= 0 ? 1 : -1;
        const closeBoost = Math.abs(dy) < 190
          ? Math.max(1, Number(this.evasiveConfig.closePressureBoost) || 1)
          : 1;
        acceleration += direction * (Number(this.evasiveConfig.lateralAccel) || 2.2) * 18 * horizontalPressure * verticalPressure * closeBoost;
      }
    }

    const maxSpeed = Number(this.evasiveConfig.maxSpeedX) || 13.5;
    this.evasiveVx = clamp((this.evasiveVx + acceleration * 0.11 * dt) * 0.91, -maxSpeed, maxSpeed);
    this.x = clamp(this.x + this.evasiveVx * dt, minX, maxX);
    if (this.x <= minX || this.x >= maxX) {
      this.evasiveVx *= -0.82;
      this.evasiveTargetX = clamp(this.x + this.evasiveVx * 18, minX, maxX);
    }
    this.baseY += this.vy * dt;
    return true;
  }

  updateSuperLifeVisuals(age) {
    if (!this.evasiveTrail && !this.superLifeOrbit) return;
    const pulse = Math.sin(age * 0.013);
    if (this.evasiveTrail) {
      this.evasiveTrail.clear();
      for (let i = 0; i < 3; i += 1) {
        const spread = 22 + i * 8 + pulse * 3;
        const alpha = 0.34 - i * 0.08;
        this.evasiveTrail.moveTo(-spread, -18 + i * 12);
        this.evasiveTrail.lineTo(-spread - 20, -10 + i * 10);
        this.evasiveTrail.moveTo(spread, 18 - i * 11);
        this.evasiveTrail.lineTo(spread + 18, 9 - i * 9);
        this.evasiveTrail.stroke({ width: 2.4, color: i % 2 ? 0xffe34d : 0x43f7ff, alpha });
      }
    }
    if (this.superLifeOrbit) {
      const orbit = 31 + pulse * 4;
      const sweep = age * 0.008;
      this.superLifeOrbit.clear();
      this.superLifeOrbit.circle(0, 0, orbit);
      this.superLifeOrbit.stroke({ width: 2.4, color: 0xffffff, alpha: 0.38 });
      for (let i = 0; i < 2; i += 1) {
        const angle = sweep + i * Math.PI;
        this.superLifeOrbit.circle(Math.cos(angle) * orbit, Math.sin(angle) * orbit, 4);
        this.superLifeOrbit.fill({ color: i === 0 ? 0xffe34d : 0x43f7ff, alpha: 0.88 });
      }
    }
  }

  updateNovaMiracleVisuals(age) {
    if (!this.novaMiracleHalo && !this.novaMiracleCrown) return;
    const pulse = Math.sin(age * 0.009) * 0.5 + 0.5;
    const spin = age * 0.0028;
    if (this.novaMiracleHalo) {
      this.novaMiracleHalo.clear();
      for (let i = 0; i < 3; i += 1) {
        const radius = 33 + i * 9 + pulse * (5 - i);
        this.novaMiracleHalo.circle(0, 0, radius);
        this.novaMiracleHalo.stroke({
          width: 3.4 - i * 0.7,
          color: i === 0 ? 0xffffff : (i === 1 ? 0x43f7ff : 0xff45dd),
          alpha: 0.58 - i * 0.11 + pulse * 0.12
        });
      }
    }
    if (this.novaMiracleCrown) {
      this.novaMiracleCrown.clear();
      for (let i = 0; i < 8; i += 1) {
        const angle = spin + i * Math.PI / 4;
        const inner = 44 + pulse * 2;
        const outer = 58 + pulse * 8 + (i % 2) * 5;
        this.novaMiracleCrown.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        this.novaMiracleCrown.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      }
      this.novaMiracleCrown.stroke({ width: 2.8, color: 0xfff3a0, alpha: 0.52 + pulse * 0.28 });
      for (let i = 0; i < 6; i += 1) {
        const angle = -spin * 1.6 + i * Math.PI / 3;
        this.novaMiracleCrown.circle(Math.cos(angle) * 49, Math.sin(angle) * 49, 2.4 + pulse * 1.4);
      }
      this.novaMiracleCrown.fill({ color: 0xffffff, alpha: 0.55 + pulse * 0.28 });
    }
  }

  update(delta, scene) {
    if (!this.active) return;

    const age = Date.now() - this.createdAt;

    // TASK A: Idle bob animation (sine wave vertical movement) - subtle
    this.bobPhase += 0.04 * delta;
    const bobOffset = Math.sin(this.bobPhase) * 2;

    // TASK A: Idle pulse animation (scale breathing) - subtle
    this.pulsePhase += 0.03 * delta;
    const pulseScale = 1.0 + Math.sin(this.pulsePhase) * 0.06;

    // Update position with bob
    const movedByProfile = this.updateEvasiveMovement(delta, scene, age);
    if (!movedByProfile) {
      this.baseY += this.vy * delta;
    }
    this.y = this.baseY + bobOffset;
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.updateSuperLifeVisuals(age);
    this.updateNovaMiracleVisuals(age);

    // PART B: Apply pulse to main sprite using stable base scale (no accumulation)
    if (this.mainSprite && this.baseScale !== undefined) {
      const scale = this.baseScale * pulseScale;
      this.mainSprite.scale.set(scale, scale);
    }

    // Gentle rotation
    this.sprite.rotation += (this.type === 'super_extra_life' ? 0.052 : (this.type === 'nova_miracle' ? 0.008 : 0.02)) * delta;

    // TASK A: Breathing aura ring (reduced size)
    if (this.aura) {
      const auraPhase = (age * 0.003) % (Math.PI * 2);
      const auraRadius = (this.type === 'nova_miracle' ? 38 : (this.type === 'super_extra_life' ? 29 : 24)) + Math.sin(auraPhase) * 4;
      const auraAlpha = (this.type === 'nova_miracle' ? 0.72 : (this.type === 'super_extra_life' ? 0.56 : 0.42)) + Math.sin(auraPhase) * 0.16;

      this.aura.clear();
      this.aura.circle(0, 0, auraRadius);
      this.aura.stroke({ width: 2.4, color: this.color, alpha: auraAlpha });
    }

    if (this.readabilityHalo) {
      const sweep = (age * 0.004) % (Math.PI * 2);
      const haloRadius = 33 + Math.sin(sweep) * 3;
      this.readabilityHalo.clear();
      this.readabilityHalo.circle(0, 0, haloRadius);
      this.readabilityHalo.stroke({ width: 1.2, color: 0xffffff, alpha: 0.22 });
      this.readabilityHalo.moveTo(Math.cos(sweep) * 18, Math.sin(sweep) * 18);
      this.readabilityHalo.lineTo(Math.cos(sweep) * haloRadius, Math.sin(sweep) * haloRadius);
      this.readabilityHalo.stroke({ width: 2.2, color: this.color, alpha: 0.58 });
    }

    this.updateIntentCue(age);

    const screenHeight = Math.max(
      620,
      Number(scene?.gameplayGame?.getHeight?.()) ||
      Number(scene?.game?.getGameplayHeight?.()) ||
      Number(scene?.game?.getHeight?.()) ||
      Number(scene?.game?.app?.screen?.height) ||
      Number(scene?.game?.height) ||
      620
    );
    this.updatePickupGuide(scene, age);
    this.updateExpiryCue(age, screenHeight);

    // TASK A: Ambient sparkles (spawn every 200-300ms, reduced distance)
    this.sparkleTimer += delta * 16.67;
    const sparkleInterval = 200 + this.randomUnit() * 100;

    if (this.sparkleTimer > sparkleInterval && this.particleCount < 3 && scene && scene.particleManager) {
      this.sparkleTimer = 0;
      this.particleCount++;

      // Spawn tiny sparkle around powerup (reduced distance)
      const angle = this.randomUnit() * Math.PI * 2;
      const dist = (this.type === 'nova_miracle' ? 27 : (this.type === 'super_extra_life' ? 19 : 14)) + this.randomUnit() * 13;
      const sx = this.x + Math.cos(angle) * dist;
      const sy = this.y + Math.sin(angle) * dist;
      const vx = (this.randomUnit() - 0.5) * (this.type === 'nova_miracle' ? 1.1 : (this.type === 'super_extra_life' ? 0.8 : 0.3));
      const vy = (this.randomUnit() - 0.5) * 0.3;

      scene.particleManager.spawnParticle(sx, sy, vx, vy, this.color, this.type === 'nova_miracle' ? 2.8 : (this.type === 'super_extra_life' ? 2.1 : 1.6), 22);

      // Decrement count after particle dies
      setTimeout(() => {
        this.particleCount = Math.max(0, this.particleCount - 1);
      }, 25);
    }

    const offscreenMargin = Math.max(90, this.radius * 6);

    const lifetimeMult = Number(scene?.player?.runAugmentModifiers?.pickupLifetimeMult) || 1;
    const effectiveLifetime = this.lifeTime * Math.max(1, lifetimeMult);
    if (this.y > screenHeight + offscreenMargin || age > effectiveLifetime) {
      this.active = false;
    }
  }

  updateIntentCue(age) {
    const cue = this.intentCue;
    if (!cue) return;

    const profile = getPowerupIntentProfile(this.type, this.effect);
    const pulse = Math.sin(age * 0.006) * 0.5 + 0.5;
    const radius = profile.major ? 45 : 39;
    const baseAlpha = profile.major ? 0.46 : 0.32;
    cue.clear();

    cue.circle(0, 0, radius);
    cue.stroke({ width: profile.major ? 2.2 : 1.4, color: profile.color, alpha: baseAlpha + pulse * 0.12 });
    let orbitPetalCount = 0;
    let categoryChordCount = 0;
    let innerSparkCount = 0;
    let majorPetalCount = 0;
    let signalTailCount = 0;

    if (profile.category === 'defense') {
      for (let i = 0; i < 4; i += 1) {
        const angle = Math.PI * 0.25 + i * Math.PI * 0.5;
        drawRadialTick(cue, angle, radius - 8, radius + 5);
      }
      cue.stroke({ width: 3.2, color: profile.color, alpha: 0.46 + pulse * 0.18 });
      cue.circle(0, 0, radius - 9);
      cue.stroke({ width: 1.2, color: profile.accent, alpha: 0.18 + pulse * 0.12 });
    } else if (profile.category === 'control') {
      const sweep = (age * 0.008) % (Math.PI * 2);
      for (let i = 0; i < 6; i += 1) {
        drawRadialTick(cue, sweep + i * (Math.PI * 2 / 6), radius - 6, radius + 4);
      }
      cue.stroke({ width: 1.8, color: profile.color, alpha: 0.34 + pulse * 0.18 });
      cue.moveTo(Math.cos(sweep) * (radius - 16), Math.sin(sweep) * (radius - 16));
      cue.lineTo(Math.cos(sweep) * (radius + 7), Math.sin(sweep) * (radius + 7));
      cue.stroke({ width: 2.4, color: profile.accent, alpha: 0.48 + pulse * 0.16 });
    } else if (profile.category === 'utility') {
      for (let i = 0; i < 4; i += 1) {
        const angle = Math.PI * 0.5 * i;
        const cx = Math.cos(angle) * (radius + 1);
        const cy = Math.sin(angle) * (radius + 1);
        cue.moveTo(cx, cy - 4);
        cue.lineTo(cx + 4, cy);
        cue.lineTo(cx, cy + 4);
        cue.lineTo(cx - 4, cy);
        cue.lineTo(cx, cy - 4);
      }
      cue.stroke({ width: 1.8, color: profile.color, alpha: 0.42 + pulse * 0.16 });
      cue.circle(0, 0, radius - 12);
      cue.stroke({ width: 1.3, color: profile.accent, alpha: 0.18 + pulse * 0.14 });
    } else {
      for (let i = 0; i < 4; i += 1) {
        const angle = i * Math.PI * 0.5;
        drawRadialTick(cue, angle, radius - 5, radius + 8);
      }
      cue.stroke({ width: 2.6, color: profile.color, alpha: 0.44 + pulse * 0.18 });
      for (let i = 0; i < 4; i += 1) {
        const angle = Math.PI * 0.25 + i * Math.PI * 0.5;
        drawRadialTick(cue, angle, radius - 3, radius + 3);
      }
      cue.stroke({ width: 1.5, color: profile.accent, alpha: 0.34 + pulse * 0.16 });
    }

    const orbitCount = profile.major ? 8 : 6;
    const orbitRadius = radius + 7 + pulse * 2;
    const spin = age * (profile.major ? 0.006 : 0.0045);
    for (let i = 0; i < orbitCount; i += 1) {
      const angle = spin + i * (Math.PI * 2 / orbitCount);
      const cx = Math.cos(angle) * orbitRadius;
      const cy = Math.sin(angle) * orbitRadius;
      cue.circle(cx, cy, profile.major ? 2.4 : 1.8);
      orbitPetalCount += 1;
    }
    cue.fill({ color: profile.accent, alpha: 0.18 + pulse * 0.1 });

    const chordCount = profile.category === 'control' ? 3 : 2;
    for (let i = 0; i < chordCount; i += 1) {
      const angle = spin * 0.45 + i * Math.PI / chordCount;
      cue.moveTo(Math.cos(angle) * (radius - 18), Math.sin(angle) * (radius - 18));
      cue.lineTo(Math.cos(angle + Math.PI) * (radius - 7), Math.sin(angle + Math.PI) * (radius - 7));
      categoryChordCount += 1;
    }
    cue.stroke({ width: 0.9, color: 0xffffff, alpha: 0.1 + pulse * 0.1 });

    for (let i = 0; i < 3; i += 1) {
      const angle = -spin + i * Math.PI * 2 / 3;
      cue.circle(Math.cos(angle) * (radius * 0.24), Math.sin(angle) * (radius * 0.24), 1.5 + pulse * 0.8);
      innerSparkCount += 1;
    }
    cue.fill({ color: 0xffffff, alpha: 0.18 + pulse * 0.16 });

    for (let i = 0; i < (profile.major ? 4 : 2); i += 1) {
      const angle = Math.PI / 2 + (i - 1.5) * 0.22;
      const inner = radius + 4 + i * 2;
      const outer = radius + 17 + i * 3;
      cue.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      cue.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      signalTailCount += 1;
    }
    cue.stroke({ width: 1.2, color: profile.color, alpha: 0.18 + pulse * 0.16 });

    let crownTicks = 0;
    if (profile.major) {
      crownTicks = 6;
      const crownRadius = radius + 8 + pulse * 2;
      for (let i = 0; i < crownTicks; i += 1) {
        const angle = -Math.PI / 2 + i * (Math.PI * 2 / crownTicks);
        const cx = Math.cos(angle) * crownRadius;
        const cy = Math.sin(angle) * crownRadius;
        cue.circle(cx, cy, i === 0 ? 3.2 : 2.4);
      }
      cue.fill({ color: 0xfff1a8, alpha: 0.26 + pulse * 0.16 });
      cue.circle(0, 0, radius + 12 + pulse * 2);
      cue.stroke({ width: 1.2, color: 0xffe56d, alpha: 0.2 + pulse * 0.18 });
      const petalRadius = radius + 17 + pulse * 2;
      for (let i = 0; i < 8; i += 1) {
        const angle = spin * 0.72 + i * Math.PI / 4;
        cue.moveTo(Math.cos(angle) * (petalRadius - 4), Math.sin(angle) * (petalRadius - 4));
        cue.lineTo(Math.cos(angle) * (petalRadius + 7), Math.sin(angle) * (petalRadius + 7));
        majorPetalCount += 1;
      }
      cue.stroke({ width: 1, color: 0xffffff, alpha: 0.16 + pulse * 0.12 });
    }

    cue.visible = true;
    cue.__debugPowerupIntent = {
      visible: true,
      type: this.type,
      category: profile.category,
      major: profile.major,
      radius,
      crownTicks,
      orbitPetalCount,
      categoryChordCount,
      innerSparkCount,
      majorPetalCount,
      signalTailCount
    };
  }

  updateExpiryCue(age, screenHeight) {
    if (!this.expiryCue || !this.sprite) return;
    const lifetime = Math.max(1, Number(this.lifeTime) || 1);
    const remainingMs = Math.max(0, lifetime - Math.max(0, Number(age) || 0));
    const timeUrgency = clamp(1 - (remainingMs / 6000), 0, 1);
    const bottomUrgency = clamp((this.y - screenHeight * 0.64) / Math.max(1, screenHeight * 0.28), 0, 1);
    const urgency = Math.max(timeUrgency, bottomUrgency);
    const pulse = Math.sin(age * 0.02) * 0.5 + 0.5;

    this.expiryCue.clear();
    if (urgency <= 0.08) {
      this.expiryCue.visible = false;
      this.sprite.alpha = 1;
      this.expiryCue.__debugExpiryCue = {
        visible: false,
        urgency,
        timeUrgency,
        bottomUrgency,
        remainingMs,
        alpha: this.sprite.alpha,
        urgentSparkCount: 0
      };
      return;
    }

    const urgent = urgency > 0.66;
    const color = urgent ? 0xff6174 : 0xffd36b;
    const radius = 36 + urgency * 8 + pulse * (urgent ? 4 : 2);
    const segmentCount = 8;
    const litSegments = Math.max(1, Math.ceil(segmentCount * urgency));
    let urgentSparkCount = 0;

    this.expiryCue.circle(0, 0, radius);
    this.expiryCue.stroke({ width: 2.2, color, alpha: 0.2 + urgency * 0.28 });
    for (let i = 0; i < segmentCount; i += 1) {
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / segmentCount);
      const inner = radius - 5;
      const outer = radius + 4;
      this.expiryCue.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      this.expiryCue.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    this.expiryCue.stroke({ width: 1.4, color, alpha: 0.16 });
    for (let i = 0; i < litSegments; i += 1) {
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / segmentCount);
      const inner = radius - 6;
      const outer = radius + 8;
      this.expiryCue.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      this.expiryCue.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    this.expiryCue.stroke({ width: 2.4, color, alpha: 0.24 + urgency * 0.48 });
    if (urgent) {
      this.expiryCue.circle(0, 0, radius + 8 + pulse * 3);
      this.expiryCue.stroke({ width: 1.6, color: 0xffffff, alpha: 0.14 + urgency * 0.16 });
      for (let i = 0; i < 4; i += 1) {
        const angle = age * 0.009 + i * Math.PI * 0.5;
        const inner = radius + 3;
        const outer = radius + 15 + pulse * 4;
        this.expiryCue.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        this.expiryCue.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        urgentSparkCount += 1;
      }
      this.expiryCue.stroke({ width: 1.2, color: 0xffffff, alpha: 0.2 + urgency * 0.24 });
    }

    this.expiryCue.visible = true;
    this.sprite.alpha = urgent ? 0.62 + pulse * 0.28 : 1;
    this.expiryCue.__debugExpiryCue = {
      visible: true,
      urgency,
      timeUrgency,
      bottomUrgency,
      remainingMs,
      alpha: this.sprite.alpha,
      litSegments,
      urgent,
      urgentSparkCount
    };
  }

  updatePickupGuide(scene, age) {
    const guide = this.pickupGuide;
    if (!guide || !this.sprite) return;
    const player = scene?.player;
    const playerX = Number(player?.x);
    const playerY = Number(player?.y);
    const hasPlayer = Number.isFinite(playerX) && Number.isFinite(playerY);
    guide.clear();
    if (!hasPlayer || player?.active === false) {
      guide.visible = false;
      guide.__debugPickupGuide = { visible: false, reason: 'no_player' };
      return;
    }

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.hypot(dx, dy);
    const pickupRadius = Math.max(6, Number(this.pickupAssistRadius) || Number(this.radius) || 12);
    const guideRadius = this.type === 'super_extra_life' ? 200 : (this.type === 'nova_miracle' ? 310 : 230);
    const closeLimit = pickupRadius + 10;
    const remainingMs = Math.max(0, Math.max(1, Number(this.lifeTime) || 1) - Math.max(0, Number(age) || 0));
    const timeUrgency = clamp(1 - (remainingMs / 5000), 0, 1);
    if (!Number.isFinite(distance) || distance <= closeLimit || distance > guideRadius) {
      const edgeGuide = distance > guideRadius
        ? this.drawPickupEdgeGuide(scene, guide, {
          age,
          distance,
          guideRadius,
          pickupRadius,
          timeUrgency
        })
        : null;
      if (edgeGuide?.visible) {
        guide.visible = true;
        guide.__debugPickupGuide = {
          visible: true,
          reason: 'offscreen_edge',
          distance: Math.round(Number.isFinite(distance) ? distance : 0),
          timeUrgency: Number(timeUrgency.toFixed(3)),
          pickupAssistRadius: Math.round(pickupRadius),
          edgeArrowCount: edgeGuide.edgeArrowCount,
          edgeGuideEligible: true,
          anchor: edgeGuide.anchor
        };
        return;
      }
      guide.visible = false;
      guide.__debugPickupGuide = {
        visible: false,
        reason: distance <= closeLimit ? 'inside_pickup_radius' : 'out_of_range',
        distance: Math.round(Number.isFinite(distance) ? distance : 0),
        timeUrgency: Number(timeUrgency.toFixed(3)),
        pickupAssistRadius: Math.round(pickupRadius),
        edgeGuideEligible: Boolean(edgeGuide?.eligible)
      };
      return;
    }

    const distanceUrgency = clamp(1 - ((distance - closeLimit) / Math.max(1, guideRadius - closeLimit)), 0, 1);
    const urgency = Math.max(distanceUrgency, timeUrgency * 0.86);
    const angle = Math.atan2(dy, dx) - (this.sprite.rotation || 0);
    const pulse = Math.sin(age * 0.014) * 0.5 + 0.5;
    const color = this.type === 'super_extra_life' ? 0xffe34d : this.color;
    const alpha = 0.22 + urgency * 0.5 + pulse * 0.12;
    const dashCount = urgency > 0.62 ? 3 : 2;
    let timeoutTickCount = 0;
    const side = Math.PI * 0.5;
    const spread = 4 + urgency * 5;

    guide.circle(0, 0, pickupRadius + 18 + urgency * 8);
    guide.stroke({ width: 1.2, color, alpha: 0.12 + urgency * 0.2 });
    for (let i = 0; i < dashCount; i += 1) {
      const inner = pickupRadius + 20 + i * 9;
      const outer = inner + 6 + urgency * 5;
      const cx = Math.cos(angle) * inner;
      const cy = Math.sin(angle) * inner;
      const leftX = cx + Math.cos(angle + side) * spread;
      const leftY = cy + Math.sin(angle + side) * spread;
      const rightX = cx + Math.cos(angle - side) * spread;
      const rightY = cy + Math.sin(angle - side) * spread;
      const tipX = Math.cos(angle) * outer;
      const tipY = Math.sin(angle) * outer;
      guide.moveTo(leftX, leftY);
      guide.lineTo(tipX, tipY);
      guide.lineTo(rightX, rightY);
    }
    guide.stroke({ width: 1.6 + urgency * 0.8, color, alpha });
    if (urgency > 0.72) {
      guide.circle(Math.cos(angle) * (pickupRadius + 14), Math.sin(angle) * (pickupRadius + 14), 3.5 + pulse * 1.5);
      guide.fill({ color: 0xffffff, alpha: 0.18 + urgency * 0.18 });
    }
    if (timeUrgency > 0.42) {
      timeoutTickCount = timeUrgency > 0.72 ? 4 : 3;
      const tickRadius = pickupRadius + 9;
      const tickSpread = 0.2 + timeUrgency * 0.08;
      for (let i = 0; i < timeoutTickCount; i += 1) {
        const tickAngle = angle + (i - (timeoutTickCount - 1) / 2) * tickSpread;
        const cx = Math.cos(tickAngle) * tickRadius;
        const cy = Math.sin(tickAngle) * tickRadius;
        const tx = Math.cos(tickAngle + side) * (3.5 + timeUrgency * 2.5);
        const ty = Math.sin(tickAngle + side) * (3.5 + timeUrgency * 2.5);
        guide.moveTo(cx - tx, cy - ty);
        guide.lineTo(cx + tx, cy + ty);
      }
      guide.stroke({ width: 1.8, color: 0xffffff, alpha: 0.2 + timeUrgency * 0.34 });
    }
    guide.visible = true;
    guide.__debugPickupGuide = {
      visible: true,
      distance: Math.round(distance),
      urgency: Number(urgency.toFixed(3)),
      distanceUrgency: Number(distanceUrgency.toFixed(3)),
      timeUrgency: Number(timeUrgency.toFixed(3)),
      pickupAssistRadius: Math.round(pickupRadius),
      dashCount,
      timeoutTickCount,
      edgeArrowCount: 0,
      angle: Number(angle.toFixed(3))
    };
  }

  drawPickupEdgeGuide(scene, guide, options = {}) {
    hideMicroSignals(guide);
    const game = scene?.gameplayGame || scene?.game || this.game;
    const width = Math.max(
      320,
      Number(game?.getWidth?.()) ||
      Number(game?.app?.screen?.width) ||
      Number(game?.width) ||
      1280
    );
    const height = Math.max(
      240,
      Number(game?.getHeight?.()) ||
      Number(game?.app?.screen?.height) ||
      Number(game?.height) ||
      720
    );
    const edgeInset = Math.max(24, Math.min(52, Math.min(width, height) * 0.044));
    const safeLeft = edgeInset;
    const safeRight = width - edgeInset;
    const safeTop = Math.max(edgeInset, Math.min(92, height * 0.13));
    const safeBottom = height - edgeInset;
    const offscreen = this.x < safeLeft || this.x > safeRight || this.y < safeTop || this.y > safeBottom;
    const distance = Number(options.distance) || 0;
    const guideRadius = Math.max(1, Number(options.guideRadius) || 230);
    const timeUrgency = clamp(Number(options.timeUrgency) || 0, 0, 1);
    const eligible = offscreen && timeUrgency > 0.42 && distance <= guideRadius * 3.4;
    if (!eligible) {
      return {
        visible: false,
        eligible,
        offscreen
      };
    }

    const worldX = Math.max(safeLeft, Math.min(safeRight, this.x));
    const worldY = Math.max(safeTop, Math.min(safeBottom, this.y));
    let dx = this.x - worldX;
    let dy = this.y - worldY;
    let dist = Math.hypot(dx, dy);
    if (!Number.isFinite(dist) || dist < 0.01) {
      dx = this.x < width / 2 ? -1 : 1;
      dy = 0;
      dist = 1;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    const rotation = -(Number(this.sprite?.rotation) || 0);
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    const localX = c * (worldX - this.x) - s * (worldY - this.y);
    const localY = s * (worldX - this.x) + c * (worldY - this.y);
    const localNx = c * nx - s * ny;
    const localNy = s * nx + c * ny;
    const pulse = Math.sin((Number(options.age) || 0) * 0.018) * 0.5 + 0.5;
    const major = MAJOR_POWERUP_TYPES.has(this.type);
    const color = this.type === 'super_extra_life' ? 0xffe34d : this.color;
    const arrowSize = major || this.type === 'super_extra_life' ? 16 : 13;
    const anchorX = localX + localNx * (2 + pulse * 3);
    const anchorY = localY + localNy * (2 + pulse * 3);

    guide.circle(anchorX, anchorY, arrowSize + 10 + pulse * 4);
    guide.stroke({ width: 1.4, color, alpha: 0.16 + timeUrgency * 0.22 });
    presentDirectionalSignal(guide, 'pickup-edge', {
      x: anchorX,
      y: anchorY,
      directionX: localNx,
      directionY: localNy,
      color,
      size: arrowSize * 3.35,
      alpha: 0.76 + timeUrgency * 0.24,
      pulse
    });

    return {
      visible: true,
      eligible: true,
      offscreen: true,
      edgeArrowCount: 1,
      anchor: {
        x: Math.round(worldX),
        y: Math.round(worldY)
      }
    };
  }

  collect(player, scene) {
    this.active = false;
    const collectedTypes = [this.type, ...this.bundledPowerupTypes];
    collectedTypes.forEach((type) => {
      scene?.recordThreatDiscovery?.(type, 'powerups', {
        name: POWERUP_CODEX_NAMES[type] || String(type || 'powerup').replace(/_/g, ' ').toUpperCase(),
        role: 'powerup pickup',
        sector: scene?.game?.level || 1
      }, { silent: true, scoreBonus: false });
    });

    // TASK 1: Premium powerup pickup effects
    this.showPickupEffect(scene);
    // Row Core owns one deliberately mixed four-second ritual. Playing the
    // ordinary pickup sting here used to cover its horn and first chant.
    if (this.type !== 'row_core') this.playPickupSFX(scene);

    const lifeGrant = Math.max(0, Math.round(Number(this.effect?.grantLives || (this.type === 'life' ? 1 : 0))));
    const grantsLives = lifeGrant > 0;
    const triggersBoardClear = this.effect?.boardClear === true;
    const configuredMaxLives = grantsLives
      ? Number(BalanceConfig.survival?.maxLives) || MAX_PLAYER_LIVES
      : null;
    const maxLives = Number.isFinite(configuredMaxLives)
      ? Math.max(1, configuredMaxLives)
      : Number.POSITIVE_INFINITY;
    const reachesMaxLives = grantsLives
      && Number.isFinite(maxLives)
      && scene.game.lives < maxLives
      && scene.game.lives + lifeGrant >= maxLives;
    const ownsPickupAudio = triggersBoardClear || this.type === 'row_core';
    const voiceOk = ownsPickupAudio ? true : (reachesMaxLives ? false : AudioManager.playPowerupVoice());
    if (!voiceOk && !reachesMaxLives) {
      AudioManager.playSfx('powerup', { force: true, volume: 0.9 });
    }

    // Pass type directly to player (Player handles reset)
    // Life Powerup Logic
    if (grantsLives) {
      scene.game.gainLife({
        count: lifeGrant,
        source: this.type
      });
      if (Number.isFinite(Number(this.effect?.invulnMs))) {
        player?.grantInvulnerability?.(Number(this.effect.invulnMs), this.type);
      }
      if (triggersBoardClear) {
        scene?.triggerNovaMiracle?.({
          type: this.type,
          x: this.x,
          y: this.y,
          color: this.color
        });
      }

      // Play distinct audio for life gain (not achievement audio per AUDIO_RULES.md)
      if (!triggersBoardClear && scene.game && scene.game.audio) {
        scene.game.audio.playSfx(this.type === 'super_extra_life' ? 'nova_rank_fanfare' : 'ui_open'); // Positive, distinct sound
      }
    } else {
      // Pass type directly to player (Player handles all powerup logic)
      player.applyPowerup(this.type);

      // shockwave: Also trigger scene effect (player.triggerShockwave handles damage/bullets)
      if (this.type === 'shockwave') {
        // Store scene reference for player to use
        player.lastScene = scene;
      }
    }

    for (const bundledType of this.bundledPowerupTypes) {
      const bundledMeta = getPowerupMeta(bundledType);
      const bundledEffect = bundledMeta?.effect || {};
      const bundledLifeGrant = Math.max(0, Math.round(Number(
        bundledEffect.grantLives || (bundledType === 'life' ? 1 : 0)
      )));
      if (bundledLifeGrant > 0) {
        scene.game.gainLife({ count: bundledLifeGrant, source: bundledType });
        if (Number.isFinite(Number(bundledEffect.invulnMs))) {
          player?.grantInvulnerability?.(Number(bundledEffect.invulnMs), bundledType);
        }
      } else {
        player.applyPowerup(bundledType);
        if (bundledType === 'shockwave') player.lastScene = scene;
      }
    }

    if (scene.debugStats) {
      scene.debugStats.bonusPickupsCollected++;
    }
    if (scene.debugPowerups) {
      console.log(`[PowerupTest] pickup types=${collectedTypes.join('+')}`);
      collectedTypes.forEach((type) => console.log(`[PowerupTest] applied type=${type} ok=true`));
    }
    this.showMessage(scene);
  }

  // TASK 1: Show premium visual effect on pickup
  showPickupEffect(scene) {
    if (!scene || !scene.particleManager) return;

    // Use existing particle system for pickup burst
    scene.particleManager.createPickupEffect(this.x, this.y, this.color);

    // Draw once and animate transforms only. Rebuilding Graphics every frame
    // created avoidable render stalls, while a scene-owned cleanup record keeps
    // interrupted or paused pickup rings from persisting.
    const ring = new PIXI.Graphics();
    ring.label = `powerup-pickup-ring-${this.type}`;
    ring.__novaPickupEffect = true;
    ring.__novaPowerupType = this.type;
    ring.x = this.x;
    ring.y = this.y;
    ring.alpha = 0.8;
    const maxRadius = this.type === 'nova_miracle' ? 101 : (this.type === 'super_extra_life' ? 61 : 45);
    ring.circle(0, 0, maxRadius);
    ring.stroke({
      width: this.type === 'nova_miracle' ? 7 : (this.type === 'super_extra_life' ? 4 : 3),
      color: this.color,
      alpha: 0.8
    });
    ring.scale.set(15 / maxRadius);
    scene.container.addChild(ring);

    const startedAt = performance.now();
    let cleaned = false;
    let ringTicker = null;
    const effectRecord = { ring, ticker: null, cleanup: null };
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      scene.game?.app?.ticker?.remove?.(ringTicker);
      if (ring.parent) ring.parent.removeChild(ring);
      ring.destroy?.();
      scene.activePickupEffects?.delete?.(effectRecord);
    };
    ringTicker = () => {
      if (!ring.parent || ring.destroyed || scene.game?.currentScene !== scene) {
        cleanup();
        return;
      }
      const progress = Math.min(1, (performance.now() - startedAt) / 400);
      const radius = 15 + progress * (maxRadius - 15);
      ring.scale.set(radius / maxRadius);
      ring.alpha = 1 - progress;
      if (progress >= 1) cleanup();
    };
    effectRecord.ticker = ringTicker;
    effectRecord.cleanup = cleanup;
    scene.activePickupEffects ||= new Set();
    scene.activePickupEffects.add(effectRecord);
    scene.game.app.ticker.add(ringTicker);
  }

  // TASK 1: Play category-specific pickup SFX
  playPickupSFX(scene) {
    const sfxKey = getPowerupMeta(this.type)?.sfx || 'powerup_pickup';
    AudioManager.playSfx(sfxKey);
  }

  showMessage(scene) {
    const { width, height } = scene.game.app.screen;
    const meta = getPowerupMeta(this.type);
    const message = translateText(meta?.pickupMessage || meta?.name || 'POWERUP!');
    if (typeof scene.enqueueToast === 'function') {
      const isMiracle = this.type === 'nova_miracle';
      scene.enqueueToast(message, {
        fontSize: isMiracle ? 38 : (this.type === 'super_extra_life' ? 30 : (this.type === 'bomb' || meta?.effect?.charges ? 30 : 24)),
        fill: this.color,
        stroke: '#000000',
        strokeThickness: isMiracle ? 7 : (this.type === 'super_extra_life' || this.type === 'bomb' || meta?.effect?.charges ? 5 : 4),
        slot: 'center',
        type: 'powerup',
        priority: isMiracle ? 10 : (this.type === 'super_extra_life' || this.type === 'bomb' || meta?.effect?.charges ? 8 : 2),
        duration: isMiracle ? 2800 : (this.type === 'super_extra_life' || this.type === 'bomb' || meta?.effect?.charges ? 2100 : 1500),
        y: height * 0.34,
        maxWidth: width * (isMiracle ? 0.78 : 0.62)
      });
      return;
    }

    const text = createText(message, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 20,
      fill: this.color,
      stroke: '#000000',
      strokeThickness: 3
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2 - 100;
    text.alpha = 0;
    scene.container.addChild(text);

    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      if (elapsed < 300) text.alpha = elapsed / 300;
      else if (elapsed > 1500) text.alpha = Math.max(0, (2000 - elapsed) / 500);
      else text.alpha = 1;

      if (elapsed >= 2000) {
        scene.game.app.ticker.remove(ticker);
        scene.container.removeChild(text);
      }
    };
    scene.game.app.ticker.add(ticker);
  }
}

export class PowerupManager {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.powerups = [];
    this.nextSpawnSequence = 1;
    this.spawnedEventKeys = new Map();
    this.spawnHistory = [];
    this.duplicateSpawnAttempts = [];
    this.dropsThisLevel = 0;
    this.dropsThisRun = 0; // Track total drops this run
    const runStartLevel = Math.max(1, Math.floor(Number(game?.level) || 1));
    this.currentLevel = runStartLevel;
    this.lastSpawnTime = Date.now();

    // Track extra life spawns for the rare long-gap guarantee.
    this.lastExtraLifeLevel = runStartLevel - 1;
    this.extraLifeSpawnedThisLevel = false;
    this.pendingGuaranteedExtraLifeLevel = null;
    this.novaMiracleSpawnedThisRun = false;

    this.debugPowerupsEnabled = false;
    this.debugPowerupTimer = 0;
    this.debugPowerupIndex = 0;
    this.debugPowerupTypes = ALL_POWERUP_TYPES;
  }

  checkLevelReset(level) {
    if (this.currentLevel !== level) {
      if (level === 1) {
        this.dropsThisRun = 0;
        this.lastExtraLifeLevel = 0; // Reset on game start
        this.novaMiracleSpawnedThisRun = false;
      }
      this.currentLevel = level;
      this.dropsThisLevel = 0;

      // TASK B: Reset extra life flag for new level
      this.extraLifeSpawnedThisLevel = false;

      // Force spawn guaranteed extra life if needed.
      const extraLifeDropsEnabled = BalanceConfig.powerups.extraLifeDropsEnabled === true;
      const levelsSinceLastLife = level - this.lastExtraLifeLevel;
      const guaranteedLifeLevels = Number(BalanceConfig.powerups.extraLifeGuaranteedEveryLevels) || 0;
      if (extraLifeDropsEnabled && guaranteedLifeLevels > 0 && levelsSinceLastLife >= guaranteedLifeLevels) {
        if (this.game?.scenes?.play?.overrunMilestoneInterlude?.active) {
          this.pendingGuaranteedExtraLifeLevel = level;
          console.log(`[PowerupManager] DEFER guaranteed extra life for level ${level} until overrun interlude clears`);
          return;
        }
        console.log(`[PowerupManager] FORCING guaranteed extra life for level ${level} (${levelsSinceLastLife} levels since last)`);
        this.forceExtraLifeSpawn();
      }
    }
  }

  flushPendingGuaranteedExtraLife() {
    const pendingLevel = Number(this.pendingGuaranteedExtraLifeLevel);
    if (!Number.isFinite(pendingLevel)) return;
    if (pendingLevel !== this.currentLevel) {
      this.pendingGuaranteedExtraLifeLevel = null;
      return;
    }
    if (this.game?.scenes?.play?.overrunMilestoneInterlude?.active) return;

    const extraLifeDropsEnabled = BalanceConfig.powerups.extraLifeDropsEnabled === true;
    const guaranteedLifeLevels = Number(BalanceConfig.powerups.extraLifeGuaranteedEveryLevels) || 0;
    const levelsSinceLastLife = pendingLevel - this.lastExtraLifeLevel;
    if (extraLifeDropsEnabled && guaranteedLifeLevels > 0 && levelsSinceLastLife >= guaranteedLifeLevels) {
      console.log(`[PowerupManager] FORCING deferred guaranteed extra life for level ${pendingLevel} (${levelsSinceLastLife} levels since last)`);
      this.forceExtraLifeSpawn();
    }
    this.pendingGuaranteedExtraLifeLevel = null;
  }

  forceExtraLifeSpawn() {
    // Spawn guaranteed extra life at safe, reachable position
    const screenWidth = this.game.getWidth ? this.game.getWidth() : 800;
    const safeX = screenWidth * 0.3 + Math.random() * screenWidth * 0.4; // Middle 40% of screen
    const safeY = 100 + Math.random() * 50; // Upper portion, reachable

    // Check if one already exists
    const lifeExists = this.powerups.some(p => p.type === 'life' && p.active);
    if (lifeExists) {
      console.log('[PowerupManager] Extra life already exists, skipping forced spawn');
      return;
    }

    const powerup = this.createPowerup(safeX, safeY, 'life', {
      source: 'guaranteed_extra_life',
      spawnKey: `guaranteed_extra_life:${this.currentLevel}`
    });
    if (!powerup) return;

    this.lastExtraLifeLevel = this.currentLevel;
    this.extraLifeSpawnedThisLevel = true;
    this.dropsThisLevel++;
    this.dropsThisRun++;

    console.log(`[PowerupManager] FORCED extra life spawned at ${Math.round(safeX)},${Math.round(safeY)}`);
  }

  spawn(x, y, force = false) {
    // Drop Cap check
    const MAX_DROPS_PER_LEVEL = BalanceConfig.powerups.maxPerLevel || 2;
    if (!force && this.dropsThisLevel >= MAX_DROPS_PER_LEVEL) {
      return;
    }

    const timeSinceLastMs = Date.now() - this.lastSpawnTime;
    const cooldownMs = BalanceConfig.powerups.cooldownMs || 18000;
    if (!force && timeSinceLastMs < cooldownMs) {
      return;
    }

    // ACTIVE POWERUP CHECK: Do not spawn if player already has one (except force)
    const player = this.game.scenes.play ? this.game.scenes.play.player : null;
    if (!force && player && player.activePowerup && player.activePowerup.type) {
      return;
    }

    let shouldSpawn = force;
    const sustainMult = this.game?.runPressureDirector?.getSustainMultiplier?.() || 1;
    let baseChance = (BalanceConfig.powerups.dropChance ?? 0.02) * sustainMult;

    // Dynamic Probability: Increase chance over time since last spawn
    const timeSinceLast = timeSinceLastMs / 1000;
    const growthPerSecond = (BalanceConfig.powerups.chanceGrowthPerSecond ?? 0.002) * sustainMult;
    const dynamicChance = baseChance + (timeSinceLast * growthPerSecond);
    const cappedChance = Math.min((BalanceConfig.powerups.maxDropChance ?? 0.12) * sustainMult, dynamicChance);

    if (!shouldSpawn) {
      shouldSpawn = Math.random() < cappedChance;
    }

    if (!shouldSpawn) {
      return;
    }

    this.lastSpawnTime = Date.now();

    // Drop selection
    const rand = Math.random();
    let type = 'triple_beam';

    // Check if player has shield active
    const shieldActive = player && player.shieldActive;

    // Extra lives are explicit only; ordinary random drops should not quietly add lives.
    const extraLifeDropsEnabled = BalanceConfig.powerups.extraLifeDropsEnabled === true;
    const levelsSinceLastLife = this.currentLevel - this.lastExtraLifeLevel;
    const guaranteedLifeLevels = Number(BalanceConfig.powerups.extraLifeGuaranteedEveryLevels) || 0;
    const needsGuaranteedLife = extraLifeDropsEnabled &&
      guaranteedLifeLevels > 0 &&
      levelsSinceLastLife >= guaranteedLifeLevels &&
      !this.extraLifeSpawnedThisLevel;

    const novaMiracleSlice = extraLifeDropsEnabled && this.canSpawnNovaMiracle()
      ? ((BalanceConfig.powerups.novaMiracleChance ?? 0) * sustainMult)
      : 0;
    const superExtraLifeThreshold = novaMiracleSlice
      + ((BalanceConfig.powerups.superExtraLifeChance ?? 0) * sustainMult);

    if (needsGuaranteedLife) {
      type = 'life';
      console.log(`[PowerupManager] GUARANTEED extra life spawned (${levelsSinceLastLife} levels since last)`);
      this.lastExtraLifeLevel = this.currentLevel;
      this.extraLifeSpawnedThisLevel = true;
    } else if (novaMiracleSlice > 0 && rand < novaMiracleSlice) {
      type = 'nova_miracle';
      this.novaMiracleSpawnedThisRun = true;
    } else if (extraLifeDropsEnabled &&
      this.canSpawnSuperExtraLife() &&
      rand < superExtraLifeThreshold) {
      type = 'super_extra_life';
      this.lastExtraLifeLevel = this.currentLevel;
      this.extraLifeSpawnedThisLevel = true;
    } else if (extraLifeDropsEnabled && rand < ((BalanceConfig.powerups.extraLifeChance ?? 0) * sustainMult)) {
      type = 'life';
      this.lastExtraLifeLevel = this.currentLevel;
      this.extraLifeSpawnedThisLevel = true;
    } else if (rand < 0.07) {
      type = 'row_core'; // Rare premium panic ritual.
    } else if (rand < 0.18 && !shieldActive) {
      type = 'shield'; // 11% uncommon, if no shield
    } else if (rand < 0.28) {
      // BOMB & SHOCKWAVE - 10% dedicated chance for most visible powerups
      const burstPowerups = ['bomb', 'shockwave', 'stasis_net', 'pulse_refund', 'saw_matrix', 'hull_hymn', 'nova_bloom'];
      type = burstPowerups[Math.floor(Math.random() * burstPowerups.length)];
    } else if (rand < 0.52) {
      // Spectacle powerups - 25% chance pool for high-readability showpieces.
      const spectaclePowerups = [
        'chain_lightning',
        'orbital_strike',
        'prism_splitter',
        'rail_surge',
        'drone_carousel',
        'plasma_lance',
        'void_crown',
        'swarm_contract',
        'helix_array',
        'static_bloom',
        'comet_drill',
        'packet_storm',
        'needle_rain',
        'boss_breaker',
        'mirror_palace'
      ];
      type = spectaclePowerups[Math.floor(Math.random() * spectaclePowerups.length)];
    } else if (rand < 0.62) {
      // Combat/support powerups - 10% chance pool
      const combatPowerups = [
        'score_x2',
        'score_fever',
        'jackpot_lens',
        'magnet',
        'gravity_well',
        'drones',
        'point_defense',
        'aegis_burst',
        'pierce',
        'damage_up',
        'target_paint',
        'nano_patch',
        'mercy_protocol',
        'sanctuary_field',
        'lucky_reactor',
        'graviton_crown',
        'scrap_vacuum',
        'chrono_jackpot',
        'dead_sun_dividend'
      ];
      type = combatPowerups[Math.floor(Math.random() * combatPowerups.length)];
    } else {
      // Standard powerups - remaining 40%
      const standardPowerups = [
        'ghost',
        'slow_time',
        'chrono_anchor',
        'blink_drive',
        'ion_dash',
        'rapid_cabinet',
        'overdrive_core',
        'triple_beam',
        'rapid_fire',
        'double_shot',
        'speed_up',
        'mirror_shots',
        'reactor_redline',
        'phase_dividend',
        'black_ice',
        'second_wind',
        'afterburner_choir'
      ];
      type = standardPowerups[Math.floor(Math.random() * standardPowerups.length)];
    }

    const powerup = this.createPowerup(x, y, type, { source: 'random_drop' });
    if (!powerup) return;

    console.log(`[PowerupManager] SPAWNED ${type} at ${Math.round(x)},${Math.round(y)}. Chance: ${(cappedChance * 100).toFixed(1)}%`);

    if (this.game.scenes.play && this.game.scenes.play.debugStats) {
      this.game.scenes.play.debugStats.bonusPickupsSpawned++;
    }
    this.dropsThisLevel++;
    this.dropsThisRun++;
  }

  update(delta, scene) {
    this.flushPendingGuaranteedExtraLife();
    this.updateDebugPowerups(delta, scene);
    this.powerups = this.powerups.filter(powerup => {
      powerup.update(delta, scene);
      if (!powerup.active) {
        this.container.removeChild(powerup.sprite);
        powerup.sprite?.destroy?.({ children: true });
        return false;
      }
      return true;
    });
  }

  updateDebugPowerups(delta, scene) {
    if (!scene?.debugPowerups) return;

    this.debugPowerupTimer += delta * 16.67;
    if (this.debugPowerupTimer < 3000) return;

    this.debugPowerupTimer = 0;
    const type = this.debugPowerupTypes[this.debugPowerupIndex % this.debugPowerupTypes.length];
    this.debugPowerupIndex += 1;
    const x = this.game.getWidth() * 0.5;
    const y = 120;
    this.spawnSpecific(x, y, type);
    console.log(`[PowerupTest] spawned type=${type}`);
  }

  canSpawnSuperExtraLife() {
    return !this.powerups.some((powerup) => powerup.type === 'super_extra_life' && powerup.active);
  }

  canSpawnNovaMiracle() {
    return this.novaMiracleSpawnedThisRun !== true
      && !this.powerups.some((powerup) => powerup.type === 'nova_miracle' && powerup.active);
  }

  normalizeSpawnKey(value) {
    const key = String(value || '').trim();
    return key || null;
  }

  createPowerup(x, y, type, options = {}) {
    const spawnKey = this.normalizeSpawnKey(options.spawnKey);
    if (spawnKey && this.spawnedEventKeys.has(spawnKey)) {
      const blocked = {
        spawnKey,
        source: options.source || 'specific',
        type,
        existingSpawnId: this.spawnedEventKeys.get(spawnKey),
        blockedAt: Date.now()
      };
      this.duplicateSpawnAttempts.push(blocked);
      if (this.duplicateSpawnAttempts.length > 24) this.duplicateSpawnAttempts.shift();
      console.warn(`[PowerupManager] BLOCKED duplicate logical spawn key=${spawnKey} type=${type} source=${blocked.source}`);
      return null;
    }

    const spawnId = `pickup-${this.nextSpawnSequence}`;
    this.nextSpawnSequence += 1;
    const powerup = new Powerup(x, y, type, {
      ...options,
      spawnId,
      spawnKey
    });
    this.powerups.push(powerup);
    this.container.addChild(powerup.sprite);
    if (spawnKey) this.spawnedEventKeys.set(spawnKey, spawnId);
    this.spawnHistory.push({
      spawnId,
      spawnKey,
      source: powerup.spawnSource || 'specific',
      type,
      bundledPowerupTypes: [...powerup.bundledPowerupTypes],
      rewardClaim: powerup.rewardClaim,
      rngIsolated: powerup.rngIsolated,
      lifeTimeMs: powerup.lifeTime,
      verticalSpeed: powerup.vy,
      pickupAssistRadius: powerup.pickupAssistRadius,
      x: Math.round(x),
      y: Math.round(y),
      spawnedAt: powerup.createdAt,
      collectibleAt: powerup.collectibleAt
    });
    if (this.spawnHistory.length > 64) this.spawnHistory.shift();
    return powerup;
  }

  spawnSpecific(x, y, type, options = {}) {
    const powerup = this.createPowerup(x, y, type, options);
    if (!powerup) return null;
    if (options.countDrop) {
      this.lastSpawnTime = Date.now();
      this.dropsThisLevel++;
      this.dropsThisRun++;
      if (this.game.scenes.play?.debugStats) {
        this.game.scenes.play.debugStats.bonusPickupsSpawned++;
      }
      if (type === 'nova_miracle') this.novaMiracleSpawnedThisRun = true;
    }
    const bundleLabel = powerup.bundledPowerupTypes.length
      ? ` bundle=${powerup.bundledPowerupTypes.join('+')}`
      : '';
    console.log(`[PowerupManager] SPAWNED ${type} at ${Math.round(x)},${Math.round(y)} source=${options.source || 'specific'}${bundleLabel}`);
    return powerup;
  }

  getDebugState() {
    return {
      activeCount: this.powerups.filter((powerup) => powerup?.active !== false).length,
      duplicateBlockedCount: this.duplicateSpawnAttempts.length,
      active: this.powerups
        .filter((powerup) => powerup?.active !== false)
        .map((powerup) => ({
          spawnId: powerup.spawnId,
          spawnKey: powerup.spawnKey,
          source: powerup.spawnSource,
          type: powerup.type,
          bundledPowerupTypes: [...(powerup.bundledPowerupTypes || [])],
          rewardClaim: powerup.rewardClaim,
          rngIsolated: powerup.rngIsolated,
          lifeTimeMs: powerup.lifeTime,
          verticalSpeed: powerup.vy,
          pickupAssistRadius: powerup.pickupAssistRadius,
          collectibleAt: powerup.collectibleAt,
          claimGraceRemainingMs: Math.max(0, powerup.collectibleAt - Date.now()),
          x: Math.round(Number(powerup.x) || 0),
          y: Math.round(Number(powerup.y) || 0)
        })),
      recentSpawns: this.spawnHistory.slice(-16).map((entry) => ({ ...entry })),
      blockedDuplicates: this.duplicateSpawnAttempts.slice(-8).map((entry) => ({ ...entry }))
    };
  }
}
