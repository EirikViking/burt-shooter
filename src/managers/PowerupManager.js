import { BalanceConfig, MAX_PLAYER_LIVES } from '../config/BalanceConfig.js';
import { GameAssets } from '../utils/GameAssets.js';
import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';
import { ALL_POWERUP_TYPES, getPowerupMeta } from '../config/PowerupCatalog.js';

const POWERUP_CODEX_NAMES = Object.freeze(Object.fromEntries(
  ALL_POWERUP_TYPES.map((type) => [type, getPowerupMeta(type)?.name || String(type).replace(/_/g, ' ').toUpperCase()])
));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * Math.max(0, max - min);
}

class Powerup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.radius = 12;
    this.vy = 1;
    this.createdAt = Date.now();
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
    if (Number.isFinite(Number(this.movement.verticalSpeed))) {
      this.vy = Number(this.movement.verticalSpeed);
    }
    if (Number.isFinite(Number(this.movement.lifeTimeMs))) {
      this.lifeTime = Math.max(4000, Number(this.movement.lifeTimeMs));
    }
    this.evasiveConfig = this.movement.evasive ? this.movement : null;
    this.evasiveVx = (Math.random() < 0.5 ? -1 : 1) * randomBetween(2.8, 5.8);
    this.evasiveTargetX = x;
    this.nextEvasiveJumpAt = randomBetween(120, 360);

    // TASK A: Idle animation state
    this.bobPhase = Math.random() * Math.PI * 2;
    this.pulsePhase = 0;
    this.sparkleTimer = 0;
    this.baseY = y;
    this.particleCount = 0; // Track particles per powerup

    this.createSprite();
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
        const maxIconSize = ['orbital_strike', 'shockwave', 'bomb', 'super_extra_life'].includes(this.type) ? 52 : 48;
        const scale = maxIconSize / Math.max(texture.width, texture.height);
        iconSprite.scale.set(scale);

        this.sprite.addChild(iconSprite);
        this.mainSprite = iconSprite;

        // Store base scale to prevent runaway pulsing.
        this.baseScale = iconSprite.scale.x;

        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 25);
        glow.fill({ color: this.color, alpha: this.type === 'super_extra_life' ? 0.48 : 0.34 });
        this.sprite.addChildAt(glow, 1);
        if (this.type === 'super_extra_life') {
          this.createSuperLifeOverlays();
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

  scheduleNextEvasiveJump(age) {
    const minMs = Number(this.evasiveConfig?.jumpIntervalMinMs) || 260;
    const maxMs = Math.max(minMs, Number(this.evasiveConfig?.jumpIntervalMaxMs) || 620);
    this.nextEvasiveJumpAt = age + randomBetween(minMs, maxMs);
  }

  updateEvasiveMovement(delta, scene, age) {
    if (!this.evasiveConfig) return false;
    const screenWidth = Math.max(
      320,
      Number(scene?.game?.app?.screen?.width) ||
      Number(scene?.game?.getWidth?.()) ||
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
      const jitter = randomBetween(
        -(Number(this.evasiveConfig.horizontalJitterPx) || 48),
        Number(this.evasiveConfig.horizontalJitterPx) || 48
      );
      this.evasiveTargetX = clamp(this.x + away * randomBetween(jumpMin, jumpMax) + jitter, minX, maxX);
      this.evasiveVx += away * randomBetween(2.2, 4.8);
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
        acceleration += direction * (Number(this.evasiveConfig.lateralAccel) || 2.2) * 18 * horizontalPressure * verticalPressure;
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

    // PART B: Apply pulse to main sprite using stable base scale (no accumulation)
    if (this.mainSprite && this.baseScale !== undefined) {
      const scale = this.baseScale * pulseScale;
      this.mainSprite.scale.set(scale, scale);
    }

    // Gentle rotation
    this.sprite.rotation += (this.type === 'super_extra_life' ? 0.045 : 0.02) * delta;

    // TASK A: Breathing aura ring (reduced size)
    if (this.aura) {
      const auraPhase = (age * 0.003) % (Math.PI * 2);
      const auraRadius = (this.type === 'super_extra_life' ? 29 : 24) + Math.sin(auraPhase) * 4;
      const auraAlpha = (this.type === 'super_extra_life' ? 0.56 : 0.42) + Math.sin(auraPhase) * 0.16;

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

    const screenHeight = Math.max(
      620,
      Number(scene?.game?.app?.screen?.height) ||
      Number(scene?.game?.getHeight?.()) ||
      Number(scene?.game?.height) ||
      620
    );
    this.updateExpiryCue(age, screenHeight);

    // TASK A: Ambient sparkles (spawn every 200-300ms, reduced distance)
    this.sparkleTimer += delta * 16.67;
    const sparkleInterval = 200 + Math.random() * 100;

    if (this.sparkleTimer > sparkleInterval && this.particleCount < 3 && scene && scene.particleManager) {
      this.sparkleTimer = 0;
      this.particleCount++;

      // Spawn tiny sparkle around powerup (reduced distance)
      const angle = Math.random() * Math.PI * 2;
      const dist = (this.type === 'super_extra_life' ? 19 : 14) + Math.random() * 13;
      const sx = this.x + Math.cos(angle) * dist;
      const sy = this.y + Math.sin(angle) * dist;
      const vx = (Math.random() - 0.5) * (this.type === 'super_extra_life' ? 0.8 : 0.3);
      const vy = (Math.random() - 0.5) * 0.3;

      scene.particleManager.spawnParticle(sx, sy, vx, vy, this.color, this.type === 'super_extra_life' ? 2.1 : 1.6, 22);

      // Decrement count after particle dies
      setTimeout(() => {
        this.particleCount = Math.max(0, this.particleCount - 1);
      }, 25);
    }

    const offscreenMargin = Math.max(90, this.radius * 6);

    if (this.y > screenHeight + offscreenMargin || (age > this.lifeTime && this.y > screenHeight)) {
      this.active = false;
    }
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
        alpha: this.sprite.alpha
      };
      return;
    }

    const urgent = urgency > 0.66;
    const color = urgent ? 0xff6174 : 0xffd36b;
    const radius = 36 + urgency * 8 + pulse * (urgent ? 4 : 2);
    const segmentCount = 8;
    const litSegments = Math.max(1, Math.ceil(segmentCount * urgency));

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
      urgent
    };
  }

  collect(player, scene) {
    this.active = false;
    scene?.recordThreatDiscovery?.(this.type, 'powerups', {
      name: POWERUP_CODEX_NAMES[this.type] || String(this.type || 'powerup').replace(/_/g, ' ').toUpperCase(),
      role: 'powerup pickup',
      sector: scene?.game?.level || 1
    }, { silent: true, scoreBonus: false });

    // TASK 1: Premium powerup pickup effects
    this.showPickupEffect(scene);
    this.playPickupSFX(scene);

    const lifeGrant = Math.max(0, Math.round(Number(this.effect?.grantLives || (this.type === 'life' ? 1 : 0))));
    const grantsLives = lifeGrant > 0;
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
    const voiceOk = reachesMaxLives ? false : AudioManager.playPowerupVoice();
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

      // Play distinct audio for life gain (not achievement audio per AUDIO_RULES.md)
      if (scene.game && scene.game.audio) {
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

    if (scene.debugStats) {
      scene.debugStats.bonusPickupsCollected++;
    }
    if (scene.debugPowerups) {
      console.log(`[PowerupTest] pickup type=${this.type}`);
      console.log(`[PowerupTest] applied type=${this.type} ok=true`);
    }
    this.showMessage(scene);
  }

  // TASK 1: Show premium visual effect on pickup
  showPickupEffect(scene) {
    if (!scene || !scene.particleManager) return;

    // Use existing particle system for pickup burst
    scene.particleManager.createPickupEffect(this.x, this.y, this.color);

    // Create expanding ring effect
    const ring = new PIXI.Graphics();
    ring.label = `powerup-pickup-ring-${this.type}`;
    ring.__novaPickupEffect = true;
    ring.__novaPowerupType = this.type;
    ring.x = this.x;
    ring.y = this.y;
    ring.alpha = 0.8;
    scene.container.addChild(ring);

    let ringTime = 0;
    const ringTicker = (delta) => {
      ringTime += delta.deltaTime * 16.67;
      const progress = ringTime / 400;

      if (progress < 1) {
        ring.clear();
      const radius = 15 + progress * (this.type === 'super_extra_life' ? 46 : 30);
      ring.circle(0, 0, radius);
      ring.stroke({ width: this.type === 'super_extra_life' ? 4 : 3, color: this.color, alpha: 0.8 * (1 - progress) });
        ring.alpha = 1 - progress;
      } else {
        scene.game.app.ticker.remove(ringTicker);
        scene.container.removeChild(ring);
      }
    };
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
    const message = translateText(meta?.pickupMessage || 'POWERUP!');
    if (typeof scene.enqueueToast === 'function') {
      scene.enqueueToast(message, {
        fontSize: this.type === 'super_extra_life' ? 30 : (this.type === 'bomb' || meta?.effect?.charges ? 30 : 24),
        fill: this.color,
        stroke: '#000000',
        strokeThickness: this.type === 'super_extra_life' || this.type === 'bomb' || meta?.effect?.charges ? 5 : 4,
        slot: 'center',
        type: 'powerup',
        priority: this.type === 'super_extra_life' || this.type === 'bomb' || meta?.effect?.charges ? 8 : 2,
        duration: this.type === 'super_extra_life' || this.type === 'bomb' || meta?.effect?.charges ? 2100 : 1500,
        y: height * 0.34,
        maxWidth: width * 0.62
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
    this.dropsThisLevel = 0;
    this.dropsThisRun = 0; // Track total drops this run
    this.currentLevel = 1;
    this.lastSpawnTime = Date.now();

    // Track extra life spawns for the rare long-gap guarantee.
    this.lastExtraLifeLevel = 0;
    this.extraLifeSpawnedThisLevel = false;
    this.pendingGuaranteedExtraLifeLevel = null;

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

    const powerup = new Powerup(safeX, safeY, 'life');
    this.powerups.push(powerup);
    this.container.addChild(powerup.sprite);

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

    if (needsGuaranteedLife) {
      type = 'life';
      console.log(`[PowerupManager] GUARANTEED extra life spawned (${levelsSinceLastLife} levels since last)`);
      this.lastExtraLifeLevel = this.currentLevel;
      this.extraLifeSpawnedThisLevel = true;
    } else if (extraLifeDropsEnabled &&
      this.canSpawnSuperExtraLife() &&
      rand < ((BalanceConfig.powerups.superExtraLifeChance ?? 0) * sustainMult)) {
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
      const burstPowerups = ['bomb', 'shockwave', 'stasis_net', 'pulse_refund', 'saw_matrix'];
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
        'swarm_contract'
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
        'mercy_protocol'
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
        'mirror_shots'
      ];
      type = standardPowerups[Math.floor(Math.random() * standardPowerups.length)];
    }

    const powerup = new Powerup(x, y, type);
    this.powerups.push(powerup);
    this.container.addChild(powerup.sprite);

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

  spawnSpecific(x, y, type, options = {}) {
    const powerup = new Powerup(x, y, type);
    this.powerups.push(powerup);
    this.container.addChild(powerup.sprite);
    if (options.countDrop) {
      this.lastSpawnTime = Date.now();
      this.dropsThisLevel++;
      this.dropsThisRun++;
      if (this.game.scenes.play?.debugStats) {
        this.game.scenes.play.debugStats.bonusPickupsSpawned++;
      }
    }
    console.log(`[PowerupManager] SPAWNED ${type} at ${Math.round(x)},${Math.round(y)} source=${options.source || 'specific'}`);
    return powerup;
  }
}
