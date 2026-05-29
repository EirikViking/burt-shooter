import { BalanceConfig, MAX_PLAYER_LIVES } from '../config/BalanceConfig.js';
import { GameAssets } from '../utils/GameAssets.js';
import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';

class Powerup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.radius = 12;
    this.vy = 1;
    this.createdAt = Date.now();
    this.lifeTime = 22000; // Long enough to visibly reach the bottom on tall screens.

    const powerupData = {
      triple_beam: { color: 0xffaa00, label: 'TRIPLE' },
      vector_boost: { color: 0xff6666, label: 'VECTOR' },
      rapid_cabinet: { color: 0xff00ff, label: 'RAPID' },
      overdrive_core: { color: 0x00ff00, label: 'OVERDRIVE' },
      slow_time: { color: 0x00cccc, label: 'SLOW' },
      ghost: { color: 0xeeeeee, label: 'GHOST' },
      shield: { color: 0x00aaaa, label: 'SHIELD' },
      life: { color: 0xff0000, label: 'LIFE' },
      rapid_fire: { color: 0xffcc00, label: 'RAPID' },
      double_shot: { color: 0x66ccff, label: 'DOUBLE' },
      damage_up: { color: 0xff6666, label: 'DMG+' },
      speed_up: { color: 0x66ff66, label: 'SPEED' },
      pierce: { color: 0xcc66ff, label: 'PIERCE' },
      score_x2: { color: 0xffff00, label: 'x2' },
      magnet: { color: 0x99ffcc, label: 'MAGNET' },
      drones: { color: 0x66ccff, label: 'DRONES' },
      shockwave: { color: 0xff9966, label: 'WAVE' },
      point_defense: { color: 0x00ddff, label: 'P-DEF' },
      bomb: { color: 0xff3300, label: 'BOMB' },
      chain_lightning: { color: 0xffff00, label: 'CHAIN' },
      orbital_strike: { color: 0xff00ff, label: 'ORBITAL' },
      vampire: { color: 0xff0066, label: 'VAMP' }
    };

    const data = powerupData[type] || powerupData['triple_beam'];
    this.color = data.color;
    this.label = data.label;

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

    try {
      const texture = GameAssets.getPowerupTexture(this.type);
      const fallbackTexture = GameAssets.getBonusCoreTexture();
      const displayTexture = GameAssets.isValidTexture(texture) ? texture : fallbackTexture;

      if (GameAssets.isValidTexture(displayTexture)) {
        const iconSprite = new PIXI.Sprite(displayTexture);
        iconSprite.anchor.set(0.5);
        iconSprite.label = 'mainSprite';
        const maxIconSize = ['orbital_strike', 'shockwave', 'bomb'].includes(this.type) ? 62 : 54;
        this.iconMaxSize = maxIconSize;
        this.applyIconTexture(iconSprite, displayTexture);

        this.sprite.addChild(iconSprite);
        this.mainSprite = iconSprite;

        // Store base scale to prevent runaway pulsing.
        this.baseScale = iconSprite.scale.x;
        this.loadSpecificIconTexture();

        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 27);
        glow.fill({ color: this.color, alpha: 0.34 });
        this.sprite.addChildAt(glow, 1);

        const iconRing = new PIXI.Graphics();
        iconRing.circle(0, 0, 28);
        iconRing.stroke({ color: this.color, width: 3.2, alpha: 0.96 });
        iconRing.circle(0, 0, 35);
        iconRing.stroke({ color: 0xffffff, width: 1.4, alpha: 0.46 });
        this.sprite.addChild(iconRing);
        this.iconRing = iconRing;

        const badgePlate = new PIXI.Graphics();
        badgePlate.roundRect(-31, 23, 62, 15, 4);
        badgePlate.fill({ color: 0x020711, alpha: 0.88 });
        badgePlate.stroke({ color: this.color, width: 1.5, alpha: 0.92 });
        this.sprite.addChild(badgePlate);
        this.badgePlate = badgePlate;

        const badgeLabel = createText(this.label, {
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: this.label.length > 6 ? 7 : 8,
          fill: '#fff6b6',
          stroke: '#020711',
          strokeThickness: 2,
          fontWeight: 'bold',
          align: 'center',
          letterSpacing: 0
        });
        badgeLabel.anchor.set(0.5);
        badgeLabel.y = 30.5;
        this.sprite.addChild(badgeLabel);
        this.badgeLabel = badgeLabel;
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
    this.baseY += this.vy * delta;
    this.y = this.baseY + bobOffset;
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // PART B: Apply pulse to main sprite using stable base scale (no accumulation)
    if (this.mainSprite && this.baseScale !== undefined) {
      const scale = this.baseScale * pulseScale;
      this.mainSprite.scale.set(scale, scale);
    }

    // Keep the pickup label readable while the core art spins.
    this.sprite.rotation = 0;
    if (this.mainSprite) {
      this.mainSprite.rotation += 0.022 * delta;
    }

    // TASK A: Breathing aura ring (reduced size)
    if (this.aura) {
      const auraPhase = (age * 0.003) % (Math.PI * 2);
      const auraRadius = 25 + Math.sin(auraPhase) * 5;
      const auraAlpha = 0.42 + Math.sin(auraPhase) * 0.22;

      this.aura.clear();
      this.aura.circle(0, 0, auraRadius);
      this.aura.stroke({ width: 1.5, color: this.color, alpha: auraAlpha });
    }
    if (this.iconRing) {
      const ringPulse = 1 + Math.sin(age * 0.006) * 0.045;
      this.iconRing.scale.set(ringPulse);
      this.iconRing.alpha = 0.82 + Math.sin(age * 0.008) * 0.16;
    }
    if (this.badgePlate) {
      this.badgePlate.alpha = 0.88 + Math.sin(age * 0.009) * 0.08;
    }

    // TASK A: Ambient sparkles (spawn every 200-300ms, reduced distance)
    this.sparkleTimer += delta * 16.67;
    const sparkleInterval = 200 + Math.random() * 100;

    if (this.sparkleTimer > sparkleInterval && this.particleCount < 4 && scene && scene.particleManager) {
      this.sparkleTimer = 0;
      this.particleCount++;

      // Spawn tiny sparkle around powerup (reduced distance)
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 16;
      const sx = this.x + Math.cos(angle) * dist;
      const sy = this.y + Math.sin(angle) * dist;
      const vx = (Math.random() - 0.5) * 0.3;
      const vy = (Math.random() - 0.5) * 0.3;

      scene.particleManager.spawnParticle(sx, sy, vx, vy, this.color, 1.8, 24);

      // Decrement count after particle dies
      setTimeout(() => {
        this.particleCount = Math.max(0, this.particleCount - 1);
      }, 40);
    }

    // Scale down if expiring soon
    if (age > this.lifeTime - 2000) {
      this.sprite.alpha = 0.5 + Math.sin(age * 0.01) * 0.5;
    }

    const screenHeight = scene?.game?.getHeight?.() || scene?.game?.app?.screen?.height || 620;
    const despawnY = screenHeight + Math.max(72, this.radius * 4);
    if (this.y > despawnY || age > this.lifeTime) {
      this.active = false;
    }
  }

  applyIconTexture(iconSprite, texture) {
    if (!iconSprite || !GameAssets.isValidTexture(texture)) return false;
    iconSprite.texture = texture;
    const maxIconSize = this.iconMaxSize || 54;
    const scale = maxIconSize / Math.max(texture.width, texture.height);
    iconSprite.scale.set(scale);
    this.baseScale = scale;
    return true;
  }

  loadSpecificIconTexture() {
    if (!this.mainSprite || GameAssets.isValidTexture(GameAssets.getPowerupTexture(this.type))) return;
    GameAssets.ensurePowerupTexture?.(this.type)?.then((texture) => {
      if (!this.active || !this.mainSprite || !GameAssets.isValidTexture(texture)) return;
      this.applyIconTexture(this.mainSprite, texture);
    });
  }

  collect(player, scene) {
    this.active = false;
    if (player && scene) {
      player.lastScene = scene;
    }

    // TASK 1: Premium powerup pickup effects
    this.showPickupEffect(scene);
    this.playPickupSFX(scene);

    const maxLives = this.type === 'life'
      ? Math.max(1, Number(BalanceConfig.survival?.maxLives) || MAX_PLAYER_LIVES)
      : null;
    const reachesMaxLives = this.type === 'life' && scene.game.lives < maxLives && scene.game.lives + 1 >= maxLives;
    const voiceOk = reachesMaxLives ? false : AudioManager.playPowerupVoice();
    if (!voiceOk && !reachesMaxLives) {
      AudioManager.playSfx('powerup', { force: true, volume: 1.0 });
    }

    // Pass type directly to player (Player handles reset)
    // Life Powerup Logic
    if (this.type === 'life') {
      if (scene.game.lives < maxLives) {
        scene.game.gainLife(); // Use the new gainLife() method

        // Play distinct audio for life gain (not achievement audio per AUDIO_RULES.md)
        if (scene.game && scene.game.audio) {
          scene.game.audio.playSfx('ui_open'); // Positive, distinct sound
        }
      } else {
        // Score bonus instead
        console.log(`[Lives] pickup extra_life before=${scene.game.lives} after=${scene.game.lives} max=${maxLives} applied=false (at max, bonus awarded)`);
        scene.game.addScore(1000);
        scene.showToast(translateText('MAX LIVES REACHED!'), { fontSize: 24, fill: '#00ff00' });

        // Play pickup sound for bonus
        if (scene.game && scene.game.audio) {
          scene.game.audio.playSfx('pickup');
        }
      }
    } else {
      // Pass type directly to player (Player handles all powerup logic)
      player.applyPowerup(this.type);
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
    const presentation = this.getPickupPresentation();
    const secondaryColor = presentation.secondaryColor || 0xffffff;

    // Use existing particle system for pickup burst
    scene.particleManager.createPickupEffect(this.x, this.y, this.color);
    for (let i = 0; i < presentation.extraBursts; i += 1) {
      scene.particleManager.createPickupEffect(
        this.x + (Math.random() - 0.5) * 10,
        this.y + (Math.random() - 0.5) * 10,
        i % 2 === 0 ? secondaryColor : this.color
      );
    }
    this.spawnPickupAccentParticles(scene, presentation);
    if (presentation.shake && scene.screenShake) {
      scene.screenShake.shake(presentation.shake, presentation.shakeDuration || 18);
      scene.screenShake.freezeFrame?.(presentation.freezeFrames || 2);
    }

    // Create expanding ring effect
    const ring = new PIXI.Graphics();
    const innerRing = new PIXI.Graphics();
    ring.x = this.x;
    ring.y = this.y;
    innerRing.x = this.x;
    innerRing.y = this.y;
    ring.alpha = 0.8;
    innerRing.alpha = 0.75;
    scene.container.addChild(ring, innerRing);

    let ringTime = 0;
    const ringTicker = (delta) => {
      ringTime += delta.deltaTime * 16.67;
      const progress = ringTime / presentation.durationMs;

      if (progress < 1) {
        ring.clear();
        innerRing.clear();
        const radius = presentation.radiusStart + progress * presentation.radiusGrowth;
        ring.circle(0, 0, radius);
        ring.stroke({ width: presentation.ringWidth, color: this.color, alpha: presentation.ringAlpha * (1 - progress) });
        if (presentation.doubleRing) {
          const innerRadius = Math.max(8, radius * (presentation.implode ? 1 - progress * 0.45 : 0.58));
          innerRing.circle(0, 0, innerRadius);
          innerRing.stroke({ width: 2, color: secondaryColor, alpha: 0.62 * (1 - progress) });
        }
        if (presentation.cross) {
          const line = radius * 0.9;
          innerRing.moveTo(-line, 0);
          innerRing.lineTo(line, 0);
          innerRing.moveTo(0, -line);
          innerRing.lineTo(0, line);
          innerRing.stroke({ width: 2, color: secondaryColor, alpha: 0.48 * (1 - progress) });
        }
        ring.alpha = 1 - progress;
        innerRing.alpha = 1 - progress;
      } else {
        scene.game.app.ticker.remove(ringTicker);
        scene.container.removeChild(ring);
        scene.container.removeChild(innerRing);
      }
    };
    scene.game.app.ticker.add(ringTicker);

    if (presentation.flashAlpha) {
      this.spawnPickupFlash(scene, presentation);
    }
    this.spawnPickupStarburst(scene, presentation);
  }

  // TASK 1: Play category-specific pickup SFX
  playPickupSFX(scene) {
    // Category-specific sounds
    const sfxMap = {
      life: ['life_up', 'achievement', 'pickup'],
      shield: ['shield_up', 'forceField', 'powerup'],
      ghost: ['ghost_phase_shift', 'forceField'],
      slow_time: ['time_slow_warp', 'powerup'],
      triple_beam: ['powerup', 'pickup'],
      vector_boost: ['thrusterFire', 'powerup', 'pickup'],
      rapid_cabinet: ['powerup', 'thrusterFire'],
      overdrive_core: ['powerup', 'achievement', 'forceField'],
      rapid_fire: ['thrusterFire', 'pickup'],
      double_shot: ['powerup', 'pickup'],
      damage_up: ['powerup', 'impactMetal'],
      speed_up: ['thrusterFire', 'pickup'],
      pierce: ['chain_lightning_arc', 'pickup'],
      score_x2: ['achievement', 'pickup'],
      magnet: ['magnet_pull', 'pickup'],
      drones: ['drone_launch_blip', 'powerup'],
      shockwave: ['explosionCrunch', 'forceField', 'powerup'],
      point_defense: ['forceField', 'shield_up', 'powerup'],
      bomb: ['explosionCrunch', 'orbital_strike_charge', 'powerup'],
      chain_lightning: ['chain_lightning_arc', 'powerup', 'forceField'],
      orbital_strike: ['orbital_strike_charge', 'achievement', 'powerup'],
      vampire: ['ghost_phase_shift', 'powerup', 'pickup']
    };

    const sfxKeys = sfxMap[this.type] || ['pickup'];
    sfxKeys.forEach((sfxKey, index) => {
      AudioManager.playSfx(sfxKey, {
        force: index === 0,
        volume: index === 0 ? 1.0 : 0.66,
        minIntervalMs: index === 0 ? 20 : 70
      });
    });
  }

  getPickupPresentation() {
    const dramatic = {
      extraBursts: 2,
      durationMs: 640,
      radiusStart: 20,
      radiusGrowth: 82,
      ringWidth: 5,
      ringAlpha: 0.98,
      doubleRing: true,
      cross: false,
      secondaryColor: 0xffffff,
      accentCount: 24,
      accentSpeed: 5.2,
      implode: false,
      shake: 4,
      freezeFrames: 1,
      starburst: true
    };
    const map = {
      life: { ...dramatic, secondaryColor: 0xfff3a2, cross: true, accentCount: 28, flashAlpha: 0.1 },
      shield: { ...dramatic, secondaryColor: 0x8ffcff, radiusGrowth: 92, accentCount: 20 },
      ghost: { ...dramatic, secondaryColor: 0xb8c7ff, implode: true, accentSpeed: 3.1 },
      slow_time: { ...dramatic, secondaryColor: 0x7fffd8, radiusGrowth: 104, accentSpeed: 2.2, flashAlpha: 0.1 },
      score_x2: { ...dramatic, secondaryColor: 0xffef7e, extraBursts: 3, accentCount: 34, flashAlpha: 0.12 },
      magnet: { ...dramatic, secondaryColor: 0x99ffcc, implode: true, radiusGrowth: 96, accentCount: 30 },
      drones: { ...dramatic, secondaryColor: 0x66ccff, accentCount: 30 },
      shockwave: { ...dramatic, secondaryColor: 0xffe4a8, extraBursts: 3, radiusGrowth: 168, ringWidth: 7, accentCount: 36, flashAlpha: 0.18, shake: 13, freezeFrames: 2 },
      point_defense: { ...dramatic, secondaryColor: 0xd9fdff, radiusGrowth: 76, cross: true },
      bomb: { ...dramatic, secondaryColor: 0xffd15c, extraBursts: 4, radiusGrowth: 162, ringWidth: 7, accentCount: 40, flashAlpha: 0.22, shake: 15, freezeFrames: 3 },
      chain_lightning: { ...dramatic, secondaryColor: 0xffffff, extraBursts: 2, cross: true, accentCount: 38, flashAlpha: 0.12, shake: 9 },
      orbital_strike: { ...dramatic, secondaryColor: 0xff9cff, extraBursts: 4, radiusGrowth: 182, cross: true, accentCount: 42, flashAlpha: 0.2, shake: 16, freezeFrames: 3 },
      vampire: { ...dramatic, secondaryColor: 0xff8ab6, implode: true, extraBursts: 2, accentCount: 30, flashAlpha: 0.12, shake: 8 }
    };
    return map[this.type] || {
      ...dramatic,
      extraBursts: ['overdrive_core', 'rapid_cabinet', 'vector_boost'].includes(this.type) ? 3 : 1,
      secondaryColor: this.type === 'speed_up' || this.type === 'vector_boost' ? 0x66ff66 : 0xffffff,
      accentCount: ['overdrive_core', 'rapid_cabinet', 'pierce', 'vector_boost'].includes(this.type) ? 32 : 22,
      radiusGrowth: ['overdrive_core', 'rapid_cabinet', 'vector_boost'].includes(this.type) ? 98 : 72
    };
  }

  spawnPickupAccentParticles(scene, presentation) {
    const count = Math.max(0, Math.floor(presentation.accentCount || 0));
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / Math.max(1, count);
      const inward = presentation.implode ? -1 : 1;
      const speed = (presentation.accentSpeed || 3) * (0.75 + Math.random() * 0.5);
      const spawnRadius = presentation.implode ? 46 + Math.random() * 24 : 4;
      const x = this.x + Math.cos(angle) * spawnRadius;
      const y = this.y + Math.sin(angle) * spawnRadius;
      scene.particleManager.spawnParticle(
        x,
        y,
        Math.cos(angle) * speed * inward,
        Math.sin(angle) * speed * inward - 0.8,
        i % 2 === 0 ? this.color : presentation.secondaryColor,
        2.6 + Math.random() * 3.4,
        42 + Math.random() * 34
      );
    }
  }

  spawnPickupStarburst(scene, presentation) {
    if (!presentation.starburst || !scene?.container || !scene?.game?.app?.ticker) return;
    const burst = new PIXI.Graphics();
    burst.x = this.x;
    burst.y = this.y;
    burst.blendMode = 'add';
    scene.container.addChild(burst);
    let elapsed = 0;
    const duration = Math.max(260, Math.min(760, presentation.durationMs || 520));
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      const t = Math.min(1, elapsed / duration);
      const radius = 22 + t * (presentation.radiusGrowth || 80);
      const alpha = 0.72 * (1 - t);
      burst.clear();
      const spokes = presentation.cross ? 12 : 9;
      for (let i = 0; i < spokes; i += 1) {
        const angle = (Math.PI * 2 * i) / spokes + t * 0.55;
        const inner = radius * 0.22;
        const outer = radius * (0.82 + (i % 2) * 0.18);
        burst.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        burst.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      }
      burst.stroke({ color: this.color, width: 3.2, alpha });
      burst.circle(0, 0, radius * 0.42);
      burst.stroke({ color: presentation.secondaryColor || 0xffffff, width: 1.8, alpha: alpha * 0.72 });
      if (t >= 1) {
        scene.game.app.ticker.remove(ticker);
        if (burst.parent) burst.parent.removeChild(burst);
      }
    };
    scene.game.app.ticker.add(ticker);
  }

  spawnPickupFlash(scene, presentation) {
    const flash = new PIXI.Graphics();
    const width = scene.game?.getWidth?.() || scene.game?.app?.screen?.width || 800;
    const height = scene.game?.getHeight?.() || scene.game?.app?.screen?.height || 600;
    flash.rect(0, 0, width, height);
    flash.fill({ color: presentation.secondaryColor || this.color, alpha: presentation.flashAlpha });
    flash.eventMode = 'none';
    scene.container.addChild(flash);
    let elapsed = 0;
    const duration = 220;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      const t = Math.min(1, elapsed / duration);
      flash.alpha = 1 - t;
      if (t >= 1) {
        scene.game.app.ticker.remove(ticker);
        if (flash.parent) flash.parent.removeChild(flash);
      }
    };
    scene.game.app.ticker.add(ticker);
  }

  showMessage(scene) {
    const messages = {
      triple_beam: 'TRIPLE BEAM! Triple Shot!',
      vector_boost: 'VECTOR BOOST! Speed Up!',
      rapid_cabinet: 'RAPID CABINET! Rapid Fire!',
      overdrive_core: 'OVERDRIVE CORE! Ultimate Power!',
      slow_time: 'SLOW MOTION!',
      ghost: 'GHOST MODE! Invincible!',
      shield: 'SHIELD UP!',
      life: 'EXTRA LIFE!',
      rapid_fire: 'RAPID FIRE!',
      double_shot: 'DOUBLE SHOT!',
      damage_up: 'DAMAGE UP!',
      speed_up: 'SPEED UP!',
      pierce: 'PIERCING SHOTS!',
      score_x2: 'SCORE x2!',
      magnet: 'MAGNET FIELD: PULLS PICKUPS',
      drones: 'SIDE DRONES!',
      shockwave: 'SHOCKWAVE!',
      point_defense: 'POINT DEFENSE!',
      bomb: 'BOMB',
      chain_lightning: 'CHAIN LIGHTNING!',
      orbital_strike: 'ORBITAL STRIKE!',
      vampire: 'VAMPIRE DRAIN!'
    };

    const { width, height } = scene.game.app.screen;
    const text = createText(translateText(messages[this.type] || 'POWERUP!'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 24,
      fill: this.color,
      stroke: '#000000',
      strokeThickness: 4,
      fontWeight: 'bold'
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
      text.scale.set(1 + Math.sin(elapsed * 0.015) * 0.08);

      if (elapsed >= 2000) {
        scene.game.app.ticker.remove(ticker);
        if (text.parent) scene.container.removeChild(text);
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

    this.debugPowerupsEnabled = false;
    this.debugPowerupTimer = 0;
    this.debugPowerupIndex = 0;
    this.debugPowerupTypes = [
      'triple_beam',
      'vector_boost',
      'rapid_cabinet',
      'overdrive_core',
      'slow_time',
      'ghost',
      'life',
      'shield',
      'rapid_fire',
      'double_shot',
      'damage_up',
      'speed_up',
      'pierce',
      'score_x2',
      'magnet',
      'drones',
      'shockwave',
      'point_defense',
      'bomb',
      'chain_lightning',
      'orbital_strike',
      'vampire'
    ];
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
        console.log(`[PowerupManager] FORCING guaranteed extra life for level ${level} (${levelsSinceLastLife} levels since last)`);
        this.forceExtraLifeSpawn();
      }
    }
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
    } else if (extraLifeDropsEnabled && rand < ((BalanceConfig.powerups.extraLifeChance ?? 0) * sustainMult)) {
      type = 'life';
      this.lastExtraLifeLevel = this.currentLevel;
      this.extraLifeSpawnedThisLevel = true;
    } else if (rand < 0.15 && !shieldActive) {
      type = 'shield'; // 13% Uncommon, if no shield
    } else if (rand < 0.25) {
      // BOMB & SHOCKWAVE - 10% dedicated chance for most visible powerups
      type = Math.random() < 0.5 ? 'bomb' : 'shockwave';
    } else if (rand < 0.50) {
      // OTHER NEW POWERUPS - 25% chance pool for remaining new powerups
      const newPowerups = [
        'chain_lightning',
        'orbital_strike'
      ];
      type = newPowerups[Math.floor(Math.random() * newPowerups.length)];
    } else if (rand < 0.60) {
      // Combat powerups - 10% chance pool
      const combatPowerups = [
        'score_x2',
        'magnet',
        'drones',
        'point_defense',
        'pierce',
        'damage_up'
      ];
      type = combatPowerups[Math.floor(Math.random() * combatPowerups.length)];
    } else {
      // Standard powerups - remaining 40%
      const standardPowerups = [
        'ghost',
        'slow_time',
        'rapid_cabinet',
        'overdrive_core',
        'triple_beam',
        'rapid_fire',
        'double_shot',
        'speed_up'
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
