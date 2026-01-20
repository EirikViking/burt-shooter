import { BalanceConfig } from '../config/BalanceConfig.js';
import { GameAssets } from '../utils/GameAssets.js';
import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';

class Powerup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.radius = 12;
    this.vy = 1;
    this.createdAt = Date.now();
    this.lifeTime = 15000; // 15 seconds expiry

    const powerupData = {
      isbjorn: { color: 0xffaa00, label: 'ISBJØRN' },
      kjottdeig: { color: 0xff6666, label: 'KJØTTDEIG' },
      rolp: { color: 0xff00ff, label: 'RØLP' },
      deili: { color: 0x00ff00, label: 'DEILI' },
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
      shockwave: { color: 0xff9966, label: 'WAVE' }
    };

    const data = powerupData[type] || powerupData['isbjorn'];
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
    this.aura.name = 'aura';
    this.sprite.addChild(this.aura);

    try {
      let texture = null;
      // PART B: Load sprite for each powerup type
      if (this.type === 'shield') texture = GameAssets.getXtraPowerup('shield');
      else if (this.type === 'life') texture = GameAssets.getXtraPowerup('life');
      else if (this.type === 'ghost') texture = GameAssets.getXtraPowerup('ghost');
      else if (this.type === 'slow_time') texture = GameAssets.getXtraPowerup('slow_time');
      else if (this.type === 'isbjorn') texture = GameAssets.getXtraPowerup('isbjorn');
      else if (this.type === 'kjottdeig') texture = GameAssets.getXtraPowerup('kjottdeig');
      else if (this.type === 'rolp') texture = GameAssets.getXtraPowerup('rolp');
      else if (this.type === 'deili') texture = GameAssets.getXtraPowerup('deili');
      else if (this.type === 'rapid_fire') texture = GameAssets.getXtraPowerup('rolp');
      else if (this.type === 'double_shot') texture = GameAssets.getXtraPowerup('isbjorn');
      else if (this.type === 'damage_up') texture = GameAssets.getXtraPowerup('deili');
      else if (this.type === 'speed_up') texture = GameAssets.getXtraPowerup('kjottdeig');
      else if (this.type === 'pierce') texture = GameAssets.getXtraPowerup('ghost');
      else if (this.type === 'score_x2') texture = GameAssets.getXtraPowerup('slow_time');
      else if (this.type === 'magnet') texture = GameAssets.getXtraPowerup('ghost');
      else if (this.type === 'drones') texture = GameAssets.getXtraPowerup('rolp');
      else if (this.type === 'shockwave') texture = GameAssets.getXtraPowerup('deili');
      else texture = GameAssets.getBeer();

      if (GameAssets.isValidTexture(texture)) {
        const beerSprite = new PIXI.Sprite(texture);
        beerSprite.anchor.set(0.5);
        beerSprite.name = 'mainSprite';

        // PART B: Consistent scale for all powerup sprites
        const hasSprite = this.type === 'shield' || this.type === 'life' ||
          this.type === 'ghost' || this.type === 'slow_time' ||
          this.type === 'isbjorn' || this.type === 'kjottdeig' ||
          this.type === 'rolp' || this.type === 'deili' ||
          this.type === 'rapid_fire' || this.type === 'double_shot' ||
          this.type === 'damage_up' || this.type === 'speed_up' ||
          this.type === 'pierce' || this.type === 'score_x2' ||
          this.type === 'magnet' || this.type === 'drones' || this.type === 'shockwave';

        if (hasSprite) {
          beerSprite.scale.set(0.8);
        } else {
          beerSprite.width = 24;
          beerSprite.height = 32;
          beerSprite.tint = this.color;
        }

        this.sprite.addChild(beerSprite);
        this.mainSprite = beerSprite;

        // PART B: Store base scale to prevent runaway scaling
        this.baseScale = beerSprite.scale.x;

        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 15);
        glow.fill({ color: this.color, alpha: 0.25 });
        this.sprite.addChildAt(glow, 1);

        // No text overlay for icons
        if (this.type !== 'shield' && this.type !== 'life') {
          const text = new PIXI.Text(this.label[0], {
            fontFamily: 'Courier New',
            fontSize: 20,
            fill: '#ffffff',
            fontWeight: 'bold',
            stroke: 'black',
            strokeThickness: 2
          });
          text.anchor.set(0.5);
          this.sprite.addChild(text);
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

    const text = new PIXI.Text(this.label[0], {
      fontFamily: 'Courier New',
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
      const auraRadius = 18 + Math.sin(auraPhase) * 3;
      const auraAlpha = 0.3 + Math.sin(auraPhase) * 0.15;

      this.aura.clear();
      this.aura.circle(0, 0, auraRadius);
      this.aura.stroke({ width: 1.5, color: this.color, alpha: auraAlpha });
    }

    // TASK A: Ambient sparkles (spawn every 200-300ms, reduced distance)
    this.sparkleTimer += delta * 16.67;
    const sparkleInterval = 200 + Math.random() * 100;

    if (this.sparkleTimer > sparkleInterval && this.particleCount < 2 && scene && scene.particleManager) {
      this.sparkleTimer = 0;
      this.particleCount++;

      // Spawn tiny sparkle around powerup (reduced distance)
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 8;
      const sx = this.x + Math.cos(angle) * dist;
      const sy = this.y + Math.sin(angle) * dist;
      const vx = (Math.random() - 0.5) * 0.3;
      const vy = (Math.random() - 0.5) * 0.3;

      scene.particleManager.spawnParticle(sx, sy, vx, vy, this.color, 1.2, 18);

      // Decrement count after particle dies
      setTimeout(() => {
        this.particleCount = Math.max(0, this.particleCount - 1);
      }, 25);
    }

    // Scale down if expiring soon
    if (age > this.lifeTime - 2000) {
      this.sprite.alpha = 0.5 + Math.sin(age * 0.01) * 0.5;
    }

    if (this.y > 620 || age > this.lifeTime) {
      this.active = false;
    }
  }

  collect(player, scene) {
    this.active = false;

    // TASK 1: Premium powerup pickup effects
    this.showPickupEffect(scene);
    this.playPickupSFX(scene);
    const voiceOk = AudioManager.playPowerupVoice();
    if (!voiceOk) {
      AudioManager.playSfx('powerup', { force: true, volume: 0.9 });
    }

    // Pass type directly to player (Player handles reset)
    // Life Powerup Logic
    if (this.type === 'life') {
      const maxLives = 6; // TASK 3: Increased from 3 to 6
      if (scene.game.lives < maxLives) {
        scene.game.gainLife(); // Use the new gainLife() method
        scene.onLifeGained ? scene.onLifeGained() : null; // Optional hook

        // Play distinct audio for life gain (not achievement audio per AUDIO_RULES.md)
        if (scene.game && scene.game.audio) {
          scene.game.audio.playSfx('ui_open'); // Positive, distinct sound
        }
      } else {
        // Score bonus instead
        console.log(`[Lives] pickup extra_life before=${scene.game.lives} after=${scene.game.lives} max=6 applied=false (at max, bonus awarded)`);
        scene.game.addScore(1000);
        scene.showToast('MAX LIVES BONUS!', { fontSize: 24, fill: '#00ff00' });

        // Play pickup sound for bonus
        if (scene.game && scene.game.audio) {
          scene.game.audio.playSfx('pickup');
        }
      }
    } else {
      // Pass type directly to player (Player handles reset)
      if (this.type === 'score_x2') {
        if (scene.applyScoreMultiplier) {
          scene.applyScoreMultiplier(2, 10000, 'score_x2');
        }
      } else if (this.type === 'shockwave') {
        if (scene.triggerShockwave) {
          scene.triggerShockwave(player.x, player.y, 0xffaa33);
        }
        if (scene.bulletManager) {
          scene.bulletManager.enemyBullets.forEach(b => {
            b.active = false;
            if (b.sprite && b.sprite.parent) b.sprite.parent.removeChild(b.sprite);
          });
          scene.bulletManager.enemyBullets = [];
        }
      } else {
        player.applyPowerup(this.type);
      }
    }

    if (scene.debugStats) {
      scene.debugStats.beerPickupsCollected++;
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
    // Category-specific sounds
    const sfxMap = {
      life: 'ui_open',          // Extra life - positive, distinct
      shield: 'forceField',     // Shield - protective sound
      ghost: 'thrusterFire',    // Ghost mode - whoosh
      slow_time: 'forceField',  // Slow time - tech sound (removed annoying computerNoise)
      isbjorn: 'pickup',        // Weapon powerups - generic pickup
      kjottdeig: 'pickup',
      rolp: 'pickup',
      deili: 'pickup',
      rapid_fire: 'pickup',
      double_shot: 'pickup',
      damage_up: 'pickup',
      speed_up: 'pickup',
      pierce: 'pickup',
      score_x2: 'ui_open',
      magnet: 'pickup',
      drones: 'pickup',
      shockwave: 'powerup'
    };

    const sfxKey = sfxMap[this.type] || 'pickup';
    AudioManager.playSfx(sfxKey);
  }

  showMessage(scene) {
    const messages = {
      isbjorn: 'ISBJØRN CAN! Triple Shot!',
      kjottdeig: 'KJØTTDEIG BOOST! Speed Up!',
      rolp: 'RØLP MODE! Rapid Fire!',
      deili: 'DEILI FETTA! Ultimate Power!',
      slow_time: 'SLOW MOTION!',
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
      magnet: 'MAGNET FIELD!',
      drones: 'SIDE DRONES!',
      shockwave: 'SHOCKWAVE!'
    };

    const { width, height } = scene.game.app.screen;
    const text = new PIXI.Text(messages[this.type] || 'POWERUP!', {
      fontFamily: 'Courier New',
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

    // TASK 2: Track extra life spawns for guaranteed spawn every 2 levels
    this.lastExtraLifeLevel = 0;
    this.extraLifeSpawnedThisLevel = false;

    this.debugPowerupsEnabled = false;
    this.debugPowerupTimer = 0;
    this.debugPowerupIndex = 0;
    this.debugPowerupTypes = [
      'isbjorn',
      'rolp',
      'deili',
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
      'shockwave'
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

      // TASK B: Force spawn guaranteed extra life if needed
      const levelsSinceLastLife = level - this.lastExtraLifeLevel;
      if (levelsSinceLastLife >= 2) {
        console.log(`[PowerupManager] FORCING guaranteed extra life for level ${level} (${levelsSinceLastLife} levels since last)`);
        // Force spawn immediately at start of level
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
    const MAX_DROPS_PER_LEVEL = 3;
    if (!force && this.dropsThisLevel >= MAX_DROPS_PER_LEVEL) {
      return;
    }

    // ACTIVE POWERUP CHECK: Do not spawn if player already has one (except force)
    const player = this.game.scenes.play ? this.game.scenes.play.player : null;
    if (!force && player && player.activePowerup && player.activePowerup.type) {
      return;
    }

    let shouldSpawn = force;
    let baseChance = 0.04;

    // Dynamic Probability: Increase chance over time since last spawn
    const timeSinceLast = (Date.now() - this.lastSpawnTime) / 1000; // Seconds
    const dynamicChance = baseChance + (timeSinceLast * 0.005); // +0.5% per second
    const cappedChance = Math.min(0.25, dynamicChance); // Cap at 25%

    if (!shouldSpawn) {
      shouldSpawn = Math.random() < cappedChance;
    }

    if (!shouldSpawn) {
      return;
    }

    this.lastSpawnTime = Date.now();

    // Drop selection
    const rand = Math.random();
    let type = 'isbjorn';

    // Check if player has shield active
    const shieldActive = player && player.shieldActive;

    // TASK 2: Guaranteed extra life spawn if >= 2 levels without one
    const levelsSinceLastLife = this.currentLevel - this.lastExtraLifeLevel;
    const needsGuaranteedLife = levelsSinceLastLife >= 2 && !this.extraLifeSpawnedThisLevel;

    if (needsGuaranteedLife) {
      type = 'life';
      console.log(`[PowerupManager] GUARANTEED extra life spawned (${levelsSinceLastLife} levels since last)`);
      this.lastExtraLifeLevel = this.currentLevel;
      this.extraLifeSpawnedThisLevel = true;
    } else if (rand < 0.02) {
      type = 'life'; // 2% Very Rare
      this.lastExtraLifeLevel = this.currentLevel;
      this.extraLifeSpawnedThisLevel = true;
    } else if (rand < 0.15 && !shieldActive) {
      type = 'shield'; // 13% Uncommon, if no shield
    } else if (rand < 0.2) {
      type = 'score_x2';
    } else {
      // Remaining 85% - Standard Powerups
      const rareTypes = [
        'ghost',
        'slow_time',
        'rolp',
        'deili',
        'isbjorn',
        'rapid_fire',
        'double_shot',
        'damage_up',
        'speed_up',
        'pierce',
        'score_x2',
        'magnet',
        'drones',
        'shockwave'
      ];
      type = rareTypes[Math.floor(Math.random() * rareTypes.length)];
    }

    const powerup = new Powerup(x, y, type);
    this.powerups.push(powerup);
    this.container.addChild(powerup.sprite);

    console.log(`[PowerupManager] SPAWNED ${type} at ${Math.round(x)},${Math.round(y)}. Chance: ${(cappedChance * 100).toFixed(1)}%`);

    if (this.game.scenes.play && this.game.scenes.play.debugStats) {
      this.game.scenes.play.debugStats.beerPickupsSpawned++;
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

  spawnSpecific(x, y, type) {
    const powerup = new Powerup(x, y, type);
    this.powerups.push(powerup);
    this.container.addChild(powerup.sprite);
  }
}
