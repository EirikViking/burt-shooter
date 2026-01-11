import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';

export class Enemy {
  constructor(x, y, type, level) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = level;
    this.active = true;
    this.radius = 15;
    this.vx = 0;
    this.vy = 0;
    this.health = 1;
    this.maxHealth = 1;
    this.shootCooldown = 0;
    this.shootDelay = 120;
    this.movePattern = 'sine';
    this.moveTimer = 0;
    this.scoreValue = 10;

    this.setupByType();
    this.createSprite();
  }

  setupByType() {
    switch (this.type) {
      case 'gris':
        this.color = 0xff69b4;
        this.health = 1;
        this.maxHealth = 1;
        this.scoreValue = 10;
        this.speed = 1 + this.level * 0.1;
        this.shootDelay = 120;
        break;

      case 'mongo':
        this.color = 0x8b4513;
        this.health = 2;
        this.maxHealth = 2;
        this.scoreValue = 20;
        this.speed = 1.5 + this.level * 0.1;
        this.shootDelay = 90;
        this.radius = 18;
        break;

      case 'tufs':
        this.color = 0xffaa00;
        this.health = 3;
        this.maxHealth = 3;
        this.scoreValue = 30;
        this.speed = 0.8 + this.level * 0.1;
        this.shootDelay = 60;
        this.radius = 20;
        this.movePattern = 'zigzag';
        break;

      case 'deili':
        this.color = 0x00ff00;
        this.health = 4;
        this.maxHealth = 4;
        this.scoreValue = 50;
        this.speed = 2 + this.level * 0.1;
        this.shootDelay = 75;
        this.radius = 16;
        this.movePattern = 'circle';
        break;

      case 'rolp':
        this.color = 0xff00ff;
        this.health = 5;
        this.maxHealth = 5;
        this.scoreValue = 75;
        this.speed = 1.2 + this.level * 0.1;
        this.shootDelay = 45;
        this.radius = 22;
        this.movePattern = 'drunk';
        break;

      case 'svin':
        this.color = 0xff0000;
        this.health = 8;
        this.maxHealth = 8;
        this.scoreValue = 100;
        this.speed = 0.5 + this.level * 0.1;
        this.shootDelay = 90;
        this.radius = 25;
        this.movePattern = 'aggressive';
        break;
    }
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Body (hexagon for variety)
    this.body = new PIXI.Graphics();
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides;
      const nextAngle = (Math.PI * 2 * (i + 1)) / sides;
      const x1 = Math.cos(angle) * this.radius;
      const y1 = Math.sin(angle) * this.radius;
      const x2 = Math.cos(nextAngle) * this.radius;
      const y2 = Math.sin(nextAngle) * this.radius;

      if (i === 0) {
        this.body.moveTo(x1, y1);
      }
      this.body.lineTo(x2, y2);
    }
    this.body.closePath();
    this.body.fill({ color: this.color });
    const strokeColor = Math.max(0, this.color - 0x222222);
    this.body.stroke({ color: strokeColor, width: 2 });
    this.sprite.addChild(this.body);

    // Eye (menacing)
    const eye = new PIXI.Graphics();
    eye.circle(0, -3, 4);
    eye.fill({ color: 0xff0000 });
    this.sprite.addChild(eye);

    // Health bar
    this.healthBar = new PIXI.Graphics();
    this.updateHealthBar();
    this.sprite.addChild(this.healthBar);
  }

  updateHealthBar() {
    if (!this.healthBar) return;

    this.healthBar.clear();
    const barWidth = this.radius * 2;
    const barHeight = 3;
    const healthPercent = this.health / this.maxHealth;

    this.healthBar.rect(-barWidth / 2, this.radius + 5, barWidth, barHeight);
    this.healthBar.fill({ color: 0x333333 });

    this.healthBar.rect(-barWidth / 2, this.radius + 5, barWidth * healthPercent, barHeight);
    this.healthBar.fill({ color: healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000 });
  }

  update(delta, playerX, playerY) {
    if (!this.active) return;

    this.moveTimer += delta;

    // Movement patterns
    switch (this.movePattern) {
      case 'sine':
        this.vx = Math.sin(this.moveTimer * 0.05) * this.speed;
        this.vy = this.speed * 0.3;
        break;

      case 'zigzag':
        this.vx = Math.sin(this.moveTimer * 0.1) * this.speed * 2;
        this.vy = this.speed * 0.4;
        break;

      case 'circle':
        const radius = 50;
        const angle = this.moveTimer * 0.05;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed * 0.5 + 0.5;
        break;

      case 'drunk':
        this.vx = Math.sin(this.moveTimer * 0.15) * this.speed * 3;
        this.vy = Math.cos(this.moveTimer * 0.1) * this.speed * 0.5 + 0.5;
        break;

      case 'aggressive':
        // Move towards player
        const dx = playerX - this.x;
        const distance = Math.sqrt(dx * dx);
        if (distance > 0) {
          this.vx = (dx / distance) * this.speed;
        }
        this.vy = this.speed * 0.5;
        break;
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    // Boundary wrap
    if (this.x < -this.radius) this.x = 800 + this.radius;
    if (this.x > 800 + this.radius) this.x = -this.radius;

    // Deactivate if too far off screen
    if (this.y > 650) {
      this.active = false;
    }

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Rotation animation
    this.sprite.rotation += 0.01 * delta;

    // Shooting cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }
  }

  canShoot() {
    return this.shootCooldown <= 0 && this.y > 50 && this.y < 500;
  }

  shoot(playerX, playerY) {
    this.shootCooldown = this.shootDelay;

    // Aim at player with some inaccuracy
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return null;

    const accuracy = 0.8 + Math.random() * 0.2;
    const speed = 4;
    const vx = (dx / distance) * speed * accuracy;
    const vy = (dy / distance) * speed * accuracy;

    return new Bullet(this.x, this.y, vx, vy, 1, this.color, false);
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
