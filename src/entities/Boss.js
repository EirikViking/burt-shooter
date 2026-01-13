import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { extendBossNames } from '../text/phrasePool.js';

export class Boss {
  constructor(x, y, level, game) {
    this.x = x;
    this.y = y;
    this.level = level;
    this.active = true;
    this.game = game;
    this.radius = 50;
    this.vx = 2;
    this.vy = 0;
    // BALANCING: Increased Boss HP (+15-20%)
    // Old: 50 + level*20
    this.health = 60 + level * 25;
    this.maxHealth = this.health;
    this.shootCooldown = 0;
    this.shootDelay = 30;
    this.moveTimer = 0;
    this.scoreValue = 1000;
    this.phase = 1;
    this.color = 0xff00ff;

    // Boss names
    const bossNames = [
      'MEGA TUFS',
      'ULTIMATE SVIN',
      'SUPER MONGO',
      'HYPER R\u00d8LP',
      'DEILI FETTA PRIME',
      'GIGA GRIS'
    ];
    const namePool = extendBossNames(bossNames);
    this.name = namePool[(level - 1) % namePool.length] || 'BOSS';

    this.createSprite();
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Main body
    this.body = new PIXI.Graphics();
    this.body.circle(0, 0, this.radius);
    this.body.fill({ color: this.color });
    this.body.stroke({ color: 0xff0000, width: 4 });
    this.sprite.addChild(this.body);

    // Multiple eyes
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 * i) / 3;
      const eyeX = Math.cos(angle) * 20;
      const eyeY = Math.sin(angle) * 20;

      const eye = new PIXI.Graphics();
      eye.circle(eyeX, eyeY, 8);
      eye.fill({ color: 0xff0000 });
      eye.circle(eyeX, eyeY, 4);
      eye.fill({ color: 0xffff00 });
      this.sprite.addChild(eye);
    }

    // Armor plates
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const plateX = Math.cos(angle) * this.radius;
      const plateY = Math.sin(angle) * this.radius;

      const plate = new PIXI.Graphics();
      plate.rect(plateX - 5, plateY - 8, 10, 16);
      plate.fill({ color: 0x666666 });
      this.sprite.addChild(plate);
    }

    // Health bar
    this.healthBar = new PIXI.Graphics();
    this.updateHealthBar();
    this.sprite.addChild(this.healthBar);

    // Name display
    this.nameText = new PIXI.Text(this.name, {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ff0000',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.nameText.anchor.set(0.5);
    this.nameText.y = -this.radius - 30;
    this.sprite.addChild(this.nameText);
  }

  updateHealthBar() {
    if (!this.healthBar) return;

    this.healthBar.clear();
    const barWidth = this.radius * 3;
    const barHeight = 8;
    const healthPercent = this.health / this.maxHealth;

    this.healthBar.rect(-barWidth / 2, this.radius + 10, barWidth, barHeight);
    this.healthBar.fill({ color: 0x333333 });

    this.healthBar.rect(-barWidth / 2, this.radius + 10, barWidth * healthPercent, barHeight);
    this.healthBar.fill({ color: 0xff0000 });

    // Health text
    const healthText = `${Math.max(0, this.health)}/${this.maxHealth}`;
    if (this.healthText) {
      this.healthBar.removeChild(this.healthText);
    }
    this.healthText = new PIXI.Text(healthText, {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#ffffff'
    });
    this.healthText.anchor.set(0.5);
    this.healthText.y = this.radius + 14;
    this.healthBar.addChild(this.healthText);
  }

  update(delta, playerX, playerY) {
    if (!this.active) return;

    this.moveTimer += delta;

    // Complex movement pattern
    if (this.phase === 1) {
      // Horizontal sweep
      this.x += this.vx * delta;
      const width = this.game?.getWidth ? this.game.getWidth() : 800;
      if (this.x < this.radius || this.x > width - this.radius) {
        this.vx *= -1;
      }
    } else if (this.phase === 2) {
      // Figure-8 pattern
      const t = this.moveTimer * 0.02;
      this.x = 400 + Math.sin(t) * 200;
      this.y = 150 + Math.sin(t * 2) * 50;
    } else {
      // Aggressive chase
      const dx = playerX - this.x;
      const dy = (playerY - 100) - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 5) {
        this.x += (dx / distance) * 1.5 * delta;
        this.y += (dy / distance) * 1.5 * delta;
      }
    }

    // Phase transitions
    if (this.health < this.maxHealth * 0.66 && this.phase === 1) {
      this.phase = 2;
      this.shootDelay = 20;
      this.color = 0xff8800;
    } else if (this.health < this.maxHealth * 0.33 && this.phase === 2) {
      this.phase = 3;
      this.shootDelay = 15;
      this.color = 0xff0000;
    }

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Rotation
    this.sprite.rotation += 0.005 * delta;

    // Pulsing effect
    const pulse = 1 + Math.sin(this.moveTimer * 0.05) * 0.1;
    this.sprite.scale.set(pulse);

    // Shooting cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }
  }

  canShoot() {
    return this.shootCooldown <= 0;
  }

  shoot(playerX, playerY) {
    this.shootCooldown = this.shootDelay;
    const bullets = [];

    if (this.phase === 1) {
      // Single aimed shot
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = 4; // Reduced from 5
      bullets.push(new Bullet(
        this.x,
        this.y,
        (dx / distance) * speed,
        (dy / distance) * speed,
        1,
        this.color,
        false
      ));
    } else if (this.phase === 2) {
      // Triple shot
      for (let i = -1; i <= 1; i++) {
        const angle = Math.atan2(playerY - this.y, playerX - this.x) + i * 0.3;
        const speed = 4; // Reduced from 5
        bullets.push(new Bullet(
          this.x,
          this.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          1,
          this.color,
          false
        ));
      }
    } else {
      // Spiral pattern
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + this.moveTimer * 0.05;
        const speed = 3.5; // Reduced from 4
        bullets.push(new Bullet(
          this.x,
          this.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          1,
          this.color,
          false
        ));
      }
    }

    return bullets;
  }

  takeDamage(amount) {
    this.health -= amount;
    this.updateHealthBar();

    // Hit flash
    this.sprite.tint = 0xffffff;
    setTimeout(() => {
      if (this.sprite) this.sprite.tint = 0xffffff;
    }, 50);

    if (this.health <= 0) {
      this.active = false;
      return true; // Destroyed
    }
    return false;
  }
}
