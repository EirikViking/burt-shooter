import { BalanceConfig } from '../config/BalanceConfig.js';
import { GameAssets } from '../utils/GameAssets.js';
import * as PIXI from 'pixi.js';

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
      life: { color: 0xff0000, label: 'LIFE' }
    };

    const data = powerupData[type] || powerupData['isbjorn'];
    this.color = data.color;
    this.label = data.label;

    this.createSprite();
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    try {
      let texture = null;
      if (this.type === 'shield') texture = GameAssets.getXtraPowerup('powerupBlue_shield');
      else if (this.type === 'life') texture = GameAssets.getXtraPowerup('pill_red');
      else texture = GameAssets.getBeer();

      if (GameAssets.isValidTexture(texture)) {
        const beerSprite = new PIXI.Sprite(texture);
        beerSprite.anchor.set(0.5);

        // Reduce scale if using xtra assets vs beer assets which might be different sizes
        if (this.type === 'shield' || this.type === 'life') {
          beerSprite.scale.set(0.8);
        } else {
          beerSprite.width = 24;
          beerSprite.height = 32;
          beerSprite.tint = this.color;
        }

        this.sprite.addChild(beerSprite);

        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 20);
        glow.fill({ color: this.color, alpha: 0.3 });
        this.sprite.addChildAt(glow, 0);

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
    glow.circle(0, 0, this.radius + 4);
    glow.fill({ color: this.color, alpha: 0.3 });
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

  update(delta) {
    if (!this.active) return;
    this.y += this.vy * delta;
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation += 0.05 * delta;

    // Scale down if expiring soon
    const age = Date.now() - this.createdAt;
    if (age > this.lifeTime - 2000) {
      this.sprite.alpha = 0.5 + Math.sin(age * 0.01) * 0.5;
    }

    if (this.y > 620 || age > this.lifeTime) {
      if (this.active) {
        // Maybe play generic poof sound?
      }
      this.active = false;
    }
  }

  collect(player, scene) {
    this.active = false;

    // Pass type directly to player (Player handles reset)
    // Life Powerup Logic
    if (this.type === 'life') {
      const maxLives = 5;
      if (scene.game.lives < maxLives) {
        scene.game.gainLife ? scene.game.gainLife() : (scene.game.lives++);
        scene.onLifeGained ? scene.onLifeGained() : null; // Optional hook
      } else {
        // Score bonus instead
        scene.game.addScore(1000);
        scene.showToast('MAX LIVES BONUS!', { fontSize: 24, fill: '#00ff00' });
      }
    } else {
      // Pass type directly to player (Player handles reset)
      player.applyPowerup(this.type);
    }

    if (scene.debugStats) {
      scene.debugStats.beerPickupsCollected++;
    }
    this.showMessage(scene);

    // Play voice/sound? Managed in Player or Scene usually.
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
      life: 'EXTRA LIFE!'
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
  }

  checkLevelReset(level) {
    if (this.currentLevel !== level) {
      if (level === 1) this.dropsThisRun = 0;
      this.currentLevel = level;
      this.dropsThisLevel = 0;
    }
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

    if (rand < 0.02) {
      type = 'life'; // 2% Very Rare
    } else if (rand < 0.15 && !shieldActive) {
      type = 'shield'; // 13% Uncommon, if no shield
    } else {
      // Remaining 85% - Standard Powerups
      const rareTypes = ['ghost', 'slow_time', 'rolp', 'deili', 'isbjorn'];
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

  update(delta) {
    this.powerups = this.powerups.filter(powerup => {
      powerup.update(delta);
      if (!powerup.active) {
        this.container.removeChild(powerup.sprite);
        return false;
      }
      return true;
    });
  }
}
