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

    try {
      const texture = GameAssets.getPowerupTexture(this.type) || GameAssets.getBonusCoreTexture();

      if (GameAssets.isValidTexture(texture)) {
        const iconSprite = new PIXI.Sprite(texture);
        iconSprite.anchor.set(0.5);
        iconSprite.label = 'mainSprite';
        const maxIconSize = ['orbital_strike', 'shockwave', 'bomb'].includes(this.type) ? 52 : 48;
        const scale = maxIconSize / Math.max(texture.width, texture.height);
        iconSprite.scale.set(scale);

        this.sprite.addChild(iconSprite);
        this.mainSprite = iconSprite;

        // Store base scale to prevent runaway pulsing.
        this.baseScale = iconSprite.scale.x;

        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 25);
        glow.fill({ color: this.color, alpha: 0.34 });
        this.sprite.addChildAt(glow, 1);
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

    // Gentle rotation
    this.sprite.rotation += 0.02 * delta;

    // TASK A: Breathing aura ring (reduced size)
    if (this.aura) {
      const auraPhase = (age * 0.003) % (Math.PI * 2);
      const auraRadius = 24 + Math.sin(auraPhase) * 4;
      const auraAlpha = 0.42 + Math.sin(auraPhase) * 0.16;

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

    // TASK A: Ambient sparkles (spawn every 200-300ms, reduced distance)
    this.sparkleTimer += delta * 16.67;
    const sparkleInterval = 200 + Math.random() * 100;

    if (this.sparkleTimer > sparkleInterval && this.particleCount < 3 && scene && scene.particleManager) {
      this.sparkleTimer = 0;
      this.particleCount++;

      // Spawn tiny sparkle around powerup (reduced distance)
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 13;
      const sx = this.x + Math.cos(angle) * dist;
      const sy = this.y + Math.sin(angle) * dist;
      const vx = (Math.random() - 0.5) * 0.3;
      const vy = (Math.random() - 0.5) * 0.3;

      scene.particleManager.spawnParticle(sx, sy, vx, vy, this.color, 1.6, 22);

      // Decrement count after particle dies
      setTimeout(() => {
        this.particleCount = Math.max(0, this.particleCount - 1);
      }, 25);
    }

    const screenHeight = Math.max(
      620,
      Number(scene?.game?.app?.screen?.height) ||
      Number(scene?.game?.getHeight?.()) ||
      Number(scene?.game?.height) ||
      620
    );
    const offscreenMargin = Math.max(90, this.radius * 6);

    if (age > this.lifeTime - 2500 && this.y > screenHeight * 0.72) {
      this.sprite.alpha = 0.5 + Math.sin(age * 0.01) * 0.5;
    }

    if (this.y > screenHeight + offscreenMargin || (age > this.lifeTime && this.y > screenHeight)) {
      this.active = false;
    }
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

    const maxLives = this.type === 'life'
      ? Math.max(1, Number(BalanceConfig.survival?.maxLives) || MAX_PLAYER_LIVES)
      : null;
    const reachesMaxLives = this.type === 'life' && scene.game.lives < maxLives && scene.game.lives + 1 >= maxLives;
    const voiceOk = reachesMaxLives ? false : AudioManager.playPowerupVoice();
    if (!voiceOk && !reachesMaxLives) {
      AudioManager.playSfx('powerup', { force: true, volume: 0.9 });
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
        const radius = 15 + progress * 30;
        ring.circle(0, 0, radius);
        ring.stroke({ width: 3, color: this.color, alpha: 0.8 * (1 - progress) });
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
        fontSize: this.type === 'bomb' || meta?.effect?.charges ? 30 : 24,
        fill: this.color,
        stroke: '#000000',
        strokeThickness: this.type === 'bomb' || meta?.effect?.charges ? 5 : 4,
        slot: 'center',
        type: 'powerup',
        priority: this.type === 'bomb' || meta?.effect?.charges ? 8 : 2,
        duration: this.type === 'bomb' || meta?.effect?.charges ? 2100 : 1500,
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
    } else if (extraLifeDropsEnabled && rand < ((BalanceConfig.powerups.extraLifeChance ?? 0) * sustainMult)) {
      type = 'life';
      this.lastExtraLifeLevel = this.currentLevel;
      this.extraLifeSpawnedThisLevel = true;
    } else if (rand < 0.15 && !shieldActive) {
      type = 'shield'; // 13% Uncommon, if no shield
    } else if (rand < 0.25) {
      // BOMB & SHOCKWAVE - 10% dedicated chance for most visible powerups
      const burstPowerups = ['bomb', 'shockwave', 'stasis_net', 'pulse_refund', 'saw_matrix'];
      type = burstPowerups[Math.floor(Math.random() * burstPowerups.length)];
    } else if (rand < 0.50) {
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
    } else if (rand < 0.60) {
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
